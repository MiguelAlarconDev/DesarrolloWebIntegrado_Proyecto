package com.cursos.aula.tareas;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="aula_tareas", schema="public")
public class Tarea {
    public enum TipoEntrega { TEXTO, ARCHIVO, AMBOS }
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(name="modulo_id", nullable=false) private UUID moduloId;
    @Column(nullable=false, length=200) private String titulo;
    @Column(nullable=false, columnDefinition="text") private String consigna;
    @Column(name="fecha_limite", nullable=false) private Instant fechaLimite;
    @Enumerated(EnumType.STRING) @Column(name="tipo_entrega", nullable=false, length=10) private TipoEntrega tipoEntrega;
    @Column(name="creado_por", nullable=false, updatable=false) private UUID creadoPor;
    @Column(name="created_at", nullable=false, updatable=false) private Instant createdAt=Instant.now();
    @Version @Column(nullable=false) private long version;
    protected Tarea() {}
    public Tarea(UUID moduloId, String titulo, String consigna, Instant fechaLimite, TipoEntrega tipo, UUID autor) {
        this.moduloId=moduloId; this.creadoPor=autor; editar(titulo, consigna, fechaLimite, tipo);
    }
    public void editar(String titulo, String consigna, Instant fecha, TipoEntrega tipo) {
        this.titulo=titulo.strip(); this.consigna=consigna.strip(); this.fechaLimite=fecha; this.tipoEntrega=tipo;
    }
    public UUID getId(){return id;}
    public UUID getModuloId(){return moduloId;}
    public String getTitulo(){return titulo;}
    public String getConsigna(){return consigna;}
    public Instant getFechaLimite(){return fechaLimite;}
    public TipoEntrega getTipoEntrega(){return tipoEntrega;}
    public long getVersion(){return version;}
}
