package com.curso.pedidos.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Verifica la cabecera x-signature de las notificaciones de Mercado Pago:
 * HMAC-SHA256(secret, "id:{data.id};request-id:{x-request-id};ts:{ts};") == v1.
 * Aun con firma valida, el pago se vuelve a consultar al proveedor antes de aplicarlo.
 */
@Component
public class MercadoPagoWebhookVerifier {

    private final String secret;

    public MercadoPagoWebhookVerifier(@Value("${mercadopago.webhook-secret:}") String secret) {
        this.secret = secret;
    }

    public boolean isConfigurado() {
        return secret != null && !secret.isBlank();
    }

    public boolean verificar(String xSignature, String xRequestId, String dataId) {
        if (!isConfigurado() || xSignature == null || xSignature.isBlank()) {
            return false;
        }
        String ts = null;
        String v1 = null;
        for (String part : xSignature.split(",")) {
            String[] kv = part.split("=", 2);
            if (kv.length != 2) {
                continue;
            }
            String key = kv[0].trim();
            if ("ts".equals(key)) {
                ts = kv[1].trim();
            } else if ("v1".equals(key)) {
                v1 = kv[1].trim();
            }
        }
        if (ts == null || v1 == null) {
            return false;
        }
        StringBuilder manifest = new StringBuilder();
        if (dataId != null && !dataId.isBlank()) {
            manifest.append("id:").append(dataId.toLowerCase(Locale.ROOT)).append(';');
        }
        if (xRequestId != null && !xRequestId.isBlank()) {
            manifest.append("request-id:").append(xRequestId).append(';');
        }
        manifest.append("ts:").append(ts).append(';');

        String expected = hmacHex(manifest.toString());
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                v1.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII));
    }

    String hmacHex(String manifest) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo calcular la firma del webhook", ex);
        }
    }
}
