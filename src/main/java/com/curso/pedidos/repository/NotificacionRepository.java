package com.curso.pedidos.repository;

import com.curso.pedidos.entity.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificacionRepository extends JpaRepository<Notificacion, UUID> {
    List<Notificacion> findByPedidoId(UUID pedidoId);
    List<Notificacion> findByEstado(String estado);
}
