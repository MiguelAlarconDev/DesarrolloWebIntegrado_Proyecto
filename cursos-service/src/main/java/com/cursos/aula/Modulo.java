package com.cursos.aula;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "curso_modulos", schema = "public")
public class Modulo {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "curso_id", nullable = false)
    private UUID cursoId;
    @Column(nullable = false, length = 150)
    private String titulo;
    @Column(nullable = false)
    private int orden;

    protected Modulo() {}
    public Modulo(UUID cursoId, String titulo, int orden) {
        this.cursoId = cursoId;
        editar(titulo, orden);
    }
    public void editar(String titulo, int orden) { this.titulo = titulo.strip(); this.orden = orden; }
    public UUID getId() { return id; }
    public UUID getCursoId() { return cursoId; }
    public String getTitulo() { return titulo; }
    public int getOrden() { return orden; }
}
