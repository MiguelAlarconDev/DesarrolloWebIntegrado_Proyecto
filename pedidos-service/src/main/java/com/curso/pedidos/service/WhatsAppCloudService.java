package com.curso.pedidos.service;

import com.curso.pedidos.dto.CursoDto;
import com.curso.pedidos.dto.UsuarioDto;
import com.curso.pedidos.entity.Notificacion;
import com.curso.pedidos.entity.Pedido;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Servicio oficial de integración con Meta WhatsApp Cloud API (Graph API de Meta).
 * Permite despachar notificaciones directas a números de WhatsApp oficiales y celulares de estudiantes.
 */
@Service
public class WhatsAppCloudService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppCloudService.class);

    private final RestClient restClient;
    private final boolean enabled;
    private final String baseUrl;
    private final String version;
    private final String phoneNumberId;
    private final String token;
    private final String templateName;

    public WhatsAppCloudService(
            @Value("${whatsapp.cloud.api.enabled:true}") boolean enabled,
            @Value("${whatsapp.cloud.api.base-url:https://graph.facebook.com}") String baseUrl,
            @Value("${whatsapp.cloud.api.version:v21.0}") String version,
            @Value("${whatsapp.cloud.api.phone-number-id:}") String phoneNumberId,
            @Value("${whatsapp.cloud.api.token:}") String token,
            @Value("${whatsapp.cloud.api.template-name:}") String templateName
    ) {
        this.enabled = enabled;
        this.baseUrl = baseUrl;
        this.version = version;
        this.phoneNumberId = phoneNumberId != null ? phoneNumberId.trim() : "";
        this.token = token != null ? token.trim() : "";
        this.templateName = templateName != null ? templateName.trim() : "";

        this.restClient = RestClient.builder()
                .baseUrl(this.baseUrl)
                .build();
    }

    public boolean isConfigurado() {
        return enabled && !phoneNumberId.isBlank() && !token.isBlank();
    }

    public String getPhoneNumberId() {
        return phoneNumberId;
    }

    public String getVersion() {
        return version;
    }

    /**
     * Limpia y formatea el número para WhatsApp Cloud API con código internacional.
     * Ejemplo para Perú (+51): '935300159' o '+51 935 300 159' -> '51935300159'.
     */
    public String formatearTelefono(String telefono) {
        if (telefono == null) return "";
        String digitos = telefono.replaceAll("\\D", "");
        if (digitos.startsWith("51") && digitos.length() == 11) {
            return digitos;
        }
        if (digitos.length() == 9) {
            return "51" + digitos;
        }
        return digitos;
    }

    /**
     * Envía la notificación oficial de matrícula confirmada a través de Meta WhatsApp Cloud API.
     */
    public boolean enviarNotificacionBienvenida(Pedido pedido, UsuarioDto estudiante, CursoDto curso, Notificacion notificacion) {
        String telLimpio = formatearTelefono(estudiante != null ? estudiante.getWhatsapp() : null);
        if (telLimpio.isBlank()) {
            log.warn("[WHATSAPP CLOUD API] No se pudo determinar el teléfono del estudiante.");
            if (notificacion != null) {
                notificacion.setEstado("FALLIDO");
                notificacion.setUltimoError("Teléfono no válido o vacío.");
            }
            return false;
        }

        String mensaje = notificacion != null && notificacion.getMensaje() != null
                ? notificacion.getMensaje()
                : construirMensajeBienvenida(pedido, estudiante, curso);

        return enviarMensajeTexto(telLimpio, mensaje, notificacion);
    }

    /**
     * Realiza la llamada HTTP POST a https://graph.facebook.com/{version}/{phoneNumberId}/messages
     */
    public boolean enviarMensajeTexto(String telefonoDestino, String mensaje, Notificacion notificacion) {
        String destino = formatearTelefono(telefonoDestino);

        if (!isConfigurado()) {
            log.info("[WHATSAPP CLOUD API] ℹ️ Meta WhatsApp Cloud API no configurada (especifica WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_API_TOKEN en application.properties). Mensaje preparado para: {}", destino);
            if (notificacion != null) {
                notificacion.setEstado("PENDIENTE");
                notificacion.setUltimoError("Meta WhatsApp Cloud API pendiente de credenciales (WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_API_TOKEN).");
            }
            return false;
        }

        try {
            String uri = String.format("/%s/%s/messages", version, phoneNumberId);

            Map<String, Object> payload = new HashMap<>();
            payload.put("messaging_product", "whatsapp");
            payload.put("recipient_type", "individual");
            payload.put("to", destino);
            payload.put("type", "text");
            payload.put("text", Map.of("preview_url", false, "body", mensaje));

            log.info("[WHATSAPP CLOUD API] Enviando mensaje a Meta WhatsApp Cloud API (URI: {}, To: {})...", uri, destino);

            Map<String, Object> response = restClient.post()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response != null && response.containsKey("messages")) {
                List<?> messages = (List<?>) response.get("messages");
                String messageId = "N/A";
                if (messages != null && !messages.isEmpty() && messages.get(0) instanceof Map<?, ?> mapMsg) {
                    messageId = String.valueOf(mapMsg.get("id"));
                }

                log.info("[WHATSAPP CLOUD API] ✅ Mensaje entregado con éxito a Meta Cloud API. Destinatario: {}, WAMID: {}", destino, messageId);

                if (notificacion != null) {
                    notificacion.setEstado("ENVIADO");
                    notificacion.setUltimoError(null);
                }
                return true;
            } else {
                log.warn("[WHATSAPP CLOUD API] Respuesta inesperada de Meta: {}", response);
                if (notificacion != null) {
                    notificacion.setEstado("FALLIDO");
                    notificacion.setUltimoError("Respuesta sin messages de Meta: " + response);
                }
                return false;
            }

        } catch (RestClientResponseException ex) {
            String errorBody = ex.getResponseBodyAsString();
            log.error("[WHATSAPP CLOUD API] ❌ Error HTTP de Meta WhatsApp Cloud API (Status {}): {}", ex.getStatusCode(), errorBody);

            if (notificacion != null) {
                notificacion.setEstado("FALLIDO");
                notificacion.setUltimoError("Error Meta " + ex.getStatusCode() + ": " + errorBody);
            }
            return false;
        } catch (Exception ex) {
            log.error("[WHATSAPP CLOUD API] ❌ Error inesperado al invocar Meta WhatsApp Cloud API: {}", ex.getMessage(), ex);

            if (notificacion != null) {
                notificacion.setEstado("FALLIDO");
                notificacion.setUltimoError("Excepción al conectar con Meta: " + ex.getMessage());
            }
            return false;
        }
    }

    /**
     * Envío mediante plantilla oficial aprobada por Meta (útil para iniciar conversaciones fuera de la ventana de 24h).
     */
    public boolean enviarMensajePlantilla(String telefonoDestino, String template, String languageCode) {
        String destino = formatearTelefono(telefonoDestino);
        if (!isConfigurado()) return false;

        String lang = (languageCode != null && !languageCode.isBlank()) ? languageCode : "es";
        String tName = (template != null && !template.isBlank()) ? template : templateName;
        if (tName.isBlank()) tName = "hello_world";

        try {
            String uri = String.format("/%s/%s/messages", version, phoneNumberId);

            Map<String, Object> payload = Map.of(
                    "messaging_product", "whatsapp",
                    "to", destino,
                    "type", "template",
                    "template", Map.of(
                            "name", tName,
                            "language", Map.of("code", lang)
                    )
            );

            log.info("[WHATSAPP CLOUD API] Enviando plantilla '{}' ({}) a {}...", tName, lang, destino);

            Map<String, Object> response = restClient.post()
                    .uri(uri)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            log.info("[WHATSAPP CLOUD API] ✅ Plantilla enviada exitosamente: {}", response);
            return true;
        } catch (Exception ex) {
            log.error("[WHATSAPP CLOUD API] ❌ Error al enviar plantilla de Meta: {}", ex.getMessage());
            return false;
        }
    }

    private String construirMensajeBienvenida(Pedido pedido, UsuarioDto estudiante, CursoDto curso) {
        String nom = estudiante != null ? estudiante.getNombres() : "Estudiante";
        String cur = curso != null ? curso.getTitulo() : "Curso de Especialización";
        String hor = curso != null ? curso.getHorario() : "Horario regular";
        String ord = pedido != null ? pedido.getCodigoOrden() : "ORD-000";

        String acceso;
        if (curso != null && "PRESENCIAL".equalsIgnoreCase(curso.getModalidad())) {
            acceso = "🏛️ Sede: " + (curso.getDireccionClase() != null ? curso.getDireccionClase() : "Sede Central")
                    + " (Aula: " + (curso.getAula() != null ? curso.getAula() : "Lab 302") + ")";
        } else {
            String link = curso != null && curso.getEnlaceClase() != null && !curso.getEnlaceClase().isBlank()
                    ? curso.getEnlaceClase() : "https://meet.google.com";
            acceso = "🎥 Enlace de clase en vivo: " + link;
        }

        return String.format("🎉 ¡Hola %s! Tu matrícula en Gestión de Cursos ha sido confirmada con éxito.\n\n"
                + "📚 Curso: %s\n"
                + "📅 Horario: %s\n"
                + "%s\n"
                + "🔖 Código de Matrícula: %s\n"
                + "🏛️ Plataforma del Estudiante: http://localhost:3000/mis-cursos.html\n\n"
                + "¡Muchos éxitos en tu capacitación académica! 🚀", nom, cur, hor, acceso, ord);
    }
}
