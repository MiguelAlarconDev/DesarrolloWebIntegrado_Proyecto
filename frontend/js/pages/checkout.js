/**
 * checkout.js - Lógica del Proceso de Pago y Emisión de Comprobantes
 * Control de usuario obligatorio para matrícula, selección de pasarela
 * (Yape, Plin, Mercado Pago Checkout Pro Sandbox), generación interactiva de initPoint
 * y emisión de comprobantes oficiales SUNAT.
 */

let tipoComp = 'BOLETA';
let metodoPagoSeleccionado = 'YAPE';
let currentPendingMpOrder = null;

function selectMetodoPago(metodo) {
	metodoPagoSeleccionado = metodo;

	const metodos = [
		{ id: 'yape', key: 'YAPE' },
		{ id: 'plin', key: 'PLIN' },
		{ id: 'card', key: 'TARJETA' }
	];

	metodos.forEach(m => {
		const lbl = document.getElementById('lbl-metodo-' + m.id);
		const radio = document.getElementById('radio-' + m.id);
		const panel = document.getElementById('panel-' + m.id);

		if (m.key === metodo) {
			if (lbl) lbl.classList.add('checked');
			if (radio) radio.checked = true;
			if (panel) panel.classList.remove('d-none');
		} else {
			if (lbl) lbl.classList.remove('checked');
			if (radio) radio.checked = false;
			if (panel) panel.classList.add('d-none');
		}
	});

	// Ocultar modal de MP al cambiar de método
	const modalMp = document.getElementById('mp-modal-container');
	if (modalMp && metodo !== 'TARJETA') {
		modalMp.classList.add('d-none');
	}

	actualizarBotonPago();
}

function switchYapeModo(modo) {
	const btnCode = document.getElementById('btn-tab-yape-code');
	const btnQr = document.getElementById('btn-tab-yape-qr');
	const panelCode = document.getElementById('yape-modo-code');
	const panelQr = document.getElementById('yape-modo-qr');

	if (!btnCode || !btnQr || !panelCode || !panelQr) return;

	if (modo === 'CODE') {
		btnCode.style.background = '#742284';
		btnCode.style.color = '#fff';
		btnCode.style.border = 'none';

		btnQr.style.background = '#fff';
		btnQr.style.color = '#374151';
		btnQr.style.border = '1px solid #d1d5db';

		panelCode.classList.remove('d-none');
		panelQr.classList.add('d-none');
	} else {
		btnQr.style.background = '#742284';
		btnQr.style.color = '#fff';
		btnQr.style.border = 'none';

		btnCode.style.background = '#fff';
		btnCode.style.color = '#374151';
		btnCode.style.border = '1px solid #d1d5db';

		panelQr.classList.remove('d-none');
		panelCode.classList.add('d-none');
	}
}

function switchPlinModo(modo) {
	const btnCode = document.getElementById('btn-tab-plin-code');
	const btnQr = document.getElementById('btn-tab-plin-qr');
	const panelCode = document.getElementById('plin-modo-code');
	const panelQr = document.getElementById('plin-modo-qr');

	if (!btnCode || !btnQr || !panelCode || !panelQr) return;

	if (modo === 'CODE') {
		btnCode.style.background = '#00A7D0';
		btnCode.style.color = '#fff';
		btnCode.style.border = 'none';

		btnQr.style.background = '#fff';
		btnQr.style.color = '#374151';
		btnQr.style.border = '1px solid #d1d5db';

		panelCode.classList.remove('d-none');
		panelQr.classList.add('d-none');
	} else {
		btnQr.style.background = '#00A7D0';
		btnQr.style.color = '#fff';
		btnQr.style.border = 'none';

		btnCode.style.background = '#fff';
		btnCode.style.color = '#374151';
		btnCode.style.border = '1px solid #d1d5db';

		panelQr.classList.remove('d-none');
		panelCode.classList.add('d-none');
	}
}

