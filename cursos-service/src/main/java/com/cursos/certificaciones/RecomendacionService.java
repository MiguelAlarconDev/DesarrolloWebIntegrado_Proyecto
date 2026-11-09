package com.cursos.certificaciones;

import com.cursos.aula.AulaService;
import com.cursos.aula.MatriculaClient;
import com.cursos.aula.tareas.TareaRepository;
import com.cursos.security.AuthPrincipal;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class RecomendacionService {
    private final AulaService aula;
    private final MatriculaClient matriculas;
    private final TareaRepository tareas;
    public RecomendacionService(AulaService aula, MatriculaClient matriculas, TareaRepository tareas) {
        this.aula = aula; this.matriculas = matriculas; this.tareas = tareas;
    }
    public MotorRecomendacion.Resultado consultar(UUID curso, UUID estudiante, AuthPrincipal principal) {
        aula.autorizarDocente(curso, principal);
        if (!matriculas.habilitada(curso, estudiante))
            throw new AuthPrincipal.ForbiddenException("El estudiante no tiene matricula habilitada");
        return MotorRecomendacion.calcular(curso, estudiante, tareas.evaluaciones(curso, estudiante));
    }
}
