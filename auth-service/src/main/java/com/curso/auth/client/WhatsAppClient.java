package com.curso.auth.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

@Component
public class WhatsAppClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppClient.class);
    private final RestClient restClient;

    @Value("${whatsapp.provider:greenapi}")
    private String provider;

    @Value("${whatsapp.greenapi.id-instance:710722793693}")
    private String greenApiIdInstance;

    @Value("${whatsapp.greenapi.api-token-instance:14f4e7176bbf41bbbe2cb2bae0681ecf01a448b4ef3347ac82}")
    private String greenApiTokenInstance;

    @Value("${whatsapp.greenapi.host:https://7107.api.greenapi.com}")
    private String greenApiHost;

    @Value("${whatsapp.meta.default-phone:+51935300159}")
    private String defaultPhone;

    @Value("${whatsapp.meta.enabled:true}")
    private boolean enabled;

    public WhatsAppClient() {
        this.restClient = RestClient.builder().build();
    }

    public boolean enviarMensaje(String destinatario, String mensaje) {
        if (!enabled) {
            log.info("[WHATSAPP] Notificaciones deshabilitadas.");
            return true;
        }

        String numero = (destinatario != null && !destinatario.isBlank()) ? destinatario : defaultPhone;
        if (numero == null || numero.isBlank()) {
            log.warn("[WHATSAPP] No se proporcionó un número de teléfono.");
            return false;
        }

        // Limpiar a solo dígitos (ej. +51 935 300 159 -> 51935300159)
        String numeroLimpio = numero.replaceAll("[^0-9]", "");
        if (numeroLimpio.length() == 9) {
            numeroLimpio = "51" + numeroLimpio; // Prefijo Perú (+51)
        }

        return enviarViaGreenApi(numeroLimpio, mensaje);
    }

    private boolean enviarViaGreenApi(String numeroLimpio, String mensaje) {
        if (greenApiIdInstance == null || greenApiIdInstance.isBlank() || greenApiTokenInstance == null || greenApiTokenInstance.isBlank()) {
            log.warn("[WHATSAPP GREEN-API] Faltan credenciales Green-API.");
            return false;
        }

        try {
            String baseUrl = (greenApiHost != null && !greenApiHost.isBlank()) ? greenApiHost.trim() : "https://7107.api.greenapi.com";
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            String endpoint = String.format("%s/waInstance%s/sendMessage/%s",
                    baseUrl, greenApiIdInstance.trim(), greenApiTokenInstance.trim());

            Map<String, Object> payload = new HashMap<>();
            payload.put("chatId", numeroLimpio + "@c.us");
            payload.put("message", mensaje);

            String resp = restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            log.info("[WHATSAPP GREEN-API] Código OTP enviado automáticamente a +{}. Respuesta: {}", numeroLimpio, resp);
            return true;
        } catch (Exception ex) {
            log.error("[WHATSAPP GREEN-API] Error al enviar mensaje a +{}: {}", numeroLimpio, ex.getMessage());
            return false;
        }
    }
}
