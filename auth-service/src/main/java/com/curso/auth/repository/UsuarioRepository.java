package com.curso.auth.repository;

import com.curso.auth.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByCorreo(String correo);

    Optional<Usuario> findByDni(String dni);

    boolean existsByCorreo(String correo);

    boolean existsByDni(String dni);

    boolean existsByWhatsapp(String whatsapp);
}
