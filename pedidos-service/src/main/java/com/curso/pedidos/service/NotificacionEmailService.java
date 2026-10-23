package com.curso.pedidos.service;

import com.curso.pedidos.dto.CursoDto;
import com.curso.pedidos.dto.UsuarioDto;
import com.curso.pedidos.entity.Comprobante;
import com.curso.pedidos.entity.Pedido;
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

    public boolean enviarComprobanteMatricula(Pedido pedido, UsuarioDto estudiante, CursoDto curso, Comprobante comprobante) {
        if (estudiante == null || estudiante.getCorreo() == null || estudiante.getCorreo().isBlank()) {
            System.out.println("[EMAIL NOTIFICACION] No se proporcionó correo válido para el estudiante.");
            return false;
        }

        // Si no hay JavaMailSender o no se configuró usuario emisor, dejamos el comprobante listo para apertura web
        if (mailSender == null || mailFrom == null || mailFrom.isBlank()) {
            System.out.printf("[EMAIL NOTIFICACION] Servidor SMTP no configurado (definir SPRING_MAIL_USERNAME y SPRING_MAIL_PASSWORD en application.properties para envío autónomo desde el servidor). Mensaje preparado para: %s%n",
                    estudiante.getCorreo());
            if (comprobante != null) {
                comprobante.setEstadoEmail("PREPARADO_WEB");
            }
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom);
            helper.setTo(estudiante.getCorreo());
            helper.setSubject("¡Matrícula Confirmada! " + curso.getTitulo() + " (" + pedido.getCodigoOrden() + ")");

            String html = generarPlantillaHtml(pedido, estudiante, curso, comprobante);
            helper.setText(html, true);

            mailSender.send(message);
            System.out.printf("[EMAIL NOTIFICACION] Correo enviado exitosamente a %s para la orden %s%n",
                    estudiante.getCorreo(), pedido.getCodigoOrden());

            if (comprobante != null) {
                comprobante.setEstadoEmail("ENVIADO");
            }
            return true;
        } catch (Exception ex) {
            System.err.printf("[EMAIL NOTIFICACION] Error al enviar correo a %s: %s%n", estudiante.getCorreo(), ex.getMessage());
            if (comprobante != null) {
                comprobante.setEstadoEmail("ERROR_ENVIO");
            }
            return false;
        }
    }

    private String generarPlantillaHtml(Pedido pedido, UsuarioDto estudiante, CursoDto curso, Comprobante comprobante) {
        String serieNum = comprobante != null ? comprobante.getSerie() + "-" + String.format("%08d", comprobante.getNumeroCorrelativo()) : "B001-00001001";
        String total = comprobante != null ? "S/ " + comprobante.getMontoTotal() : "S/ " + pedido.getMonto();
        String tipo = comprobante != null ? comprobante.getTipoComprobante().toString() : "BOLETA";

        String accesoHtml;
        if ("PRESENCIAL".equalsIgnoreCase(curso.getModalidad())) {
            accesoHtml = "<div style='background:#f8fafc;padding:14px;border-radius:8px;border:1px solid #e2e8f0;margin:15px 0;'>"
                    + "<strong style='color:#0f172a;'>🏛️ Sede Asignada:</strong> " + (curso.getDireccionClase() != null ? curso.getDireccionClase() : "Sede Central") + "<br>"
                    + "<strong style='color:#0f172a;'>🚪 Aula:</strong> " + (curso.getAula() != null ? curso.getAula() : "Laboratorio 302")
                    + "</div>";
        } else {
            String enlace = curso.getEnlaceClase() != null && !curso.getEnlaceClase().isBlank() ? curso.getEnlaceClase() : "https://meet.google.com";
            accesoHtml = "<div style='background:#ecfdf5;padding:14px;border-radius:8px;border:1px solid #a7f3d0;margin:15px 0;'>"
                    + "<strong style='color:#065f46;'>🎥 Sala Virtual en Vivo:</strong><br>"
                    + "<a href='" + enlace + "' style='color:#059669;font-weight:bold;text-decoration:none;' target='_blank'>" + enlace + "</a>"
                    + "</div>";
        }

        return "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:20px;background:#f1f5f9;'>"
                + "<div style='max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:30px;border:1px solid #e2e8f0;'>"
                + "<div style='text-align:center;border-bottom:2px solid #2eca7f;padding-bottom:15px;margin-bottom:20px;'>"
                + "<h2 style='color:#1a2d62;margin:0;'>Gestión de Cursos</h2>"
                + "<p style='color:#64748b;font-size:13px;margin:4px 0 0;'>Confirmación Oficial de Matrícula</p>"
                + "</div>"
                + "<p style='font-size:16px;'>¡Hola <strong>" + estudiante.getNombres() + "</strong>!</p>"
                + "<p>Tu matrícula ha sido confirmada con éxito. Ya eres parte del programa:</p>"
                + "<div style='background:#f8fafc;padding:16px;border-radius:8px;border-left:4px solid #2eca7f;margin:15px 0;'>"
                + "<h3 style='margin:0 0 8px;color:#1a2d62;'>" + curso.getTitulo() + "</h3>"
                + "<p style='margin:0;font-size:14px;color:#475569;'><strong>Modalidad:</strong> " + curso.getModalidad() + " &bull; <strong>Horario:</strong> " + curso.getHorario() + "</p>"
                + "</div>"
                + accesoHtml
                + "<h4 style='color:#1a2d62;border-bottom:1px solid #e2e8f0;padding-bottom:6px;'>Resumen de Pago (" + tipo + ")</h4>"
                + "<p style='font-size:13.5px;color:#475569;margin:6px 0;'><strong>Código de Orden:</strong> " + pedido.getCodigoOrden() + "<br>"
                + "<strong>Comprobante:</strong> " + serieNum + "<br>"
                + "<strong>Total Pagado:</strong> " + total + "</p>"
                + "<div style='text-align:center;margin-top:25px;'>"
                + "<a href='http://localhost:3000/mis-cursos.html' style='background:#2eca7f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;display:inline-block;'>Ir a Mis Clases</a>"
                + "</div>"
                + "<hr style='border:none;border-top:1px solid #e2e8f0;margin:30px 0 15px;'>"
                + "<p style='font-size:11px;color:#94a3b8;text-align:center;'>© 2026 Gestión de Cursos S.A.C. &bull; RUC: 20609876543 &bull; Lima, Perú</p>"
                + "</div></body></html>";
    }
}
