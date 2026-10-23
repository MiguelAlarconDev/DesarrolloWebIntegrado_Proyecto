/**
 * carrito.js - Lógica del Carrito de Matrículas (UX Simplificado y Enfocado)
 * Flujo directo: Carrito -> Continuar al Pago (Checkout con Mercado Pago)
 * Detección automática y prevención de compra de cursos ya matriculados.
 */

let intervalTimer = null;

async function initCart() {
	// 1. Si el usuario está autenticado, verificar si ya pagó algún curso que esté en el carrito
	const user = AuthService.getCurrentUser();
	if (user) {
		try {
			const matriculas = await PedidosService.getMisMatriculas(user.id);
			const paidIds = new Set();
			(matriculas || []).forEach(m => {
				if (m.estado === 'PAGADO') {
					const cid = (m.curso && m.curso.id) ? m.curso.id : (m.cursoId || m.id);
					if (cid) paidIds.add(cid);
				}
			});

			const removidos = CartService.removePaidCourses(paidIds);
			if (removidos.length > 0) {
				removidos.forEach(r => {
					Notifications.showToast(`Ya estás matriculado en "${r.titulo}". Lo retiramos del carrito.`, 'info');
				});
			}
		} catch (_) {}
	}

	renderCart();
	actualizarNavbar();
}

function actualizarNavbar() {
	CartService.updateBadge();
	AuthService.updateNavbar();
}

