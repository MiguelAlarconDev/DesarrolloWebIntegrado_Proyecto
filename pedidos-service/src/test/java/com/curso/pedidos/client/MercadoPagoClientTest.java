package com.curso.pedidos.client;

import com.curso.pedidos.exception.PagoNoVerificableException;
import com.curso.pedidos.exception.PagoRechazadoException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/** Contrato HTTP con la API de pagos de Mercado Pago, simulada (sin red). */
class MercadoPagoClientTest {

    private MockRestServiceServer server;

    private MercadoPagoClient client(String token) {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://mp.invalid");
        server = MockRestServiceServer.bindTo(builder).build();
        return new MercadoPagoClient(builder.build(), token, "s", "f", "p");
    }

    @Test
    void consultaElPagoConBearerYDevuelveLaRespuesta() {
        MercadoPagoClient mp = client("TEST-token-ficticio");
        server.expect(requestTo("http://mp.invalid/v1/payments/123"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer TEST-token-ficticio"))
                .andRespond(withSuccess("{\"id\":123,\"status\":\"approved\",\"currency_id\":\"PEN\"}", MediaType.APPLICATION_JSON));

        Map<String, Object> pago = mp.consultarPago("123");

        assertThat(pago.get("status")).isEqualTo("approved");
        server.verify();
    }

    @Test
    void pagoInexistenteSeRechaza() {
        MercadoPagoClient mp = client("TEST-token-ficticio");
        server.expect(requestTo("http://mp.invalid/v1/payments/404")).andRespond(withStatus(HttpStatus.NOT_FOUND));
        assertThatThrownBy(() -> mp.consultarPago("404")).isInstanceOf(PagoRechazadoException.class);
    }

    @Test
    void errorDelProveedorNoEsVerificable() {
        MercadoPagoClient mp = client("TEST-token-ficticio");
        server.expect(requestTo("http://mp.invalid/v1/payments/500")).andRespond(withServerError());
        assertThatThrownBy(() -> mp.consultarPago("500")).isInstanceOf(PagoNoVerificableException.class);
    }

    @Test
    void sinCredencialesNoSeConsultaNiSeConfirma() {
        MercadoPagoClient mp = client("");
        assertThatThrownBy(() -> mp.consultarPago("123")).isInstanceOf(PagoNoVerificableException.class);
        server.verify();
    }

    private static com.curso.pedidos.entity.Pedido pedido() {
        com.curso.pedidos.entity.Pedido p = new com.curso.pedidos.entity.Pedido();
        p.setId(java.util.UUID.fromString("11111111-2222-3333-4444-555555555555"));
        p.setCursoId(java.util.UUID.randomUUID());
        p.setMonto(new java.math.BigDecimal("180.00"));
        return p;
    }

    @Test
    void preferenciaEnPenLigadaAlPedidoConUrlsDeRetorno() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://mp.invalid");
        server = MockRestServiceServer.bindTo(builder).build();
        MercadoPagoClient mp = new MercadoPagoClient(builder.build(), "TEST-token-ficticio",
                "http://localhost:4200/checkout", "http://localhost:4200/checkout", "http://localhost:4200/checkout");
        server.expect(requestTo("http://mp.invalid/checkout/preferences"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer TEST-token-ficticio"))
                .andExpect(jsonPath("$.external_reference").value("11111111-2222-3333-4444-555555555555"))
                .andExpect(jsonPath("$.items[0].currency_id").value("PEN"))
                .andExpect(jsonPath("$.items[0].unit_price").value(180.00))
                .andExpect(jsonPath("$.items[0].quantity").value(1))
                .andExpect(jsonPath("$.back_urls.success").value("http://localhost:4200/checkout"))
                .andRespond(withSuccess("{\"id\":\"123-pref\",\"init_point\":\"https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=123-pref\"}",
                        MediaType.APPLICATION_JSON));

        var pref = mp.crearPreferencia(pedido(), null, null);

        assertThat(pref.getId()).isEqualTo("123-pref");
        assertThat(pref.getInitPoint()).startsWith("https://www.mercadopago.com.pe/");
        server.verify();
    }

    @Test
    void preferenciaRechazadaDevuelveVaciaSinUrlFicticia() {
        MercadoPagoClient mp = client("TEST-token-ficticio");
        server.expect(requestTo("http://mp.invalid/checkout/preferences"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"message\":\"invalid access token\",\"error\":\"unauthorized\",\"status\":401}"));
        var pref = mp.crearPreferencia(pedido(), null, null);
        assertThat(pref.getId()).isNull();
        assertThat(pref.getInitPoint()).isNull();
        server.verify();
    }

    @Test
    void sinTokenNoSeLlamaAlProveedorParaPreferencias() {
        MercadoPagoClient mp = client("");
        var pref = mp.crearPreferencia(pedido(), null, null);
        assertThat(pref.getInitPoint()).isNull();
        server.verify();
    }

    @Test
    void mensajeDelProveedorSeExtraeAcotado() {
        assertThat(MercadoPagoClient.mensajeProveedor("{\"message\":\"invalid access token\",\"status\":401}"))
                .isEqualTo("invalid access token");
        assertThat(MercadoPagoClient.mensajeProveedor(null)).isEqualTo("(sin cuerpo)");
        assertThat(MercadoPagoClient.mensajeProveedor("x".repeat(500))).hasSize(200);
    }

    @Test
    void identificadorNoNumericoSeRechazaSinLlamarAlProveedor() {
        MercadoPagoClient mp = client("TEST-token-ficticio");
        assertThatThrownBy(() -> mp.consultarPago("MP-PAY-123")).isInstanceOf(PagoRechazadoException.class);
        assertThatThrownBy(() -> mp.consultarPago("../users")).isInstanceOf(PagoRechazadoException.class);
        server.verify();
    }
}
