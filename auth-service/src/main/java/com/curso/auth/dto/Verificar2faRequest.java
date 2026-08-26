package com.curso.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class Verificar2faRequest {

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Formato de correo inválido")
    private String correo;

    @NotBlank(message = "El código 2FA es obligatorio")
    private String codigo2fa;

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getCodigo2fa() {
        return codigo2fa;
    }

    public void setCodigo2fa(String codigo2fa) {
        this.codigo2fa = codigo2fa;
    }
}
