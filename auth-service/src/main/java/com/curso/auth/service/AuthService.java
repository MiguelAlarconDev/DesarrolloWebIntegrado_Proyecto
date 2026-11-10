package com.curso.auth.service;

import com.curso.auth.client.WhatsAppClient;
import com.curso.auth.dto.AuthResponse;
import com.curso.auth.dto.LoginRequest;
import com.curso.auth.dto.RegistroUsuarioRequest;
import com.curso.auth.dto.Verificar2faRequest;
import com.curso.auth.entity.RolUsuario;
import com.curso.auth.entity.Usuario;
import com.curso.auth.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.UUID;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final WhatsAppClient whatsAppClient;
    private final EntityManager entityManager;

    public AuthService(UsuarioRepository usuarioRepository, WhatsAppClient whatsAppClient, EntityManager entityManager) {
        this.usuarioRepository = usuarioRepository;
        this.whatsAppClient = whatsAppClient;
        this.entityManager = entityManager;
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

        AuthResponse resReg = new AuthResponse(
                "Usuario registrado exitosamente",
                "SUCCESS",
                guardado.getId(),
                guardado.getNombres(),
                guardado.getCorreo(),
                guardado.getRol(),
                "TOKEN-REGISTRO-" + guardado.getId()
        );
        resReg.setApellidos(guardado.getApellidos());
        resReg.setDni(guardado.getDni());
        resReg.setWhatsapp(guardado.getWhatsapp());
        return resReg;
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
            usuario.setCodigo2faExpiraEn(LocalDateTime.now().plusMinutes(5)); // Válido por 5 minutos
            usuarioRepository.save(usuario);

            // Enviar mensaje real a WhatsApp a través de Green-API
            String portalNombre = usuario.getRol() == RolUsuario.ADMIN ? "Panel de Administrador" : "Portal Docente";
            String msg = String.format("Plataforma de Cursos: Tu código de verificación 2FA para el %s es: %s. Válido por 5 minutos.", portalNombre, codigoOtp);
            boolean enviado = whatsAppClient.enviarMensaje(usuario.getWhatsapp(), msg);

            System.out.printf("[2FA - WHATSAPP GREEN-API] Envío a %s (%s): %s | Código OTP: %s%n",
                    usuario.getWhatsapp(), usuario.getNombres(), enviado ? "EXITOSO" : "FALLIDO", codigoOtp);

            AuthResponse response = new AuthResponse();
            response.setMensaje("Hemos enviado un código de 6 dígitos a tu WhatsApp oficial (" + usuario.getWhatsapp() + "). Revisa tu teléfono e ingrésalo a continuación.");
            response.setStatus("REQUIRES_2FA");
            response.setUsuarioId(usuario.getId());
            response.setNombres(usuario.getNombres() + " " + usuario.getApellidos());
            response.setCorreo(usuario.getCorreo());
            response.setRol(usuario.getRol());
            // NO se envía el código en la respuesta JSON para que el docente lo revise en su WhatsApp
            response.setCodigo2faGenerado(null);
            response.setWhatsapp(usuario.getWhatsapp());
            response.setDni(usuario.getDni());
            return response;
        }

        AuthResponse resLog = new AuthResponse(
                "Inicio de sesión exitoso",
                "SUCCESS",
                usuario.getId(),
                usuario.getNombres(),
                usuario.getCorreo(),
                usuario.getRol(),
                "BEARER-TOKEN-" + usuario.getRol() + "-" + usuario.getId()
        );
        resLog.setApellidos(usuario.getApellidos());
        resLog.setDni(usuario.getDni());
        resLog.setWhatsapp(usuario.getWhatsapp());
        return resLog;
    }

    public AuthResponse reenviar2fa(String correo) {
        if (correo == null || correo.isBlank()) {
            throw new IllegalArgumentException("Correo obligatorio para reenviar código 2FA");
        }
        Usuario usuario = usuarioRepository.findByCorreo(correo.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con correo: " + correo));

        String codigoOtp = String.format("%06d", new Random().nextInt(999999));
        usuario.setCodigo2fa(codigoOtp);
        usuario.setCodigo2faExpiraEn(LocalDateTime.now().plusMinutes(5));
        usuarioRepository.save(usuario);

        // Reenviar mensaje real a WhatsApp
        String portalNombre = usuario.getRol() == RolUsuario.ADMIN ? "Panel de Administrador" : "Portal Docente";
        String msg = String.format("Plataforma de Cursos: Tu NUEVO código de verificación 2FA para el %s es: %s. Válido por 5 minutos.", portalNombre, codigoOtp);
        boolean enviado = whatsAppClient.enviarMensaje(usuario.getWhatsapp(), msg);

        System.out.printf("[2FA - RE-ENVÍO WHATSAPP GREEN-API] Envío a %s (%s): %s | Código OTP: %s%n",
                usuario.getWhatsapp(), usuario.getNombres(), enviado ? "EXITOSO" : "FALLIDO", codigoOtp);

        AuthResponse response = new AuthResponse();
        response.setMensaje("Nuevo código 2FA enviado automáticamente a tu WhatsApp (" + usuario.getWhatsapp() + ").");
        response.setStatus("REQUIRES_2FA");
        response.setUsuarioId(usuario.getId());
        response.setNombres(usuario.getNombres() + " " + usuario.getApellidos());
        response.setCorreo(usuario.getCorreo());
        response.setRol(usuario.getRol());
        response.setCodigo2faGenerado(null);
        response.setWhatsapp(usuario.getWhatsapp());
        response.setDni(usuario.getDni());
        return response;
    }

    public AuthResponse verificar2fa(Verificar2faRequest request) {
        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + request.getCorreo()));

        if (usuario.getCodigo2fa() == null || !usuario.getCodigo2fa().equals(request.getCodigo2fa().trim())) {
            throw new IllegalArgumentException("Código 2FA incorrecto");
        }

        if (usuario.getCodigo2faExpiraEn() == null || usuario.getCodigo2faExpiraEn().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("El código 2FA ha expirado. Por favor solicita uno nuevo.");
        }

        usuario.setCodigo2fa(null);
        usuario.setCodigo2faExpiraEn(null);
        usuarioRepository.save(usuario);

        AuthResponse res2fa = new AuthResponse(
                "Autenticación 2FA exitosa. Acceso concedido.",
                "SUCCESS",
                usuario.getId(),
                usuario.getNombres(),
                usuario.getCorreo(),
                usuario.getRol(),
                "BEARER-TOKEN-2FA-" + usuario.getRol() + "-" + usuario.getId()
        );
        res2fa.setApellidos(usuario.getApellidos());
        res2fa.setDni(usuario.getDni());
        res2fa.setWhatsapp(usuario.getWhatsapp());
        return res2fa;
    }

    public List<Usuario> listarUsuarios() {
        return usuarioRepository.findAll();
    }

    public Usuario buscarPorId(UUID id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));
    }

    public Usuario actualizarPerfil(UUID id, com.curso.auth.dto.ActualizarPerfilRequest request) {
        Usuario usuario = buscarPorId(id);
        if (request.getNombres() != null && !request.getNombres().isBlank()) {
            usuario.setNombres(request.getNombres().trim());
        }
        if (request.getApellidos() != null && !request.getApellidos().isBlank()) {
            usuario.setApellidos(request.getApellidos().trim());
        }
        if (request.getDni() != null && !request.getDni().isBlank()) {
            String nuevoDni = request.getDni().trim();
            if (!nuevoDni.equalsIgnoreCase(usuario.getDni()) && usuarioRepository.existsByDni(nuevoDni)) {
                throw new IllegalStateException("Ya existe otro usuario registrado con el DNI: " + nuevoDni);
            }
            usuario.setDni(nuevoDni);
        }
        if (request.getWhatsapp() != null && !request.getWhatsapp().isBlank()) {
            usuario.setWhatsapp(request.getWhatsapp().trim());
        }
        if (request.getCorreo() != null && !request.getCorreo().isBlank()) {
            String nuevoCorreo = request.getCorreo().trim().toLowerCase();
            if (!nuevoCorreo.equalsIgnoreCase(usuario.getCorreo()) && usuarioRepository.existsByCorreo(nuevoCorreo)) {
                throw new IllegalStateException("Ya existe otro usuario registrado con el correo: " + nuevoCorreo);
            }
            usuario.setCorreo(nuevoCorreo);
        }
        if (request.getRol() != null && !request.getRol().isBlank()) {
            try {
                usuario.setRol(RolUsuario.valueOf(request.getRol().trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {
            }
        }
        if (request.getIs2faEnabled() != null) {
            usuario.setIs2faEnabled(request.getIs2faEnabled());
        }
        if (request.getIsActive() != null) {
            usuario.setIsActive(request.getIsActive());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            usuario.setPasswordHash(request.getPassword().trim());
        }
        return usuarioRepository.save(usuario);
    }

    @Transactional
    public void eliminarUsuario(UUID id) {
        Usuario usuario = buscarPorId(id);
        if ("admin@cursos.com".equalsIgnoreCase(usuario.getCorreo())) {
            throw new IllegalArgumentException("No se puede eliminar la cuenta principal del Administrador del Sistema.");
        }

        try {
            entityManager.createNativeQuery("DELETE FROM asistencias WHERE estudiante_id = :uid").setParameter("uid", id).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM calificaciones WHERE estudiante_id = :uid").setParameter("uid", id).executeUpdate();
            entityManager.createNativeQuery("DELETE FROM pedidos WHERE estudiante_id = :uid").setParameter("uid", id).executeUpdate();
            entityManager.createNativeQuery("UPDATE cursos SET docente_id = 'a0000000-0000-0000-0000-000000000002' WHERE docente_id = :uid").setParameter("uid", id).executeUpdate();
        } catch (Exception ex) {
            System.err.println("[AuthService] Advertencia al limpiar dependencias de usuario: " + ex.getMessage());
        }

        usuarioRepository.delete(usuario);
    }
}
