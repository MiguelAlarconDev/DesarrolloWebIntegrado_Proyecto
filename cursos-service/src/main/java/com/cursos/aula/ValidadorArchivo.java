package com.cursos.aula;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/**
 * Valida un archivo del aula sin confiar en el nombre ni en el Content-Type enviado:
 * extension permitida, Content-Type declarado coherente, firma binaria (magic bytes)
 * y, para formatos ZIP/OOXML, estructura interna leyendo solo el directorio central
 * (sin descomprimir contenido: evita bombas ZIP).
 */
public final class ValidadorArchivo {

    public static final long MAX_BYTES = 10L * 1024 * 1024; // 10 MiB = 10.485.760 bytes
    private static final int MAX_ENTRADAS_ZIP = 5_000;

    public static final Map<Material.Tipo, String> MIME_CANONICO = Map.of(
            Material.Tipo.PDF, "application/pdf",
            Material.Tipo.DOCX, "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            Material.Tipo.PPTX, "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            Material.Tipo.ZIP, "application/zip");

    /** Content-Type que los navegadores suelen enviar para cada formato (ademas del canonico). */
    private static final Map<Material.Tipo, Set<String>> MIME_ACEPTADOS = Map.of(
            Material.Tipo.PDF, Set.of("application/pdf", "application/octet-stream"),
            Material.Tipo.DOCX, Set.of(MIME_CANONICO.get(Material.Tipo.DOCX), "application/octet-stream"),
            Material.Tipo.PPTX, Set.of(MIME_CANONICO.get(Material.Tipo.PPTX), "application/octet-stream"),
            Material.Tipo.ZIP, Set.of("application/zip", "application/x-zip-compressed", "application/x-zip",
                    "multipart/x-zip", "application/octet-stream"));

    private ValidadorArchivo() {
    }

    public record Resultado(Material.Tipo tipo, String mimeType, String nombreSeguro) {}

    public static Resultado validar(String nombreOriginal, String contentTypeDeclarado, byte[] contenido) {
        if (contenido == null || contenido.length == 0) {
            throw new ArchivoInvalidoException("El archivo esta vacio");
        }
        if (contenido.length > MAX_BYTES) {
            throw new ArchivoInvalidoException("El archivo supera el maximo de 10 MiB");
        }
        String nombre = nombreSeguro(nombreOriginal);
        Material.Tipo tipo = tipoPorExtension(nombre);

        String declarado = contentTypeDeclarado == null ? "" : contentTypeDeclarado.split(";")[0].trim().toLowerCase(Locale.ROOT);
        if (!declarado.isEmpty() && !MIME_ACEPTADOS.get(tipo).contains(declarado)) {
            throw new ArchivoInvalidoException("El tipo de contenido no corresponde a un archivo " + tipo);
        }

        switch (tipo) {
            case PDF -> {
                if (!empiezaCon(contenido, "%PDF-".getBytes(StandardCharsets.US_ASCII))) {
                    throw new ArchivoInvalidoException("El contenido no es un PDF valido");
                }
            }
            case DOCX, PPTX, ZIP -> validarZip(tipo, contenido);
        }
        return new Resultado(tipo, MIME_CANONICO.get(tipo), nombre);
    }

    static Material.Tipo tipoPorExtension(String nombre) {
        int punto = nombre.lastIndexOf('.');
        String ext = punto < 0 ? "" : nombre.substring(punto + 1).toLowerCase(Locale.ROOT);
        return switch (ext) {
            case "pdf" -> Material.Tipo.PDF;
            case "docx" -> Material.Tipo.DOCX;
            case "pptx" -> Material.Tipo.PPTX;
            case "zip" -> Material.Tipo.ZIP;
            default -> throw new ArchivoInvalidoException("Formato no permitido. Use PDF, DOCX, PPTX o ZIP");
        };
    }

    /** Quita rutas y caracteres de control; limita a 255 caracteres conservando la extension. */
    static String nombreSeguro(String original) {
        String n = original == null ? "" : original.replace('\\', '/');
        n = n.substring(n.lastIndexOf('/') + 1);
        n = n.replaceAll("[\\p{Cntrl}\"<>|*?:]", "_").trim();
        if (n.isEmpty() || n.equals(".") || n.equals("..")) {
            throw new ArchivoInvalidoException("Nombre de archivo invalido");
        }
        if (n.length() > 255) {
            int punto = n.lastIndexOf('.');
            String ext = punto > 0 && n.length() - punto <= 10 ? n.substring(punto) : "";
            n = n.substring(0, 255 - ext.length()) + ext;
        }
        return n;
    }

    private static void validarZip(Material.Tipo tipo, byte[] contenido) {
        boolean firmaZip = empiezaCon(contenido, new byte[]{'P', 'K', 3, 4})
                || (tipo == Material.Tipo.ZIP && empiezaCon(contenido, new byte[]{'P', 'K', 5, 6}));
        if (!firmaZip) {
            throw new ArchivoInvalidoException("El contenido no corresponde a un archivo " + tipo);
        }
        Set<String> entradas = new HashSet<>();
        Path tmp = null;
        try {
            tmp = Files.createTempFile("aula-validacion-", ".zip");
            Files.write(tmp, contenido);
            try (ZipFile zip = new ZipFile(tmp.toFile())) {
                Enumeration<? extends ZipEntry> e = zip.entries();
                while (e.hasMoreElements()) {
                    if (entradas.size() >= MAX_ENTRADAS_ZIP) {
                        throw new ArchivoInvalidoException("El archivo comprimido tiene demasiadas entradas");
                    }
                    entradas.add(e.nextElement().getName());
                }
            }
        } catch (ArchivoInvalidoException ex) {
            throw ex;
        } catch (IOException | RuntimeException ex) {
            throw new ArchivoInvalidoException("El archivo comprimido esta danado o no es valido");
        } finally {
            if (tmp != null) {
                try {
                    Files.deleteIfExists(tmp);
                } catch (IOException ignored) {
                    // archivo temporal del sistema; se limpia con el SO
                }
            }
        }
        if (tipo == Material.Tipo.DOCX && !(entradas.contains("[Content_Types].xml") && entradas.contains("word/document.xml"))) {
            throw new ArchivoInvalidoException("El contenido no es un documento DOCX valido");
        }
        if (tipo == Material.Tipo.PPTX && !(entradas.contains("[Content_Types].xml") && entradas.contains("ppt/presentation.xml"))) {
            throw new ArchivoInvalidoException("El contenido no es una presentacion PPTX valida");
        }
        if ((tipo == Material.Tipo.DOCX || tipo == Material.Tipo.PPTX)
                && entradas.stream().anyMatch(n -> n.toLowerCase(Locale.ROOT).endsWith("vbaproject.bin"))) {
            throw new ArchivoInvalidoException("No se permiten documentos con macros");
        }
    }

    private static boolean empiezaCon(byte[] datos, byte[] prefijo) {
        if (datos.length < prefijo.length) {
            return false;
        }
        for (int i = 0; i < prefijo.length; i++) {
            if (datos[i] != prefijo[i]) {
                return false;
            }
        }
        return true;
    }

    public static class ArchivoInvalidoException extends RuntimeException {
        public ArchivoInvalidoException(String message) {
            super(message);
        }
    }
}
