package com.curso.gateway.security;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Capa 4: matriz de acceso por niveles.
 *
 * <pre>
 * Nivel 0  PUBLICO     catalogo, login, registro, 2FA, webhook de Mercado Pago
 * Nivel 1  ESTUDIANTE  checkout, sus pedidos, cancelar su pedido
 * Nivel 2  DOCENTE     sus cursos, enlace/aula de clase, lista de participantes
 * Nivel 3  ADMIN       usuarios, todos los cursos y pedidos, pagos manuales, IPs bloqueadas
 * INTERNO              solo servicio a servicio (nunca desde Internet)
 * </pre>
 *
 * Una ruta /api/** que no este en la tabla exige sesion valida (cualquier rol) y el
 * microservicio decide el permiso fino: cada servicio valida el JWT por su cuenta.
 * Las reglas "owner" exigen que el id de la URL sea el del usuario del token, salvo ADMIN.
 */
public final class AccessPolicy {

    public enum Rol { ESTUDIANTE, DOCENTE, ADMIN }

    public enum Tipo { PUBLICO, OPCIONAL, ROLES, INTERNO }

    public record Regla(String method, Pattern pattern, String template, Tipo tipo, Set<Rol> roles, String ownerVar) {
        Optional<Map<String, String>> match(String reqMethod, String path) {
            if (!method.equals("*") && !method.equalsIgnoreCase(reqMethod)) {
                return Optional.empty();
            }
            Matcher m = pattern.matcher(path);
            if (!m.matches()) {
                return Optional.empty();
            }
            Map<String, String> vars = new java.util.HashMap<>();
            Matcher names = Pattern.compile("\\{(\\w+)}").matcher(template);
            int group = 1;
            while (names.find()) {
                vars.put(names.group(1), m.group(group++));
            }
            return Optional.of(vars);
        }
    }

    private static final Set<Rol> ADMIN = EnumSet.of(Rol.ADMIN);
    private static final Set<Rol> DOCENTE = EnumSet.of(Rol.DOCENTE, Rol.ADMIN);
    private static final Set<Rol> ESTUDIANTE = EnumSet.of(Rol.ESTUDIANTE, Rol.ADMIN);
    private static final Set<Rol> STAFF = EnumSet.of(Rol.DOCENTE, Rol.ADMIN);
    private static final Set<Rol> AUTENTICADO = EnumSet.allOf(Rol.class);

