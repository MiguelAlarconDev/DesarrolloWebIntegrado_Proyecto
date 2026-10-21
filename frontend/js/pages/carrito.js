/**
 * carrito.js - Lógica del Carrito de Matrículas y Pasarela Directa Mercado Pago
 * Control de reservas, temporizador de vacante temporal (15 min),
 * validación de alumno conectado, conexión directa al backend para generar
 * el enlace real de Mercado Pago (initPoint) y navegación hacia checkout/confirmación.
 */

let intervalTimer = null;
let currentCartMpOrder = null;

function initPennCart() {
	renderCart();
	actualizarNavbar();
}

function actualizarNavbar() {
	const counterEl = document.getElementById('cart-nav-counter');
	if (counterEl) counterEl.textContent = CartService.getCartCount();
	AuthService.updateNavbar();
}

async function cargarUsuarioRapidoCarrito() {
	try {
		Notifications.showToast('Autenticando alumno en auth-service...', 'info');
		const res = await AuthService.login('estudiante@cursos.com', '123456');
		Notifications.showToast(`¡Bienvenido ${res.user.nombres}! Ya puedes proceder al pago.`, 'success');
		actualizarNavbar();
		renderCart();
	} catch (err) {
		Notifications.showToast('Error al cargar usuario: ' + err.message, 'error');
	}
}

