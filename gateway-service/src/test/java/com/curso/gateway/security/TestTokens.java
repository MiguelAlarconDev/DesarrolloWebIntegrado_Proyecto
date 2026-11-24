package com.curso.gateway.security;

import com.fasterxml.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/** Tokens HS256 de prueba firmados con el secreto de los tests. */
final class TestTokens {
    static final String SECRET = "test-secret-change-me-please-32-chars";

    private TestTokens() {
    }

    static String token(String rol, String sub) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
            Map<String, Object> header = new LinkedHashMap<>();
            header.put("alg", "HS256");
            header.put("typ", "JWT");
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sub", sub);
            payload.put("rol", rol);
            payload.put("iat", Instant.now().getEpochSecond());
            payload.put("exp", Instant.now().plusSeconds(600).getEpochSecond());
            String unsigned = enc.encodeToString(mapper.writeValueAsBytes(header)) + "."
                    + enc.encodeToString(mapper.writeValueAsBytes(payload));
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return unsigned + "." + enc.encodeToString(mac.doFinal(unsigned.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
