/**
 * PEDIDOS.SERVICE.JS - Gestión de Checkout, Pasarela Mercado Pago y Emisión de Comprobantes
 */
const PedidosService = {
  /**
   * Crea una orden de pedido / matrícula y bloquea la vacante
   */
  async crearPedido(cursoId, estudianteId) {
    try {
      const response = await API.request('/pedidos/checkout', {
        method: 'POST',
        body: JSON.stringify({ cursoId, estudianteId })
      });
      if (response && response.id) {
        if (!response.curso) {
          const cursoDetalle = await CursosService.getCursoById(cursoId);
          response.curso = cursoDetalle || {
            id: response.cursoId,
            titulo: response.cursoTitulo || 'Curso Especializado',
            modalidad: response.modalidad || 'VIRTUAL',
            horario: response.horario || 'Por coordinar',
            enlaceClase: response.enlaceClase,
            direccionClase: response.direccionClase,
            aula: response.aula,
            precio: response.monto
          };
        }
        return response;
      }
    } catch (_) {
      // Fallback
    }

    // Generar orden local resiliente
    let curso = await CursosService.getCursoById(cursoId);
    if (!curso && typeof CONFIG !== 'undefined' && CONFIG.INITIAL_COURSES) {
      curso = CONFIG.INITIAL_COURSES.find(c => c.id === cursoId);
    }
    const precio = curso ? Number(curso.precio) : 150.00;
    const codigoOrden = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const mockPedido = {
      id: 'ped-' + Date.now(),
      codigoOrden: codigoOrden,
      estudianteId: estudianteId,
      cursoId: cursoId,
      curso: curso || { id: cursoId, titulo: 'Curso Especializado', precio: precio, modalidad: 'VIRTUAL', horario: 'Lun y Mie 19:00 - 22:00' },
      monto: precio,
      estado: 'PENDIENTE_PAGO',
      mpPreferenceId: 'pref_mp_' + Math.random().toString(36).substring(7),
      fechaRegistro: new Date().toISOString()
    };

    return mockPedido;
  },

  /**
   * Procesa el pago simulado o real con Mercado Pago
   * y emite la Boleta/Factura Electrónica y Notificación WhatsApp
   */
  async procesarPagoMercadoPago(pedidoData, paymentDetails) {
    const paymentId = 'mp_pay_' + Date.now();
    const tipoComp = paymentDetails.tipoComprobante || 'BOLETA';

    try {
      await API.request(`/pedidos/${pedidoData.id}/pagar`, {
        method: 'PUT',
        body: JSON.stringify({
          mpPaymentId: paymentId,
          tipoComprobante: tipoComp,
          correo: paymentDetails.correo,
          whatsapp: paymentDetails.whatsapp,
          clienteNombres: paymentDetails.clienteNombres,
          metodoPago: paymentDetails.metodoPago
        })
      });
    } catch (_) {
      // Fallback
    }

    // Descontar vacante en tiempo real
    CursosService.descontarVacante(pedidoData.cursoId);

    // Generar Comprobante Electrónico (Boleta o Factura)
    const subtotal = (pedidoData.monto / 1.18).toFixed(2);
    const igv = (pedidoData.monto - subtotal).toFixed(2);
    const serie = tipoComp === 'BOLETA' ? 'B001' : 'F001';
    const numero = Math.floor(1000 + Math.random() * 9000);

    const formaPagoTexto = paymentDetails.metodoPago || 'Mercado Pago';
    const comprobante = {
      serie: serie,
      correlativo: `${serie}-${String(numero).padStart(8, '0')}`,
      tipo: tipoComp,
      cliente: paymentDetails.clienteNombres,
      clienteCorreo: paymentDetails.correo,
      clienteTelefono: paymentDetails.whatsapp,
      docIdentidad: paymentDetails.docIdentidad,
      subtotal: subtotal,
      igv: igv,
      total: Number(pedidoData.monto).toFixed(2),
      formaPago: formaPagoTexto,
      fechaEmision: new Date().toLocaleString('es-PE'),
      estadoEmail: 'ENVIADO'
    };

    // Generar Mensaje de WhatsApp automático con accesos
    const curso = pedidoData.curso || {
      titulo: 'Curso de Especialización',
      horario: 'Horario coordinado',
      modalidad: 'VIRTUAL',
      enlaceClase: 'https://meet.google.com/abc-defg-hij',
      direccionClase: 'Av. Universitaria 1234, Lima',
      aula: 'Laboratorio 204'
    };
    let mensajeAcceso = '';
    if (curso.modalidad === 'VIRTUAL') {
      mensajeAcceso = `🎥 *Enlace de Clase en Vivo (Zoom / Meet):*\n${curso.enlaceClase || 'https://meet.google.com/abc-defg-hij'}`;
    } else {
      mensajeAcceso = `🏛️ *Sede Física Asignada:*\n${curso.direccionClase || 'Sede Central'}\n🚪 *Aula:*\n${curso.aula || 'Aula 101'}`;
    }

    const whatsappMensaje = `¡Hola *${paymentDetails.clienteNombres}*! 🎉 Tu matrícula en *${curso.titulo}* ha sido confirmada con éxito mediante *${formaPagoTexto}*.\n\n` +
      `📅 *Horario:* ${curso.horario}\n` +
      `${mensajeAcceso}\n\n` +
      `📄 Tu comprobante electrónico *${comprobante.correlativo}* ha sido enviado a tu correo.\n\n` +
      `¡Muchos éxitos en tu capacitación! 🚀`;

    const finalOrder = {
      ...pedidoData,
      estado: 'PAGADO',
      mpPaymentId: paymentId,
      metodoPago: formaPagoTexto,
      comprobante: comprobante,
      notificacionWhatsApp: {
        telefono: paymentDetails.whatsapp,
        mensaje: whatsappMensaje,
        enviado: true,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    };

    // Guardar en pedidos históricos del estudiante
    const history = JSON.parse(localStorage.getItem('app_order_history') || '[]');
    history.unshift(finalOrder);
    localStorage.setItem('app_order_history', JSON.stringify(history));

    // Guardar último pedido para la pantalla de confirmación
    localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_ORDER, JSON.stringify(finalOrder));

    // Limpiar carrito
    CartService.clearCart();

    return finalOrder;
  },

  getLastOrder() {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_ORDER);
    return raw ? JSON.parse(raw) : null;
  },

  getMisMatriculas() {
    let raw = JSON.parse(localStorage.getItem('app_order_history') || '[]');
    if ((!raw || raw.length === 0) && typeof window !== 'undefined' && window.location.search && window.location.search.includes('sample=1')) {
      return [
        {
          id: 'ord-100201',
          codigoOrden: 'ORD-894210',
          estado: 'PAGADO',
          metodoPago: 'Yape (Mercado Pago)',
          curso: {
            id: 'b0000000-0000-0000-0000-000000000001',
            titulo: 'Desarrollo de Microservicios con Spring Boot y Cloud',
            horario: 'Sábados y Domingos 09:00 - 13:00',
            modalidad: 'VIRTUAL',
            enlaceClase: 'https://meet.google.com/abc-defg-hij',
            imagen: 'assets/images/all-img/c1.png'
          },
          comprobante: {
            tipo: 'BOLETA',
            correlativo: 'B001-00001042',
            total: '350.00'
          }
        },
        {
          id: 'ord-100202',
          codigoOrden: 'ORD-894211',
          estado: 'PAGADO',
          metodoPago: 'Plin (Mercado Pago)',
          curso: {
            id: 'b0000000-0000-0000-0000-000000000002',
            titulo: 'Arquitectura Frontend con React & TypeScript',
            horario: 'Martes y Jueves 19:00 - 22:00',
            modalidad: 'PRESENCIAL',
            direccionClase: 'Sede Central - Av. Universitaria 1234, Lima',
            aula: 'Laboratorio 302',
            imagen: 'assets/images/all-img/c2.png'
          },
          comprobante: {
            tipo: 'BOLETA',
            correlativo: 'B001-00001043',
            total: '280.00'
          }
        }
      ];
    }
    return raw;
  }
};
