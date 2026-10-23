/**
 * confirmacion.js - Lógica de la Página de Confirmación de Matrícula
 * Renderizado de comprobante de pago SUNAT (Boleta / Factura),
 * preparación y despacho directo a WhatsApp y Gmail Web,
 * y acceso directo a "Mis Clases".
 */

let currentOrder = null;
let activeTelAlumno = '';
let activeCorreoAlumno = '';

function formatPeruWhatsApp(phone) {
	let raw = String(phone || '').replace(/\D/g, '');
	if (raw.startsWith('51') && raw.length === 11) {
		return raw;
	}
	if (raw.length === 9) {
		return '51' + raw;
	}
	if (raw.length > 9) {
		return raw;
	}
	return '51' + raw;
}

function formatDisplayPhone(rawDigits) {
	let digits = String(rawDigits || '').replace(/\D/g, '');
	if (digits.startsWith('51') && digits.length === 11) {
		digits = digits.substring(2);
	}
	if (digits.length === 9) {
		return `+51 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
	}
	return `+51 ${digits}`;
}

async function initConfirmacion() {
	let order = PedidosService.getLastOrder();
	if (!order) {
		const history = PedidosService.getMisMatriculasSync();
		if (history && history.length > 0) {
			order = history[0];
		} else {
			try {
				const remoteHistory = await PedidosService.getMisMatriculas();
				if (remoteHistory && remoteHistory.length > 0) {
					order = remoteHistory[0];
				}
			} catch (_) {}
		}
	}

	// Obtener usuario autenticado si existe
	const user = (typeof AuthService !== 'undefined' && AuthService.getCurrentUser()) || null;

	// Si no hay orden en memoria, crear una por defecto
	if (!order) {
		const defaultName = user ? `${user.nombres || ''} ${user.apellidos || ''}`.trim() : 'Jose Elmer Coronado';
		const defaultDni = (user && user.dni) || '75187638';
		const defaultWa = (user && user.whatsapp) || '935300159';
		const defaultCorreo = (user && user.correo) || 'carlokasike333@gmail.com';

		order = {
			codigoOrden: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
			estado: 'PAGADO',
			metodoPago: 'Mercado Pago Checkout',
			curso: {
				id: 'b0000000-0000-0000-0000-000000000001',
				titulo: 'Desarrollo Web Integrado con Spring Boot',
				modalidad: 'VIRTUAL',
				horario: 'Sábados y Domingos 09:00 - 13:00',
				precio: 150.00,
				enlaceClase: 'https://meet.google.com/abc-defg-hij',
				direccionClase: 'Sede Central - Av. Universitaria 1234, Lima',
				aula: 'Laboratorio 302'
			},
			comprobante: {
				tipo: 'BOLETA',
				correlativo: 'B001-' + String(Math.floor(1000 + Math.random() * 9000)).padStart(8, '0'),
				cliente: defaultName,
				docIdentidad: defaultDni,
				subtotal: '127.12',
				igv: '22.88',
				total: '150.00',
				clienteCorreo: defaultCorreo,
				clienteTelefono: defaultWa
			}
		};
	}

	currentOrder = order;

	// Metadatos
	const elCode = document.getElementById('code-order-display');
	if (elCode) elCode.textContent = order.codigoOrden || 'ORD-894210';
	const fechaActual = new Date().toLocaleDateString('es-PE');
	const elDate = document.getElementById('order-date-display');
	if (elDate) elDate.textContent = fechaActual;

	// Comprobante
	const comp = order.comprobante || {
		tipo: 'BOLETA',
		correlativo: 'B001-00001042',
		cliente: (user && user.nombres) ? `${user.nombres} ${user.apellidos || ''}`.trim() : 'Jose Elmer Coronado',
		docIdentidad: (user && user.dni) || '75187638',
		fechaEmision: fechaActual,
		subtotal: '127.12',
		igv: '22.88',
		total: '150.00'
	};

	const elSunatTipo = document.getElementById('sunat-tipo-title');
	if (elSunatTipo) elSunatTipo.textContent = comp.tipo === 'FACTURA' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';
	const elSerie = document.getElementById('sunat-serie-display');
	if (elSerie) elSerie.textContent = comp.correlativo || 'B001-00001042';

	// Si el usuario autenticado tiene datos más específicos que el fallback
	let nombreTitular = comp.cliente || '';
	if (user && (!nombreTitular || nombreTitular === 'Carlos Alarcón' || nombreTitular === 'Alumno')) {
		nombreTitular = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || nombreTitular;
	}
	const elCliente = document.getElementById('rec-cliente');
	if (elCliente) elCliente.textContent = nombreTitular || 'Alumno Titular';

	let dniTitular = comp.docIdentidad || (user && user.dni) || '75187638';
	const elDoc = document.getElementById('rec-doc');
	if (elDoc) elDoc.textContent = dniTitular;

	// Resolver teléfono y correo priorizando datos del usuario activo
	activeTelAlumno = (user && user.whatsapp) || (comp && comp.clienteTelefono) || (order.notificacionWhatsApp && order.notificacionWhatsApp.telefono) || '935300159';
	activeCorreoAlumno = (user && user.correo) || (comp && comp.clienteCorreo) || 'carlokasike333@gmail.com';

	// Si el correo quedó en el dummy genérico pero el usuario autenticado es otro, corregir
	if (user && user.correo && activeCorreoAlumno === 'alumno@cursos.com') {
		activeCorreoAlumno = user.correo;
	}
	if (user && user.whatsapp && activeTelAlumno === '999555666') {
		activeTelAlumno = user.whatsapp;
	}

	const elTel = document.getElementById('rec-telefono');
	if (elTel) elTel.textContent = formatDisplayPhone(activeTelAlumno);
	const elMail = document.getElementById('rec-correo');
	if (elMail) elMail.textContent = activeCorreoAlumno;

	// Medio de Pago
	const metodo = order.metodoPago || 'Mercado Pago';
	const recMetodo = document.getElementById('rec-metodo');
	if (recMetodo) {
		recMetodo.textContent = metodo;
		recMetodo.style.background = '#009ee3';
	}

	// Curso y Totales
	const curso = order.curso || {
		titulo: 'Desarrollo Web Integrado con Spring Boot',
		modalidad: 'VIRTUAL',
		horario: 'Sábados y Domingos 09:00 - 13:00',
		enlaceClase: 'https://meet.google.com/abc-defg-hij',
		direccionClase: 'Sede Central - Av. Universitaria 1234, Lima',
		aula: 'Laboratorio 302'
	};

	const elTitle = document.getElementById('rec-curso-title');
	if (elTitle) elTitle.textContent = curso.titulo;

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
				<h5>
					<i class="fa fa-building" style="color: #2eca7f;"></i> Sede Física y Aula Asignada
				</h5>
				<p style="margin-bottom: 6px;">
					<strong>Sede:</strong> ${curso.direccionClase || 'Sede Central - Av. Universitaria 1234, Lima'}
				</p>
				<p style="margin-bottom: 0;">
					<strong>Aula:</strong> ${curso.aula || 'Laboratorio 302'} &bull; Acceso presencial habilitado con tu DNI.
				</p>
			`;
		}
	} else {
		if (btnLink) btnLink.href = curso.enlaceClase || 'https://meet.google.com';
	}

	// Prellenar inputs de edición rápida si están presentes
	const customWaInput = document.getElementById('custom-wa-input');
	if (customWaInput) customWaInput.value = String(activeTelAlumno).replace(/\D/g, '').slice(-9);
	const customCorreoInput = document.getElementById('custom-correo-input');
	if (customCorreoInput) customCorreoInput.value = activeCorreoAlumno;

	// Configurar enlaces directos a WhatsApp y Gmail
	configurarCanalesEntrega(activeTelAlumno, activeCorreoAlumno);

	// Limpiar y sincronizar carrito
	CartService.updateBadge();
	AuthService.updateNavbar();

	// Notificación informativa amigable
	setTimeout(() => {
		Notifications.showToast('¡Matrícula confirmada! Haz clic en "Enviar a mi WhatsApp" o "Gmail" para recibir tus accesos.', 'success');
	}, 400);
}

