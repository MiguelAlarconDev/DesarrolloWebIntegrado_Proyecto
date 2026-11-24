package com.curso.gateway.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Proteccion por IP en memoria (capa 1 del gateway).
 * <ul>
 *   <li>Rate limit por minuto: general y uno mas estricto para endpoints de autenticacion.</li>
 *   <li>Bloqueo temporal automatico tras varios intentos fallidos de login/2FA (fuerza bruta).</li>
 *   <li>Bloqueo temporal automatico si una IP excede el rate limit de forma reiterada.</li>
 *   <li>Bloqueos manuales gestionados por un ADMIN desde /api/seguridad/bloqueos.</li>
 * </ul>
 * El estado vive en memoria: suficiente para una instancia de gateway. Con varias replicas
 * se reemplaza por Redis sin cambiar los filtros.
 */
@Component
public class IpProtectionService {

    private static final Logger log = LoggerFactory.getLogger(IpProtectionService.class);
    private static final int MAX_TRACKED_IPS = 50_000;

    public enum Bucket { GENERAL, AUTH }

    public record Bloqueo(String ip, Instant hasta, String motivo, boolean manual) {
    }

    private final Clock clock;
    private final int generalPerMinute;
    private final int authPerMinute;
    private final int maxAuthFailures;
    private final Duration failureWindow;
    private final Duration banDuration;
    private final int maxRateViolations;

    private final Map<String, Bloqueo> bans = new ConcurrentHashMap<>();
    private final Map<String, Window> rateWindows = new ConcurrentHashMap<>();
    private final Map<String, Window> authFailures = new ConcurrentHashMap<>();
    private final Map<String, Window> rateViolations = new ConcurrentHashMap<>();

    @org.springframework.beans.factory.annotation.Autowired
    public IpProtectionService(
            @Value("${security.rate-limit.general-per-minute:120}") int generalPerMinute,
            @Value("${security.rate-limit.auth-per-minute:10}") int authPerMinute,
            @Value("${security.brute-force.max-failures:5}") int maxAuthFailures,
            @Value("${security.brute-force.window-minutes:10}") long failureWindowMinutes,
            @Value("${security.ban.minutes:15}") long banMinutes,
            @Value("${security.ban.max-rate-violations:5}") int maxRateViolations) {
        this(Clock.systemUTC(), generalPerMinute, authPerMinute, maxAuthFailures,
                Duration.ofMinutes(failureWindowMinutes), Duration.ofMinutes(banMinutes), maxRateViolations);
    }

    IpProtectionService(Clock clock, int generalPerMinute, int authPerMinute, int maxAuthFailures,
                        Duration failureWindow, Duration banDuration, int maxRateViolations) {
        this.clock = clock;
        this.generalPerMinute = generalPerMinute;
        this.authPerMinute = authPerMinute;
        this.maxAuthFailures = maxAuthFailures;
        this.failureWindow = failureWindow;
        this.banDuration = banDuration;
        this.maxRateViolations = maxRateViolations;
    }

    public static IpProtectionService defaults() {
        return new IpProtectionService(Clock.systemUTC(), 120, 10, 5,
                Duration.ofMinutes(10), Duration.ofMinutes(15), 5);
    }

    public Bloqueo activeBan(String ip) {
        Bloqueo bloqueo = bans.get(ip);
        if (bloqueo == null) {
            return null;
        }
        if (!bloqueo.hasta().isAfter(now())) {
            bans.remove(ip);
            return null;
        }
        return bloqueo;
    }

    /** @return true si la solicitud esta dentro del limite. */
    public boolean tryAcquire(String ip, Bucket bucket) {
        int limit = bucket == Bucket.AUTH ? authPerMinute : generalPerMinute;
        if (limit <= 0) {
            return true;
        }
        evictIfTooLarge(rateWindows);
        Window window = rateWindows.compute(bucket + "|" + ip,
                (key, current) -> Window.increment(current, now(), Duration.ofMinutes(1)));
        if (window.count() <= limit) {
            return true;
        }
        Window violations = rateViolations.compute(ip,
                (key, current) -> Window.increment(current, now(), Duration.ofMinutes(10)));
        if (violations.count() >= maxRateViolations) {
            ban(ip, banDuration, "Exceso reiterado de solicitudes", false);
        }
        return false;
    }

    public void registerAuthFailure(String ip) {
        evictIfTooLarge(authFailures);
        Window window = authFailures.compute(ip, (key, current) -> Window.increment(current, now(), failureWindow));
        if (window.count() >= maxAuthFailures) {
            ban(ip, banDuration, "Demasiados intentos fallidos de autenticacion", false);
            authFailures.remove(ip);
        }
    }

    public void registerAuthSuccess(String ip) {
        authFailures.remove(ip);
    }

    public Bloqueo ban(String ip, Duration duration, String motivo, boolean manual) {
        Bloqueo bloqueo = new Bloqueo(ip, now().plus(duration), motivo, manual);
        bans.put(ip, bloqueo);
        log.warn("[SEGURIDAD] IP {} bloqueada hasta {}: {}", ip, bloqueo.hasta(), motivo);
        return bloqueo;
    }

    public boolean unban(String ip) {
        authFailures.remove(ip);
        rateViolations.remove(ip);
        return bans.remove(ip) != null;
    }

    public List<Bloqueo> activeBans() {
        List<Bloqueo> result = new ArrayList<>();
        for (String ip : List.copyOf(bans.keySet())) {
            Bloqueo bloqueo = activeBan(ip);
            if (bloqueo != null) {
                result.add(bloqueo);
            }
        }
        return result;
    }

    private Instant now() {
        return Instant.now(clock);
    }

    private void evictIfTooLarge(Map<String, Window> map) {
        if (map.size() > MAX_TRACKED_IPS) {
            Instant current = now();
            map.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(current));
            if (map.size() > MAX_TRACKED_IPS) {
                map.clear();
            }
        }
    }

    private record Window(Instant expiresAt, int count) {
        static Window increment(Window current, Instant now, Duration size) {
            if (current == null || !current.expiresAt().isAfter(now)) {
                return new Window(now.plus(size), 1);
            }
            return new Window(current.expiresAt(), current.count() + 1);
        }
    }
}
