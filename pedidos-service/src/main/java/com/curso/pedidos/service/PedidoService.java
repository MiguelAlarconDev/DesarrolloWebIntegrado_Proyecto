package com.curso.pedidos.service;

import com.curso.pedidos.client.AuthClient;
import com.curso.pedidos.client.CursoClient;
import com.curso.pedidos.client.MercadoPagoClient;
import com.curso.pedidos.client.WhatsAppClient;
import com.curso.pedidos.dto.*;
import com.curso.pedidos.entity.*;
import com.curso.pedidos.repository.ComprobanteRepository;
import com.curso.pedidos.repository.NotificacionRepository;
import com.curso.pedidos.repository.PedidoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final ComprobanteRepository comprobanteRepository;
    private final NotificacionRepository notificacionRepository;
    private final AuthClient authClient;
    private final CursoClient cursoClient;
    private final MercadoPagoClient mercadoPagoClient;
    private final com.curso.pedidos.client.ComprobanteClient comprobanteClient;
    private final WhatsAppClient whatsAppClient;

    public PedidoService(PedidoRepository pedidoRepository,
                         ComprobanteRepository comprobanteRepository,
                         NotificacionRepository notificacionRepository,
                         AuthClient authClient,
                         CursoClient cursoClient,
                         MercadoPagoClient mercadoPagoClient,
                         com.curso.pedidos.client.ComprobanteClient comprobanteClient,
                         WhatsAppClient whatsAppClient) {
        this.pedidoRepository = pedidoRepository;
        this.comprobanteRepository = comprobanteRepository;
        this.notificacionRepository = notificacionRepository;
        this.authClient = authClient;
        this.cursoClient = cursoClient;
        this.mercadoPagoClient = mercadoPagoClient;
        this.comprobanteClient = comprobanteClient;
        this.whatsAppClient = whatsAppClient;
    }

    @Transactional
    public Pedido crear(CrearPedidoRequest request) {
        // 1. Validar existencia del estudiante en auth-service
        UsuarioDto estudiante = authClient.obtenerUsuario(request.getEstudianteId());

        // 2. Validar curso y reservar vacante vía HTTP en cursos-service
        CursoDto cursoActualizado = cursoClient.descontarAforo(request.getCursoId());

        // 3. Crear orden de pedido / matrícula
        Pedido pedido = new Pedido();
        pedido.setCodigoOrden("ORD-" + System.currentTimeMillis());
        pedido.setEstudianteId(estudiante.getId());
        pedido.setCursoId(cursoActualizado.getId());
        pedido.setMonto(cursoActualizado.getPrecio());
        pedido.setEstado(EstadoPedido.REGISTRADO);
        pedido.setReservaExpiraEn(LocalDateTime.now().plusMinutes(15));

        Pedido guardado = pedidoRepository.save(pedido);

        // 4. Crear preferencia real en Mercado Pago Sandbox
        PreferenciaResponse pref = mercadoPagoClient.crearPreferencia(guardado, estudiante, cursoActualizado);
        guardado.setMpPreferenceId(pref.getId());
        guardado = pedidoRepository.save(guardado);
        guardado.setInitPoint(pref.getInitPoint());

        // Enriquecer datos para la respuesta
        guardado.setEstudianteNombre(estudiante.getNombres() + " " + estudiante.getApellidos());
        guardado.setEstudianteWhatsapp(estudiante.getWhatsapp());
        guardado.setCursoTitulo(cursoActualizado.getTitulo());
        guardado.setHorario(cursoActualizado.getHorario());
        guardado.setModalidad(cursoActualizado.getModalidad());
        guardado.setEnlaceClase(cursoActualizado.getEnlaceClase());
        guardado.setDireccionClase(cursoActualizado.getDireccionClase());
        guardado.setAula(cursoActualizado.getAula());

        System.out.printf("[PEDIDOS-SERVICE] Pedido %s creado para el estudiante %s. Vacante reservada. MP Preference: %s%n",
                guardado.getCodigoOrden(), estudiante.getNombres(), guardado.getMpPreferenceId());

        return guardado;
    }

    @Transactional
    public Pedido procesarPagoMercadoPago(String paymentId) {
        Map<String, Object> pago = mercadoPagoClient.consultarPago(paymentId);
        if (pago == null) {
            throw new IllegalArgumentException("No se pudo obtener informacion del pago " + paymentId + " desde Mercado Pago");
        }

        String status = (String) pago.get("status");
        if (!"approved".equalsIgnoreCase(status)) {
            System.out.printf("[MERCADO PAGO WEBHOOK] Pago %s recibido con estado '%s'. No es aprobado.%n", paymentId, status);
            return null;
        }

        String externalRef = (String) pago.get("external_reference");
        if (externalRef == null || externalRef.isBlank()) {
            throw new IllegalArgumentException("El pago " + paymentId + " no contiene external_reference");
        }

        UUID pedidoId = UUID.fromString(externalRef);
        PagarPedidoRequest pagarRequest = new PagarPedidoRequest();
        pagarRequest.setMpPaymentId(paymentId);
        pagarRequest.setTipoComprobante(TipoComprobante.BOLETA);

        System.out.printf("[MERCADO PAGO WEBHOOK] Pago %s APROBADO para el pedido %s. Confirmando matricula...%n", paymentId, pedidoId);
        return pagar(pedidoId, pagarRequest);
    }

    public Map<String, Object> verificarEstadoMercadoPago(UUID pedidoId) {
        Pedido pedido = buscarPorId(pedidoId);
        if (pedido.getEstado() == EstadoPedido.PAGADO || pedido.getEstado() == EstadoPedido.CONFIRMADO) {
            return Map.of(
                    "approved", true,
                    "paymentId", pedido.getMpPaymentId() != null ? pedido.getMpPaymentId() : ""
            );
        }
        String mpPaymentId = mercadoPagoClient.buscarPagoAprobadoPorReferencia(pedidoId.toString());
        if (mpPaymentId != null && !mpPaymentId.isBlank()) {
            return Map.of(
                    "approved", true,
                    "paymentId", mpPaymentId
            );
        }
        return Map.of(
                "approved", false,
                "paymentId", ""
        );
    }

    @Transactional
    public Pedido pagar(UUID pedidoId, PagarPedidoRequest request) {
        Pedido pedido = buscarPorId(pedidoId);

        if (pedido.getEstado() == EstadoPedido.PAGADO || pedido.getEstado() == EstadoPedido.CONFIRMADO) {
            return pedido;
        }

        if (pedido.getEstado() == EstadoPedido.CANCELADO) {
            throw new IllegalStateException("No se puede pagar un pedido que fue cancelado");
        }

        // Obtener datos del estudiante y curso para comprobante y notificación
        UsuarioDto estudiante = authClient.obtenerUsuario(pedido.getEstudianteId());
        CursoDto curso = cursoClient.obtenerCurso(pedido.getCursoId());

        if (request != null && request.getCorreo() != null && !request.getCorreo().isBlank() && estudiante != null) {
            estudiante.setCorreo(request.getCorreo().trim());
        }

        String realMpId = (request != null && request.getMpPaymentId() != null && request.getMpPaymentId().matches("^\\d+$"))
                ? request.getMpPaymentId()
                : mercadoPagoClient.buscarPagoAprobadoPorReferencia(pedido.getId().toString());
        if (realMpId == null || realMpId.isBlank()) {
            realMpId = mercadoPagoClient.procesarPagoDirecto(pedido, curso, request);
        }

        pedido.setEstado(EstadoPedido.PAGADO);
        pedido.setMpPaymentId(realMpId);

        Pedido pedidoActualizado = pedidoRepository.save(pedido);

        // Generar comprobante electrónico
        generarComprobante(pedidoActualizado, estudiante, curso, request);

        // Despachar notificación de WhatsApp (CallMeBot)
        enviarNotificacionWhatsApp(pedidoActualizado, estudiante, curso, request);

        enriquecerPedido(pedidoActualizado, estudiante, curso);
        return pedidoActualizado;
    }

    @Transactional
    public Pedido cancelar(UUID pedidoId) {
        Pedido pedido = buscarPorId(pedidoId);

        if (pedido.getEstado() == EstadoPedido.PAGADO || pedido.getEstado() == EstadoPedido.CONFIRMADO) {
            throw new IllegalStateException("No se puede cancelar un pedido que ya está PAGADO");
        }

        if (pedido.getEstado() == EstadoPedido.CANCELADO) {
            return pedido;
        }

        pedido.setEstado(EstadoPedido.CANCELADO);
        Pedido pedidoCancelado = pedidoRepository.save(pedido);

        // Liberar la vacante en cursos-service
        cursoClient.liberarAforo(pedido.getCursoId());

        System.out.printf("[PEDIDOS-SERVICE] Pedido %s cancelado. Vacante liberada.%n", pedido.getCodigoOrden());
        return pedidoCancelado;
    }

    public List<Pedido> listar() {
        List<Pedido> pedidos = pedidoRepository.findAll();
        pedidos.forEach(this::enriquecerSilenciosamente);
        return pedidos;
    }

    public Pedido buscarPorId(UUID id) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Pedido no encontrado con ID: " + id));
        enriquecerSilenciosamente(pedido);
        return pedido;
    }

    public List<Pedido> listarPorEstudiante(UUID estudianteId) {
        List<Pedido> pedidos = pedidoRepository.findByEstudianteId(estudianteId);
        pedidos.forEach(this::enriquecerSilenciosamente);
        return pedidos;
    }

    public List<Pedido> listarParticipantesPorCurso(UUID cursoId) {
        List<Pedido> pedidos = pedidoRepository.findByCursoIdAndEstado(cursoId, EstadoPedido.PAGADO);
        pedidos.forEach(this::enriquecerSilenciosamente);
        return pedidos;
    }

    private void enriquecerSilenciosamente(Pedido pedido) {
        try {
            UsuarioDto estudiante = authClient.obtenerUsuario(pedido.getEstudianteId());
            CursoDto curso = cursoClient.obtenerCurso(pedido.getCursoId());
            enriquecerPedido(pedido, estudiante, curso);
        } catch (Exception ignored) {
        }
    }

    private void enriquecerPedido(Pedido pedido, UsuarioDto estudiante, CursoDto curso) {
        if (estudiante != null) {
            pedido.setEstudianteNombre(estudiante.getNombres() + " " + estudiante.getApellidos());
            if (pedido.getEstudianteWhatsapp() == null) {
                pedido.setEstudianteWhatsapp(estudiante.getWhatsapp());
            }
        }
        if (curso != null) {
            pedido.setCursoTitulo(curso.getTitulo());
            pedido.setHorario(curso.getHorario());
            pedido.setModalidad(curso.getModalidad());
            pedido.setEnlaceClase(curso.getEnlaceClase());
            pedido.setDireccionClase(curso.getDireccionClase());
            pedido.setAula(curso.getAula());
        }
    }

    private void generarComprobante(Pedido pedido, UsuarioDto estudiante, CursoDto curso, PagarPedidoRequest request) {
        if (comprobanteRepository.findByPedidoId(pedido.getId()).isPresent()) {
            return;
        }

        TipoComprobante tipo = (request != null && request.getTipoComprobante() != null)
                ? request.getTipoComprobante()
                : TipoComprobante.BOLETA;

        BigDecimal montoTotal = pedido.getMonto();
        BigDecimal montoSubtotal = montoTotal.divide(BigDecimal.valueOf(1.18), 2, RoundingMode.HALF_UP);
        BigDecimal montoIgv = montoTotal.subtract(montoSubtotal);

        Comprobante comprobante = new Comprobante();
        comprobante.setPedidoId(pedido.getId());
        comprobante.setSerie(tipo == TipoComprobante.FACTURA ? "F001" : "B001");
        comprobante.setNumeroCorrelativo((int) (System.currentTimeMillis() % 100000));
        comprobante.setTipoComprobante(tipo);
        comprobante.setMontoSubtotal(montoSubtotal);
        comprobante.setMontoIgv(montoIgv);
        comprobante.setMontoTotal(montoTotal);
        comprobante.setPdfUrl("/api/comprobantes/" + pedido.getId() + "/descargar");
        comprobante.setEstadoEmail("ENVIADO");

        if (tipo == TipoComprobante.FACTURA && request != null) {
            comprobante.setRucCliente(request.getRucCliente());
            comprobante.setRazonSocial(request.getRazonSocial());
        }

        comprobanteRepository.save(comprobante);

        // Despachar PDF y correo electrónico mediante comprobantes-service (FastAPI)
        comprobanteClient.emitirYEnviarComprobante(
                pedido,
                estudiante,
                curso,
                tipo,
                comprobante.getRucCliente(),
                comprobante.getRazonSocial()
        );

        System.out.printf("[FACTURACION] Comprobante %s (%s-%06d) generado para la orden %s. Total: S/ %.2f. RUC: %s. Enviado al correo %s%n",
                tipo, comprobante.getSerie(), comprobante.getNumeroCorrelativo(), pedido.getCodigoOrden(),
                montoTotal, comprobante.getRucCliente() != null ? comprobante.getRucCliente() : "N/A", estudiante.getCorreo());
    }

    private void enviarNotificacionWhatsApp(Pedido pedido, UsuarioDto estudiante, CursoDto curso, PagarPedidoRequest request) {
        String datosClase = obtenerDatosClase(curso);
        String mensaje = String.format("🎉 Hola %s! Tu matricula en el curso '%s' ha sido confirmada con exito. 📅 Horario: %s. %s",
                estudiante.getNombres(), curso.getTitulo(), curso.getHorario(), datosClase);

        String telefonoDestino = (request != null && request.getWhatsapp() != null && !request.getWhatsapp().isBlank())
                ? request.getWhatsapp()
                : (estudiante != null ? estudiante.getWhatsapp() : null);

        Notificacion notificacion = new Notificacion();
        notificacion.setPedidoId(pedido.getId());
        notificacion.setCanal("WHATSAPP");
        notificacion.setDestinatario(telefonoDestino != null ? telefonoDestino : "N/A");
        notificacion.setTipo("BIENVENIDA");
        notificacion.setMensaje(mensaje);

        // Despachar a través de WhatsAppClient (CallMeBot)
        boolean enviado = whatsAppClient.enviarMensaje(telefonoDestino, mensaje);
        notificacion.setEstado(enviado ? "ENVIADO" : "FALLIDO");
        notificacion.setIntentos(1);
        if (!enviado) {
            notificacion.setUltimoError("Error al contactar con API CallMeBot");
        }

        notificacionRepository.save(notificacion);

        pedido.setEstudianteWhatsapp(telefonoDestino);
        pedido.setMensajeNotificacion(mensaje);

        System.out.printf("[WHATSAPP NOTIFICACION] Mensaje enviado a %s (%s): %s%n",
                estudiante.getNombres(), telefonoDestino, mensaje);
    }

    private String obtenerDatosClase(CursoDto curso) {
        if ("PRESENCIAL".equalsIgnoreCase(curso.getModalidad())) {
            String direccion = curso.getDireccionClase() != null && !curso.getDireccionClase().isBlank()
                    ? curso.getDireccionClase()
                    : "Se publicara pronto";
            String aula = curso.getAula() != null && !curso.getAula().isBlank()
                    ? ". Aula: " + curso.getAula()
                    : "";
            return "Lugar de clase: " + direccion + aula;
        }

        String enlace = curso.getEnlaceClase() != null && !curso.getEnlaceClase().isBlank()
                ? curso.getEnlaceClase()
                : "Se publicara pronto";
        return "Enlace de clase: " + enlace;
    }
}
