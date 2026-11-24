package com.curso.auth.client;

import com.curso.auth.exception.ServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import java.util.Map;

@Component
public class WhatsappOtpClient {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(WhatsappOtpClient.class);

    private final RestClient restClient;
    private boolean logOtpIfUnavailable = false;

    /**
     * Solo desarrollo local: si WhatsApp no esta vinculado, el codigo se escribe en el log del
     * servicio en lugar de fallar. El perfil prod lo fuerza a false.
     */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setLogOtpIfUnavailable(@Value("${security.otp.log-if-whatsapp-down:false}") boolean value) {
        this.logOtpIfUnavailable = value;
    }

    public WhatsappOtpClient(RestClient.Builder builder, String url) {
        this(builder, url, "");
    }

    @org.springframework.beans.factory.annotation.Autowired
    public WhatsappOtpClient(RestClient.Builder builder,
            @Value("${services.whatsapp.url:${WHATSAPP_SERVICE_URL:http://127.0.0.1:8085}}") String url,
            @Value("${security.internal-key:${INTERNAL_API_KEY:}}") String internalKey) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(25000);
        RestClient.Builder b = builder.clone().baseUrl(url).requestFactory(factory);
        // whatsapp-service (Node) no valida JWT: exige la clave interna entre servicios.
        if (internalKey != null && !internalKey.isBlank()) {
            b.defaultHeader("X-Internal-Key", internalKey);
        }
        this.restClient = b.build();
    }

    WhatsappOtpClient(RestClient client) {
        this.restClient = client;
    }

    public void sendOtp(String phone, String otp) {
        try {
            Map<?, ?> result = restClient.post().uri("/api/whatsapp/send")
                    .body(Map.of("phone", phone, "message",
                            "Tu codigo de verificacion es: " + otp + ". Expira en 5 minutos."))
                    .retrieve().body(Map.class);
            if (result == null || !Boolean.TRUE.equals(result.get("success"))) {
                throw new IllegalStateException("Respuesta de envio no confirmada");
            }
        } catch (Exception ex) {
            if (logOtpIfUnavailable) {
                log.warn("[DEV] WhatsApp no disponible. Codigo 2FA para {}: {}", phone, otp);
                return;
            }
            // Never include provider bodies or OTP in public errors or exception logs.
            throw new ServiceUnavailableException("No se pudo confirmar el envio del codigo 2FA por WhatsApp. Intente iniciar sesion nuevamente.", null);
        }
    }
}
