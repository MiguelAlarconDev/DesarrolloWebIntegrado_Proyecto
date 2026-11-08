package com.cursos.aula.tareas;

import com.cursos.aula.*;
import com.cursos.controller.ApiExceptionHandler;
import com.cursos.entity.Curso;
import com.cursos.repository.CursoRepository;
import com.cursos.security.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import java.util.*;
import java.time.Instant;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class TareaHttpTest {
    static final String SECRET="tareas-local-test-only-secret-1234567890";
    final UUID curso=UUID.randomUUID(), modulo=UUID.randomUUID(), docente=UUID.randomUUID(), alumno=UUID.randomUUID(), id=UUID.randomUUID();
    final CursoRepository cursos=repo(CursoRepository.class);
    final ModuloRepository modulos=repo(ModuloRepository.class);
    final TareaRepository tareas=repo(TareaRepository.class);
    final EntregaRepository entregas=repo(EntregaRepository.class);
    final MatriculaClient matriculas=mock(MatriculaClient.class,withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
    MockMvc mvc;
    Tarea tarea;
    String base;
    static <T> T repo(Class<T> type){return mock(type,withSettings().mockMaker(org.mockito.MockMakers.PROXY));}
    @BeforeEach void setup(){
        Curso c=new Curso(); c.setDocenteId(docente);
        when(cursos.findById(curso)).thenReturn(Optional.of(c));
        when(modulos.findByIdAndCursoId(modulo,curso)).thenReturn(Optional.of(new Modulo(curso,"Modulo",1)));
        AulaService aula=new AulaService(cursos,modulos,repo(MaterialRepository.class),matriculas,repo(AlmacenamientoArchivos.class));
        tarea=new Tarea(modulo,"Tarea","Consigna",Instant.parse("2030-01-01T15:00:00Z"),Tarea.TipoEntrega.AMBOS,docente);
        org.springframework.test.util.ReflectionTestUtils.setField(tarea,"id",id);
        when(tareas.findByIdAndModuloId(id,modulo)).thenReturn(Optional.of(tarea));
        when(tareas.bloquear(id,modulo)).thenReturn(Optional.of(tarea));
        when(tareas.findByModuloIdOrderByCreatedAtAscIdAsc(modulo)).thenReturn(List.of(tarea));
        when(tareas.saveAndFlush(any())).thenAnswer(i->i.getArgument(0));
        mvc=MockMvcBuilders.standaloneSetup(new TareaController(new TareaService(aula,tareas,entregas)))
            .setControllerAdvice(new ApiExceptionHandler())
            .addFilters(new JwtAuthFilter(new JwtVerifier(new ObjectMapper(),SECRET,"cursos-service"))).build();
        base="/api/cursos/"+curso+"/aula/modulos/"+modulo+"/tareas";
    }
    String body(boolean edit){return "{\"titulo\":\"Nueva tarea\",\"consigna\":\"Resolver\",\"fechaLimite\":\"2030-01-01T10:00:00-05:00\",\"tipoEntrega\":\"AMBOS\""+(edit?",\"version\":0":"")+"}";}
    @Test void docenteCrud() throws Exception {
        String jwt=jwt(docente,"DOCENTE",60);
        mvc.perform(post(base).header("Authorization",jwt).contentType(MediaType.APPLICATION_JSON).content(body(false)))
            .andExpect(status().isCreated()).andExpect(header().string("Cache-Control","no-store"));
        mvc.perform(get(base).header("Authorization",jwt)).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id.toString()));
        mvc.perform(get(base+"/"+id).header("Authorization",jwt)).andExpect(status().isOk()).andExpect(jsonPath("$.tipoEntrega").value("AMBOS"));
        mvc.perform(patch(base+"/"+id).header("Authorization",jwt).contentType(MediaType.APPLICATION_JSON).content(body(true)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.titulo").value("Nueva tarea"));
        org.assertj.core.api.Assertions.assertThat(tarea.getFechaLimite()).isEqualTo(Instant.parse("2030-01-01T15:00:00Z"));
        mvc.perform(delete(base+"/"+id).param("version","0").header("Authorization",jwt)).andExpect(status().isNoContent());
        verify(tareas).delete(tarea);
    }
    @Test void alumnoPagadoLeePeroNoEscribe() throws Exception {
        when(matriculas.habilitada(curso,alumno)).thenReturn(true);
        String jwt=jwt(alumno,"ESTUDIANTE",60);
        mvc.perform(get(base).param("estudianteId",docente.toString()).header("Authorization",jwt)).andExpect(status().isOk());
        mvc.perform(get(base+"/"+id).header("Authorization",jwt)).andExpect(status().isOk());
        mvc.perform(post(base).header("Authorization",jwt).contentType(MediaType.APPLICATION_JSON).content(body(false))).andExpect(status().isForbidden());
        mvc.perform(patch(base+"/"+id).header("Authorization",jwt).contentType(MediaType.APPLICATION_JSON).content(body(true))).andExpect(status().isForbidden());
        mvc.perform(delete(base+"/"+id).param("version","0").header("Authorization",jwt)).andExpect(status().isForbidden());
        verify(matriculas,times(2)).habilitada(curso,alumno);
        verify(tareas,never()).saveAndFlush(any()); verify(tareas,never()).delete(any());
    }
    @Test void sinMatriculaEs403() throws Exception {
        mvc.perform(get(base).header("Authorization",jwt(alumno,"ESTUDIANTE",60))).andExpect(status().isForbidden());
        verifyNoInteractions(tareas);
    }
    @Test void pedidosCaidoEs503() throws Exception {
        when(matriculas.habilitada(curso,alumno)).thenThrow(new MatriculaClient.NoDisponibleException());
        mvc.perform(get(base).header("Authorization",jwt(alumno,"ESTUDIANTE",60))).andExpect(status().isServiceUnavailable());
        verifyNoInteractions(tareas);
    }
    @Test void docenteAjenoYAdminSinAcceso() throws Exception {
        for(String role:List.of("DOCENTE","ADMIN")){
            String jwt=jwt(UUID.randomUUID(),role,60);
            mvc.perform(get(base).header("Authorization",jwt)).andExpect(status().isForbidden());
            mvc.perform(post(base).header("Authorization",jwt).contentType(MediaType.APPLICATION_JSON).content(body(false))).andExpect(status().isForbidden());
        }
        verifyNoInteractions(tareas);
    }
    @Test void jwtAusenteInvalidoYExpirado() throws Exception {
        mvc.perform(get("http://localhost:8082"+base)).andExpect(status().isUnauthorized()).andExpect(header().string("Cache-Control","no-store"));
        mvc.perform(get(base).header("Authorization","Bearer invalid")).andExpect(status().isUnauthorized());
        mvc.perform(get(base).header("Authorization",jwt(docente,"DOCENTE",-5))).andExpect(status().isUnauthorized());
    }
    @Test void moduloAjenoEs404() throws Exception {
        when(modulos.findByIdAndCursoId(modulo,curso)).thenReturn(Optional.empty());
        mvc.perform(get(base).header("Authorization",jwt(docente,"DOCENTE",60))).andExpect(status().isNotFound());
        verifyNoInteractions(tareas);
    }
    @Test void tareaAjenaEs404() throws Exception {
        when(tareas.findByIdAndModuloId(id,modulo)).thenReturn(Optional.empty());
        when(tareas.bloquear(id,modulo)).thenReturn(Optional.empty());
        String jwt=jwt(docente,"DOCENTE",60);
        mvc.perform(get(base+"/"+id).header("Authorization",jwt)).andExpect(status().isNotFound());
        mvc.perform(delete(base+"/"+id).param("version","0").header("Authorization",jwt)).andExpect(status().isNotFound());
    }
    @Test void entregasBloqueanEdicionYBorrado() throws Exception {
        when(entregas.existsByTareaId(id)).thenReturn(true);
        String jwt=jwt(docente,"DOCENTE",60);
        mvc.perform(patch(base+"/"+id).header("Authorization",jwt).contentType(MediaType.APPLICATION_JSON).content(body(true))).andExpect(status().isConflict());
        mvc.perform(delete(base+"/"+id).param("version","0").header("Authorization",jwt)).andExpect(status().isConflict());
        verify(tareas,never()).saveAndFlush(any()); verify(tareas,never()).delete(any());
    }
    @Test void versionObsoletaEs409() throws Exception {
        String jwt=jwt(docente,"DOCENTE",60);
        mvc.perform(patch(base+"/"+id).header("Authorization",jwt).contentType(MediaType.APPLICATION_JSON).content(body(true).replace("\"version\":0","\"version\":5"))).andExpect(status().isConflict());
        mvc.perform(delete(base+"/"+id).param("version","5").header("Authorization",jwt)).andExpect(status().isConflict());
    }
    @Test void camposInvalidosNoPersisten() throws Exception {
        for(String body:List.of("{}",body(false).replace("Nueva tarea"," "),body(false).replace("AMBOS","OTRO"),
            body(false).replace("2030-01-01T10:00:00-05:00","2030-01-01T10:00:00"),
            body(false).replace("Resolver","x".repeat(20001)))){
            mvc.perform(post(base).header("Authorization",jwt(docente,"DOCENTE",60)).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        mvc.perform(patch(base+"/"+id).header("Authorization",jwt(docente,"DOCENTE",60)).contentType(MediaType.APPLICATION_JSON).content(body(false))).andExpect(status().isBadRequest());
        mvc.perform(delete(base+"/"+id).header("Authorization",jwt(docente,"DOCENTE",60))).andExpect(status().isBadRequest());
        verify(tareas,never()).saveAndFlush(any());
    }
    @Test void conflictoDePersistenciaEs409SinDetallesInternos() throws Exception {
        when(tareas.saveAndFlush(any())).thenThrow(new org.springframework.dao.DataIntegrityViolationException("internal SQL details"));
        mvc.perform(post(base).header("Authorization",jwt(docente,"DOCENTE",60)).contentType(MediaType.APPLICATION_JSON).content(body(false)))
            .andExpect(status().isConflict()).andExpect(header().string("Cache-Control","no-store"))
            .andExpect(jsonPath("$.message").value("La tarea cambio o tiene referencias; recargue antes de continuar"));
    }
    static String jwt(UUID sub,String role,int seconds) throws Exception {
        var enc=Base64.getUrlEncoder().withoutPadding();
        String h=enc.encodeToString("{\"alg\":\"HS256\"}".getBytes(StandardCharsets.UTF_8));
        String p=enc.encodeToString(new ObjectMapper().writeValueAsBytes(Map.of("sub",sub.toString(),"rol",role,"exp",Instant.now().plusSeconds(seconds).getEpochSecond())));
        Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
        return "Bearer "+h+"."+p+"."+enc.encodeToString(mac.doFinal((h+"."+p).getBytes(StandardCharsets.UTF_8)));
    }
}
