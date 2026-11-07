package com.curso.pedidos.client;

import com.curso.pedidos.dto.CursoDto;
import com.curso.pedidos.security.JwtVerifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class CursoClient {

    private static final long CACHE_TTL_MS = 5_000L;

    private final RestClient restClient;
    private final Map<UUID, CachedEntry<CursoDto>> cursoCache = new ConcurrentHashMap<>();
    private volatile long lastBatchFetchMs = 0L;

    private record CachedEntry<T>(T value, long timestamp) {}

    public CursoClient(@Value("${services.cursos.url:http://127.0.0.1:8082}") String cursosUrl, JwtVerifier jwtVerifier) {
        // Llamadas internas autenticadas con un token de servicio de corta duracion.
        this.restClient = RestClient.builder()
                .baseUrl(cursosUrl)
                .requestInterceptor((request, body, execution) -> {
                    request.getHeaders().setBearerAuth(jwtVerifier.serviceToken());
                    return execution.execute(request, body);
                })
                .build();
    }

    public CursoDto obtenerCurso(UUID cursoId) {
        if (cursoId == null) {
            throw new IllegalArgumentException("ID de curso nulo");
        }
        long now = System.currentTimeMillis();
        CachedEntry<CursoDto> cached = cursoCache.get(cursoId);
        if (cached != null && (now - cached.timestamp()) < CACHE_TTL_MS) {
            return cached.value();
        }

        try {
            CursoDto dto = restClient.get()
                    .uri("/api/cursos/{id}", cursoId)
                    .retrieve()
                    .body(CursoDto.class);
            if (dto != null) {
                cursoCache.put(cursoId, new CachedEntry<>(dto, now));
            }
            return dto;
        } catch (Exception ex) {
            if (cached != null) {
                return cached.value();
            }
            throw new IllegalArgumentException("No se pudo contactar con cursos-service o curso no encontrado con ID: " + cursoId);
        }
    }

    public Map<UUID, CursoDto> obtenerCursosPorIds(Collection<UUID> ids) {
        Map<UUID, CursoDto> result = new HashMap<>();
        if (ids == null || ids.isEmpty()) {
            return result;
        }

        long now = System.currentTimeMillis();
        boolean needsFetch = false;
        for (UUID id : ids) {
            CachedEntry<CursoDto> entry = cursoCache.get(id);
            if (entry != null && (now - entry.timestamp()) < CACHE_TTL_MS) {
                result.put(id, entry.value());
            } else {
                needsFetch = true;
            }
        }

        if (needsFetch && (now - lastBatchFetchMs) > 1_500L) {
            try {
                List<CursoDto> todos = restClient.get()
                        .uri("/api/cursos/todos")
                        .retrieve()
                        .body(new ParameterizedTypeReference<List<CursoDto>>() {});
                if (todos != null) {
                    lastBatchFetchMs = now;
                    for (CursoDto c : todos) {
                        if (c != null && c.getId() != null) {
                            cursoCache.put(c.getId(), new CachedEntry<>(c, now));
                            if (ids.contains(c.getId())) {
                                result.put(c.getId(), c);
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        for (UUID id : ids) {
            if (!result.containsKey(id)) {
                try {
                    CursoDto c = obtenerCurso(id);
                    if (c != null) {
                        result.put(id, c);
                    }
                } catch (Exception ignored) {
                }
            }
        }
        return result;
    }

    public CursoDto descontarAforo(UUID cursoId) {
        try {
            CursoDto dto = restClient.put()
                    .uri("/api/cursos/{id}/descontar-aforo", cursoId)
                    .retrieve()
                    .body(CursoDto.class);
            if (dto != null) {
                cursoCache.put(cursoId, new CachedEntry<>(dto, System.currentTimeMillis()));
            } else {
                cursoCache.remove(cursoId);
            }
            return dto;
        } catch (Exception ex) {
            throw new IllegalStateException("Error al reservar vacante en cursos-service: " + ex.getMessage());
        }
    }

    public CursoDto liberarAforo(UUID cursoId) {
        try {
            CursoDto dto = restClient.put()
                    .uri("/api/cursos/{id}/liberar-aforo", cursoId)
                    .retrieve()
                    .body(CursoDto.class);
            if (dto != null) {
                cursoCache.put(cursoId, new CachedEntry<>(dto, System.currentTimeMillis()));
            } else {
                cursoCache.remove(cursoId);
            }
            return dto;
        } catch (Exception ex) {
            throw new IllegalStateException("Error al liberar vacante en cursos-service: " + ex.getMessage());
        }
    }
}
