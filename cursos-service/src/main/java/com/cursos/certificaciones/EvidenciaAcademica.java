package com.cursos.certificaciones;

import com.cursos.aula.tareas.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;

/**
 * Evidencia academica de un alumno en un curso.
 *
 * - {@link Datos}: copia para mostrar (incluye textos explicativos); NO participa del hash.
 * - Evidencia canonica "evidencia-academica/v2": JSON con claves en orden fijo, UUID en minusculas,
 *   decimales con escala 2, tareas ordenadas por id, sin textos de presentacion. Incluye la
 *   revision academica monotona del curso. El hash SHA-256 se calcula sobre sus bytes UTF-8 y
 *   PostgreSQL lo vuelve a verificar con un CHECK.
 */
@Component
public class EvidenciaAcademica {
    public static final String ESQUEMA = "evidencia-academica/v2";
    public static final String POLITICA = "promedio-simple-11.00-v1";

    private final TareaRepository tareas;
    private final ObjectMapper json = new ObjectMapper();
    public EvidenciaAcademica(TareaRepository tareas){this.tareas=tareas;}
    public record Tarea(UUID tareaId,UUID moduloId,long tareaVersion,UUID entregaId,Long entregaVersion,
            Entrega.Estado estado,BigDecimal nota,boolean confirmada) implements TareaRepository.EvaluacionAcademica {
        public UUID getTareaId(){return tareaId;}
        public Entrega.Estado getEstado(){return estado;}
        public BigDecimal getNota(){return nota;}
        public boolean getConfirmada(){return confirmada;}
    }
    public record Datos(String politica,MotorRecomendacion.Resultado recomendacion,List<Tarea> tareas) {}
    /** revisionAcademica se agrega al contrato (aditivo); la forma canonica no se expone. */
    public record Vista(Datos evidencia,String evidenciaHash,long revisionAcademica,@JsonIgnore String canonica) {}

    /**
     * Lee revision y filas. Llamar dentro de una transaccion REPEATABLE READ (lectura) o tras
     * bloquear la fila de revision del curso (escritura/emision) para que ambas lecturas sean coherentes.
     */
    public Vista leer(UUID curso,UUID estudiante) {
        Long rev=tareas.revisionAcademica(curso);
        long revision=rev==null?0:rev;
        var filas=tareas.evidencia(curso,estudiante).stream().map(e->new Tarea(e.getTareaId(),e.getModuloId(),
            e.getTareaVersion(),e.getEntregaId(),e.getEntregaVersion(),e.getEstado(),
            e.getNota()==null?null:e.getNota().setScale(2),e.getConfirmada()))
            .sorted(Comparator.comparing(t->t.tareaId().toString())).toList();
        var resultado=MotorRecomendacion.calcular(curso,estudiante,new ArrayList<TareaRepository.EvaluacionAcademica>(filas));
        var datos=new Datos(POLITICA,resultado,filas);
        String canonica=canonica(curso,estudiante,revision,resultado,filas);
        return new Vista(datos,hash(canonica),revision,canonica);
    }

    /** Serializacion canonica determinista; los valores son UUID, enteros, enums y decimales (sin escapes). */
    static String canonica(UUID curso,UUID estudiante,long revision,MotorRecomendacion.Resultado r,List<Tarea> filas) {
        StringBuilder sb=new StringBuilder(256+filas.size()*256);
        sb.append("{\"esquema\":\"").append(ESQUEMA).append('"')
          .append(",\"politica\":\"").append(POLITICA).append('"')
          .append(",\"cursoId\":").append(str(curso))
          .append(",\"estudianteId\":").append(str(estudiante))
          .append(",\"revisionAcademica\":").append(revision)
          .append(",\"resultado\":{\"recomendacion\":").append(str(r.recomendacion()))
          .append(",\"totalTareas\":").append(r.totalTareas())
          .append(",\"tareasCalificadas\":").append(r.tareasCalificadas())
          .append(",\"promedio\":").append(dec(r.promedio()))
          .append("},\"tareas\":[");
        for(int i=0;i<filas.size();i++) {
            Tarea t=filas.get(i);
            if(i>0) sb.append(',');
            sb.append("{\"tareaId\":").append(str(t.tareaId()))
              .append(",\"moduloId\":").append(str(t.moduloId()))
              .append(",\"tareaVersion\":").append(t.tareaVersion())
              .append(",\"entregaId\":").append(str(t.entregaId()))
              .append(",\"entregaVersion\":").append(t.entregaVersion()==null?"null":t.entregaVersion().toString())
              .append(",\"estado\":").append(str(t.estado()))
              .append(",\"nota\":").append(dec(t.nota()))
              .append(",\"confirmada\":").append(t.confirmada())
              .append('}');
        }
        return sb.append("]}").toString();
    }
    private static String str(Object v){return v==null?"null":"\""+v.toString().toLowerCase(Locale.ROOT)+"\"";}
    private static String dec(BigDecimal v){return v==null?"null":"\""+v.setScale(2,java.math.RoundingMode.UNNECESSARY).toPlainString()+"\"";}

    public String serializar(Object value) {
        try{return json.writeValueAsString(value);}
        catch(JsonProcessingException ex){throw new IllegalStateException("No se pudo serializar evidencia academica");}
    }
    public Datos leerGuardada(String value) {
        try{return json.readValue(value,Datos.class);}
        catch(JsonProcessingException ex){throw new IllegalStateException("Evidencia academica almacenada invalida");}
    }
    public static String hash(String value) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
    }
}
