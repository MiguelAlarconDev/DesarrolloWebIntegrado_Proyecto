package com.curso.pedidos.controller;

import com.curso.pedidos.dto.CambiarEstadoRequest;
import com.curso.pedidos.dto.CrearPedidoRequest;
import com.curso.pedidos.entity.Pedido;
import com.curso.pedidos.service.PedidoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService pedidoService;

    public PedidoController(PedidoService pedidoService) {
        this.pedidoService = pedidoService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Pedido crear(@Valid @RequestBody CrearPedidoRequest request) {
        return pedidoService.crear(request);
    }

    @GetMapping
    public List<Pedido> listar() {
        return pedidoService.listar();
    }

    @GetMapping("/{id}")
    public Pedido buscar(@PathVariable Long id) {
        return pedidoService.buscarPorId(id);
    }

    @PutMapping("/{id}/estado")
    public Pedido cambiarEstado(@PathVariable Long id,
                                @Valid @RequestBody CambiarEstadoRequest request) {
        return pedidoService.cambiarEstado(id, request.getEstado());
    }
}
