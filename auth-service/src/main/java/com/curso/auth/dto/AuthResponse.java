package com.curso.auth.dto;

import com.curso.auth.entity.RolUsuario;
import java.util.UUID;

public class AuthResponse {

    private String mensaje;
    private String status; // "SUCCESS", "REQUIRES_2FA", "ERROR"
    private UUID usuarioId;
    private String nombres;
    private String correo;
    private RolUsuario rol;
    private String token;
    private String codigo2faGenerado;

    public AuthResponse() {
    }

    public AuthResponse(String mensaje, String status, UUID usuarioId, String nombres, String correo, RolUsuario rol, String token) {
        this.mensaje = mensaje;
        this.status = status;
        this.usuarioId = usuarioId;
        this.nombres = nombres;
        this.correo = correo;
        this.rol = rol;
        this.token = token;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public UUID getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(UUID usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getNombres() {
        return nombres;
    }

    public void setNombres(String nombres) {
        this.nombres = nombres;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public RolUsuario getRol() {
        return rol;
    }

    public void setRol(RolUsuario rol) {
        this.rol = rol;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getCodigo2faGenerado() {
        return codigo2faGenerado;
    }

    public void setCodigo2faGenerado(String codigo2faGenerado) {
        this.codigo2faGenerado = codigo2faGenerado;
    }
}
