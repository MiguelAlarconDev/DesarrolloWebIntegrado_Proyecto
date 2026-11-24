package com.curso.auth.client;

import com.curso.auth.exception.ServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class WhatsappOtpClient {

    private final RestClient restClient;

    public WhatsappOtpClient(
            RestClient.Builder restClientBuilder,
            @Value("${services.whatsapp.url:${WHATSAPP_SERVICE_URL:http://localhost:8085}}") String whatsappUrl) {
        this(restClientBuilder, whatsappUrl, "");
    }

    @org.springframework.beans.factory.annotation.Autowired
    public WhatsappOtpClient(
            RestClient.Builder restClientBuilder,
            @Value("${services.whatsapp.url:${WHATSAPP_SERVICE_URL:http://localhost:8085}}") String whatsappUrl,
            @Value("${security.internal-key:${INTERNAL_API_KEY:}}") String internalKey) {
        RestClient.Builder builder = restClientBuilder.clone().baseUrl(whatsappUrl);
        if (internalKey != null && !internalKey.isBlank()) {
            builder.defaultHeader("X-Internal-Key", internalKey);
        }
        this.restClient = builder.build();
    }

    public void sendOtp(String phone, String otp) {
        try {
            restClient.post()
                    .uri("/api/whatsapp/send")
                    .body(Map.of(
                            "phone", phone,
                            "message", "Tu codigo de verificacion es: " + otp + ". Expira en 5 minutos."
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            throw new ServiceUnavailableException("No se pudo enviar el codigo 2FA por WhatsApp. Intente nuevamente mas tarde.", ex);
        }
    }
}
