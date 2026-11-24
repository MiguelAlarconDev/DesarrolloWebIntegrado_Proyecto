package com.curso.gateway.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.util.Arrays;
import java.util.List;

/**
 * Obtiene la IP real del cliente.
 * <p>
 * X-Forwarded-For solo se acepta si la conexion viene de un proxy de confianza
 * (SECURITY_TRUSTED_PROXIES: IPs exactas, rangos CIDR como 10.0.0.0/8, o "*").
 * La cadena se recorre de derecha a izquierda y se devuelve la primera IP que no es
 * un proxy de confianza: asi un cliente no puede falsificar su IP anteponiendo valores.
 * <p>
 * En la nube (Azure Container Apps, Cloud Run, Render, Railway) el balanceador agrega la IP
 * del cliente: configure el rango privado del balanceador, p. ej. 10.0.0.0/8,172.16.0.0/12,100.64.0.0/10.
 */
@Component
public class ClientIpResolver {

    private final List<String> trustedProxies;
    private final boolean trustAll;

    public ClientIpResolver(@Value("${security.trusted-proxies:${SECURITY_TRUSTED_PROXIES:127.0.0.1,0:0:0:0:0:0:0:1,::1}}") String trustedProxies) {
        this.trustedProxies = Arrays.stream(trustedProxies.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
        this.trustAll = this.trustedProxies.contains("*");
    }

    public String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        String forwardedFor = request.getHeader("X-Forwarded-For");

        if (forwardedFor == null || forwardedFor.isBlank() || !isTrusted(remoteAddr)) {
            return remoteAddr;
        }

        String[] hops = forwardedFor.split(",");
        for (int i = hops.length - 1; i >= 0; i--) {
            String hop = hops[i].trim();
            if (hop.isEmpty()) {
                continue;
            }
            if (i == 0 || !isTrusted(hop)) {
                return hop;
            }
        }
        return remoteAddr;
    }

    boolean isTrusted(String ip) {
        if (trustAll) {
            return true;
        }
        for (String entry : trustedProxies) {
            if (entry.contains("/") ? inCidr(ip, entry) : entry.equals(ip)) {
                return true;
            }
        }
        return false;
    }

    private static boolean inCidr(String ip, String cidr) {
        try {
            String[] parts = cidr.split("/");
            byte[] network = InetAddress.getByName(parts[0]).getAddress();
            byte[] address = literalAddress(ip);
            if (address == null || address.length != network.length) {
                return false;
            }
            int prefix = Integer.parseInt(parts[1]);
            for (int i = 0; i < network.length && prefix > 0; i++, prefix -= 8) {
                int mask = prefix >= 8 ? 0xFF : (0xFF << (8 - prefix)) & 0xFF;
                if ((network[i] & mask) != (address[i] & mask)) {
                    return false;
                }
            }
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    /** Solo literales IP: nunca resuelve nombres por DNS. */
    private static byte[] literalAddress(String ip) throws Exception {
        if (ip == null || !ip.matches("[0-9a-fA-F:.]+")) {
            return null;
        }
        return InetAddress.getByName(ip).getAddress();
    }
}
