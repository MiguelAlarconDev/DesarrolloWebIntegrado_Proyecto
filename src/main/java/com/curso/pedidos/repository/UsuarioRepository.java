package com.curso.pedidos.repository;

import com.curso.pedidos.entity.RolUsuario;
import com.curso.pedidos.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    Optional<Usuario> findByCorreo(String correo);
    Optional<Usuario> findByDni(String dni);
    boolean existsByCorreo(String correo);
    boolean existsByDni(String dni);
    boolean existsByWhatsapp(String whatsapp);
    List<Usuario> findByRol(RolUsuario rol);
}
