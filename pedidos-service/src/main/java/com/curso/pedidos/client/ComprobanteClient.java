package com.curso.pedidos.client;

import com.curso.pedidos.dto.CursoDto;
import com.curso.pedidos.dto.UsuarioDto;
import com.curso.pedidos.entity.Pedido;
import com.curso.pedidos.entity.TipoComprobante;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

@Component
public class ComprobanteClient {

    private static final Logger log = LoggerFactory.getLogger(ComprobanteClient.class);
    private final RestClient restClient;

    public ComprobanteClient(@Value("${services.comprobantes.url:http://localhost:8084}") String comprobantesUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(comprobantesUrl)
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
            body.put("estudiante", estudiante != null ? estudiante.getNombres() + " " + estudiante.getApellidos() : "Estudiante");
            body.put("correo", estudiante != null ? estudiante.getCorreo() : "estudiante@cursos.com");
            body.put("curso", curso != null ? curso.getTitulo() : "Curso Plataforma");
            body.put("monto", pedido.getMonto());
            body.put("tipoComprobante", tipoComprobante != null ? tipoComprobante.name() : "BOLETA");

            if (tipoComprobante == TipoComprobante.FACTURA) {
                body.put("rucCliente", rucCliente != null ? rucCliente : "20123456789");
                body.put("razonSocial", razonSocial != null ? razonSocial : "Empresa SAC");
            }

            restClient.post()
                    .uri("/api/comprobantes/enviar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();

            log.info("[COMPROBANTE CLIENT] PDF y correo despachados exitosamente por comprobantes-service para orden {}", pedido.getCodigoOrden());
        } catch (Exception ex) {
            log.warn("[COMPROBANTE CLIENT] Aviso al contactar comprobantes-service (puerto 8084): {}. El comprobante se preserva en BD.", ex.getMessage());
        }
    }
}