function actualizarBotonPago() {
	const totals = CartService.getTotals();
	const btn = document.getElementById('btn-pago-penn');
	if (!btn) return;

	const elYapeMonto = document.getElementById('yape-qr-monto');
	if (elYapeMonto) elYapeMonto.textContent = `S/ ${totals.total}`;

	const elPlinMonto = document.getElementById('plin-qr-monto');
	if (elPlinMonto) elPlinMonto.textContent = `S/ ${totals.total}`;

	const user = AuthService.getCurrentUser();

	if (metodoPagoSeleccionado === 'YAPE') {
		btn.innerHTML = `<i class="fa fa-qrcode" style="margin-right: 6px;"></i> PAGAR CON YAPE (S/ ${totals.total})`;
		btn.style.background = '#742284';
	} else if (metodoPagoSeleccionado === 'PLIN') {
		btn.innerHTML = `<i class="fa fa-mobile" style="margin-right: 6px;"></i> PAGAR CON PLIN (S/ ${totals.total})`;
		btn.style.background = '#00A7D0';
	} else {
		btn.innerHTML = `<i class="fa fa-credit-card" style="margin-right: 6px;"></i> OBTENER LINK DE PAGO MERCADO PAGO (S/ ${totals.total})`;
		btn.style.background = '#009ee3';
	}
}

/**
 * Renderiza el estado del usuario en el Checkout.
 * Obliga a que el usuario esté cargado antes de inscribirse.
 */
function renderUserStatusCard() {
	const card = document.getElementById('user-status-card');
	if (!card) return;

	const user = AuthService.getCurrentUser();

	if (user) {
		const nombreCompleto = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Carlos Estudiante';
		card.style.background = '#f0fdf4';
		card.style.border = '1px solid #86efac';
		card.innerHTML = `
			<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
				<div>
					<div style="font-weight: 800; color: #166534; font-size: 14px;">
						<i class="fa fa-check-circle text-success me-1"></i> Usuario Conectado: ${nombreCompleto}
					</div>
					<div style="font-size: 12px; color: #334155; margin-top: 3px;">
						<span class="me-2"><i class="fa fa-envelope text-muted me-1"></i>${user.correo}</span>
						<span class="me-2">&bull; <i class="fa fa-id-card text-muted me-1"></i>DNI: <strong>${user.dni || '30000003'}</strong></span>
						<span>&bull; <i class="fa fa-whatsapp text-success me-1"></i>WhatsApp: <strong>${user.whatsapp || '+51 999555666'}</strong></span>
					</div>
				</div>
				<div>
					<button type="button" class="btn btn-sm btn-outline-danger" onclick="AuthService.logout()" style="font-size: 11px; padding: 4px 10px; border-radius: 4px;">
						<i class="fa fa-sign-out"></i> Cambiar Usuario
					</button>
				</div>
			</div>
		`;

		// Prellenar campos automáticamente con el usuario cargado
		const chkNom = document.getElementById('chk-nombres');
		if (chkNom) chkNom.value = user.nombres || 'Carlos';
		const chkApe = document.getElementById('chk-apellidos');
		if (chkApe) chkApe.value = user.apellidos || 'Alarcón';
		const chkCorreo = document.getElementById('chk-correo');
		if (chkCorreo) chkCorreo.value = user.correo || 'estudiante@cursos.com';
		const chkDni = document.getElementById('chk-dni');
		if (chkDni) chkDni.value = user.dni || '30000003';
		const chkWa = document.getElementById('chk-whatsapp');
		if (chkWa) chkWa.value = user.whatsapp ? user.whatsapp.replace('+51', '') : '999555666';

		const yapeCel = document.getElementById('yape-celular');
		if (yapeCel) yapeCel.value = chkWa ? chkWa.value : '999555666';
		const plinCel = document.getElementById('plin-celular');
		if (plinCel) plinCel.value = chkWa ? chkWa.value : '999555666';

	} else {
		card.style.background = '#fffbeb';
		card.style.border = '1px solid #fde68a';
		card.innerHTML = `
			<div style="border-left: 4px solid #f59e0b; padding-left: 12px;">
				<div style="font-weight: 800; color: #b45309; font-size: 14px; margin-bottom: 4px;">
					<i class="fa fa-exclamation-triangle text-warning me-1"></i> Debes cargar tu usuario de estudiante para inscribirte
				</div>
				<p style="font-size: 12px; color: #78350f; margin-bottom: 12px; line-height: 1.4;">
					Para asegurar tu vacante, emitir tu comprobante oficial y enviarte los accesos de clase a tu WhatsApp y correo, es necesario que ingreses con tu cuenta de alumno:
				</p>
				<div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
					<a href="login.html?redirect=checkout.html" class="btn btn-sm" style="background: #1e293b; color: #fff; font-size: 12px; font-weight: 700; padding: 6px 14px; text-decoration: none; border-radius: 4px;">
						<i class="fa fa-sign-in"></i> Iniciar Sesión
					</a>
					<a href="registro.html?redirect=checkout.html" class="btn btn-sm" style="background: #e2e8f0; color: #1e293b; font-size: 12px; font-weight: 700; padding: 6px 14px; text-decoration: none; border-radius: 4px;">
						<i class="fa fa-user-plus"></i> Crear Cuenta
					</a>
					<button type="button" onclick="cargarUsuarioDemoCheckout()" class="btn btn-sm" style="background: #0284c7; color: #fff; font-size: 12px; font-weight: 700; padding: 6px 14px; border: none; cursor: pointer; border-radius: 4px;">
						<i class="fa fa-bolt"></i> ⚡ Cargar Usuario Alumno (1 Clic)
					</button>
				</div>
			</div>
		`;
	}
}

