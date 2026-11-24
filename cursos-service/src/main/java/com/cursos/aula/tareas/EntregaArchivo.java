package com.cursos.aula.tareas;
import com.cursos.aula.Material;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="aula_entrega_archivos", schema="public")
public class EntregaArchivo {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(name="entrega_id",nullable=false,unique=true) private UUID entregaId;
    @Column(name="object_key",nullable=false,unique=true,length=500) private String objectKey;
    @Column(name="nombre_original",nullable=false,length=255) private String nombreOriginal;
    @Column(name="mime_type",nullable=false,length=100) private String mimeType;
    @Column(name="tamano_bytes",nullable=false) private long tamanoBytes;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=10) private Material.Tipo tipo;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private Material.Estado estado=Material.Estado.PENDIENTE;
    @Column(name="created_at",nullable=false,updatable=false) private Instant createdAt=Instant.now();
    @Version @Column(nullable=false) private long version;
    protected EntregaArchivo(){}
    public EntregaArchivo(UUID entregaId, String key, com.cursos.aula.ValidadorArchivo.Resultado archivo, long bytes) {
        this.entregaId = entregaId;
        reemplazar(key, archivo, bytes);
    }
    public void reemplazar(String key, com.cursos.aula.ValidadorArchivo.Resultado archivo, long bytes) {
        objectKey = key;
        nombreOriginal = archivo.nombreSeguro();
        mimeType = archivo.mimeType();
        tipo = archivo.tipo();
        tamanoBytes = bytes;
        estado = Material.Estado.ACTIVO;
    }
    public UUID getId(){return id;}
    public String getObjectKey(){return objectKey;}
    public String getNombreOriginal(){return nombreOriginal;}
    public String getMimeType(){return mimeType;}
    public long getTamanoBytes(){return tamanoBytes;}
    public Material.Tipo getTipo(){return tipo;}
    public Material.Estado getEstado(){return estado;}
}
