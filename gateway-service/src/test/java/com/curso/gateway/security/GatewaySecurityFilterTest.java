package com.curso.gateway.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GatewaySecurityFilterTest {

    private static final String SECRET = "test-secret-change-me-please-32-chars";

    @Test
    void ipBloqueadaDevuelve403() throws ServletException, IOException {
        IpBlockFilter filter = new IpBlockFilter(new ClientIpResolver("127.0.0.1"), "192.168.1.50");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/cursos");
        request.setRemoteAddr("192.168.1.50");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    void ipPermitidaContinua() throws ServletException, IOException {
        IpBlockFilter filter = new IpBlockFilter(new ClientIpResolver("127.0.0.1"), "192.168.1.50");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/cursos");
        request.setRemoteAddr("192.168.1.51");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void corsPreflightPermitidoDesdeOrigenConfigurado() throws ServletException, IOException {
        CorsFilter filter = new CorsFilter("http://localhost:5173", true);
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/cursos");
        request.addHeader("Origin", "http://localhost:5173");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(response.getHeader("Access-Control-Allow-Origin")).isEqualTo("http://localhost:5173");
        assertThat(response.getHeader("Access-Control-Allow-Credentials")).isEqualTo("true");
    }

    @Test
    void jwtValidoContinuaEnRutaProtegida() throws ServletException, IOException {
        AccessControlFilter filter = jwtFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/usuarios");
        request.addHeader("Authorization", "Bearer " + token(Instant.now().plusSeconds(3600), "ADMIN"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void jwtInvalidoDevuelve401() throws ServletException, IOException {
        AccessControlFilter filter = jwtFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/usuarios");
        request.addHeader("Authorization", "Bearer token.invalido");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
    }

    @Test
    void jwtExpiradoDevuelve401() throws ServletException, IOException {
        AccessControlFilter filter = jwtFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/usuarios");
        request.addHeader("Authorization", "Bearer " + token(Instant.now().minusSeconds(60)));
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
    }

    private static AccessControlFilter jwtFilter() {
        GatewayJwtService jwtService = new GatewayJwtService(new ObjectMapper(), SECRET);
        return new AccessControlFilter(jwtService, "clave-interna-de-prueba");
    }

    private static String token(Instant expiration) {
        return token(expiration, "ESTUDIANTE");
    }

    private static String token(Instant expiration, String rol) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();

            Map<String, Object> header = new LinkedHashMap<>();
            header.put("alg", "HS256");
            header.put("typ", "JWT");

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sub", "11111111-1111-1111-1111-111111111111");
            payload.put("userId", "11111111-1111-1111-1111-111111111111");
            payload.put("correo", "alumno@test.com");
            payload.put("rol", rol);
            payload.put("iat", Instant.now().getEpochSecond());
            payload.put("exp", expiration.getEpochSecond());

            String unsigned = encoder.encodeToString(mapper.writeValueAsBytes(header))
                    + "."
                    + encoder.encodeToString(mapper.writeValueAsBytes(payload));
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return unsigned + "." + encoder.encodeToString(mac.doFinal(unsigned.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    // ------------------------------------------------------------------ niveles de acceso

    private static MockHttpServletResponse call(String method, String path, String bearer, MockFilterChain chain)
            throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        if (bearer != null) {
            request.addHeader("Authorization", "Bearer " + bearer);
        }
        request.addHeader("X-User-Role", "ADMIN"); // intento de suplantacion: debe descartarse
        MockHttpServletResponse response = new MockHttpServletResponse();
        jwtFilter().doFilter(request, response, chain);
        return response;
    }

    @Test
    void catalogoEsPublico() throws Exception {
        assertThat(call("GET", "/api/cursos", null, new MockFilterChain()).getStatus()).isEqualTo(200);
    }

    @Test
    void estudianteNoPuedeListarUsuarios() throws Exception {
        String t = token(Instant.now().plusSeconds(600), "ESTUDIANTE");
        assertThat(call("GET", "/api/auth/usuarios", t, new MockFilterChain()).getStatus()).isEqualTo(403);
    }

    @Test
    void estudianteSoloVeSusPedidos() throws Exception {
        String t = token(Instant.now().plusSeconds(600), "ESTUDIANTE");
        assertThat(call("GET", "/api/pedidos/estudiante/11111111-1111-1111-1111-111111111111", t, new MockFilterChain()).getStatus()).isEqualTo(200);
        assertThat(call("GET", "/api/pedidos/estudiante/22222222-2222-2222-2222-222222222222", t, new MockFilterChain()).getStatus()).isEqualTo(403);
    }

    @Test
    void rutasInternasNuncaSePublican() throws Exception {
        String t = token(Instant.now().plusSeconds(600), "ADMIN");
        assertThat(call("PUT", "/api/cursos/abc/descontar-aforo", t, new MockFilterChain()).getStatus()).isEqualTo(403);
    }

    @Test
    void rutaDesconocidaSeRechaza() throws Exception {
        assertThat(call("DELETE", "/api/cursos/abc", null, new MockFilterChain()).getStatus()).isEqualTo(404);
    }

    @Test
    void cabecerasDeConfianzaLasPoneElGatewayNoElCliente() throws Exception {
        String t = token(Instant.now().plusSeconds(600), "ESTUDIANTE");
        MockFilterChain chain = new MockFilterChain();
        call("POST", "/api/pedidos/checkout", t, chain);
        jakarta.servlet.http.HttpServletRequest forwarded = (jakarta.servlet.http.HttpServletRequest) chain.getRequest();
        assertThat(forwarded.getHeader("X-User-Role")).isEqualTo("ESTUDIANTE");
        assertThat(forwarded.getHeader("X-User-Id")).isEqualTo("11111111-1111-1111-1111-111111111111");
        assertThat(forwarded.getHeader("X-Internal-Key")).isEqualTo("clave-interna-de-prueba");
    }

    @Test
    void registroPublicoNoPropagaRolFalsificado() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        call("POST", "/api/auth/registro", null, chain);
        jakarta.servlet.http.HttpServletRequest forwarded = (jakarta.servlet.http.HttpServletRequest) chain.getRequest();
        assertThat(forwarded.getHeader("X-User-Role")).isNull();
    }

    // ------------------------------------------------------------------ IP: rate limit y fuerza bruta

    @Test
    void bloqueaIpTrasIntentosFallidosDeLogin() throws Exception {
        IpProtectionService protection = IpProtectionService.defaults();
        IpBlockFilter filter = new IpBlockFilter(new ClientIpResolver("127.0.0.1"), "", protection);
        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest login = new MockHttpServletRequest("POST", "/api/auth/login");
            login.setRemoteAddr("203.0.113.7");
            MockHttpServletResponse r = new MockHttpServletResponse();
            filter.doFilter(login, r, (req, res) -> ((MockHttpServletResponse) res).setStatus(401));
        }
        MockHttpServletRequest next = new MockHttpServletRequest("GET", "/api/cursos");
        next.setRemoteAddr("203.0.113.7");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(next, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(protection.activeBans()).hasSize(1);
    }

    @Test
    void rateLimitDeLoginDevuelve429() throws Exception {
        IpBlockFilter filter = new IpBlockFilter(new ClientIpResolver("127.0.0.1"), "", IpProtectionService.defaults());
        int last = 0;
        for (int i = 0; i < 11; i++) {
            MockHttpServletRequest login = new MockHttpServletRequest("POST", "/api/auth/login");
            login.setRemoteAddr("198.51.100.9");
            MockHttpServletResponse r = new MockHttpServletResponse();
            filter.doFilter(login, r, new MockFilterChain());
            last = r.getStatus();
        }
        assertThat(last).isEqualTo(429);
    }

    @Test
    void xForwardedForSoloSeAceptaDesdeProxyDeConfianza() {
        ClientIpResolver resolver = new ClientIpResolver("10.0.0.0/8");
        MockHttpServletRequest viaProxy = new MockHttpServletRequest();
        viaProxy.setRemoteAddr("10.1.2.3");
        viaProxy.addHeader("X-Forwarded-For", "1.1.1.1, 190.40.10.20");
        assertThat(resolver.resolve(viaProxy)).isEqualTo("190.40.10.20");

        MockHttpServletRequest directo = new MockHttpServletRequest();
        directo.setRemoteAddr("190.40.10.20");
        directo.addHeader("X-Forwarded-For", "8.8.8.8");
        assertThat(resolver.resolve(directo)).isEqualTo("190.40.10.20");
    }

    @Test
    void corsRechazaOrigenNoPermitido() throws Exception {
        CorsFilter filter = new CorsFilter("http://localhost:5173", false);
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/cursos");
        request.addHeader("Origin", "https://sitio-malicioso.com");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getHeader("Access-Control-Allow-Origin")).isNull();
    }
}