    private static final List<Regla> REGLAS = List.of(
            // ---- Nivel 0: publico
            publico("GET", "/actuator/health"),
            publico("POST", "/api/auth/login"),
            publico("POST", "/api/auth/verificar-2fa"),
            publico("POST", "/api/auth/reenviar-2fa"),
            new Regla("POST", compile("/api/auth/registro"), "/api/auth/registro", Tipo.OPCIONAL, AUTENTICADO, null),
            publico("POST", "/api/pedidos/webhook"),            // Mercado Pago (pedidos verifica la firma)
            publico("*", "/api/pedidos/whatsapp/webhook"),      // Meta WhatsApp Cloud (verificacion del webhook)
            // rutas especificas de cursos antes que /api/cursos/{id}
            roles("GET", "/api/cursos/todos", STAFF, null),
            roles("GET", "/api/cursos/docente/{docenteId}", DOCENTE, "docenteId"),
            publico("GET", "/api/cursos"),
            publico("GET", "/api/cursos/{id}"),
            // ---- Interno: solo servicio a servicio, nunca desde Internet
            interno("PUT", "/api/cursos/{id}/descontar-aforo"),
            interno("PUT", "/api/cursos/{id}/liberar-aforo"),
            interno("*", "/api/pedidos/interno/**"),
            interno("*", "/api/comprobantes/**"),   // PDFs se descargan via /api/pedidos/{id}/comprobante|certificado
            // ---- Notas (0-20) y asistencias: docente del curso o admin; el alumno ve las suyas
            roles("GET", "/api/cursos/calificaciones/curso/{cursoId}/estudiante/{estudianteId}", AUTENTICADO, null),
            roles("GET", "/api/cursos/asistencias/curso/{cursoId}/estudiante/{estudianteId}", AUTENTICADO, null),
            roles("*", "/api/cursos/calificaciones/**", STAFF, null),
            roles("*", "/api/cursos/asistencias/**", STAFF, null),
            // ---- Aula virtual: sesion obligatoria; cursos-service valida rol, matricula y propiedad
            roles("*", "/api/cursos/{cursoId}/aula/**", AUTENTICADO, null),
            // ---- Nivel 1: estudiante
            roles("GET", "/api/auth/perfil", AUTENTICADO, null),
            roles("POST", "/api/pedidos/checkout", ESTUDIANTE, null),
            roles("GET", "/api/pedidos/estudiante/{estudianteId}", ESTUDIANTE, "estudianteId"),
            roles("PUT", "/api/pedidos/{id}/cancelar", ESTUDIANTE, null),
            // ---- Nivel 2: docente
            roles("POST", "/api/cursos", DOCENTE, null),
            roles("PUT", "/api/cursos/{id}/enlace", DOCENTE, null),
            roles("PUT", "/api/cursos/{id}/datos-clase", DOCENTE, null),
            roles("PUT", "/api/cursos/{id}/estado", DOCENTE, null),
            roles("GET", "/api/pedidos/curso/{cursoId}/participantes", DOCENTE, null),
            roles("GET", "/api/pedidos", STAFF, null),
            // ---- Nivel 3: admin
            roles("GET", "/api/auth/usuarios/{id}", AUTENTICADO, "id"),
            roles("GET", "/api/auth/usuarios", ADMIN, null),
            roles("PUT", "/api/auth/usuarios/{id}", AUTENTICADO, "id"),
            roles("DELETE", "/api/auth/usuarios/{id}", ADMIN, null),
            roles("PUT", "/api/cursos/{id}", ADMIN, null),
            roles("DELETE", "/api/cursos/{id}", ADMIN, null),
            roles("PUT", "/api/pedidos/{id}/pagar", ESTUDIANTE, null),   // pedidos verifica el pago en Mercado Pago
            roles("*", "/api/pedidos/{id}/whatsapp/reenviar", ADMIN, null),
            roles("*", "/api/pedidos/whatsapp/**", ADMIN, null),
            roles("*", "/api/pedidos/email/**", ADMIN, null),
            roles("*", "/api/pagos/**", ADMIN, null),
            roles("*", "/api/whatsapp/**", ADMIN, null),
            roles("*", "/api/seguridad/**", ADMIN, null),
            // el detalle de un pedido lo ve su duenio o el personal (validado en pedidos-service)
            roles("GET", "/api/pedidos/{id}", AUTENTICADO, null)
    );

    private AccessPolicy() {
    }

    public static Optional<Resultado> evaluar(String method, String path) {
        for (Regla regla : REGLAS) {
            Optional<Map<String, String>> vars = regla.match(method, path);
            if (vars.isPresent()) {
                return Optional.of(new Resultado(regla, vars.get()));
            }
        }
        return Optional.empty();
    }

    public record Resultado(Regla regla, Map<String, String> variables) {
    }

    private static Regla publico(String method, String template) {
        return new Regla(method, compile(template), template, Tipo.PUBLICO, Set.of(), null);
    }

    private static Regla interno(String method, String template) {
        return new Regla(method, compile(template), template, Tipo.INTERNO, Set.of(), null);
    }

    private static Regla roles(String method, String template, Set<Rol> roles, String ownerVar) {
        return new Regla(method, compile(template), template, Tipo.ROLES, roles, ownerVar);
    }

    private static Pattern compile(String template) {
        String regex = Pattern.quote(template)
                .replace("/**", "\\E(?:/.*)?\\Q")
                .replaceAll("\\{\\w+}", "\\\\E([^/]+)\\\\Q");
        return Pattern.compile(regex + "/?");
    }
}
