package com.cursos.aula;

import com.cursos.controller.ApiExceptionHandler;
import com.cursos.entity.Curso;
import com.cursos.repository.CursoRepository;
import com.cursos.security.JwtAuthFilter;
import com.cursos.security.JwtVerifier;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Subida, descarga y eliminacion de materiales con el filtro JWT real, Storage y Pedidos
 * simulados (sin red, sin Supabase, sin base de datos).
 */
class AulaMaterialesHttpTest {
    private static final String SECRET = "aula-only-test-key-not-a-real-secret-123456";
    private static final String URL_FIRMADA = "https://storage.invalid/storage/v1/object/sign/b/k?token=t";
    private final UUID cursoId = UUID.randomUUID(), docenteId = UUID.randomUUID(), alumnoId = UUID.randomUUID();
    private final UUID moduloId = UUID.randomUUID(), materialId = UUID.randomUUID();
    private final CursoRepository cursos = mock(CursoRepository.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
    private final ModuloRepository modulos = mock(ModuloRepository.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
    private final MaterialRepository materiales = mock(MaterialRepository.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
    private final AlmacenamientoArchivos storage = mock(AlmacenamientoArchivos.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
    private final MatriculaClient matriculas = mock(MatriculaClient.class, withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
    private MockMvc mvc;
    private String base;
    private Material activo;

    @BeforeEach
    void setup() {
        Curso curso = new Curso();
        curso.setDocenteId(docenteId);
        when(cursos.findById(cursoId)).thenReturn(Optional.of(curso));
        when(modulos.findByIdAndCursoId(moduloId, cursoId)).thenReturn(Optional.of(new Modulo(cursoId, "Semana 1", 1)));
        when(storage.isConfigurado()).thenReturn(true);
        when(materiales.saveAndFlush(any())).thenAnswer(inv -> {
            Material m = inv.getArgument(0);
            if (m.getId() == null) ReflectionTestUtils.setField(m, "id", materialId);
            return m;
        });
        activo = new Material(moduloId, "Guia", "cursos/x/modulos/y/obj.pdf", "guia.pdf", "application/pdf", 10,
                Material.Tipo.PDF, docenteId);
        ReflectionTestUtils.setField(activo, "id", materialId);
        activo.activar();
        when(materiales.findByIdAndModuloId(materialId, moduloId)).thenReturn(Optional.of(activo));
        when(storage.urlFirmada(anyString(), any(), anyString())).thenReturn(URL_FIRMADA);

        AulaService service = new AulaService(cursos, modulos, materiales, matriculas, storage);
        mvc = MockMvcBuilders.standaloneSetup(new AulaController(service))
                .setControllerAdvice(new ApiExceptionHandler())
                .addFilters(new JwtAuthFilter(new JwtVerifier(new ObjectMapper(), SECRET, "cursos-service"))).build();
        base = "/api/cursos/" + cursoId + "/aula/modulos/" + moduloId + "/materiales";
    }

    private static MockMultipartFile archivo(String nombre, String tipo, byte[] datos) {
        return new MockMultipartFile("archivo", nombre, tipo, datos);
    }

    // ---------- Subida ----------

    @Test
    void subidaValidaQuedaActivaConClaveUuid() throws Exception {
        mvc.perform(multipart(base).file(archivo("guia.pdf", "application/pdf", ArchivosPrueba.pdf()))
                        .param("titulo", "Guia semana 1").header("Authorization", token(docenteId, "DOCENTE")))
                .andExpect(status().isCreated())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.id").value(materialId.toString()))
                .andExpect(jsonPath("$.tipo").value("PDF"))
                .andExpect(jsonPath("$.objectKey").doesNotExist());
        var clave = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(storage).subir(clave.capture(), any(), eq("application/pdf"));
        assertThat(clave.getValue()).matches("cursos/" + cursoId + "/modulos/" + moduloId + "/[0-9a-f-]{36}\\.pdf");
        var guardado = org.mockito.ArgumentCaptor.forClass(Material.class);
        verify(materiales, times(2)).saveAndFlush(guardado.capture());
        assertThat(guardado.getValue().getEstado()).isEqualTo(Material.Estado.ACTIVO);
    }

    @Test
    void contenidoOExtensionInvalidosNoTocanStorageNiBd() throws Exception {
        String jwt = token(docenteId, "DOCENTE");
        mvc.perform(multipart(base).file(archivo("guia.pdf", "application/pdf", "<html>".getBytes(StandardCharsets.UTF_8)))
                .header("Authorization", jwt)).andExpect(status().isBadRequest());
        mvc.perform(multipart(base).file(archivo("script.exe", "application/octet-stream", ArchivosPrueba.pdf()))
                .header("Authorization", jwt)).andExpect(status().isBadRequest());
        mvc.perform(multipart(base).file(archivo("guia.pdf", "image/png", ArchivosPrueba.pdf()))
                .header("Authorization", jwt)).andExpect(status().isBadRequest());
        verify(storage, never()).subir(any(), any(), any());
        verify(materiales, never()).saveAndFlush(any());
    }

    @Test
    void archivoMayorA10MiBSeRechaza() throws Exception {
        mvc.perform(multipart(base).file(archivo("grande.pdf", "application/pdf", ArchivosPrueba.pdfDeTamano(10_485_761)))
                .header("Authorization", token(docenteId, "DOCENTE"))).andExpect(status().isBadRequest());
        verify(storage, never()).subir(any(), any(), any());
    }

    @Test
    void sinCampoArchivoEs400() throws Exception {
        mvc.perform(multipart(base).param("titulo", "x").header("Authorization", token(docenteId, "DOCENTE")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void docenteAjenoYEstudianteNoSuben() throws Exception {
        mvc.perform(multipart(base).file(archivo("guia.pdf", "application/pdf", ArchivosPrueba.pdf()))
                .header("Authorization", token(UUID.randomUUID(), "DOCENTE"))).andExpect(status().isForbidden());
        when(matriculas.habilitada(cursoId, alumnoId)).thenReturn(true);
        mvc.perform(multipart(base).file(archivo("guia.pdf", "application/pdf", ArchivosPrueba.pdf()))
                .header("Authorization", token(alumnoId, "ESTUDIANTE"))).andExpect(status().isForbidden());
        mvc.perform(multipart(base).file(archivo("guia.pdf", "application/pdf", ArchivosPrueba.pdf()))
                .header("Authorization", token(UUID.randomUUID(), "ADMIN"))).andExpect(status().isForbidden());
        verifyNoInteractions(storage);
        verify(materiales, never()).saveAndFlush(any());
    }

    @Test
    void anonimoNoSubeNiDescargaNiElimina() throws Exception {
        mvc.perform(multipart(base).file(archivo("guia.pdf", "application/pdf", ArchivosPrueba.pdf())))
                .andExpect(status().isUnauthorized()).andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get(base + "/" + materialId + "/descarga")).andExpect(status().isUnauthorized());
        mvc.perform(delete(base + "/" + materialId)).andExpect(status().isUnauthorized());
        verifyNoInteractions(storage, materiales, matriculas);
    }

    @Test
    void moduloDeOtroCursoEs404() throws Exception {
        UUID ajeno = UUID.randomUUID();
        when(modulos.findByIdAndCursoId(ajeno, cursoId)).thenReturn(Optional.empty());
        String otro = "/api/cursos/" + cursoId + "/aula/modulos/" + ajeno + "/materiales";
        mvc.perform(multipart(otro).file(archivo("guia.pdf", "application/pdf", ArchivosPrueba.pdf()))
                .header("Authorization", token(docenteId, "DOCENTE"))).andExpect(status().isNotFound());
        mvc.perform(get(otro + "/" + materialId + "/descarga").header("Authorization", token(docenteId, "DOCENTE")))
                .andExpect(status().isNotFound());
        verifyNoInteractions(storage);
    }

    @Test
    void caidaDeStorageEnSubidaCompensaElRegistro() throws Exception {
        doThrow(new AlmacenamientoArchivos.NoDisponibleException("caido")).when(storage).subir(any(), any(), any());
        mvc.perform(multipart(base).file(archivo("guia.pdf", "application/pdf", ArchivosPrueba.pdf()))
                .header("Authorization", token(docenteId, "DOCENTE"))).andExpect(status().isServiceUnavailable());
        verify(materiales).delete(argThat(m -> m.getEstado() == Material.Estado.PENDIENTE));
    }

    @Test
    void falloAlActivarEliminaObjetoYRegistro() throws Exception {
        doAnswer(inv -> {
            Material m = inv.getArgument(0);
            ReflectionTestUtils.setField(m, "id", materialId);
            return m;
        }).doThrow(new RuntimeException("bd caida")).when(materiales).saveAndFlush(any());
        mvc.perform(multipart(base).file(archivo("guia.pdf", "application/pdf", ArchivosPrueba.pdf()))
                .header("Authorization", token(docenteId, "DOCENTE"))).andExpect(status().isServiceUnavailable());
        verify(storage).eliminar(argThat(k -> k.startsWith("cursos/" + cursoId)));
        verify(materiales).delete(any());
    }

    @Test
    void storageSinConfigurarEs503SinRegistrar() throws Exception {
        when(storage.isConfigurado()).thenReturn(false);
        mvc.perform(multipart(base).file(archivo("guia.pdf", "application/pdf", ArchivosPrueba.pdf()))
                .header("Authorization", token(docenteId, "DOCENTE"))).andExpect(status().isServiceUnavailable());
        verify(materiales, never()).saveAndFlush(any());
    }

    // ---------- Descarga ----------

    @Test
    void docenteYAlumnoPagadoObtienenUrlFirmadaDe60s() throws Exception {
        mvc.perform(get(base + "/" + materialId + "/descarga").header("Authorization", token(docenteId, "DOCENTE")))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.url").value(URL_FIRMADA))
                .andExpect(jsonPath("$.nombreArchivo").value("guia.pdf"));
        when(matriculas.habilitada(cursoId, alumnoId)).thenReturn(true);
        mvc.perform(get(base + "/" + materialId + "/descarga").header("Authorization", token(alumnoId, "ESTUDIANTE")))
                .andExpect(status().isOk());
        verify(storage, times(2)).urlFirmada(eq("cursos/x/modulos/y/obj.pdf"), eq(Duration.ofSeconds(60)), eq("guia.pdf"));
    }

    @Test
    void alumnoSinMatriculaDocenteAjenoYAdminNoDescargan() throws Exception {
        when(matriculas.habilitada(cursoId, alumnoId)).thenReturn(false);
        mvc.perform(get(base + "/" + materialId + "/descarga").header("Authorization", token(alumnoId, "ESTUDIANTE")))
                .andExpect(status().isForbidden());
        mvc.perform(get(base + "/" + materialId + "/descarga").header("Authorization", token(UUID.randomUUID(), "DOCENTE")))
                .andExpect(status().isForbidden());
        mvc.perform(get(base + "/" + materialId + "/descarga").header("Authorization", token(UUID.randomUUID(), "ADMIN")))
                .andExpect(status().isForbidden());
        verify(storage, never()).urlFirmada(any(), any(), any());
    }

    @Test
    void caidaDePedidosEs503SinUrl() throws Exception {
        when(matriculas.habilitada(cursoId, alumnoId)).thenThrow(new MatriculaClient.NoDisponibleException());
        mvc.perform(get(base + "/" + materialId + "/descarga").header("Authorization", token(alumnoId, "ESTUDIANTE")))
                .andExpect(status().isServiceUnavailable());
        verify(storage, never()).urlFirmada(any(), any(), any());
    }

    @Test
    void caidaDeStorageEnDescargaEs503() throws Exception {
        when(storage.urlFirmada(anyString(), any(), anyString())).thenThrow(new AlmacenamientoArchivos.NoDisponibleException("x"));
        mvc.perform(get(base + "/" + materialId + "/descarga").header("Authorization", token(docenteId, "DOCENTE")))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void materialDeOtroModuloOPendienteNoSeDescarga() throws Exception {
        UUID otroMaterial = UUID.randomUUID();
        when(materiales.findByIdAndModuloId(otroMaterial, moduloId)).thenReturn(Optional.empty());
        mvc.perform(get(base + "/" + otroMaterial + "/descarga").header("Authorization", token(docenteId, "DOCENTE")))
                .andExpect(status().isNotFound());
        Material pendiente = new Material(moduloId, "P", "k", "p.pdf", "application/pdf", 1, Material.Tipo.PDF, docenteId);
        UUID pendienteId = UUID.randomUUID();
        when(materiales.findByIdAndModuloId(pendienteId, moduloId)).thenReturn(Optional.of(pendiente));
        mvc.perform(get(base + "/" + pendienteId + "/descarga").header("Authorization", token(docenteId, "DOCENTE")))
                .andExpect(status().isNotFound());
        verify(storage, never()).urlFirmada(any(), any(), any());
    }

    // ---------- Eliminacion ----------

    @Test
    void eliminacionAutorizadaBorraObjetoYRegistro() throws Exception {
        mvc.perform(delete(base + "/" + materialId).header("Authorization", token(docenteId, "DOCENTE")))
                .andExpect(status().isNoContent()).andExpect(header().string("Cache-Control", "no-store"));
        var orden = inOrder(materiales, storage);
        orden.verify(materiales).saveAndFlush(argThat(m -> m.getEstado() == Material.Estado.ELIMINACION_PENDIENTE));
        orden.verify(storage).eliminar("cursos/x/modulos/y/obj.pdf");
        orden.verify(materiales).delete(activo);
    }

    @Test
    void caidaDeStorageAlEliminarDejaMaterialOcultoYReintentable() throws Exception {
        doThrow(new AlmacenamientoArchivos.NoDisponibleException("caido")).when(storage).eliminar(any());
        mvc.perform(delete(base + "/" + materialId).header("Authorization", token(docenteId, "DOCENTE")))
                .andExpect(status().isServiceUnavailable());
        assertThat(activo.getEstado()).isEqualTo(Material.Estado.ELIMINACION_PENDIENTE);
        verify(materiales, never()).delete(any());
        // Reintento: Storage vuelve; no se vuelve a marcar, se borra.
        doNothing().when(storage).eliminar(any());
        mvc.perform(delete(base + "/" + materialId).header("Authorization", token(docenteId, "DOCENTE")))
                .andExpect(status().isNoContent());
        verify(materiales).delete(activo);
    }

    @Test
    void docenteAjenoYEstudianteNoEliminan() throws Exception {
        mvc.perform(delete(base + "/" + materialId).header("Authorization", token(UUID.randomUUID(), "DOCENTE")))
                .andExpect(status().isForbidden());
        mvc.perform(delete(base + "/" + materialId).header("Authorization", token(alumnoId, "ESTUDIANTE")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(storage);
        verify(materiales, never()).delete(any());
    }

    private String token(UUID sub, String rol) throws Exception {
        Base64.Encoder enc = Base64.getUrlEncoder().withoutPadding();
        String h = enc.encodeToString("{\"alg\":\"HS256\"}".getBytes(StandardCharsets.UTF_8));
        String p = enc.encodeToString(new ObjectMapper().writeValueAsBytes(Map.of("sub", sub.toString(), "rol", rol,
                "exp", Instant.now().plusSeconds(60).getEpochSecond())));
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "Bearer " + h + "." + p + "." + enc.encodeToString(mac.doFinal((h + "." + p).getBytes(StandardCharsets.UTF_8)));
    }
}
