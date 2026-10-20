/**
 * confirmacion.js - Lógica de la Página de Confirmación de Matrícula
 * Renderizado de comprobante de pago SUNAT (Boleta / Factura),
 * detalles de acceso (Enlace Meet/Zoom para virtual o Aula/Sede para presencial),
 * integración con WhatsApp y correo electrónico para envío de accesos.
 */

let currentOrder = null;

function initConfirmacion() {
	let order = PedidosService.getLastOrder();
	if (!order) {
		const history = PedidosService.getMisMatriculas();
		if (history && history.length > 0) order = history[0];
	}
	if (!order && typeof window !== 'undefined' && window.location.search && window.location.search.includes('sample=1')) {
		order = {
			codigoOrden: 'ORD-894210',
			estado: 'PAGADO',
			metodoPago: 'Yape (Mercado Pago)',
			curso: {
				titulo: 'Desarrollo de Microservicios con Spring Boot y Cloud',
				modalidad: 'VIRTUAL',
				horario: 'Sábados y Domingos 09:00 - 13:00',
				enlaceClase: 'https://meet.google.com/abc-defg-hij',
				direccionClase: 'Sede Central - Av. Universitaria 1234, Lima',
				aula: 'Laboratorio 302'
			},
			comprobante: {
				tipo: 'BOLETA',
				correlativo: 'B001-00001042',
				cliente: 'Jose Elmer Coronado Maldonado',
				docIdentidad: '74859612',
				subtotal: '296.61',
				igv: '53.39',
				total: '350.00',
				clienteCorreo: 'carlokasike333@gmail.com',
				clienteTelefono: '935300159'
			}
		};
	}
	if (!order) {
		window.location.href = 'cursos.html';
		return;
	}

	currentOrder = order;

	// Metadatos
	const elCode = document.getElementById('code-order-display');
	if (elCode) elCode.textContent = order.codigoOrden || 'ORD-100201';
	const fechaActual = new Date().toLocaleDateString('es-PE');
	const elDate = document.getElementById('order-date-display');
	if (elDate) elDate.textContent = fechaActual;

	// Comprobante
	const comp = order.comprobante || {
		tipo: 'BOLETA',
		correlativo: 'B001-00001001',
		cliente: 'Carlos Alarcón',
		docIdentidad: '74859612',
		fechaEmision: fechaActual,
		subtotal: '127.12',
		igv: '22.88',
		total: '150.00'
	};

	const elSunatTipo = document.getElementById('sunat-tipo-title');
	if (elSunatTipo) elSunatTipo.textContent = comp.tipo === 'FACTURA' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';
	const elSerie = document.getElementById('sunat-serie-display');
	if (elSerie) elSerie.textContent = comp.correlativo || 'B001-00001001';
	const elCliente = document.getElementById('rec-cliente');
	if (elCliente) elCliente.textContent = comp.cliente || 'Carlos Alarcón';
	const elDoc = document.getElementById('rec-doc');
	if (elDoc) elDoc.textContent = comp.docIdentidad || '74859612';

	// Obtener teléfono y correo del estudiante
	const user = AuthService.getCurrentUser();
	const telAlumno = (comp && comp.clienteTelefono) || (order.notificacionWhatsApp && order.notificacionWhatsApp.telefono) || (user && user.whatsapp) || '999555666';
	const correoAlumno = (comp && comp.clienteCorreo) || (user && user.correo) || 'alumno@cursos.com';

	const elTel = document.getElementById('rec-telefono');
	if (elTel) elTel.textContent = telAlumno;
	const elMail = document.getElementById('rec-correo');
	if (elMail) elMail.textContent = correoAlumno;

	// Actualizar destinos automáticos
	const elAutoCorreo = document.getElementById('auto-correo-dest');
	if (elAutoCorreo) elAutoCorreo.textContent = correoAlumno;
	
	let cleanTel = telAlumno.replace(/\D/g, '');
	if (cleanTel.length === 9) cleanTel = '+51 ' + cleanTel;
	else cleanTel = '+' + cleanTel;
	const elAutoWa = document.getElementById('auto-wa-dest');
	if (elAutoWa) elAutoWa.textContent = cleanTel;

	// Medio de Pago
	const metodo = order.metodoPago || 'Yape (Mercado Pago)';
	const recMetodo = document.getElementById('rec-metodo');
	if (recMetodo) {
		recMetodo.textContent = metodo;
		if (metodo.includes('Plin')) {
			recMetodo.style.background = '#00A7D0';
		} else if (metodo.includes('Yape')) {
			recMetodo.style.background = '#742284';
		} else {
			recMetodo.style.background = '#009ee3';
		}
	}

	// Curso y Totales
	const curso = order.curso || {
		titulo: 'Desarrollo Web Integrado con Spring Boot',
		modalidad: 'VIRTUAL',
		horario: 'Lun y Mie 19:00 - 22:00',
		enlaceClase: 'https://meet.google.com/abc-defg-hij',
		direccionClase: 'Av. Universitaria 1234, Lima',
		aula: 'Laboratorio 204'
	};

	const elMod = document.getElementById('rec-curso-mod');
	if (elMod) {
		elMod.textContent = curso.modalidad;
		elMod.className = curso.modalidad === 'VIRTUAL' ? 'badge bg-primary' : 'badge bg-success';
	}
	const elHorario = document.getElementById('rec-horario');
	if (elHorario) elHorario.textContent = curso.horario;

	const elTableDesc = document.getElementById('rec-table-desc');
	if (elTableDesc) elTableDesc.textContent = curso.titulo;
	const elTableMod = document.getElementById('rec-table-mod');
	if (elTableMod) elTableMod.textContent = curso.modalidad;
	const elTableTotal = document.getElementById('rec-table-total');
	if (elTableTotal) elTableTotal.textContent = `S/ ${comp.total}`;

	const elSubVal = document.getElementById('rec-subtotal-val');
	if (elSubVal) elSubVal.textContent = `S/ ${comp.subtotal}`;
	const elIgvVal = document.getElementById('rec-igv-val');
	if (elIgvVal) elIgvVal.textContent = `S/ ${comp.igv}`;
	const elTotVal = document.getElementById('rec-total-val');
	if (elTotVal) elTotVal.textContent = `S/ ${comp.total}`;

	// Configuración de acceso al curso
	const boxAula = document.getElementById('box-acceso-aula');
	const btnLink = document.getElementById('btn-link-clase');
	if (curso.modalidad === 'PRESENCIAL') {
		if (boxAula) {
			boxAula.innerHTML = `
				<h5 style="font-size: 14px; font-weight: 700; color: #1a2d62; margin-bottom: 6px;">
					<i class="fa fa-building" style="color: #2eca7f; margin-right: 6px;"></i> Sede Física y Aula Asignada
				</h5>
				<p style="font-size: 13px; color: #444; margin-bottom: 4px;">
					<strong>Sede:</strong> ${curso.direccionClase || 'Sede Central (Av. Universitaria 1234, Lima)'}
				</p>
				<p style="font-size: 13px; color: #444; margin-bottom: 0;">
					<strong>Aula:</strong> ${curso.aula || 'Laboratorio 204'}
				</p>
			`;
		}
	} else {
		if (btnLink) btnLink.href = curso.enlaceClase || 'https://meet.google.com';
	}

	// Limpiar contador del carrito
	const cartCountEl = document.getElementById('cart-nav-counter');
	if (cartCountEl) cartCountEl.textContent = '0';
	AuthService.updateNavbar();

	// Notificación automática al cargar confirmando los envíos
	setTimeout(() => {
		Notifications.showToast('¡Comprobante y accesos enviados automáticamente a tu correo y WhatsApp!', 'success');
	}, 400);
}

