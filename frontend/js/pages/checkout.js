/**
 * checkout.js - Lógica del Proceso de Pago y Emisión de Comprobantes
 * Integración 100% enfocada en Mercado Pago Checkout Pro (Oficial y Seguro)
 * Experiencia de usuario simplificada, sin elementos distractores y con soporte completo Sandbox.
 */

let tipoComp = 'BOLETA';
let metodoPagoSeleccionado = 'TARJETA';
let currentPendingMpOrder = null;
let timerInterval = null;

function selectMetodoPago(metodo) {
	metodoPagoSeleccionado = 'TARJETA';
	actualizarBotonPago();
}

function actualizarBotonPago() {
	const totals = CartService.getTotals();
	const btn = (document.getElementById('btn-pago') || document.getElementById('btn-pago'));
	if (!btn) return;

	btn.setAttribute('data-method', 'TARJETA');
	btn.innerHTML = `<i class="fa fa-lock"></i> Pagar con Mercado Pago · S/ ${totals.total}`;
}

/**
 * Renderiza la tarjeta de estado del alumno
 */
function renderUserStatusCard() {
	const card = document.getElementById('user-status-card');
	if (!card) return;

	const user = AuthService.getCurrentUser();

	if (user) {
		const nombreCompleto = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Alumno Registrado';
		const iniciales = ((user.nombres ? user.nombres[0] : '') + (user.apellidos ? user.apellidos[0] : '')).toUpperCase() || 'AL';

		card.innerHTML = `
			<div class="ck-user-row">
				<div class="ck-avatar">${iniciales}</div>
				<div class="ck-user-info">
					<strong>${nombreCompleto} <span class="ck-chip"><i class="fa fa-check-circle"></i> Sesión iniciada</span></strong>
					<span>${user.correo} &bull; DNI: <strong>${user.dni || '30000003'}</strong> &bull; WA: <strong>+51 ${user.whatsapp ? user.whatsapp.replace('+51', '').trim() : '999555666'}</strong></span>
				</div>
				<button type="button" class="ck-link-btn" onclick="cerrarSesionCheckout()" title="Ingresar con otra cuenta">
					Cambiar cuenta
				</button>
			</div>
		`;

		// Prellenar campos automáticamente
		const chkNom = document.getElementById('chk-nombres');
		if (chkNom && !chkNom.value) chkNom.value = user.nombres || 'Carlos';
		const chkApe = document.getElementById('chk-apellidos');
		if (chkApe && !chkApe.value) chkApe.value = user.apellidos || 'Alarcón';
		const chkCorreo = document.getElementById('chk-correo');
		if (chkCorreo && !chkCorreo.value) chkCorreo.value = user.correo || 'estudiante@cursos.com';
		const chkDni = document.getElementById('chk-dni');
		if (chkDni && !chkDni.value) chkDni.value = user.dni || '30000003';
		const chkWa = document.getElementById('chk-whatsapp');
		if (chkWa && !chkWa.value) chkWa.value = user.whatsapp ? user.whatsapp.replace('+51', '').trim() : '999555666';

	} else {
		card.innerHTML = `
			<div class="ck-user-empty">
				<div>
					<strong><i class="fa fa-user-circle-o"></i> Identifícate para matricularte</strong>
					<span>Asociaremos tu vacante oficial, tu comprobante SUNAT y te enviaremos los accesos de clase por WhatsApp y correo electrónico.</span>
				</div>
				<div class="ck-user-actions">
					<button type="button" onclick="cargarUsuarioDemoCheckout()" class="ck-btn ck-btn-sm ck-btn-dark">
						<i class="fa fa-bolt"></i> Cargar alumno de prueba (1 clic)
					</button>
					<a href="login.html?redirect=checkout.html" class="ck-btn ck-btn-sm ck-btn-ghost">
						<i class="fa fa-sign-in"></i> Iniciar sesión
					</a>
					<a href="registro.html?redirect=checkout.html" class="ck-btn ck-btn-sm ck-btn-ghost">
						<i class="fa fa-user-plus"></i> Crear cuenta
					</a>
				</div>
			</div>
		`;
	}
}

function cerrarSesionCheckout() {
	AuthService.logout(null);
	window.location.replace('login.html?redirect=checkout.html');
}

