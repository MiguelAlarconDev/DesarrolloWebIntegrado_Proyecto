package com.curso.pedidos.service;

import com.curso.pedidos.dto.CrearPedidoRequest;
import com.curso.pedidos.entity.EstadoPedido;
import com.curso.pedidos.entity.Pedido;
import com.curso.pedidos.repository.PedidoRepository;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
public class PedidoService {

    private final PedidoRepository pedidoRepository;

    public PedidoService(PedidoRepository pedidoRepository) {
        this.pedidoRepository = pedidoRepository;
    }

    public Pedido crear(CrearPedidoRequest request) {
        Pedido pedido = new Pedido();
        pedido.setNombreEstudiante(request.getNombreEstudiante());
        pedido.setCorreo(request.getCorreo());
        pedido.setTelefono(request.getTelefono());
        pedido.setCursoId(request.getCursoId());
        pedido.setNombreCurso(request.getNombreCurso());
        pedido.setEstado(EstadoPedido.REGISTRADO);

        Pedido guardado = pedidoRepository.save(pedido);
        avisarCambioEstado(guardado.getId(), null, guardado.getEstado());
        return guardado;
    }

    public List<Pedido> listar() {
        return pedidoRepository.findAll();
    }

    public Pedido buscarPorId(Long id) {
        return pedidoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Pedido no encontrado: " + id));
    }

    public Pedido cambiarEstado(Long id, EstadoPedido nuevoEstado) {
        Pedido pedido = buscarPorId(id);
        EstadoPedido actual = pedido.getEstado();

        if (actual == nuevoEstado) {
            throw new IllegalStateException("El pedido ya se encuentra en el estado " + nuevoEstado);
        }

        if (!transicionPermitida(actual, nuevoEstado)) {
            throw new IllegalStateException(
                    "Cambio de estado no permitido: " + actual + " -> " + nuevoEstado);
        }

        pedido.setEstado(nuevoEstado);
        Pedido actualizado = pedidoRepository.save(pedido);
        avisarCambioEstado(id, actual, nuevoEstado);
        return actualizado;
    }

    private boolean transicionPermitida(EstadoPedido actual, EstadoPedido nuevo) {
        return switch (actual) {
            case REGISTRADO -> EnumSet.of(EstadoPedido.PENDIENTE_PAGO, EstadoPedido.CANCELADO).contains(nuevo);
            case PENDIENTE_PAGO -> EnumSet.of(EstadoPedido.PAGADO, EstadoPedido.CANCELADO).contains(nuevo);
            case PAGADO -> EnumSet.of(EstadoPedido.CONFIRMADO, EstadoPedido.CANCELADO).contains(nuevo);
            case CONFIRMADO, CANCELADO -> false;
        };
    }

    private void avisarCambioEstado(Long pedidoId, EstadoPedido anterior, EstadoPedido nuevo) {
        if (anterior == null) {
            System.out.printf("[NOTIFICACION] Pedido %d creado con estado %s%n", pedidoId, nuevo);
        } else {
            System.out.printf("[NOTIFICACION] Pedido %d cambió de %s a %s%n", pedidoId, anterior, nuevo);
        }
    }
}
