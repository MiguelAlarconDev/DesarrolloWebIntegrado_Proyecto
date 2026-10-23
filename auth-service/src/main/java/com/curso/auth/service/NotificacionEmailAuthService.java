package com.curso.auth.service;

import com.curso.auth.entity.Usuario;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class NotificacionEmailAuthService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionEmailAuthService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    public boolean isConfigurado() {
        return mailSender != null && mailFrom != null && !mailFrom.isBlank();
    }

    public boolean enviarBienvenidaRegistro(Usuario usuario) {
        if (!isConfigurado()) {
            log.info("[EMAIL AUTH] Servidor SMTP no configurado (definir SPRING_MAIL_USERNAME y SPRING_MAIL_PASSWORD para envío autónomo). Correo de bienvenida preparado para: {}", usuario.getCorreo());
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom);
            helper.setTo(usuario.getCorreo());
            helper.setSubject("¡Bienvenido a Gestión de Cursos! Tu cuenta ha sido creada");

            String html = "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:20px;background:#f1f5f9;'>"
                    + "<div style='max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:30px;border:1px solid #e2e8f0;'>"
                    + "<div style='text-align:center;border-bottom:2px solid #2eca7f;padding-bottom:15px;margin-bottom:20px;'>"
                    + "<h2 style='color:#1a2d62;margin:0;'>Gestión de Cursos</h2>"
                    + "<p style='color:#64748b;font-size:13px;margin:4px 0 0;'>Plataforma Académica de Capacitación</p>"
                    + "</div>"
                    + "<p style='font-size:16px;'>¡Hola <strong>" + usuario.getNombres() + " " + usuario.getApellidos() + "</strong>!</p>"
                    + "<p>Tu cuenta como <strong>Estudiante</strong> ha sido registrada con éxito en nuestra plataforma.</p>"
                    + "<div style='background:#f8fafc;padding:16px;border-radius:8px;border-left:4px solid #2eca7f;margin:15px 0;font-size:14px;color:#334155;'>"
                    + "<strong>DNI:</strong> " + usuario.getDni() + "<br>"
                    + "<strong>Correo de Acceso:</strong> " + usuario.getCorreo() + "<br>"
                    + "<strong>WhatsApp Registrado:</strong> " + usuario.getWhatsapp() + "<br>"
                    + "</div>"
                    + "<p>Ya puedes explorar nuestro catálogo y matricularte en cursos especializados con clases en vivo y certificación oficial.</p>"
                    + "<div style='text-align:center;margin-top:25px;'>"
                    + "<a href='http://localhost:3000/cursos.html' style='background:#2eca7f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;display:inline-block;'>Explorar Catálogo de Cursos</a>"
                    + "</div>"
                    + "<hr style='border:none;border-top:1px solid #e2e8f0;margin:30px 0 15px;'>"
                    + "<p style='font-size:11px;color:#94a3b8;text-align:center;'>© 2026 Gestión de Cursos S.A.C. &bull; RUC: 20609876543 &bull; Lima, Perú</p>"
                    + "</div></body></html>";

            helper.setText(html, true);
            mailSender.send(message);

            log.info("[EMAIL AUTH] ✅ Correo de bienvenida enviado con éxito a: {}", usuario.getCorreo());
            return true;
        } catch (Exception ex) {
            log.error("[EMAIL AUTH] ❌ Error al enviar correo de bienvenida a {}: {}", usuario.getCorreo(), ex.getMessage());
            return false;
        }
    }
}
