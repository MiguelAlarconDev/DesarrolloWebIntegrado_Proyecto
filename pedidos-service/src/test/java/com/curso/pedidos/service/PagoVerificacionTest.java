package com.curso.pedidos.service;

import com.curso.pedidos.client.AuthClient;
import com.curso.pedidos.client.ComprobanteClient;
import com.curso.pedidos.client.CursoClient;
import com.curso.pedidos.client.MercadoPagoClient;
import com.curso.pedidos.dto.CursoDto;
import com.curso.pedidos.dto.PagarPedidoRequest;
import com.curso.pedidos.dto.UsuarioDto;
import com.curso.pedidos.entity.EstadoPedido;
import com.curso.pedidos.entity.Notificacion;
import com.curso.pedidos.entity.Pedido;
import com.curso.pedidos.entity.TipoComprobante;
import com.curso.pedidos.exception.PagoNoVerificableException;
import com.curso.pedidos.exception.PagoRechazadoException;
import com.curso.pedidos.repository.ComprobanteRepository;
import com.curso.pedidos.repository.NotificacionRepository;
import com.curso.pedidos.repository.PedidoRepository;
import com.curso.pedidos.security.JwtVerifier;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Confirmacion de pagos con respuestas simuladas de Mercado Pago (sin red ni BD real).
 * Se usan fakes manuales (como el resto de pruebas del proyecto): Mockito/Byte Buddy no
 * soporta el JDK 25 instalado.
 */
class PagoVerificacionTest {

    private static final String PAYMENT_ID = "1234567890";
    private static final JwtVerifier JWT = new JwtVerifier(new ObjectMapper(), Clock.systemUTC(),
            "test-secret-change-me-please-32-chars", "test");

    private Pedido pedido;
    private Pedido otroConMismoPago;
    private final AtomicInteger pedidoSaves = new AtomicInteger();
    private final AtomicInteger notificacionSaves = new AtomicInteger();
    private final AtomicInteger comprobantesEmitidos = new AtomicInteger();
    private final AtomicInteger consultasMp = new AtomicInteger();
    private Function<String, Map<String, Object>> respuestaMp;
    private PedidoService service;

