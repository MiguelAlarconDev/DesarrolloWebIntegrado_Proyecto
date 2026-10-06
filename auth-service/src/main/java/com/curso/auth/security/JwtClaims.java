package com.curso.auth.security;

import com.curso.auth.entity.RolUsuario;

import java.time.Instant;
import java.util.UUID;

public record JwtClaims(
        UUID userId,
        String correo,
        RolUsuario rol,
        Instant issuedAt,
        Instant expiration
) {
}
