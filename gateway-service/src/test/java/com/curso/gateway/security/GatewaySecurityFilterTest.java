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
        JwtAuthenticationFilter filter = jwtFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/usuarios");
        request.addHeader("Authorization", "Bearer " + token(Instant.now().plusSeconds(3600)));
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void jwtInvalidoDevuelve401() throws ServletException, IOException {
        JwtAuthenticationFilter filter = jwtFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/usuarios");
        request.addHeader("Authorization", "Bearer token.invalido");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
    }

    @Test
    void jwtExpiradoDevuelve401() throws ServletException, IOException {
        JwtAuthenticationFilter filter = jwtFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/usuarios");
        request.addHeader("Authorization", "Bearer " + token(Instant.now().minusSeconds(60)));
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
    }

    private static JwtAuthenticationFilter jwtFilter() {
        GatewayJwtService jwtService = new GatewayJwtService(new ObjectMapper(), SECRET);
        return new JwtAuthenticationFilter(jwtService, "/api/auth/usuarios");
    }

    private static String token(Instant expiration) {
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
            payload.put("rol", "ESTUDIANTE");
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
}
