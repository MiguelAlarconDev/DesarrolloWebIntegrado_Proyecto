package com.curso.pedidos.controller;

import com.curso.pedidos.dto.CrearPreferenciaRequest;
import com.curso.pedidos.dto.CrearPreferenciaResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pagos")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5500", "*"})
public class PagoController {

    private static final Logger log = LoggerFactory.getLogger(PagoController.class);

    private final RestClient restClient;
    private final String accessToken;
    private final String backUrlSuccess;
    private final String backUrlFailure;
    private final String backUrlPending;

    public PagoController(
            @Value("${mercadopago.access-token:TEST-8786075352621630-090217-974d9a4e1da3bffbdc3ec6f5dcdabbf8-3130074680}") String accessToken,
            @Value("${mercadopago.back-url.success:https://localhost:8080/pago/exito}") String backUrlSuccess,
            @Value("${mercadopago.back-url.failure:https://localhost:8080/pago/fallo}") String backUrlFailure,
            @Value("${mercadopago.back-url.pending:https://localhost:8080/pago/pendiente}") String backUrlPending
    ) {
        this.accessToken = accessToken;
        // Mercado Pago exige HTTPS en las back_urls cuando auto_return está activo ('approved')
        this.backUrlSuccess = sanitizeHttps(backUrlSuccess, "https://localhost:8080/pago/exito");
        this.backUrlFailure = sanitizeHttps(backUrlFailure, "https://localhost:8080/pago/fallo");
        this.backUrlPending = sanitizeHttps(backUrlPending, "https://localhost:8080/pago/pendiente");

        this.restClient = RestClient.builder()
                .baseUrl("https://api.mercadopago.com")
                .build();
    }

    private String sanitizeHttps(String url, String fallback) {
        if (url == null || url.isBlank()) return fallback;
        if (url.startsWith("http://localhost")) {
            return url.replace("http://localhost", "https://localhost");
        }
        if (url.startsWith("http://127.0.0.1")) {
            return url.replace("http://127.0.0.1", "https://127.0.0.1");
        }
        return url;
    }

    @PostMapping("/crear-preferencia")
    public ResponseEntity<?> crearPreferencia(@RequestBody CrearPreferenciaRequest request) {
        log.info("[MERCADO PAGO] Solicitud recibida: titulo='{}', cantidad={}, precio={}",
                request.getTitulo(), request.getCantidad(), request.getPrecio());

        if (request.getTitulo() == null || request.getTitulo().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El campo 'titulo' es requerido."));
        }

        int cantidad = (request.getCantidad() != null && request.getCantidad() > 0) ? request.getCantidad() : 1;
        BigDecimal precio = (request.getPrecio() != null && request.getPrecio().compareTo(BigDecimal.ZERO) > 0)
                ? request.getPrecio()
                : BigDecimal.valueOf(100.0);

        try {
            Map<String, Object> preferencePayload = Map.of(
                    "items", List.of(Map.of(
                            "title", request.getTitulo(),
                            "quantity", cantidad,
                            "unit_price", precio,
                            "currency_id", "PEN"
                    )),
                    "back_urls", Map.of(
                            "success", backUrlSuccess,
                            "failure", backUrlFailure,
                            "pending", backUrlPending
                    ),
                    "auto_return", "approved"
            );

            Map<String, Object> response = restClient.post()
                    .uri("/checkout/preferences")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(preferencePayload)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response != null && response.containsKey("id")) {
                String id = (String) response.get("id");
                String initPoint = (String) response.get("init_point");
                String sandboxInitPoint = (String) response.get("sandbox_init_point");

                // Usamos init_point oficial (con credenciales TEST opera en Sandbox con URL real de Mercado Pago)
                String finalInitPoint = (initPoint != null && !initPoint.isBlank()) ? initPoint : sandboxInitPoint;

                log.info("[MERCADO PAGO] Preferencia creada exitosamente. id={}, initPoint={}", id, finalInitPoint);
                return ResponseEntity.ok(new CrearPreferenciaResponse(id, finalInitPoint));
            } else {
                log.error("[MERCADO PAGO] Respuesta sin id: {}", response);
                return ResponseEntity.internalServerError().body(Map.of("error", "No se pudo obtener el initPoint de Mercado Pago."));
            }

        } catch (Exception ex) {
            log.error("[MERCADO PAGO] Error al crear preferencia: {}", ex.getMessage(), ex);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Error en Mercado Pago: " + ex.getMessage()
            ));
        }
    }
}
