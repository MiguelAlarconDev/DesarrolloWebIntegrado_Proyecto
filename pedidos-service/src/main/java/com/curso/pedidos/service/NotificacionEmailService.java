package com.curso.pedidos.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class NotificacionEmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    public boolean isConfigurado() {
        return mailSender != null && mailFrom != null && !mailFrom.isBlank();
    }

    public String getMailFrom() {
        return mailFrom != null ? mailFrom : "";
    }

    public boolean enviarEmailPrueba(String destinatario) {
        if (!isConfigurado() || destinatario == null || destinatario.isBlank()) {
            return false;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(destinatario);
            helper.setSubject("Prueba de Conexión SMTP - Gestión de Cursos");
            helper.setText("<h3>¡Conexión Exitosa con Servidor SMTP!</h3><p>Tu servidor de correo en Spring Boot está enviando correos reales con éxito a " + destinatario + ".</p>", true);
            mailSender.send(message);
            System.out.printf("[EMAIL NOTIFICACION] Correo de prueba enviado con éxito a: %s%n", destinatario);
            return true;
        } catch (Exception ex) {
            System.err.printf("[EMAIL NOTIFICACION] Error al enviar correo de prueba a %s: %s%n", destinatario, ex.getMessage());
            return false;
        }
    }

}
