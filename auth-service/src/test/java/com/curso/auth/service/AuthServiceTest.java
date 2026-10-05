package com.curso.auth.service;

import com.curso.auth.client.WhatsappOtpClient;
import com.curso.auth.dto.AuthResponse;
import com.curso.auth.dto.LoginRequest;
import com.curso.auth.dto.RegistroUsuarioRequest;
import com.curso.auth.dto.Verificar2faRequest;
import com.curso.auth.entity.RolUsuario;
import com.curso.auth.entity.Usuario;
import com.curso.auth.exception.AuthenticationException;
import com.curso.auth.repository.UsuarioRepository;
import com.curso.auth.security.JwtClaims;
import com.curso.auth.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthServiceTest {

    private FakeUsuarioRepository usuarioRepository;
    private FakeWhatsappOtpClient whatsappOtpClient;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        usuarioRepository = new FakeUsuarioRepository();
        whatsappOtpClient = new FakeWhatsappOtpClient();
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = new JwtService(new ObjectMapper(), "test-secret-change-me-please-32-chars", 60);
        authService = new AuthService(usuarioRepository.proxy(), passwordEncoder, jwtService, whatsappOtpClient);
    }

    @Test
    void registroAlmacenaBCryptYNoPasswordPlano() {
        RegistroUsuarioRequest request = registroRequest("alumno@test.com", "password123", RolUsuario.ESTUDIANTE, false);

        AuthResponse response = authService.registrar(request);
        Usuario guardado = usuarioRepository.saved;

        assertThat(guardado.getPasswordHash()).isNotEqualTo("password123");
        assertThat(passwordEncoder.matches("password123", guardado.getPasswordHash())).isTrue();
        assertThat(response.getToken()).contains(".");
    }

    @Test
    void loginCorrectoDevuelveJwt() {
        Usuario usuario = usuario("alumno@test.com", RolUsuario.ESTUDIANTE, false);
        usuario.setPasswordHash(passwordEncoder.encode("password123"));
        usuarioRepository.usuarios.add(usuario);

        AuthResponse response = authService.login(loginRequest("alumno@test.com", "password123"));

        JwtClaims claims = jwtService.validateAndExtractClaims(response.getToken());
        assertThat(response.getStatus()).isEqualTo("SUCCESS");
        assertThat(claims.userId()).isEqualTo(usuario.getId());
        assertThat(claims.correo()).isEqualTo("alumno@test.com");
        assertThat(claims.rol()).isEqualTo(RolUsuario.ESTUDIANTE);
    }

    @Test
    void loginConPasswordIncorrectoRechaza() {
        Usuario usuario = usuario("alumno@test.com", RolUsuario.ESTUDIANTE, false);
        usuario.setPasswordHash(passwordEncoder.encode("password123"));
        usuarioRepository.usuarios.add(usuario);

        assertThatThrownBy(() -> authService.login(loginRequest("alumno@test.com", "otro-password")))
                .isInstanceOf(AuthenticationException.class);
    }

    @Test
    void loginCon2faNoEntregaJwtFinalYEnviaOtp() {
        Usuario usuario = usuario("docente@test.com", RolUsuario.DOCENTE, true);
        usuario.setPasswordHash(passwordEncoder.encode("password123"));
        usuarioRepository.usuarios.add(usuario);

        AuthResponse response = authService.login(loginRequest("docente@test.com", "password123"));

        assertThat(response.getStatus()).isEqualTo("REQUIRES_2FA");
        assertThat(response.getToken()).isNull();
        assertThat(usuario.getCodigo2fa()).matches("\\d{6}");
        assertThat(whatsappOtpClient.phone).isEqualTo("51999999999");
        assertThat(whatsappOtpClient.otp).isEqualTo(usuario.getCodigo2fa());
    }

    @Test
    void otpCorrectoDevuelveJwtEInvalidaCodigo() {
        Usuario usuario = usuario("docente@test.com", RolUsuario.DOCENTE, true);
        usuario.setCodigo2fa("123456");
        usuario.setCodigo2faExpiraEn(java.time.LocalDateTime.now().plusMinutes(5));
        usuarioRepository.usuarios.add(usuario);

        AuthResponse response = authService.verificar2fa(verificarRequest("docente@test.com", "123456"));

        assertThat(response.getStatus()).isEqualTo("SUCCESS");
        assertThat(response.getToken()).contains(".");
        assertThat(usuario.getCodigo2fa()).isNull();
        assertThat(usuario.getCodigo2faExpiraEn()).isNull();
    }

    @Test
    void otpIncorrectoRechaza() {
        Usuario usuario = usuario("docente@test.com", RolUsuario.DOCENTE, true);
        usuario.setCodigo2fa("123456");
        usuario.setCodigo2faExpiraEn(java.time.LocalDateTime.now().plusMinutes(5));
        usuarioRepository.usuarios.add(usuario);

        assertThatThrownBy(() -> authService.verificar2fa(verificarRequest("docente@test.com", "999999")))
                .isInstanceOf(AuthenticationException.class);
    }

    @Test
    void otpExpiradoRechazaEInvalidaCodigo() {
        Usuario usuario = usuario("docente@test.com", RolUsuario.DOCENTE, true);
        usuario.setCodigo2fa("123456");
        usuario.setCodigo2faExpiraEn(java.time.LocalDateTime.now().minusMinutes(1));
        usuarioRepository.usuarios.add(usuario);

        assertThatThrownBy(() -> authService.verificar2fa(verificarRequest("docente@test.com", "123456")))
                .isInstanceOf(AuthenticationException.class);
        assertThat(usuario.getCodigo2fa()).isNull();
        assertThat(usuario.getCodigo2faExpiraEn()).isNull();
    }

    @Test
    void jwtExpiradoRechaza() {
        JwtService expiredJwtService = new JwtService(new ObjectMapper(), "test-secret-change-me-please-32-chars", -1);
        Usuario usuario = usuario("alumno@test.com", RolUsuario.ESTUDIANTE, false);
        String token = expiredJwtService.generateToken(usuario);

        assertThatThrownBy(() -> jwtService.validateAndExtractClaims(token))
                .isInstanceOf(AuthenticationException.class);
    }

    @Test
    void jwtInvalidoRechaza() {
        assertThatThrownBy(() -> jwtService.validateAndExtractClaims("token.invalido"))
                .isInstanceOf(AuthenticationException.class);
    }

    private static RegistroUsuarioRequest registroRequest(String correo, String password, RolUsuario rol, boolean is2faEnabled) {
        RegistroUsuarioRequest request = new RegistroUsuarioRequest();
        request.setDni("12345678");
        request.setNombres("Alumno");
        request.setApellidos("Prueba");
        request.setCorreo(correo);
        request.setWhatsapp("51999999999");
        request.setPassword(password);
        request.setRol(rol);
        request.setIs2faEnabled(is2faEnabled);
        return request;
    }

    private static LoginRequest loginRequest(String correo, String password) {
        LoginRequest request = new LoginRequest();
        request.setCorreo(correo);
        request.setPassword(password);
        return request;
    }

    private static Verificar2faRequest verificarRequest(String correo, String codigo) {
        Verificar2faRequest request = new Verificar2faRequest();
        request.setCorreo(correo);
        request.setCodigo2fa(codigo);
        return request;
    }

    private static Usuario usuario(String correo, RolUsuario rol, boolean is2faEnabled) {
        Usuario usuario = new Usuario();
        usuario.setId(UUID.randomUUID());
        usuario.setDni(UUID.randomUUID().toString().substring(0, 8));
        usuario.setNombres("Usuario");
        usuario.setApellidos("Prueba");
        usuario.setCorreo(correo);
        usuario.setWhatsapp("51999999999");
        usuario.setRol(rol);
        usuario.setIs2faEnabled(is2faEnabled);
        usuario.setIsActive(true);
        return usuario;
    }

    private static class FakeWhatsappOtpClient extends WhatsappOtpClient {
        private String phone;
        private String otp;

        FakeWhatsappOtpClient() {
            super(RestClient.builder(), "http://localhost:8085");
        }

        @Override
        public void sendOtp(String phone, String otp) {
            this.phone = phone;
            this.otp = otp;
        }
    }

    private static class FakeUsuarioRepository {
        private final List<Usuario> usuarios = new ArrayList<>();
        private Usuario saved;

        UsuarioRepository proxy() {
            return (UsuarioRepository) Proxy.newProxyInstance(
                    UsuarioRepository.class.getClassLoader(),
                    new Class<?>[]{UsuarioRepository.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "existsByCorreo" -> usuarios.stream().anyMatch(usuario -> usuario.getCorreo().equals(args[0]));
                        case "existsByDni" -> usuarios.stream().anyMatch(usuario -> usuario.getDni().equals(args[0]));
                        case "existsByWhatsapp" -> usuarios.stream().anyMatch(usuario -> usuario.getWhatsapp().equals(args[0]));
                        case "findByCorreo" -> usuarios.stream().filter(usuario -> usuario.getCorreo().equals(args[0])).findFirst();
                        case "findById" -> usuarios.stream().filter(usuario -> usuario.getId().equals(args[0])).findFirst();
                        case "findAll" -> usuarios;
                        case "save" -> save((Usuario) args[0]);
                        default -> throw new UnsupportedOperationException("Metodo no soportado en prueba: " + method.getName());
                    }
            );
        }

        private Usuario save(Usuario usuario) {
            if (usuario.getId() == null) {
                usuario.setId(UUID.randomUUID());
            }
            saved = usuario;
            if (usuarios.stream().noneMatch(item -> item.getId().equals(usuario.getId()))) {
                usuarios.add(usuario);
            }
            return usuario;
        }
    }
}
