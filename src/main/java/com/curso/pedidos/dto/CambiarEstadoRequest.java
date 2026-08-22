package com.curso.pedidos.dto;

import com.curso.pedidos.entity.EstadoPedido;
import jakarta.validation.constraints.NotNull;

public class CambiarEstadoRequest {

    @NotNull
    private EstadoPedido estado;

    public EstadoPedido getEstado() { return estado; }
    public void setEstado(EstadoPedido estado) { this.estado = estado; }
}
