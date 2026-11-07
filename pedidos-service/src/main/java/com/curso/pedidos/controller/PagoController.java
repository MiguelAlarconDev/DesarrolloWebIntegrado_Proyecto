package com.curso.pedidos.controller;

import com.curso.pedidos.dto.CrearPreferenciaRequest;
import com.curso.pedidos.dto.PreferenciaResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Preferencia generica (solo ADMIN, ver JwtAuthFilter). No esta ligada a ningun pedido,
 * por lo que un pago hecho con ella NUNCA puede confirmar una matricula: el flujo de
 * compra usa la preferencia creada en POST /api/pedidos/checkout (external_reference).
 */
@RestController
@RequestMapping("/api/pagos")
public class PagoController {

    private static final Logger log = LoggerFactory.getLogger(PagoController.class);

    private final RestClient restClient;
    private final String accessToken;
    private final String backUrlSuccess;
    private final String backUrlFailure;
    private final String backUrlPending;

    public PagoController(
            @Value("${mercadopago.api-base-url:https://api.mercadopago.com}") String apiBaseUrl,
            @Value("${mercadopago.access-token:}") String accessToken,
            @Value("${mercadopago.back-url.success:http://localhost:4200/checkout}") String backUrlSuccess,
            @Value("${mercadopago.back-url.failure:http://localhost:4200/checkout}") String backUrlFailure,
            @Value("${mercadopago.back-url.pending:http://localhost:4200/checkout}") String backUrlPending
    ) {
        this.accessToken = accessToken;
        this.backUrlSuccess = backUrlSuccess;
        this.backUrlFailure = backUrlFailure;
        this.backUrlPending = backUrlPending;
        this.restClient = RestClient.builder().baseUrl(apiBaseUrl).build();
    }

    @PostMapping("/crear-preferencia")
    public ResponseEntity<?> crearPreferencia(@RequestBody CrearPreferenciaRequest request) {
        if (request.getTitulo() == null || request.getTitulo().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El campo 'titulo' es requerido."));
        }
        if (accessToken == null || accessToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Mercado Pago no esta configurado."));
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
                    )
            );

            Map<String, Object> response = restClient.post()
                    .uri("/checkout/preferences")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(preferencePayload)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response != null && response.get("id") != null) {
                String initPoint = (String) response.get("init_point");
                String sandboxInitPoint = (String) response.get("sandbox_init_point");
                String finalInitPoint = (initPoint != null && !initPoint.isBlank()) ? initPoint : sandboxInitPoint;
                return ResponseEntity.ok(new PreferenciaResponse(String.valueOf(response.get("id")), finalInitPoint));
            }
        } catch (Exception ex) {
            log.warn("[MERCADO PAGO] Error al crear preferencia: {}", ex.getClass().getSimpleName());
        }
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("error", "No se pudo crear la preferencia en Mercado Pago."));
    }
}
