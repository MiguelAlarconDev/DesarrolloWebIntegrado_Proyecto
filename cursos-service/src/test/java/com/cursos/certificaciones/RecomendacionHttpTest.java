package com.cursos.certificaciones;
import com.cursos.aula.*;
import com.cursos.aula.tareas.*;
import com.cursos.controller.ApiExceptionHandler;
import com.cursos.entity.Curso;
import com.cursos.repository.CursoRepository;
import com.cursos.security.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.*;
import java.time.Instant;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RecomendacionHttpTest {
    static final String SECRET="recomendaciones-test-only-secret-1234567890";
    final UUID curso=UUID.randomUUID(), docente=UUID.randomUUID(), alumno=UUID.randomUUID();
    final CursoRepository cursos=repo(CursoRepository.class);
    final TareaRepository tareas=repo(TareaRepository.class);
    final MatriculaClient matriculas=mock(MatriculaClient.class,withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
    MockMvc mvc; String base;
    static <T> T repo(Class<T> type){return mock(type,withSettings().mockMaker(org.mockito.MockMakers.PROXY));}
    @BeforeEach void setup(){
        Curso c=new Curso(); c.setDocenteId(docente);
        when(cursos.findById(curso)).thenReturn(Optional.of(c));
        when(matriculas.habilitada(curso,alumno)).thenReturn(true);
        when(tareas.evaluaciones(curso,alumno)).thenReturn(List.of(MotorRecomendacionTest.nota("14"),MotorRecomendacionTest.nota("12"),MotorRecomendacionTest.nota("16")));
        AulaService aula=new AulaService(cursos,repo(ModuloRepository.class),repo(MaterialRepository.class),matriculas,repo(AlmacenamientoArchivos.class));
        mvc=MockMvcBuilders.standaloneSetup(new RecomendacionController(new RecomendacionService(aula,matriculas,tareas)))
            .setControllerAdvice(new ApiExceptionHandler())
            .addFilters(new JwtAuthFilter(new JwtVerifier(new ObjectMapper(),SECRET,"cursos-service"))).build();
        base="http://localhost:8082/api/cursos/"+curso+"/aula/recomendaciones/"+alumno;
    }
    @Test void docenteAsignadoConsultaDirectamenteSinGateway() throws Exception {
        mvc.perform(get(base).header("Authorization",jwt(docente,"DOCENTE",60)))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
            .andExpect(jsonPath("$.cursoId").value(curso.toString())).andExpect(jsonPath("$.estudianteId").value(alumno.toString()))
            .andExpect(jsonPath("$.totalTareas").value(3)).andExpect(jsonPath("$.promedio").value(14))
            .andExpect(jsonPath("$.recomendacion").value("APTO"));
        verify(tareas).evaluaciones(curso,alumno);
    }
    @Test void rolesYDocenteAjenoDenegados() throws Exception {
        for(String rol:List.of("ADMIN","ESTUDIANTE","DOCENTE"))
            mvc.perform(get(base).param("docenteId",docente.toString()).header("Authorization",jwt(UUID.randomUUID(),rol,60)))
                .andExpect(status().isForbidden()).andExpect(header().string("Cache-Control","no-store"));
        verifyNoInteractions(matriculas,tareas);
    }
    @Test void jwtAusenteInvalidoYExpirado() throws Exception {
        mvc.perform(get(base)).andExpect(status().isUnauthorized());
        mvc.perform(get(base).header("Authorization","Bearer invalid")).andExpect(status().isUnauthorized());
        mvc.perform(get(base).header("Authorization",jwt(docente,"DOCENTE",-5))).andExpect(status().isUnauthorized());
        verifyNoInteractions(cursos,matriculas,tareas);
    }
    @Test void matriculaNoPagada() throws Exception {
        when(matriculas.habilitada(curso,alumno)).thenReturn(false);
        mvc.perform(get(base).header("Authorization",jwt(docente,"DOCENTE",60))).andExpect(status().isForbidden());
        verifyNoInteractions(tareas);
    }
    @Test void pedidosCaido() throws Exception {
        when(matriculas.habilitada(curso,alumno)).thenThrow(new MatriculaClient.NoDisponibleException());
        mvc.perform(get(base).header("Authorization",jwt(docente,"DOCENTE",60))).andExpect(status().isServiceUnavailable());
        verifyNoInteractions(tareas);
    }
    @Test void sinActividadYRecalificacionSinCache() throws Exception {
        when(tareas.evaluaciones(curso,alumno)).thenReturn(List.of(new MotorRecomendacionTest.Dato(UUID.randomUUID(),null,null,false)))
            .thenReturn(List.of(MotorRecomendacionTest.nota("10"))).thenReturn(List.of(MotorRecomendacionTest.nota("15")));
        for(String esperado:List.of("SIN_DATOS_SUFICIENTES","NO_APTO","APTO"))
            mvc.perform(get(base).header("Authorization",jwt(docente,"DOCENTE",60))).andExpect(status().isOk())
                .andExpect(jsonPath("$.recomendacion").value(esperado));
        verify(matriculas,times(3)).habilitada(curso,alumno);
    }
    @Test void cursoInexistente() throws Exception {
        when(cursos.findById(curso)).thenReturn(Optional.empty());
        mvc.perform(get(base).header("Authorization",jwt(docente,"DOCENTE",60))).andExpect(status().isNotFound());
        verifyNoInteractions(matriculas,tareas);
    }
    static String jwt(UUID sub,String role,int seconds) throws Exception {
        var enc=Base64.getUrlEncoder().withoutPadding();
        String h=enc.encodeToString("{\"alg\":\"HS256\"}".getBytes(StandardCharsets.UTF_8));
        String p=enc.encodeToString(new ObjectMapper().writeValueAsBytes(Map.of("sub",sub.toString(),"rol",role,"exp",Instant.now().plusSeconds(seconds).getEpochSecond())));
        Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
        return "Bearer "+h+"."+p+"."+enc.encodeToString(mac.doFinal((h+"."+p).getBytes(StandardCharsets.UTF_8)));
    }
}
