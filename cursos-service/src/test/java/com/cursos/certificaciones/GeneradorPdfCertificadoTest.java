package com.cursos.certificaciones;

import com.cursos.aula.Material;
import com.cursos.aula.ValidadorArchivo;
import org.junit.jupiter.api.Test;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class GeneradorPdfCertificadoTest {

    private static final GeneradorPdfCertificado.Datos DATOS = new GeneradorPdfCertificado.Datos("DWI-AB12-CD34-EF56",
            "Ana María (Pérez) Gómez", "Desarrollo Web \\ Integrado", Instant.parse("2026-11-09T04:30:00Z"),
            "a".repeat(64), "http://localhost:4200/verificar-certificado?codigo=DWI-AB12-CD34-EF56");

    @Test
    void pdfValidoConXrefCorrectoYAceptadoPorElValidadorDeLaPlataforma() {
        byte[] pdf = GeneradorPdfCertificado.generar(DATOS);
        String s = new String(pdf, StandardCharsets.ISO_8859_1);
        assertThat(s).startsWith("%PDF-1.4").endsWith("%%EOF\n");
        // startxref apunta a la tabla xref y cada offset apunta a "n 0 obj".
        Matcher m = Pattern.compile("startxref\\n(\\d+)").matcher(s);
        assertThat(m.find()).isTrue();
        int xref = Integer.parseInt(m.group(1));
        assertThat(s.substring(xref)).startsWith("xref\n0 8\n");
        Matcher off = Pattern.compile("(\\d{10}) 00000 n ").matcher(s.substring(xref));
        int n = 0;
        while (off.find()) {
            n++;
            assertThat(s.substring(Integer.parseInt(off.group(1)))).startsWith(n + " 0 obj\n");
        }
        assertThat(n).isEqualTo(7);
        // Longitud del stream declarada == real.
        Matcher len = Pattern.compile("/Length (\\d+) >>\\nstream\\n").matcher(s);
        assertThat(len.find()).isTrue();
        int inicio = len.end();
        assertThat(s.indexOf("\nendstream", inicio) - inicio).isEqualTo(Integer.parseInt(len.group(1)));
        assertThat(ValidadorArchivo.validar("certificado.pdf", "application/pdf", pdf).tipo()).isEqualTo(Material.Tipo.PDF);
    }

    @Test
    void contenidoConAcentosEscapadoYDatosDelCertificado() {
        String s = new String(GeneradorPdfCertificado.generar(DATOS), Charset.forName("windows-1252"));
        assertThat(s).contains("CERTIFICADO ACADÉMICO").contains("Ana María \\(Pérez\\) Gómez")
                .contains("Desarrollo Web \\\\ Integrado").contains("DWI-AB12-CD34-EF56")
                .contains("Fecha de emisión: 08/11/2026 \\(hora de Lima\\)") // 04:30Z = 23:30 del dia anterior en Lima
                .contains("verificar-certificado?codigo=DWI-AB12-CD34-EF56");
    }

    @Test
    void deterministaYSinCaracteresNoRepresentables() {
        assertThat(GeneradorPdfCertificado.generar(DATOS)).isEqualTo(GeneradorPdfCertificado.generar(DATOS));
        assertThat(GeneradorPdfCertificado.normalizar("Zoë 漢字\u0007")).isEqualTo("Zoë ??");
    }

    @Test
    void codigoAleatorioConFormatoVerificableYNombreEnmascarado() {
        for (int i = 0; i < 200; i++) {
            assertThat(CertificadoService.nuevoCodigo()).matches("DWI-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}");
        }
        assertThat(CertificadoService.enmascarar("Ana María Pérez Gómez")).isEqualTo("Ana M. P. G.");
        assertThat(CertificadoService.enmascarar("  ")).isEmpty();
    }
}
