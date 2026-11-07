package com.curso.pedidos.service;

import com.curso.pedidos.client.AuthClient;
import com.curso.pedidos.client.ComprobanteClient;
import com.curso.pedidos.client.CursoClient;
import com.curso.pedidos.client.MercadoPagoClient;
import com.curso.pedidos.dto.*;
import com.curso.pedidos.exception.PagoNoVerificableException;
import com.curso.pedidos.exception.PagoRechazadoException;
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
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final ComprobanteRepository comprobanteRepository;
    private final NotificacionRepository notificacionRepository;
    private final AuthClient authClient;
    private final CursoClient cursoClient;
    private final MercadoPagoClient mercadoPagoClient;
    private final ComprobanteClient comprobanteClient;
    private final WhatsAppCloudService whatsAppCloudService;

    public PedidoService(PedidoRepository pedidoRepository,
                         ComprobanteRepository comprobanteRepository,
                         NotificacionRepository notificacionRepository,
                         AuthClient authClient,
                         CursoClient cursoClient,
                         MercadoPagoClient mercadoPagoClient,
                         ComprobanteClient comprobanteClient,
                         WhatsAppCloudService whatsAppCloudService) {
        this.pedidoRepository = pedidoRepository;
        this.comprobanteRepository = comprobanteRepository;
        this.notificacionRepository = notificacionRepository;
        this.authClient = authClient;
        this.cursoClient = cursoClient;
        this.mercadoPagoClient = mercadoPagoClient;
        this.comprobanteClient = comprobanteClient;
        this.whatsAppCloudService = whatsAppCloudService;
    }

    public WhatsAppCloudService getWhatsAppCloudService() {
        return whatsAppCloudService;
    }

    @Transactional
    public Pedido crear(CrearPedidoRequest request) {
        // 0. Sin Mercado Pago no se puede pagar: no reservar vacante ni crear pedidos huerfanos.
        if (!mercadoPagoClient.isConfigurado()) {
            throw new PagoNoVerificableException("Mercado Pago no esta configurado: no es posible iniciar el pago");
        }

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
        if (pref == null || pref.getId() == null || pref.getInitPoint() == null || pref.getInitPoint().isBlank()) {
            // Compensacion: la vacante se reservo en cursos-service (remoto); el pedido se revierte con la transaccion.
            try {
                cursoClient.liberarAforo(cursoActualizado.getId());
            } catch (RuntimeException ignored) {
                // Se informa igualmente el fallo de pago; la vacante quedaria por liberar manualmente.
            }
            throw new PagoNoVerificableException("No se pudo crear la preferencia de pago en Mercado Pago");
        }
        guardado.setMpPreferenceId(pref.getId());
        guardado = pedidoRepository.save(guardado);
        guardado.setInitPoint(pref.getInitPoint());

        // Enriquecer datos para la respuesta
        enriquecerPedido(guardado, estudiante, cursoActualizado);

        System.out.printf("[PEDIDOS-SERVICE] Pedido %s creado para el estudiante %s. Vacante reservada. MP Preference: %s%n",
                guardado.getCodigoOrden(), estudiante.getNombres(), guardado.getMpPreferenceId());

        return guardado;
    }

    static final String MONEDA_ESPERADA = "PEN";

    /**
     * Webhook: el pago se consulta SIEMPRE al proveedor y debe referenciar un pedido existente.
     * Devuelve null si el pago aun no esta aprobado.
     */
    @Transactional
    public Pedido procesarPagoMercadoPago(String paymentId) {
        Map<String, Object> pago = mercadoPagoClient.consultarPago(paymentId);
        if (!"approved".equalsIgnoreCase(String.valueOf(pago.get("status")))) {
            return null;
        }
        Object externalRef = pago.get("external_reference");
        UUID pedidoId;
        try {
            pedidoId = UUID.fromString(String.valueOf(externalRef));
        } catch (IllegalArgumentException ex) {
            throw new PagoRechazadoException("El pago no referencia un pedido valido");
        }
        PagarPedidoRequest pagarRequest = new PagarPedidoRequest();
        pagarRequest.setMpPaymentId(paymentId);
        pagarRequest.setTipoComprobante(TipoComprobante.BOLETA);
        return confirmarConPagoConsultado(pedidoId, paymentId, pago, pagarRequest);
    }

    /**
     * Confirmacion desde el frontend tras el retorno de Mercado Pago. Los parametros del
     * navegador NO son prueba: el pago se consulta al proveedor y se valida contra el pedido.
     */
    @Transactional
    public Pedido confirmarPagoVerificado(UUID pedidoId, PagarPedidoRequest request) {
        String paymentId = request != null ? request.getMpPaymentId() : null;
        if (paymentId == null || paymentId.isBlank()) {
            throw new PagoRechazadoException("Se requiere el identificador de pago de Mercado Pago");
        }
        String id = paymentId.trim();
        // Fila bloqueada antes de consultar: evita doble confirmacion concurrente (webhook + frontend).
        Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId)
                .orElseThrow(() -> new IllegalArgumentException("Pedido no encontrado con ID: " + pedidoId));
        Pedido yaConfirmado = resolverIdempotencia(pedido, id);
        if (yaConfirmado != null) {
            return yaConfirmado;
        }
        Map<String, Object> pago = mercadoPagoClient.consultarPago(id);
        return validarYAplicar(pedido, id, pago, request);
    }

    private Pedido confirmarConPagoConsultado(UUID pedidoId, String paymentId, Map<String, Object> pago,
                                              PagarPedidoRequest request) {
        Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId)
                .orElseThrow(() -> new PagoRechazadoException("El pago referencia un pedido inexistente"));
        Pedido yaConfirmado = resolverIdempotencia(pedido, paymentId);
        if (yaConfirmado != null) {
            return yaConfirmado;
        }
        return validarYAplicar(pedido, paymentId, pago, request);
    }

    private Pedido validarYAplicar(Pedido pedido, String paymentId, Map<String, Object> pago,
                                   PagarPedidoRequest request) {
        UUID pedidoId = pedido.getId();
        pedidoRepository.findFirstByMpPaymentId(paymentId)
                .filter(otro -> !otro.getId().equals(pedidoId))
                .ifPresent(otro -> {
                    throw new IllegalStateException("Este pago ya fue aplicado a otro pedido");
                });
        validarPagoContraPedido(pago, pedido, paymentId);
        return aplicarPago(pedido, paymentId, request);
    }

    /** Devuelve el pedido si ya esta pagado con el mismo pago (sin efectos repetidos); falla si no aplica. */
    private Pedido resolverIdempotencia(Pedido pedido, String paymentId) {
        if (pedido.getEstado() == EstadoPedido.PAGADO || pedido.getEstado() == EstadoPedido.CONFIRMADO) {
            if (paymentId.equals(pedido.getMpPaymentId())) {
                enriquecerSilenciosamente(pedido);
                return pedido;
            }
            throw new IllegalStateException("Este pedido ya fue pagado con otra operacion");
        }
        if (pedido.getEstado() == EstadoPedido.CANCELADO) {
            throw new IllegalStateException("No se puede pagar un pedido que fue cancelado");
        }
        return null;
    }

    static void validarPagoContraPedido(Map<String, Object> pago, Pedido pedido, String paymentId) {
        if (!paymentId.equals(String.valueOf(pago.get("id")))) {
            throw new PagoRechazadoException("La respuesta del proveedor no corresponde al pago solicitado");
        }
        if (!"approved".equalsIgnoreCase(String.valueOf(pago.get("status")))) {
            throw new PagoRechazadoException("El pago no esta aprobado (estado: " + pago.get("status") + ")");
        }
        if (!pedido.getId().toString().equalsIgnoreCase(String.valueOf(pago.get("external_reference")))) {
            throw new PagoRechazadoException("El pago no corresponde a este pedido");
        }
        if (!MONEDA_ESPERADA.equalsIgnoreCase(String.valueOf(pago.get("currency_id")))) {
            throw new PagoRechazadoException("Moneda del pago no valida");
        }
        BigDecimal monto;
        try {
            monto = new BigDecimal(String.valueOf(pago.get("transaction_amount")));
        } catch (NumberFormatException ex) {
            throw new PagoRechazadoException("Monto del pago no valido");
        }
        if (pedido.getMonto() == null || monto.compareTo(pedido.getMonto()) != 0) {
            throw new PagoRechazadoException("El monto pagado no coincide con el pedido");
        }
    }

    private Pedido aplicarPago(Pedido pedido, String paymentId, PagarPedidoRequest request) {
        pedido.setEstado(EstadoPedido.PAGADO);
        pedido.setMpPaymentId(paymentId);
        pedido.setFechaActualizacion(LocalDateTime.now());

        Pedido pedidoActualizado = pedidoRepository.save(pedido);

        // Obtener datos del estudiante y curso para comprobante y notificación
        UsuarioDto estudiante = authClient.obtenerUsuario(pedido.getEstudianteId());
        if (request != null) {
            if (request.getWhatsapp() != null && !request.getWhatsapp().isBlank()) {
                estudiante.setWhatsapp(request.getWhatsapp().trim());
            }
            if (request.getCorreo() != null && !request.getCorreo().isBlank()) {
                estudiante.setCorreo(request.getCorreo().trim());
            }
            if (request.getClienteNombres() != null && !request.getClienteNombres().isBlank()) {
                estudiante.setNombres(request.getClienteNombres().trim());
                estudiante.setApellidos("");
            }
        }
        CursoDto curso = cursoClient.obtenerCurso(pedido.getCursoId());

        // Generar comprobante electrónico y disparar envío por correo en segundo plano
        generarComprobante(pedidoActualizado, estudiante, curso, request);

        // Despachar / preparar notificación de WhatsApp mediante Meta Cloud API en segundo plano
        enviarNotificacionWhatsApp(pedidoActualizado, estudiante, curso);

        enriquecerPedido(pedidoActualizado, estudiante, curso);
        comprobanteRepository.findByPedidoId(pedidoActualizado.getId()).ifPresent(pedidoActualizado::setComprobante);
        return pedidoActualizado;
    }

    @Transactional
    public boolean reenviarWhatsApp(UUID pedidoId) {
        Pedido pedido = buscarPorId(pedidoId);
        UsuarioDto estudiante = authClient.obtenerUsuario(pedido.getEstudianteId());
        List<Notificacion> previas = notificacionRepository.findByPedidoId(pedidoId);
        if (!previas.isEmpty()) {
            String ultimoDestinatario = previas.get(previas.size() - 1).getDestinatario();
            if (ultimoDestinatario != null && !ultimoDestinatario.isBlank()) {
                estudiante.setWhatsapp(ultimoDestinatario);
            }
        }
        CursoDto curso = cursoClient.obtenerCurso(pedido.getCursoId());
        enviarNotificacionWhatsApp(pedido, estudiante, curso);
        return true;
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
        enriquecerListaPedidos(pedidos);
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
        enriquecerListaPedidos(pedidos);
        return pedidos;
    }

    public List<Pedido> listarParticipantesPorCurso(UUID cursoId) {
        List<Pedido> pedidos = pedidoRepository.findByCursoIdAndEstado(cursoId, EstadoPedido.PAGADO);
        enriquecerListaPedidos(pedidos);
        return pedidos;
    }

    /**
     * Enriquecimiento en lote (Batch): evita el problema N+1 de consultas HTTP y SQL.
     */
    private void enriquecerListaPedidos(List<Pedido> pedidos) {
        if (pedidos == null || pedidos.isEmpty()) {
            return;
        }

        try {
            Set<UUID> pedidoIds = pedidos.stream().map(Pedido::getId).filter(Objects::nonNull).collect(Collectors.toSet());
            Set<UUID> estudianteIds = pedidos.stream().map(Pedido::getEstudianteId).filter(Objects::nonNull).collect(Collectors.toSet());
            Set<UUID> cursoIds = pedidos.stream().map(Pedido::getCursoId).filter(Objects::nonNull).collect(Collectors.toSet());

            Map<UUID, Comprobante> comprobantesMap = comprobanteRepository.findByPedidoIdIn(pedidoIds)
                    .stream()
                    .collect(Collectors.toMap(Comprobante::getPedidoId, Function.identity(), (a, b) -> a));

            Map<UUID, UsuarioDto> usuariosMap = authClient.obtenerUsuariosPorIds(estudianteIds);
            Map<UUID, CursoDto> cursosMap = cursoClient.obtenerCursosPorIds(cursoIds);

            for (Pedido pedido : pedidos) {
                UsuarioDto estudiante = usuariosMap.get(pedido.getEstudianteId());
                CursoDto curso = cursosMap.get(pedido.getCursoId());
                enriquecerPedido(pedido, estudiante, curso);
                Comprobante comp = comprobantesMap.get(pedido.getId());
                if (comp != null) {
                    pedido.setComprobante(comp);
                }
            }
        } catch (Exception ex) {
            pedidos.forEach(this::enriquecerSilenciosamente);
        }
    }

    private void enriquecerSilenciosamente(Pedido pedido) {
        try {
            UsuarioDto estudiante = authClient.obtenerUsuario(pedido.getEstudianteId());
            CursoDto curso = cursoClient.obtenerCurso(pedido.getCursoId());
            enriquecerPedido(pedido, estudiante, curso);
            comprobanteRepository.findByPedidoId(pedido.getId()).ifPresent(pedido::setComprobante);
        } catch (Exception ignored) {
        }
    }

    private void enriquecerPedido(Pedido pedido, UsuarioDto estudiante, CursoDto curso) {
        if (estudiante != null) {
            pedido.setEstudiante(estudiante);
            pedido.setEstudianteNombre((estudiante.getNombres() + " " + (estudiante.getApellidos() != null ? estudiante.getApellidos() : "")).trim());
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
        comprobante.setEstadoEmail("PENDIENTE");

        if (tipo == TipoComprobante.FACTURA && request != null) {
            comprobante.setRucCliente(request.getRucCliente());
            comprobante.setRazonSocial(request.getRazonSocial());
        }

        Comprobante guardado = comprobanteRepository.save(comprobante);
        pedido.setComprobante(guardado);

        // FastAPI owns PDF generation and its single email dispatch.
        // The remote service deduplicates by pedidoId, including retries after rollback.
        comprobanteClient.emitirYEnviarComprobante(pedido, estudiante, curso, tipo,
                comprobante.getRucCliente(), comprobante.getRazonSocial());
        guardado.setEstadoEmail("ENVIADO");
        comprobanteRepository.save(guardado);

        System.out.printf("[FACTURACION] Comprobante %s (%s-%06d) generado para la orden %s. Total: S/ %.2f. Correo: %s%n",
                tipo, guardado.getSerie(), guardado.getNumeroCorrelativo(), pedido.getCodigoOrden(),
                montoTotal, estudiante.getCorreo());
    }

    private void enviarNotificacionWhatsApp(Pedido pedido, UsuarioDto estudiante, CursoDto curso) {
        String datosClase = obtenerDatosClase(curso);
        String mensaje = String.format("🎉 Hola %s! Tu matrícula en el curso '%s' ha sido confirmada con éxito.\n\n📅 Horario: %s\n%s\n🔖 Código: %s\n🏛️ Acceso aula: http://localhost:4200/mis-cursos.html",
                estudiante.getNombres(), curso.getTitulo(), curso.getHorario(), datosClase, pedido.getCodigoOrden());

        Notificacion notificacion = new Notificacion();
        notificacion.setPedidoId(pedido.getId());
        notificacion.setCanal("WHATSAPP");
        notificacion.setDestinatario(estudiante.getWhatsapp());
        notificacion.setTipo("BIENVENIDA");
        notificacion.setMensaje(mensaje);
        notificacion.setEstado("PENDIENTE");
        notificacion.setIntentos(1);

        Notificacion guardada = notificacionRepository.save(notificacion);

        // Despacho asíncrono mediante Meta WhatsApp Cloud API para no bloquear la transacción
        CompletableFuture.runAsync(() -> {
            try {
                boolean enviado = whatsAppCloudService.enviarNotificacionBienvenida(pedido, estudiante, curso, guardada);
                if (enviado) {
                    guardada.setEstado("ENVIADO");
                }
                notificacionRepository.save(guardada);
            } catch (Exception ignored) {
            }
        });
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
