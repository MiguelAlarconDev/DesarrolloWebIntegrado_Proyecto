package com.curso.pedidos.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Component
public class WhatsAppClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppClient.class);
    private final RestClient restClient;

    @Value("${whatsapp.provider:meta}")
    private String provider;

    @Value("${whatsapp.greenapi.id-instance:}")
    private String greenApiIdInstance;

    @Value("${whatsapp.greenapi.api-token-instance:}")
    private String greenApiTokenInstance;

    @Value("${whatsapp.greenapi.host:https://api.green-api.com}")
    private String greenApiHost;

    @Value("${whatsapp.callmebot.api-key:}")
    private String callMeBotApiKey;

    @Value("${whatsapp.meta.token:}")
    private String token;

    @Value("${whatsapp.meta.phone-number-id:}")
    private String phoneNumberId;

    @Value("${whatsapp.meta.default-phone:+51935300159}")
    private String defaultPhone;

    @Value("${whatsapp.meta.template-name:}")
    private String templateName;

    @Value("${whatsapp.meta.enabled:true}")
    private boolean enabled;

    public WhatsAppClient() {
        this.restClient = RestClient.builder().build();
    }

    /**
     * Envía una notificación real de WhatsApp a través del proveedor configurado (Meta Cloud API o CallMeBot).
     */
    public boolean enviarMensaje(String destinatario, String mensaje) {
        if (!enabled) {
            log.info("[WHATSAPP] Notificaciones deshabilitadas.");
            return true;
        }

        String numero = (destinatario != null && !destinatario.isBlank()) ? destinatario : defaultPhone;
        if (numero == null || numero.isBlank()) {
            log.warn("[WHATSAPP] No se proporcionó un número de teléfono para la notificación.");
            return false;
        }

        // Limpiar a solo dígitos numéricos (ej. +51 935 300 159 -> 51935300159)
        String numeroLimpio = numero.replaceAll("[^0-9]", "");
        if (numeroLimpio.length() == 9) {
            numeroLimpio = "51" + numeroLimpio; // Prefijo Perú (+51)
        }

        // Si el proveedor es Green-API o si están configuradas sus credenciales
        if ("greenapi".equalsIgnoreCase(provider) || (greenApiIdInstance != null && !greenApiIdInstance.isBlank() && greenApiTokenInstance != null && !greenApiTokenInstance.isBlank())) {
            return enviarViaGreenApi(numeroLimpio, mensaje);
        }

        // Si se especificó explícitamente CallMeBot o hay apikey sin token de Meta
        if ("callmebot".equalsIgnoreCase(provider) || (callMeBotApiKey != null && !callMeBotApiKey.isBlank() && (token == null || token.isBlank()))) {
            return enviarViaCallMeBot(numeroLimpio, mensaje);
        }

        // Si faltan credenciales de Meta, registrar en log y simular
        if (token == null || token.isBlank() || phoneNumberId == null || phoneNumberId.isBlank()) {
            log.info("[WHATSAPP META] Modo Simulación: Configure 'whatsapp.meta.token' y 'whatsapp.meta.phone-number-id' en application.properties para entrega directa. Destinatario: +{}, Mensaje: {}",
                    numeroLimpio, mensaje);
            return true;
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("recipient_type", "individual");
            payload.put("to", numeroLimpio);

            if (templateName != null && !templateName.isBlank()) {
                Map<String, Object> template = new HashMap<>();
                template.put("name", templateName.trim());
                Map<String, String> language = new HashMap<>();
                language.put("code", "hello_world".equalsIgnoreCase(templateName.trim()) ? "en_US" : "es");
                template.put("language", language);
                payload.put("type", "template");
                payload.put("template", template);
            } else {
                payload.put("type", "text");
                Map<String, Object> text = new HashMap<>();
                text.put("preview_url", false);
                text.put("body", mensaje);
                payload.put("text", text);
            }

            String endpoint = "https://graph.facebook.com/v21.0/" + phoneNumberId.trim() + "/messages";

            String respuesta = restClient.post()
                    .uri(endpoint)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            log.info("[WHATSAPP META] Mensaje aceptado por Meta Cloud API para +{}. Respuesta: {}", numeroLimpio, respuesta);
            return true;
        } catch (Exception ex) {
            log.error("[WHATSAPP META] Error al enviar mensaje con Meta Cloud API a +{}: {}", numeroLimpio, ex.getMessage());
            
            // Si falla Meta y hay API Key de CallMeBot configurada, intentar fallback
            if (callMeBotApiKey != null && !callMeBotApiKey.isBlank()) {
                log.info("[WHATSAPP FALLBACK] Intentando envío de respaldo mediante CallMeBot...");
                return enviarViaCallMeBot(numeroLimpio, mensaje);
            }
            return false;
        }
    }

    /**
     * Envía mensaje directamente a WhatsApp mediante Green-API (sin restricciones de Meta).
     */
    public boolean enviarViaGreenApi(String numeroLimpio, String mensaje) {
        if (greenApiIdInstance == null || greenApiIdInstance.isBlank() || greenApiTokenInstance == null || greenApiTokenInstance.isBlank()) {
            log.warn("[WHATSAPP GREEN-API] Faltan credenciales 'whatsapp.greenapi.id-instance' o 'whatsapp.greenapi.api-token-instance'.");
            return false;
        }

        try {
            String baseUrl = (greenApiHost != null && !greenApiHost.isBlank()) ? greenApiHost.trim() : "https://api.green-api.com";
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

            log.info("[WHATSAPP GREEN-API] Mensaje enviado con éxito a +{}. Respuesta: {}", numeroLimpio, resp);
            return true;
        } catch (Exception ex) {
            log.error("[WHATSAPP GREEN-API] Error al enviar mensaje a +{}: {}", numeroLimpio, ex.getMessage());
            return false;
        }
    }

    /**
     * Envía mensaje directamente a WhatsApp mediante el gateway CallMeBot (sin requerir cuenta Meta).
     */
    public boolean enviarViaCallMeBot(String numeroLimpio, String mensaje) {
        if (callMeBotApiKey == null || callMeBotApiKey.isBlank()) {
            log.warn("[WHATSAPP CALLMEBOT] No se ha configurado 'whatsapp.callmebot.api-key'.");
            return false;
        }
        try {
            String url = String.format("https://api.callmebot.com/whatsapp.php?phone=+%s&text=%s&apikey=%s",
                    numeroLimpio,
                    URLEncoder.encode(mensaje, StandardCharsets.UTF_8),
                    callMeBotApiKey.trim());

            String resp = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            log.info("[WHATSAPP CALLMEBOT] Mensaje enviado a +{}. Respuesta: {}", numeroLimpio, resp);
            return true;
        } catch (Exception ex) {
            log.error("[WHATSAPP CALLMEBOT] Error al enviar mensaje a +{}: {}", numeroLimpio, ex.getMessage());
            return false;
        }
    }

    public String getToken() {
        return token;
    }

    public String getPhoneNumberId() {
        return phoneNumberId;
    }

    public String getDefaultPhone() {
        return defaultPhone;
    }
}
