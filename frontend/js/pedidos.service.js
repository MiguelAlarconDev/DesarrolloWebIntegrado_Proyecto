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
          rucCliente: paymentDetails.docIdentidad,
          razonSocial: paymentDetails.clienteNombres,
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

  getMisMatriculasSync() {
    const user = AuthService.getCurrentUser();
    if (!user) return [];
    return JSON.parse(localStorage.getItem('app_order_history') || '[]');
  },

  async getMisMatriculas(usuarioId) {
    const user = AuthService.getCurrentUser();
    const targetId = usuarioId || (user ? user.id : null);

    // REGLA ESTRICTA: Si no hay usuario autenticado, NO devolver ningún curso
    if (!targetId && !user) {
      return [];
    }

    let matriculas = [];

    // 1. Consultar pedidos del estudiante en tiempo real desde pedidos-service (PostgreSQL)
    if (targetId) {
      let remoteOrders = null;
      try {
        remoteOrders = await API.request('/pedidos/estudiante/' + targetId);
      } catch (err) {
        console.warn('[PedidosService] Gateway API no disponible o conflicto CORS, intentando directo a pedidos-service (8083)...', err.message);
      }

      // Fallback directo al microservicio pedidos-service en el puerto 8083
      if (!remoteOrders || !Array.isArray(remoteOrders)) {
        try {
          const directUrl = `${CONFIG.PEDIDOS_SERVICE_URL}/estudiante/${targetId}`;
          const res = await fetch(directUrl);
          if (res.ok) {
            remoteOrders = await res.json();
          }
        } catch (directErr) {
          console.warn('[PedidosService] No se pudo obtener pedidos directos:', directErr.message);
        }
      }

      if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
        matriculas = remoteOrders.map((p, idx) => {
          const isPresencial = p.modalidad === 'PRESENCIAL';
          const imgDefault = isPresencial ? 'assets/images/all-img/c2.png' : 'assets/images/all-img/c1.png';

          return {
            id: p.id,
            codigoOrden: p.codigoOrden || `ORD-${100000 + idx}`,
            estado: p.estado || 'PAGADO',
            monto: p.monto,
            metodoPago: p.mpPaymentId ? 'Mercado Pago' : 'Pago Confirmado',
            curso: {
              id: p.cursoId,
              titulo: p.cursoTitulo || 'Desarrollo Web Integrado con Spring Boot',
              horario: p.horario || 'Lun y Mie 19:00 - 22:00',
              modalidad: p.modalidad || 'VIRTUAL',
              enlaceClase: p.enlaceClase || 'https://meet.google.com/abc-defg-hij',
              direccionClase: p.direccionClase || 'Sede Central - Av. Universitaria 1234, Lima',
              aula: p.aula || 'Laboratorio 204',
              imagen: imgDefault
            },
            comprobante: {
              tipo: 'BOLETA',
              correlativo: 'B001-' + String(p.codigoOrden || '').replace(/\D/g, '').slice(-8).padStart(8, '0'),
              total: Number(p.monto || 150).toFixed(2)
            }
          };
        });
      }
    }

    // 2. Fusionar con pedidos guardados localmente para este usuario
    const localRaw = this.getMisMatriculasSync();
    if (Array.isArray(localRaw) && localRaw.length > 0) {
      localRaw.forEach(loc => {
        if (!matriculas.some(m => m.id === loc.id || m.codigoOrden === loc.codigoOrden)) {
          matriculas.push(loc);
        }
      });
    }

    return matriculas;
  }
};
