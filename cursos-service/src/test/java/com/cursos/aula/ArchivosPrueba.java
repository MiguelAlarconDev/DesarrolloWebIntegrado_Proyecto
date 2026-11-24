package com.cursos.aula;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** Archivos minimos generados en memoria para pruebas (sin datos reales). */
final class ArchivosPrueba {
    private ArchivosPrueba() {}

    static byte[] pdf() {
        return "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF".getBytes(StandardCharsets.US_ASCII);
    }

    static byte[] docx() {
        return zip("[Content_Types].xml", "word/document.xml");
    }

    static byte[] pptx() {
        return zip("[Content_Types].xml", "ppt/presentation.xml");
    }

    static byte[] zipSimple() {
        return zip("leeme.txt");
    }

    static byte[] zip(String... entradas) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream(); ZipOutputStream z = new ZipOutputStream(out)) {
            for (String e : entradas) {
                z.putNextEntry(new ZipEntry(e));
                z.write("contenido".getBytes(StandardCharsets.UTF_8));
                z.closeEntry();
            }
            z.finish();
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException(ex);
        }
    }

    /** PDF valido de exactamente n bytes. */
    static byte[] pdfDeTamano(int n) {
        byte[] b = new byte[n];
        byte[] cabecera = pdf();
        System.arraycopy(cabecera, 0, b, 0, Math.min(cabecera.length, n));
        return b;
    }
}
