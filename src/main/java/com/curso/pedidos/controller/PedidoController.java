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

    // RF-05: Generación de Matrícula (Checkout) y reserva de vacante
    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public Pedido checkout(@Valid @RequestBody CrearPedidoRequest request) {
        return pedidoService.crear(request);
    }

    // RF-06, RF-14, RF-15: Confirmación de Pago (Simulación de Webhook o Pago Directo)
    @PutMapping("/{id}/pagar")
    public Pedido pagar(@PathVariable UUID id,
                        @RequestBody(required = false) PagarPedidoRequest request) {
        return pedidoService.pagar(id, request);
    }

    // Cancelación y liberación de vacante
    @PutMapping("/{id}/cancelar")
    public Pedido cancelar(@PathVariable UUID id) {
        return pedidoService.cancelar(id);
    }

    // RF-12: Monitoreo Transaccional Backoffice
    @GetMapping
    public List<Pedido> listar() {
        return pedidoService.listar();
    }

    @GetMapping("/{id}")
    public Pedido buscar(@PathVariable UUID id) {
        return pedidoService.buscarPorId(id);
    }

    // RF-07: Panel del Estudiante (Visualizar sus cursos activos y enlaces Zoom/Meet)
    @GetMapping("/estudiante/{estudianteId}")
    public List<Pedido> listarPorEstudiante(@PathVariable UUID estudianteId) {
        return pedidoService.listarPorEstudiante(estudianteId);
    }

    // RF-09: Portal Docente - Participantes pagados por curso
    @GetMapping("/curso/{cursoId}/participantes")
    public List<Pedido> listarParticipantesPorCurso(@PathVariable UUID cursoId) {
        return pedidoService.listarParticipantesPorCurso(cursoId);
    }

    // RF-08 / RF-09: Portal Docente - Participantes de todos sus cursos
    @GetMapping("/docente/{docenteId}/participantes")
    public List<Pedido> listarParticipantesPorDocente(@PathVariable UUID docenteId) {
        return pedidoService.listarParticipantesPorDocente(docenteId);
    }
}
