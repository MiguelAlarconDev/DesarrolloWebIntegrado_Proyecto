package com.curso.pedidos.security;

import com.curso.pedidos.controller.MatriculaInternaController;
import com.curso.pedidos.entity.EstadoPedido;
import com.curso.pedidos.repository.PedidoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class MatriculaInternaHttpTest {
    private static final String SECRET = "matricula-test-key-not-real-secret-123456789";
    private final PedidoRepository pedidos = mock(PedidoRepository.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new MatriculaInternaController(pedidos))
            .addFilters(new JwtAuthFilter(new JwtVerifier(new ObjectMapper(), SECRET, "pedidos-service"))).build();
    private final UUID curso = UUID.randomUUID(), alumno = UUID.randomUUID();
    private final String path = "/api/pedidos/interno/matriculas/validacion";
    private String token(String service) throws Exception {
        return signed(service, "SERVICE", "pedidos-service:matriculas", SECRET, 0, 300);
    }
    private String signed(String sub, String role, String audience, String key, long issuedOffset, long ttl) throws Exception {
        long issued = java.time.Instant.now().getEpochSecond() + issuedOffset;
        var enc = java.util.Base64.getUrlEncoder().withoutPadding();
        var mapper = new ObjectMapper();
        String header = enc.encodeToString(mapper.writeValueAsBytes(java.util.Map.of("alg", "HS256")));
        var claims = new java.util.HashMap<String, Object>();
        claims.put("sub", sub); claims.put("rol", role); claims.put("iat", issued); claims.put("exp", issued + ttl);
        if (audience != null) claims.put("aud", audience);
        String payload = enc.encodeToString(mapper.writeValueAsBytes(claims));
        var mac = javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec(key.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
        return header + "." + payload + "." + enc.encodeToString(mac.doFinal(
                (header + "." + payload).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }

    @Test void cursosConsultaSoloPagado() throws Exception {
        when(pedidos.existsByCursoIdAndEstudianteIdAndEstado(curso, alumno, EstadoPedido.PAGADO)).thenReturn(true);
        mvc.perform(get(path).param("cursoId", curso.toString()).param("estudianteId", alumno.toString())
                .header("Authorization", "Bearer " + token("cursos-service")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.habilitada").value(true))
                .andExpect(header().string("Cache-Control", "no-store"));
        verify(pedidos).existsByCursoIdAndEstudianteIdAndEstado(curso, alumno, EstadoPedido.PAGADO);
        verifyNoMoreInteractions(pedidos);
    }
    @Test void sinPedidoPagadoDevuelveFalse() throws Exception {
        mvc.perform(get(path).param("cursoId", curso.toString()).param("estudianteId", alumno.toString())
                .header("Authorization", "Bearer " + token("cursos-service")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.habilitada").value(false));
    }
    @Test void otroServicioNoPuedeConsultar() throws Exception {
        mvc.perform(get(path).header("Authorization", "Bearer " + token("auth-service")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(pedidos);
    }
    @Test void sinJwtOJwtInvalidoEs401() throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).header("Authorization", "Bearer invalido")).andExpect(status().isUnauthorized());
        verifyNoInteractions(pedidos);
    }
    @Test void usuariosIncluidoAdminNoPuedenConsultar() {
        for (String rol : new String[]{"ADMIN", "DOCENTE", "ESTUDIANTE"}) {
            org.assertj.core.api.Assertions.assertThat(JwtAuthFilter.roleAllowed("GET", path,
                    new AuthPrincipal("cursos-service", rol))).isFalse();
        }
    }
    @Test void audienciaAusenteOAjenaEs401() throws Exception {
        for (String audience : new String[]{null, "auth-service"}) {
            mvc.perform(get(path).header("Authorization", "Bearer " + signed("cursos-service", "SERVICE", audience, SECRET, 0, 300)))
                    .andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(pedidos);
    }
    @Test void expiradoFuturoOVidaExcesivaEs401() throws Exception {
        for (long[] times : new long[][]{{-400, 300}, {60, 300}, {0, 3600}}) {
            mvc.perform(get(path).header("Authorization", "Bearer " + signed("cursos-service", "SERVICE",
                    "pedidos-service:matriculas", SECRET, times[0], times[1])))
                    .andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(pedidos);
    }
    @Test void tokenExternoFirmadoConOtraClaveEs401() throws Exception {
        mvc.perform(get(path).header("Authorization", "Bearer " + signed("cursos-service", "SERVICE",
                "pedidos-service:matriculas", "external-test-only-key-123456789012345", 0, 300)))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(pedidos);
    }
    @Test void tokenUsuarioNoSeConvierteEnServicioPorTenerAudiencia() throws Exception {
        mvc.perform(get(path).header("Authorization", "Bearer " + signed("cursos-service", "ADMIN",
                "pedidos-service:matriculas", SECRET, 0, 300))).andExpect(status().isForbidden());
        verifyNoInteractions(pedidos);
    }
}