// Carga inmediata del usuario estudiante en el checkout
async function cargarUsuarioDemoCheckout() {
	try {
		Notifications.showToast('Cargando usuario estudiante desde auth-service...', 'info');
		const res = await AuthService.login('estudiante@cursos.com', '123456');
		Notifications.showToast(`¡Usuario ${res.user.nombres} cargado exitosamente!`, 'success');
		renderUserStatusCard();
		actualizarBotonPago();
	} catch (err) {
		console.error('Error al cargar usuario demo:', err);
		Notifications.showToast('Error: ' + err.message, 'error');
	}
}

function initPennCheckout() {
	const cart = CartService.getCart();
	if (cart.length === 0) {
		Notifications.showToast('No tienes cursos en el carrito.', 'warning');
		setTimeout(() => window.location.href = 'cursos.html', 800);
		return;
	}

	// Renderizar estado del usuario obligatorio
	renderUserStatusCard();

	// Sincronizar número de celular para Yape y Plin
	const chkWaEl = document.getElementById('chk-whatsapp');
	if (chkWaEl) {
		chkWaEl.addEventListener('input', (e) => {
			const val = e.target.value.trim();
			const yapeCel = document.getElementById('yape-celular');
			if (yapeCel) yapeCel.value = val;
			const plinCel = document.getElementById('plin-celular');
			if (plinCel) plinCel.value = val;
		});
	}

	// Totales del carrito
	const totals = CartService.getTotals();
	const elSub = document.getElementById('side-subtotal');
	if (elSub) elSub.textContent = `S/ ${totals.subtotal}`;
	const elIgv = document.getElementById('side-igv');
	if (elIgv) elIgv.textContent = `S/ ${totals.igv}`;
	const elTot = document.getElementById('side-total');
	if (elTot) elTot.textContent = `S/ ${totals.total}`;

	const list = document.getElementById('penn-order-items-list');
	if (list) {
		list.innerHTML = cart.map(c => `
			<li class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
				<div>
					<div class="fw-bold text-dark small">${c.titulo}</div>
					<small class="badge ${c.modalidad === 'VIRTUAL' ? 'bg-primary' : 'bg-success'}">${c.modalidad}</small>
				</div>
				<span class="fw-bold text-primary">S/ ${Number(c.precio).toFixed(2)}</span>
			</li>
		`).join('');
	}

	actualizarBotonPago();
	if (window.location.search && window.location.search.includes('tab=plin')) {
		selectMetodoPago('PLIN');
	}
	if (window.location.search && window.location.search.includes('tab=card')) {
		selectMetodoPago('TARJETA');
	}

	const cartCountEl = document.getElementById('cart-nav-counter');
	if (cartCountEl) cartCountEl.textContent = CartService.getCartCount();
	AuthService.updateNavbar();

	// Conectar el formulario de pago
	const form = document.getElementById('penn-checkout-form');
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

async function ejecutarPago(e) {
	if (e && e.preventDefault) e.preventDefault();

	// 1. Validar que el usuario esté cargado antes de inscribirse
	const user = AuthService.getCurrentUser();
	if (!user) {
		Notifications.showToast('Debes cargar o iniciar sesión con tu usuario para poder inscribirte.', 'warning');
		const card = document.getElementById('user-status-card');
		if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
		return;
	}

	const cart = CartService.getCart();
	if (cart.length === 0) return;

	const btn = document.getElementById('btn-pago-penn');
	if (btn) btn.disabled = true;

	const nombres = (document.getElementById('chk-nombres') ? document.getElementById('chk-nombres').value.trim() : '') || user.nombres || 'Carlos';
	const apellidos = (document.getElementById('chk-apellidos') ? document.getElementById('chk-apellidos').value.trim() : '') || user.apellidos || 'Alarcón';
	const dni = (document.getElementById('chk-dni') ? document.getElementById('chk-dni').value.trim() : '') || user.dni || '30000003';
	const whatsapp = (document.getElementById('chk-whatsapp') ? document.getElementById('chk-whatsapp').value.trim() : '') || user.whatsapp || '935300159';
	const correo = (document.getElementById('chk-correo') ? document.getElementById('chk-correo').value.trim() : '') || user.correo || 'estudiante@cursos.com';
	const docIdent = tipoComp === 'FACTURA' ? (document.getElementById('chk-ruc') ? document.getElementById('chk-ruc').value || '20601234567' : '20601234567') : dni;

	// ID real del estudiante en la base de datos PostgreSQL
	const estId = user.id || 'a0000000-0000-0000-0000-000000000003';

	// ============================================================
	// FLUJO MERCADO PAGO CHECKOUT PRO (SANDBOX LINK PREVIEW)
	// ============================================================
	if (metodoPagoSeleccionado === 'TARJETA') {
		if (btn) btn.innerHTML = `<i class="fa fa-spinner fa-spin me-2"></i> Generando preferencia Mercado Pago...`;

		try {
			// 1. Crear el pedido en PostgreSQL con el usuario cargado y bloquear vacante
			const pedido = await PedidosService.crearPedido(cart[0].id, estId);

			const payInfo = {
				metodoPago: 'Mercado Pago Checkout Pro',
				tipoComprobante: tipoComp,
				clienteNombres: `${nombres} ${apellidos}`.trim(),
				docIdentidad: docIdent,
				whatsapp: whatsapp,
				correo: correo
			};

			// Guardar estado pendiente de pago
			currentPendingMpOrder = { pedido, payInfo };
			sessionStorage.setItem('pending_mp_order', JSON.stringify(currentPendingMpOrder));

			// 2. Solicitar la preferencia oficial a Mercado Pago
			let prefData = null;
			const prefPayload = {
				titulo: cart[0].titulo || 'Curso Gestión de Cursos',
				cantidad: 1,
				precio: parseFloat(cart[0].precio) || 150.00
			};

			try {
				const resGw = await fetch('http://localhost:8080/api/pagos/crear-preferencia', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(prefPayload)
				});
				if (!resGw.ok) throw new Error('Gateway error: ' + resGw.status);
				prefData = await resGw.json();
			} catch (_) {
				// Fallback directo a pedidos-service
				const resDir = await fetch('http://localhost:8083/api/pagos/crear-preferencia', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(prefPayload)
				});
				prefData = await resDir.json();
			}

			if (!prefData || !prefData.initPoint) {
				throw new Error('No se pudo generar el initPoint de Mercado Pago.');
			}

			// 3. Renderizar el enlace en pantalla (Sin redirección automática)
			const modalMp = document.getElementById('mp-modal-container');
			const linkInput = document.getElementById('mp-link-input');
			const btnOpen = document.getElementById('btn-mp-open-direct');
			const badgePref = document.getElementById('mp-pref-badge');

			if (linkInput) linkInput.value = prefData.initPoint;
			if (btnOpen) {
				btnOpen.href = prefData.initPoint;
				btnOpen.setAttribute('target', '_blank');
				btnOpen.setAttribute('rel', 'noopener noreferrer');
			}
			if (badgePref && prefData.id) {
				badgePref.textContent = `PREFERENCIA: ${prefData.id.substring(0, 15)}...`;
			}

			if (modalMp) {
				modalMp.classList.remove('d-none');
				modalMp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}

			Notifications.showToast('¡Enlace de Mercado Pago generado con éxito!', 'success');
			if (btn) {
				btn.innerHTML = `<i class="fa fa-check"></i> Enlace Listo - Paga en la Nueva Pestaña`;
				btn.style.background = '#059669';
			}

		} catch (err) {
			console.error('Error al generar Checkout Pro:', err);
			Notifications.showToast('Error en Mercado Pago: ' + err.message, 'error');
			if (btn) {
				btn.disabled = false;
				actualizarBotonPago();
			}
		}
		return;
	}

	// ============================================================
	// FLUJO ESTÁNDAR YAPE / PLIN
	// ============================================================
	try {
		let nombreMetodo = 'Yape (Mercado Pago)';
		if (metodoPagoSeleccionado === 'PLIN') {
			nombreMetodo = 'Plin (Interoperable)';
			const plinOtp = document.getElementById('plin-otp');
			if (plinOtp && !plinOtp.value) plinOtp.value = '582910';
		} else {
			const yapeOtp = document.getElementById('yape-otp');
			if (yapeOtp && !yapeOtp.value) yapeOtp.value = '482910';
		}

		if (btn) btn.innerHTML = `<i class="fa fa-spinner fa-spin me-2"></i> Procesando matrícula con ${nombreMetodo}...`;
		await new Promise(r => setTimeout(r, 600));

		// 1. Crear pedido y bloquear cupo en backend PostgreSQL con el usuario cargado
		const pedido = await PedidosService.crearPedido(cart[0].id, estId);

		// 2. Procesar pago en pasarela
		const payInfo = {
			metodoPago: nombreMetodo,
			tipoComprobante: tipoComp,
			clienteNombres: `${nombres} ${apellidos}`.trim(),
			docIdentidad: docIdent,
			whatsapp: whatsapp,
			correo: correo
		};

		await PedidosService.procesarPagoMercadoPago(pedido, payInfo);

		if (btn) btn.innerHTML = `<i class="fa fa-check-circle me-2"></i> ¡Pago con ${metodoPagoSeleccionado} Aprobado!`;
		Notifications.showToast(`¡Matrícula exitosa con ${nombreMetodo}!`, 'success');

		setTimeout(() => {
			window.location.href = 'confirmacion.html';
		}, 700);

	} catch (err) {
		console.error('Error durante el pago:', err);
		Notifications.showToast('Error en pasarela: ' + err.message, 'error');
		if (btn) {
			btn.disabled = false;
			actualizarBotonPago();
		}
	}
}

