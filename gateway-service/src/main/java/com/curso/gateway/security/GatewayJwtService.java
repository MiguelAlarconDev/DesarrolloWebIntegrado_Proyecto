package com.curso.gateway.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

@Component
public class GatewayJwtService {

    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final String secret;

    @Autowired
    public GatewayJwtService(
            ObjectMapper objectMapper,
            @Value("${security.jwt.secret:${JWT_SECRET:dev-secret-change-me-please-32-chars}}") String secret) {
        this(objectMapper, Clock.systemUTC(), secret);
    }

    GatewayJwtService(ObjectMapper objectMapper, Clock clock, String secret) {
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.secret = secret;
    }

    public Map<String, Object> validate(String token) {
        String[] parts = token != null ? token.split("\\.") : new String[0];
        if (parts.length != 3) {
            throw new IllegalArgumentException("Token JWT invalido");
        }

        String unsignedToken = parts[0] + "." + parts[1];
        String expectedSignature = sign(unsignedToken);
        if (!MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Firma JWT invalida");
        }

        Map<String, Object> claims = decodePayload(parts[1]);
        Object exp = claims.get("exp");
        long expiresAt = exp instanceof Number number ? number.longValue() : Long.parseLong(String.valueOf(exp));
        if (!Instant.ofEpochSecond(expiresAt).isAfter(Instant.now(clock))) {
            throw new IllegalArgumentException("Token JWT expirado");
        }

        return claims;
    }

    private Map<String, Object> decodePayload(String payload) {
        try {
            return objectMapper.readValue(URL_DECODER.decode(payload), new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new IllegalArgumentException("Claims JWT invalidos", ex);
        }
    }

    private String sign(String unsignedToken) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256));
            return URL_ENCODER.encodeToString(mac.doFinal(unsignedToken.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo validar JWT", ex);
        }
    }
}
