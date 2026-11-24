package com.cursos.aula;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ValidadorArchivoTest {

    private static final String DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    private static final String PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    @Test
    void aceptaLosCuatroFormatosConMimeCanonico() {
        assertThat(ValidadorArchivo.validar("guia.pdf", "application/pdf", ArchivosPrueba.pdf()).tipo()).isEqualTo(Material.Tipo.PDF);
        assertThat(ValidadorArchivo.validar("tema.docx", DOCX_MIME, ArchivosPrueba.docx()).mimeType()).isEqualTo(DOCX_MIME);
        assertThat(ValidadorArchivo.validar("clase.pptx", PPTX_MIME, ArchivosPrueba.pptx()).tipo()).isEqualTo(Material.Tipo.PPTX);
        var zip = ValidadorArchivo.validar("codigo.ZIP", "application/x-zip-compressed", ArchivosPrueba.zipSimple());
        assertThat(zip.tipo()).isEqualTo(Material.Tipo.ZIP);
        assertThat(zip.mimeType()).isEqualTo("application/zip");
    }

    @Test
    void extensionNoPermitidaSeRechaza() {
        assertThatThrownBy(() -> ValidadorArchivo.validar("virus.exe", "application/octet-stream", ArchivosPrueba.pdf()))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
        assertThatThrownBy(() -> ValidadorArchivo.validar("sin-extension", "application/pdf", ArchivosPrueba.pdf()))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
    }

    @Test
    void mimeDeclaradoIncoherenteSeRechaza() {
        assertThatThrownBy(() -> ValidadorArchivo.validar("guia.pdf", "image/png", ArchivosPrueba.pdf()))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
        assertThatThrownBy(() -> ValidadorArchivo.validar("tema.docx", "application/pdf", ArchivosPrueba.docx()))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
    }

    @Test
    void contenidoQueNoCorrespondeALaExtensionSeRechaza() {
        byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);
        assertThatThrownBy(() -> ValidadorArchivo.validar("guia.pdf", "application/pdf", html))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
        assertThatThrownBy(() -> ValidadorArchivo.validar("tema.docx", DOCX_MIME, ArchivosPrueba.pdf()))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
        // ZIP valido pero sin estructura de Word/PowerPoint
        assertThatThrownBy(() -> ValidadorArchivo.validar("tema.docx", DOCX_MIME, ArchivosPrueba.zipSimple()))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
        assertThatThrownBy(() -> ValidadorArchivo.validar("clase.pptx", PPTX_MIME, ArchivosPrueba.docx()))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
        // Cabecera ZIP con contenido corrupto
        byte[] corrupto = new byte[]{'P', 'K', 3, 4, 1, 2, 3, 4, 5};
        assertThatThrownBy(() -> ValidadorArchivo.validar("codigo.zip", "application/zip", corrupto))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
    }

    @Test
    void documentoConMacrosSeRechaza() {
        byte[] conMacro = ArchivosPrueba.zip("[Content_Types].xml", "word/document.xml", "word/vbaProject.bin");
        assertThatThrownBy(() -> ValidadorArchivo.validar("tema.docx", DOCX_MIME, conMacro))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
    }

    @Test
    void limiteDeTamanoDe10MiB() {
        assertThat(ValidadorArchivo.MAX_BYTES).isEqualTo(10_485_760L);
        assertThat(ValidadorArchivo.validar("limite.pdf", "application/pdf",
                ArchivosPrueba.pdfDeTamano(10_485_760)).tipo()).isEqualTo(Material.Tipo.PDF);
        assertThatThrownBy(() -> ValidadorArchivo.validar("grande.pdf", "application/pdf",
                ArchivosPrueba.pdfDeTamano(10_485_761)))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
        assertThatThrownBy(() -> ValidadorArchivo.validar("vacio.pdf", "application/pdf", new byte[0]))
                .isInstanceOf(ValidadorArchivo.ArchivoInvalidoException.class);
    }

    @Test
    void nombreSeSaneaSinRutas() {
        assertThat(ValidadorArchivo.validar("..\\..\\C:\\temp\\guia.pdf", "application/pdf", ArchivosPrueba.pdf()).nombreSeguro())
                .isEqualTo("guia.pdf");
        assertThat(ValidadorArchivo.validar("../../etc/re\"porte<1>.pdf", null, ArchivosPrueba.pdf()).nombreSeguro())
                .isEqualTo("re_porte_1_.pdf");
        assertThat(ValidadorArchivo.validar("a".repeat(300) + ".pdf", "application/pdf", ArchivosPrueba.pdf()).nombreSeguro())
                .hasSize(255).endsWith(".pdf");
    }
}
