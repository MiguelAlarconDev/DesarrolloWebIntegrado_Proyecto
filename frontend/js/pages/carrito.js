/**
 * carrito.js - Lógica del Carrito de Matrículas
 * Control de reservas, temporizador de vacante temporal (15 min),
 * cálculo dinámico de subtotales e IGV, y navegación hacia checkout.
 */

let intervalTimer = null;

function initPennCart() {
	renderCart();
	actualizarNavbar();
}

function actualizarNavbar() {
	const counterEl = document.getElementById('cart-nav-counter');
	if (counterEl) counterEl.textContent = CartService.getCartCount();
	AuthService.updateNavbar();
}

function renderCart() {
	const cart = CartService.getCart();
	const area = document.getElementById('cart-dynamic-area');
	const timerBox = document.getElementById('cart-timer-box');
	if (!area) return;

	if (cart.length === 0) {
		if (timerBox) timerBox.classList.add('d-none');
		if (intervalTimer) clearInterval(intervalTimer);

		area.innerHTML = `
			<div class="row">
				<div class="col-12 text-center py-5">
					<i class="ti-shopping-cart text-muted" style="font-size: 72px;"></i>
					<h3 class="mt-3">Tu carrito de matrícula está vacío</h3>
					<p class="text-muted">No tienes ningún curso reservado en este momento.</p>
					<a href="cursos.html" class="btn_one mt-3">Ver Catálogo de Cursos</a>
				</div>
			</div>
		`;
		return;
	}

	if (timerBox) timerBox.classList.remove('d-none');
	activarTimer();

	const totals = CartService.getTotals();

	const rowsHtml = cart.map(item => {
		const isVirtual = item.modalidad === 'VIRTUAL';
		const badge = isVirtual
			? `<span class="badge-mod-virtual"><i class="fa fa-video-camera"></i> Virtual Zoom</span>`
			: `<span class="badge-mod-presencial"><i class="fa fa-building"></i> Presencial Sede</span>`;

		return `
			<tr>
				<td class="image" data-title="Curso"><img src="${item.imagen}" alt="#"></td>
				<td class="product-des" data-title="Descripción">
					<p class="product-name"><a href="curso-detalle.html?id=${item.id}">${item.titulo}</a></p>
					<p class="product-des mb-1">${badge} &bull; Horario: ${item.horario}</p>
					<small class="text-muted"><i class="fa fa-user"></i> ${item.docente || 'Docente asignado'}</small>
				</td>
				<td class="price text-center" data-title="Precio"><span>S/ ${Number(item.precio).toFixed(2)}</span></td>
				<td class="qty text-center" data-title="Vacante">
					<span class="badge bg-light text-dark p-2 border">1 Vacante</span>
				</td>
				<td class="total-amount text-center" data-title="Total"><span>S/ ${Number(item.precio).toFixed(2)}</span></td>
				<td class="action text-center" data-title="Quitar">
					<a href="#" onclick="quitar('${item.id}'); return false;"><i class="ti-trash remove-icon"></i></a>
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
					<div class="row">
						<div class="col-lg-8 col-md-5 col-12">
							<div class="left">
								<div class="alert alert-info border-0 rounded-3 mb-0">
									<i class="fa fa-shield text-primary me-2"></i>
									<strong>Garantía de Pago:</strong> Tu pago está protegido con cifrado de 256 bits mediante la pasarela de <strong>Mercado Pago</strong>. Recibirás tu Boleta o Factura al instante.
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
									<a href="checkout.html" class="btn">Continuar al Pago</a>
									<a href="cursos.html" class="btn">Seguir Comprando</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
}

function activarTimer() {
	if (intervalTimer) clearInterval(intervalTimer);

	function tick() {
		const time = CartService.getRemainingTime();
		if (!time || time.expired) {
			clearInterval(intervalTimer);
			CartService.clearCart();
			Notifications.showToast('Tiempo de reserva finalizado. Vacante liberada.', 'warning');
			renderCart();
			return;
		}
		const timerEl = document.getElementById('timer-text');
		if (timerEl) timerEl.textContent = time.formatted;
	}

	tick();
	intervalTimer = setInterval(tick, 1000);
}

function quitar(id) {
	CartService.removeFromCart(id);
	Notifications.showToast('Curso eliminado del carrito.', 'info');
	actualizarNavbar();
	renderCart();
}

// Inicialización
$(document).ready(initPennCart);
