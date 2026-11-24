package com.cursos.aula;

import com.cursos.controller.ApiExceptionHandler;
import com.cursos.entity.Curso;
import com.cursos.repository.CursoRepository;
import com.cursos.security.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Direct Cursos servlet requests: no Gateway, DB, Storage or external providers. */
class AulaHttpTest {
    private static final String SECRET = "aula-only-test-key-not-a-real-secret-123456";
    private final UUID cursoId = UUID.randomUUID(), docenteId = UUID.randomUUID(), alumnoId = UUID.randomUUID();
    private final CursoRepository cursos = mock(CursoRepository.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
    private final ModuloRepository modulos = mock(ModuloRepository.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
    private final MaterialRepository materiales = mock(MaterialRepository.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
    private final MatriculaClient matriculas = mock(MatriculaClient.class,
            withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
    private MockMvc mvc;
    private String path;

    @BeforeEach void setup() {
        Curso curso = new Curso(); curso.setDocenteId(docenteId);
        when(cursos.findById(cursoId)).thenReturn(Optional.of(curso));
        when(modulos.findByCursoIdOrderByOrdenAscIdAsc(cursoId)).thenReturn(List.of());
        when(modulos.save(any())).thenAnswer(inv -> inv.getArgument(0));
        AulaService service = new AulaService(cursos, modulos, materiales, matriculas,
                mock(AlmacenamientoArchivos.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY)));
        mvc = MockMvcBuilders.standaloneSetup(new AulaController(service))
                .setControllerAdvice(new ApiExceptionHandler())
                .addFilters(new JwtAuthFilter(new JwtVerifier(new ObjectMapper(), SECRET, "cursos-service"))).build();
        path = "/api/cursos/" + cursoId + "/aula";
    }

    @Test void docenteAsignadoPuedeLeerYCrear() throws Exception {
        String jwt = token(docenteId, "DOCENTE");
        mvc.perform(get(path).header("Authorization", jwt)).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(post(path + "/modulos").header("Authorization", jwt).contentType(MediaType.APPLICATION_JSON)
                .content("{\"titulo\":\"Semana 1\",\"orden\":1}")).andExpect(status().isCreated());
        verifyNoInteractions(matriculas);
        verify(modulos).save(any());
    }
    @Test void docenteAjenoNoLeeNiGestiona() throws Exception {
        String jwt = token(UUID.randomUUID(), "DOCENTE");
        mvc.perform(get(path).header("Authorization", jwt)).andExpect(status().isForbidden());
        mvc.perform(post(path + "/modulos").header("Authorization", jwt).contentType(MediaType.APPLICATION_JSON)
                .content("{\"titulo\":\"Semana 1\",\"orden\":1}")).andExpect(status().isForbidden());
        verifyNoInteractions(modulos, materiales, matriculas);
    }
    @Test void alumnoPagadoUsaSubjectAunqueEnvienOtroId() throws Exception {
        when(matriculas.habilitada(cursoId, alumnoId)).thenReturn(true);
        mvc.perform(get(path).param("estudianteId", docenteId.toString()).header("Authorization", token(alumnoId, "ESTUDIANTE")))
                .andExpect(status().isOk());
        verify(matriculas).habilitada(cursoId, alumnoId);
    }
    @Test void alumnoSinMatriculaNoLee() throws Exception {
        mvc.perform(get(path).header("Authorization", token(alumnoId, "ESTUDIANTE"))).andExpect(status().isForbidden());
        verifyNoInteractions(modulos, materiales);
    }
    @Test void alumnoPagadoNoGestiona() throws Exception {
        mvc.perform(post(path + "/modulos").header("Authorization", token(alumnoId, "ESTUDIANTE"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"titulo\":\"Semana 1\",\"orden\":1}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(modulos, matriculas);
    }
    @Test void adminYServicioNoTienenAccesoEspecial() throws Exception {
        for (String rol : List.of("ADMIN", "SERVICE")) {
            mvc.perform(get(path).header("Authorization", token(docenteId, rol))).andExpect(status().isForbidden());
        }
        verifyNoInteractions(cursos, modulos, matriculas);
    }
    @Test void puerto8082DirectoRequiereJwt() throws Exception {
        mvc.perform(get("http://localhost:8082" + path)).andExpect(status().isUnauthorized());
        mvc.perform(get("http://localhost:8082" + path).header("Authorization", "Bearer invalido"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(cursos, modulos, matriculas);
    }
    @Test void firmaAlteradaEsRechazada() throws Exception {
        mvc.perform(get(path).header("Authorization", token(alumnoId, "ESTUDIANTE") + "x"))
                .andExpect(status().isUnauthorized());
    }
    @Test void jwtExpiradoEsRechazado() throws Exception {
        mvc.perform(get(path).header("Authorization", token(alumnoId, "ESTUDIANTE", Instant.now().minusSeconds(10))))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(cursos, modulos, matriculas);
    }
    @Test void listadoSoloConsultaActivosYNoExponeClavesStorage() throws Exception {
        UUID moduloId = UUID.randomUUID(), materialId = UUID.randomUUID();
        Modulo modulo = new Modulo(cursoId, "Semana 1", 1);
        Material material = new Material();
        org.springframework.test.util.ReflectionTestUtils.setField(modulo, "id", moduloId);
        org.springframework.test.util.ReflectionTestUtils.setField(material, "id", materialId);
        org.springframework.test.util.ReflectionTestUtils.setField(material, "moduloId", moduloId);
        org.springframework.test.util.ReflectionTestUtils.setField(material, "titulo", "Lectura");
        org.springframework.test.util.ReflectionTestUtils.setField(material, "objectKey", "private/object.pdf");
        when(modulos.findByCursoIdOrderByOrdenAscIdAsc(cursoId)).thenReturn(List.of(modulo));
        when(materiales.findByModuloIdInAndEstadoOrderByCreatedAtAscIdAsc(List.of(moduloId), Material.Estado.ACTIVO))
                .thenReturn(List.of(material));
        mvc.perform(get(path).header("Authorization", token(docenteId, "DOCENTE")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].materiales[0].titulo").value("Lectura"))
                .andExpect(jsonPath("$[0].materiales[0].objectKey").doesNotExist());
        verify(materiales).findByModuloIdInAndEstadoOrderByCreatedAtAscIdAsc(List.of(moduloId), Material.Estado.ACTIVO);
    }
    @Test void pedidosCaidoEs503SinMostrarMateriales() throws Exception {
        when(matriculas.habilitada(cursoId, alumnoId)).thenThrow(new MatriculaClient.NoDisponibleException());
        mvc.perform(get(path).header("Authorization", token(alumnoId, "ESTUDIANTE")))
                .andExpect(status().isServiceUnavailable());
        verifyNoInteractions(modulos, materiales);
    }
    @Test void editarModuloExigePertenenciaAlCurso() throws Exception {
        UUID moduloId = UUID.randomUUID();
        when(modulos.findByIdAndCursoId(moduloId, cursoId)).thenReturn(Optional.empty());
        mvc.perform(patch(path + "/modulos/" + moduloId).header("Authorization", token(docenteId, "DOCENTE"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"titulo\":\"Semana 2\",\"orden\":2}"))
                .andExpect(status().isNotFound());
        verify(modulos, never()).save(any());
    }
    @Test void moduloInvalidoNoPersiste() throws Exception {
        mvc.perform(post(path + "/modulos").header("Authorization", token(docenteId, "DOCENTE"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"titulo\":\" \",\"orden\":0}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(modulos);
    }
    @Test void edicionAutorizada() throws Exception {
        UUID moduloId = UUID.randomUUID();
        Modulo modulo = new Modulo(cursoId, "Anterior", 1);
        when(modulos.findByIdAndCursoId(moduloId, cursoId)).thenReturn(Optional.of(modulo));
        mvc.perform(patch(path + "/modulos/" + moduloId).header("Authorization", token(docenteId, "DOCENTE"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"titulo\":\"Semana 2\",\"orden\":2}"))
                .andExpect(status().isNoContent());
        verify(modulos).save(modulo);
        org.assertj.core.api.Assertions.assertThat(modulo.getTitulo()).isEqualTo("Semana 2");
    }

    private String token(UUID sub, String rol) throws Exception {
        return token(sub, rol, Instant.now().plusSeconds(60));
    }
    private String token(UUID sub, String rol, Instant expiration) throws Exception {
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        String h = enc.encodeToString("{\"alg\":\"HS256\"}".getBytes(StandardCharsets.UTF_8));
        String p = enc.encodeToString(new ObjectMapper().writeValueAsBytes(Map.of("sub", sub.toString(), "rol", rol,
                "exp", expiration.getEpochSecond())));
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "Bearer " + h + "." + p + "." + enc.encodeToString(mac.doFinal((h + "." + p).getBytes(StandardCharsets.UTF_8)));
    }
}
