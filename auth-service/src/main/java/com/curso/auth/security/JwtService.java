package com.curso.auth.security;

import com.curso.auth.entity.Usuario;
import com.curso.auth.exception.AuthenticationException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

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
import java.util.UUID;

@Service
public class JwtService {

    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final String secret;
    private final Duration expiration;

    @Autowired
    public JwtService(
            ObjectMapper objectMapper,
            @Value("${security.jwt.secret}") String secret,
            @Value("${security.jwt.expiration-minutes:${JWT_EXPIRATION_MINUTES:60}}") long expirationMinutes) {
        this(objectMapper, Clock.systemUTC(), secret, Duration.ofMinutes(expirationMinutes));
    }

    JwtService(ObjectMapper objectMapper, Clock clock, String secret, Duration expiration) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalArgumentException("JWT_SECRET debe estar definido y tener al menos 32 caracteres");
        }
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.secret = secret;
        this.expiration = expiration;
    }

    public String generateToken(Usuario usuario) {
        Instant issuedAt = Instant.now(clock);
        Instant expiresAt = issuedAt.plus(expiration);

        Map<String, Object> header = new LinkedHashMap<>();
        header.put("alg", "HS256");
        header.put("typ", "JWT");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", usuario.getId().toString());
        payload.put("userId", usuario.getId().toString());
        payload.put("correo", usuario.getCorreo());
        payload.put("rol", usuario.getRol().name());
        payload.put("iat", issuedAt.getEpochSecond());
        payload.put("exp", expiresAt.getEpochSecond());

        String unsignedToken = encodeJson(header) + "." + encodeJson(payload);
        return unsignedToken + "." + sign(unsignedToken);
    }

    /**
     * Valida firma HS256 y expiracion y devuelve (sub, rol). Acepta tambien tokens de
     * servicio (rol SERVICE) firmados con el mismo secreto por otros microservicios.
     */
    public AccessPrincipal validateAccessToken(String token) {
        String[] parts = token != null ? token.split("\\.") : new String[0];
        if (parts.length != 3) {
            throw new AuthenticationException("Token JWT invalido");
        }
        Map<String, Object> header = decodePayload(parts[0]);
        if (!"HS256".equals(header.get("alg"))) {
            throw new AuthenticationException("Algoritmo JWT no permitido");
        }
        String expectedSignature = sign(parts[0] + "." + parts[1]);
        if (!MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
            throw new AuthenticationException("Firma JWT invalida");
        }
        Map<String, Object> claims = decodePayload(parts[1]);
        Instant expirationTime = Instant.ofEpochSecond(asLong(claims.get("exp"), "exp"));
        if (!expirationTime.isAfter(Instant.now(clock))) {
            throw new AuthenticationException("Token JWT expirado");
        }
        return new AccessPrincipal(asString(claims.get("sub"), "sub"), asString(claims.get("rol"), "rol"));
    }

    public JwtClaims validateAndExtractClaims(String token) {
        String[] parts = token != null ? token.split("\\.") : new String[0];
        if (parts.length != 3) {
            throw new AuthenticationException("Token JWT invalido");
        }

        String unsignedToken = parts[0] + "." + parts[1];
        String expectedSignature = sign(unsignedToken);
        if (!MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
            throw new AuthenticationException("Firma JWT invalida");
        }

        Map<String, Object> claims = decodePayload(parts[1]);
        Instant expirationTime = Instant.ofEpochSecond(asLong(claims.get("exp"), "exp"));
        if (!expirationTime.isAfter(Instant.now(clock))) {
            throw new AuthenticationException("Token JWT expirado");
        }

        Instant issuedAt = Instant.ofEpochSecond(asLong(claims.get("iat"), "iat"));
        UUID userId = UUID.fromString(asString(claims.get("sub"), "sub"));
        String correo = asString(claims.get("correo"), "correo");
        String rol = asString(claims.get("rol"), "rol");

        return new JwtClaims(userId, correo, com.curso.auth.entity.RolUsuario.valueOf(rol), issuedAt, expirationTime);
    }

    private String encodeJson(Map<String, Object> data) {
        try {
            return URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(data));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("No se pudo serializar JWT", ex);
        }
    }

    private Map<String, Object> decodePayload(String payload) {
        try {
            byte[] decoded = URL_DECODER.decode(payload);
            return objectMapper.readValue(decoded, new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new AuthenticationException("Claims JWT invalidos");
        }
    }

    private String sign(String unsignedToken) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256));
            return URL_ENCODER.encodeToString(mac.doFinal(unsignedToken.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo firmar JWT", ex);
        }
    }

    private static String asString(Object value, String claim) {
        if (value == null) {
            throw new AuthenticationException("Claim JWT faltante: " + claim);
        }
        return value.toString();
    }

    private static long asLong(Object value, String claim) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(asString(value, claim));
        } catch (NumberFormatException ex) {
            throw new AuthenticationException("Claim JWT invalido: " + claim);
        }
    }
}
