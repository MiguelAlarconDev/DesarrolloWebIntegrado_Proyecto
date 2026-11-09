package com.cursos.certificaciones;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;
import java.time.Instant;
import java.util.UUID;

@Entity @Immutable @Table(name="certificados_eventos",schema="public")
public class CertificadoEvento {
    public enum Tipo { EMISION_INICIADA, EMITIDO, FALLIDO }
    @Id private UUID id;
    @Column(name="certificado_id",nullable=false) private UUID certificadoId;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private Tipo evento;
    @Column(nullable=false) private UUID actor;
    @Column(length=500) private String detalle;
    @Column(nullable=false) private Instant fecha;
    protected CertificadoEvento() {}
    public CertificadoEvento(UUID certificado,Tipo evento,UUID actor,String detalle,Instant fecha) {
        id=UUID.randomUUID();certificadoId=certificado;this.evento=evento;this.actor=actor;
        this.detalle=detalle==null?null:detalle.substring(0,Math.min(500,detalle.length()));this.fecha=fecha;
    }
    public UUID getId(){return id;}
    public UUID getCertificadoId(){return certificadoId;}
    public Tipo getEvento(){return evento;}
    public UUID getActor(){return actor;}
    public String getDetalle(){return detalle;}
    public Instant getFecha(){return fecha;}
}
