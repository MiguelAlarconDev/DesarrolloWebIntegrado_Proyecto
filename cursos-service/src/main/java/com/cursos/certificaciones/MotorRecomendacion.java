package com.cursos.certificaciones;

import com.cursos.aula.tareas.Entrega;
import com.cursos.aula.tareas.TareaRepository.EvaluacionAcademica;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

/** Stateless calculation; never persists an approval or issues a certificate. */
public final class MotorRecomendacion {
    private static final BigDecimal MINIMA = new BigDecimal("11.00");
    private MotorRecomendacion() {}
    public enum Recomendacion { APTO, NO_APTO, SIN_DATOS_SUFICIENTES }
    public record Resultado(UUID cursoId, UUID estudianteId, int totalTareas, int tareasCalificadas,
                            int tareasPendientes, BigDecimal promedio, Recomendacion recomendacion,
                            BigDecimal notaMinima, String explicacion) {}

    public static Resultado calcular(UUID curso, UUID estudiante, List<EvaluacionAcademica> tareas) {
        BigDecimal suma = BigDecimal.ZERO;
        int calificadas = 0;
        for (EvaluacionAcademica tarea : tareas) {
            BigDecimal nota = tarea.getNota();
            if (tarea.getEstado() == Entrega.Estado.CALIFICADA && tarea.getConfirmada()
                    && nota != null && nota.signum() >= 0 && nota.compareTo(new BigDecimal("20")) <= 0
                    && nota.stripTrailingZeros().scale() <= 2) {
                suma = suma.add(nota);
                calificadas++;
            }
        }
        int total = tareas.size();
        if (total == 0 || calificadas != total) {
            return new Resultado(curso, estudiante, total, calificadas, total - calificadas, null,
                    Recomendacion.SIN_DATOS_SUFICIENTES, MINIMA,
                    total == 0 ? "El curso no tiene tareas evaluables. No constituye aprobacion definitiva."
                            : "Faltan entregas confirmadas con calificacion valida. No constituye aprobacion definitiva.");
        }
        // Compare exactly, without dividing or rounding; display only is HALF_UP at two decimals.
        BigDecimal cantidad = BigDecimal.valueOf(total);
        Recomendacion recomendacion = suma.compareTo(MINIMA.multiply(cantidad)) >= 0
                ? Recomendacion.APTO : Recomendacion.NO_APTO;
        return new Resultado(curso, estudiante, total, calificadas, 0,
                suma.divide(cantidad, 2, RoundingMode.HALF_UP), recomendacion, MINIMA,
                "Promedio simple mostrado con dos decimales HALF_UP; recomendacion calculada sin redondear. "
                        + "Requiere confirmacion docente posterior; no constituye aprobacion definitiva.");
    }
}
