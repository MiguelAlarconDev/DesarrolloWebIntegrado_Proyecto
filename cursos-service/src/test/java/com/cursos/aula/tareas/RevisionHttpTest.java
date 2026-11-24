package com.cursos.aula.tareas;
import com.cursos.aula.*;
import com.cursos.controller.ApiExceptionHandler;
import com.cursos.security.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.data.domain.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import java.time.Duration;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RevisionHttpTest {
    EntregaHttpTest f; MockMvc mvc; UUID docente; Entrega e; String base;
    @BeforeEach void setup(){
        f=new EntregaHttpTest();f.setup();docente=UUID.randomUUID();
        f.cursos.findById(f.curso).orElseThrow().setDocenteId(docente);
        e=f.existente();
        when(f.entregas.findByIdAndTareaId(e.getId(),f.tareaId)).thenReturn(Optional.of(e));
        when(f.entregas.reservarCalificacion(e.getId(),0)).thenReturn(1);
        when(f.entregas.findByTareaIdAndEstadoIn(eq(f.tareaId),any(),any())).thenAnswer(inv->{
            Pageable page=inv.getArgument(2);
            return new PageImpl<>(page.getPageNumber()==0?List.of(e):List.of(),page,1);
        });
        mvc=MockMvcBuilders.standaloneSetup(new RevisionController(f.service),new EntregaController(f.service))
            .setControllerAdvice(new ApiExceptionHandler()).addFilters(new JwtAuthFilter(
                new JwtVerifier(new ObjectMapper(),TareaHttpTest.SECRET,"cursos-service"))).build();
        base=f.base.replace("/mi-entrega","/entregas");
    }
    String jwt(UUID id,String role)throws Exception{return TareaHttpTest.jwt(id,role,60);}
    String docenteJwt()throws Exception{return jwt(docente,"DOCENTE");}
    String body(String nota,String feedback,int version){
        return "{\"nota\":"+nota+",\"retroalimentacion\":\""+feedback+"\",\"version\":"+version+"}";
    }
    @Test void paginaPrivadaYLimites()throws Exception{
        mvc.perform(get(base).param("size","1").header("Authorization",docenteJwt())).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$.items[0].estudianteId").value(f.alumno.toString()))
            .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get(base).param("page","1").param("size","1").header("Authorization",docenteJwt()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        for(String size:List.of("0","101","-1"))
            mvc.perform(get(base).param("size",size).header("Authorization",docenteJwt())).andExpect(status().isBadRequest());
        mvc.perform(get(base).param("page","-1").header("Authorization",docenteJwt())).andExpect(status().isBadRequest());
        verify(f.entregas,times(2)).findByTareaIdAndEstadoIn(eq(f.tareaId),
            eq(List.of(Entrega.Estado.ENTREGADA,Entrega.Estado.CALIFICADA)),any());
    }
    @Test void ceroVeinteDecimalesYPublicacionInmediata()throws Exception{
        for(String nota:List.of("0","20","12.34")){
            mvc.perform(put(base+"/"+e.getId()+"/calificacion").header("Authorization",docenteJwt())
                .contentType(MediaType.APPLICATION_JSON).content(body(nota," Revisado ",0)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("CALIFICADA"))
                .andExpect(jsonPath("$.nota").value(Double.parseDouble(nota))).andExpect(jsonPath("$.retroalimentacion").value("Revisado"))
                .andExpect(header().string("Cache-Control","no-store"));
            mvc.perform(get(f.base).header("Authorization",jwt(f.alumno,"ESTUDIANTE"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.nota").value(Double.parseDouble(nota))).andExpect(jsonPath("$.retroalimentacion").value("Revisado"));
        }
    }
    @Test void invalidoNoPersiste()throws Exception{
        for(String nota:List.of("-0.01","20.01","1.234","20.000","null")){
            mvc.perform(put(base+"/"+e.getId()+"/calificacion").header("Authorization",docenteJwt())
                .contentType(MediaType.APPLICATION_JSON).content(body(nota,"Texto",0))).andExpect(status().isBadRequest());
        }
        for(String feedback:List.of(""," ","x".repeat(20001))){
            mvc.perform(put(base+"/"+e.getId()+"/calificacion").header("Authorization",docenteJwt())
                .contentType(MediaType.APPLICATION_JSON).content(body("10",feedback,0))).andExpect(status().isBadRequest());
        }
        mvc.perform(put(base+"/"+e.getId()+"/calificacion").header("Authorization",docenteJwt())
            .contentType(MediaType.APPLICATION_JSON).content("{\"nota\":10,\"retroalimentacion\":\"Bien\"}")).andExpect(status().isBadRequest());
        verify(f.entregas,never()).reservarCalificacion(any(),anyLong());
        verify(f.entregas,never()).saveAndFlush(any());
    }
    @Test void rolesYDocenteAjeno()throws Exception{
        for(String role:List.of("ADMIN","ESTUDIANTE","DOCENTE")){
            String token=jwt(UUID.randomUUID(),role);
            mvc.perform(get(base).header("Authorization",token)).andExpect(status().isForbidden());
            mvc.perform(put(base+"/"+e.getId()+"/calificacion").header("Authorization",token)
                .contentType(MediaType.APPLICATION_JSON).content(body("10","Bien",0))).andExpect(status().isForbidden());
            mvc.perform(get(base+"/"+e.getId()+"/archivo/descarga").header("Authorization",token)).andExpect(status().isForbidden());
        }
        mvc.perform(get(base)).andExpect(status().isUnauthorized());
    }
    @Test void descargaDocenteSoloArchivoDeTarea()throws Exception{
        var a=new EntregaArchivo(e.getId(),"private/test.pdf",new ValidadorArchivo.Resultado(Material.Tipo.PDF,"application/pdf","t.pdf"),10);
        when(f.archivos.findByEntregaId(e.getId())).thenReturn(Optional.of(a));
        when(f.storage.urlFirmada("private/test.pdf",Duration.ofSeconds(60),"t.pdf")).thenReturn("https://storage.invalid/signed");
        mvc.perform(get(base+"/"+e.getId()+"/archivo/descarga").header("Authorization",docenteJwt()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.url").value("https://storage.invalid/signed"))
            .andExpect(header().string("Cache-Control","no-store"));
        mvc.perform(get(base+"/"+UUID.randomUUID()+"/archivo/descarga").header("Authorization",docenteJwt())).andExpect(status().isNotFound());
    }
    @Test void versionObsoletaPendienteYEntregaAjena()throws Exception{
        mvc.perform(put(base+"/"+e.getId()+"/calificacion").header("Authorization",docenteJwt())
            .contentType(MediaType.APPLICATION_JSON).content(body("10","Bien",9))).andExpect(status().isConflict());
        mvc.perform(put(base+"/"+UUID.randomUUID()+"/calificacion").header("Authorization",docenteJwt())
            .contentType(MediaType.APPLICATION_JSON).content(body("10","Bien",0))).andExpect(status().isNotFound());
        ReflectionTestUtils.setField(e,"estado",Entrega.Estado.ENVIO_PENDIENTE);
        mvc.perform(put(base+"/"+e.getId()+"/calificacion").header("Authorization",docenteJwt())
            .contentType(MediaType.APPLICATION_JSON).content(body("10","Bien",0))).andExpect(status().isConflict());
        verify(f.entregas,never()).saveAndFlush(any());
    }
    @Test void cadenaCursoModuloTarea()throws Exception{
        when(f.tareas.bloquear(f.tareaId,f.modulo)).thenReturn(Optional.empty());
        mvc.perform(get(base).header("Authorization",docenteJwt())).andExpect(status().isNotFound());
        when(f.modulos.findByIdAndCursoId(f.modulo,f.curso)).thenReturn(Optional.empty());
        mvc.perform(get(base).header("Authorization",docenteJwt())).andExpect(status().isNotFound());
    }
    @Test void alumnoAjenoNoVeNota()throws Exception{
        e.calificar(new java.math.BigDecimal("15"),"Privado",docente,f.now);
        mvc.perform(get(f.base).param("estudianteId",f.alumno.toString()).header("Authorization",jwt(f.otro,"ESTUDIANTE")))
            .andExpect(status().isNotFound());
    }
}
