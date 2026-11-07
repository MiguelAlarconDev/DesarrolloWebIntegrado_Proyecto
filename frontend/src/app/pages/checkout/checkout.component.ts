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
						<p>Verifica o completa tus datos para emitir tu comprobante electrónico y enviarte los accesos.</p>
						
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
										<label>WhatsApp<span>*</span></label>
										<input type="tel" id="chk-whatsapp" placeholder="999 555 666" maxlength="12" required>
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
										<div class="d-flex gap-4 mt-2 p-3" style="background: #F6F7FB;">
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
										<input name="metodoPago" type="radio" checked> Mercado Pago (Tarjetas, Yape y Plin)
									</label>
								</div>
							</div>
						</div>

						<!-- Botón Principal de Pago -->
						<div class="single-widget get-button">
							<div class="content">
								<div class="button">
									<button type="submit" form="checkout-form" id="btn-pago" class="btn" style="cursor: pointer; border: none;">
										Pagar con Mercado Pago
									</button>
								</div>

								<!-- Acciones de confirmación cuando se abre la pasarela de Mercado Pago -->
								<div id="mp-modal-container" class="d-none mt-3 pt-3 border-top text-start">
									<p class="small text-muted mb-2">
										Completa tu operación en la ventana de Mercado Pago y luego confirma tu matrícula:
									</p>
									<div class="button mb-2">
										<button type="button" id="btn-mp-confirmar-pago" (click)="finalizarMatriculaMp()" class="btn" style="background: #2eca7f; cursor: pointer; border: none;">
											Ya pagué - Ver mi Comprobante
										</button>
									</div>
									<div class="text-center">
										<a id="btn-mp-open-direct" href="#" target="_blank" rel="noopener noreferrer" class="small text-muted" style="text-decoration: underline;">
											Volver a abrir ventana de Mercado Pago
										</a>
									</div>
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
  currentPendingMpOrder: any = null;
  private timerInterval: any = null;

  ngAfterViewInit(): void {
    this.initCheckout();
  }

  initCheckout(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const mpStatus = urlParams.get('status') || urlParams.get('collection_status');
    if (mpStatus === 'approved') {
      this.notifications.showToast('¡Pago aprobado en Mercado Pago! Confirmando tu matrícula...', 'success');
      setTimeout(() => this.finalizarMatriculaMp(), 500);
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
    this.actualizarBotonPago();
    this.cartService.updateBadge();
    this.authService.updateNavbar();
  }

  private renderUserStatusCard(): void {
    const card = document.getElementById('user-status-card');
    const user = this.authService.getCurrentUser();

    if (user) {
      if (card) card.innerHTML = '';

      const chkNom = document.getElementById('chk-nombres') as HTMLInputElement | null;
      if (chkNom && !chkNom.value) chkNom.value = user.nombres || 'Carlos';
      const chkApe = document.getElementById('chk-apellidos') as HTMLInputElement | null;
      if (chkApe && !chkApe.value) chkApe.value = user.apellidos || 'Alarcón';
      const chkCorreo = document.getElementById('chk-correo') as HTMLInputElement | null;
      if (chkCorreo && !chkCorreo.value) chkCorreo.value = user.correo || 'estudiante@cursos.com';
      const chkDni = document.getElementById('chk-dni') as HTMLInputElement | null;
      if (chkDni && !chkDni.value) chkDni.value = user.dni || '30000003';
      const chkWa = document.getElementById('chk-whatsapp') as HTMLInputElement | null;
      if (chkWa && !chkWa.value) chkWa.value = user.whatsapp ? user.whatsapp.replace('+51', '').trim() : '999555666';
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

  private actualizarBotonPago(): void {
    const btn = document.getElementById('btn-pago');
    if (!btn) return;
    btn.setAttribute('data-method', 'TARJETA');
    btn.textContent = 'Pagar con Mercado Pago';
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

    let mpWindow: Window | null = null;
    try {
      mpWindow = window.open('about:blank', '_blank');
      if (mpWindow) {
        mpWindow.document.write(`
          <!DOCTYPE html>
          <html lang="es">
          <head><meta charset="utf-8"><title>Conectando con Mercado Pago</title></head>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h3>Conectando con Mercado Pago...</h3>
              <p>Preparando tu pasarela de pago.</p>
            </div>
          </body>
          </html>
        `);
      }
    } catch (_) {}

    const btn = document.getElementById('btn-pago') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Conectando con Mercado Pago...';
    }

    const nombres = ((document.getElementById('chk-nombres') as HTMLInputElement)?.value?.trim() || '') || user.nombres || 'Carlos';
    const apellidos = ((document.getElementById('chk-apellidos') as HTMLInputElement)?.value?.trim() || '') || user.apellidos || 'Alarcón';
    const dni = ((document.getElementById('chk-dni') as HTMLInputElement)?.value?.trim() || '') || user.dni || '30000003';
    const whatsapp = ((document.getElementById('chk-whatsapp') as HTMLInputElement)?.value?.trim() || '') || user.whatsapp || '999555666';
    const correo = ((document.getElementById('chk-correo') as HTMLInputElement)?.value?.trim() || '') || user.correo || 'estudiante@cursos.com';
    const rucVal = (document.getElementById('chk-ruc') as HTMLInputElement)?.value?.trim() || '20601234567';
    const razonVal = (document.getElementById('chk-razon') as HTMLInputElement)?.value?.trim() || '';
    const docIdent = this.tipoComp === 'FACTURA' ? rucVal : dni;

    const estId = user.id || 'a0000000-0000-0000-0000-000000000003';

    this.authService.updateProfile({
      nombres,
      apellidos,
      dni,
      whatsapp,
      correo
    });

    try {
      const pedido = await this.pedidoService.crearPedido(cart[0].id, estId);

      const payInfo = {
        metodoPago: 'Mercado Pago',
        tipoComprobante: this.tipoComp,
        clienteNombres: `${nombres} ${apellidos}`.trim(),
        docIdentidad: docIdent,
        ruc: this.tipoComp === 'FACTURA' ? rucVal : null,
        razonSocial: this.tipoComp === 'FACTURA' ? razonVal : null,
        whatsapp,
        correo
      };

      this.currentPendingMpOrder = { pedido, payInfo };
      sessionStorage.setItem('pending_mp_order', JSON.stringify(this.currentPendingMpOrder));

      let prefData: any = null;
      if (pedido && pedido.initPoint) {
        prefData = { id: pedido.mpPreferenceId || pedido.codigoOrden, initPoint: pedido.initPoint };
      } else {
        prefData = await this.pedidoService.crearPreferenciaMp({
          titulo: cart[0].titulo || 'Curso Gestión de Cursos',
          cantidad: 1,
          precio: parseFloat(String(cart[0].precio)) || 150.00
        });
      }

      if (!prefData || !prefData.initPoint) {
        throw new Error('No se pudo generar la preferencia de Mercado Pago.');
      }

      const modalMp = document.getElementById('mp-modal-container');
      const btnOpen = document.getElementById('btn-mp-open-direct') as HTMLAnchorElement | null;

      if (btnOpen) {
        btnOpen.href = prefData.initPoint;
      }
      if (modalMp) {
        modalMp.classList.remove('d-none');
      }

      if (mpWindow && !mpWindow.closed) {
        mpWindow.location.href = prefData.initPoint;
      }

      this.notifications.showToast('Completa tu pago en la ventana de Mercado Pago.', 'success');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Pagar con Mercado Pago';
      }
    } catch (err: any) {
      this.notifications.showToast('Error en Mercado Pago: ' + err?.message, 'error');
      if (mpWindow && !mpWindow.closed) {
        mpWindow.close();
      }
      if (btn) {
        btn.disabled = false;
        this.actualizarBotonPago();
      }
    }
  }

  async finalizarMatriculaMp(): Promise<void> {
    const btnConfirm = document.getElementById('btn-mp-confirmar-pago') as HTMLButtonElement | null;
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Confirmando pago...';
    }

    let orderData = this.currentPendingMpOrder;
    if (!orderData) {
      const saved = sessionStorage.getItem('pending_mp_order');
      if (saved) {
        try { orderData = JSON.parse(saved); } catch (_) {}
      }
    }

    try {
      if (orderData && orderData.pedido) {
        await this.pedidoService.procesarPagoMercadoPago(orderData.pedido, orderData.payInfo);
      } else {
        const cart = this.cartService.getCart();
        const user = this.authService.getCurrentUser();
        if (cart.length > 0 && user) {
          const nuevoPedido = await this.pedidoService.crearPedido(cart[0].id, user.id);
          const payInfo = {
            metodoPago: 'Mercado Pago',
            tipoComprobante: this.tipoComp || 'BOLETA',
            clienteNombres: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Alumno',
            docIdentidad: user.dni || '30000003',
            whatsapp: user.whatsapp || '999555666',
            correo: user.correo || 'estudiante@cursos.com'
          };
          await this.pedidoService.procesarPagoMercadoPago(nuevoPedido, payInfo);
        }
      }

      sessionStorage.removeItem('pending_mp_order');
      this.notifications.showToast('¡Pago recibido con éxito!', 'success');
      this.cartService.clearCart();

      setTimeout(() => {
        this.router.navigateByUrl('/confirmacion');
      }, 600);
    } catch (err: any) {
      this.notifications.showToast('Error al confirmar matrícula: ' + err?.message, 'error');
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'Reintentar confirmación';
      }
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
