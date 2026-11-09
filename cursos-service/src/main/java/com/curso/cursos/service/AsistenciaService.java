package com.curso.cursos.service;

import com.curso.cursos.dto.RegistrarAsistenciaRequest;
import com.curso.cursos.dto.RegistrarAsistenciasLoteRequest;
import com.curso.cursos.dto.ResumenAsistenciaDto;
import com.curso.cursos.entity.Asistencia;
import com.curso.cursos.repository.AsistenciaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AsistenciaService {

    private final AsistenciaRepository asistenciaRepository;

    public AsistenciaService(AsistenciaRepository asistenciaRepository) {
        this.asistenciaRepository = asistenciaRepository;
    }

    @Transactional(readOnly = true)
    public List<Asistencia> listarPorCurso(UUID cursoId) {
        return asistenciaRepository.findByCursoIdOrderByNumeroSesionAsc(cursoId);
    }

    @Transactional(readOnly = true)
    public List<Asistencia> listarPorCursoYSesion(UUID cursoId, Integer numeroSesion) {
        return asistenciaRepository.findByCursoIdAndNumeroSesion(cursoId, numeroSesion);
    }

    @Transactional(readOnly = true)
    public List<Asistencia> listarPorCursoYEstudiante(UUID cursoId, UUID estudianteId) {
        return asistenciaRepository.findByCursoIdAndEstudianteIdOrderByNumeroSesionAsc(cursoId, estudianteId);
    }

    @Transactional(readOnly = true)
    public Map<UUID, ResumenAsistenciaDto> obtenerResumenPorCurso(UUID cursoId) {
        List<Asistencia> todas = asistenciaRepository.findByCursoIdOrderByNumeroSesionAsc(cursoId);
        
        // Agrupar por estudiante
        Map<UUID, List<Asistencia>> porEstudiante = todas.stream()
                .collect(Collectors.groupingBy(Asistencia::getEstudianteId));

        Map<UUID, ResumenAsistenciaDto> resumenMap = new HashMap<>();
        for (Map.Entry<UUID, List<Asistencia>> entry : porEstudiante.entrySet()) {
            UUID estId = entry.getKey();
            List<Asistencia> lista = entry.getValue();

            int presentes = 0;
            int tardanzas = 0;
            int justif = 0;
            int faltas = 0;

            for (Asistencia a : lista) {
                switch (a.getEstado()) {
                    case "P" -> presentes++;
                    case "T" -> tardanzas++;
                    case "FJ" -> justif++;
                    case "F" -> faltas++;
                    default -> faltas++;
                }
            }

            resumenMap.put(estId, new ResumenAsistenciaDto(estId, lista.size(), presentes, tardanzas, justif, faltas));
        }

        return resumenMap;
    }

    @Transactional
    public Asistencia registrarIndividual(RegistrarAsistenciaRequest request) {
        Asistencia asistencia = asistenciaRepository
                .findByCursoIdAndEstudianteIdAndNumeroSesion(request.getCursoId(), request.getEstudianteId(), request.getNumeroSesion())
                .orElseGet(() -> {
                    Asistencia nueva = new Asistencia();
                    nueva.setCursoId(request.getCursoId());
                    nueva.setEstudianteId(request.getEstudianteId());
                    nueva.setNumeroSesion(request.getNumeroSesion());
                    return nueva;
                });

        asistencia.setFechaSesion(request.getFechaSesion());
        asistencia.setTemaSesion(request.getTemaSesion());
        asistencia.setEstado(request.getEstado());
        asistencia.setObservaciones(request.getObservaciones());
        if (request.getDocenteId() != null) asistencia.setRegistradoPor(request.getDocenteId());
        asistencia.setCreatedAt(LocalDateTime.now());

        return asistenciaRepository.save(asistencia);
    }

    @Transactional
    public List<Asistencia> registrarLote(RegistrarAsistenciasLoteRequest request) {
        List<Asistencia> resultado = new ArrayList<>();

        if (request.getEstudiantes() == null || request.getEstudiantes().isEmpty()) {
            return resultado;
        }

        for (RegistrarAsistenciasLoteRequest.ItemAsistenciaEstudiante item : request.getEstudiantes()) {
            Asistencia a = asistenciaRepository
                    .findByCursoIdAndEstudianteIdAndNumeroSesion(request.getCursoId(), item.getEstudianteId(), request.getNumeroSesion())
                    .orElseGet(() -> {
                        Asistencia nueva = new Asistencia();
                        nueva.setCursoId(request.getCursoId());
                        nueva.setEstudianteId(item.getEstudianteId());
                        nueva.setNumeroSesion(request.getNumeroSesion());
                        return nueva;
                    });

            a.setFechaSesion(request.getFechaSesion());
            a.setTemaSesion(request.getTemaSesion());
            a.setEstado(item.getEstado());
            a.setObservaciones(item.getObservaciones());
            if (request.getDocenteId() != null) a.setRegistradoPor(request.getDocenteId());
            a.setCreatedAt(LocalDateTime.now());

            resultado.add(asistenciaRepository.save(a));
        }

        return resultado;
    }
}