// Copiar link al portapapeles
async function copiarLinkMp() {
	const input = document.getElementById('mp-link-input');
	const btn = document.getElementById('btn-mp-copiar');
	if (!input || !input.value) return;

	try {
		await navigator.clipboard.writeText(input.value);
		if (btn) {
			const orig = btn.innerHTML;
			btn.innerHTML = `<i class="fa fa-check"></i> Copiado`;
			btn.style.background = '#15803d';
			setTimeout(() => {
				btn.innerHTML = orig;
				btn.style.background = '#0f172a';
			}, 2500);
		}
	} catch (_) {
		input.select();
		document.execCommand('copy');
		Notifications.showToast('¡Enlace copiado al portapapeles!', 'info');
	}
}

// Confirmar matrícula después del pago en Mercado Pago
async function finalizarMatriculaMp() {
	const btnConfirm = document.getElementById('btn-mp-confirmar-pago');
	if (btnConfirm) {
		btnConfirm.disabled = true;
		btnConfirm.innerHTML = `<i class="fa fa-spinner fa-spin me-2"></i> Confirmando pago y emitiendo boleta...`;
	}

	let orderData = currentPendingMpOrder;
	if (!orderData) {
		const saved = sessionStorage.getItem('pending_mp_order');
		if (saved) orderData = JSON.parse(saved);
	}

	try {
		if (orderData && orderData.pedido) {
			await PedidosService.procesarPagoMercadoPago(orderData.pedido, orderData.payInfo);
		}

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
			btnConfirm.innerHTML = `<i class="fa fa-graduation-cap"></i> Reintentar Confirmación`;
		}
	}
}

// Inicialización
$(document).ready(initPennCheckout);
