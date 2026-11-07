package com.curso.pedidos.controller;

import com.curso.pedidos.dto.CrearPedidoRequest;
import com.curso.pedidos.dto.PagarPedidoRequest;
import com.curso.pedidos.entity.Pedido;
import com.curso.pedidos.service.NotificacionEmailService;
import com.curso.pedidos.service.PedidoService;
import com.curso.pedidos.service.WhatsAppCloudService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pedidos")
@CrossOrigin(origins = "*")
public class PedidoController {

    private static final Logger log = LoggerFactory.getLogger(PedidoController.class);

    private final PedidoService pedidoService;
    private final WhatsAppCloudService whatsAppCloudService;
    private final NotificacionEmailService notificacionEmailService;

    @Value("${whatsapp.cloud.api.verify-token:cursos_meta_verify_token_2026}")
    private String whatsappVerifyToken;

    public PedidoController(PedidoService pedidoService,
                            WhatsAppCloudService whatsAppCloudService,
                            NotificacionEmailService notificacionEmailService) {
        this.pedidoService = pedidoService;
        this.whatsAppCloudService = whatsAppCloudService;
        this.notificacionEmailService = notificacionEmailService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(
            @RequestParam(value = "type", required = false) String paramType,
            @RequestParam(value = "topic", required = false) String topic,
            @RequestParam(value = "data.id", required = false) String paramDataId,
            @RequestParam(value = "id", required = false) String paramId,
            @RequestBody(required = false) Map<String, Object> body) {

        String paymentId = null;
        String type = paramType != null ? paramType : topic;

        if (body != null) {
            if (body.get("type") != null) {
                type = body.get("type").toString();
            }
            if (body.get("data") instanceof Map<?, ?> dataMap) {
                Object idObj = dataMap.get("id");
                if (idObj != null) {
                    paymentId = idObj.toString();
                }
            }
        }

        if (paymentId == null) {
            paymentId = paramDataId != null ? paramDataId : paramId;
        }

        if (paymentId != null && ("payment".equalsIgnoreCase(type) || type == null)) {
            Pedido pedido = pedidoService.procesarPagoMercadoPago(paymentId);
            if (pedido != null) {
                return ResponseEntity.ok("Pago " + paymentId + " procesado exitosamente para el pedido " + pedido.getId());
            }
            return ResponseEntity.ok("Pago " + paymentId + " consultado pero aún no se encuentra aprobado.");
        }

        return ResponseEntity.ok("Evento ignorado (tipo: " + type + ")");
    }

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public Pedido checkout(@Valid @RequestBody CrearPedidoRequest request) {
        return pedidoService.crear(request);
    }

    @PutMapping("/{id}/pagar")
    public Pedido pagar(@PathVariable UUID id,
                        @RequestBody(required = false) PagarPedidoRequest request) {
        return pedidoService.pagar(id, request);
    }

    @PutMapping("/{id}/cancelar")
    public Pedido cancelar(@PathVariable UUID id) {
        return pedidoService.cancelar(id);
    }

    @GetMapping
    public List<Pedido> listar() {
        return pedidoService.listar();
    }

    @GetMapping("/{id}")
    public Pedido buscar(@PathVariable UUID id) {
        return pedidoService.buscarPorId(id);
    }

    @GetMapping("/estudiante/{estudianteId}")
    public List<Pedido> listarPorEstudiante(@PathVariable UUID estudianteId) {
        return pedidoService.listarPorEstudiante(estudianteId);
    }

    @GetMapping("/curso/{cursoId}/participantes")
    public List<Pedido> listarParticipantesPorCurso(@PathVariable UUID cursoId) {
        return pedidoService.listarParticipantesPorCurso(cursoId);
    }

    // =========================================================================
    // ENDPOINTS DE INTEGRACIÓN META WHATSAPP CLOUD API
    // =========================================================================

    @GetMapping("/whatsapp/status")
    public ResponseEntity<Map<String, Object>> getWhatsAppCloudStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("proveedor", "Meta WhatsApp Cloud API (Oficial)");
        status.put("configurado", whatsAppCloudService.isConfigurado());
        status.put("version", whatsAppCloudService.getVersion());
        status.put("phoneNumberId", whatsAppCloudService.getPhoneNumberId().isBlank() ? "NO_CONFIGURADO" : whatsAppCloudService.getPhoneNumberId());
        status.put("verifyToken", whatsappVerifyToken);
        status.put("instrucciones", "Para conectar con WhatsApp real, define WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_API_TOKEN en application.properties o variables de entorno.");
        return ResponseEntity.ok(status);
    }

