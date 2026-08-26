package com.curso.pedidos.client;

import com.curso.pedidos.dto.CursoDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
public class CursoClient {

    private final RestClient restClient;

    public CursoClient(@Value("${services.cursos.url:http://localhost:8082}") String cursosUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(cursosUrl)
                .build();
    }

    public CursoDto obtenerCurso(UUID cursoId) {
        try {
            return restClient.get()
                    .uri("/api/cursos/{id}", cursoId)
                    .retrieve()
                    .body(CursoDto.class);
        } catch (Exception ex) {
            throw new IllegalArgumentException("No se pudo contactar con cursos-service o curso no encontrado con ID: " + cursoId);
        }
    }

    public CursoDto descontarAforo(UUID cursoId) {
        try {
            return restClient.put()
                    .uri("/api/cursos/{id}/descontar-aforo", cursoId)
                    .retrieve()
                    .body(CursoDto.class);
        } catch (Exception ex) {
            throw new IllegalStateException("Error al reservar vacante en cursos-service: " + ex.getMessage());
        }
    }

    public CursoDto liberarAforo(UUID cursoId) {
        try {
            return restClient.put()
                    .uri("/api/cursos/{id}/liberar-aforo", cursoId)
                    .retrieve()
                    .body(CursoDto.class);
        } catch (Exception ex) {
            throw new IllegalStateException("Error al liberar vacante en cursos-service: " + ex.getMessage());
        }
    }
}
