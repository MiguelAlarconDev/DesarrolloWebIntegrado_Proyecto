package com.curso.pedidos.client;

import com.curso.pedidos.dto.UsuarioDto;
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
public class AuthClient {

    private static final long CACHE_TTL_MS = 10_000L;

    private final RestClient restClient;
    private final Map<UUID, CachedEntry<UsuarioDto>> userCache = new ConcurrentHashMap<>();
    private volatile long lastBatchFetchMs = 0L;

    private record CachedEntry<T>(T value, long timestamp) {}

    public AuthClient(@Value("${services.auth.url:http://127.0.0.1:8081}") String authUrl, JwtVerifier jwtVerifier) {
        // Llamadas internas autenticadas con un token de servicio de corta duracion.
        this.restClient = RestClient.builder()
                .baseUrl(authUrl)
                .requestInterceptor((request, body, execution) -> {
                    request.getHeaders().setBearerAuth(jwtVerifier.serviceToken());
                    return execution.execute(request, body);
                })
                .build();
    }

    public UsuarioDto obtenerUsuario(UUID usuarioId) {
        if (usuarioId == null) {
            throw new IllegalArgumentException("ID de usuario nulo");
        }
        long now = System.currentTimeMillis();
        CachedEntry<UsuarioDto> cached = userCache.get(usuarioId);
        if (cached != null && (now - cached.timestamp()) < CACHE_TTL_MS) {
            return cached.value();
        }

        try {
            UsuarioDto dto = restClient.get()
                    .uri("/api/auth/usuarios/{id}", usuarioId)
                    .retrieve()
                    .body(UsuarioDto.class);
            if (dto != null) {
                userCache.put(usuarioId, new CachedEntry<>(dto, now));
            }
            return dto;
        } catch (Exception ex) {
            if (cached != null) {
                return cached.value();
            }
            throw new IllegalArgumentException("No se pudo contactar con auth-service o estudiante no encontrado con ID: " + usuarioId);
        }
    }

    public Map<UUID, UsuarioDto> obtenerUsuariosPorIds(Collection<UUID> ids) {
        Map<UUID, UsuarioDto> result = new HashMap<>();
        if (ids == null || ids.isEmpty()) {
            return result;
        }

        long now = System.currentTimeMillis();
        boolean needsFetch = false;
        for (UUID id : ids) {
            CachedEntry<UsuarioDto> entry = userCache.get(id);
            if (entry != null && (now - entry.timestamp()) < CACHE_TTL_MS) {
                result.put(id, entry.value());
            } else {
                needsFetch = true;
            }
        }

        if (needsFetch && (now - lastBatchFetchMs) > 2_000L) {
            try {
                List<UsuarioDto> todos = restClient.get()
                        .uri("/api/auth/usuarios")
                        .retrieve()
                        .body(new ParameterizedTypeReference<List<UsuarioDto>>() {});
                if (todos != null) {
                    lastBatchFetchMs = now;
                    for (UsuarioDto u : todos) {
                        if (u != null && u.getId() != null) {
                            userCache.put(u.getId(), new CachedEntry<>(u, now));
                            if (ids.contains(u.getId())) {
                                result.put(u.getId(), u);
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
                    UsuarioDto u = obtenerUsuario(id);
                    if (u != null) {
                        result.put(id, u);
                    }
                } catch (Exception ignored) {
                }
            }
        }
        return result;
    }
}
