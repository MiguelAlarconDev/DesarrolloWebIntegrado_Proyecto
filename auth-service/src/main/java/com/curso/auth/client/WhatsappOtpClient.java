package com.curso.auth.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class WhatsappOtpClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsappOtpClient.class);

    private final RestClient restClient;

    public WhatsappOtpClient(
            RestClient.Builder restClientBuilder,
            @Value("${services.whatsapp.url:${WHATSAPP_SERVICE_URL:http://localhost:8085}}") String whatsappUrl) {
        this.restClient = restClientBuilder.baseUrl(whatsappUrl).build();
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
            log.info("[WHATSAPP] OTP {} enviado con exito al numero {}", otp, phone);
        } catch (Exception ex) {
            log.warn("[WHATSAPP] Notificacion externa 2FA para el telefono {}: Tu codigo es [{}] (vigente por 5 minutos).", phone, otp);
        }
    }
}
