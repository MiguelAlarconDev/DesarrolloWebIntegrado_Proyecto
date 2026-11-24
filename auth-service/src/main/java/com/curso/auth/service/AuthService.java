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
import org.springframework.beans.factory.annotation.Autowired;
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
    private final NotificacionEmailAuthService notificacionEmailAuthService;

    public AuthService(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            WhatsappOtpClient whatsappOtpClient) {
        this(usuarioRepository, passwordEncoder, jwtService, whatsappOtpClient, null);
    }

    @Autowired
    public AuthService(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            WhatsappOtpClient whatsappOtpClient,
            @Autowired(required = false) NotificacionEmailAuthService notificacionEmailAuthService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.whatsappOtpClient = whatsappOtpClient;
        this.notificacionEmailAuthService = notificacionEmailAuthService;
    }

    public AuthResponse registrar(RegistroUsuarioRequest request) {
        return registrar(request, false);
    }

    /**
     * Registro de usuarios. Solo un ADMIN autenticado puede crear DOCENTE o ADMIN;
     * el registro publico siempre crea ESTUDIANTE (defensa en profundidad, ademas del controlador).
     */
    public AuthResponse registrar(RegistroUsuarioRequest request, boolean solicitadoPorAdmin) {
        if (!solicitadoPorAdmin && request.getRol() != null && request.getRol() != RolUsuario.ESTUDIANTE) {
            throw new com.curso.auth.exception.ForbiddenException("Solo un administrador puede crear cuentas " + request.getRol());
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

        // Envío automático de correo de bienvenida si SMTP está configurado
        if (notificacionEmailAuthService != null) {
            notificacionEmailAuthService.enviarBienvenidaRegistro(guardado);
        }

        return completarPerfil(new AuthResponse(
                "Usuario registrado exitosamente",
                "SUCCESS",
                guardado.getId(),
                guardado.getNombres(),
                guardado.getCorreo(),
                guardado.getRol(),
                jwtService.generateToken(guardado)
        ), guardado);
    }

    public AuthResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo().trim().toLowerCase())
                .or(() -> usuarioRepository.findByCorreo(request.getCorreo()))
                .orElseThrow(() -> new AuthenticationException("Credenciales invalidas"));

        if (usuario.getBloqueadoHasta() != null && usuario.getBloqueadoHasta().isAfter(LocalDateTime.now())) {
            throw new AccountLockedException("Cuenta bloqueada temporalmente por intentos fallidos. Intente despues de las "
                    + usuario.getBloqueadoHasta().toLocalTime().withNano(0) + ".");
        }

        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), usuario.getPasswordHash());
        if (!passwordMatches) {
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
            try {
                whatsappOtpClient.sendOtp(usuario.getWhatsapp(), codigoOtp);
            } catch (com.curso.auth.exception.ServiceUnavailableException ex) {
                usuario.setCodigo2fa(null);
                usuario.setCodigo2faExpiraEn(null);
                usuarioRepository.save(usuario);
                throw ex;
            }

            AuthResponse response = new AuthResponse();
            response.setMensaje("Se requiere verificacion 2FA. Revise el codigo enviado por WhatsApp (vigencia: 5 minutos).");
            response.setStatus("REQUIRES_2FA");
            response.setUsuarioId(usuario.getId());
            response.setNombres(usuario.getNombres());
            completarPerfil(response, usuario);
            response.setCorreo(usuario.getCorreo());
            response.setRol(usuario.getRol());
            return response;
        }

        usuarioRepository.save(usuario);
        return completarPerfil(new AuthResponse(
                "Inicio de sesion exitoso",
                "SUCCESS",
                usuario.getId(),
                usuario.getNombres(),
                usuario.getCorreo(),
                usuario.getRol(),
                jwtService.generateToken(usuario)
        ), usuario);
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

        return completarPerfil(new AuthResponse(
                "Autenticacion 2FA exitosa. Acceso concedido.",
                "SUCCESS",
                usuario.getId(),
                usuario.getNombres(),
                usuario.getCorreo(),
                usuario.getRol(),
                jwtService.generateToken(usuario)
        ), usuario);
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

    /** Agrega apellidos, DNI y WhatsApp a la respuesta (el frontend arma el perfil con ellos). */
    private static AuthResponse completarPerfil(AuthResponse response, Usuario usuario) {
        response.setApellidos(usuario.getApellidos());
        response.setDni(usuario.getDni());
        response.setWhatsapp(usuario.getWhatsapp());
        return response;
    }

    /**
     * Reenvia un codigo 2FA solo si hay un inicio de sesion pendiente (el usuario ya paso la
     * contrasenia). Respuesta identica exista o no la cuenta, para no revelar correos registrados.
     */
    public AuthResponse reenviar2fa(String correo) {
        AuthResponse response = new AuthResponse();
        response.setStatus("REQUIRES_2FA");
        response.setMensaje("Si hay un inicio de sesion pendiente, enviamos un nuevo codigo a tu WhatsApp (vigencia: 5 minutos).");
        if (correo == null || correo.isBlank()) {
            return response;
        }
        usuarioRepository.findByCorreo(correo.trim().toLowerCase()).ifPresent(usuario -> {
            boolean pendiente = Boolean.TRUE.equals(usuario.getIs2faEnabled()) && usuario.getCodigo2fa() != null;
            boolean bloqueada = usuario.getBloqueadoHasta() != null && usuario.getBloqueadoHasta().isAfter(LocalDateTime.now());
            if (!pendiente || bloqueada) {
                return;
            }
            String codigoOtp = generarOtp();
            usuario.setCodigo2fa(codigoOtp);
            usuario.setCodigo2faExpiraEn(LocalDateTime.now().plusMinutes(5));
            usuario.setIntentos2fa(0);
            usuarioRepository.save(usuario);
            whatsappOtpClient.sendOtp(usuario.getWhatsapp(), codigoOtp);
        });
        return response;
    }

    /**
     * Edicion de perfil. El propio usuario puede cambiar sus datos personales y su contrasenia;
     * solo un ADMIN puede cambiar rol, estado, 2FA o datos de otra cuenta.
     */
    public UsuarioResponse actualizarPerfil(UUID id, com.curso.auth.dto.ActualizarPerfilRequest request, boolean esAdmin) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));
        if (notBlank(request.getNombres())) {
            usuario.setNombres(limitar(request.getNombres(), 100));
        }
        if (notBlank(request.getApellidos())) {
            usuario.setApellidos(limitar(request.getApellidos(), 100));
        }
        if (notBlank(request.getDni())) {
            String nuevoDni = request.getDni().trim();
            if (!nuevoDni.matches("^[0-9A-Za-z]{8,15}$")) {
                throw new IllegalArgumentException("El DNI debe tener entre 8 y 15 letras o numeros");
            }
            if (!nuevoDni.equalsIgnoreCase(usuario.getDni()) && usuarioRepository.existsByDni(nuevoDni)) {
                throw new IllegalStateException("Ya existe otro usuario registrado con el DNI: " + nuevoDni);
            }
            usuario.setDni(nuevoDni);
        }
        if (notBlank(request.getWhatsapp())) {
            String nuevoWa = request.getWhatsapp().replaceAll("\\s", "");
            if (!nuevoWa.matches("^\\+?[0-9]{9,15}$")) {
                throw new IllegalArgumentException("WhatsApp debe tener entre 9 y 15 digitos, con codigo de pais");
            }
            if (!nuevoWa.equals(usuario.getWhatsapp()) && usuarioRepository.existsByWhatsapp(nuevoWa)) {
                throw new IllegalStateException("Ya existe otro usuario registrado con el WhatsApp: " + nuevoWa);
            }
            usuario.setWhatsapp(nuevoWa);
        }
        if (notBlank(request.getCorreo())) {
            String nuevoCorreo = request.getCorreo().trim().toLowerCase();
            if (!nuevoCorreo.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
                throw new IllegalArgumentException("Formato de correo invalido");
            }
            if (!nuevoCorreo.equalsIgnoreCase(usuario.getCorreo()) && usuarioRepository.existsByCorreo(nuevoCorreo)) {
                throw new IllegalStateException("Ya existe otro usuario registrado con el correo: " + nuevoCorreo);
            }
            usuario.setCorreo(nuevoCorreo);
        }
        if (notBlank(request.getPassword())) {
            String clave = request.getPassword();
            if (clave.length() < 8 || clave.length() > 72 || !clave.matches(".*[A-Za-z].*") || !clave.matches(".*[0-9].*")) {
                throw new IllegalArgumentException("La contrasenia debe tener entre 8 y 72 caracteres y combinar letras y numeros");
            }
            usuario.setPasswordHash(passwordEncoder.encode(clave));
        }
        boolean cambiaPrivilegios = notBlank(request.getRol()) || request.getIsActive() != null || request.getIs2faEnabled() != null;
        if (cambiaPrivilegios && !esAdmin) {
            throw new com.curso.auth.exception.ForbiddenException("Solo un administrador puede cambiar rol, estado o doble factor");
        }
        if (notBlank(request.getRol())) {
            try {
                usuario.setRol(RolUsuario.valueOf(request.getRol().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Rol invalido: " + request.getRol());
            }
        }
        if (request.getIsActive() != null) {
            usuario.setIsActive(request.getIsActive());
        }
        if (request.getIs2faEnabled() != null) {
            usuario.setIs2faEnabled(request.getIs2faEnabled());
        }
        // Docentes y administradores siempre con doble factor
        if (usuario.getRol() == RolUsuario.ADMIN || usuario.getRol() == RolUsuario.DOCENTE) {
            usuario.setIs2faEnabled(true);
        }
        return UsuarioResponse.from(usuarioRepository.save(usuario));
    }

    /**
     * Baja de usuario: se desactiva la cuenta (no se borran pedidos, pagos ni comprobantes,
     * que son registros contables). No se permite dar de baja la propia cuenta.
     */
    public void desactivarUsuario(UUID id, UUID solicitante) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));
        if (id.equals(solicitante)) {
            throw new IllegalStateException("No puedes desactivar tu propia cuenta");
        }
        usuario.setIsActive(false);
        usuario.setCodigo2fa(null);
        usuario.setCodigo2faExpiraEn(null);
        usuarioRepository.save(usuario);
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String limitar(String value, int max) {
        String t = value.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }

    private static boolean codigosIguales(String esperado, String recibido) {
        return MessageDigest.isEqual(esperado.getBytes(StandardCharsets.UTF_8), recibido.getBytes(StandardCharsets.UTF_8));
    }

    private String generarOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }
}
