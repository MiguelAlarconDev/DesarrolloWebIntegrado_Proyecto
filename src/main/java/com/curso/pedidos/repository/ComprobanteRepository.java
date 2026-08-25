package com.curso.pedidos.repository;

import com.curso.pedidos.entity.Comprobante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ComprobanteRepository extends JpaRepository<Comprobante, UUID> {
    Optional<Comprobante> findByPedidoId(UUID pedidoId);
}
