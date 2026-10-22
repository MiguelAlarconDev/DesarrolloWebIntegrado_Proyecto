/**
 * mis-cursos.js - Lógica de Mis Clases y Matrículas
 * Control estricto de usuario: si no hay usuario autenticado, NO muestra ningún curso.
 * Si el usuario inicia sesión, muestra ÚNICAMENTE los cursos matriculados de ese usuario.
 */

async function cargarAlumnoDemoMisCursos() {
	try {
		Notifications.showToast('Autenticando alumno en el sistema...', 'info');
		const res = await AuthService.login('estudiante@cursos.com', '123456');
		Notifications.showToast(`¡Bienvenido ${res.user.nombres}! Cargando tus clases...`, 'success');
		AuthService.updateNavbar();
		await initMisCursos();
	} catch (err) {
		Notifications.showToast('Error al cargar alumno: ' + err.message, 'error');
	}
}

function cerrarSesionMisCursos() {
	AuthService.logout('mis-cursos.html');
}

async function initMisCursos() {
	const container = document.getElementById('mis-cursos-penn-list');
	if (!container) return;

	// Limpiar inmediatamente el contenedor para evitar que queden cursos de sesiones anteriores
	container.innerHTML = '';

	const counterEl = document.getElementById('cart-nav-counter');
	if (counterEl) counterEl.textContent = CartService.getCartCount();
	AuthService.updateNavbar();

	const user = AuthService.getCurrentUser();

	// =========================================================================
	// 1. REGLA ESTRICTA: SI NO HAY USUARIO, NO MOSTRAR NINGÚN CURSO
	// =========================================================================
	if (!user) {
		container.innerHTML = `
			<div class="col-12 text-center py-5">
				<div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 40px 30px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.04);">
					<div style="width: 76px; height: 76px; border-radius: 50%; background: #f8fafc; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
						<i class="ti-lock" style="font-size: 36px; color: #64748b;"></i>
					</div>
					<h3 style="color: #1a2d62; font-weight: 800; font-size: 22px; margin-bottom: 10px;">
						Inicia sesión para ver tus clases
					</h3>
					<p class="text-muted mb-4" style="font-size: 14px; line-height: 1.6;">
						No hay ninguna cuenta de alumno activa en este momento. Identifícate con tu cuenta para acceder a tus salas virtuales de Zoom/Meet, horarios y aulas presenciales:
					</p>
					<div class="d-flex justify-content-center gap-2 flex-wrap">
						<button type="button" onclick="cargarAlumnoDemoMisCursos()" class="btn_one" style="border-radius: 8px; padding: 10px 22px; border: none; cursor: pointer;">
							<i class="fa fa-bolt me-1"></i> Cargar Cuenta Alumno (1 Clic)
						</button>
						<a href="login.html?redirect=mis-cursos.html" class="btn_two" style="border-radius: 8px; padding: 10px 22px; text-decoration: none;">
							<i class="fa fa-sign-in me-1"></i> Iniciar Sesión
						</a>
						<a href="registro.html?redirect=mis-cursos.html" style="background: #ffffff; color: #1a2d62; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 18px; font-size: 13px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center;">
							Crear Cuenta
						</a>
					</div>
				</div>
			</div>
		`;
		return;
	}

	// =========================================================================
	// 2. USUARIO AUTENTICADO: CARGAR SUS CURSOS CORRESPONDIENTES
	// =========================================================================
	container.innerHTML = `
		<div class="col-12 text-center py-5">
			<div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
				<span class="visually-hidden">Cargando tus clases...</span>
			</div>
			<p class="mt-3 text-muted">Consultando tus matrículas oficiales en el servidor...</p>
		</div>
	`;

	// Consultar pedidos del usuario autenticado
	const todasMatriculas = await PedidosService.getMisMatriculas(user.id);

	// Filtrar para mostrar los cursos pagados y deduplicar por cursoId para que no aparezca repetido
	const cursosVistos = new Set();
	const matriculas = (todasMatriculas || []).filter(item => {
		const cid = (item.curso && item.curso.id) ? item.curso.id : item.id;
		if (cursosVistos.has(cid)) return false;
		cursosVistos.add(cid);
		return true;
	});

	const nombreAlumno = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Estudiante';
	const iniciales = ((user.nombres ? user.nombres[0] : 'A') + (user.apellidos ? user.apellidos[0] : 'L')).toUpperCase();

	// Si el usuario autenticado aún no ha comprado ningún curso
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
					<h3 class="mt-3" style="color: #1a2d62; font-weight: 800; font-size: 22px;">Aún no tienes cursos matriculados</h3>
					<p class="text-muted mb-4" style="font-size: 14px;">Este usuario aún no tiene inscripciones activas. Explora nuestro catálogo para inscribirte:</p>
					<a href="cursos.html" class="btn_one" style="border-radius: 8px; padding: 10px 24px; text-decoration: none;">
						<i class="fa fa-graduation-cap me-1"></i> Ver Catálogo de Cursos
					</a>
				</div>
			</div>
		`;
		return;
	}

	// Renderizar cabecera del alumno con sus cursos
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
								${matriculas.length} ${matriculas.length === 1 ? 'Curso Matriculado' : 'Cursos Matriculados'}
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
					<a href="cursos.html" class="btn_one" style="font-size: 12px; padding: 8px 16px; border-radius: 6px; text-decoration: none;">
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
		const isPagado = item.estado === 'PAGADO';

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
						<div class="course-date" style="position: absolute; top: 12px; right: 12px; background: ${isPagado ? '#2eca7f' : '#f59e0b'}; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;">
							<i class="fa ${isPagado ? 'fa-check' : 'fa-clock-o'} me-1"></i>${isPagado ? 'MATRICULADO' : 'PENDIENTE'}
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

// Inicialización tanto al cargar como al volver de navegación con caché (pageshow)
$(document).ready(initMisCursos);
window.addEventListener('pageshow', initMisCursos);
