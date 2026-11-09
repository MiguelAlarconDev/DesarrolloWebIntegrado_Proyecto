package com.cursos.certificaciones;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity @Immutable @Table(name="aprobaciones_historial",schema="public")
public class RevisionAcademica {
    public enum Decision { APROBADO, NO_APROBADO, REVOCADO }
    @Id private UUID id;
    @Column(name="aprobacion_id",nullable=false) private UUID aprobacionId;
    private long version;
    @Column(name="docente_id",nullable=false) private UUID docenteId;
    @Enumerated(EnumType.STRING) @Column(length=20,nullable=false) private Decision decision;
    @Column(columnDefinition="text",nullable=false) private String justificacion;
    @Column(nullable=false) private Instant fecha;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition="jsonb",nullable=false) private String evidencia;
    @Column(name="revision_academica",nullable=false) private long revisionAcademica;
    @Column(name="evidencia_canonica",columnDefinition="text",nullable=false) private String evidenciaCanonica;
    @Column(name="evidencia_hash",length=64,nullable=false) private String evidenciaHash;
    @Column(nullable=false) private UUID idempotencia;
    @Column(name="solicitud_hash",length=64,nullable=false) private String solicitudHash;
    protected RevisionAcademica() {}
    public RevisionAcademica(UUID aprobacion,long version,UUID docente,Decision decision,String motivo,
            String evidencia,long revisionAcademica,String canonica,String hash,UUID clave,String solicitudHash) {
        id=UUID.randomUUID();aprobacionId=aprobacion;this.version=version;docenteId=docente;
        this.decision=decision;justificacion=motivo;fecha=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);this.evidencia=evidencia;this.revisionAcademica=revisionAcademica;evidenciaCanonica=canonica;
        evidenciaHash=hash;idempotencia=clave;this.solicitudHash=solicitudHash;
    }
    public UUID getId(){return id;}
    public UUID getAprobacionId(){return aprobacionId;}
    public long getVersion(){return version;}
    public UUID getDocenteId(){return docenteId;}
    public Decision getDecision(){return decision;}
    public String getJustificacion(){return justificacion;}
    public Instant getFecha(){return fecha;}
    public String getEvidencia(){return evidencia;}
    public String getEvidenciaHash(){return evidenciaHash;}
    public long getRevisionAcademica(){return revisionAcademica;}
    public String getEvidenciaCanonica(){return evidenciaCanonica;}
    public String getSolicitudHash(){return solicitudHash;}
}
