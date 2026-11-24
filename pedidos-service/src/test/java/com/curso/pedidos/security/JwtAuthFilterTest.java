package com.curso.pedidos.security;

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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtAuthFilterTest {

    static final String SECRET = "test-secret-change-me-please-32-chars";
    private final JwtVerifier verifier = new JwtVerifier(new ObjectMapper(), Clock.systemUTC(), SECRET, "pedidos-service");
    private final JwtAuthFilter filter = new JwtAuthFilter(verifier);

    static String token(String secret, String sub, String rol, long expEpoch) {
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        String header = enc.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = enc.encodeToString(("{\"sub\":\"" + sub + "\",\"rol\":\"" + rol + "\",\"iat\":1,\"exp\":" + expEpoch + "}")
                .getBytes(StandardCharsets.UTF_8));
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String sig = enc.encodeToString(mac.doFinal((header + "." + payload).getBytes(StandardCharsets.UTF_8)));
            return header + "." + payload + "." + sig;
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    static long future() {
        return Instant.now().plusSeconds(600).getEpochSecond();
    }

    private MockHttpServletResponse run(String method, String path, String bearer, MockFilterChain chain) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(method, path);
        req.setRequestURI(path);
        if (bearer != null) {
            req.addHeader("Authorization", "Bearer " + bearer);
        }
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        return res;
    }

    @Test
    void sinTokenDevuelve401() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        assertThat(run("PUT", "/api/pedidos/" + UUID.randomUUID() + "/pagar", null, chain).getStatus()).isEqualTo(401);
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    void tokenConFirmaInvalidaDevuelve401() throws Exception {
        String falso = token("otro-secreto-de-al-menos-32-caracteres!!", UUID.randomUUID().toString(), "ADMIN", future());
        assertThat(run("GET", "/api/pedidos", falso, new MockFilterChain()).getStatus()).isEqualTo(401);
    }

    @Test
    void tokenFicticioDevuelve401() throws Exception {
        assertThat(run("GET", "/api/pedidos", "mock-jwt-token-admin", new MockFilterChain()).getStatus()).isEqualTo(401);
    }

    @Test
    void tokenExpiradoDevuelve401() throws Exception {
        String expirado = token(SECRET, UUID.randomUUID().toString(), "ADMIN", Instant.now().minusSeconds(5).getEpochSecond());
        assertThat(run("GET", "/api/pedidos", expirado, new MockFilterChain()).getStatus()).isEqualTo(401);
    }

    @Test
    void estudianteSinPermisoParaListadoGlobalDevuelve403() throws Exception {
        String est = token(SECRET, UUID.randomUUID().toString(), "ESTUDIANTE", future());
        assertThat(run("GET", "/api/pedidos", est, new MockFilterChain()).getStatus()).isEqualTo(403);
        assertThat(run("POST", "/api/pedidos/whatsapp/test", est, new MockFilterChain()).getStatus()).isEqualTo(403);
        assertThat(run("POST", "/api/pagos/crear-preferencia", est, new MockFilterChain()).getStatus()).isEqualTo(403);
    }

    @Test
    void adminAutorizadoPasaAlControlador() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        String admin = token(SECRET, UUID.randomUUID().toString(), "ADMIN", future());
        assertThat(run("GET", "/api/pedidos", admin, chain).getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
        assertThat(chain.getRequest().getAttribute(AuthPrincipal.REQUEST_ATTRIBUTE)).isInstanceOf(AuthPrincipal.class);
    }

    @Test
    void webhooksSonPublicosPorqueValidanSuPropiaFirma() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        assertThat(run("POST", "/api/pedidos/webhook", null, chain).getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void propietarioYAdminPuedenOperarPeroOtroEstudianteNo() {
        UUID duenio = UUID.randomUUID();
        new AuthPrincipal(duenio.toString(), "ESTUDIANTE").requireOwnerOrAdmin(duenio);
        new AuthPrincipal(UUID.randomUUID().toString(), "ADMIN").requireOwnerOrAdmin(duenio);
        assertThatThrownBy(() -> new AuthPrincipal(UUID.randomUUID().toString(), "ESTUDIANTE").requireOwnerOrAdmin(duenio))
                .isInstanceOf(AuthPrincipal.ForbiddenException.class);
        assertThatThrownBy(() -> new AuthPrincipal(UUID.randomUUID().toString(), "DOCENTE").requireOwnerOrAdmin(duenio))
                .isInstanceOf(AuthPrincipal.ForbiddenException.class);
    }

    @Test
    void tokenDeServicioEsValidoSoloParaLectura() throws Exception {
        String servicio = verifier.serviceToken();
        assertThat(verifier.validate(servicio).isService()).isTrue();
        assertThat(run("GET", "/api/pedidos", servicio, new MockFilterChain()).getStatus()).isEqualTo(200);
        assertThat(run("PUT", "/api/pedidos/" + UUID.randomUUID() + "/pagar", servicio, new MockFilterChain()).getStatus()).isEqualTo(403);
    }

    @Test
    void secretoCortoOAusenteImpideArrancar() {
        assertThatThrownBy(() -> new JwtVerifier(new ObjectMapper(), Clock.systemUTC(), "corto", "x"))
                .isInstanceOf(IllegalStateException.class);
    }
}
