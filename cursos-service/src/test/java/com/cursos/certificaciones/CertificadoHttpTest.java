package com.cursos.certificaciones;

import com.cursos.aula.AlmacenamientoArchivos;
import com.cursos.controller.ApiExceptionHandler;
import com.cursos.security.AuthPrincipal;
import com.cursos.security.JwtAuthFilter;
import com.cursos.security.JwtVerifier;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Permisos de certificados con el filtro JWT real (sin BD ni Storage reales). */
class CertificadoHttpTest {
    private static final String BASE = "/api/cursos/certificados";
    private final UUID admin = UUID.randomUUID(), alumno = UUID.randomUUID(), otro = UUID.randomUUID(), docente = UUID.randomUUID();
    private final CertificadoService service = mock(CertificadoService.class, withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        when(service.mios(any())).thenReturn(List.of());
        when(service.verificar(anyString())).thenReturn(new CertificadoService.Verificacion("DWI-AAAA-BBBB-CCCC", true, "VALIDO",
                "Ana M.", "Curso", Instant.now(), "a".repeat(64)));
        mvc = MockMvcBuilders.standaloneSetup(new CertificadoController(service))
                .setControllerAdvice(new ApiExceptionHandler())
                .addFilters(new JwtAuthFilter(new JwtVerifier(new ObjectMapper(), RecomendacionHttpTest.SECRET, "cursos-service"))).build();
    }

    private String jwt(UUID sub, String rol) throws Exception { return RecomendacionHttpTest.jwt(sub, rol, 60); }

    @Test
    void anonimoNoAccedeANadaPrivado() throws Exception {
        for (String p : List.of(BASE + "/mios", BASE + "/admin", BASE + "/admin/aprobados", BASE + "/" + UUID.randomUUID() + "/descarga"))
            mvc.perform(get(p)).andExpect(status().isUnauthorized()).andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(post(BASE + "/admin/emisiones").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void soloAdminAdministraCertificados() throws Exception {
        String body = "{\"cursoId\":\"" + UUID.randomUUID() + "\",\"estudianteId\":\"" + alumno + "\"}";
        for (String rol : List.of("ESTUDIANTE", "DOCENTE", "SERVICE")) {
            mvc.perform(get(BASE + "/admin/aprobados").header("Authorization", jwt(UUID.randomUUID(), rol))).andExpect(status().isForbidden());
            mvc.perform(post(BASE + "/admin/emisiones").header("Authorization", jwt(UUID.randomUUID(), rol))
                    .header("Idempotency-Key", UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isForbidden());
        }
        verify(service, never()).emitir(any(), any(), any(), any());
        mvc.perform(get(BASE + "/admin/aprobados").header("Authorization", jwt(admin, "ADMIN"))).andExpect(status().isOk());
    }

    @Test
    void emisionExigeIdempotencyKeyYCuerpoValido() throws Exception {
        mvc.perform(post(BASE + "/admin/emisiones").header("Authorization", jwt(admin, "ADMIN")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"cursoId\":\"" + UUID.randomUUID() + "\",\"estudianteId\":\"" + alumno + "\"}")).andExpect(status().isBadRequest());
        mvc.perform(post(BASE + "/admin/emisiones").header("Authorization", jwt(admin, "ADMIN")).header("Idempotency-Key", UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON).content("{\"cursoId\":\"" + UUID.randomUUID() + "\"}")).andExpect(status().isBadRequest());
        verify(service, never()).emitir(any(), any(), any(), any());
    }

    @Test
    void docenteNoVeCertificadosYAdminSigueSinAccesoAlAula() throws Exception {
        mvc.perform(get(BASE + "/mios").header("Authorization", jwt(docente, "DOCENTE"))).andExpect(status().isForbidden());
        mvc.perform(get(BASE + "/mios").header("Authorization", jwt(alumno, "ESTUDIANTE"))).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"));
        // El filtro del aula no concede nada al ADMIN.
        var aula = MockMvcBuilders.standaloneSetup(new CertificadoController(service))
                .addFilters(new JwtAuthFilter(new JwtVerifier(new ObjectMapper(), RecomendacionHttpTest.SECRET, "cursos-service"))).build();
        aula.perform(get("/api/cursos/" + UUID.randomUUID() + "/aula/aprobaciones/" + alumno).header("Authorization", jwt(admin, "ADMIN")))
                .andExpect(status().isForbidden());
    }

    @Test
    void verificacionEsPublicaYTokenFicticioSeRechaza() throws Exception {
        mvc.perform(get(BASE + "/verificacion/DWI-AAAA-BBBB-CCCC")).andExpect(status().isOk()).andExpect(jsonPath("$.valido").value(true));
        mvc.perform(get(BASE + "/mios").header("Authorization", "Bearer mock-jwt-token-estudiante")).andExpect(status().isUnauthorized());
    }

    // ---- Propiedad: servicio real con dependencias simuladas ----
    @Test
    void soloElPropietarioOAdminDescargan() {
        var repo = mock(CertificadoRepository.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
        var storage = mock(AlmacenamientoArchivos.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
        Certificado c = new Certificado("DWI-AAAA-BBBB-CCCC", UUID.randomUUID(), alumno, UUID.randomUUID(), UUID.randomUUID(), 3,
                "a".repeat(64), "Ana", "Curso", admin, UUID.randomUUID(), Instant.now(), "certificados/x.pdf", "b".repeat(64), 10);
        c.emitir(Instant.now());
        when(repo.findById(c.getId())).thenReturn(Optional.of(c));
        when(storage.urlFirmada(anyString(), any(), anyString())).thenReturn("https://storage.invalid/firmada");
        var real = new CertificadoService(null, repo, null, null, null, storage, null,
                mock(org.springframework.transaction.PlatformTransactionManager.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY)),
                "http://localhost:4200/verificar-certificado", java.time.Clock.systemUTC());
        assertThat(real.descargar(c.getId(), new AuthPrincipal(alumno.toString(), "ESTUDIANTE")).url()).startsWith("https://");
        assertThat(real.descargar(c.getId(), new AuthPrincipal(admin.toString(), "ADMIN")).nombreArchivo()).isEqualTo("certificado-DWI-AAAA-BBBB-CCCC.pdf");
        assertThatThrownBy(() -> real.descargar(c.getId(), new AuthPrincipal(otro.toString(), "ESTUDIANTE")))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
        assertThatThrownBy(() -> real.descargar(c.getId(), new AuthPrincipal(alumno.toString(), "DOCENTE")))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
        assertThatThrownBy(() -> real.mios(new AuthPrincipal(admin.toString(), "ADMIN"))).isInstanceOf(AuthPrincipal.ForbiddenException.class);
        verify(storage, times(2)).urlFirmada(eq("certificados/x.pdf"), any(), anyString());
    }
}
