package com.curso.auth.service;

import com.curso.auth.client.WhatsappOtpClient;
import com.curso.auth.dto.AuthResponse;
import com.curso.auth.dto.LoginRequest;
import com.curso.auth.dto.RegistroUsuarioRequest;
import com.curso.auth.dto.UsuarioResponse;
import com.curso.auth.dto.Verificar2faRequest;
import com.curso.auth.entity.RolUsuario;
import com.curso.auth.entity.Usuario;
import com.curso.auth.exception.AccountLockedException;
import com.curso.auth.exception.AuthenticationException;
import com.curso.auth.repository.UsuarioRepository;
import com.curso.auth.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    /** Intentos de contrasenia fallidos antes de bloquear la cuenta. */
    static final int MAX_INTENTOS_LOGIN = 5;
    /** Minutos que la cuenta queda bloqueada. */
    static final int MINUTOS_BLOQUEO = 15;
    /** Intentos de codigo 2FA antes de invalidar el codigo. */
    static final int MAX_INTENTOS_2FA = 5;

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
        return registrar(request, false);
    }

    /**
     * Registro de usuarios. Solo un ADMIN autenticado puede crear DOCENTE o ADMIN;
     * el registro publico siempre crea ESTUDIANTE (evita la escalada de privilegios).
     */
    public AuthResponse registrar(RegistroUsuarioRequest request, boolean solicitadoPorAdmin) {
        if (!solicitadoPorAdmin && request.getRol() != null && request.getRol() != RolUsuario.ESTUDIANTE) {
            throw new SecurityException("Solo un administrador puede registrar usuarios con rol " + request.getRol());
        }
        request.setCorreo(request.getCorreo().trim().toLowerCase());
        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            throw new IllegalStateException("Ya existe un usuario registrado con el correo: " + request.getCorreo());
        }
        if (usuarioRepository.existsByDni(request.getDni())) {
            throw new IllegalStateException("Ya existe un usuario registrado con el DNI: " + request.getDni());
        }
        if (usuarioRepository.existsByWhatsapp(request.getWhatsapp())) {
            throw new IllegalStateException("Ya existe un usuario registrado con el WhatsApp: " + request.getWhatsapp());
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
        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo().trim().toLowerCase())
                .or(() -> usuarioRepository.findByCorreo(request.getCorreo()))
                .orElseThrow(() -> new AuthenticationException("Credenciales invalidas"));

        if (usuario.getBloqueadoHasta() != null && usuario.getBloqueadoHasta().isAfter(LocalDateTime.now())) {
            throw new AccountLockedException("Cuenta bloqueada temporalmente por intentos fallidos. Intente despues de las "
                    + usuario.getBloqueadoHasta().toLocalTime().withNano(0) + ".");
        }

        if (!passwordEncoder.matches(request.getPassword(), usuario.getPasswordHash())) {
            int intentos = usuario.getIntentosFallidos() + 1;
            if (intentos >= MAX_INTENTOS_LOGIN) {
                usuario.setIntentosFallidos(0);
                usuario.setBloqueadoHasta(LocalDateTime.now().plusMinutes(MINUTOS_BLOQUEO));
                usuarioRepository.save(usuario);
                throw new AccountLockedException("Demasiados intentos fallidos. La cuenta se bloqueo por "
                        + MINUTOS_BLOQUEO + " minutos.");
            }
            usuario.setIntentosFallidos(intentos);
            usuarioRepository.save(usuario);
            throw new AuthenticationException("Credenciales invalidas");
        }

        usuario.setIntentosFallidos(0);
        usuario.setBloqueadoHasta(null);

        if (!Boolean.TRUE.equals(usuario.getIsActive())) {
            throw new IllegalStateException("La cuenta de usuario esta inactiva");
        }

        if (Boolean.TRUE.equals(usuario.getIs2faEnabled())) {
            String codigoOtp = generarOtp();
            usuario.setCodigo2fa(codigoOtp);
            usuario.setCodigo2faExpiraEn(LocalDateTime.now().plusMinutes(5));
            usuario.setIntentos2fa(0);
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

        usuarioRepository.save(usuario);
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
        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo().trim().toLowerCase())
                .or(() -> usuarioRepository.findByCorreo(request.getCorreo()))
                .orElseThrow(() -> new AuthenticationException("Codigo 2FA incorrecto"));

        if (usuario.getCodigo2fa() == null) {
            throw new AuthenticationException("No hay un codigo 2FA vigente. Inicie sesion nuevamente.");
        }

        if (!codigosIguales(usuario.getCodigo2fa(), request.getCodigo2fa().trim())) {
            int intentos = usuario.getIntentos2fa() + 1;
            if (intentos >= MAX_INTENTOS_2FA) {
                usuario.setCodigo2fa(null);
                usuario.setCodigo2faExpiraEn(null);
                usuario.setIntentos2fa(0);
                usuarioRepository.save(usuario);
                throw new AuthenticationException("Demasiados intentos. El codigo fue invalidado; inicie sesion nuevamente.");
            }
            usuario.setIntentos2fa(intentos);
            usuarioRepository.save(usuario);
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
        usuario.setIntentos2fa(0);
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

    private static boolean codigosIguales(String esperado, String recibido) {
        return MessageDigest.isEqual(esperado.getBytes(StandardCharsets.UTF_8), recibido.getBytes(StandardCharsets.UTF_8));
    }

    private String generarOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }
}
