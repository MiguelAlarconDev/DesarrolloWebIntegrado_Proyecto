package com.curso.auth.client;

import com.curso.auth.exception.ServiceUnavailableException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import java.util.Map;

@Component
public class WhatsappOtpClient {
    private final RestClient restClient;

    @org.springframework.beans.factory.annotation.Autowired
    public WhatsappOtpClient(RestClient.Builder builder,
            @Value("${services.whatsapp.url:${WHATSAPP_SERVICE_URL:http://127.0.0.1:8085}}") String url) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(25000);
        this.restClient = builder.baseUrl(url).requestFactory(factory).build();
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
            // Never include provider bodies or OTP in public errors or exception logs.
            throw new ServiceUnavailableException("No se pudo confirmar el envio del codigo 2FA por WhatsApp. Intente iniciar sesion nuevamente.", null);
        }
    }
}