    @PostMapping("/whatsapp/test")
    public ResponseEntity<Map<String, Object>> testWhatsAppCloud(@RequestBody Map<String, String> body) {
        String telefono = body.get("telefono");
        String mensaje = body.getOrDefault("mensaje", "Hola! Este es un mensaje de prueba oficial desde Meta WhatsApp Cloud API de Gestión de Cursos.");

        if (telefono == null || telefono.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El campo 'telefono' es obligatorio."));
        }

        boolean enviado = whatsAppCloudService.enviarMensajeTexto(telefono, mensaje, null);
        Map<String, Object> resp = new HashMap<>();
        resp.put("enviado", enviado);
        resp.put("telefonoDestino", whatsAppCloudService.formatearTelefono(telefono));
        resp.put("metaConfigurado", whatsAppCloudService.isConfigurado());
        resp.put("mensaje", enviado ? "Mensaje enviado exitosamente a través de Meta WhatsApp Cloud API." : "No se pudo despachar el mensaje por falta de credenciales o error de Meta.");

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/{id}/whatsapp/reenviar")
    public ResponseEntity<Map<String, Object>> reenviarWhatsApp(@PathVariable UUID id) {
        boolean ok = pedidoService.reenviarWhatsApp(id);
        return ResponseEntity.ok(Map.of(
                "pedidoId", id,
                "reintentoExitoso", ok,
                "metaConfigurado", whatsAppCloudService.isConfigurado(),
                "mensaje", "Reintento de despacho WhatsApp procesado."
        ));
    }

    /**
     * Endpoint oficial de Webhook para verificación con Meta (Handshake GET).
     */
    @GetMapping("/whatsapp/webhook")
    public ResponseEntity<String> verifyWhatsAppWebhook(
            @RequestParam(value = "hub.mode", required = false) String mode,
            @RequestParam(value = "hub.verify_token", required = false) String verifyToken,
            @RequestParam(value = "hub.challenge", required = false) String challenge) {

        log.info("[META WEBHOOK] Verificación solicitada por Meta: mode={}, verify_token={}", mode, verifyToken);

        if ("subscribe".equals(mode) && whatsappVerifyToken.equals(verifyToken)) {
            log.info("[META WEBHOOK] ✅ Webhook verificado exitosamente con Meta.");
            return ResponseEntity.ok(challenge);
        }

        log.warn("[META WEBHOOK] ❌ Token de verificación inválido. Esperado: {}, Recibido: {}", whatsappVerifyToken, verifyToken);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification token mismatch");
    }

    /**
     * Endpoint oficial de Webhook para recibir notificaciones y estados de entrega de Meta (POST).
     */
    @PostMapping("/whatsapp/webhook")
    public ResponseEntity<String> receiveWhatsAppWebhook(@RequestBody(required = false) Map<String, Object> payload) {
        log.info("[META WEBHOOK] Evento de estado recibido de Meta: {}", payload);
        return ResponseEntity.ok("EVENT_RECEIVED");
    }

    // =========================================================================
    // ENDPOINTS DE SERVICIO SMTP (GMAIL / JAVAMAILSENDER)
    // =========================================================================

    @GetMapping("/email/status")
    public ResponseEntity<Map<String, Object>> getEmailStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("proveedor", "Servidor SMTP (Gmail / JavaMailSender)");
        status.put("configurado", notificacionEmailService.isConfigurado());
        status.put("remitente", notificacionEmailService.getMailFrom().isBlank() ? "NO_CONFIGURADO" : notificacionEmailService.getMailFrom());
        status.put("instrucciones", "Para activar envío autónomo, define SPRING_MAIL_USERNAME y SPRING_MAIL_PASSWORD en application.properties.");
        return ResponseEntity.ok(status);
    }

    @PostMapping("/email/test")
    public ResponseEntity<Map<String, Object>> testEmail(@RequestBody Map<String, String> body) {
        String correo = body.get("correo");
        if (correo == null || correo.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El campo 'correo' es obligatorio."));
        }
        boolean ok = notificacionEmailService.enviarEmailPrueba(correo);
        return ResponseEntity.ok(Map.of(
                "enviado", ok,
                "destinatario", correo,
                "smtpConfigurado", notificacionEmailService.isConfigurado(),
                "mensaje", ok ? "Correo de prueba enviado exitosamente a tu bandeja." : "No se pudo enviar. Verifica tus credenciales de Gmail o contraseña de aplicación en application.properties."
        ));
    }
}
