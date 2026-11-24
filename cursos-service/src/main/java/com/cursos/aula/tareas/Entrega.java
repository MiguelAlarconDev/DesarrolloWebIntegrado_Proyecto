package com.cursos.aula.tareas;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** One versioned submission per task/student. Grading remains outside E.3. */
@Entity @Table(name="aula_entregas", schema="public",
    uniqueConstraints=@UniqueConstraint(columnNames={"tarea_id","estudiante_id"}))
public class Entrega {
    public enum Estado { ENVIO_PENDIENTE, ENTREGADA, CALIFICADA }
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(name="tarea_id", nullable=false) private UUID tareaId;
    @Column(name="estudiante_id", nullable=false) private UUID estudianteId;
    @Column(columnDefinition="text") private String texto;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Estado estado=Estado.ENVIO_PENDIENTE;
    @Column(name="entregada_en") private Instant entregadaEn;
    @Column(precision=4,scale=2) private BigDecimal nota;
    @Column(columnDefinition="text") private String retroalimentacion;
    @Column(name="calificado_por") private UUID calificadoPor;
    @Column(name="calificada_en") private Instant calificadaEn;
    @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt=Instant.now();
    @Version @Column(nullable=false) private long version;
    protected Entrega(){}
    public Entrega(UUID tareaId, UUID estudianteId) {
        this.tareaId = tareaId;
        this.estudianteId = estudianteId;
    }
    public void entregar(String texto, Instant fecha) {
        this.texto = texto;
        this.entregadaEn = fecha;
        this.estado = Estado.ENTREGADA;
    }
    public UUID getId(){return id;}
    public UUID getTareaId(){return tareaId;}
    public UUID getEstudianteId(){return estudianteId;}
    public String getTexto(){return texto;}
    public Estado getEstado(){return estado;}
    public Instant getEntregadaEn(){return entregadaEn;}
    public long getVersion(){return version;}
    public BigDecimal getNota(){return nota;}
    public String getRetroalimentacion(){return retroalimentacion;}
    public Instant getCalificadaEn(){return calificadaEn;}
    public void calificar(BigDecimal nota, String retroalimentacion, UUID docente, Instant fecha) {
        this.nota = nota;
        this.retroalimentacion = retroalimentacion;
        this.calificadoPor = docente;
        this.calificadaEn = fecha;
        this.estado = Estado.CALIFICADA;
    }
}
