package com.cursos.security;

import com.cursos.controller.CursoController;
import com.cursos.controller.ApiExceptionHandler;
import com.cursos.entity.Curso;
import com.cursos.entity.EstadoCurso;
import com.cursos.repository.CursoRepository;
import com.cursos.service.CursoService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CatalogoHttpTest {
    @Test void lecturasPublicasConservanRespuestaSinJwt() throws Exception {
        UUID id = UUID.randomUUID(), docente = UUID.randomUUID();
        Curso curso = new Curso(); curso.setId(id); curso.setDocenteId(docente); curso.setTitulo("Curso de prueba");
        CursoRepository repository = mock(CursoRepository.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
        when(repository.findByEstadoOrderByIdAsc(EstadoCurso.PUBLICADO)).thenReturn(List.of(curso));
        when(repository.findAllByOrderByIdAsc()).thenReturn(List.of(curso));
        when(repository.findByDocenteIdOrderByIdAsc(docente)).thenReturn(List.of(curso));
        when(repository.findById(id)).thenReturn(Optional.of(curso));
        var mvc = MockMvcBuilders.standaloneSetup(new CursoController(new CursoService(repository)))
                .setControllerAdvice(new ApiExceptionHandler())
                .addFilters(new JwtAuthFilter(new JwtVerifier(new ObjectMapper(),
                        "catalog-test-only-key-not-secret-123456789", "cursos-service"))).build();
        for (String path : List.of("/api/cursos", "/api/cursos/todos", "/api/cursos/docente/" + docente)) {
            mvc.perform(get(path)).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id.toString()))
                    .andExpect(jsonPath("$[0].titulo").value("Curso de prueba"));
        }
        mvc.perform(get("/api/cursos/" + id)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id.toString()));
        mvc.perform(get("/api/cursos/" + UUID.randomUUID())).andExpect(status().isNotFound());
    }
}
