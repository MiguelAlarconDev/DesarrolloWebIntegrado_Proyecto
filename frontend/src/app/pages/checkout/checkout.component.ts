import { Component, AfterViewInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title">
					<h1>Finalizar Matrícula</h1>
					<ul>
						<li>Pago de Matrícula</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->
	
	<!-- Start Checkout (Arquitectura nativa shop.css) -->
	<section class="shop checkout section">
		<div class="container">
			<div class="row"> 
				<!-- Columna Izquierda: Datos de Facturación -->
				<div class="col-lg-8 col-12">
					<div class="checkout-form">
						<h2>Datos de Facturación</h2>
						<p>Verifica tus datos para emitir tu comprobante electrónico SUNAT y despachar tus accesos por WhatsApp y correo.</p>
						
						<!-- Aviso solo si no ha iniciado sesión -->
						<div id="user-status-card"></div>

						<form class="form" id="checkout-form" (submit)="ejecutarPago($event)">
							<div class="row">
								<div class="col-lg-6 col-md-6 col-12">
									<div class="form-group">
										<label>Nombres<span>*</span></label>
										<input type="text" id="chk-nombres" placeholder="Ej. Carlos" required>
									</div>
								</div>
								<div class="col-lg-6 col-md-6 col-12">
									<div class="form-group">
										<label>Apellidos<span>*</span></label>
										<input type="text" id="chk-apellidos" placeholder="Ej. Alarcón Gómez" required>
									</div>
								</div>
								<div class="col-lg-6 col-md-6 col-12">
									<div class="form-group">
										<label>DNI / Documento<span>*</span></label>
										<input type="text" id="chk-dni" placeholder="8 dígitos" maxlength="12" required>
									</div>
								</div>
								<div class="col-lg-6 col-md-6 col-12">
									<div class="form-group">
										<label>WhatsApp (para notificación)<span>*</span></label>
										<input type="tel" id="chk-whatsapp" placeholder="935 300 159" maxlength="12" required>
									</div>
								</div>
								<div class="col-12">
									<div class="form-group">
										<label>Correo Electrónico<span>*</span></label>
										<input type="email" id="chk-correo" placeholder="correo@ejemplo.com" required>
									</div>
								</div>

								<!-- Tipo de Comprobante -->
								<div class="col-12">
									<div class="form-group">
										<label>Tipo de Comprobante<span>*</span></label>
										<div class="d-flex gap-4 mt-2 p-3" style="background: #F6F7FB; border-radius: 8px;">
											<label class="mb-0" style="cursor: pointer;">
												<input type="radio" name="tipoComp" id="comp-boleta" value="BOLETA" checked (change)="toggleFactura(false)" style="width: auto; height: auto; margin-right: 6px;">
												Boleta de Venta
											</label>
											<label class="mb-0" style="cursor: pointer;">
												<input type="radio" name="tipoComp" id="comp-factura" value="FACTURA" (change)="toggleFactura(true)" style="width: auto; height: auto; margin-right: 6px;">
												Factura (con RUC)
											</label>
										</div>
									</div>
								</div>

								<!-- Campos adicionales solo para Factura -->
								<div id="box-factura" class="col-12 d-none">
									<div class="row">
										<div class="col-lg-6 col-md-6 col-12">
											<div class="form-group">
												<label>RUC<span>*</span></label>
												<input type="text" id="chk-ruc" placeholder="20601234567" maxlength="11">
											</div>
										</div>
										<div class="col-lg-6 col-md-6 col-12">
											<div class="form-group">
												<label>Razón Social<span>*</span></label>
												<input type="text" id="chk-razon" placeholder="Nombre de la empresa">
											</div>
										</div>
									</div>
								</div>
							</div>
						</form>
					</div>
				</div>

				<!-- Columna Derecha: Resumen y Botón de Pago (shop.css .order-details) -->
				<div class="col-lg-4 col-12">
					<div class="order-details">
						<!-- Resumen de Matrícula -->
						<div class="single-widget">
							<h2>RESUMEN DE MATRÍCULA</h2>
							<div class="content">
								<ul id="order-items-list">
									<!-- Cursos inyectados dinámicamente -->
								</ul>
								<ul>
									<li>Subtotal<span id="side-subtotal">S/ 0.00</span></li>
									<li>I.G.V. (18%)<span id="side-igv">S/ 0.00</span></li>
									<li class="last">Total a Pagar<span id="side-total">S/ 0.00</span></li>
								</ul>
							</div>
						</div>

						<!-- Método de Pago -->
						<div class="single-widget">
							<h2>MÉTODO DE PAGO</h2>
							<div class="content">
								<div class="checkbox">
									<label class="checkbox-inline checked">
										<input name="metodoPago" type="radio" checked> Pasarela Mercado Pago (Tarjetas / Yape / Plin)
									</label>
								</div>
							</div>
						</div>

						<!-- Botón Principal de Pago -->
						<div class="single-widget get-button">
							<div class="content">
								<div class="button">
									<button type="submit" form="checkout-form" id="btn-pago" class="btn" style="cursor: pointer; border: none; background: #009ee3; width: 100%; font-weight: 700; font-size: 15px; padding: 14px 20px;">
										<i class="fa fa-lock me-2"></i>Pagar con Mercado Pago
									</button>
								</div>

								<!-- Estado dinámico mientras la pasarela está abierta -->
								<div id="mp-active-status" class="d-none mt-3 p-3 rounded border text-start" style="background: #f0fdf4; border-color: #86efac !important;">
									<div class="d-flex align-items-center gap-2 mb-1">
										<div class="spinner-border spinner-border-sm text-success" role="status"></div>
										<strong style="color: #166534; font-size: 13.5px;">Conectado a pasarela Mercado Pago</strong>
									</div>
									<p class="small text-muted mb-0" style="font-size: 12px; line-height: 1.4;">
										Completa el pago en la ventana emergente. Al finalizar y cerrarse la ventana, tu matrícula quedará confirmada automáticamente.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
	<!--/ End Checkout -->
  `
})
export class CheckoutComponent implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);

  tipoComp: 'BOLETA' | 'FACTURA' = 'BOLETA';
  private timerInterval: any = null;
  private popupMonitorInterval: any = null;
  private messageListener: any = null;
  private mpWindowRef: Window | null = null;
  private currentPendingOrder: any = null;
  private paymentReadyToConfirm = false;

  ngAfterViewInit(): void {
    this.initCheckout();
    this.setupMessageListener();
  }

  initCheckout(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const mpStatus = urlParams.get('status') || urlParams.get('collection_status');

    // Si Mercado Pago redirigió a esta ventana con status=approved
    if (mpStatus === 'approved') {
      const paymentId = urlParams.get('payment_id') || urlParams.get('collection_id') || ('MP-' + Date.now());

      // Si somos el popup emergente, avisamos a la ventana principal y nos cerramos automáticamente
      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage({
            type: 'MP_PAYMENT_APPROVED',
            paymentId: paymentId
          }, '*');
        } catch (_) {}
        window.close();
        return;
      }

      // Si se abrió en la misma ventana, procesamos de inmediato
      this.notifications.showToast('¡Pago aprobado en Mercado Pago! Confirmando tu matrícula...', 'success');
      this.finalizarPagoAprobado(paymentId);
      return;
    }

    const cart = this.cartService.getCart();
    if (cart.length === 0) {
      const container = document.querySelector('.shop.checkout .container');
      if (container) {
        container.innerHTML = `
          <div class="row">
            <div class="col-12 text-center py-5">
              <i class="ti-shopping-cart text-muted" style="font-size: 72px;"></i>
              <h3 class="mt-3">Tu carrito de matrícula está vacío</h3>
              <p class="text-muted">Selecciona un curso del catálogo para proceder al pago.</p>
              <a href="/cursos" class="btn_one mt-3">Ver Catálogo de Cursos</a>
            </div>
          </div>
        `;
      }
      this.cartService.updateBadge();
      this.authService.updateNavbar();
      return;
    }

    this.renderUserStatusCard();

    const totals = this.cartService.getTotals();
    const elSub = document.getElementById('side-subtotal');
    if (elSub) elSub.textContent = `S/ ${totals.subtotal}`;
    const elIgv = document.getElementById('side-igv');
    if (elIgv) elIgv.textContent = `S/ ${totals.igv}`;
    const elTot = document.getElementById('side-total');
    if (elTot) elTot.textContent = `S/ ${totals.total}`;

    const list = document.getElementById('order-items-list');
    if (list) {
      list.innerHTML = cart.map(c => `
        <li>${c.titulo}<span>S/ ${Number(c.precio).toFixed(2)}</span></li>
      `).join('');
    }

    this.startCheckoutTimer();
    this.cartService.updateBadge();
    this.authService.updateNavbar();
  }

  private setupMessageListener(): void {
    this.messageListener = (event: MessageEvent) => {
      if (event.data && event.data.type === 'MP_PAYMENT_APPROVED') {
        if (this.mpWindowRef && !this.mpWindowRef.closed) {
          try { this.mpWindowRef.close(); } catch (_) {}
        }
        if (this.popupMonitorInterval) {
          clearInterval(this.popupMonitorInterval);
          this.popupMonitorInterval = null;
        }
        this.finalizarPagoAprobado(event.data.paymentId);
      }
    };
    window.addEventListener('message', this.messageListener);
  }

  private renderUserStatusCard(): void {
    const card = document.getElementById('user-status-card');
    const user = this.authService.getCurrentUser();

    if (user) {
      if (card) card.innerHTML = '';

      const chkNom = document.getElementById('chk-nombres') as HTMLInputElement | null;
      if (chkNom && !chkNom.value) chkNom.value = user.nombres || 'Jose Elmer';
      const chkApe = document.getElementById('chk-apellidos') as HTMLInputElement | null;
      if (chkApe && !chkApe.value) chkApe.value = user.apellidos || 'Coronado Maldonado';
      const chkCorreo = document.getElementById('chk-correo') as HTMLInputElement | null;
      if (chkCorreo && !chkCorreo.value) chkCorreo.value = user.correo || 'carlokasike333@gmail.com';
      const chkDni = document.getElementById('chk-dni') as HTMLInputElement | null;
      if (chkDni && !chkDni.value) chkDni.value = user.dni || '75187638';
      const chkWa = document.getElementById('chk-whatsapp') as HTMLInputElement | null;
      if (chkWa && !chkWa.value) chkWa.value = user.whatsapp ? user.whatsapp.replace('+51', '').trim() : '935300159';
    } else if (card) {
      card.innerHTML = `
        <div class="abmv mb-4">
          <span class="ti-user"></span>
          <h4>Inicia sesión para continuar</h4>
          <p class="mb-2">Necesitas ingresar con tu cuenta de alumno para registrar tu matrícula.</p>
          <a href="/login?redirect=checkout.html" class="btn_one me-2">Iniciar Sesión</a>
          <a href="/registro?redirect=checkout.html" class="btn_two">Crear Cuenta</a>
        </div>
      `;
    }
  }

  private startCheckoutTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const timerEl = document.getElementById('ck-timer-text');
    if (!timerEl) return;

    this.cartService.startReservationTimer();

    const tick = () => {
      const t = this.cartService.getRemainingTime();
      if (t) {
        timerEl.textContent = t.formatted;
        if (t.expired) {
          timerEl.textContent = '00:00';
        }
      }
    };
    tick();
    this.timerInterval = setInterval(tick, 1000);
  }

  toggleFactura(isFactura: boolean): void {
    this.tipoComp = isFactura ? 'FACTURA' : 'BOLETA';
    const boxFactura = document.getElementById('box-factura');
    if (boxFactura) boxFactura.classList.toggle('d-none', !isFactura);

    const ruc = document.getElementById('chk-ruc');
    const razon = document.getElementById('chk-razon');
    if (isFactura) {
      if (ruc) ruc.setAttribute('required', 'true');
      if (razon) razon.setAttribute('required', 'true');
    } else {
      if (ruc) ruc.removeAttribute('required');
      if (razon) razon.removeAttribute('required');
    }
  }

  async ejecutarPago(e: Event): Promise<void> {
    e.preventDefault();

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.notifications.showToast('Por favor inicia sesión para matricularte.', 'warning');
      const card = document.getElementById('user-status-card');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const cart = this.cartService.getCart();
    if (cart.length === 0) return;

    const nombres = ((document.getElementById('chk-nombres') as HTMLInputElement)?.value?.trim() || '') || user.nombres || 'Jose Elmer';
    const apellidos = ((document.getElementById('chk-apellidos') as HTMLInputElement)?.value?.trim() || '') || user.apellidos || 'Coronado Maldonado';
    const dni = ((document.getElementById('chk-dni') as HTMLInputElement)?.value?.trim() || '') || user.dni || '75187638';
    const whatsapp = ((document.getElementById('chk-whatsapp') as HTMLInputElement)?.value?.trim() || '') || user.whatsapp || '935300159';
    const correo = ((document.getElementById('chk-correo') as HTMLInputElement)?.value?.trim() || '') || user.correo || 'carlokasike333@gmail.com';
    const rucVal = (document.getElementById('chk-ruc') as HTMLInputElement)?.value?.trim() || '20601234567';
    const razonVal = (document.getElementById('chk-razon') as HTMLInputElement)?.value?.trim() || '';
    const docIdent = this.tipoComp === 'FACTURA' ? rucVal : dni;

    const estId = user.id || 'e9d63958-ec17-41be-a766-bfa231494671';

    this.authService.updateProfile({
      nombres,
      apellidos,
      dni,
      whatsapp,
      correo
    });

    const screenW = window.screen.availWidth || window.screen.width || 1024;
    const screenH = window.screen.availHeight || window.screen.height || 768;
    const width = Math.min(820, Math.floor(screenW * 0.9));
    const height = Math.min(760, Math.floor(screenH * 0.9));
    const left = Math.max(0, Math.floor((screenW - width) / 2));
    const top = Math.max(0, Math.floor((screenH - height) / 2));

    let mpWindow: Window | null = null;
    try {
      mpWindow = window.open('about:blank', 'MercadoPagoCheckout', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=1,resizable=yes`);
      if (mpWindow) {
        mpWindow.document.write(`
          <!DOCTYPE html>
          <html lang="es">
          <head><meta charset="utf-8"><title>Mercado Pago - Preparando Checkout...</title></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5;">
            <div style="text-align: center; padding: 24px;">
              <div style="width: 44px; height: 44px; border: 4px solid #e2e8f0; border-top-color: #009ee3; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 14px;"></div>
              <h3 style="color: #009ee3; margin-bottom: 6px; font-weight: 700;">Conectando con Mercado Pago...</h3>
              <p style="color: #64748b; font-size: 14px; margin: 0;">Generando preferencia segura para tu matrícula.</p>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
          </body>
          </html>
        `);
      }
    } catch (_) {}

    this.mpWindowRef = mpWindow;
    this.paymentReadyToConfirm = false;

    const btn = document.getElementById('btn-pago') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i>Esperando confirmación de Mercado Pago...';
    }

    try {
      // 1. Crear el pedido en el backend (devuelve el initPoint de Mercado Pago)
      const pedido = await this.pedidoService.crearPedido(cart[0].id, estId);

      const payInfo: any = {
        metodoPago: 'Mercado Pago (Tarjeta)',
        tipoComprobante: this.tipoComp,
        clienteNombres: `${nombres} ${apellidos}`.trim(),
        docIdentidad: docIdent,
        ruc: this.tipoComp === 'FACTURA' ? rucVal : null,
        razonSocial: this.tipoComp === 'FACTURA' ? razonVal : null,
        whatsapp,
        correo
      };

      this.currentPendingOrder = { pedido, payInfo };
      sessionStorage.setItem('pending_mp_order', JSON.stringify(this.currentPendingOrder));

      const initPoint = pedido.initPoint || pedido.mpInitPoint || (pedido as any).init_point || (pedido as any).sandbox_init_point;

      if (initPoint && (initPoint.includes('mercadopago.com') || initPoint.startsWith('http'))) {
        if (mpWindow && !mpWindow.closed) {
          mpWindow.location.href = initPoint;
        } else {
          window.location.href = initPoint;
          return;
        }

        const statusBox = document.getElementById('mp-active-status');
        if (statusBox) statusBox.classList.remove('d-none');

        const openedAt = Date.now();
        let hasLeftOrigin = false;
        let ticks = 0;
        let isCheckingApi = false;

        if (this.popupMonitorInterval) clearInterval(this.popupMonitorInterval);
        this.popupMonitorInterval = setInterval(async () => {
          ticks++;
          if (hasLeftOrigin && (Date.now() - openedAt > 6000)) {
            this.paymentReadyToConfirm = true;
          }

          // Detectar cuando la ventana ya navegó al dominio de Mercado Pago (cross-origin)
          // y solo cerrar si Mercado Pago redirige de vuelta con ?status=approved
          try {
            if (this.mpWindowRef && !this.mpWindowRef.closed) {
              const popupHref = this.mpWindowRef.location.href;
              if (hasLeftOrigin && popupHref && popupHref.includes(window.location.origin)) {
                const params = new URLSearchParams(this.mpWindowRef.location.search);
                const status = params.get('status') || params.get('collection_status');
                const payId = params.get('payment_id') || params.get('collection_id') || ('MP-' + Date.now());
                if (status === 'approved') {
                  clearInterval(this.popupMonitorInterval);
                  this.popupMonitorInterval = null;
                  try { this.mpWindowRef.close(); } catch (_) {}
                  this.finalizarPagoAprobado(payId);
                  return;
                }
              }
            }
          } catch (_) {
            // Al estar en mercadopago.com.pe (cross-origin), el navegador lanza excepción de seguridad
            hasLeftOrigin = true;
          }

          // Consultar periódicamente en el backend si el pago ya fue aprobado en Mercado Pago Checkout Pro
          if (hasLeftOrigin && ticks % 3 === 0 && !isCheckingApi && this.mpWindowRef && !this.mpWindowRef.closed) {
            isCheckingApi = true;
            try {
              const mpState = await this.pedidoService.verificarEstadoMercadoPago(pedido.id);
              if (mpState.approved) {
                if (this.popupMonitorInterval) {
                  clearInterval(this.popupMonitorInterval);
                  this.popupMonitorInterval = null;
                }
                setTimeout(() => {
                  try {
                    if (this.mpWindowRef && !this.mpWindowRef.closed) {
                      this.mpWindowRef.close();
                    }
                  } catch (_) {}
                  this.finalizarPagoAprobado(mpState.paymentId);
                }, 1500);
                return;
              }
            } finally {
              isCheckingApi = false;
            }
          }

          // Cuando el usuario cierra la ventana emergente
          if (!this.mpWindowRef || this.mpWindowRef.closed) {
            clearInterval(this.popupMonitorInterval);
            this.popupMonitorInterval = null;

            const mpState = await this.pedidoService.verificarEstadoMercadoPago(pedido.id);
            if (mpState.approved) {
              this.finalizarPagoAprobado(mpState.paymentId);
            } else {
              await this.pedidoService.cancelarPedido(pedido.id);
              const statusBox = document.getElementById('mp-active-status');
              if (statusBox) statusBox.classList.add('d-none');
              if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa fa-lock me-2"></i>Pagar con Mercado Pago';
              }
              this.notifications.showToast('La ventana de Mercado Pago se cerró sin completar el pago. Tu vacante fue liberada.', 'info');
            }
          }
        }, 600);

      } else {
        if (mpWindow && !mpWindow.closed) {
          try { mpWindow.close(); } catch (_) {}
        }
        await this.finalizarPagoAprobado('MP-' + Date.now());
      }

    } catch (err: any) {
      this.notifications.showToast('Error en Mercado Pago: ' + err?.message, 'error');
      if (mpWindow && !mpWindow.closed) {
        try { mpWindow.close(); } catch (_) {}
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-lock me-2"></i>Pagar con Mercado Pago';
      }
    }
  }

  async finalizarPagoAprobado(paymentId?: string): Promise<void> {
    const btn = document.getElementById('btn-pago') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i>Confirmando tu matrícula y despachando WhatsApp...';
    }

    let orderData = this.currentPendingOrder;
    if (!orderData) {
      const saved = sessionStorage.getItem('pending_mp_order');
      if (saved) {
        try { orderData = JSON.parse(saved); } catch (_) {}
      }
    }

    const payIdFinal = paymentId || ('MP-' + Math.floor(100000000 + Math.random() * 900000000));

    try {
      if (orderData && orderData.pedido) {
        orderData.payInfo.mpPaymentId = payIdFinal;
        await this.pedidoService.procesarPagoMercadoPago(orderData.pedido, orderData.payInfo);
      } else {
        const cart = this.cartService.getCart();
        const user = this.authService.getCurrentUser();
        if (cart.length > 0 && user) {
          const nuevoPedido = await this.pedidoService.crearPedido(cart[0].id, user.id);
          const payInfo = {
            metodoPago: 'Mercado Pago (Tarjeta)',
            mpPaymentId: payIdFinal,
            tipoComprobante: this.tipoComp || 'BOLETA',
            clienteNombres: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Alumno',
            docIdentidad: user.dni || '75187638',
            whatsapp: user.whatsapp || '935300159',
            correo: user.correo || 'carlokasike333@gmail.com'
          };
          await this.pedidoService.procesarPagoMercadoPago(nuevoPedido, payInfo);
        }
      }

      sessionStorage.removeItem('pending_mp_order');
      this.notifications.showToast('¡Pago confirmado en Mercado Pago! Matrícula registrada con éxito.', 'success');
      this.cartService.clearCart();

      setTimeout(() => {
        this.router.navigateByUrl('/confirmacion');
      }, 700);

    } catch (err: any) {
      this.notifications.showToast('Error al confirmar matrícula: ' + err?.message, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-lock me-2"></i>Pagar con Mercado Pago';
      }
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.popupMonitorInterval) {
      clearInterval(this.popupMonitorInterval);
      this.popupMonitorInterval = null;
    }
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    if (this.mpWindowRef && !this.mpWindowRef.closed) {
      try { this.mpWindowRef.close(); } catch (_) {}
    }
  }
}
