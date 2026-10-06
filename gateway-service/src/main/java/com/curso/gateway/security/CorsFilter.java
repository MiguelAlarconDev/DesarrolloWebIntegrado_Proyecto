package com.curso.gateway.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@Order(2)
public class CorsFilter extends OncePerRequestFilter {

    private static final String METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
    private static final String HEADERS = "Authorization,Content-Type,Accept";

    private final Set<String> allowedOrigins;
    private final boolean allowCredentials;

    public CorsFilter(
            @Value("${security.cors.allowed-origins:${CORS_ALLOWED_ORIGINS:http://localhost:3000,http://localhost:5173}}") String allowedOrigins,
            @Value("${security.cors.allow-credentials:${CORS_ALLOW_CREDENTIALS:true}}") boolean allowCredentials) {
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .collect(Collectors.toSet());
        this.allowCredentials = allowCredentials;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String origin = request.getHeader("Origin");
        if (origin != null && allowedOrigins.contains(origin)) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Vary", "Origin");
            response.setHeader("Access-Control-Allow-Methods", METHODS);
            response.setHeader("Access-Control-Allow-Headers", HEADERS);
            response.setHeader("Access-Control-Max-Age", "3600");
            if (allowCredentials) {
                response.setHeader("Access-Control-Allow-Credentials", "true");
            }
        }

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        filterChain.doFilter(request, response);
    }
}