async function agregarCursoDemoCarrito() {
	try {
		const cursos = await CursosService.getCursos();
		if (cursos && cursos.length > 0) {
			CartService.addToCart(cursos[0]);
			Notifications.showToast(`Curso "${cursos[0].titulo}" agregado al carrito.`, 'success');
			actualizarNavbar();
			renderCart();
		}
	} catch (err) {
		Notifications.showToast('No se pudo cargar el curso de prueba.', 'error');
	}
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
					<div style="max-width: 480px; margin: 0 auto; background: #ffffff; padding: 40px 30px; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.04); border: 1px solid #eef2f6;">
						<div style="width: 76px; height: 76px; border-radius: 50%; background: #f0fdf4; color: #2eca7f; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 32px;">
							<i class="ti-shopping-cart"></i>
						</div>
						<h3 style="color: #1a2d62; font-weight: 800; font-size: 22px; margin-bottom: 8px;">Tu carrito de matrícula está vacío</h3>
						<p class="text-muted mb-4" style="font-size: 14px;">Elige un curso de nuestro catálogo para inscribirte y pagar con Mercado Pago.</p>
						<div class="d-flex justify-content-center gap-2 flex-wrap">
							<a href="cursos.html" class="btn_one" style="border-radius: 8px; padding: 11px 24px; text-decoration: none;">
								<i class="fa fa-graduation-cap me-1"></i> Explorar Catálogo
							</a>
							<button type="button" onclick="agregarCursoDemoCarrito()" class="btn_two" style="border-radius: 8px; padding: 11px 20px; cursor: pointer; background: #f8fafc;">
								<i class="fa fa-bolt me-1"></i> Cargar Curso Demo
							</button>
						</div>
					</div>
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
			? `<span class="badge-mod-virtual"><i class="fa fa-video-camera"></i> Virtual en Vivo</span>`
			: `<span class="badge-mod-presencial"><i class="fa fa-building"></i> Presencial en Sede</span>`;

		return `
			<tr>
				<td class="image" data-title="Curso">
					<img src="${item.imagen || 'assets/images/all-img/c1.png'}" alt="${item.titulo}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 8px;">
				</td>
				<td class="product-des" data-title="Descripción">
					<p class="product-name" style="margin-bottom: 4px;">
						<a href="curso-detalle.html?id=${item.id}" style="font-weight: 800; color: #1a2d62; font-size: 15px;">${item.titulo}</a>
					</p>
					<p class="product-des mb-0" style="font-size: 12.5px; color: #64748b;">
						${badge} &bull; <i class="fa fa-calendar text-primary ms-1"></i> ${item.horario || 'Horario flexible'}
					</p>
				</td>
				<td class="price text-center" data-title="Precio">
					<span style="font-weight: 700; color: #1a2d62;">S/ ${Number(item.precio).toFixed(2)}</span>
				</td>
				<td class="qty text-center" data-title="Vacante">
					<span class="badge bg-light text-success p-2 border border-success-subtle" style="font-weight: 700; font-size: 12px;">
						<i class="fa fa-check-circle me-1"></i>1 Vacante Reservada
					</span>
				</td>
				<td class="total-amount text-center" data-title="Total">
					<span style="font-weight: 800; color: #2eca7f; font-size: 16px;">S/ ${Number(item.precio).toFixed(2)}</span>
				</td>
				<td class="action text-center" data-title="Quitar">
					<a href="#" onclick="quitar('${item.id}'); return false;" title="Quitar curso del carrito" style="color: #ef4444; font-size: 16px;">
						<i class="ti-trash"></i>
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
							<th class="text-center">VACANTE</th>
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

		<div class="row justify-content-end mt-4">
			<!-- Columna Resumen y Pago Único -->
			<div class="col-lg-5 col-md-7 col-12">
				<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 26px; box-shadow: 0 10px 30px rgba(0,0,0,0.04);">
					<h5 style="font-weight: 800; color: #1a2d62; font-size: 17px; margin-bottom: 16px; border-bottom: 2px solid #2eca7f; padding-bottom: 8px; display: inline-block;">
						RESUMEN DE INSCRIPCIÓN
					</h5>

					<div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #475569;">
						<span>Subtotal</span>
						<span style="font-weight: 700; color: #0f172a;">S/ ${totals.subtotal}</span>
					</div>
					<div style="display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 14px; color: #475569;">
						<span>I.G.V. (18%)</span>
						<span style="font-weight: 700; color: #0f172a;">S/ ${totals.igv}</span>
					</div>
					<div style="display: flex; justify-content: space-between; padding-top: 14px; border-top: 1px dashed #cbd5e1; font-size: 19px; font-weight: 900; color: #1a2d62; margin-bottom: 22px;">
						<span>Total a Pagar</span>
						<span style="color: #2eca7f; font-size: 22px;">S/ ${totals.total}</span>
					</div>

					<!-- UN SOLO BOTÓN PRINCIPAL DESTACADO -->
					<button type="button" onclick="procederAlPago()" class="btn_one w-100" style="height: 50px; font-size: 15px; font-weight: 800; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(46, 202, 127, 0.35);">
						Continuar al Pago con Mercado Pago <i class="fa fa-arrow-right"></i>
					</button>

					<a href="cursos.html" class="d-block text-center mt-3 text-muted" style="font-size: 13px; text-decoration: none;">
						<i class="fa fa-arrow-left me-1"></i> Seguir explorando cursos
					</a>

					<!-- Sellos de confianza oficiales -->
					<div class="mt-4 pt-3 border-top text-center">
						<div class="d-flex align-items-center justify-content-center gap-2 mb-2" style="font-size: 12px; font-weight: 700; color: #009ee3;">
							<i class="fa fa-shield"></i> Pasarela Oficial Mercado Pago
						</div>
						<div class="d-flex justify-content-center gap-2 flex-wrap">
							<span class="badge" style="background:#1a1f71;color:#fff;font-size:10px;padding:4px 8px;">VISA</span>
							<span class="badge" style="background:#eb001b;color:#fff;font-size:10px;padding:4px 8px;">MASTERCARD</span>
							<span class="badge" style="background:#2e77bb;color:#fff;font-size:10px;padding:4px 8px;">AMEX</span>
							<span class="badge bg-secondary" style="font-size:10px;padding:4px 8px;">DÉBITO</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
}

function procederAlPago() {
	const cart = CartService.getCart();
	if (cart.length === 0) {
		Notifications.showToast('Tu carrito de matrícula está vacío.', 'warning');
		return;
	}

	// Si no tiene sesión activa, redirigir a ingresar usuario directamente
	if (!AuthService.isAuthenticated()) {
		window.location.href = 'login.html?redirect=checkout.html';
	} else {
		window.location.href = 'checkout.html';
	}
}

function quitar(id) {
	CartService.removeFromCart(id);
	renderCart();
	actualizarNavbar();
	Notifications.showToast('Curso quitado del carrito.', 'info');
}

function activarTimer() {
	if (intervalTimer) clearInterval(intervalTimer);

	const timerEl = document.getElementById('timer-text');
	if (!timerEl) return;

	CartService.startReservationTimer();

	const updateTimerDisplay = () => {
		const res = CartService.getRemainingTime();
		if (!res) return;

		timerEl.textContent = res.formatted;

		if (res.expired) {
			clearInterval(intervalTimer);
			Notifications.showToast('El tiempo de reserva de vacante ha expirado.', 'warning');
		}
	};

	updateTimerDisplay();
	intervalTimer = setInterval(updateTimerDisplay, 1000);
}

// Inicialización única al cargar el DOM
$(document).ready(initCart);
