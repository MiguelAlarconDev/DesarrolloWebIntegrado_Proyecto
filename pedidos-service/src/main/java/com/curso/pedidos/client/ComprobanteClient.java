package com.curso.pedidos.client;

import com.curso.pedidos.dto.CursoDto;
import com.curso.pedidos.dto.UsuarioDto;
import com.curso.pedidos.entity.Pedido;
import com.curso.pedidos.entity.TipoComprobante;
import com.curso.pedidos.exception.RemoteServiceException;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
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

    @org.springframework.beans.factory.annotation.Autowired
    public ComprobanteClient(@Value("${services.comprobantes.url:${COMPROBANTES_SERVICE_URL:http://127.0.0.1:8084}}") String comprobantesUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(30000);
        this.restClient = RestClient.builder().requestFactory(factory)
                .baseUrl(comprobantesUrl)
                .build();
    }

    ComprobanteClient(RestClient client) {
        this.restClient = client;
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
            body.put("estudiante", (estudiante.getNombres() + " " + (estudiante.getApellidos() == null ? "" : estudiante.getApellidos())).trim());
            body.put("correo", estudiante.getCorreo());
            body.put("curso", curso.getTitulo());
            body.put("monto", pedido.getMonto());
            body.put("tipoComprobante", tipoComprobante != null ? tipoComprobante.name() : "BOLETA");
            body.put("horario", curso.getHorario());
            body.put("modalidad", curso.getModalidad());
            body.put("enlaceClase", curso.getEnlaceClase());
            body.put("direccionClase", curso.getDireccionClase());
            body.put("aula", curso.getAula());

            if (tipoComprobante == TipoComprobante.FACTURA) {
                body.put("rucCliente", rucCliente);
                body.put("razonSocial", razonSocial);
            }

            Map<?, ?> response = restClient.post()
                    .uri("/api/comprobantes/enviar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            if (response == null || !Boolean.TRUE.equals(response.get("success")) || !"ENVIADO".equals(response.get("estado"))) {
                throw new IllegalStateException("Envio no confirmado");
            }

            log.info("[COMPROBANTE CLIENT] PDF y correo despachados exitosamente por comprobantes-service para orden {}", pedido.getCodigoOrden());
        } catch (Exception ex) {
            throw new RemoteServiceException("No se pudo confirmar el envio del comprobante. Consulte su estado antes de reintentar.");
        }
    }
}
