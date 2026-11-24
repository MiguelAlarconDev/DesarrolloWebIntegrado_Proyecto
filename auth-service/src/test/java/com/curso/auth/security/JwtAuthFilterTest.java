package com.curso.auth.security;

import com.curso.auth.controller.AuthController;
import com.curso.auth.dto.RegistroUsuarioRequest;
import com.curso.auth.entity.RolUsuario;
import com.curso.auth.entity.Usuario;
import com.curso.auth.exception.ForbiddenException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Autorizacion propia de auth-service: sin token, invalido, expirado, sin permisos y autorizado. */
class JwtAuthFilterTest {

    private static final String SECRET = "test-secret-change-me-please-32-chars";
    private final JwtService jwtService = new JwtService(new ObjectMapper(), SECRET, 60);
    private final JwtAuthFilter filter = new JwtAuthFilter(jwtService);

    private String tokenFor(RolUsuario rol, UUID id) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setCorreo("user@example.invalid");
        u.setRol(rol);
        return jwtService.generateToken(u);
    }

    private static String rawToken(String secret, String sub, String rol, long exp) {
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        String h = enc.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String p = enc.encodeToString(("{\"sub\":\"" + sub + "\",\"rol\":\"" + rol + "\",\"iat\":1,\"exp\":" + exp + "}")
                .getBytes(StandardCharsets.UTF_8));
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return h + "." + p + "." + enc.encodeToString(mac.doFinal((h + "." + p).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
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
    void usuariosSinTokenDevuelve401() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        assertThat(run("GET", "/api/auth/usuarios", null, chain).getStatus()).isEqualTo(401);
        assertThat(chain.getRequest()).isNull();
        assertThat(run("GET", "/api/auth/usuarios/" + UUID.randomUUID(), null, new MockFilterChain()).getStatus()).isEqualTo(401);
    }

    @Test
    void tokenInvalidoOFicticioDevuelve401() throws Exception {
        String otraFirma = rawToken("otro-secreto-de-al-menos-32-caracteres!!", UUID.randomUUID().toString(), "ADMIN",
                Instant.now().plusSeconds(600).getEpochSecond());
        assertThat(run("GET", "/api/auth/usuarios", otraFirma, new MockFilterChain()).getStatus()).isEqualTo(401);
        assertThat(run("GET", "/api/auth/usuarios", "mock-jwt-token-admin", new MockFilterChain()).getStatus()).isEqualTo(401);
    }

    @Test
    void tokenExpiradoDevuelve401() throws Exception {
        String expirado = new JwtService(new ObjectMapper(), SECRET, -1).generateToken(usuario(RolUsuario.ADMIN));
        assertThat(run("GET", "/api/auth/usuarios", expirado, new MockFilterChain()).getStatus()).isEqualTo(401);
    }

    @Test
    void estudianteNoPuedeListarNiVerOtrosUsuarios() throws Exception {
        String est = tokenFor(RolUsuario.ESTUDIANTE, UUID.randomUUID());
        assertThat(run("GET", "/api/auth/usuarios", est, new MockFilterChain()).getStatus()).isEqualTo(403);
        assertThat(run("GET", "/api/auth/usuarios/" + UUID.randomUUID(), est, new MockFilterChain()).getStatus()).isEqualTo(403);
        String doc = tokenFor(RolUsuario.DOCENTE, UUID.randomUUID());
        assertThat(run("GET", "/api/auth/usuarios", doc, new MockFilterChain()).getStatus()).isEqualTo(403);
    }

    @Test
    void usuarioPuedeVerSuPropioPerfil() throws Exception {
        UUID id = UUID.randomUUID();
        MockFilterChain chain = new MockFilterChain();
        assertThat(run("GET", "/api/auth/usuarios/" + id, tokenFor(RolUsuario.ESTUDIANTE, id), chain).getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void adminYServicioInternoAutorizados() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        assertThat(run("GET", "/api/auth/usuarios", tokenFor(RolUsuario.ADMIN, UUID.randomUUID()), chain).getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();

        String servicio = rawToken(SECRET, "pedidos-service", "SERVICE", Instant.now().plusSeconds(300).getEpochSecond());
        MockFilterChain chain2 = new MockFilterChain();
        assertThat(run("GET", "/api/auth/usuarios/" + UUID.randomUUID(), servicio, chain2).getStatus()).isEqualTo(200);
        assertThat(chain2.getRequest()).isNotNull();
    }

    @Test
    void loginRegistroY2faSonPublicosAunConTokenViejo() throws Exception {
        String expirado = new JwtService(new ObjectMapper(), SECRET, -1).generateToken(usuario(RolUsuario.ESTUDIANTE));
        for (String path : new String[]{"/api/auth/login", "/api/auth/registro", "/api/auth/verificar-2fa"}) {
            MockFilterChain chain = new MockFilterChain();
            assertThat(run("POST", path, null, chain).getStatus()).isEqualTo(200);
            assertThat(chain.getRequest()).isNotNull();
            MockFilterChain chain2 = new MockFilterChain();
            assertThat(run("POST", path, expirado, chain2).getStatus()).isEqualTo(200);
            assertThat(chain2.getRequest()).isNotNull();
        }
    }

    @Test
    void registroPublicoNoPuedeCrearAdminNiDocente() {
        AuthController controller = new AuthController(null);
        for (RolUsuario rol : new RolUsuario[]{RolUsuario.ADMIN, RolUsuario.DOCENTE}) {
            RegistroUsuarioRequest req = new RegistroUsuarioRequest();
            req.setRol(rol);
            MockHttpServletRequest anon = new MockHttpServletRequest("POST", "/api/auth/registro");
            assertThatThrownBy(() -> controller.registrar(req, anon)).isInstanceOf(ForbiddenException.class);

            MockHttpServletRequest estudiante = new MockHttpServletRequest("POST", "/api/auth/registro");
            estudiante.setAttribute(AccessPrincipal.REQUEST_ATTRIBUTE, new AccessPrincipal(UUID.randomUUID().toString(), "ESTUDIANTE"));
            assertThatThrownBy(() -> controller.registrar(req, estudiante)).isInstanceOf(ForbiddenException.class);
        }
    }

    @Test
    void secretoCortoNoSePermite() {
        assertThatThrownBy(() -> new JwtService(new ObjectMapper(), "corto", 60)).isInstanceOf(IllegalArgumentException.class);
    }

    private static Usuario usuario(RolUsuario rol) {
        Usuario u = new Usuario();
        u.setId(UUID.randomUUID());
        u.setCorreo("user@example.invalid");
        u.setRol(rol);
        return u;
    }
}
