package com.curso.pedidos.security;

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
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Valida los JWT HS256 emitidos por auth-service (mismo secreto compartido JWT_SECRET)
 * y firma tokens de servicio de corta duracion para llamadas internas.
 */
@Component
public class JwtVerifier {

    public static final int MIN_SECRET_LENGTH = 32;
    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();
    private static final Duration SERVICE_TOKEN_TTL = Duration.ofMinutes(5);

    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final byte[] secret;
    private final String serviceName;

    private volatile String cachedServiceToken;
    private volatile Instant cachedServiceTokenExp = Instant.EPOCH;

    @Autowired
    public JwtVerifier(ObjectMapper objectMapper,
                       @Value("${security.jwt.secret}") String secret,
                       @Value("${spring.application.name:pedidos-service}") String serviceName) {
        this(objectMapper, Clock.systemUTC(), secret, serviceName);
    }

    public JwtVerifier(ObjectMapper objectMapper, Clock clock, String secret, String serviceName) {
        if (secret == null || secret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("JWT_SECRET debe estar definido y tener al menos " + MIN_SECRET_LENGTH + " caracteres");
        }
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.serviceName = serviceName;
    }

    public AuthPrincipal validate(String token) {
        String[] parts = token != null ? token.split("\\.") : new String[0];
        if (parts.length != 3) {
            throw new InvalidTokenException("Token JWT invalido");
        }
        Map<String, Object> header = decode(parts[0]);
        if (!"HS256".equals(header.get("alg"))) {
            throw new InvalidTokenException("Algoritmo JWT no permitido");
        }
        String expected = sign(parts[0] + "." + parts[1]);
        if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), parts[2].getBytes(StandardCharsets.US_ASCII))) {
            throw new InvalidTokenException("Firma JWT invalida");
        }
        Map<String, Object> claims = decode(parts[1]);
        Object exp = claims.get("exp");
        if (!(exp instanceof Number number) || !Instant.ofEpochSecond(number.longValue()).isAfter(Instant.now(clock))) {
            throw new InvalidTokenException("Token JWT expirado");
        }
        Object sub = claims.get("sub");
        Object rol = claims.get("rol");
        if (sub == null || rol == null || sub.toString().isBlank() || rol.toString().isBlank()) {
            throw new InvalidTokenException("Claims JWT incompletos");
        }
        return new AuthPrincipal(sub.toString(), rol.toString());
    }

    /** Additional validation only for the internal enrollment endpoint. */
    public AuthPrincipal validateMatricula(String token) {
        try {
            AuthPrincipal principal = validate(token);
            Map<String, Object> claims = decode(token.split("\\.")[1]);
            long now = Instant.now(clock).getEpochSecond();
            if (!"pedidos-service:matriculas".equals(claims.get("aud"))
                    || !(claims.get("iat") instanceof Number issued)
                    || !(claims.get("exp") instanceof Number expires)
                    || issued.longValue() > now || issued.longValue() < now - 300
                    || expires.longValue() <= issued.longValue()
                    || expires.longValue() - issued.longValue() > 300) {
                throw new InvalidTokenException("Token interno de matricula invalido");
            }
            return principal;
        } catch (java.time.DateTimeException | ArithmeticException ex) {
            throw new InvalidTokenException("Token interno de matricula invalido");
        }
    }

    /** Token interno (rol SERVICE) para llamar a auth-service y cursos-service. */
    public String serviceToken() {
        Instant now = Instant.now(clock);
        if (cachedServiceToken != null && now.isBefore(cachedServiceTokenExp.minusSeconds(30))) {
            return cachedServiceToken;
        }
        Instant exp = now.plus(SERVICE_TOKEN_TTL);
        Map<String, Object> header = new LinkedHashMap<>();
        header.put("alg", "HS256");
        header.put("typ", "JWT");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", serviceName);
        payload.put("rol", AuthPrincipal.ROL_SERVICE);
        payload.put("iat", now.getEpochSecond());
        payload.put("exp", exp.getEpochSecond());
        String unsigned = encode(header) + "." + encode(payload);
        cachedServiceToken = unsigned + "." + sign(unsigned);
        cachedServiceTokenExp = exp;
        return cachedServiceToken;
    }

    private Map<String, Object> decode(String part) {
        try {
            return objectMapper.readValue(URL_DECODER.decode(part), new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new InvalidTokenException("Token JWT mal formado");
        }
    }

    private String encode(Map<String, Object> data) {
        try {
            return URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(data));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo serializar JWT", ex);
        }
    }

    private String sign(String unsigned) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(secret, HMAC_SHA256));
            return URL_ENCODER.encodeToString(mac.doFinal(unsigned.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo firmar JWT", ex);
        }
    }

    public static class InvalidTokenException extends RuntimeException {
        public InvalidTokenException(String message) {
            super(message);
        }
    }
}
