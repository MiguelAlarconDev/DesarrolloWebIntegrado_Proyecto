package com.curso.auth.controller;

import com.curso.auth.dto.AuthResponse;
import com.curso.auth.dto.LoginRequest;
import com.curso.auth.dto.RegistroUsuarioRequest;
import com.curso.auth.dto.Verificar2faRequest;
import com.curso.auth.entity.Usuario;
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
    public AuthResponse registrar(@Valid @RequestBody RegistroUsuarioRequest request) {
        return authService.registrar(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/verificar-2fa")
    public AuthResponse verificar2fa(@Valid @RequestBody Verificar2faRequest request) {
        return authService.verificar2fa(request);
    }

    @GetMapping("/usuarios")
    public List<Usuario> listarUsuarios() {
        return authService.listarUsuarios();
    }

    @GetMapping("/usuarios/{id}")
    public Usuario buscarUsuario(@PathVariable UUID id) {
        return authService.buscarPorId(id);
    }
}
