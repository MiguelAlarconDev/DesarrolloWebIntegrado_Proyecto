package com.cursos.aula.tareas;

import com.cursos.aula.*;
import com.cursos.controller.ApiExceptionHandler;
import com.cursos.entity.Curso;
import com.cursos.repository.CursoRepository;
import com.cursos.security.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class EntregaHttpTest {
    final UUID curso=UUID.randomUUID(), modulo=UUID.randomUUID(), tareaId=UUID.randomUUID(), alumno=UUID.randomUUID(), otro=UUID.randomUUID();
    final CursoRepository cursos=TareaHttpTest.repo(CursoRepository.class);
    final ModuloRepository modulos=TareaHttpTest.repo(ModuloRepository.class);
    final TareaRepository tareas=TareaHttpTest.repo(TareaRepository.class);
    final EntregaRepository entregas=TareaHttpTest.repo(EntregaRepository.class);
    final EntregaArchivoRepository archivos=TareaHttpTest.repo(EntregaArchivoRepository.class);
    final AlmacenamientoArchivos storage=TareaHttpTest.repo(AlmacenamientoArchivos.class);
    final MatriculaClient matriculas=mock(MatriculaClient.class,withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
    final Instant now=Instant.parse("2030-01-01T12:00:00Z");
    MockMvc mvc; Tarea tarea; String base;
    EntregaService service;

    @BeforeEach void setup(){
        Curso c=new Curso();c.setDocenteId(UUID.randomUUID());
        when(cursos.findById(curso)).thenReturn(Optional.of(c));
        when(modulos.findByIdAndCursoId(modulo,curso)).thenReturn(Optional.of(new Modulo(curso,"M",1)));
        when(matriculas.habilitada(curso,alumno)).thenReturn(true);
        when(matriculas.habilitada(curso,otro)).thenReturn(true);
        tarea=new Tarea(modulo,"T","C",now.plusSeconds(60),Tarea.TipoEntrega.AMBOS,c.getDocenteId());
        when(tareas.bloquear(tareaId,modulo)).thenReturn(Optional.of(tarea));
        when(entregas.saveAndFlush(any())).thenAnswer(i->{
            Entrega e=i.getArgument(0);
            if(e.getId()==null)ReflectionTestUtils.setField(e,"id",UUID.randomUUID());
            return e;
        });
        when(archivos.saveAndFlush(any())).thenAnswer(i->i.getArgument(0));
        PlatformTransactionManager manager=TareaHttpTest.repo(PlatformTransactionManager.class);
        when(manager.getTransaction(any())).thenAnswer(i->new SimpleTransactionStatus());
        AulaService aula=new AulaService(cursos,modulos,TareaHttpTest.repo(MaterialRepository.class),matriculas,storage);
        service=new EntregaService(aula,tareas,entregas,archivos,storage,manager,Clock.fixed(now,ZoneOffset.UTC));
        mvc=MockMvcBuilders.standaloneSetup(new EntregaController(service)).setControllerAdvice(new ApiExceptionHandler())
            .addFilters(new JwtAuthFilter(new JwtVerifier(new ObjectMapper(),TareaHttpTest.SECRET,"cursos-service"))).build();
        base="/api/cursos/"+curso+"/aula/modulos/"+modulo+"/tareas/"+tareaId+"/mi-entrega";
    }
    MockMultipartFile pdf(){return new MockMultipartFile("archivo","respuesta.pdf","application/pdf","%PDF-1.7 test".getBytes());}
    String jwt()throws Exception{return TareaHttpTest.jwt(alumno,"ESTUDIANTE",60);}
    Entrega existente(){
        Entrega e=new Entrega(tareaId,alumno);e.entregar("Anterior",now.minusSeconds(1));
        ReflectionTestUtils.setField(e,"id",UUID.randomUUID());
        when(entregas.findByTareaIdAndEstudianteId(tareaId,alumno)).thenReturn(Optional.of(e));
        when(entregas.reservarReemplazo(e.getId(),0)).thenReturn(1);
        return e;
    }
    @Test void textoObligatorio()throws Exception{
        tarea.editar("T","C",now.plusSeconds(1),Tarea.TipoEntrega.TEXTO);
        mvc.perform(multipart(base).param("version","-1").param("texto","Respuesta").header("Authorization",jwt()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("ENTREGADA"))
            .andExpect(header().string("Cache-Control","no-store"));
        mvc.perform(multipart(base).param("version","-1").param("texto","  ").header("Authorization",jwt())).andExpect(status().isBadRequest());
        verifyNoInteractions(storage);
    }
    @Test void archivoObligatorioYPrivado()throws Exception{
        tarea.editar("T","C",now.plusSeconds(1),Tarea.TipoEntrega.ARCHIVO);
        mvc.perform(multipart(base).file(pdf()).param("version","-1").header("Authorization",jwt()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.archivo.nombreOriginal").value("respuesta.pdf"))
            .andExpect(jsonPath("$.archivo.objectKey").doesNotExist());
        mvc.perform(multipart(base).param("version","-1").param("texto","Solo texto").header("Authorization",jwt())).andExpect(status().isBadRequest());
        verify(storage).subir(startsWith("entregas/"+tareaId+"/"+alumno+"/"),any(),eq("application/pdf"));
    }
    @Test void ambosPermiteTextoArchivoOCadaUno()throws Exception{
        mvc.perform(multipart(base).param("version","-1").param("texto","Texto").header("Authorization",jwt())).andExpect(status().isOk());
        mvc.perform(multipart(base).file(pdf()).param("version","-1").header("Authorization",jwt())).andExpect(status().isOk());
        mvc.perform(multipart(base).file(pdf()).param("version","-1").param("texto","Texto").header("Authorization",jwt())).andExpect(status().isOk());
        mvc.perform(multipart(base).param("version","-1").header("Authorization",jwt())).andExpect(status().isBadRequest());
    }
    @Test void invalidoVacioYExceso()throws Exception{
        for(MockMultipartFile file:List.of(new MockMultipartFile("archivo","x.pdf","application/pdf",new byte[0]),
                new MockMultipartFile("archivo","x.pdf","application/pdf","not pdf".getBytes()))){
            mvc.perform(multipart(base).file(file).param("version","-1").header("Authorization",jwt())).andExpect(status().isBadRequest());
        }
        mvc.perform(multipart(base).file(new MockMultipartFile("archivo","x.pdf","application/pdf",new byte[10485761]))
            .param("version","-1").header("Authorization",jwt())).andExpect(status().isPayloadTooLarge());
        mvc.perform(multipart(base).param("version","-1").param("texto","x".repeat(20001)).header("Authorization",jwt())).andExpect(status().isBadRequest());
        verifyNoInteractions(storage);
    }
    @Test void sinMatriculaYPedidosCaido()throws Exception{
        when(matriculas.habilitada(curso,alumno)).thenReturn(false);
        mvc.perform(multipart(base).param("version","-1").param("texto","T").header("Authorization",jwt())).andExpect(status().isForbidden());
        when(matriculas.habilitada(curso,alumno)).thenThrow(new MatriculaClient.NoDisponibleException());
        mvc.perform(get(base).header("Authorization",jwt())).andExpect(status().isServiceUnavailable());
        verifyNoInteractions(storage,tareas);
    }
    @Test void rolesNoAlumnoYJwtInvalido()throws Exception{
        for(String role:List.of("DOCENTE","ADMIN","SERVICE")){
            mvc.perform(multipart(base).param("version","-1").param("texto","T").header("Authorization",TareaHttpTest.jwt(alumno,role,60)))
                .andExpect(status().isForbidden());
            mvc.perform(get(base).header("Authorization",TareaHttpTest.jwt(alumno,role,60))).andExpect(status().isForbidden());
        }
        mvc.perform(get(base).header("Authorization","Bearer invalid")).andExpect(status().isUnauthorized());
        mvc.perform(get(base)).andExpect(status().isUnauthorized());
    }
    @Test void limiteExactoPermitidoPosteriorRechazado()throws Exception{
        tarea.editar("T","C",now,Tarea.TipoEntrega.TEXTO);
        mvc.perform(multipart(base).param("version","-1").param("texto","T").header("Authorization",jwt())).andExpect(status().isOk());
        tarea.editar("T","C",now.minusNanos(1),Tarea.TipoEntrega.TEXTO);
        mvc.perform(multipart(base).param("version","-1").param("texto","T").header("Authorization",jwt())).andExpect(status().isConflict());
    }
    @Test void reemplazoVersionYCalificada()throws Exception{
        Entrega e=existente();
        mvc.perform(multipart(base).param("version","0").param("texto","Nueva").header("Authorization",jwt())).andExpect(status().isOk());
        mvc.perform(multipart(base).param("version","-1").param("texto","Nueva").header("Authorization",jwt())).andExpect(status().isConflict());
        ReflectionTestUtils.setField(e,"estado",Entrega.Estado.CALIFICADA);
        mvc.perform(multipart(base).param("version","0").param("texto","Nueva").header("Authorization",jwt())).andExpect(status().isConflict());
    }
    @Test void propiedadNoConfiaEnIdsDelCliente()throws Exception{
        existente();
        mvc.perform(get(base).param("estudianteId",otro.toString()).header("Authorization",jwt())).andExpect(status().isOk());
        mvc.perform(get(base).param("estudianteId",alumno.toString()).header("Authorization",TareaHttpTest.jwt(otro,"ESTUDIANTE",60))).andExpect(status().isNotFound());
        mvc.perform(get(base+"/archivo/descarga").param("estudianteId",alumno.toString()).header("Authorization",TareaHttpTest.jwt(otro,"ESTUDIANTE",60))).andExpect(status().isNotFound());
        mvc.perform(multipart(base).param("version","-1").param("texto","T").param("estudianteId",alumno.toString())
                .header("Authorization",TareaHttpTest.jwt(otro,"ESTUDIANTE",60))).andExpect(status().isOk());
        verify(entregas).saveAndFlush(argThat(e->otro.equals(e.getEstudianteId())));
    }
    @Test void descargaPropiaUsaUrlBreve()throws Exception{
        Entrega e=existente();
        EntregaArchivo a=new EntregaArchivo(e.getId(),"private/test.pdf",new ValidadorArchivo.Resultado(Material.Tipo.PDF,"application/pdf","test.pdf"),100);
        when(archivos.findByEntregaId(e.getId())).thenReturn(Optional.of(a));
        when(storage.urlFirmada("private/test.pdf",Duration.ofSeconds(60),"test.pdf")).thenReturn("https://storage.invalid/signed");
        mvc.perform(get(base+"/archivo/descarga").header("Authorization",jwt())).andExpect(status().isOk())
            .andExpect(header().string("Cache-Control","no-store")).andExpect(jsonPath("$.url").value("https://storage.invalid/signed"));
    }
    @Test void tareaYModuloAjenos()throws Exception{
        when(tareas.bloquear(tareaId,modulo)).thenReturn(Optional.empty());
        mvc.perform(get(base).header("Authorization",jwt())).andExpect(status().isNotFound());
        when(modulos.findByIdAndCursoId(modulo,curso)).thenReturn(Optional.empty());
        mvc.perform(multipart(base).param("version","-1").param("texto","T").header("Authorization",jwt())).andExpect(status().isNotFound());
    }
    @Test void storageFallaCompensaSinEntregar()throws Exception{
        doThrow(new AlmacenamientoArchivos.NoDisponibleException("simulated")).when(storage).subir(anyString(),any(),anyString());
        mvc.perform(multipart(base).file(pdf()).param("version","-1").header("Authorization",jwt())).andExpect(status().isServiceUnavailable());
        verify(storage).eliminar(anyString());verify(entregas,never()).saveAndFlush(any());
    }
    @Test void falloSqlTrasSubirCompensaObjeto()throws Exception{
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("simulated")).when(entregas).saveAndFlush(any());
        mvc.perform(multipart(base).file(pdf()).param("version","-1").header("Authorization",jwt())).andExpect(status().isServiceUnavailable());
        verify(storage).eliminar(anyString());
    }
    @Test void falloSqlAmbiguoNoBorraObjetoReferenciado()throws Exception{
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("simulated")).when(entregas).saveAndFlush(any());
        when(archivos.existsByObjectKey(anyString())).thenReturn(true);
        mvc.perform(multipart(base).file(pdf()).param("version","-1").header("Authorization",jwt())).andExpect(status().isServiceUnavailable());
        verify(storage,never()).eliminar(anyString());
    }
    @Test void caidaSqlDuranteRecuperacionConservaObjeto()throws Exception{
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("simulated")).when(entregas).saveAndFlush(any());
        when(archivos.existsByObjectKey(anyString())).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("offline"));
        mvc.perform(multipart(base).file(pdf()).param("version","-1").header("Authorization",jwt())).andExpect(status().isServiceUnavailable());
        verify(storage,never()).eliminar(anyString());
    }
    @Test void pendienteNoApareceEnviadaYVersionObligatoria()throws Exception{
        Entrega e=existente();ReflectionTestUtils.setField(e,"estado",Entrega.Estado.ENVIO_PENDIENTE);
        mvc.perform(get(base).header("Authorization",jwt())).andExpect(status().isConflict());
        mvc.perform(multipart(base).param("texto","T").header("Authorization",jwt())).andExpect(status().isBadRequest());
    }
}