    @SuppressWarnings("unchecked")
    private static <T> T repo(Class<T> type, Function<String, Function<Object[], Object>> handlers) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, (proxy, method, args) -> {
            Function<Object[], Object> h = handlers.apply(method.getName());
            if (h != null) {
                return h.apply(args);
            }
            if (method.getName().equals("toString")) {
                return type.getSimpleName() + "Fake";
            }
            throw new UnsupportedOperationException(method.getName());
        });
    }

    @BeforeEach
    void setUp() {
        pedido = new Pedido();
        pedido.setId(UUID.randomUUID());
        pedido.setCodigoOrden("ORD-TEST");
        pedido.setEstudianteId(UUID.randomUUID());
        pedido.setCursoId(UUID.randomUUID());
        pedido.setMonto(new BigDecimal("150.00"));
        pedido.setEstado(EstadoPedido.REGISTRADO);
        otroConMismoPago = null;
        respuestaMp = id -> pagoMp("approved", pedido.getId().toString(), "150.0", "PEN");

        PedidoRepository pedidos = repo(PedidoRepository.class, name -> switch (name) {
            case "findByIdForUpdate", "findById" -> args -> pedido.getId().equals(args[0]) ? Optional.of(pedido) : Optional.empty();
            case "findFirstByMpPaymentId" -> args -> Optional.ofNullable(otroConMismoPago);
            case "save" -> args -> {
                pedidoSaves.incrementAndGet();
                return args[0];
            };
            default -> null;
        });
        ComprobanteRepository comprobantes = repo(ComprobanteRepository.class, name -> switch (name) {
            case "findByPedidoId" -> args -> Optional.empty();
            case "save" -> args -> args[0];
            default -> null;
        });
        NotificacionRepository notificaciones = repo(NotificacionRepository.class, name -> switch (name) {
            case "save" -> args -> {
                notificacionSaves.incrementAndGet();
                return args[0];
            };
            case "findByPedidoId" -> args -> List.of();
            default -> null;
        });

        UsuarioDto alumno = new UsuarioDto();
        alumno.setId(pedido.getEstudianteId());
        alumno.setNombres("Alumno");
        alumno.setCorreo("alumno@example.invalid");
        alumno.setWhatsapp("+51900000000");
        CursoDto curso = new CursoDto();
        curso.setId(pedido.getCursoId());
        curso.setTitulo("Curso");
        curso.setModalidad("VIRTUAL");

        AuthClient auth = new AuthClient("http://auth.invalid", JWT) {
            @Override
            public UsuarioDto obtenerUsuario(UUID usuarioId) {
                return alumno;
            }
        };
        CursoClient cursos = new CursoClient("http://cursos.invalid", JWT) {
            @Override
            public CursoDto obtenerCurso(UUID cursoId) {
                return curso;
            }
        };
        MercadoPagoClient mp = new MercadoPagoClient(RestClient.create(), "TEST-ficticio", "s", "f", "p") {
            @Override
            public Map<String, Object> consultarPago(String paymentId) {
                consultasMp.incrementAndGet();
                return respuestaMp.apply(paymentId);
            }
        };
        ComprobanteClient comprobanteClient = new ComprobanteClient("http://pdf.invalid") {
            @Override
            public void emitirYEnviarComprobante(Pedido p, UsuarioDto e, CursoDto c, TipoComprobante t, String ruc, String rs) {
                comprobantesEmitidos.incrementAndGet();
            }
        };
        WhatsAppCloudService whatsApp = new WhatsAppCloudService(false, "http://meta.invalid", "v21.0", "", "", "") {
            @Override
            public boolean enviarNotificacionBienvenida(Pedido p, UsuarioDto e, CursoDto c, Notificacion n) {
                return false;
            }
        };
        service = new PedidoService(pedidos, comprobantes, notificaciones, auth, cursos, mp, comprobanteClient, whatsApp);
    }

    private Map<String, Object> pagoMp(String status, String externalRef, String monto, String moneda) {
        Map<String, Object> pago = new HashMap<>();
        pago.put("id", Long.parseLong(PAYMENT_ID));
        pago.put("status", status);
        pago.put("external_reference", externalRef);
        pago.put("transaction_amount", Double.parseDouble(monto));
        pago.put("currency_id", moneda);
        return pago;
    }

    private static PagarPedidoRequest request(String paymentId) {
        PagarPedidoRequest r = new PagarPedidoRequest();
        r.setMpPaymentId(paymentId);
        return r;
    }

    @Test
    void pagoAprobadoYCoincidenteMarcaPagadoUnaSolaVez() {
        Pedido resultado = service.confirmarPagoVerificado(pedido.getId(), request(PAYMENT_ID));

        assertThat(resultado.getEstado()).isEqualTo(EstadoPedido.PAGADO);
        assertThat(resultado.getMpPaymentId()).isEqualTo(PAYMENT_ID);
        assertThat(comprobantesEmitidos).hasValue(1);
        assertThat(notificacionSaves.get()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void pagoPendienteNoMarcaPagado() {
        respuestaMp = id -> pagoMp("pending", pedido.getId().toString(), "150.0", "PEN");
        assertRechazadoSinEfectos();
    }

    @Test
    void pagoRechazadoNoMarcaPagado() {
        respuestaMp = id -> pagoMp("rejected", pedido.getId().toString(), "150.0", "PEN");
        assertRechazadoSinEfectos();
    }

    @Test
    void pagoDeOtroPedidoNoSeAplica() {
        respuestaMp = id -> pagoMp("approved", UUID.randomUUID().toString(), "150.0", "PEN");
        assertRechazadoSinEfectos();
    }

    @Test
    void montoDiferenteNoSeAplica() {
        respuestaMp = id -> pagoMp("approved", pedido.getId().toString(), "1.0", "PEN");
        assertRechazadoSinEfectos();
    }

    @Test
    void monedaDiferenteNoSeAplica() {
        respuestaMp = id -> pagoMp("approved", pedido.getId().toString(), "150.0", "USD");
        assertRechazadoSinEfectos();
    }

    @Test
    void respuestaDeOtroPagoNoSeAplica() {
        respuestaMp = id -> {
            Map<String, Object> p = pagoMp("approved", pedido.getId().toString(), "150.0", "PEN");
            p.put("id", 42L);
            return p;
        };
        assertRechazadoSinEfectos();
    }

    @Test
    void sinIdentificadorDePagoSeRechazaSinConsultar() {
        assertThatThrownBy(() -> service.confirmarPagoVerificado(pedido.getId(), request(null)))
                .isInstanceOf(PagoRechazadoException.class);
        assertThat(consultasMp).hasValue(0);
        assertThat(pedido.getEstado()).isEqualTo(EstadoPedido.REGISTRADO);
    }

    @Test
    void proveedorNoDisponibleNoConfirma() {
        respuestaMp = id -> {
            throw new PagoNoVerificableException("caido");
        };
        assertThatThrownBy(() -> service.confirmarPagoVerificado(pedido.getId(), request(PAYMENT_ID)))
                .isInstanceOf(PagoNoVerificableException.class);
        assertThat(pedidoSaves).hasValue(0);
        assertThat(pedido.getEstado()).isEqualTo(EstadoPedido.REGISTRADO);
    }

    @Test
    void reintentoConElMismoPagoEsIdempotente() {
        pedido.setEstado(EstadoPedido.PAGADO);
        pedido.setMpPaymentId(PAYMENT_ID);

        Pedido resultado = service.confirmarPagoVerificado(pedido.getId(), request(PAYMENT_ID));

        assertThat(resultado.getEstado()).isEqualTo(EstadoPedido.PAGADO);
        assertThat(consultasMp).hasValue(0);
        assertThat(comprobantesEmitidos).hasValue(0);
        assertThat(notificacionSaves).hasValue(0);
        assertThat(pedidoSaves).hasValue(0);
    }

    @Test
    void pedidoYaPagadoConOtroPagoDaConflicto() {
        pedido.setEstado(EstadoPedido.PAGADO);
        pedido.setMpPaymentId("999");
        assertThatThrownBy(() -> service.confirmarPagoVerificado(pedido.getId(), request(PAYMENT_ID)))
                .isInstanceOf(IllegalStateException.class);
        assertThat(consultasMp).hasValue(0);
        assertThat(comprobantesEmitidos).hasValue(0);
    }

    @Test
    void unMismoPagoNoConfirmaDosPedidos() {
        otroConMismoPago = new Pedido();
        otroConMismoPago.setId(UUID.randomUUID());

        assertThatThrownBy(() -> service.confirmarPagoVerificado(pedido.getId(), request(PAYMENT_ID)))
                .isInstanceOf(IllegalStateException.class);
        assertThat(pedidoSaves).hasValue(0);
        assertThat(comprobantesEmitidos).hasValue(0);
    }

    @Test
    void pedidoCanceladoNoSePuedePagar() {
        pedido.setEstado(EstadoPedido.CANCELADO);
        assertThatThrownBy(() -> service.confirmarPagoVerificado(pedido.getId(), request(PAYMENT_ID)))
                .isInstanceOf(IllegalStateException.class);
        assertThat(consultasMp).hasValue(0);
    }

    @Test
    void webhookConsultaAlProveedorYAplicaUnaSolaVez() {
        Pedido primero = service.procesarPagoMercadoPago(PAYMENT_ID);
        Pedido segundo = service.procesarPagoMercadoPago(PAYMENT_ID);

        assertThat(primero.getEstado()).isEqualTo(EstadoPedido.PAGADO);
        assertThat(segundo.getEstado()).isEqualTo(EstadoPedido.PAGADO);
        assertThat(consultasMp).hasValue(2);
        assertThat(comprobantesEmitidos).hasValue(1);
        assertThat(pedidoSaves).hasValue(1);
    }

    @Test
    void webhookConPagoNoAprobadoNoHaceNada() {
        respuestaMp = id -> pagoMp("in_process", pedido.getId().toString(), "150.0", "PEN");
        assertThat(service.procesarPagoMercadoPago(PAYMENT_ID)).isNull();
        assertThat(pedidoSaves).hasValue(0);
    }

    @Test
    void webhookConReferenciaInvalidaSeRechaza() {
        respuestaMp = id -> pagoMp("approved", "no-es-un-uuid", "150.0", "PEN");
        assertThatThrownBy(() -> service.procesarPagoMercadoPago(PAYMENT_ID))
                .isInstanceOf(PagoRechazadoException.class);
        assertThat(pedidoSaves).hasValue(0);
    }

    private void assertRechazadoSinEfectos() {
        assertThatThrownBy(() -> service.confirmarPagoVerificado(pedido.getId(), request(PAYMENT_ID)))
                .isInstanceOf(PagoRechazadoException.class);
        assertThat(pedido.getEstado()).isEqualTo(EstadoPedido.REGISTRADO);
        assertThat(pedidoSaves).hasValue(0);
        assertThat(comprobantesEmitidos).hasValue(0);
        assertThat(notificacionSaves).hasValue(0);
    }
}
