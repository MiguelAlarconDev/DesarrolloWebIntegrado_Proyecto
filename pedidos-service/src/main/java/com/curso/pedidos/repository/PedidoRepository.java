package com.curso.pedidos.repository;

import com.curso.pedidos.entity.EstadoPedido;
import com.curso.pedidos.entity.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, UUID> {

    boolean existsByCursoIdAndEstudianteIdAndEstado(UUID cursoId, UUID estudianteId, EstadoPedido estado);

    Optional<Pedido> findByCodigoOrden(String codigoOrden);

    List<Pedido> findByEstudianteId(UUID estudianteId);

    List<Pedido> findByCursoIdAndEstado(UUID cursoId, EstadoPedido estado);

    List<Pedido> findByCursoId(UUID cursoId);

    /** Bloquea la fila (SELECT ... FOR UPDATE) para confirmar pagos sin carreras. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pedido p where p.id = :id")
    Optional<Pedido> findByIdForUpdate(@Param("id") UUID id);

    Optional<Pedido> findFirstByMpPaymentId(String mpPaymentId);
}
