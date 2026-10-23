/**
 * curso-detalle.js - Lógica de la Vista de Detalle del Curso
 * Carga de información detallada, control de vacantes en tiempo real,
 * temarios por curso, información de sede o enlace virtual y reserva con control de usuario.
 */

let activeCurso = null;

async function initDetalle() {
	const params = new URLSearchParams(window.location.search);
	const id = params.get('id') || 'b0000000-0000-0000-0000-000000000001';
	activeCurso = await CursosService.getCursoById(id);

	if (!activeCurso) {
		const fallbackCursos = (typeof CONFIG !== 'undefined' && CONFIG.INITIAL_COURSES) ? CONFIG.INITIAL_COURSES : [];
		activeCurso = fallbackCursos.length > 0 ? fallbackCursos[0] : null;
	}
	if (!activeCurso) {
		return;
	}

	// Actualizar UI con datos del curso
	const elTitle = document.getElementById('page-course-title');
	if (elTitle) elTitle.textContent = activeCurso.titulo;

	const elHeading = document.getElementById('course-name-heading');
	if (elHeading) elHeading.textContent = activeCurso.titulo;

	const elPrice = document.getElementById('course-price-display');
	if (elPrice) elPrice.textContent = `S/ ${Number(activeCurso.precio).toFixed(2)}`;

	const elOverview = document.getElementById('course-overview-text');
	if (elOverview) elOverview.textContent = activeCurso.descripcion;

	const elImg = document.getElementById('course-main-img');
	if (elImg) elImg.src = activeCurso.imagen;

	const elImgLink = document.getElementById('course-img-link');
	if (elImgLink) elImgLink.href = activeCurso.imagen;

	const elDocente = document.getElementById('docente-tab-name');
	if (elDocente) elDocente.textContent = activeCurso.docente || 'Docente Certificado';

	const isVirtual = activeCurso.modalidad === 'VIRTUAL';
	const badgeBox = document.getElementById('course-modality-badge-box');
	if (badgeBox) {
		badgeBox.innerHTML = isVirtual
			? `<span class="badge-mod-virtual"><i class="fa fa-video-camera"></i> Clases Virtuales en Vivo (Zoom / Meet)</span>`
			: `<span class="badge-mod-presencial"><i class="fa fa-building"></i> Clases Presenciales en Sede Física</span>`;
	}

	const btnModInfo = document.getElementById('btn-modalidad-info');
	if (btnModInfo) {
		btnModInfo.textContent = isVirtual ? 'VIRTUAL (ZOOM / MEET)' : 'PRESENCIAL (SEDE & AULA)';
	}

	// Bloque de ubicación
	const locBox = document.getElementById('modality-location-box');
	if (locBox) {
		if (isVirtual) {
			locBox.innerHTML = `
				<p class="mb-1 text-primary"><i class="fa fa-video-camera me-1"></i> <strong>Transmisión en Vivo:</strong> Plataformas Zoom / Google Meet.</p>
				<small class="text-muted"><i class="fa fa-whatsapp text-success me-1"></i> El enlace directo de la sala se enviará automáticamente a tu WhatsApp al confirmar tu pago.</small>
			`;
		} else {
			locBox.innerHTML = `
				<p class="mb-1 text-dark"><i class="fa fa-map-marker text-danger me-1"></i> <strong>Sede:</strong> ${activeCurso.direccionClase || 'Av. Universitaria 1234, Lima'}</p>
				<p class="mb-1 text-dark"><i class="fa fa-door-open text-primary me-1"></i> <strong>Aula asignada:</strong> <span class="badge bg-dark">${activeCurso.aula || 'Laboratorio 204'}</span></p>
				<small class="text-danger"><i class="fa fa-exclamation-triangle me-1"></i> Aforo estricto de carpetas. Asiento reservado garantizado al pagar.</small>
			`;
		}
	}

	// Verificar si el alumno ya tiene este curso pagado
	let isPaid = false;
	const user = AuthService.getCurrentUser();
	if (user) {
		try {
			const matriculas = await PedidosService.getMisMatriculas(user.id);
			isPaid = (matriculas || []).some(m => {
				const cid = (m.curso && m.curso.id) ? m.curso.id : (m.cursoId || m.id);
				return m.estado === 'PAGADO' && cid === activeCurso.id;
			});
		} catch (_) {}
	}

	// Aforo y botón de acción principal
	const total = activeCurso.aforoMaximo || 30;
	const libres = activeCurso.aforoDisponible !== undefined ? activeCurso.aforoDisponible : 30;
	const seatsBox = document.getElementById('seats-live-status-container');
	const btnAction = document.getElementById('btn-enroll-action');
	const inCart = CartService.isInCart(activeCurso.id);

	if (seatsBox && btnAction) {
		if (isPaid) {
			seatsBox.innerHTML = `<span class="seats-live-badge" style="background: #f0fdf4; color: #15803d; border-color: #86efac;"><i class="fa fa-check-circle"></i> <strong>Ya estás matriculado en este curso</strong></span>`;
			btnAction.className = 'btn btn_one';
			btnAction.style.background = '#16a34a';
			btnAction.innerHTML = `<i class="fa fa-graduation-cap me-1"></i> Ir a Mis Clases`;
			btnAction.onclick = () => window.location.href = 'mis-cursos.html';
		} else if (inCart) {
			seatsBox.innerHTML = `<span class="seats-live-badge" style="background: #f0f9ff; color: #0369a1; border-color: #bae6fd;"><i class="fa fa-shopping-cart"></i> <strong>Curso reservado en tu carrito</strong></span>`;
			btnAction.className = 'btn btn_one';
			btnAction.style.background = '#0284c7';
			btnAction.innerHTML = `<i class="fa fa-arrow-right me-1"></i> Continuar al Pago`;
			btnAction.onclick = () => window.location.href = 'carrito.html';
		} else if (libres <= 0) {
			seatsBox.innerHTML = `<span class="seats-live-badge soldout"><i class="fa fa-times-circle"></i> Aforo Completo (0 vacantes disponibles)</span>`;
			btnAction.disabled = true;
			btnAction.textContent = 'Vacantes Agotadas';
			btnAction.className = 'btn btn-secondary';
		} else {
			if (libres <= 3) {
				seatsBox.innerHTML = `<span class="seats-live-badge urgent"><i class="fa fa-bolt"></i> ¡ALERTA! Solo quedan ${libres} vacantes de ${total}</span>`;
			} else {
				seatsBox.innerHTML = `<span class="seats-live-badge"><i class="fa fa-table"></i> Quedan ${libres} vacantes libres de ${total}</span>`;
			}
			btnAction.onclick = () => {
				const res = CartService.addToCart(activeCurso);
				CartService.bumpBadge();
				Notifications.showToast(res.message || '¡Curso agregado al carrito!', 'success');
				setTimeout(() => {
					window.location.href = 'carrito.html';
				}, 300);
			};
		}
	}

	// Temarios y detalles enriquecidos según el curso
	const temariosPorCurso = {
		'Desarrollo Web Integrado con Spring Boot': [
			'Módulo 1: Fundamentos de Arquitectura de Microservicios con Spring Boot 3 y Maven.',
			'Módulo 2: Seguridad Empresarial y Tokens JWT con expiración automática (Spring Security 6).',
			'Módulo 3: Base de Datos Relacional PostgreSQL, Persistencia con Spring Data JPA y Transacciones ACID.',
			'Módulo 4: Integración de Pasarela de Pagos Mercado Pago y Facturación Electrónica SUNAT.'
		],
		'Arquitectura Cloud en Java': [
			'Módulo 1: Contenedores con Docker y orquestación para aplicaciones backend Java.',
			'Módulo 2: Despliegue en AWS (Amazon Web Services), ECS, Fargate y balanceo de carga.',
			'Módulo 3: Bases de datos en la nube con PostgreSQL en AWS RDS y replicación de alta disponibilidad.',
			'Módulo 4: Pipelines CI/CD automatizados con GitHub Actions y monitoreo con CloudWatch.'
		],
		'Taller Presencial de Java y Microservicios': [
			'Módulo 1: Configuración en Laboratorio 204 y entorno JDK 21+ con IntelliJ IDEA y PostgreSQL local.',
			'Módulo 2: Desarrollo práctico guiado cara a cara con el docente: APIs REST y diseño por capas.',
			'Módulo 3: Manejo estricto de concurrencia y control de vacantes en tiempo real para evitar sobrecupos.',
			'Módulo 4: Despliegue en servidor local, pruebas de carga y entrega de proyecto integrador presencial.'
		]
	};

	const temario = temariosPorCurso[activeCurso.titulo] || [
		'Módulo 1: Fundamentos y configuración de entorno profesional.',
		'Módulo 2: Arquitectura moderna, buenas prácticas y desarrollo de casos reales.',
		'Módulo 3: Pruebas, seguridad y optimización del rendimiento.',
		'Módulo 4: Proyecto final integrador con evaluación y certificación.'
	];

	const temarioHtml = temario.map((m) => `
		<li class="mb-2"><i class="fa fa-check-circle text-success me-2"></i> ${m}</li>
	`).join('');

	const tabTemario = document.getElementById('tab-temario-content');
	if (tabTemario) {
		tabTemario.innerHTML = `
			<p class="mb-3">${activeCurso.descripcion}</p>
			<h5 class="fw-bold mb-3">Plan de Estudios Oficial:</h5>
			<ul class="list-unstyled ps-1">${temarioHtml}</ul>
		`;
	}

	// Tab Información & Acceso
	const tabInfo = document.getElementById('tab-info-modality');
	if (tabInfo) {
		tabInfo.innerHTML = isVirtual ? `
			<div class="row">
				<div class="col-md-6 mb-3">
					<h5 class="fw-bold"><i class="fa fa-video-camera text-primary me-2"></i> Modalidad 100% Virtual en Vivo</h5>
					<p class="text-muted">Las clases se dictan en tiempo real mediante Zoom y Google Meet con chat interactivo para formular preguntas al docente en el momento.</p>
				</div>
				<div class="col-md-6 mb-3">
					<h5 class="fw-bold"><i class="fa fa-clock-o text-success me-2"></i> Horario y Duración</h5>
					<p class="text-muted">${activeCurso.horario}. Todas las sesiones quedan grabadas en alta definición con acceso ilimitado para repaso.</p>
				</div>
				<div class="col-md-6 mb-3">
					<h5 class="fw-bold"><i class="fa fa-certificate text-warning me-2"></i> Certificación Oficial</h5>
					<p class="text-muted">Se emite un Certificado Digital con código QR de verificación al aprobar las prácticas del curso.</p>
				</div>
				<div class="col-md-6 mb-3">
					<h5 class="fw-bold"><i class="fa fa-whatsapp text-success me-2"></i> Entrega Inmediata de Accesos</h5>
					<p class="text-muted">Al confirmar tu matrícula, el enlace de la sala virtual se envía de inmediato a tu WhatsApp y a tu correo.</p>
				</div>
			</div>
		` : `
			<div class="row">
				<div class="col-md-6 mb-3">
					<h5 class="fw-bold"><i class="fa fa-building text-success me-2"></i> Modalidad Presencial en Sede</h5>
					<p class="text-muted"><strong>Sede:</strong> ${activeCurso.direccionClase || 'Av. Universitaria 1234, Pabellón B, Lima'}<br><strong>Aula asignada:</strong> <span class="badge bg-dark">${activeCurso.aula || 'Laboratorio 204'}</span></p>
				</div>
				<div class="col-md-6 mb-3">
					<h5 class="fw-bold"><i class="fa fa-users text-primary me-2"></i> Aforo Físico Estricto</h5>
					<p class="text-muted">Cada alumno cuenta con una computadora y carpeta física asignada. Cero riesgo de sobreventa: solo se admiten ${activeCurso.aforoMaximo} participantes.</p>
				</div>
				<div class="col-md-6 mb-3">
					<h5 class="fw-bold"><i class="fa fa-calendar text-danger me-2"></i> Horario de Laboratorio</h5>
					<p class="text-muted">${activeCurso.horario}. El docente asiste de forma personalizada durante cada sesión práctica.</p>
				</div>
				<div class="col-md-6 mb-3">
					<h5 class="fw-bold"><i class="fa fa-certificate text-warning me-2"></i> Certificación Física y Digital</h5>
					<p class="text-muted">Diploma emitido por Gestión de Cursos al culminar satisfactoriamente el taller.</p>
				</div>
			</div>
		`;
	}

	CartService.updateBadge();
	AuthService.updateNavbar();
}

// Inicialización
$(document).ready(initDetalle);
