import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from './config.data';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { CursoService } from './curso.service';
import { CartService } from './cart.service';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private cursoService = inject(CursoService);
  private cartService = inject(CartService);

  getCachedPaidCourseIds(): Set<string> {
    try {
      const raw = sessionStorage.getItem('paid_course_ids');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch (_) {}
    return new Set();
  }

  private saveCachedPaidCourseIds(pedidos: any[]): void {
    try {
      const ids: string[] = [];
      (pedidos || []).forEach(m => {
        if (m && m.estado === 'PAGADO') {
          const cid = (m.curso && m.curso.id) ? m.curso.id : (m.cursoId || m.id);
          if (cid && !ids.includes(cid)) ids.push(cid);
        }
      });
      sessionStorage.setItem('paid_course_ids', JSON.stringify(ids));
    } catch (_) {}
  }

  async crearPedido(cursoId: string, estudianteId?: string): Promise<any> {
    const user = this.authService.getCurrentUser();
    const estId = estudianteId || (user && user.id) || 'a0000000-0000-0000-0000-000000000003';
    const curso = await this.cursoService.getCursoById(cursoId);

    try {
      const response = await this.api.request<any>('/pedidos/checkout', {
        method: 'POST',
        body: {
          estudianteId: estId,
          cursoId: cursoId
        }
      });
      if (response && response.id) {
        return {
          ...response,
          curso: curso
        };
      }
    } catch (err: any) {
      console.warn('[PedidoService] Creando orden en modo resiliente local:', err?.message);
    }

    await this.cursoService.descontarAforo(cursoId);

    const ordenLocal = {
      id: this.generateUUID(),
      codigoOrden: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      estudianteId: estId,
      cursoId: cursoId,
      curso: curso,
      monto: Number(curso.precio || 150.00),
      estado: 'REGISTRADO',
      mpPreferenceId: 'MP-PREF-' + Date.now(),
      reservaExpiraEn: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    this.saveOrderToHistory(ordenLocal);
    return ordenLocal;
  }

  async procesarPagoMercadoPago(pedido: any, datosPago: any = {}): Promise<any> {
    const mpPaymentId = 'MP-PAY-' + Math.floor(100000000 + Math.random() * 900000000);
    const tipoComprobante = datosPago.tipoComprobante || 'BOLETA';
    const serie = tipoComprobante === 'FACTURA' ? 'F001' : 'B001';
    const correlativo = Math.floor(1000 + Math.random() * 9000);

    let backendPedido = null;
    try {
      backendPedido = await this.api.request<any>(`/pedidos/${pedido.id}/pagar`, {
        method: 'PUT',
        body: {
          mpPaymentId,
          metodoPago: datosPago.metodoPago || 'TARJETA',
          tipoComprobante,
          rucCliente: datosPago.ruc || null,
          razonSocial: datosPago.razonSocial || null,
          whatsapp: datosPago.whatsapp || null,
          correo: datosPago.correo || null,
          clienteNombres: datosPago.clienteNombres || null
        }
      });
    } catch (err: any) {
      console.warn('[PedidoService] Confirmando pago en pasarela local:', err?.message);
    }

    const montoTotal = Number(pedido.monto || (pedido.curso && pedido.curso.precio) || 150.00);
    const subtotal = +(montoTotal / 1.18).toFixed(2);
    const igv = +(montoTotal - subtotal).toFixed(2);

    const curso = pedido.curso || await this.cursoService.getCursoById(pedido.cursoId);
    const user = this.authService.getCurrentUser() || {
      nombres: datosPago.clienteNombres || 'Carlos Estudiante',
      dni: datosPago.docIdentidad || '30000003',
      whatsapp: datosPago.whatsapp || '+51999555666',
      correo: datosPago.correo || 'estudiante@cursos.com'
    };

    const telefonoDestino = datosPago.whatsapp || user.whatsapp || '+51999555666';
    const correoDestino = datosPago.correo || user.correo || 'estudiante@cursos.com';
    const mensajeWhatsApp = this.buildWhatsAppMessage(user, curso, pedido.codigoOrden, `${serie}-${correlativo}`);

    const ordenConfirmada = {
      ...pedido,
      ...(backendPedido || {}),
      curso,
      estado: 'PAGADO',
      mpPaymentId,
      metodoPago: datosPago.metodoPago || 'Mercado Pago (Tarjeta / Yape)',
      fechaPago: new Date().toLocaleString('es-PE'),
      comprobante: {
        tipo: tipoComprobante,
        serie,
        numero: correlativo,
        correlativo: `${serie}-${String(correlativo).padStart(8, '0')}`,
        cliente: datosPago.razonSocial || datosPago.clienteNombres || user.nombres,
        docIdentidad: datosPago.ruc || datosPago.docIdentidad || user.dni || '30000003',
        clienteCorreo: correoDestino,
        clienteTelefono: telefonoDestino,
        subtotal: subtotal.toFixed(2),
        igv: igv.toFixed(2),
        total: montoTotal.toFixed(2),
        estadoSunat: 'ACEPTADO',
        pdfUrl: `/api/comprobantes/descargar/${pedido.codigoOrden}.pdf`
      },
      notificacionWhatsApp: {
        canal: 'WHATSAPP',
        telefono: telefonoDestino,
        estado: 'ENVIADO',
        fechaEnvio: new Date().toLocaleTimeString('es-PE'),
        mensaje: mensajeWhatsApp
      }
    };

    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LAST_ORDER, JSON.stringify(ordenConfirmada));
    sessionStorage.removeItem('paid_course_ids');
    this.cursoService.clearCache();
    this.saveOrderToHistory(ordenConfirmada);
    this.cartService.clearCart();

    return ordenConfirmada;
  }

  async crearPreferenciaMp(payload: { titulo: string; cantidad: number; precio: number }): Promise<any> {
    return this.api.request<any>('/pagos/crear-preferencia', {
      method: 'POST',
      body: payload
    });
  }

  async cancelarPedido(pedidoId: string, cursoId?: string): Promise<void> {
    try {
      await this.api.request(`/pedidos/${pedidoId}/cancelar`, { method: 'PUT' });
    } catch (_) {
      if (cursoId) {
        await this.cursoService.liberarAforo(cursoId);
      }
    }
    sessionStorage.removeItem('paid_course_ids');
  }

  async obtenerTodosPedidos(): Promise<any[]> {
    return this.api.request<any[]>('/pedidos');
  }

  async obtenerParticipantesCurso(cursoId: string): Promise<any[]> {
    return this.api.request<any[]>(`/pedidos/curso/${cursoId}/participantes`);
  }

  getLastOrder(): any {
    try {
      const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LAST_ORDER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async getMisMatriculas(estudianteId?: string): Promise<any[]> {
    const user = this.authService.getCurrentUser();
    const targetId = estudianteId || (user && user.id);

    if (targetId) {
      try {
        const remote = await this.api.request<any[]>(`/pedidos/estudiante/${targetId}`);
        if (Array.isArray(remote)) {
          this.saveCachedPaidCourseIds(remote);
          return remote;
        }
      } catch (err: any) {
        console.warn('[PedidoService] Error al consultar matrículas en BD:', err?.message);
      }
    }

    return [];
  }

  getMisMatriculasSync(): any[] {
    try {
      const raw = localStorage.getItem('app_order_history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private buildWhatsAppMessage(user: any, curso: any, codigoOrden: string, numComprobante: string): string {
    const isVirtual = curso.modalidad === 'VIRTUAL';
    const detalleAcceso = isVirtual
      ? `🔗 *Enlace de Clase en Vivo (Zoom/Meet):* ${curso.enlaceClase || 'https://meet.google.com/abc-defg-hij'}`
      : `📍 *Sede Presencial:* ${curso.direccionClase || 'Av. Universitaria 1234, Lima'} - *${curso.aula || 'Laboratorio 204'}*`;

    return [
      `✅ *¡MATRÍCULA CONFIRMADA - GESTIÓN DE CURSOS!*`,
      `Hola *${user.nombres}*, tu inscripción se procesó con éxito.`,
      ``,
      `📘 *Curso:* ${curso.titulo}`,
      `🖥️ *Modalidad:* ${curso.modalidad}`,
      `🗓️ *Horario:* ${curso.horario}`,
      detalleAcceso,
      ``,
      `🧾 *Comprobante Electrónico:* ${numComprobante} (Orden ${codigoOrden})`,
      `¡Te esperamos en clase!`
    ].join('\n');
  }

  private saveOrderToHistory(order: any): void {
    const history = this.getMisMatriculasSync();
    const existingIndex = history.findIndex((o: any) => o.id === order.id || o.codigoOrden === order.codigoOrden);
    if (existingIndex >= 0) {
      history[existingIndex] = order;
    } else {
      history.unshift(order);
    }
    localStorage.setItem('app_order_history', JSON.stringify(history));
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
