package com.curso.pedidos.client;

import com.curso.pedidos.dto.CursoDto;
import com.curso.pedidos.dto.UsuarioDto;
import com.curso.pedidos.entity.Pedido;
import com.curso.pedidos.entity.TipoComprobante;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Component
public class ComprobanteClient {

    private static final Logger log = LoggerFactory.getLogger(ComprobanteClient.class);
    private final String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ComprobanteClient(@Value("${services.comprobantes.url:http://127.0.0.1:8084}") String comprobantesUrl) {
        this.baseUrl = (comprobantesUrl != null && !comprobantesUrl.isBlank()) ? comprobantesUrl.trim() : "http://127.0.0.1:8084";
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public void emitirYEnviarComprobante(Pedido pedido,
                                          UsuarioDto estudiante,
                                          CursoDto curso,
                                          TipoComprobante tipoComprobante,
                                          String rucCliente,
                                          String razonSocial) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("pedidoId", pedido.getId().toString());
            body.put("codigoOrden", pedido.getCodigoOrden());
            body.put("estudiante", estudiante != null ? (estudiante.getNombres() + " " + (estudiante.getApellidos() != null ? estudiante.getApellidos() : "")).trim() : "Estudiante");
            body.put("correo", estudiante != null && estudiante.getCorreo() != null ? estudiante.getCorreo() : "carlokasike333@gmail.com");
            body.put("curso", curso != null && curso.getTitulo() != null ? curso.getTitulo() : "Curso Plataforma");
            body.put("monto", pedido.getMonto());
            body.put("tipoComprobante", tipoComprobante != null ? tipoComprobante.name() : "BOLETA");

            if (tipoComprobante == TipoComprobante.FACTURA) {
                body.put("rucCliente", rucCliente != null ? rucCliente : "20123456789");
                body.put("razonSocial", razonSocial != null ? razonSocial : "Empresa SAC");
            }

            String jsonBody = objectMapper.writeValueAsString(body);
            byte[] jsonBytes = jsonBody.getBytes(StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/comprobantes/enviar"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofByteArray(jsonBytes))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[COMPROBANTE CLIENT] PDF y correo despachados exitosamente por comprobantes-service para orden {}: {}", pedido.getCodigoOrden(), response.body());
                System.out.println("[COMPROBANTE CLIENT SUCCESS] PDF y correo despachados exitosamente para " + pedido.getCodigoOrden());
            } else {
                log.warn("[COMPROBANTE CLIENT] Error status {} de comprobantes-service: {}", response.statusCode(), response.body());
                System.err.println("[COMPROBANTE CLIENT WARN] HTTP " + response.statusCode() + ": " + response.body());
            }
        } catch (Exception ex) {
            log.error("[COMPROBANTE CLIENT] Error al contactar comprobantes-service: " + ex.getMessage(), ex);
            System.err.println("[COMPROBANTE CLIENT ERROR] " + ex.getClass().getName() + ": " + ex.getMessage());
        }
    }
}
