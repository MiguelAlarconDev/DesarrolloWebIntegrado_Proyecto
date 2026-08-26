package com.curso.pedidos.controller;

import com.curso.pedidos.dto.CrearPedidoRequest;
import com.curso.pedidos.dto.PagarPedidoRequest;
import com.curso.pedidos.entity.Pedido;
import com.curso.pedidos.service.PedidoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService pedidoService;

    public PedidoController(PedidoService pedidoService) {
        this.pedidoService = pedidoService;
    }

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public Pedido checkout(@Valid @RequestBody CrearPedidoRequest request) {
        return pedidoService.crear(request);
    }

    @PutMapping("/{id}/pagar")
    public Pedido pagar(@PathVariable UUID id,
                        @RequestBody(required = false) PagarPedidoRequest request) {
        return pedidoService.pagar(id, request);
    }

    @PutMapping("/{id}/cancelar")
    public Pedido cancelar(@PathVariable UUID id) {
        return pedidoService.cancelar(id);
    }

    @GetMapping
    public List<Pedido> listar() {
        return pedidoService.listar();
    }

    @GetMapping("/{id}")
    public Pedido buscar(@PathVariable UUID id) {
        return pedidoService.buscarPorId(id);
    }

    @GetMapping("/estudiante/{estudianteId}")
    public List<Pedido> listarPorEstudiante(@PathVariable UUID estudianteId) {
        return pedidoService.listarPorEstudiante(estudianteId);
    }

    @GetMapping("/curso/{cursoId}/participantes")
    public List<Pedido> listarParticipantesPorCurso(@PathVariable UUID cursoId) {
        return pedidoService.listarParticipantesPorCurso(cursoId);
    }
}
