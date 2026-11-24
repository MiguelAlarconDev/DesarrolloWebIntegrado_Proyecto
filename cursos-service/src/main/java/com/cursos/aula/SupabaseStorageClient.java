package com.cursos.aula;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/**
 * Cliente de Supabase Storage (API REST /storage/v1) para un bucket PRIVADO.
 * Usa la clave service_role solo en el servidor. No registra URLs firmadas,
 * claves de objeto completas ni credenciales: solo codigos HTTP.
 */
@Component
public class SupabaseStorageClient implements AlmacenamientoArchivos {

    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageClient.class);

    private final RestClient rest;
    private final String baseUrl;
    private final String serviceKey;
    private final String bucket;

    @Autowired
    public SupabaseStorageClient(@Value("${storage.supabase.url:}") String baseUrl,
                                 @Value("${storage.supabase.service-key:}") String serviceKey,
                                 @Value("${storage.supabase.bucket:}") String bucket) {
        this(RestClient.builder().requestFactory(factory()).build(), baseUrl, serviceKey, bucket);
    }

    SupabaseStorageClient(RestClient rest, String baseUrl, String serviceKey, String bucket) {
        this.rest = rest;
        this.baseUrl = baseUrl == null ? "" : baseUrl.replaceAll("/+$", "");
        this.serviceKey = serviceKey;
        this.bucket = bucket;
    }

    private static SimpleClientHttpRequestFactory factory() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout((int) Duration.ofSeconds(3).toMillis());
        f.setReadTimeout((int) Duration.ofSeconds(30).toMillis());
        return f;
    }

    @Override
    public boolean isConfigurado() {
        return !baseUrl.isBlank() && serviceKey != null && !serviceKey.isBlank() && bucket != null && !bucket.isBlank();
    }

    @Override
    public void subir(String objectKey, byte[] contenido, String mimeType) {
        requireConfigurado();
        try {
            rest.post().uri(java.net.URI.create(objectUrl("object", objectKey)))
                    .headers(h -> {
                        h.setBearerAuth(serviceKey);
                        h.set("apikey", serviceKey);
                        h.set("x-upsert", "false");
                        h.set("Cache-Control", "no-store");
                    })
                    .contentType(MediaType.parseMediaType(mimeType))
                    .body(contenido)
                    .retrieve().toBodilessEntity();
        } catch (RestClientResponseException ex) {
            log.warn("[STORAGE] Subida rechazada: HTTP {}", ex.getStatusCode().value());
            throw new NoDisponibleException("No se pudo guardar el archivo en el almacenamiento");
        } catch (RuntimeException ex) {
            log.warn("[STORAGE] Subida fallida: {}", ex.getClass().getSimpleName());
            throw new NoDisponibleException("El almacenamiento de archivos no esta disponible");
        }
    }

    @Override
    public void eliminar(String objectKey) {
        requireConfigurado();
        try {
            rest.delete().uri(java.net.URI.create(objectUrl("object", objectKey)))
                    .headers(h -> {
                        h.setBearerAuth(serviceKey);
                        h.set("apikey", serviceKey);
                    })
                    .retrieve().toBodilessEntity();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                return; // ya no existe: eliminacion idempotente
            }
            log.warn("[STORAGE] Eliminacion rechazada: HTTP {}", ex.getStatusCode().value());
            throw new NoDisponibleException("No se pudo eliminar el archivo del almacenamiento");
        } catch (RuntimeException ex) {
            log.warn("[STORAGE] Eliminacion fallida: {}", ex.getClass().getSimpleName());
            throw new NoDisponibleException("El almacenamiento de archivos no esta disponible");
        }
    }

    @Override
    public String urlFirmada(String objectKey, Duration vigencia, String nombreDescarga) {
        requireConfigurado();
        Map<?, ?> respuesta;
        try {
            respuesta = rest.post().uri(java.net.URI.create(objectUrl("object/sign", objectKey)))
                    .headers(h -> {
                        h.setBearerAuth(serviceKey);
                        h.set("apikey", serviceKey);
                    })
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn", vigencia.toSeconds()))
                    .retrieve().body(Map.class);
        } catch (RestClientResponseException ex) {
            log.warn("[STORAGE] Firma de descarga rechazada: HTTP {}", ex.getStatusCode().value());
            throw new NoDisponibleException("No se pudo generar el enlace de descarga");
        } catch (RuntimeException ex) {
            log.warn("[STORAGE] Firma de descarga fallida: {}", ex.getClass().getSimpleName());
            throw new NoDisponibleException("El almacenamiento de archivos no esta disponible");
        }
        Object relativa = respuesta == null ? null : respuesta.get("signedURL");
        if (!(relativa instanceof String ruta) || !ruta.startsWith("/")) {
            throw new NoDisponibleException("Respuesta de almacenamiento invalida");
        }
        String url = baseUrl + "/storage/v1" + ruta;
        if (nombreDescarga != null && !nombreDescarga.isBlank()) {
            url += (url.contains("?") ? "&" : "?") + "download="
                    + UriUtils.encodeQueryParam(nombreDescarga, StandardCharsets.UTF_8);
        }
        return url;
    }

    private String objectUrl(String operacion, String objectKey) {
        // Cada segmento se codifica; la clave la genera el backend (UUID), nunca el usuario.
        StringBuilder sb = new StringBuilder(baseUrl).append("/storage/v1/").append(operacion).append('/')
                .append(UriUtils.encodePathSegment(bucket, StandardCharsets.UTF_8));
        for (String segmento : objectKey.split("/")) {
            sb.append('/').append(UriUtils.encodePathSegment(segmento, StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    private void requireConfigurado() {
        if (!isConfigurado()) {
            throw new NoDisponibleException("El almacenamiento de archivos no esta configurado");
        }
    }
}
