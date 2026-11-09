package com.cursos.certificaciones;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Genera un PDF 1.4 de una pagina (A4 horizontal) con fuentes estandar Helvetica y codificacion
 * WinAnsi, sin dependencias externas. Determinista: los mismos datos producen los mismos bytes
 * (no incluye fecha de creacion del archivo), de modo que su SHA-256 es verificable.
 */
public final class GeneradorPdfCertificado {
    private static final Charset WIN_ANSI = Charset.forName("windows-1252");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.ROOT).withZone(ZoneId.of("America/Lima"));
    private static final double ANCHO = 842, ALTO = 595;

    private GeneradorPdfCertificado() {}

    public record Datos(String codigo, String estudiante, String curso, Instant fechaEmision, String evidenciaHash, String urlVerificacion) {}

    public static byte[] generar(Datos d) {
        StringBuilder c = new StringBuilder();
        // Marco
        c.append("0.18 0.79 0.5 RG 4 w 30 30 782 535 re S\n");
        c.append("0.85 0.85 0.85 RG 1 w 42 42 758 511 re S\n");
        texto(c, "F2", 30, 470, "CERTIFICADO ACAD\u00c9MICO");
        texto(c, "F1", 13, 435, "Plataforma de Gesti\u00f3n y Venta de Cursos - Desarrollo Web Integrado");
        texto(c, "F1", 15, 385, "Se certifica que");
        texto(c, "F2", 24, 350, d.estudiante());
        texto(c, "F1", 15, 315, "ha aprobado satisfactoriamente el curso");
        texto(c, "F2", 19, 282, d.curso());
        texto(c, "F1", 13, 235, "Fecha de emisi\u00f3n: " + FECHA.format(d.fechaEmision()) + " (hora de Lima)");
        texto(c, "F2", 14, 170, "C\u00f3digo de verificaci\u00f3n: " + d.codigo());
        texto(c, "F1", 10, 148, "Verifique la autenticidad en: " + d.urlVerificacion());
        texto(c, "F1", 8, 70, "Evidencia acad\u00e9mica SHA-256: " + d.evidenciaHash());
        texto(c, "F1", 8, 58, "Documento generado electr\u00f3nicamente. Su validez se confirma con el c\u00f3digo de verificaci\u00f3n.");
        byte[] contenido = c.toString().getBytes(WIN_ANSI);

        List<byte[]> objetos = new ArrayList<>();
        objetos.add(ascii("<< /Type /Catalog /Pages 2 0 R >>"));
        objetos.add(ascii("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
        objetos.add(ascii("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>"));
        objetos.add(ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
        objetos.add(ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        stream.writeBytes(ascii("<< /Length " + contenido.length + " >>\nstream\n"));
        stream.writeBytes(contenido);
        stream.writeBytes(ascii("\nendstream"));
        objetos.add(stream.toByteArray());
        objetos.add(ascii("<< /Title (" + escapar("Certificado " + d.codigo()) + ") /Producer (cursos-service) >>"));

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(ascii("%PDF-1.4\n"));
        out.writeBytes(new byte[]{'%', (byte) 0xE2, (byte) 0xE3, (byte) 0xCF, (byte) 0xD3, '\n'});
        List<Integer> offsets = new ArrayList<>();
        for (int i = 0; i < objetos.size(); i++) {
            offsets.add(out.size());
            out.writeBytes(ascii((i + 1) + " 0 obj\n"));
            out.writeBytes(objetos.get(i));
            out.writeBytes(ascii("\nendobj\n"));
        }
        int xref = out.size();
        StringBuilder x = new StringBuilder("xref\n0 " + (objetos.size() + 1) + "\n0000000000 65535 f \n");
        for (int off : offsets) x.append(String.format(Locale.ROOT, "%010d 00000 n \n", off));
        x.append("trailer\n<< /Size ").append(objetos.size() + 1).append(" /Root 1 0 R /Info ").append(objetos.size())
         .append(" 0 R >>\nstartxref\n").append(xref).append("\n%%EOF\n");
        out.writeBytes(ascii(x.toString()));
        return out.toByteArray();
    }

    /** Texto centrado (ancho aproximado de Helvetica) y recortado para no salir del marco. */
    private static void texto(StringBuilder c, String fuente, double tam, double y, String valor) {
        String t = normalizar(valor);
        double factor = "F2".equals(fuente) ? 0.58 : 0.52;
        int max = (int) Math.floor(720 / (tam * factor));
        if (t.length() > max) t = t.substring(0, Math.max(1, max - 3)) + "...";
        double x = Math.max(50, (ANCHO - t.length() * tam * factor) / 2);
        c.append(String.format(Locale.ROOT, "BT /%s %.1f Tf %.1f %.1f Td (%s) Tj ET\n", fuente, tam, x, y, escapar(t)));
    }

    /** Solo caracteres representables en WinAnsi; controles fuera. */
    static String normalizar(String v) {
        String s = v == null ? "" : v.replaceAll("[\\p{Cntrl}]", " ").strip();
        StringBuilder sb = new StringBuilder();
        var enc = WIN_ANSI.newEncoder();
        for (char ch : s.toCharArray()) sb.append(enc.canEncode(ch) ? ch : '?');
        return sb.toString();
    }

    static String escapar(String s) {
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }

    private static byte[] ascii(String s) {
        return s.getBytes(StandardCharsets.ISO_8859_1);
    }
}
