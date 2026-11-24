package com.curso.auth.controller;

import com.curso.auth.dto.AuthResponse;
import com.curso.auth.entity.RolUsuario;
import com.curso.auth.exception.ForbiddenException;
import com.curso.auth.security.AccessPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import com.curso.auth.dto.LoginRequest;
import com.curso.auth.dto.RegistroUsuarioRequest;
import com.curso.auth.dto.UsuarioResponse;
import com.curso.auth.dto.Verificar2faRequest;
import com.curso.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")

public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registrar(@Valid @RequestBody RegistroUsuarioRequest request, HttpServletRequest http) {
        // El registro publico solo crea ESTUDIANTES; ADMIN/DOCENTE requiere un token ADMIN.
        if (request.getRol() != null && request.getRol() != RolUsuario.ESTUDIANTE) {
            AccessPrincipal principal = AccessPrincipal.fromOrNull(http);
            if (principal == null || !principal.isAdmin()) {
                throw new ForbiddenException("Solo un administrador puede crear cuentas " + request.getRol());
            }
        }
        AccessPrincipal caller = AccessPrincipal.fromOrNull(http);
        return authService.registrar(request, caller != null && caller.isAdmin());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/verificar-2fa")
    public AuthResponse verificar2fa(@Valid @RequestBody Verificar2faRequest request) {
        return authService.verificar2fa(request);
    }

    /** Datos del usuario autenticado (id tomado del JWT validado por JwtAuthFilter). */
    @GetMapping("/perfil")
    public UsuarioResponse perfil(HttpServletRequest http) {
        AccessPrincipal principal = AccessPrincipal.fromOrNull(http);
        if (principal == null || principal.isService()) {
            throw new com.curso.auth.exception.AuthenticationException("Sesion no valida");
        }
        return authService.buscarPorId(UUID.fromString(principal.subject()));
    }

    /** Reenvio del codigo 2FA (publico; limitado por el gateway como el login). */
    @PostMapping("/reenviar-2fa")
    public AuthResponse reenviar2fa(@RequestBody(required = false) java.util.Map<String, String> body) {
        return authService.reenviar2fa(body == null ? null : body.get("correo"));
    }

    /** Edicion de perfil: el propio usuario o un ADMIN (solo ADMIN cambia rol/estado/2FA). */
    @PutMapping("/usuarios/{id}")
    public UsuarioResponse actualizarUsuario(@PathVariable UUID id,
                                             @RequestBody com.curso.auth.dto.ActualizarPerfilRequest request,
                                             HttpServletRequest http) {
        AccessPrincipal principal = AccessPrincipal.fromOrNull(http);
        boolean esAdmin = principal != null && principal.isAdmin();
        if (principal == null || (!esAdmin && !principal.isUser(id))) {
            throw new ForbiddenException("Solo puedes editar tu propio perfil");
        }
        return authService.actualizarPerfil(id, request, esAdmin);
    }

    /** Baja logica (solo ADMIN): la cuenta queda inactiva y se conservan sus registros. */
    @DeleteMapping("/usuarios/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarUsuario(@PathVariable UUID id, HttpServletRequest http) {
        AccessPrincipal principal = AccessPrincipal.fromOrNull(http);
        if (principal == null || !principal.isAdmin()) {
            throw new ForbiddenException("Solo un administrador puede dar de baja usuarios");
        }
        authService.desactivarUsuario(id, UUID.fromString(principal.subject()));
    }

    @GetMapping("/usuarios")
    public List<UsuarioResponse> listarUsuarios() {
        return authService.listarUsuarios();
    }

    @GetMapping("/usuarios/{id}")
    public UsuarioResponse buscarUsuario(@PathVariable UUID id) {
        return authService.buscarPorId(id);
    }
}
