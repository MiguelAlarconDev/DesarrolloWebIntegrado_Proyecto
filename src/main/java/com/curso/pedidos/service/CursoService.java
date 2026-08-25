package com.curso.pedidos.service;

import com.curso.pedidos.dto.ActualizarEnlaceRequest;
import com.curso.pedidos.dto.CrearCursoRequest;
import com.curso.pedidos.entity.Curso;
import com.curso.pedidos.entity.EstadoCurso;
import com.curso.pedidos.entity.RolUsuario;
import com.curso.pedidos.entity.Usuario;
import com.curso.pedidos.repository.CursoRepository;
import com.curso.pedidos.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class CursoService {

    private final CursoRepository cursoRepository;
    private final UsuarioRepository usuarioRepository;

    public CursoService(CursoRepository cursoRepository, UsuarioRepository usuarioRepository) {
        this.cursoRepository = cursoRepository;
        this.usuarioRepository = usuarioRepository;
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

    public Curso crear(CrearCursoRequest request) {
        Usuario docente = usuarioRepository.findById(request.getDocenteId())
                .orElseThrow(() -> new IllegalArgumentException("Docente no encontrado con ID: " + request.getDocenteId()));

        if (docente.getRol() != RolUsuario.DOCENTE && docente.getRol() != RolUsuario.ADMIN) {
            throw new IllegalArgumentException("El usuario asignado no tiene el rol de DOCENTE");
        }

        Curso curso = new Curso();
        curso.setTitulo(request.getTitulo());
        curso.setDescripcion(request.getDescripcion());
        curso.setDocente(docente);
        curso.setFechaInicio(request.getFechaInicio());
        curso.setFechaFin(request.getFechaFin());
        curso.setHorario(request.getHorario());
        curso.setAforoMaximo(request.getAforoMaximo());
        curso.setAforoDisponible(request.getAforoMaximo()); // Inicialmente disponible = máximo
        curso.setPrecio(request.getPrecio());
        curso.setEnlaceClase(request.getEnlaceClase());
        curso.setEstado(EstadoCurso.PUBLICADO);

        return cursoRepository.save(curso);
    }

    public Curso actualizarEnlaceClase(UUID cursoId, ActualizarEnlaceRequest request) {
        Curso curso = buscarPorId(cursoId);
        curso.setEnlaceClase(request.getEnlaceClase());
        return cursoRepository.save(curso);
    }

    public Curso cambiarEstado(UUID cursoId, EstadoCurso nuevoEstado) {
        Curso curso = buscarPorId(cursoId);
        curso.setEstado(nuevoEstado);
        return cursoRepository.save(curso);
    }
}
