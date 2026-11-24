package com.curso.pedidos.client;

import com.curso.pedidos.dto.CursoDto;
import com.curso.pedidos.dto.UsuarioDto;
import com.curso.pedidos.entity.Pedido;
import com.curso.pedidos.entity.TipoComprobante;
import com.curso.pedidos.exception.RemoteServiceException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import java.math.BigDecimal;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class ComprobanteClientTest {
    @Test
    void sendsExistingContractAndPropagatesRemoteFailure() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://pdf.invalid");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ComprobanteClient client = new ComprobanteClient(builder.build());
        Pedido pedido = new Pedido();
        pedido.setId(UUID.randomUUID()); pedido.setCodigoOrden("ORD-TEST");
        pedido.setMonto(new BigDecimal("118.00"));
        UsuarioDto user = new UsuarioDto(); user.setNombres("Alumno Prueba");
        user.setCorreo("alumno@example.com");
        CursoDto curso = new CursoDto(); curso.setTitulo("Curso de prueba");
        server.expect(requestTo("http://pdf.invalid/api/comprobantes/enviar"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.pedidoId").value(pedido.getId().toString()))
                .andExpect(jsonPath("$.tipoComprobante").value("BOLETA"))
                .andExpect(jsonPath("$.monto").value(118.0))
                .andRespond(withSuccess("{\"success\":true,\"estado\":\"ENVIADO\"}", MediaType.APPLICATION_JSON));
        client.emitirYEnviarComprobante(pedido, user, curso, TipoComprobante.BOLETA, null, null);
        server.verify();
        server.reset();
        server.expect(requestTo("http://pdf.invalid/api/comprobantes/enviar"))
                .andRespond(withStatus(HttpStatus.BAD_GATEWAY));
        assertThatThrownBy(() -> client.emitirYEnviarComprobante(pedido, user, curso, TipoComprobante.BOLETA, null, null))
                .isInstanceOf(RemoteServiceException.class);
        server.verify();
    }
}
