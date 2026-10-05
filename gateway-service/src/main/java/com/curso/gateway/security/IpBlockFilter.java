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
@Order(1)
public class IpBlockFilter extends OncePerRequestFilter {

    private final ClientIpResolver clientIpResolver;
    private final Set<String> blockedIps;

    public IpBlockFilter(
            ClientIpResolver clientIpResolver,
            @Value("${security.blocked-ips:${SECURITY_BLOCKED_IPS:}}") String blockedIps) {
        this.clientIpResolver = clientIpResolver;
        this.blockedIps = Arrays.stream(blockedIps.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .collect(Collectors.toSet());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String clientIp = clientIpResolver.resolve(request);
        if (blockedIps.contains(clientIp)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "IP bloqueada");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
