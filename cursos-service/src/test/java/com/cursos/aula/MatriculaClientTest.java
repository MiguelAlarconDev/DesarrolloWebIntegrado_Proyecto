package com.cursos.aula;

import com.cursos.security.JwtVerifier;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.http.*;
import java.io.IOException;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class MatriculaClientTest {
    private final RestClient.Builder builder = RestClient.builder().baseUrl("http://pedidos.test");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final JwtVerifier jwt = new JwtVerifier(new com.fasterxml.jackson.databind.ObjectMapper(),
            "matricula-client-test-only-secret-123456789", "cursos-service");
    private final UUID curso = UUID.randomUUID(), alumno = UUID.randomUUID();
    private MatriculaClient client() {
        return new MatriculaClient(builder, jwt);
    }
    private String url() { return "http://pedidos.test/api/pedidos/interno/matriculas/validacion?cursoId=" + curso + "&estudianteId=" + alumno; }

    @Test void enviaIdentidadInternaYLeeTrue() {
        server.expect(requestTo(url())).andExpect(method(HttpMethod.GET))
                .andExpect(request -> {
                    String bearer = request.getHeaders().getFirst("Authorization");
                    assertThat(bearer).startsWith("Bearer ");
                    assertThat(jwt.validate(bearer.substring(7)).subject()).isEqualTo("cursos-service");
                    var claims = new com.fasterxml.jackson.databind.ObjectMapper().readTree(
                            java.util.Base64.getUrlDecoder().decode(bearer.substring(7).split("\\.")[1]));
                    assertThat(claims.get("aud").asText()).isEqualTo("pedidos-service:matriculas");
                    assertThat(claims.get("exp").asLong() - claims.get("iat").asLong()).isEqualTo(300);
                })
                .andRespond(withSuccess("{\"habilitada\":true}", MediaType.APPLICATION_JSON));
        assertThat(client().habilitada(curso, alumno)).isTrue(); server.verify();
    }
    @Test void falseNoConcedeAcceso() {
        server.expect(requestTo(url())).andRespond(withSuccess("{\"habilitada\":false}", MediaType.APPLICATION_JSON));
        assertThat(client().habilitada(curso, alumno)).isFalse(); server.verify();
    }
    @Test void respuestaIncompletaFallaCerrada() {
        server.expect(requestTo(url())).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client().habilitada(curso, alumno)).isInstanceOf(MatriculaClient.NoDisponibleException.class);
    }
    @Test void errorHttpFallaCerrado() {
        server.expect(requestTo(url())).andRespond(withServerError());
        assertThatThrownBy(() -> client().habilitada(curso, alumno)).isInstanceOf(MatriculaClient.NoDisponibleException.class);
    }
    @Test void errorConexionFallaCerrado() {
        server.expect(requestTo(url())).andRespond(withException(new IOException("simulated timeout")));
        assertThatThrownBy(() -> client().habilitada(curso, alumno)).isInstanceOf(MatriculaClient.NoDisponibleException.class);
    }
}
