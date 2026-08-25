package com.curso.pedidos.repository;

import com.curso.pedidos.entity.EstadoPedido;
import com.curso.pedidos.entity.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, UUID> {
    Optional<Pedido> findByCodigoOrden(String codigoOrden);
    Optional<Pedido> findByMpPaymentId(String mpPaymentId);
    List<Pedido> findByEstudianteId(UUID estudianteId);
    List<Pedido> findByCursoIdAndEstado(UUID cursoId, EstadoPedido estado);
    List<Pedido> findByCursoDocenteIdAndEstado(UUID docenteId, EstadoPedido estado);
}
