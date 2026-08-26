package com.curso.auth.service;

import com.curso.auth.dto.AuthResponse;
import com.curso.auth.dto.LoginRequest;
import com.curso.auth.dto.RegistroUsuarioRequest;
import com.curso.auth.dto.Verificar2faRequest;
import com.curso.auth.entity.RolUsuario;
import com.curso.auth.entity.Usuario;
import com.curso.auth.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;
import java.util.UUID;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;

    public AuthService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public AuthResponse registrar(RegistroUsuarioRequest request) {
        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            throw new IllegalArgumentException("Ya existe un usuario registrado con el correo: " + request.getCorreo());
        }
        if (usuarioRepository.existsByDni(request.getDni())) {
            throw new IllegalArgumentException("Ya existe un usuario registrado con el DNI: " + request.getDni());
        }
        if (usuarioRepository.existsByWhatsapp(request.getWhatsapp())) {
            throw new IllegalArgumentException("Ya existe un usuario registrado con el WhatsApp: " + request.getWhatsapp());
        }

        Usuario usuario = new Usuario();
        usuario.setDni(request.getDni());
        usuario.setNombres(request.getNombres());
        usuario.setApellidos(request.getApellidos());
        usuario.setCorreo(request.getCorreo());
        usuario.setWhatsapp(request.getWhatsapp());
        usuario.setPasswordHash(request.getPassword());
        usuario.setRol(request.getRol() != null ? request.getRol() : RolUsuario.ESTUDIANTE);

        // 2FA obligatorio para ADMIN y DOCENTE, opcional para ESTUDIANTE
        if (usuario.getRol() == RolUsuario.ADMIN || usuario.getRol() == RolUsuario.DOCENTE) {
            usuario.setIs2faEnabled(true);
        } else {
            usuario.setIs2faEnabled(request.getIs2faEnabled() != null && request.getIs2faEnabled());
        }

        Usuario guardado = usuarioRepository.save(usuario);

        return new AuthResponse(
                "Usuario registrado exitosamente",
                "SUCCESS",
                guardado.getId(),
                guardado.getNombres() + " " + guardado.getApellidos(),
                guardado.getCorreo(),
                guardado.getRol(),
                "TOKEN-REGISTRO-" + guardado.getId()
        );
    }

    public AuthResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo())
                .orElseThrow(() -> new IllegalArgumentException("Credenciales inválidas (correo no encontrado)"));

        if (!usuario.getPasswordHash().equals(request.getPassword())) {
            throw new IllegalArgumentException("Credenciales inválidas (contraseña incorrecta)");
        }

        if (!Boolean.TRUE.equals(usuario.getIsActive())) {
            throw new IllegalStateException("La cuenta de usuario está inactiva");
        }

        // 2FA si está habilitado
        if (Boolean.TRUE.equals(usuario.getIs2faEnabled())) {
            String codigoOtp = String.format("%06d", new Random().nextInt(999999));
            usuario.setCodigo2fa(codigoOtp);
            usuarioRepository.save(usuario);

            System.out.printf("[SEGURIDAD 2FA] Código OTP generado para %s: %s (Enviado al WhatsApp %s)%n",
                    usuario.getCorreo(), codigoOtp, usuario.getWhatsapp());

            AuthResponse response = new AuthResponse();
            response.setMensaje("Se requiere verificación 2FA. Ingrese el código OTP generado.");
            response.setStatus("REQUIRES_2FA");
            response.setUsuarioId(usuario.getId());
            response.setNombres(usuario.getNombres() + " " + usuario.getApellidos());
            response.setCorreo(usuario.getCorreo());
            response.setRol(usuario.getRol());
            response.setCodigo2faGenerado(codigoOtp);
            return response;
        }

        return new AuthResponse(
                "Inicio de sesión exitoso",
                "SUCCESS",
                usuario.getId(),
                usuario.getNombres() + " " + usuario.getApellidos(),
                usuario.getCorreo(),
                usuario.getRol(),
                "BEARER-TOKEN-" + usuario.getRol() + "-" + usuario.getId()
        );
    }

    public AuthResponse verificar2fa(Verificar2faRequest request) {
        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + request.getCorreo()));

        if (usuario.getCodigo2fa() == null || !usuario.getCodigo2fa().equals(request.getCodigo2fa().trim())) {
            throw new IllegalArgumentException("Código 2FA incorrecto o expirado");
        }

        usuario.setCodigo2fa(null);
        usuarioRepository.save(usuario);

        return new AuthResponse(
                "Autenticación 2FA exitosa. Acceso concedido.",
                "SUCCESS",
                usuario.getId(),
                usuario.getNombres() + " " + usuario.getApellidos(),
                usuario.getCorreo(),
                usuario.getRol(),
                "BEARER-TOKEN-2FA-" + usuario.getRol() + "-" + usuario.getId()
        );
    }

    public List<Usuario> listarUsuarios() {
        return usuarioRepository.findAll();
    }

    public Usuario buscarPorId(UUID id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));
    }
}