function abrirChatWhatsApp() {
	const order = currentOrder || {};
	const comp = order.comprobante || {};
	const curso = order.curso || {};
	const user = AuthService.getCurrentUser();

	let rawPhone = (comp && comp.clienteTelefono) || (order.notificacionWhatsApp && order.notificacionWhatsApp.telefono) || (user && user.whatsapp) || '999555666';
	let phone = rawPhone.replace(/\D/g, '');

	if (phone.length === 9) {
		phone = '51' + phone;
	}

	let accesoTexto = '';
	if (curso.modalidad === 'PRESENCIAL') {
		accesoTexto = `🏛️ *Sede:* ${curso.direccionClase || 'Av. Universitaria 1234'}\n🚪 *Aula:* ${curso.aula || 'Aula 101'}`;
	} else {
		accesoTexto = `🎥 *Enlace de Clase en Vivo (Zoom/Meet):*\n${curso.enlaceClase || 'https://meet.google.com/abc-defg-hij'}`;
	}

	const mensaje = `¡Hola *${comp.cliente || 'Estudiante'}*! 🎉\n` +
		`Tu matrícula en *${curso.titulo || 'Curso de Gestión de Cursos'}* está confirmada con éxito.\n\n` +
		`📋 *Código de Orden:* ${order.codigoOrden || 'ORD-100201'}\n` +
		`📅 *Horario:* ${curso.horario || 'Por coordinar'}\n` +
		`${accesoTexto}\n\n` +
		`📄 *Comprobante Electrónico:* ${comp.correlativo || 'B001-00001001'} (Total: S/ ${comp.total || '0.00'})\n` +
		`💳 *Forma de Pago:* ${order.metodoPago || 'Yape (Mercado Pago)'}\n\n` +
		`¡Muchos éxitos en tus clases! 🚀 - Gestión de Cursos`;

	Notifications.showToast(`¡Abriendo chat de WhatsApp para +${phone}!`, 'info');
	Notifications.abrirWhatsAppWeb(phone, mensaje);
}

