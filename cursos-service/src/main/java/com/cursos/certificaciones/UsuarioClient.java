package com.cursos.certificaciones;

import com.cursos.security.JwtVerifier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.*;

/**
 * Lectura de nombres en auth-service con token SERVICE de corta duracion (auth ya admite
 * SERVICE en GET /api/auth/usuarios y /usuarios/{id}). No modifica auth-service.
 */
@Component
public class UsuarioClient {
    private final RestClient client;

    @Autowired
    public UsuarioClient(@Value("${services.auth.url:${AUTH_SERVICE_URL:http://127.0.0.1:8081}}") String url, JwtVerifier jwt) {
        this(builder(url), jwt);
    }

    UsuarioClient(RestClient.Builder builder, JwtVerifier jwt) {
        client = builder.requestInterceptor((request, body, execution) -> {
            request.getHeaders().setBearerAuth(jwt.serviceToken());
            return execution.execute(request, body);
        }).build();
    }

    private static RestClient.Builder builder(String url) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(3000);
        return RestClient.builder().baseUrl(url).requestFactory(factory);
    }

    public record Usuario(UUID id, String nombres, String apellidos) {
        public String nombreCompleto() {
            return ((nombres == null ? "" : nombres.strip()) + " " + (apellidos == null ? "" : apellidos.strip())).strip();
        }
    }

    /** Nombre completo; Optional.empty si el usuario no existe. NoDisponibleException si auth falla. */
    public Optional<String> nombre(UUID id) {
        try {
            Usuario u = client.get().uri("/api/auth/usuarios/{id}", id).retrieve().body(Usuario.class);
            if (u == null || u.nombreCompleto().isBlank()) return Optional.empty();
            return Optional.of(u.nombreCompleto());
        } catch (HttpClientErrorException.NotFound ex) {
            return Optional.empty();
        } catch (RestClientException ex) {
            throw new NoDisponibleException();
        }
    }

    /** Nombres por id para listados; ante fallo de auth devuelve mapa vacio (se muestra el id). */
    public Map<UUID, String> nombres() {
        try {
            Usuario[] lista = client.get().uri("/api/auth/usuarios").retrieve().body(Usuario[].class);
            Map<UUID, String> m = new HashMap<>();
            if (lista != null) for (Usuario u : lista) if (u != null && u.id() != null) m.put(u.id(), u.nombreCompleto());
            return m;
        } catch (RestClientException ex) {
            return Map.of();
        }
    }

    public static class NoDisponibleException extends RuntimeException {
        public NoDisponibleException() { super("No se pudo consultar los datos del estudiante; intente nuevamente"); }
    }
}
