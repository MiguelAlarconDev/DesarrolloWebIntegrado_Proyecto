import { Component, AfterViewInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { APP_CONFIG } from '../../services/config.data';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP  -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title wow fadeInRight" data-wow-duration="1s" data-wow-delay="0.3s" data-wow-offset="0">
					<h1>Carrito de Inscripción</h1>
					<ul>
						<li>Carrito de Matrícula</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->
	
	<!-- Shopping Cart  -->
	<div class="shopping-cart section">
		<div class="container">
			
			<!-- Temporizador de Reserva de Vacante en Tiempo Real -->
			<div class="cart-timer-box d-none" id="cart-timer-box">
				<div class="d-flex align-items-center gap-3">
					<i class="fa fa-clock-o fs-2 text-warning"></i>
					<div>
						<h5 class="mb-0 fw-bold">¡Tu Vacante está Reservada en Tiempo Real!</h5>
						<small class="text-muted">El sistema bloquea temporalmente tu cupo para que nadie te lo gane mientras completas el pago.</small>
					</div>
				</div>
				<div class="text-end">
					<small class="d-block text-muted">Tiempo restante:</small>
					<span class="timer-digits" id="timer-text">15:00</span>
				</div>
			</div>

			<div id="cart-dynamic-area">
				<!-- Inyectado con la tabla Gestión de Cursos -->
			</div>
		</div>
	</div>
	<!--/ End Shopping Cart -->
  `
})
export class CarritoComponent implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private notifications = inject(NotificationService);
  private intervalTimer: any = null;

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      (window as any).quitar = (id: string, ev?: Event) => this.quitar(id, ev);
      (window as any).procederAlPago = () => this.procederAlPago();
    }
    this.initCart();
  }

  initCart(): void {
    try {
      const params = new URLSearchParams(window.location.search);
      const cid = params.get('cursoId') || params.get('id');
      if (cid) {
        let c = APP_CONFIG.INITIAL_COURSES.find(x => x.id === cid);
        if (!c) {
          const cached = JSON.parse(localStorage.getItem('app_cursos_cache') || '[]');
          c = cached.find((x: any) => x.id === cid);
        }
        if (c) {
          this.cartService.addToCart(c);
        }
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('cursoId');
          url.searchParams.delete('id');
          window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
        } catch (_) {}
      }
    } catch (_) {}

    this.renderCart();
    this.actualizarNavbar();
  }

  private actualizarNavbar(): void {
    this.cartService.updateBadge();
    this.authService.updateNavbar();
  }

  renderCart(): void {
    const area = document.getElementById('cart-dynamic-area');
    const timerBox = document.getElementById('cart-timer-box');
    const cart = this.cartService.getCart();
    if (!area) return;

    if (cart.length === 0) {
      if (timerBox) timerBox.classList.add('d-none');
      if (this.intervalTimer) clearInterval(this.intervalTimer);

      area.innerHTML = `
        <div class="row">
          <div class="col-12 text-center py-5">
            <i class="ti-shopping-cart text-muted" style="font-size: 72px;"></i>
            <h3 class="mt-3">Tu carrito de matrícula está vacío</h3>
            <p class="text-muted">No tienes ningún curso reservado en este momento.</p>
            <a href="/cursos" class="btn_one mt-3">Ver Catálogo de Cursos</a>
          </div>
        </div>
      `;
      return;
    }

    if (timerBox) timerBox.classList.remove('d-none');
    this.activarTimer();

    const totals = this.cartService.getTotals();

    const rowsHtml = cart.map(item => {
      const isVirtual = item.modalidad === 'VIRTUAL';
      const badge = isVirtual
        ? `<span class="badge-mod-virtual"><i class="fa fa-video-camera"></i> Virtual Zoom</span>`
        : `<span class="badge-mod-presencial"><i class="fa fa-building"></i> Presencial Sede</span>`;

      return `
        <tr>
          <td class="image" data-title="Curso">
            <img src="${item.imagen || 'assets/images/all-img/c1.png'}" alt="${item.titulo}">
          </td>
          <td class="product-des" data-title="Descripción">
            <p class="product-name"><a href="/curso-detalle?id=${item.id}">${item.titulo}</a></p>
            <p class="product-des mb-1">${badge} &bull; Horario: ${item.horario || 'Horario asignado'}</p>
            <small class="text-muted"><i class="fa fa-user"></i> ${item.docente || 'Docente asignado'}</small>
          </td>
          <td class="price text-center" data-title="Precio">
            <span>S/ ${Number(item.precio).toFixed(2)}</span>
          </td>
          <td class="qty text-center" data-title="Vacante">
            <span class="badge bg-light text-dark p-2 border">1 Vacante</span>
          </td>
          <td class="total-amount text-center" data-title="Total">
            <span>S/ ${Number(item.precio).toFixed(2)}</span>
          </td>
          <td class="action text-center" data-title="Quitar">
            <a href="javascript:void(0)" onclick="window.quitar('${item.id}', event); return false;" title="Quitar curso del carrito">
              <i class="ti-trash remove-icon"></i>
            </a>
          </td>
        </tr>
      `;
    }).join('');

    area.innerHTML = `
      <div class="row">
        <div class="col-12">
          <table class="table shopping-summery">
            <thead>
              <tr class="main-hading">
                <th>CURSO</th>
                <th>DETALLE Y MODALIDAD</th>
                <th class="text-center">PRECIO</th>
                <th class="text-center">RESERVA</th>
                <th class="text-center">SUBTOTAL</th> 
                <th class="text-center"><i class="ti-trash remove-icon"></i></th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <div class="row">
        <div class="col-12">
          <div class="total-amount">
            <div class="row align-items-center">
              <div class="col-lg-8 col-md-5 col-12">
                <div class="left">
                  <div class="abmv mb-0">
                    <span class="ti-shield"></span>
                    <h4>Garantía de Pago y Reserva</h4>
                    <p>Tu pago se procesa mediante la pasarela de Mercado Pago y tu Boleta o Factura electrónica se emite al instante junto con tus accesos por WhatsApp.</p>
                  </div>
                </div>
              </div>
              <div class="col-lg-4 col-md-7 col-12">
                <div class="right">
                  <ul>
                    <li>Subtotal (sin IGV)<span>S/ ${totals.subtotal}</span></li>
                    <li>I.G.V. (18%)<span>S/ ${totals.igv}</span></li>
                    <li class="last">Total a Pagar<span>S/ ${totals.total}</span></li>
                  </ul>
                  <div class="button5">
                    <a href="javascript:void(0)" onclick="window.procederAlPago(); return false;" class="btn">Continuar al Pago</a>
                    <a href="/cursos" class="btn">Seguir Explorando Cursos</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  procederAlPago(): void {
    const cart = this.cartService.getCart();
    if (cart.length === 0) {
      this.notifications.showToast('Tu carrito de matrícula está vacío.', 'warning');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login?redirect=checkout.html');
    } else {
      this.router.navigateByUrl('/checkout');
    }
  }

  quitar(id: string, ev?: Event): boolean {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    if (!id) return false;
    this.cartService.removeFromCart(id);
    this.renderCart();
    this.actualizarNavbar();
    this.notifications.showToast('Curso eliminado del carrito.', 'info');
    return false;
  }

  private activarTimer(): void {
    if (this.intervalTimer) clearInterval(this.intervalTimer);

    const timerEl = document.getElementById('timer-text');
    if (!timerEl) return;

    this.cartService.startReservationTimer();

    const updateTimerDisplay = () => {
      const res = this.cartService.getRemainingTime();
      if (!res) return;

      timerEl.textContent = res.formatted;

      if (res.expired) {
        clearInterval(this.intervalTimer);
        this.notifications.showToast('El tiempo de reserva de vacante ha expirado.', 'warning');
      }
    };

    updateTimerDisplay();
    this.intervalTimer = setInterval(updateTimerDisplay, 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}
