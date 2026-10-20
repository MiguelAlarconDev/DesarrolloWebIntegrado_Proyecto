/**
 * checkout-pro.js - Integración Frontend de Mercado Pago Checkout Pro (Sandbox)
 * Solicita la preferencia al backend Spring Boot y expone el initPoint sin redirección automática.
 * Conectado con el flujo real de matrículas y emisión de comprobantes.
 */

document.addEventListener('DOMContentLoaded', () => {
  CheckoutProApp.init();
});

const CheckoutProApp = {
  PRIMARY_API_URL: 'http://localhost:8080/api/pagos/crear-preferencia',
  FALLBACK_API_URL: 'http://localhost:8083/api/pagos/crear-preferencia',
  currentCurso: null,
  pendingOrderData: null,

  init() {
    this.cargarCursoActual();
    this.bindEvents();
    this.updateTotals();
  },

  cargarCursoActual() {
    const cart = (typeof CartService !== 'undefined') ? CartService.getCart() : [];
    if (cart && cart.length > 0) {
      this.currentCurso = cart[0];
    } else {
      // Curso por defecto si entra directo
      this.currentCurso = {
        id: 'b0000000-0000-0000-0000-000000000001',
        titulo: 'Desarrollo Web Integrado con Spring Boot',
        precio: 150.00,
        imagen: 'assets/images/all-img/c1.png'
      };
    }

    // Actualizar UI
    const titleEl = document.getElementById('display-titulo');
    if (titleEl) titleEl.textContent = this.currentCurso.titulo;

    const itemTit = document.getElementById('item-titulo');
    if (itemTit) itemTit.value = this.currentCurso.titulo;

    const itemPrice = document.getElementById('item-precio');
    if (itemPrice) itemPrice.value = parseFloat(this.currentCurso.precio).toFixed(2);

    const imgEl = document.getElementById('product-card-img');
    if (imgEl && this.currentCurso.imagen) imgEl.src = this.currentCurso.imagen;
  },

  bindEvents() {
    const payBtn = document.getElementById('btn-pagar-mp');
    if (payBtn) {
      payBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.procesarPago();
      });
    }

    const copyBtn = document.getElementById('btn-copiar-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copiarEnlace();
      });
    }

    const completeBtn = document.getElementById('btn-completar-matricula');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        this.finalizarMatricula();
      });
    }

    const qtyInput = document.getElementById('item-cantidad');
    if (qtyInput) {
      qtyInput.addEventListener('change', () => this.updateTotals());
      qtyInput.addEventListener('input', () => this.updateTotals());
    }
  },

  updateTotals() {
    const unitPrice = this.currentCurso ? parseFloat(this.currentCurso.precio) : 150.00;
    const qtyInput = document.getElementById('item-cantidad');
    const qty = Math.max(1, parseInt(qtyInput ? qtyInput.value : 1, 10) || 1);
    const total = (unitPrice * qty).toFixed(2);

    const totalDisplay = document.getElementById('display-total-monto');
    if (totalDisplay) {
      totalDisplay.textContent = `S/ ${total}`;
    }

    const btnText = document.getElementById('btn-pagar-text');
    if (btnText) {
      btnText.textContent = `Pagar con Mercado Pago (S/ ${total} PEN)`;
    }
  },

  async procesarPago() {
    const resultBox = document.getElementById('result-container');
    const errorBox = document.getElementById('error-container');

    if (resultBox) resultBox.classList.remove('show');
    if (errorBox) {
      errorBox.classList.remove('show');
      errorBox.textContent = '';
    }

    this.setLoadingState(true);

    const titulo = document.getElementById('item-titulo') ? document.getElementById('item-titulo').value.trim() : this.currentCurso.titulo;
    const qty = parseInt(document.getElementById('item-cantidad') ? document.getElementById('item-cantidad').value : 1, 10) || 1;
    const precio = parseFloat(document.getElementById('item-precio') ? document.getElementById('item-precio').value : 150.00) || 150.00;

    const payload = {
      titulo: titulo,
      cantidad: qty,
      precio: precio
    };

    try {
      // 1. Crear el pedido en el backend para reservar vacante si PedidosService está disponible
      let pedidoBackend = null;
      if (typeof PedidosService !== 'undefined') {
        const user = (typeof AuthService !== 'undefined') ? AuthService.getCurrentUser() : null;
        const estId = user ? user.id : '21b48018-8c1c-4f1d-8976-828361be0fbf';
        pedidoBackend = await PedidosService.crearPedido(this.currentCurso.id, estId);

        this.pendingOrderData = {
          pedido: pedidoBackend,
          payInfo: {
            metodoPago: 'Mercado Pago Checkout Pro',
            tipoComprobante: 'BOLETA',
            clienteNombres: user ? `${user.nombres} ${user.apellidos || ''}`.trim() : 'Estudiante Sandbox',
            docIdentidad: user ? user.dni || '74859612' : '74859612',
            whatsapp: user ? user.whatsapp || '935300159' : '935300159',
            correo: user ? user.correo : 'carlokasike333@gmail.com'
          }
        };
        sessionStorage.setItem('pending_mp_order', JSON.stringify(this.pendingOrderData));
      }

      // 2. Solicitar preferencia de pago a Mercado Pago
      let data = null;
      try {
        data = await this.enviarPeticion(this.PRIMARY_API_URL, payload);
      } catch (errGateway) {
        console.warn('[MercadoPago] Intentando endpoint directo...', errGateway);
        data = await this.enviarPeticion(this.FALLBACK_API_URL, payload);
      }

      if (!data || !data.initPoint) {
        throw new Error('El backend no retornó un initPoint válido de Mercado Pago.');
      }

      this.renderResultado(data.id, data.initPoint);

    } catch (error) {
      console.error('[MercadoPago] Error al crear preferencia:', error);
      if (errorBox) {
        errorBox.textContent = `Error al conectar con la pasarela: ${error.message}`;
        errorBox.classList.add('show');
      }
    } finally {
      this.setLoadingState(false);
    }
  },

  async enviarPeticion(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Código HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) errorMsg = errorJson.error;
      } catch (_) {
        if (errorText) errorMsg = errorText;
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  },

  setLoadingState(isLoading) {
    const payBtn = document.getElementById('btn-pagar-mp');
    const spinner = document.getElementById('btn-spinner');
    const btnText = document.getElementById('btn-pagar-text');

    if (!payBtn) return;
    payBtn.disabled = isLoading;

    if (isLoading) {
      if (spinner) spinner.classList.remove('d-none');
      if (btnText) btnText.textContent = 'Generando preferencia en Mercado Pago...';
    } else {
      if (spinner) spinner.classList.add('d-none');
      this.updateTotals();
    }
  },

  renderResultado(preferenceId, initPoint) {
    const resultBox = document.getElementById('result-container');
    const prefIdEl = document.getElementById('pref-id-display');
    const linkInput = document.getElementById('input-initpoint');
    const openBtn = document.getElementById('btn-abrir-checkout');

    if (prefIdEl) prefIdEl.textContent = `ID de Preferencia: ${preferenceId}`;
    if (linkInput) linkInput.value = initPoint;
    if (openBtn) {
      openBtn.href = initPoint;
      openBtn.setAttribute('target', '_blank');
      openBtn.setAttribute('rel', 'noopener noreferrer');
    }

    if (resultBox) {
      resultBox.classList.add('show');
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  async copiarEnlace() {
    const linkInput = document.getElementById('input-initpoint');
    const copyBtn = document.getElementById('btn-copiar-link');

    if (!linkInput || !linkInput.value) return;

    try {
      await navigator.clipboard.writeText(linkInput.value);

      if (copyBtn) {
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fa fa-check"></i> ¡Copiado!';
        copyBtn.style.background = '#15803d';

        setTimeout(() => {
          copyBtn.innerHTML = originalHtml;
          copyBtn.style.background = '';
        }, 2500);
      }
    } catch (_) {
      linkInput.select();
      document.execCommand('copy');
      alert('¡Enlace copiado al portapapeles!');
    }
  },

  async finalizarMatricula() {
    const btn = document.getElementById('btn-completar-matricula');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa fa-spinner fa-spin me-1"></i> Verificando pago y emitiendo comprobante...`;
    }

    let order = this.pendingOrderData;
    if (!order) {
      const saved = sessionStorage.getItem('pending_mp_order');
      if (saved) order = JSON.parse(saved);
    }

    try {
      if (order && order.pedido && typeof PedidosService !== 'undefined') {
        await PedidosService.procesarPagoMercadoPago(order.pedido, order.payInfo);
      }

      if (typeof CartService !== 'undefined') {
        CartService.clearCart();
      }

      if (typeof Notifications !== 'undefined') {
        Notifications.showToast('¡Matrícula confirmada con éxito!', 'success');
      }

      setTimeout(() => {
        window.location.href = 'confirmacion.html';
      }, 500);
    } catch (err) {
      console.error('Error al finalizar:', err);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa fa-graduation-cap me-1"></i> Reintentar Confirmación`;
      }
    }
  }
};
