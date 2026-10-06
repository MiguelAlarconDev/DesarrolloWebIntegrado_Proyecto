package com.curso.gateway.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class ClientIpResolver {

    private final Set<String> trustedProxies;

    public ClientIpResolver(@Value("${security.trusted-proxies:${SECURITY_TRUSTED_PROXIES:127.0.0.1,0:0:0:0:0:0:0:1,::1}}") String trustedProxies) {
        this.trustedProxies = splitCsv(trustedProxies);
    }

    public String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        String forwardedFor = request.getHeader("X-Forwarded-For");

        if (forwardedFor != null && !forwardedFor.isBlank() && trustedProxies.contains(remoteAddr)) {
            return forwardedFor.split(",")[0].trim();
        }

        return remoteAddr;
    }

    private static Set<String> splitCsv(String value) {
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .collect(Collectors.toSet());
    }
}
