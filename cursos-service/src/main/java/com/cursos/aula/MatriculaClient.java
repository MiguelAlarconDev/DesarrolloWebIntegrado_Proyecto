package com.cursos.aula;

import com.cursos.security.JwtVerifier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.UUID;

@Component
public class MatriculaClient {
    private final RestClient client;

    @Autowired
    public MatriculaClient(@Value("${services.pedidos.url:http://127.0.0.1:8083}") String url, JwtVerifier jwt) {
        this(builder(url), jwt);
    }

    MatriculaClient(RestClient.Builder builder, JwtVerifier jwt) {
        client = builder.requestInterceptor((request, body, execution) -> {
            request.getHeaders().setBearerAuth(jwt.matriculaToken());
            return execution.execute(request, body);
        }).build();
    }

    private static RestClient.Builder builder(String url) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(3000);
        return RestClient.builder().baseUrl(url).requestFactory(factory);
    }

    public boolean habilitada(UUID cursoId, UUID estudianteId) {
        try {
            Validacion result = client.get().uri(uri -> uri.path("/api/pedidos/interno/matriculas/validacion")
                    .queryParam("cursoId", cursoId).queryParam("estudianteId", estudianteId).build())
                    .retrieve().body(Validacion.class);
            if (result == null || result.habilitada() == null) throw new NoDisponibleException();
            return result.habilitada();
        } catch (RestClientException ex) {
            // Fail closed without exposing upstream bodies, tokens or PII.
            throw new NoDisponibleException();
        }
    }

    record Validacion(Boolean habilitada) {}
    public static class NoDisponibleException extends RuntimeException {
        public NoDisponibleException() { super("No se pudo verificar la matricula; intente nuevamente"); }
    }
}
