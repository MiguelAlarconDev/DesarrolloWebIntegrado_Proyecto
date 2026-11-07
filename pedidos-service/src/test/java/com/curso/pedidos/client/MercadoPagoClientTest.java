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

    @Test
    void identificadorNoNumericoSeRechazaSinLlamarAlProveedor() {
        MercadoPagoClient mp = client("TEST-token-ficticio");
        assertThatThrownBy(() -> mp.consultarPago("MP-PAY-123")).isInstanceOf(PagoRechazadoException.class);
        assertThatThrownBy(() -> mp.consultarPago("../users")).isInstanceOf(PagoRechazadoException.class);
        server.verify();
    }
}
