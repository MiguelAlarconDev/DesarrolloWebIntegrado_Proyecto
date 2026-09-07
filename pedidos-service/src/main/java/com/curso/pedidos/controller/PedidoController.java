package com.curso.pedidos.controller;

import com.curso.pedidos.dto.CrearPedidoRequest;
import com.curso.pedidos.dto.PagarPedidoRequest;
import com.curso.pedidos.entity.Pedido;
import com.curso.pedidos.service.PedidoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService pedidoService;

    public PedidoController(PedidoService pedidoService) {
        this.pedidoService = pedidoService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(
            @RequestParam(value = "type", required = false) String paramType,
            @RequestParam(value = "topic", required = false) String topic,
            @RequestParam(value = "data.id", required = false) String paramDataId,
            @RequestParam(value = "id", required = false) String paramId,
            @RequestBody(required = false) Map<String, Object> body) {

        String paymentId = null;
        String type = paramType != null ? paramType : topic;

        if (body != null) {
            if (body.get("type") != null) {
                type = body.get("type").toString();
            }
            if (body.get("data") instanceof Map<?, ?> dataMap) {
                Object idObj = dataMap.get("id");
                if (idObj != null) {
                    paymentId = idObj.toString();
                }
            }
        }

        if (paymentId == null) {
            paymentId = paramDataId != null ? paramDataId : paramId;
        }

        if (paymentId != null && ("payment".equalsIgnoreCase(type) || type == null)) {
            Pedido pedido = pedidoService.procesarPagoMercadoPago(paymentId);
            if (pedido != null) {
                return ResponseEntity.ok("Pago " + paymentId + " procesado exitosamente para el pedido " + pedido.getId());
            }
            return ResponseEntity.ok("Pago " + paymentId + " consultado pero aún no se encuentra aprobado.");
        }

        return ResponseEntity.ok("Evento ignorado (tipo: " + type + ")");
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