async function agregarCursoDemoCarrito() {
	try {
		const cursos = await CursosService.getCursos();
		if (cursos && cursos.length > 0) {
			CartService.addToCart(cursos[0]);
			Notifications.showToast(`Curso "${cursos[0].titulo}" reservado en el carrito.`, 'success');
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
					<div style="max-width: 520px; margin: 0 auto; background: #fff; padding: 40px 30px; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.05); border: 1px solid #eef2f6;">
						<div style="width: 80px; height: 80px; border-radius: 50%; background: #f1f5f9; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
							<i class="ti-shopping-cart" style="font-size: 36px; color: #64748b;"></i>
						</div>
						<h3 style="color: #1a2d62; font-weight: 800; font-size: 22px;">Tu carrito de matrícula está vacío</h3>
						<p class="text-muted mb-4" style="font-size: 14px;">Selecciona un curso del catálogo para reservar tu vacante y generar tu pago con Mercado Pago.</p>
						<div class="d-flex justify-content-center gap-2 flex-wrap">
							<a href="cursos.html" class="btn_one" style="border-radius: 8px; padding: 10px 22px; text-decoration: none;">
								<i class="fa fa-graduation-cap me-1"></i> Explorar Catálogo
							</a>
							<button type="button" onclick="agregarCursoDemoCarrito()" class="btn_two" style="border-radius: 8px; padding: 10px 18px; cursor: pointer; background: #f8fafc;">
								<i class="fa fa-bolt text-warning me-1"></i> Cargar Curso de Prueba
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
	const user = AuthService.getCurrentUser();

	const rowsHtml = cart.map(item => {
		const isVirtual = item.modalidad === 'VIRTUAL';
		const badge = isVirtual
			? `<span class="badge-mod-virtual"><i class="fa fa-video-camera"></i> Virtual en Vivo</span>`
			: `<span class="badge-mod-presencial"><i class="fa fa-building"></i> Presencial en Sede</span>`;

		return `
			<tr>
				<td class="image" data-title="Curso"><img src="${item.imagen}" alt="${item.titulo}" style="border-radius: 8px; object-fit: cover;"></td>
				<td class="product-des" data-title="Descripción">
					<p class="product-name"><a href="curso-detalle.html?id=${item.id}" style="font-weight: 800; color: #1a2d62;">${item.titulo}</a></p>
					<p class="product-des mb-1">${badge} &bull; <i class="fa fa-calendar text-primary ms-1"></i> ${item.horario}</p>
					<small class="text-muted"><i class="fa fa-user-circle"></i> ${item.docente || 'Ing. Roberto Docente'}</small>
				</td>
				<td class="price text-center" data-title="Precio"><span style="font-weight: 700; color: #1a2d62;">S/ ${Number(item.precio).toFixed(2)}</span></td>
				<td class="qty text-center" data-title="Vacante">
					<span class="badge bg-light text-dark p-2 border" style="font-weight: 700;"><i class="fa fa-check-circle text-success me-1"></i>1 Cupo Reservado</span>
				</td>
				<td class="total-amount text-center" data-title="Total"><span style="font-weight: 800; color: #2eca7f; font-size: 16px;">S/ ${Number(item.precio).toFixed(2)}</span></td>
				<td class="action text-center" data-title="Quitar">
					<a href="#" onclick="quitar('${item.id}'); return false;" title="Liberar vacante"><i class="ti-trash remove-icon text-danger"></i></a>
				</td>
			</tr>
		`;
	}).join('');

	// Tarjeta de estado del usuario en el carrito
	let userBoxHtml = '';
	if (user) {
		const nombreCompleto = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Alumno Conectado';
		userBoxHtml = `
			<div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
				<div class="d-flex align-items-center gap-3">
					<div style="width: 44px; height: 44px; border-radius: 50%; background: #22c55e; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
						<i class="fa fa-user-check"></i>
					</div>
					<div>
						<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #15803d; font-weight: 800;">Alumno verificado para matrícula</div>
						<div style="font-size: 15px; font-weight: 800; color: #0f172a;">${nombreCompleto}</div>
						<div style="font-size: 12px; color: #475569;">
							<i class="fa fa-envelope me-1"></i>${user.correo} &bull; 
							<i class="fa fa-id-card ms-1 me-1"></i>DNI: <strong>${user.dni || '30000003'}</strong> &bull;
							<i class="fa fa-whatsapp text-success ms-1 me-1"></i><strong>${user.whatsapp || '+51 999555666'}</strong>
						</div>
					</div>
				</div>
				<a href="login.html?redirect=carrito.html" style="font-size: 12px; color: #64748b; text-decoration: underline;">Cambiar cuenta</a>
			</div>
		`;
	} else {
		userBoxHtml = `
			<div style="background: #fffbeb; border: 1px solid #fde68a; border-left: 5px solid #f59e0b; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px;">
				<div style="font-weight: 800; color: #b45309; font-size: 14px; margin-bottom: 4px;">
					<i class="fa fa-user-lock me-1"></i> Identifícate para habilitar tu pago en Mercado Pago
				</div>
				<p style="font-size: 12px; color: #78350f; margin-bottom: 12px;">
					El sistema necesita asociar la orden de pago y la Boleta Electrónica SUNAT a tu cuenta de estudiante:
				</p>
				<div class="d-flex gap-2 flex-wrap">
					<button type="button" onclick="cargarUsuarioRapidoCarrito()" style="background: #0284c7; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 700; cursor: pointer;">
						<i class="fa fa-bolt me-1"></i> Cargar Usuario Alumno (1 Clic)
					</button>
					<a href="login.html?redirect=carrito.html" style="background: #1e293b; color: #fff; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 700; text-decoration: none;">
						<i class="fa fa-sign-in me-1"></i> Iniciar Sesión
					</a>
					<a href="registro.html?redirect=carrito.html" style="background: #fff; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 700; text-decoration: none;">
						Crear Cuenta
					</a>
				</div>
			</div>
		`;
	}

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

		<div class="row mt-3">
			<div class="col-12">
				<div class="total-amount" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.04);">
					<div class="row align-items-start">
						<!-- Columna Izquierda: Usuario + Pasarela Oficial Mercado Pago -->
						<div class="col-lg-7 col-md-6 col-12 mb-4 mb-md-0">
							${userBoxHtml}

							<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px;">
								<div class="d-flex align-items-center justify-content-between mb-2">
									<div class="d-flex align-items-center gap-2">
										<span style="background: #009ee3; color: #fff; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 20px;">
											<i class="fa fa-shield me-1"></i> MERCADO PAGO CHECKOUT PRO
										</span>
										<span class="badge bg-light text-secondary border" style="font-size: 11px;">SSL 256-BITS</span>
									</div>
									<div class="d-flex gap-1">
										<span class="badge" style="background:#1a1f71;color:#fff;font-size:10px;">VISA</span>
										<span class="badge" style="background:#eb001b;color:#fff;font-size:10px;">MASTERCARD</span>
										<span class="badge" style="background:#742284;color:#fff;font-size:10px;">YAPE</span>
									</div>
								</div>
								<p style="font-size: 13px; color: #334155; margin-bottom: 0; line-height: 1.5;">
									Al presionar <strong>"Pagar con Mercado Pago"</strong>, nuestro servidor backend (Spring Boot) registrará tu orden en PostgreSQL y conectará en tiempo real con la API oficial de <strong>Mercado Pago</strong> para procesar tu matrícula con total seguridad.
								</p>
							</div>

							<!-- WIDGET OFICIAL DE PASARELA MERCADO PAGO (APARECE AL GENERAR ORDEN EN EL BACKEND) -->
							<div id="cart-mp-gateway-box" class="d-none" style="margin-top: 18px; border-radius: 12px; overflow: hidden; border: 2px solid #009ee3; box-shadow: 0 12px 32px rgba(0, 158, 227, 0.15); background: #ffffff;">
								<!-- Cabecera oficial azul Mercado Pago -->
								<div style="background: linear-gradient(135deg, #009ee3 0%, #007eb5 100%); color: #ffffff; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between;">
									<div class="d-flex align-items-center gap-2">
										<i class="fa fa-lock" style="font-size: 18px;"></i>
										<div>
											<div style="font-weight: 800; font-size: 14px; letter-spacing: 0.2px;">Pasarela Oficial Mercado Pago</div>
											<div style="font-size: 11px; opacity: 0.9;" id="cart-mp-order-code">Orden registrada en servidor</div>
										</div>
									</div>
									<span style="background: rgba(255,255,255,0.2); color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">
										<i class="fa fa-check-circle me-1"></i> Preferencia Lista
									</span>
								</div>

								<!-- Cuerpo de la Pasarela -->
								<div style="padding: 20px;">
									<div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
										<div>
											<div style="font-size: 12px; color: #64748b;">Concepto de matrícula</div>
											<div style="font-weight: 800; color: #0f172a; font-size: 15px;">${cart[0].titulo}</div>
										</div>
										<div class="text-end">
											<div style="font-size: 12px; color: #64748b;">Importe Oficial PEN</div>
											<div style="font-weight: 900; color: #009ee3; font-size: 20px;">S/ ${totals.total}</div>
										</div>
									</div>

									<!-- Botón Principal: Ir a Pagar en Mercado Pago (Aspecto 100% Real) -->
									<a id="cart-mp-btn-open" href="#" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; background: #009ee3; color: #ffffff; font-weight: 800; font-size: 15px; padding: 14px 20px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 14px rgba(0, 158, 227, 0.35); transition: all 0.2s ease; margin-bottom: 12px;">
										<i class="fa fa-credit-card"></i> Ir a Pagar en Mercado Pago Seguro
										<i class="fa fa-external-link ms-1" style="font-size: 12px;"></i>
									</a>

									<!-- Botón para Confirmar y Emitir Boleta Electrónica -->
									<button type="button" id="cart-mp-btn-confirm" onclick="confirmarPagoDesdeCarrito()" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: #2eca7f; color: #ffffff; font-weight: 800; font-size: 14px; padding: 12px 20px; border-radius: 8px; border: none; cursor: pointer; margin-bottom: 14px;">
										<i class="fa fa-file-text-o"></i> Ya completé mi pago &bull; Emitir Boleta SUNAT y Accesos
									</button>

									<!-- Barra discreta para copiar link (Modo Incógnito / Pruebas) -->
									<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;">
										<div class="d-flex align-items-center justify-content-between mb-1">
											<span style="font-size: 11px; font-weight: 700; color: #475569;">
												<i class="fa fa-link me-1 text-primary"></i> Enlace directo del Backend (<code style="font-size: 10px;">initPoint</code>) para Ventana Incógnito:
											</span>
											<button type="button" id="cart-mp-btn-copy" onclick="copiarLinkDesdeCarrito()" style="background: #1e293b; color: #fff; border: none; border-radius: 4px; padding: 3px 10px; font-size: 11px; font-weight: 700; cursor: pointer;">
												<i class="fa fa-clone me-1"></i> Copiar Link
											</button>
										</div>
										<input type="text" id="cart-mp-input-url" readonly value="" style="width: 100%; height: 30px; font-size: 11px; font-family: monospace; color: #334155; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 8px;">
									</div>
								</div>
							</div>
						</div>

						<!-- Columna Derecha: Totales y Botones de Acción -->
						<div class="col-lg-5 col-md-6 col-12">
							<div class="right" style="background: #f8fafc; padding: 24px; border-radius: 10px; border: 1px solid #e2e8f0;">
								<h5 style="font-weight: 800; color: #1a2d62; margin-bottom: 16px; font-size: 16px; border-bottom: 2px solid #2eca7f; padding-bottom: 8px; display: inline-block;">
									RESUMEN DE INSCRIPCIÓN
								</h5>
								<ul style="margin-bottom: 20px;">
									<li style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #475569;">
										<span>Subtotal (sin IGV)</span>
										<span style="font-weight: 700; color: #0f172a;">S/ ${totals.subtotal}</span>
									</li>
									<li style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #475569;">
										<span>I.G.V. (18%)</span>
										<span style="font-weight: 700; color: #0f172a;">S/ ${totals.igv}</span>
									</li>
									<li class="last" style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 18px; font-weight: 900; color: #1a2d62;">
										<span>Total a Pagar</span>
										<span style="color: #2eca7f;">S/ ${totals.total}</span>
									</li>
								</ul>

								<div class="d-flex flex-column gap-2">
									<!-- Botón Directo Mercado Pago Backend -->
									<button type="button" id="btn-direct-mp-cart" onclick="generarPagoMercadoPagoEnCarrito()" style="width: 100%; height: 48px; background: #009ee3; color: #ffffff; border: none; border-radius: 8px; font-weight: 800; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(0, 158, 227, 0.3); transition: all 0.2s ease;">
										<i class="fa fa-credit-card"></i> Pagar con Mercado Pago (S/ ${totals.total})
									</button>

									<!-- Botón ir a Checkout Completo (Factura RUC / Yape / Plin) -->
									<a href="checkout.html?tab=card" style="width: 100%; height: 44px; background: #1a2d62; color: #ffffff; border-radius: 8px; font-weight: 700; font-size: 13px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;">
										<i class="fa fa-file-text-o"></i> Solicitar Factura RUC / Yape / Plin
									</a>

									<a href="cursos.html" style="width: 100%; height: 40px; background: #ffffff; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 700; font-size: 13px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 4px;">
										<i class="fa fa-arrow-left"></i> Seguir Explorando Cursos
									</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
}

/**
 * Conecta directamente con el Backend desde carrito.html para crear el pedido
 * y obtener el enlace oficial initPoint de Mercado Pago.
 */
async function generarPagoMercadoPagoEnCarrito() {
	let user = AuthService.getCurrentUser();
	if (!user) {
		Notifications.showToast('Cargando automáticamente tu cuenta de alumno para generar el pago...', 'info');
		try {
			const loginRes = await AuthService.login('estudiante@cursos.com', '123456');
			user = loginRes.user;
			actualizarNavbar();
			renderCart();
		} catch (e) {
			Notifications.showToast('Por favor inicia sesión para continuar con la matrícula.', 'warning');
			return;
		}
	}

	const cart = CartService.getCart();
	if (cart.length === 0) return;

	const btn = document.getElementById('btn-direct-mp-cart');
	if (btn) {
		btn.disabled = true;
		btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Conectando con Mercado Pago Backend...`;
	}

	try {
		const estId = user.id || 'a0000000-0000-0000-0000-000000000003';
		// 1. Registrar pedido y reservar vacante en pedidos-service (PostgreSQL)
		const pedido = await PedidosService.crearPedido(cart[0].id, estId);

		const payInfo = {
			metodoPago: 'Mercado Pago Checkout Pro',
			tipoComprobante: 'BOLETA',
			clienteNombres: `${user.nombres || 'Carlos'} ${user.apellidos || 'Estudiante'}`.trim(),
			docIdentidad: user.dni || '30000003',
			whatsapp: user.whatsapp ? user.whatsapp.replace('+51', '') : '999555666',
			correo: user.correo || 'estudiante@cursos.com'
		};

		currentCartMpOrder = { pedido, payInfo };
		sessionStorage.setItem('pending_mp_order', JSON.stringify(currentCartMpOrder));

		// 2. Obtener initPoint del backend (ya sea del pedido creado o del endpoint /api/pagos/crear-preferencia)
		let initPointUrl = pedido.initPoint || null;
		let prefId = pedido.mpPreferenceId || null;

		if (!initPointUrl) {
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
				if (resGw.ok) {
					const data = await resGw.json();
					initPointUrl = data.initPoint;
					prefId = data.id;
				}
			} catch (_) {
				const resDir = await fetch('http://localhost:8083/api/pagos/crear-preferencia', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(prefPayload)
				});
				if (resDir.ok) {
					const data = await resDir.json();
					initPointUrl = data.initPoint;
					prefId = data.id;
				}
			}
		}

		if (!initPointUrl) {
			throw new Error('No se pudo obtener el enlace de Mercado Pago desde el backend.');
		}

		// 3. Mostrar el Widget Oficial de Pasarela en carrito.html
		const box = document.getElementById('cart-mp-gateway-box');
		const btnOpen = document.getElementById('cart-mp-btn-open');
		const inputUrl = document.getElementById('cart-mp-input-url');
		const orderCodeEl = document.getElementById('cart-mp-order-code');

		if (btnOpen) btnOpen.href = initPointUrl;
		if (inputUrl) inputUrl.value = initPointUrl;
		if (orderCodeEl) {
			orderCodeEl.textContent = `Orden #${pedido.codigoOrden || 'ORD-MP'} • ID Pref: ${(prefId || '').substring(0, 18)}...`;
		}

		if (box) {
			box.classList.remove('d-none');
			box.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}

		if (btn) {
			btn.innerHTML = `<i class="fa fa-check-circle"></i> Pasarela Lista (Ver a la izquierda)`;
			btn.style.background = '#059669';
		}

		Notifications.showToast('¡Conexión exitosa con Mercado Pago! Tu enlace de pago está listo.', 'success');

	} catch (err) {
		console.error('Error al conectar con Mercado Pago:', err);
		Notifications.showToast('Error: ' + err.message, 'error');
		if (btn) {
			btn.disabled = false;
			const totals = CartService.getTotals();
			btn.innerHTML = `<i class="fa fa-credit-card"></i> Pagar con Mercado Pago (S/ ${totals.total})`;
		}
	}
}

