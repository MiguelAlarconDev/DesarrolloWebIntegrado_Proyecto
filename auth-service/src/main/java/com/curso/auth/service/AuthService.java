package com.curso.auth.service;

import com.curso.auth.client.WhatsappOtpClient;
import com.curso.auth.dto.AuthResponse;
import com.curso.auth.dto.LoginRequest;
import com.curso.auth.dto.RegistroUsuarioRequest;
import com.curso.auth.dto.UsuarioResponse;
import com.curso.auth.dto.Verificar2faRequest;
import com.curso.auth.entity.RolUsuario;
import com.curso.auth.entity.Usuario;
import com.curso.auth.exception.AuthenticationException;
import com.curso.auth.repository.UsuarioRepository;
import com.curso.auth.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final WhatsappOtpClient whatsappOtpClient;

    public AuthService(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            WhatsappOtpClient whatsappOtpClient) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.whatsappOtpClient = whatsappOtpClient;
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
        usuario.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        usuario.setRol(request.getRol() != null ? request.getRol() : RolUsuario.ESTUDIANTE);

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
                jwtService.generateToken(guardado)
        );
    }

    public AuthResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo())
                .orElseThrow(() -> new AuthenticationException("Credenciales invalidas"));

        if (!passwordEncoder.matches(request.getPassword(), usuario.getPasswordHash())) {
            throw new AuthenticationException("Credenciales invalidas");
        }

        if (!Boolean.TRUE.equals(usuario.getIsActive())) {
            throw new IllegalStateException("La cuenta de usuario esta inactiva");
        }

        if (Boolean.TRUE.equals(usuario.getIs2faEnabled())) {
            String codigoOtp = generarOtp();
            usuario.setCodigo2fa(codigoOtp);
            usuario.setCodigo2faExpiraEn(LocalDateTime.now().plusMinutes(5));
            usuarioRepository.save(usuario);
            whatsappOtpClient.sendOtp(usuario.getWhatsapp(), codigoOtp);

            AuthResponse response = new AuthResponse();
            response.setMensaje("Se requiere verificacion 2FA. Revise el codigo enviado por WhatsApp (vigencia: 5 minutos).");
            response.setStatus("REQUIRES_2FA");
            response.setUsuarioId(usuario.getId());
            response.setNombres(usuario.getNombres() + " " + usuario.getApellidos());
            response.setCorreo(usuario.getCorreo());
            response.setRol(usuario.getRol());
            return response;
        }

        return new AuthResponse(
                "Inicio de sesion exitoso",
                "SUCCESS",
                usuario.getId(),
                usuario.getNombres() + " " + usuario.getApellidos(),
                usuario.getCorreo(),
                usuario.getRol(),
                jwtService.generateToken(usuario)
        );
    }

    public AuthResponse verificar2fa(Verificar2faRequest request) {
        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + request.getCorreo()));

        if (usuario.getCodigo2fa() == null || !usuario.getCodigo2fa().equals(request.getCodigo2fa().trim())) {
            throw new AuthenticationException("Codigo 2FA incorrecto");
        }

        if (usuario.getCodigo2faExpiraEn() == null || usuario.getCodigo2faExpiraEn().isBefore(LocalDateTime.now())) {
            usuario.setCodigo2fa(null);
            usuario.setCodigo2faExpiraEn(null);
            usuarioRepository.save(usuario);
            throw new AuthenticationException("El codigo 2FA ha expirado. Por favor inicie sesion nuevamente para generar uno nuevo.");
        }

        usuario.setCodigo2fa(null);
        usuario.setCodigo2faExpiraEn(null);
        usuarioRepository.save(usuario);

        return new AuthResponse(
                "Autenticacion 2FA exitosa. Acceso concedido.",
                "SUCCESS",
                usuario.getId(),
                usuario.getNombres() + " " + usuario.getApellidos(),
                usuario.getCorreo(),
                usuario.getRol(),
                jwtService.generateToken(usuario)
        );
    }

    public List<UsuarioResponse> listarUsuarios() {
        return usuarioRepository.findAll().stream()
                .map(UsuarioResponse::from)
                .toList();
    }

    public UsuarioResponse buscarPorId(UUID id) {
        return usuarioRepository.findById(id)
                .map(UsuarioResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));
    }

    private String generarOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }
}
