package com.curso.pedidos.service;

import com.curso.pedidos.dto.CambiarEstadoRequest;
import com.curso.pedidos.dto.CrearPedidoRequest;
import com.curso.pedidos.dto.PagarPedidoRequest;
import com.curso.pedidos.entity.*;
import com.curso.pedidos.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

@Service
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final UsuarioRepository usuarioRepository;
    private final CursoRepository cursoRepository;
    private final ComprobanteRepository comprobanteRepository;
    private final NotificacionRepository notificacionRepository;

    public PedidoService(PedidoRepository pedidoRepository,
                         UsuarioRepository usuarioRepository,
                         CursoRepository cursoRepository,
                         ComprobanteRepository comprobanteRepository,
                         NotificacionRepository notificacionRepository) {
        this.pedidoRepository = pedidoRepository;
        this.usuarioRepository = usuarioRepository;
        this.cursoRepository = cursoRepository;
        this.comprobanteRepository = comprobanteRepository;
        this.notificacionRepository = notificacionRepository;
    }

    @Transactional
    public Pedido crear(CrearPedidoRequest request) {
        Usuario estudiante = usuarioRepository.findById(request.getEstudianteId())
                .orElseThrow(() -> new IllegalArgumentException("Estudiante no encontrado con ID: " + request.getEstudianteId()));

        Curso curso = cursoRepository.findById(request.getCursoId())
                .orElseThrow(() -> new IllegalArgumentException("Curso no encontrado con ID: " + request.getCursoId()));

        if (curso.getEstado() != EstadoCurso.PUBLICADO) {
            throw new IllegalStateException("El curso no se encuentra disponible para matrícula");
        }

        // RF-05: Validación de Aforo y reserva temporal de vacante
        if (curso.getAforoDisponible() <= 0) {
            throw new IllegalStateException("Lo sentimos, no quedan vacantes disponibles para este curso.");
        }

        // Reservar 1 vacante temporal
        curso.setAforoDisponible(curso.getAforoDisponible() - 1);
        cursoRepository.save(curso);

        Pedido pedido = new Pedido();
        pedido.setCodigoOrden("ORD-" + System.currentTimeMillis());
        pedido.setEstudiante(estudiante);
        pedido.setCurso(curso);
        pedido.setMonto(curso.getPrecio());
        pedido.setEstado(EstadoPedido.REGISTRADO);
        pedido.setReservaExpiraEn(LocalDateTime.now().plusMinutes(15)); // TTL de 15 min
        pedido.setMpPreferenceId("PREF-MP-" + UUID.randomUUID().toString().substring(0, 8)); // Simulación Preference MP

        Pedido guardado = pedidoRepository.save(pedido);
        System.out.printf("[MATRICULA] Pedido %s creado para el estudiante %s. Vacante reservada temporalmente. Aforo restante: %d%n",
                guardado.getCodigoOrden(), estudiante.getNombres(), curso.getAforoDisponible());

        return guardado;
    }

    @Transactional
    public Pedido pagar(UUID pedidoId, PagarPedidoRequest request) {
        Pedido pedido = buscarPorId(pedidoId);

        if (pedido.getEstado() == EstadoPedido.PAGADO || pedido.getEstado() == EstadoPedido.CONFIRMADO) {
            throw new IllegalStateException("Este pedido ya fue pagado anteriormente");
        }

        if (pedido.getEstado() == EstadoPedido.CANCELADO) {
            throw new IllegalStateException("No se puede pagar un pedido que fue cancelado");
        }

        pedido.setEstado(EstadoPedido.PAGADO);
        pedido.setMpPaymentId(request != null && request.getMpPaymentId() != null
                ? request.getMpPaymentId()
                : "PAY-" + System.currentTimeMillis());

        Pedido pedidoActualizado = pedidoRepository.save(pedido);

        // RF-15: Emisión automática de comprobante de pago
        generarComprobante(pedidoActualizado, request != null ? request.getTipoComprobante() : TipoComprobante.BOLETA);

        // RF-14: Despacho automático de notificación de WhatsApp
        enviarNotificacionWhatsApp(pedidoActualizado);

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

        // Liberar la vacante y devolverla al curso
        Curso curso = pedido.getCurso();
        curso.setAforoDisponible(curso.getAforoDisponible() + 1);
        cursoRepository.save(curso);

        System.out.printf("[MATRICULA CANCELADA] Pedido %s cancelado. Vacante liberada para el curso %s. Nuevo aforo disponible: %d%n",
                pedido.getCodigoOrden(), curso.getTitulo(), curso.getAforoDisponible());

        return pedidoCancelado;
    }

    public List<Pedido> listar() {
        return pedidoRepository.findAll();
    }

    public Pedido buscarPorId(UUID id) {
        return pedidoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Pedido no encontrado con ID: " + id));
    }

    // RF-07: Panel del Estudiante (Ver sus cursos y enlaces Zoom/Meet)
    public List<Pedido> listarPorEstudiante(UUID estudianteId) {
        return pedidoRepository.findByEstudianteId(estudianteId);
    }

    // RF-09: Portal Docente (Lista en tiempo real de estudiantes pagados)
    public List<Pedido> listarParticipantesPorCurso(UUID cursoId) {
        return pedidoRepository.findByCursoIdAndEstado(cursoId, EstadoPedido.PAGADO);
    }

    // RF-08 / RF-09: Participantes de todos los cursos del docente
    public List<Pedido> listarParticipantesPorDocente(UUID docenteId) {
        return pedidoRepository.findByCursoDocenteIdAndEstado(docenteId, EstadoPedido.PAGADO);
    }

    private void generarComprobante(Pedido pedido, TipoComprobante tipo) {
        if (comprobanteRepository.findByPedidoId(pedido.getId()).isPresent()) {
            return;
        }

        BigDecimal montoTotal = pedido.getMonto();
        BigDecimal montoSubtotal = montoTotal.divide(BigDecimal.valueOf(1.18), 2, RoundingMode.HALF_UP);
        BigDecimal montoIgv = montoTotal.subtract(montoSubtotal);

        Comprobante comprobante = new Comprobante();
        comprobante.setPedido(pedido);
        comprobante.setSerie(tipo == TipoComprobante.FACTURA ? "F001" : "B001");
        comprobante.setNumeroCorrelativo((int) (System.currentTimeMillis() % 100000));
        comprobante.setTipoComprobante(tipo != null ? tipo : TipoComprobante.BOLETA);
        comprobante.setMontoSubtotal(montoSubtotal);
        comprobante.setMontoIgv(montoIgv);
        comprobante.setMontoTotal(montoTotal);
        comprobante.setPdfUrl("/api/comprobantes/descargar/" + pedido.getId());
        comprobante.setEstadoEmail("ENVIADO");

        comprobanteRepository.save(comprobante);

        System.out.printf("[FACTURACION] Comprobante %s-%06d generado para la orden %s. Total: S/ %.2f. Enviado al correo %s%n",
                comprobante.getSerie(), comprobante.getNumeroCorrelativo(), pedido.getCodigoOrden(),
                montoTotal, pedido.getEstudiante().getCorreo());
    }

    private void enviarNotificacionWhatsApp(Pedido pedido) {
        String mensaje = String.format("¡Hola %s! Tu matrícula en el curso '%s' ha sido confirmada con éxito. " +
                        "Horario: %s. Enlace de clase virtual: %s",
                pedido.getEstudiante().getNombres(),
                pedido.getCurso().getTitulo(),
                pedido.getCurso().getHorario(),
                pedido.getCurso().getEnlaceClase() != null ? pedido.getCurso().getEnlaceClase() : "Se publicará pronto");

        Notificacion notificacion = new Notificacion();
        notificacion.setPedido(pedido);
        notificacion.setCanal("WHATSAPP");
        notificacion.setDestinatario(pedido.getEstudiante().getWhatsapp());
        notificacion.setTipo("BIENVENIDA");
        notificacion.setMensaje(mensaje);
        notificacion.setEstado("ENVIADO");
        notificacion.setIntentos(1);

        notificacionRepository.save(notificacion);

        System.out.printf("[WHATSAPP TRANSACCIONAL] Mensaje enviado a %s (%s): %s%n",
                pedido.getEstudiante().getNombres(), pedido.getEstudiante().getWhatsapp(), mensaje);
    }
}
