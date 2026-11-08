package com.cursos.aula;

import com.cursos.entity.Curso;
import com.cursos.repository.CursoRepository;
import com.cursos.security.AuthPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class AulaService {
    private static final Logger log = LoggerFactory.getLogger(AulaService.class);
    static final Duration VIGENCIA_DESCARGA = Duration.ofSeconds(60);

    private final CursoRepository cursos;
    private final ModuloRepository modulos;
    private final MaterialRepository materiales;
    private final MatriculaClient matriculas;
    private final AlmacenamientoArchivos storage;

    public AulaService(CursoRepository cursos, ModuloRepository modulos, MaterialRepository materiales,
                       MatriculaClient matriculas, AlmacenamientoArchivos storage) {
        this.cursos = cursos; this.modulos = modulos; this.materiales = materiales; this.matriculas = matriculas;
        this.storage = storage;
    }

    public List<ModuloVista> listar(UUID cursoId, AuthPrincipal principal) {
        Curso curso = curso(cursoId);
        requireLectura(curso, cursoId, principal);
        List<Modulo> lista = modulos.findByCursoIdOrderByOrdenAscIdAsc(cursoId);
        List<Material> archivos = lista.isEmpty() ? List.of() : materiales
                .findByModuloIdInAndEstadoOrderByCreatedAtAscIdAsc(lista.stream().map(Modulo::getId).toList(), Material.Estado.ACTIVO);
        return lista.stream().map(m -> new ModuloVista(m.getId(), m.getTitulo(), m.getOrden(), archivos.stream()
                .filter(a -> a.getModuloId().equals(m.getId())).map(AulaService::vista).toList())).toList();
    }

    @Transactional
    public ModuloVista crear(UUID cursoId, String titulo, int orden, AuthPrincipal principal) {
        requireDocente(curso(cursoId), principal);
        Modulo modulo = modulos.save(new Modulo(cursoId, titulo, orden));
        return new ModuloVista(modulo.getId(), modulo.getTitulo(), modulo.getOrden(), List.of());
    }

    @Transactional
    public void editar(UUID cursoId, UUID moduloId, String titulo, int orden, AuthPrincipal principal) {
        requireDocente(curso(cursoId), principal);
        Modulo modulo = modulo(cursoId, moduloId);
        modulo.editar(titulo, orden);
        modulos.save(modulo);
    }

    /**
     * Subida: valida -> registra PENDIENTE -> sube a Storage -> ACTIVO.
     * Sin transaccion envolvente para no mantener la BD bloqueada durante la red.
     * Compensaciones: fallo de Storage elimina el registro PENDIENTE; fallo al activar
     * elimina el objeto subido y el registro.
     */
    public MaterialVista subir(UUID cursoId, UUID moduloId, String titulo, String nombreOriginal,
                               String contentType, byte[] contenido, AuthPrincipal principal) {
        requireDocente(curso(cursoId), principal);
        modulo(cursoId, moduloId);
        ValidadorArchivo.Resultado archivo = ValidadorArchivo.validar(nombreOriginal, contentType, contenido);
        if (!storage.isConfigurado()) {
            throw new AlmacenamientoArchivos.NoDisponibleException("El almacenamiento de archivos no esta configurado");
        }
        String tituloFinal = (titulo == null || titulo.isBlank()) ? sinExtension(archivo.nombreSeguro()) : titulo.trim();
        if (tituloFinal.length() > 200) {
            throw new ValidadorArchivo.ArchivoInvalidoException("El titulo no puede superar 200 caracteres");
        }
        String objectKey = "cursos/" + cursoId + "/modulos/" + moduloId + "/" + UUID.randomUUID() + "."
                + archivo.tipo().name().toLowerCase(Locale.ROOT);

        Material material = materiales.saveAndFlush(new Material(moduloId, tituloFinal, objectKey, archivo.nombreSeguro(),
                archivo.mimeType(), contenido.length, archivo.tipo(), UUID.fromString(principal.subject())));
        try {
            storage.subir(objectKey, contenido, archivo.mimeType());
        } catch (RuntimeException ex) {
            compensarRegistro(material);
            throw ex;
        }
        try {
            material.activar();
            return vista(materiales.saveAndFlush(material));
        } catch (RuntimeException ex) {
            log.warn("[AULA] No se pudo activar el material {}; revirtiendo la subida", material.getId());
            try {
                storage.eliminar(objectKey);
            } catch (RuntimeException ignored) {
                log.warn("[AULA] Objeto huerfano pendiente de limpieza para el material {}", material.getId());
            }
            compensarRegistro(material);
            throw new AlmacenamientoArchivos.NoDisponibleException("No se pudo registrar el material; intente nuevamente");
        }
    }

    /**
     * Eliminacion: oculta el material (ELIMINACION_PENDIENTE), borra el objeto y luego el registro.
     * Si Storage falla, el material queda oculto y la operacion puede reintentarse.
     */
    public void eliminar(UUID cursoId, UUID moduloId, UUID materialId, AuthPrincipal principal) {
        requireDocente(curso(cursoId), principal);
        modulo(cursoId, moduloId);
        Material material = materiales.findByIdAndModuloId(materialId, moduloId)
                .filter(m -> m.getEstado() != Material.Estado.PENDIENTE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material no encontrado"));
        if (!storage.isConfigurado()) {
            throw new AlmacenamientoArchivos.NoDisponibleException("El almacenamiento de archivos no esta configurado");
        }
        if (material.getEstado() != Material.Estado.ELIMINACION_PENDIENTE) {
            material.marcarEliminacion();
            materiales.saveAndFlush(material);
        }
        storage.eliminar(material.getObjectKey());
        materiales.delete(material);
    }

    /** URL firmada de 60 s para un material ACTIVO del modulo/curso indicados. */
    public Descarga descargar(UUID cursoId, UUID moduloId, UUID materialId, AuthPrincipal principal) {
        Curso curso = curso(cursoId);
        requireLectura(curso, cursoId, principal);
        modulo(cursoId, moduloId);
        Material material = materiales.findByIdAndModuloId(materialId, moduloId)
                .filter(m -> m.getEstado() == Material.Estado.ACTIVO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material no encontrado"));
        String url = storage.urlFirmada(material.getObjectKey(), VIGENCIA_DESCARGA, material.getNombreOriginal());
        return new Descarga(url, Instant.now().plus(VIGENCIA_DESCARGA), material.getNombreOriginal());
    }

    private void compensarRegistro(Material material) {
        try {
            materiales.delete(material);
        } catch (RuntimeException ex) {
            log.warn("[AULA] No se pudo eliminar el registro PENDIENTE {}; quedara oculto", material.getId());
        }
    }

    private void requireLectura(Curso curso, UUID cursoId, AuthPrincipal principal) {
        if ("DOCENTE".equals(principal.rol())) {
            requireDocente(curso, principal);
        } else if ("ESTUDIANTE".equals(principal.rol())) {
            UUID estudiante;
            try { estudiante = UUID.fromString(principal.subject()); }
            catch (IllegalArgumentException ex) { throw denegado(); }
            if (!matriculas.habilitada(cursoId, estudiante)) throw denegado();
        } else { throw denegado(); }
    }

    /** Shared authorization entry point for module resources, including tasks. */
    public void autorizarModulo(UUID cursoId, UUID moduloId, AuthPrincipal principal, boolean escritura) {
        Curso curso = curso(cursoId);
        if (escritura) requireDocente(curso, principal);
        else requireLectura(curso, cursoId, principal);
        modulo(cursoId, moduloId);
    }

    private Curso curso(UUID id) {
        return cursos.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Curso no encontrado"));
    }
    private Modulo modulo(UUID cursoId, UUID moduloId) {
        return modulos.findByIdAndCursoId(moduloId, cursoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Modulo no encontrado"));
    }
    private void requireDocente(Curso curso, AuthPrincipal p) {
        if (!"DOCENTE".equals(p.rol()) || !p.isUser(curso.getDocenteId())) throw denegado();
    }
    private AuthPrincipal.ForbiddenException denegado() {
        return new AuthPrincipal.ForbiddenException("Sin acceso al aula de este curso");
    }
    private static String sinExtension(String nombre) {
        int punto = nombre.lastIndexOf('.');
        return punto > 0 ? nombre.substring(0, punto) : nombre;
    }
    private static MaterialVista vista(Material a) {
        return new MaterialVista(a.getId(), a.getTitulo(), a.getNombreOriginal(), a.getMimeType(), a.getTamanoBytes(),
                a.getTipo(), a.getCreatedAt());
    }

    public record ModuloVista(UUID id, String titulo, int orden, List<MaterialVista> materiales) {}
    public record MaterialVista(UUID id, String titulo, String nombreOriginal, String mimeType, long tamanoBytes,
                                Material.Tipo tipo, Instant publicadoEn) {}
    public record Descarga(String url, Instant expiraEn, String nombreArchivo) {}
}