/**
 * Genera y vincula los enlaces interactivos hacia WhatsApp y Gmail Web
 */
function configurarCanalesEntrega(tel, correo) {
	if (!currentOrder) return;
	const comp = currentOrder.comprobante || {};
	const curso = currentOrder.curso || {};
	const nombre = comp.cliente || 'Alumno';

	// Actualizar textos en tarjetas
	const elAutoCorreo = document.getElementById('auto-correo-dest');
	if (elAutoCorreo) elAutoCorreo.textContent = correo;

	const elAutoWa = document.getElementById('auto-wa-dest');
	if (elAutoWa) elAutoWa.textContent = formatDisplayPhone(tel);

	const numWa = formatPeruWhatsApp(tel);

	// 1. Mensaje de WhatsApp estructurado y profesional
	const infoModalidad = curso.modalidad === 'VIRTUAL'
		? `🎥 *Enlace de Clase en Vivo (Zoom / Meet):*\n${curso.enlaceClase || 'https://meet.google.com/abc-defg-hij'}\n\n`
		: `🏛️ *Sede Física Asignada:*\n${curso.direccionClase || 'Sede Central'} (Aula: ${curso.aula || 'Lab 302'})\n\n`;

	const waTexto = `🎉 *¡Hola ${nombre}! Tu Matrícula en Gestión de Cursos ha sido confirmada con éxito!*\n\n` +
		`📚 *Curso:* ${curso.titulo}\n` +
		`📅 *Horario:* ${curso.horario}\n` +
		infoModalidad +
		`📄 *Comprobante Oficial SUNAT:* ${comp.correlativo || 'B001-00001042'}\n` +
		`💳 *Total Pagado:* S/ ${comp.total || '150.00'} (${currentOrder.metodoPago || 'Mercado Pago'})\n` +
		`🔖 *Código de Matrícula:* ${currentOrder.codigoOrden || 'ORD-894210'}\n\n` +
		`🏛️ *Aula Virtual del Estudiante:*\nhttp://localhost:3000/mis-cursos.html\n\n` +
		`¡Muchos éxitos en tus clases! 🚀`;

	const waUrl = `https://api.whatsapp.com/send?phone=${numWa}&text=${encodeURIComponent(waTexto)}`;

	const waBtn = document.getElementById('btn-open-wa-direct');
	if (waBtn) {
		waBtn.href = waUrl;
		waBtn.innerHTML = `<i class="fa fa-whatsapp fa-lg"></i> Abrir y Recibir en mi WhatsApp (${formatDisplayPhone(tel)})`;
	}

	const bannerWa = document.getElementById('btn-banner-wa');
	if (bannerWa) {
		bannerWa.href = waUrl;
	}

	// 2. Correo para Gmail Web y cliente de escritorio
	const mailSubject = `¡Confirmación de Matrícula! ${curso.titulo} (${currentOrder.codigoOrden || 'ORD-894210'})`;
	const mailBody = `Hola ${nombre},\n\nTu matrícula en el curso "${curso.titulo}" fue confirmada con éxito en Gestión de Cursos S.A.C.\n\n` +
		`==========================================\n` +
		`DATOS DE TU MATRÍCULA Y ACCESOS\n` +
		`==========================================\n` +
		`Código de Matrícula: ${currentOrder.codigoOrden || 'ORD-894210'}\n` +
		`Comprobante SUNAT: ${comp.correlativo || 'B001-00001042'}\n` +
		`Total Pagado: S/ ${comp.total || '150.00'}\n` +
		`Medio de Pago: ${currentOrder.metodoPago || 'Mercado Pago Checkout'}\n` +
		`Horario de Clase: ${curso.horario}\n` +
		(curso.modalidad === 'VIRTUAL' ? `Enlace de Acceso en Vivo: ${curso.enlaceClase || 'https://meet.google.com/abc-defg-hij'}\n\n` : `Sede Física: ${curso.direccionClase || 'Sede Central'} - Aula: ${curso.aula || 'Lab 302'}\n\n`) +
		`Ingresa a tu campus virtual en cualquier momento:\nhttp://localhost:3000/mis-cursos.html\n\n` +
		`Saludos cordiales,\nGestión de Cursos S.A.C.\nRUC: 20609876543 - Lima, Perú`;

	// Enlace directo al redactor web de Gmail
	const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(correo)}&su=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
	const mailtoUrl = `mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

	const mailBtn = document.getElementById('btn-open-mail-direct');
	if (mailBtn) {
		mailBtn.href = gmailWebUrl;
		mailBtn.innerHTML = `<i class="fa fa-google"></i> Abrir y Recibir en mi Gmail Web (${correo})`;
	}

	const mailtoBtn = document.getElementById('btn-open-mailto-direct');
	if (mailtoBtn) {
		mailtoBtn.href = mailtoUrl;
	}

	const bannerGmail = document.getElementById('btn-banner-gmail');
	if (bannerGmail) {
		bannerGmail.href = gmailWebUrl;
	}
}

/**
 * Mostrar / ocultar caja de modificación de destinos
 */
function toggleEditDestinos() {
	const box = document.getElementById('box-edit-destinos');
	if (box) {
		box.classList.toggle('d-none');
	}
}

/**
 * Actualizar destinos desde los inputs personalizados
 */
function actualizarDestinosPersonalizados() {
	const customWa = document.getElementById('custom-wa-input');
	const customCorreo = document.getElementById('custom-correo-input');

	if (customWa && customWa.value.trim()) {
		activeTelAlumno = customWa.value.trim();
	}
	if (customCorreo && customCorreo.value.trim()) {
		activeCorreoAlumno = customCorreo.value.trim();
	}

	configurarCanalesEntrega(activeTelAlumno, activeCorreoAlumno);

	// Actualizar también en el bloque de titular
	const elTel = document.getElementById('rec-telefono');
	if (elTel) elTel.textContent = formatDisplayPhone(activeTelAlumno);
	const elMail = document.getElementById('rec-correo');
	if (elMail) elMail.textContent = activeCorreoAlumno;

	Notifications.showToast('¡Destinos actualizados! Ahora haz clic en enviar.', 'success');
}

// Inicialización garantizada (inmediata o en evento)
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initConfirmacion);
} else {
	initConfirmacion();
}
window.addEventListener('pageshow', initConfirmacion);
if (typeof $ !== 'undefined') {
	$(document).ready(initConfirmacion);
}