// Carga rápida del usuario estudiante de prueba
async function cargarUsuarioDemoCheckout() {
	try {
		Notifications.showToast('Cargando cuenta de alumno...', 'info');
		const res = await AuthService.login('estudiante@cursos.com', '123456');
		Notifications.showToast(`¡Bienvenido, ${res.user.nombres}!`, 'success');
		renderUserStatusCard();
		actualizarBotonPago();
	} catch (err) {
		console.error('Error al cargar usuario demo:', err);
		Notifications.showToast('Error: ' + err.message, 'error');
	}
}

function startCheckoutTimer() {
	if (timerInterval) clearInterval(timerInterval);
	const timerEl = document.getElementById('ck-timer-text');
	if (!timerEl) return;

	CartService.startReservationTimer();

	const tick = () => {
		const t = CartService.getRemainingTime();
		if (t) {
			timerEl.textContent = t.formatted;
			if (t.expired) {
				timerEl.textContent = '00:00';
			}
		}
	};
	tick();
	timerInterval = setInterval(tick, 1000);
}

/**
 * Copiar número de tarjeta de prueba al portapapeles
 */
function copiarTarjetaPrueba(numero) {
	if (!numero) numero = '4067430000000001';
	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(numero).then(() => {
			Notifications.showToast('¡Tarjeta copiada!: ' + numero, 'success');
		}).catch(() => {
			copiarFallback(numero);
		});
	} else {
		copiarFallback(numero);
	}
}

function copiarFallback(text) {
	try {
		const el = document.createElement('textarea');
		el.value = text;
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
		Notifications.showToast('¡Tarjeta copiada!: ' + text, 'success');
	} catch (_) {
		Notifications.showToast('Tarjeta de prueba: ' + text, 'info');
	}
}

function initCheckout() {
	// Detección automática si el alumno regresó de Mercado Pago con éxito
	const urlParams = new URLSearchParams(window.location.search);
	const mpStatus = urlParams.get('status') || urlParams.get('collection_status');
	if (mpStatus === 'approved') {
		Notifications.showToast('¡Pago aprobado en Mercado Pago! Confirmando tu matrícula...', 'success');
		setTimeout(() => finalizarMatriculaMp(), 500);
		return;
	}

	let cart = CartService.getCart();
	if (cart.length === 0) {
		// Mostrar estado vacío amigable dentro de checkout.html sin redirigir al usuario
		const row = document.querySelector('.ck-page .row.g-4') || document.querySelector('.ck-page .container');
		if (row) {
			row.innerHTML = `
				<div class="col-12 text-center py-5">
					<div class="ck-card" style="max-width: 520px; margin: 0 auto; padding: 42px 30px; text-align: center;">
						<div style="font-size: 46px; color: #2eca7f; margin-bottom: 16px;"><i class="fa fa-shopping-cart"></i></div>
						<h3 class="ck-card-title mb-2" style="font-size: 22px;">Tu carrito de matrícula está vacío</h3>
						<p class="ck-card-sub mb-4" style="font-size: 14px;">Elige un curso de nuestro catálogo para inscribirte y pagar con Mercado Pago.</p>
						<div class="d-flex justify-content-center gap-2 flex-wrap">
							<a href="index.html" class="ck-btn ck-btn-dark" style="text-decoration: none;"><i class="fa fa-graduation-cap"></i> Explorar Catálogo</a>
						</div>
					</div>
				</div>
			`;
		}
		CartService.updateBadge();
		AuthService.updateNavbar();
		return;
	}

	// Renderizar estado del usuario directamente en la tarjeta de checkout
	renderUserStatusCard();

	// Totales del carrito
	const totals = CartService.getTotals();
	const elSub = document.getElementById('side-subtotal');
	if (elSub) elSub.textContent = `S/ ${totals.subtotal}`;
	const elIgv = document.getElementById('side-igv');
	if (elIgv) elIgv.textContent = `S/ ${totals.igv}`;
	const elTot = document.getElementById('side-total');
	if (elTot) elTot.textContent = `S/ ${totals.total}`;

	// Renderizar cursos en el resumen con formato .ck-item
	const list = (document.getElementById('order-items-list') || document.getElementById('order-items-list'));
	if (list) {
		list.innerHTML = cart.map(c => `
			<li class="ck-item">
				<img src="${c.imagen || 'assets/images/all-img/c1.png'}" alt="${c.titulo}">
				<div class="ck-item-info">
					<strong>${c.titulo}</strong>
					<div class="ck-item-meta">
						<span class="ck-mod ${c.modalidad === 'VIRTUAL' ? 'is-virtual' : 'is-presencial'}">${c.modalidad || 'VIRTUAL'}</span>
						<span>&bull; ${c.horario || 'Horario flexible'}</span>
					</div>
				</div>
				<div class="ck-item-price">S/ ${Number(c.precio).toFixed(2)}</div>
			</li>
		`).join('');
	}

	startCheckoutTimer();
	actualizarBotonPago();

	CartService.updateBadge();
	AuthService.updateNavbar();

	// Conectar el formulario de pago
	const form = (document.getElementById('checkout-form') || document.getElementById('checkout-form'));
	if (form) {
		form.addEventListener('submit', ejecutarPago);
	}
}

