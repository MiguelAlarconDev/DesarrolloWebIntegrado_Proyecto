/**
 * mis-cursos.js - Lógica de Mis Clases y Matrículas
 * Conectado en tiempo real con las APIs de base de datos (pedidos-service / PostgreSQL).
 * - Usuarios no autenticados: Muestra tarjeta amigable para ingresar o registrarse.
 * - Usuarios autenticados: Muestra sus cursos pagados con enlaces directos a Zoom/Meet y aulas.
 */

async function cargarAlumnoDemoMisCursos() {
	try {
		Notifications.showToast('Autenticando alumno en el sistema...', 'info');
		const res = await AuthService.login('estudiante@cursos.com', '123456');
		Notifications.showToast(`¡Bienvenido, ${res.user.nombres}! Cargando tus clases...`, 'success');
		AuthService.updateNavbar();
		await initMisCursos();
	} catch (err) {
		Notifications.showToast('Error al cargar alumno: ' + err.message, 'error');
	}
}

function cerrarSesionMisCursos() {
	AuthService.logout(null);
	initMisCursos();
	Notifications.showToast('Sesión cerrada. Puedes ingresar con otra cuenta.', 'info');
}

async function initMisCursos() {
	const user = AuthService.getCurrentUser();
	const container = (document.getElementById('mis-cursos-list'));
	if (!container) return;

	container.innerHTML = '';

	const counterEl = document.getElementById('cart-nav-counter');
	if (counterEl) counterEl.textContent = CartService.getCartCount();
	AuthService.updateNavbar();

	// =========================================================================
	// 1. SI NO HA INGRESADO USUARIO: MOSTRAR INVITACIÓN PARA IDENTIFICARSE
	// =========================================================================
	if (!user) {
		container.innerHTML = `
			<div class="col-12 text-center py-5">
				<div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 42px 32px; border-radius: 16px; border: 1px solid #eef2f6; box-shadow: 0 10px 30px rgba(16, 24, 40, 0.04);">
					<div style="width: 72px; height: 72px; border-radius: 50%; background: #f0fdf4; color: #2eca7f; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 20px;">
						<i class="fa fa-graduation-cap"></i>
					</div>
					<h3 style="color: #1a2d62; font-weight: 800; font-size: 22px; margin-bottom: 8px;">
						Accede a tus Clases Matriculadas
					</h3>
					<p style="color: #64748b; font-size: 14px; line-height: 1.55; margin-bottom: 24px;">
						Inicia sesión con tu cuenta de alumno para entrar a tus salas virtuales de Zoom/Meet, consultar tus horarios y revisar tus aulas asignadas.
					</p>
					<div class="d-flex justify-content-center gap-2 flex-wrap mb-3">
						<a href="login.html?redirect=mis-cursos.html" class="btn_one" style="padding: 12px 28px; font-size: 14.5px; font-weight: 800; border-radius: 8px; text-decoration: none;">
							<i class="fa fa-sign-in me-1"></i> Iniciar Sesión
						</a>
						<a href="registro.html?redirect=mis-cursos.html" class="btn_two" style="padding: 12px 24px; font-size: 14px; font-weight: 700; border-radius: 8px; text-decoration: none; background: #f8fafc; border: 1px solid #d7dee8; color: #1a2d62;">
							<i class="fa fa-user-plus me-1"></i> Crear Cuenta
						</a>
					</div>
					<div class="pt-3 border-top mt-3">
						<button type="button" onclick="cargarAlumnoDemoMisCursos()" class="btn" style="background: #eef8fc; color: #0284c7; border: 1px dashed #0284c7; font-weight: 700; font-size: 13px; border-radius: 6px; padding: 9px 18px; cursor: pointer;">
							<i class="fa fa-bolt me-1"></i> Cargar Usuario Estudiante (Carlos Alarcón)
						</button>
					</div>
				</div>
			</div>
		`;
		return;
	}

	// =========================================================================
	// 2. USUARIO AUTENTICADO: CARGAR SUS CURSOS PAGADOS DESDE LA BD
	// =========================================================================
	container.innerHTML = `
		<div class="col-12 text-center py-5">
			<div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
				<span class="visually-hidden">Cargando tus clases...</span>
			</div>
			<p class="mt-3 text-muted" style="font-size: 14px;">Consultando tus matrículas oficiales en la base de datos...</p>
		</div>
	`;

	// Consultar pedidos del estudiante directamente desde el microservicio / API Gateway
	const todasMatriculas = await PedidosService.getMisMatriculas(user.id);

	// Filtrar para mostrar cursos pagados y deduplicar por curso
	const cursosVistos = new Set();
	const matriculas = (todasMatriculas || []).filter(item => {
		const isPagado = item.estado === 'PAGADO';
		if (!isPagado) return false;
		const cid = (item.curso && item.curso.id) ? item.curso.id : (item.cursoId || item.id);
		if (cursosVistos.has(cid)) return false;
		cursosVistos.add(cid);
		return true;
	});

	const nombreAlumno = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Estudiante';
	const iniciales = ((user.nombres ? user.nombres[0] : 'A') + (user.apellidos ? user.apellidos[0] : 'L')).toUpperCase();

	// Si no tiene cursos pagados
	if (matriculas.length === 0) {
		container.innerHTML = `
			<div class="col-12">
				<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
					<div class="d-flex align-items-center gap-3">
						<div style="width: 52px; height: 52px; border-radius: 50%; background: #2eca7f; color: #fff; font-size: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center;">
							${iniciales}
						</div>
						<div>
							<div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #15803d; letter-spacing: 0.5px;">Estudiante Conectado</div>
							<h4 style="font-size: 18px; font-weight: 800; color: #1a2d62; margin: 2px 0;">${nombreAlumno}</h4>
							<div style="font-size: 12px; color: #475569;">${user.correo} &bull; DNI: ${user.dni || '30000003'}</div>
						</div>
					</div>
					<button type="button" onclick="cerrarSesionMisCursos()" style="border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer;">
						<i class="fa fa-sign-out me-1"></i> Cerrar Sesión
					</button>
				</div>
			</div>
			<div class="col-12 text-center py-5">
				<div style="max-width: 520px; margin: 0 auto; background: #fff; padding: 40px 30px; border-radius: 12px; border: 1px solid #eef2f6;">
					<i class="ti-book text-muted" style="font-size: 54px; color: #94a3b8;"></i>
					<h3 class="mt-3" style="color: #1a2d62; font-weight: 800; font-size: 22px;">Aún no tienes cursos pagados</h3>
					<p class="text-muted mb-4" style="font-size: 14px;">Inscríbete en un curso de nuestro catálogo para acceder a tus salas en vivo y comprobantes:</p>
					<a href="index.html" class="btn_one" style="border-radius: 8px; padding: 10px 24px; text-decoration: none;">
						<i class="fa fa-graduation-cap me-1"></i> Ver Catálogo de Cursos
					</a>
				</div>
			</div>
		`;
		return;
	}

	// Renderizar cabecera del alumno con sus cursos pagados
	const headerHtml = `
		<div class="col-12">
			<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
				<div class="d-flex align-items-center gap-3">
					<div style="width: 52px; height: 52px; border-radius: 50%; background: #2eca7f; color: #fff; font-size: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(46, 202, 127, 0.3);">
						${iniciales}
					</div>
					<div>
						<div class="d-flex align-items-center gap-2">
							<span style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 10px;">
								<i class="fa fa-check-circle"></i> Alumno Activo
							</span>
							<span class="badge bg-light text-dark border" style="font-size: 11px; font-weight: 700;">
								${matriculas.length} ${matriculas.length === 1 ? 'Curso Pagado' : 'Cursos Pagados'}
							</span>
						</div>
						<h4 style="font-size: 18px; font-weight: 800; color: #1a2d62; margin: 4px 0 2px;">${nombreAlumno}</h4>
						<div style="font-size: 12px; color: #475569;">
							<span><i class="fa fa-envelope text-muted me-1"></i>${user.correo}</span>
							<span class="ms-2">&bull; <i class="fa fa-id-card text-muted me-1"></i>DNI: <strong>${user.dni || '30000003'}</strong></span>
							<span class="ms-2">&bull; <i class="fa fa-whatsapp text-success me-1"></i><strong>+51 ${user.whatsapp ? user.whatsapp.replace('+51', '') : '999555666'}</strong></span>
						</div>
					</div>
				</div>
				<div class="d-flex gap-2">
					<a href="index.html" class="btn_one" style="font-size: 12px; padding: 8px 16px; border-radius: 6px; text-decoration: none;">
						<i class="fa fa-plus me-1"></i> Matricular otro curso
					</a>
					<button type="button" onclick="cerrarSesionMisCursos()" style="border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; padding: 8px 14px; font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer;">
						<i class="fa fa-sign-out me-1"></i> Cerrar Sesión
					</button>
				</div>
			</div>
		</div>
	`;

	const cardsHtml = matriculas.map((item) => {
		const curso = item.curso || {};
		const isVirtual = curso.modalidad === 'VIRTUAL';
		const comp = item.comprobante || {};

		let accessAction = '';
		if (isVirtual) {
			accessAction = `
				<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-top: 14px;">
					<strong class="d-block mb-1" style="color: #0284c7; font-size: 13px;">
						<i class="fa fa-video-camera me-1"></i> Sala Virtual en Vivo (Google Meet / Zoom)
					</strong>
					<p style="font-size: 12px; color: #64748b; margin-bottom: 10px; line-height: 1.4;">
						Tus clases se transmiten en tiempo real con interacción docente.
					</p>
					<a href="${curso.enlaceClase || 'https://meet.google.com/abc-defg-hij'}" target="_blank" rel="noopener noreferrer" class="btn_one d-inline-flex align-items-center gap-2" style="font-size: 13px; padding: 8px 16px; border-radius: 6px; text-decoration: none;">
						<i class="fa fa-external-link"></i> Entrar a la Sala Virtual
					</a>
				</div>
			`;
		} else {
			accessAction = `
				<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-top: 14px;">
					<strong class="d-block mb-1" style="color: #166534; font-size: 13px;">
						<i class="fa fa-building me-1"></i> Clase Presencial con Asiento Asignado
					</strong>
					<small class="d-block text-muted" style="font-size: 12px;"><strong>Sede:</strong> ${curso.direccionClase || 'Sede Central - Av. Universitaria 1234, Lima'}</small>
					<small class="d-block text-muted mt-1" style="font-size: 12px;"><strong>Aula:</strong> <span class="badge bg-dark">${curso.aula || 'Laboratorio 204'}</span></small>
				</div>
			`;
		}

		return `
			<div class="col-lg-4 col-sm-6 col-xs-12">
				<div class="course-slide" style="margin-bottom: 30px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
					<div class="course-img" style="position: relative;">
						<img src="${curso.imagen || 'assets/images/all-img/c1.png'}" alt="${curso.titulo || 'Curso'}" style="width: 100%; height: 190px; object-fit: cover;">
						<div class="course-date" style="position: absolute; top: 12px; right: 12px; background: #2eca7f; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;">
							<i class="fa fa-check me-1"></i>PAGADO
						</div>
					</div>
					<div class="course-content" style="padding: 20px;">
						<div class="d-flex align-items-center justify-content-between mb-2">
							<span class="${isVirtual ? 'badge-mod-virtual' : 'badge-mod-presencial'}">
								<i class="fa ${isVirtual ? 'fa-video-camera' : 'fa-building'} me-1"></i>${curso.modalidad || 'VIRTUAL'}
							</span>
							<span style="font-size: 11px; font-weight: 700; color: #64748b;">
								<i class="fa fa-barcode me-1"></i>${item.codigoOrden || 'ORD-000000'}
							</span>
						</div>
						<h3 style="font-size: 16px; font-weight: 800; color: #1a2d62; line-height: 1.35; margin-bottom: 8px;">
							<a href="curso-detalle.html?id=${curso.id || ''}" style="color: inherit; text-decoration: none;">${curso.titulo || 'Curso'}</a>
						</h3>
						<div style="font-size: 12.5px; color: #475569; margin-bottom: 4px;">
							<i class="fa fa-calendar text-primary me-1"></i> ${curso.horario || 'Horario flexible'}
						</div>
						<div style="font-size: 12px; color: #64748b;">
							<i class="fa fa-file-text-o text-muted me-1"></i> Comprobante: <strong>${comp.correlativo || 'B001-00000000'}</strong>
						</div>
						
						${accessAction}

						<div class="border-top pt-3 mt-3 d-flex justify-content-between align-items-center">
							<a href="curso-detalle.html?id=${curso.id || ''}" class="c_btn" style="text-decoration: none; font-size: 12px;">
								<i class="fa fa-book me-1"></i> Ver Temario
							</a>
							<span style="font-size: 11px; color: #166534; font-weight: 700;">
								<i class="fa fa-shield me-1"></i> Matrícula Oficial
							</span>
						</div>
					</div>
				</div>
			</div>
		`;
	}).join('');

	container.innerHTML = headerHtml + cardsHtml;
}

// Inicialización
$(document).ready(initMisCursos);
window.addEventListener('pageshow', initMisCursos);

