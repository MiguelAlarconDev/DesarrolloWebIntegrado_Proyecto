package com.curso.pedidos.client;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MercadoPagoWebhookVerifierTest {

    private static final String SECRET = "webhook-secret-ficticio";

    @Test
    void firmaValidaSegunManifiestoDocumentado() {
        MercadoPagoWebhookVerifier verifier = new MercadoPagoWebhookVerifier(SECRET);
        String v1 = verifier.hmacHex("id:123456;request-id:req-1;ts:1700000000;");
        assertThat(verifier.verificar("ts=1700000000,v1=" + v1, "req-1", "123456")).isTrue();
    }

    @Test
    void firmaAlteradaOParaOtroPagoSeRechaza() {
        MercadoPagoWebhookVerifier verifier = new MercadoPagoWebhookVerifier(SECRET);
        String v1 = verifier.hmacHex("id:123456;request-id:req-1;ts:1700000000;");
        assertThat(verifier.verificar("ts=1700000000,v1=" + v1, "req-1", "999999")).isFalse();
        assertThat(verifier.verificar("ts=1700000001,v1=" + v1, "req-1", "123456")).isFalse();
        assertThat(verifier.verificar("ts=1700000000,v1=00ff", "req-1", "123456")).isFalse();
        assertThat(verifier.verificar(null, "req-1", "123456")).isFalse();
    }

    @Test
    void sinSecretoConfiguradoNadaEsValido() {
        MercadoPagoWebhookVerifier verifier = new MercadoPagoWebhookVerifier("");
        assertThat(verifier.isConfigurado()).isFalse();
        assertThat(verifier.verificar("ts=1,v1=abc", "r", "1")).isFalse();
    }
}
