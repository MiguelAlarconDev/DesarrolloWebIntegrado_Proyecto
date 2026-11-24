package com.cursos.aula;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Metadata only. No upload or storage credential is exposed by this entity. */
@Entity
@Table(name = "curso_materiales", schema = "public")
public class Material {
    public enum Tipo { PDF, DOCX, PPTX, ZIP }
    public enum Estado { PENDIENTE, ACTIVO, ELIMINACION_PENDIENTE }
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "modulo_id", nullable = false)
    private UUID moduloId;
    @Column(nullable = false, length = 200)
    private String titulo;
    @Column(name = "object_key", nullable = false, unique = true, length = 500)
    private String objectKey;
    @Column(name = "nombre_original", nullable = false, length = 255)
    private String nombreOriginal;
    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;
    @Column(name = "tamano_bytes", nullable = false)
    private long tamanoBytes;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10)
    private Tipo tipo;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private Estado estado = Estado.PENDIENTE;
    @Column(name = "creado_por", nullable = false)
    private UUID creadoPor;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Material() {}

    /** Nuevo material en estado PENDIENTE: no visible hasta confirmar la subida a Storage. */
    public Material(UUID moduloId, String titulo, String objectKey, String nombreOriginal, String mimeType,
                    long tamanoBytes, Tipo tipo, UUID creadoPor) {
        this.moduloId = moduloId;
        this.titulo = titulo;
        this.objectKey = objectKey;
        this.nombreOriginal = nombreOriginal;
        this.mimeType = mimeType;
        this.tamanoBytes = tamanoBytes;
        this.tipo = tipo;
        this.creadoPor = creadoPor;
        this.estado = Estado.PENDIENTE;
    }

    public void activar() { this.estado = Estado.ACTIVO; }
    public void marcarEliminacion() { this.estado = Estado.ELIMINACION_PENDIENTE; }
    public String getObjectKey() { return objectKey; }
    public Estado getEstado() { return estado; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getId() { return id; }
    public UUID getModuloId() { return moduloId; }
    public String getTitulo() { return titulo; }
    public String getNombreOriginal() { return nombreOriginal; }
    public String getMimeType() { return mimeType; }
    public long getTamanoBytes() { return tamanoBytes; }
    public Tipo getTipo() { return tipo; }
}
