package com.curso.pedidos.client;

import com.curso.pedidos.dto.CursoDto;
import com.curso.pedidos.dto.PreferenciaResponse;
import com.curso.pedidos.dto.UsuarioDto;
import com.curso.pedidos.entity.Pedido;
import com.curso.pedidos.exception.PagoNoVerificableException;
import com.curso.pedidos.exception.PagoRechazadoException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class MercadoPagoClient {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoClient.class);
    private static final Pattern PAYMENT_ID = Pattern.compile("\\d{1,20}");

    private final RestClient restClient;
    private final String accessToken;
    private final String backUrlSuccess;
    private final String backUrlFailure;
    private final String backUrlPending;

    @Autowired
    public MercadoPagoClient(
            @Value("${mercadopago.api-base-url:https://api.mercadopago.com}") String apiBaseUrl,
            @Value("${mercadopago.access-token:}") String accessToken,
            @Value("${mercadopago.back-url.success:http://localhost:4200/checkout}") String backUrlSuccess,
            @Value("${mercadopago.back-url.failure:http://localhost:4200/checkout}") String backUrlFailure,
            @Value("${mercadopago.back-url.pending:http://localhost:4200/checkout}") String backUrlPending
    ) {
        this(RestClient.builder().baseUrl(apiBaseUrl).build(), accessToken, backUrlSuccess, backUrlFailure, backUrlPending);
    }

    public MercadoPagoClient(RestClient restClient, String accessToken,
                             String backUrlSuccess, String backUrlFailure, String backUrlPending) {
        this.restClient = restClient;
        this.accessToken = accessToken;
        this.backUrlSuccess = backUrlSuccess;
        this.backUrlFailure = backUrlFailure;
        this.backUrlPending = backUrlPending;
    }

    public boolean isConfigurado() {
        return accessToken != null && !accessToken.isBlank();
    }

    /**
     * Crea la preferencia ligada al pedido (external_reference = id del pedido).
     * Si no hay credenciales o el proveedor falla, devuelve initPoint null: no se
     * entregan URLs ficticias de pago.
     */
    public PreferenciaResponse crearPreferencia(Pedido pedido, UsuarioDto estudiante, CursoDto curso) {
        if (!isConfigurado()) {
            log.warn("[MERCADO PAGO] Access Token no configurado: no se crea preferencia.");
            return new PreferenciaResponse(null, null);
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
                    "external_reference", pedido.getId().toString()
            );

            Map<String, Object> response = restClient.post()
                    .uri("/checkout/preferences")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response != null && response.get("id") != null) {
                String id = String.valueOf(response.get("id"));
                String sandboxInitPoint = (String) response.get("sandbox_init_point");
                String initPoint = (String) response.get("init_point");
                String url = (initPoint != null && !initPoint.isBlank()) ? initPoint : sandboxInitPoint;
                log.info("[MERCADO PAGO] Preferencia creada para el pedido {}", pedido.getId());
                return new PreferenciaResponse(id, url);
            }
            log.error("[MERCADO PAGO] Respuesta de preferencia sin id para el pedido {}", pedido.getId());
        } catch (RestClientResponseException ex) {
            // Codigo HTTP y mensaje del proveedor (sin cabeceras ni token).
            log.error("[MERCADO PAGO] Preferencia rechazada para el pedido {}: HTTP {} - {}",
                    pedido.getId(), ex.getStatusCode().value(), mensajeProveedor(ex.getResponseBodyAsString()));
        } catch (Exception ex) {
            log.error("[MERCADO PAGO] Error al crear preferencia para el pedido {}: {}",
                    pedido.getId(), ex.getClass().getSimpleName());
        }
        return new PreferenciaResponse(null, null);
    }

    /** Extrae "message"/"error" del cuerpo de error de Mercado Pago, acotado y en una linea. */
    static String mensajeProveedor(String body) {
        if (body == null || body.isBlank()) {
            return "(sin cuerpo)";
        }
        Matcher m = Pattern.compile("\"(message|error)\"\\s*:\\s*\"([^\"]{0,200})\"").matcher(body);
        String texto = m.find() ? m.group(2) : body;
        texto = texto.replaceAll("[\\r\\n]+", " ");
        return texto.length() > 200 ? texto.substring(0, 200) : texto;
    }

    /**
     * Consulta oficial GET /v1/payments/{id}. Nunca devuelve null:
     * lanza PagoRechazadoException (id invalido / inexistente) o
     * PagoNoVerificableException (sin credenciales / proveedor no disponible).
     */
    public Map<String, Object> consultarPago(String paymentId) {
        if (paymentId == null || !PAYMENT_ID.matcher(paymentId).matches()) {
            throw new PagoRechazadoException("Identificador de pago de Mercado Pago invalido");
        }
        if (!isConfigurado()) {
            throw new PagoNoVerificableException("Mercado Pago no esta configurado: no es posible verificar el pago");
        }
        try {
            Map<String, Object> response = restClient.get()
                    .uri("/v1/payments/{id}", paymentId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            if (response == null) {
                throw new PagoNoVerificableException("Mercado Pago devolvio una respuesta vacia");
            }
            log.info("[MERCADO PAGO] Consulta de pago {}: status={}", paymentId, response.get("status"));
            return response;
        } catch (HttpClientErrorException.NotFound ex) {
            throw new PagoRechazadoException("El pago no existe en Mercado Pago");
        } catch (PagoNoVerificableException | PagoRechazadoException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("[MERCADO PAGO] Error al consultar pago {}: {}", paymentId, ex.getClass().getSimpleName());
            throw new PagoNoVerificableException("No se pudo consultar el pago en Mercado Pago");
        }
    }
}
