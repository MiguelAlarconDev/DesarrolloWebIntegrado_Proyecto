package com.curso.pedidos.client;

import com.curso.pedidos.dto.UsuarioDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
public class AuthClient {

    private final RestClient restClient;

    public AuthClient(@Value("${services.auth.url:http://localhost:8081}") String authUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(authUrl)
                .build();
    }

    public UsuarioDto obtenerUsuario(UUID usuarioId) {
        try {
            return restClient.get()
                    .uri("/api/auth/usuarios/{id}", usuarioId)
                    .retrieve()
                    .body(UsuarioDto.class);
        } catch (Exception ex) {
            throw new IllegalArgumentException("No se pudo contactar con auth-service o estudiante no encontrado con ID: " + usuarioId);
        }
    }
}
