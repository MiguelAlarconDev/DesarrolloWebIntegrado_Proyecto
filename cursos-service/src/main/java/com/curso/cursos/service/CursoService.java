package com.curso.cursos.service;

import com.curso.cursos.dto.ActualizarDatosClaseRequest;
import com.curso.cursos.dto.ActualizarEnlaceRequest;
import com.curso.cursos.dto.CrearCursoRequest;
import com.curso.cursos.entity.Curso;
import com.curso.cursos.entity.EstadoCurso;
import com.curso.cursos.entity.ModalidadCurso;
import com.curso.cursos.repository.CursoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
public class CursoService {

    private final CursoRepository cursoRepository;

    public CursoService(CursoRepository cursoRepository) {
        this.cursoRepository = cursoRepository;
    }

    public List<Curso> listarPublicos() {
        return cursoRepository.findByEstado(EstadoCurso.PUBLICADO);
    }

    public List<Curso> listarTodos() {
        return cursoRepository.findAll();
    }

    public List<Curso> listarPorDocente(UUID docenteId) {
        return cursoRepository.findByDocenteId(docenteId);
    }

    public Curso buscarPorId(UUID id) {
        return cursoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Curso no encontrado con ID: " + id));
    }

    @Transactional
    public Curso crear(CrearCursoRequest request) {
        ModalidadCurso modalidad = request.getModalidad() != null ? request.getModalidad() : ModalidadCurso.VIRTUAL;
        validarDatosClase(modalidad, request.getEnlaceClase(), request.getDireccionClase());

        Curso curso = new Curso();
        curso.setTitulo(request.getTitulo());
        curso.setDescripcion(request.getDescripcion());
        curso.setDocenteId(request.getDocenteId());
        curso.setFechaInicio(request.getFechaInicio());
        curso.setFechaFin(request.getFechaFin());
        curso.setHorario(request.getHorario());
        curso.setModalidad(modalidad);
        curso.setAforoMaximo(request.getAforoMaximo());
        curso.setAforoDisponible(request.getAforoMaximo());
        curso.setPrecio(request.getPrecio());
        aplicarDatosClase(curso, modalidad, request.getEnlaceClase(), request.getDireccionClase(), request.getAula());
        curso.setEstado(EstadoCurso.PUBLICADO);

        return cursoRepository.save(curso);
    }

    @Transactional
    public Curso actualizarEnlaceClase(UUID id, ActualizarEnlaceRequest request) {
        Curso curso = buscarPorId(id);
        if (curso.getModalidad() == ModalidadCurso.PRESENCIAL) {
            throw new IllegalStateException("No se puede asignar enlace a un curso presencial. Actualiza los datos de clase.");
        }
        curso.setEnlaceClase(request.getEnlaceClase());
        return cursoRepository.save(curso);
    }

    @Transactional
    public Curso actualizarDatosClase(UUID id, ActualizarDatosClaseRequest request) {
        Curso curso = buscarPorId(id);
        validarDatosClase(request.getModalidad(), request.getEnlaceClase(), request.getDireccionClase());
        aplicarDatosClase(curso, request.getModalidad(), request.getEnlaceClase(), request.getDireccionClase(), request.getAula());
        return cursoRepository.save(curso);
    }

    @Transactional
    public Curso cambiarEstado(UUID id, EstadoCurso nuevoEstado) {
        Curso curso = buscarPorId(id);
        curso.setEstado(nuevoEstado);
        return cursoRepository.save(curso);
    }

    @Transactional
    public Curso descontarAforo(UUID id) {
        Curso curso = buscarPorId(id);
        if (curso.getEstado() != EstadoCurso.PUBLICADO) {
            throw new IllegalStateException("El curso no se encuentra disponible para matrícula");
        }
        if (curso.getAforoDisponible() <= 0) {
            throw new IllegalStateException("Lo sentimos, no quedan vacantes disponibles para este curso");
        }
        curso.setAforoDisponible(curso.getAforoDisponible() - 1);
        Curso guardado = cursoRepository.save(curso);
        System.out.printf("[CURSOS-SERVICE] Vacante reservada para curso '%s'. Aforo restante: %d%n",
                guardado.getTitulo(), guardado.getAforoDisponible());
        return guardado;
    }

    @Transactional
    public Curso liberarAforo(UUID id) {
        Curso curso = buscarPorId(id);
        if (curso.getAforoDisponible() < curso.getAforoMaximo()) {
            curso.setAforoDisponible(curso.getAforoDisponible() + 1);
        }
        Curso guardado = cursoRepository.save(curso);
        System.out.printf("[CURSOS-SERVICE] Vacante liberada para curso '%s'. Aforo restante: %d%n",
                guardado.getTitulo(), guardado.getAforoDisponible());
        return guardado;
    }

    private void validarDatosClase(ModalidadCurso modalidad, String enlaceClase, String direccionClase) {
        if (modalidad == null) {
            throw new IllegalArgumentException("La modalidad del curso es obligatoria");
        }
        if (modalidad == ModalidadCurso.VIRTUAL && !StringUtils.hasText(enlaceClase)) {
            throw new IllegalArgumentException("El enlace de clase es obligatorio para cursos virtuales");
        }
        if (modalidad == ModalidadCurso.PRESENCIAL && !StringUtils.hasText(direccionClase)) {
            throw new IllegalArgumentException("La direccion de clase es obligatoria para cursos presenciales");
        }
    }

    private void aplicarDatosClase(Curso curso,
                                   ModalidadCurso modalidad,
                                   String enlaceClase,
                                   String direccionClase,
                                   String aula) {
        curso.setModalidad(modalidad);
        if (modalidad == ModalidadCurso.VIRTUAL) {
            curso.setEnlaceClase(enlaceClase);
            curso.setDireccionClase(null);
            curso.setAula(null);
            return;
        }

        curso.setEnlaceClase(null);
        curso.setDireccionClase(direccionClase);
        curso.setAula(aula);
    }
}
