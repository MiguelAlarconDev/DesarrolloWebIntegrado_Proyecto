package com.cursos.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtAuthFilterTest {

    private static final String SECRET = "test-secret-change-me-please-32-chars";
    private final JwtAuthFilter filter = new JwtAuthFilter(
            new JwtVerifier(new ObjectMapper(), Clock.systemUTC(), SECRET, "cursos-service"));
    private final String curso = "/api/cursos/" + UUID.randomUUID();

    private static String token(String secret, String rol, long exp) {
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        String h = enc.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String p = enc.encodeToString(("{\"sub\":\"" + UUID.randomUUID() + "\",\"rol\":\"" + rol + "\",\"iat\":1,\"exp\":" + exp + "}")
                .getBytes(StandardCharsets.UTF_8));
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return h + "." + p + "." + enc.encodeToString(mac.doFinal((h + "." + p).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static String valid(String rol) {
        return token(SECRET, rol, Instant.now().plusSeconds(600).getEpochSecond());
    }

    private int status(String method, String path, String bearer) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(method, path);
        req.setRequestURI(path);
        if (bearer != null) {
            req.addHeader("Authorization", "Bearer " + bearer);
        }
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        return res.getStatus();
    }

    @Test
    void catalogoEsPublico() throws Exception {
        assertThat(status("GET", "/api/cursos", null)).isEqualTo(200);
        assertThat(status("GET", curso, null)).isEqualTo(200);
    }

    @Test
    void modificarSinTokenInvalidoOExpiradoDevuelve401() throws Exception {
        assertThat(status("PUT", curso + "/descontar-aforo", null)).isEqualTo(401);
        assertThat(status("PUT", curso + "/descontar-aforo", token("otro-secreto-de-al-menos-32-caracteres!!", "ADMIN",
                Instant.now().plusSeconds(600).getEpochSecond()))).isEqualTo(401);
        assertThat(status("PUT", curso + "/estado", token(SECRET, "ADMIN", Instant.now().minusSeconds(1).getEpochSecond()))).isEqualTo(401);
    }

    @Test
    void estudianteNoPuedeModificarCursosNiAforo() throws Exception {
        assertThat(status("PUT", curso + "/descontar-aforo", valid("ESTUDIANTE"))).isEqualTo(403);
        assertThat(status("PUT", curso + "/enlace", valid("ESTUDIANTE"))).isEqualTo(403);
        assertThat(status("POST", "/api/cursos", valid("ESTUDIANTE"))).isEqualTo(403);
        assertThat(status("PUT", curso + "/liberar-aforo", valid("DOCENTE"))).isEqualTo(403);
    }

    @Test
    void rolesAutorizados() throws Exception {
        assertThat(status("PUT", curso + "/descontar-aforo", valid("SERVICE"))).isEqualTo(200);
        assertThat(status("PUT", curso + "/liberar-aforo", valid("ADMIN"))).isEqualTo(200);
        assertThat(status("PUT", curso + "/enlace", valid("DOCENTE"))).isEqualTo(200);
        assertThat(status("POST", "/api/cursos", valid("ADMIN"))).isEqualTo(200);
    }
}
