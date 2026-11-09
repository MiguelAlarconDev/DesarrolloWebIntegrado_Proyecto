package com.cursos.certificaciones;
import com.cursos.aula.*;
import com.cursos.controller.ApiExceptionHandler;
import com.cursos.entity.Curso;
import com.cursos.repository.CursoRepository;
import com.cursos.security.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import org.springframework.transaction.PlatformTransactionManager;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AprobacionHttpTest {
    final UUID curso=UUID.randomUUID(),docente=UUID.randomUUID(),alumno=UUID.randomUUID();
    final CursoRepository cursos=RecomendacionHttpTest.repo(CursoRepository.class);
    final AprobacionRepository aprobaciones=RecomendacionHttpTest.repo(AprobacionRepository.class);
    final MatriculaClient matriculas=mock(MatriculaClient.class,withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
    MockMvc mvc;String base;
    @BeforeEach void setup(){
        Curso c=new Curso();c.setDocenteId(docente);when(cursos.findById(curso)).thenReturn(Optional.of(c));
        var aula=new AulaService(cursos,null,null,matriculas,null);
        var service=new AprobacionService(aula,matriculas,aprobaciones,null,null,null,null,
            RecomendacionHttpTest.repo(PlatformTransactionManager.class));
        mvc=MockMvcBuilders.standaloneSetup(new AprobacionController(service)).setControllerAdvice(new ApiExceptionHandler())
            .addFilters(new JwtAuthFilter(new JwtVerifier(new ObjectMapper(),RecomendacionHttpTest.SECRET,"cursos-service"))).build();
        base="http://localhost:8082/api/cursos/"+curso+"/aula/aprobaciones/"+alumno;
    }
    String body(){return "{\"decision\":\"APROBADO\",\"justificacion\":\"Revision docente\",\"versionEsperada\":0,\"evidenciaHash\":\""+"a".repeat(64)+"\"}";}
    void todos(String token,int status)throws Exception {
        for(String sufijo:List.of("","/evidencia","/historial"))
            mvc.perform(get(base+sufijo).header("Authorization",token)).andExpect(status().is(status)).andExpect(header().string("Cache-Control","no-store"));
        for(String sufijo:List.of("","/revocaciones"))
            mvc.perform(post(base+sufijo).header("Authorization",token).header("Idempotency-Key",UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON).content(body())).andExpect(status().is(status)).andExpect(header().string("Cache-Control","no-store"));
    }
    @Test void ausenteInvalidoExpiradoYFirmaAjenaSinGateway()throws Exception {
        mvc.perform(get(base)).andExpect(status().isUnauthorized());
        mvc.perform(post(base).contentType(MediaType.APPLICATION_JSON).content(body())).andExpect(status().isUnauthorized());
        todos("Bearer invalid",401);
        todos(RecomendacionHttpTest.jwt(docente,"DOCENTE",-5),401);
        String token=RecomendacionHttpTest.jwt(docente,"DOCENTE",60);
        todos(token.substring(0,token.lastIndexOf('.')+1)+"firmaInvalida",401);
        verifyNoInteractions(cursos,matriculas,aprobaciones);
    }
    @Test void docenteAjenoAdminEstudianteYServicioSinPermisos()throws Exception {
        for(String rol:List.of("DOCENTE","ADMIN","ESTUDIANTE","SERVICE"))todos(RecomendacionHttpTest.jwt(UUID.randomUUID(),rol,60),403);
        verifyNoInteractions(matriculas,aprobaciones);
    }
    @Test void matriculaNoPagadaDeniegaTodo()throws Exception {
        todos(RecomendacionHttpTest.jwt(docente,"DOCENTE",60),403);verifyNoInteractions(aprobaciones);
    }
    @Test void pedidosCaidoNoUsaDatosAcademicos()throws Exception {
        when(matriculas.habilitada(curso,alumno)).thenThrow(new MatriculaClient.NoDisponibleException());
        todos(RecomendacionHttpTest.jwt(docente,"DOCENTE",60),503);verifyNoInteractions(aprobaciones);
    }
    @Test void validacionesDeContrato()throws Exception {
        String jwt=RecomendacionHttpTest.jwt(docente,"DOCENTE",60);
        for(String invalid:List.of("{}",body().replace("Revision docente"," "),body().replace("APROBADO","OTRO"),
            body().replace("APROBADO","REVOCADO"),body().replace("\"versionEsperada\":0","\"versionEsperada\":-2"),body().replace("a".repeat(64),"invalido")))
            mvc.perform(post(base).header("Authorization",jwt).header("Idempotency-Key",UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest());
        mvc.perform(post(base).header("Authorization",jwt).contentType(MediaType.APPLICATION_JSON).content(body())).andExpect(status().isBadRequest());
        verifyNoInteractions(aprobaciones);
    }
}
