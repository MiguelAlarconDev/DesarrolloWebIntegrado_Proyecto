package com.cursos.aula;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/** Contrato HTTP con Supabase Storage, simulado (sin red ni credenciales reales). */
class SupabaseStorageClientTest {

    private static final String BASE = "http://storage.invalid";
    private static final String KEY = "clave-ficticia-de-prueba";
    private static final String OBJ = "cursos/c1/modulos/m1/0b1c.pdf";
    private MockRestServiceServer server;

    private SupabaseStorageClient client(String key) {
        RestClient.Builder b = RestClient.builder();
        server = MockRestServiceServer.bindTo(b).build();
        return new SupabaseStorageClient(b.build(), BASE + "/", key, "aula-materiales");
    }

    @Test
    void subeAlBucketPrivadoSinSobrescribir() {
        SupabaseStorageClient c = client(KEY);
        server.expect(requestTo(BASE + "/storage/v1/object/aula-materiales/" + OBJ))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer " + KEY))
                .andExpect(header("apikey", KEY))
                .andExpect(header("x-upsert", "false"))
                .andExpect(content().contentType("application/pdf"))
                .andRespond(withSuccess("{\"Key\":\"x\"}", MediaType.APPLICATION_JSON));
        c.subir(OBJ, ArchivosPrueba.pdf(), "application/pdf");
        server.verify();
    }

    @Test
    void firmaDescargaDe60SegundosYDevuelveUrlAbsoluta() {
        SupabaseStorageClient c = client(KEY);
        server.expect(requestTo(BASE + "/storage/v1/object/sign/aula-materiales/" + OBJ))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.expiresIn").value(60))
                .andRespond(withSuccess("{\"signedURL\":\"/object/sign/aula-materiales/" + OBJ + "?token=abc\"}",
                        MediaType.APPLICATION_JSON));
        String url = c.urlFirmada(OBJ, Duration.ofSeconds(60), "Guía semana 1.pdf");
        assertThat(url).startsWith(BASE + "/storage/v1/object/sign/aula-materiales/" + OBJ + "?token=abc&download=");
        assertThat(url).doesNotContain(" ");
        server.verify();
    }

    @Test
    void eliminarEsIdempotenteAnte404() {
        SupabaseStorageClient c = client(KEY);
        server.expect(requestTo(BASE + "/storage/v1/object/aula-materiales/" + OBJ))
                .andExpect(method(HttpMethod.DELETE))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));
        c.eliminar(OBJ);
        server.verify();
    }

    @Test
    void caidaDeStorageEsNoDisponible() {
        SupabaseStorageClient c = client(KEY);
        server.expect(requestTo(BASE + "/storage/v1/object/aula-materiales/" + OBJ)).andRespond(withServerError());
        assertThatThrownBy(() -> c.subir(OBJ, ArchivosPrueba.pdf(), "application/pdf"))
                .isInstanceOf(AlmacenamientoArchivos.NoDisponibleException.class);
        server.reset();
        server.expect(requestTo(BASE + "/storage/v1/object/aula-materiales/" + OBJ)).andRespond(withServerError());
        assertThatThrownBy(() -> c.eliminar(OBJ)).isInstanceOf(AlmacenamientoArchivos.NoDisponibleException.class);
        server.reset();
        server.expect(requestTo(BASE + "/storage/v1/object/sign/aula-materiales/" + OBJ))
                .andRespond(withSuccess("{\"error\":\"x\"}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> c.urlFirmada(OBJ, Duration.ofSeconds(60), "a.pdf"))
                .isInstanceOf(AlmacenamientoArchivos.NoDisponibleException.class);
    }

    @Test
    void sinConfiguracionNoSeLlamaAlProveedor() {
        SupabaseStorageClient c = client("");
        assertThat(c.isConfigurado()).isFalse();
        assertThatThrownBy(() -> c.subir(OBJ, ArchivosPrueba.pdf(), "application/pdf"))
                .isInstanceOf(AlmacenamientoArchivos.NoDisponibleException.class);
        assertThatThrownBy(() -> c.urlFirmada(OBJ, Duration.ofSeconds(60), "a.pdf"))
                .isInstanceOf(AlmacenamientoArchivos.NoDisponibleException.class);
        server.verify();
    }
}
