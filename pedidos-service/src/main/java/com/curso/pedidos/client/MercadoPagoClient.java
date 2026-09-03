package com.curso.pedidos.client;

import com.curso.pedidos.dto.CursoDto;
import com.curso.pedidos.dto.PreferenciaResponse;
import com.curso.pedidos.dto.UsuarioDto;
import com.curso.pedidos.entity.Pedido;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class MercadoPagoClient {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoClient.class);

    private final RestClient restClient;
    private final String accessToken;
    private final String backUrlSuccess;
    private final String backUrlFailure;
    private final String backUrlPending;

    public MercadoPagoClient(
            @Value("${mercadopago.access-token:}") String accessToken,
            @Value("${mercadopago.back-url.success:http://localhost:8080/pago/exito}") String backUrlSuccess,
            @Value("${mercadopago.back-url.failure:http://localhost:8080/pago/fallo}") String backUrlFailure,
            @Value("${mercadopago.back-url.pending:http://localhost:8080/pago/pendiente}") String backUrlPending
    ) {
        this.accessToken = accessToken;
        this.backUrlSuccess = backUrlSuccess;
        this.backUrlFailure = backUrlFailure;
        this.backUrlPending = backUrlPending;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.mercadopago.com")
                .build();
    }

    public PreferenciaResponse crearPreferencia(Pedido pedido, UsuarioDto estudiante, CursoDto curso) {
        if (accessToken == null || accessToken.isBlank()) {
            log.warn("[MERCADO PAGO] Access Token no configurado. Se usara un mock.");
            return new PreferenciaResponse("PREF-MOCK-" + pedido.getId(), "https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=mock");
        }

        try {
            String correoPayer = (estudiante != null && estudiante.getCorreo() != null && !estudiante.getCorreo().isBlank())
                    ? estudiante.getCorreo()
                    : "test_payer_12345@testuser.com";

            String nombrePayer = (estudiante != null && estudiante.getNombres() != null) ? estudiante.getNombres() : "Estudiante";
            String apellidoPayer = (estudiante != null && estudiante.getApellidos() != null) ? estudiante.getApellidos() : "Prueba";
            String tituloCurso = (curso != null && curso.getTitulo() != null) ? curso.getTitulo() : "Curso Plataforma";
            String descCurso = (curso != null && curso.getDescripcion() != null) ? curso.getDescripcion() : tituloCurso;

            Map<String, Object> body = Map.of(
                    "items", List.of(Map.of(
                            "id", pedido.getCursoId().toString(),
                            "title", tituloCurso,
                            "description", descCurso,
                            "quantity", 1,
                            "unit_price", pedido.getMonto(),
                            "currency_id", "PEN"
                    )),
                    "payer", Map.of(
                            "name", nombrePayer,
                            "surname", apellidoPayer,
                            "email", correoPayer
                    ),
                    "back_urls", Map.of(
                            "success", backUrlSuccess,
                            "failure", backUrlFailure,
                            "pending", backUrlPending
                    ),
                    "auto_return", "approved",
                    "external_reference", pedido.getId().toString()
            );

            Map<String, Object> response = restClient.post()
                    .uri("/checkout/preferences")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response != null) {
                String id = (String) response.get("id");
                String sandboxInitPoint = (String) response.get("sandbox_init_point");
                String initPoint = (String) response.get("init_point");
                String url = (sandboxInitPoint != null && !sandboxInitPoint.isBlank()) ? sandboxInitPoint : initPoint;

                log.info("[MERCADO PAGO] Preferencia creada con exito: {} -> URL: {}", id, url);
                return new PreferenciaResponse(id, url);
            }
        } catch (Exception ex) {
            log.error("[MERCADO PAGO] Error al crear preferencia: {}", ex.getMessage());
        }

        return new PreferenciaResponse("PREF-FALLBACK-" + pedido.getId(), null);
    }

    public Map<String, Object> consultarPago(String paymentId) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri("/v1/payments/{id}", paymentId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            log.info("[MERCADO PAGO] Consulta de pago {}: status={}", paymentId, response != null ? response.get("status") : "null");
            return response;
        } catch (Exception ex) {
            log.error("[MERCADO PAGO] Error al consultar pago {}: {}", paymentId, ex.getMessage());
            return null;
        }
    }
}