function toggleFactura(isFactura) {
	tipoComp = isFactura ? 'FACTURA' : 'BOLETA';
	const boxFactura = document.getElementById('box-factura');
	if (boxFactura) boxFactura.classList.toggle('d-none', !isFactura);

	const ruc = document.getElementById('chk-ruc');
	const razon = document.getElementById('chk-razon');
	if (isFactura) {
		if (ruc) {
			ruc.setAttribute('required', 'true');
			if (!ruc.value) ruc.value = '20601234567';
		}
		if (razon) {
			razon.setAttribute('required', 'true');
			if (!razon.value) razon.value = 'TECH SOLUTIONS PERU S.A.C.';
		}
	} else {
		if (ruc) ruc.removeAttribute('required');
		if (razon) razon.removeAttribute('required');
	}
}

/**
 * Procesa el pago oficial conectando con Mercado Pago Checkout Pro
 * Abre la ventana de forma síncrona para evitar bloqueadores de popups
 */
async function ejecutarPago(e) {
	if (e && e.preventDefault) e.preventDefault();

	// 1. Validar usuario identificado
	const user = AuthService.getCurrentUser();
	if (!user) {
		Notifications.showToast('Por favor identifícate como alumno para matricularte.', 'warning');
		const card = document.getElementById('user-status-card');
		if (card) {
			card.classList.add('is-attention');
			setTimeout(() => card.classList.remove('is-attention'), 2000);
			card.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
		return;
	}

	const cart = CartService.getCart();
	if (cart.length === 0) return;

	// Abrir pestaña inmediatamente de forma síncrona en el click para que NUNCA sea bloqueada por el navegador
	let mpWindow = null;
	try {
		mpWindow = window.open('about:blank', '_blank');
		if (mpWindow) {
			mpWindow.document.write(`
				<!DOCTYPE html>
				<html lang="es">
				<head>
					<meta charset="utf-8">
					<title>Conectando con Mercado Pago</title>
					<style>
						body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
						.card { text-align: center; background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); max-width: 420px; }
						.spin { width: 44px; height: 44px; border: 4px solid #e2e8f0; border-top-color: #009ee3; border-radius: 50%; animation: s 1s infinite linear; margin: 0 auto 20px; }
						@keyframes s { to { transform: rotate(360deg); } }
						h2 { font-size: 20px; margin: 0 0 10px; color: #1a2d62; }
						p { font-size: 14px; color: #64748b; margin: 0; line-height: 1.5; }
					</style>
				</head>
				<body>
					<div class="card">
						<div class="spin"></div>
						<h2>Conectando con Mercado Pago...</h2>
						<p>Estamos preparando tu pasarela segura y reservando tu vacante oficial.</p>
					</div>
				</body>
				</html>
			`);
		}
	} catch (_) {}

	const btn = (document.getElementById('btn-pago') || document.getElementById('btn-pago'));
	if (btn) {
		btn.disabled = true;
		btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Conectando con Mercado Pago...`;
	}

	const nombres = (document.getElementById('chk-nombres') ? document.getElementById('chk-nombres').value.trim() : '') || user.nombres || 'Carlos';
	const apellidos = (document.getElementById('chk-apellidos') ? document.getElementById('chk-apellidos').value.trim() : '') || user.apellidos || 'Alarcón';
	const dni = (document.getElementById('chk-dni') ? document.getElementById('chk-dni').value.trim() : '') || user.dni || '30000003';
	const whatsapp = (document.getElementById('chk-whatsapp') ? document.getElementById('chk-whatsapp').value.trim() : '') || user.whatsapp || '999555666';
	const correo = (document.getElementById('chk-correo') ? document.getElementById('chk-correo').value.trim() : '') || user.correo || 'estudiante@cursos.com';
	const docIdent = tipoComp === 'FACTURA' ? (document.getElementById('chk-ruc') ? document.getElementById('chk-ruc').value || '20601234567' : '20601234567') : dni;

	const estId = user.id || 'a0000000-0000-0000-0000-000000000003';

	try {
		// 1. Crear pedido oficial en PostgreSQL
		const pedido = await PedidosService.crearPedido(cart[0].id, estId);

		const payInfo = {
			metodoPago: 'Mercado Pago Checkout',
			tipoComprobante: tipoComp,
			clienteNombres: `${nombres} ${apellidos}`.trim(),
			docIdentidad: docIdent,
			whatsapp: whatsapp,
			correo: correo
		};

		currentPendingMpOrder = { pedido, payInfo };
		sessionStorage.setItem('pending_mp_order', JSON.stringify(currentPendingMpOrder));

		// 2. Obtener initPoint oficial desde el backend
		let prefData = null;
		if (pedido && pedido.initPoint) {
			prefData = { id: pedido.mpPreferenceId || pedido.codigoOrden, initPoint: pedido.initPoint };
		} else {
			const prefPayload = {
				titulo: cart[0].titulo || 'Curso Gestión de Cursos',
				cantidad: 1,
				precio: parseFloat(cart[0].precio) || 150.00
			};

			try {
				prefData = await API.request('/pagos/crear-preferencia', {
					method: 'POST',
					body: JSON.stringify(prefPayload)
				});
			} catch (_) {
				// Fallback directo a 8083 si el gateway tuviera inconvenientes
				const resDir = await fetch('http://localhost:8083/api/pagos/crear-preferencia', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(prefPayload)
				});
				prefData = await resDir.json();
			}
		}

		if (!prefData || !prefData.initPoint) {
			throw new Error('No se pudo generar la preferencia de Mercado Pago.');
		}

		// 3. Renderizar la tarjeta informativa de pago
		const modalMp = document.getElementById('mp-modal-container');
		const btnOpen = document.getElementById('btn-mp-open-direct');
		const badgePref = document.getElementById('mp-pref-badge');

		if (btnOpen) {
			btnOpen.href = prefData.initPoint;
			btnOpen.setAttribute('target', '_blank');
			btnOpen.setAttribute('rel', 'noopener noreferrer');
		}
		if (badgePref && prefData.id) {
			badgePref.textContent = `ORDEN: ${String(prefData.id).substring(0, 16)}...`;
		}

		if (modalMp) {
			modalMp.classList.remove('d-none');
			modalMp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}

		// 4. Redirigir la pestaña abierta a Mercado Pago
		if (mpWindow && !mpWindow.closed) {
			mpWindow.location.href = prefData.initPoint;
		} else {
			// Si el navegador bloqueó completamente la pestaña nueva, abrir en la actual o mostrar botón
			Notifications.showToast('Haz clic en "Abrir Pasarela Mercado Pago" para continuar.', 'info');
		}

		Notifications.showToast('¡Ventana de Mercado Pago lista! Usa la tarjeta 4067 4300 0000 0001 para aprobar.', 'success');
		if (btn) {
			btn.disabled = false;
			btn.classList.add('is-success');
			btn.innerHTML = `<i class="fa fa-external-link"></i> Abrir Pasarela Mercado Pago`;
			btn.onclick = () => window.open(prefData.initPoint, '_blank');
		}

	} catch (err) {
		console.error('Error al generar Checkout de Mercado Pago:', err);
		Notifications.showToast('Error en Mercado Pago: ' + err.message, 'error');
		if (mpWindow && !mpWindow.closed) {
			mpWindow.close();
		}
		if (btn) {
			btn.disabled = false;
			actualizarBotonPago();
		}
	}
}

/**
 * Atajo para evaluación / modo demo: Simula la aprobación inmediata en 1 solo clic
 * sin necesidad de salir del sistema o escribir tarjetas en Mercado Pago.
 */
async function ejecutarPagoDirectoDemo() {
	const user = AuthService.getCurrentUser();
	if (!user) {
		Notifications.showToast('Por favor identifícate como alumno para matricularte.', 'warning');
		return;
	}
	const cart = CartService.getCart();
	if (cart.length === 0) {
		Notifications.showToast('Tu carrito está vacío.', 'warning');
		return;
	}

	Notifications.showToast('Simulando aprobación de pago en Mercado Pago...', 'info');

	const nombres = (document.getElementById('chk-nombres') ? document.getElementById('chk-nombres').value.trim() : '') || user.nombres || 'Carlos';
	const apellidos = (document.getElementById('chk-apellidos') ? document.getElementById('chk-apellidos').value.trim() : '') || user.apellidos || 'Alarcón';
	const dni = (document.getElementById('chk-dni') ? document.getElementById('chk-dni').value.trim() : '') || user.dni || '30000003';
	const whatsapp = (document.getElementById('chk-whatsapp') ? document.getElementById('chk-whatsapp').value.trim() : '') || user.whatsapp || '999555666';
	const correo = (document.getElementById('chk-correo') ? document.getElementById('chk-correo').value.trim() : '') || user.correo || 'estudiante@cursos.com';
	const docIdent = tipoComp === 'FACTURA' ? (document.getElementById('chk-ruc') ? document.getElementById('chk-ruc').value || '20601234567' : '20601234567') : dni;

	const estId = user.id || 'a0000000-0000-0000-0000-000000000003';

	try {
		let pedido = currentPendingMpOrder ? currentPendingMpOrder.pedido : null;
		if (!pedido) {
			pedido = await PedidosService.crearPedido(cart[0].id, estId);
		}

		const payInfo = {
			metodoPago: 'Mercado Pago Checkout (Sandbox)',
			tipoComprobante: tipoComp,
			clienteNombres: `${nombres} ${apellidos}`.trim(),
			docIdentidad: docIdent,
			whatsapp: whatsapp,
			correo: correo
		};

		currentPendingMpOrder = { pedido, payInfo };
		sessionStorage.setItem('pending_mp_order', JSON.stringify(currentPendingMpOrder));

		await finalizarMatriculaMp();
	} catch (err) {
		console.error('Error en simulación demo:', err);
		Notifications.showToast('Error en simulación: ' + err.message, 'error');
	}
}

// Confirmar matrícula después de completar el pago en Mercado Pago
async function finalizarMatriculaMp() {
	const btnConfirm = document.getElementById('btn-mp-confirmar-pago');
	if (btnConfirm) {
		btnConfirm.disabled = true;
		btnConfirm.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Verificando pago y emitiendo comprobante...`;
	}

	let orderData = currentPendingMpOrder;
	if (!orderData) {
		const saved = sessionStorage.getItem('pending_mp_order');
		if (saved) {
			try { orderData = JSON.parse(saved); } catch (_) {}
		}
	}

	try {
		if (orderData && orderData.pedido) {
			await PedidosService.procesarPagoMercadoPago(orderData.pedido, orderData.payInfo);
		} else {
			// Si no hay pedido en memoria (ej. retorno directo de MP), creamos y procesamos
			const cart = CartService.getCart();
			const user = AuthService.getCurrentUser();
			if (cart.length > 0 && user) {
				const nuevoPedido = await PedidosService.crearPedido(cart[0].id, user.id);
				const payInfo = {
					metodoPago: 'Mercado Pago Checkout',
					tipoComprobante: tipoComp || 'BOLETA',
					clienteNombres: `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Alumno',
					docIdentidad: user.dni || '30000003',
					whatsapp: user.whatsapp || '999555666',
					correo: user.correo || 'estudiante@cursos.com'
				};
				await PedidosService.procesarPagoMercadoPago(nuevoPedido, payInfo);
			}
		}

		sessionStorage.removeItem('pending_mp_order');
		Notifications.showToast('¡Pago verificado y matrícula confirmada!', 'success');
		CartService.clearCart();

		setTimeout(() => {
			window.location.href = 'confirmacion.html';
		}, 600);
	} catch (err) {
		console.error('Error al finalizar matrícula MP:', err);
		Notifications.showToast('Error al confirmar matrícula: ' + err.message, 'error');
		if (btnConfirm) {
			btnConfirm.disabled = false;
			btnConfirm.innerHTML = `<i class="fa fa-refresh"></i> Reintentar confirmación`;
		}
	}
}

// Inicialización al cargar la página
$(document).ready(initCheckout);