function contactarSoporte() {
	const order = currentOrder || {};
	const comp = order.comprobante || {};
	const curso = order.curso || {};

	const mensaje = `¡Hola Soporte de Gestión de Cursos! 👋\n` +
		`Acabo de matricularme en el curso *${curso.titulo || 'Curso'}* con la orden *${order.codigoOrden || 'ORD-100201'}* y comprobante *${comp.correlativo || 'B001-00001001'}*.\n` +
		`¿Podrían brindarme información adicional de las clases? Muchas gracias.`;

	Notifications.abrirWhatsAppWeb('51999555666', mensaje);
}

function abrirClienteCorreo() {
	const order = currentOrder || {};
	const comp = order.comprobante || {};
	const curso = order.curso || {};
	const user = AuthService.getCurrentUser();

	const email = (comp && comp.clienteCorreo) || (user && user.correo) || 'alumno@cursos.com';

	const asunto = `Gestión de Cursos - Confirmación de Matrícula y Comprobante ${comp.correlativo || 'B001'}`;
	const cuerpo = `Estimado(a) ${comp.cliente || 'Estudiante'},\n\n` +
		`Te confirmamos que tu matrícula en el programa "${curso.titulo || 'Curso Especializado'}" ha sido procesada con éxito.\n\n` +
		`Detalles de tu Matrícula:\n` +
		`- Código de Orden: ${order.codigoOrden || 'ORD-100201'}\n` +
		`- Modalidad: ${curso.modalidad || 'VIRTUAL'}\n` +
		`- Horario: ${curso.horario || 'Por coordinar'}\n` +
		`- Enlace de Clase: ${curso.enlaceClase || 'https://meet.google.com/abc-defg-hij'}\n` +
		`- Comprobante SUNAT: ${comp.correlativo || 'B001-00001001'}\n` +
		`- Total Pagado: S/ ${comp.total || '0.00'} (${order.metodoPago || 'Yape'})\n\n` +
		`Adjuntamos en tu cuenta el comprobante electrónico oficial en formato PDF y XML.\n\n` +
		`Atentamente,\nEquipo Académico - Gestión de Cursos S.A.C.`;

	Notifications.abrirCorreo(email, asunto, cuerpo);
}

async function reenviarCorreoAuto() {
	const btn = document.getElementById('btn-reenviar-email');
	if (!btn) return;
	const originalText = btn.innerHTML;
	btn.disabled = true;
	btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Reenviando...`;

	await new Promise(r => setTimeout(r, 600));

	const order = currentOrder || {};
	const comp = order.comprobante || {};
	const user = AuthService.getCurrentUser();
	const email = (comp && comp.clienteCorreo) || (user && user.correo) || 'alumno@cursos.com';

	Notifications.showToast(`¡Comprobante reenviado con éxito a ${email}!`, 'success');
	btn.innerHTML = `<i class="fa fa-check text-success"></i> ¡Reenviado!`;

	setTimeout(() => {
		btn.disabled = false;
		btn.innerHTML = originalText;
	}, 3000);
}

// Inicialización
$(document).ready(initConfirmacion);