async function copiarLinkDesdeCarrito() {
	const input = document.getElementById('cart-mp-input-url');
	const btn = document.getElementById('cart-mp-btn-copy');
	if (!input || !input.value) return;

	try {
		await navigator.clipboard.writeText(input.value);
		if (btn) {
			btn.innerHTML = `<i class="fa fa-check"></i> ¡Copiado!`;
			btn.style.background = '#15803d';
			setTimeout(() => {
				btn.innerHTML = `<i class="fa fa-clone me-1"></i> Copiar Link`;
				btn.style.background = '#1e293b';
			}, 2500);
		}
		Notifications.showToast('Enlace copiado. Pégalo en una ventana de incógnito.', 'info');
	} catch (_) {
		input.select();
		document.execCommand('copy');
		Notifications.showToast('Enlace copiado al portapapeles.', 'info');
	}
}

async function confirmarPagoDesdeCarrito() {
	const btn = document.getElementById('cart-mp-btn-confirm');
	if (btn) {
		btn.disabled = true;
		btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Verificando pago y emitiendo Boleta SUNAT...`;
	}

	let orderData = currentCartMpOrder;
	if (!orderData) {
		const saved = sessionStorage.getItem('pending_mp_order');
		if (saved) orderData = JSON.parse(saved);
	}

	try {
		if (orderData && orderData.pedido) {
			await PedidosService.procesarPagoMercadoPago(orderData.pedido, orderData.payInfo);
		}
		Notifications.showToast('¡Matrícula confirmada y Boleta Electrónica emitida!', 'success');
		CartService.clearCart();
		setTimeout(() => {
			window.location.href = 'confirmacion.html';
		}, 600);
	} catch (err) {
		Notifications.showToast('Error al confirmar pago: ' + err.message, 'error');
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = `<i class="fa fa-file-text-o"></i> Reintentar Emisión de Boleta`;
		}
	}
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
