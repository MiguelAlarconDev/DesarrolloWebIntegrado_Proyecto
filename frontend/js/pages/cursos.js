/**
 * cursos.js - Lógica del Catálogo Completo de Cursos
 * Manejo de búsquedas en tiempo real, filtros combinados por modalidad,
 * detección de cursos ya matriculados o en el carrito, y reserva directa.
 */

let allCursos = (typeof CONFIG !== 'undefined' && CONFIG.INITIAL_COURSES) ? [...CONFIG.INITIAL_COURSES] : [];
let currentModalidad = 'TODOS';
let searchKeyword = '';
let paidCourseIds = new Set();

async function initCursosPage() {
	actualizarEstadoNavbar();

	// 1. Leer parámetros de URL (ej. ?modalidad=VIRTUAL o ?q=spring)
	const params = new URLSearchParams(window.location.search);
	const urlMod = (params.get('modalidad') || '').toUpperCase();
	if (['VIRTUAL', 'PRESENCIAL', 'TODOS'].includes(urlMod)) {
		currentModalidad = urlMod;
		actualizarBotonesModalidad();
	}

	const urlQ = params.get('q') || '';
	if (urlQ) {
		searchKeyword = urlQ.toLowerCase().trim();
		const searchInput = document.getElementById('buscador-cursos');
		if (searchInput) searchInput.value = urlQ;
	}

	// 2. Si el alumno está autenticado, cargar sus cursos pagados para identificarlos en el catálogo
	await cargarCursosPagadosAlumno();

	// 3. Cargar catálogo desde la base de datos (PostgreSQL vía API Gateway)
	try {
		const remote = await CursosService.getCursos('TODOS');
		if (remote && remote.length > 0) {
			allCursos = remote;
		}
	} catch (e) {
		console.warn('[initCursosPage] Usando cursos locales precargados:', e);
	}

	applyFilter();
	actualizarEstadoNavbar();
}

async function cargarCursosPagadosAlumno() {
	paidCourseIds.clear();
	const user = AuthService.getCurrentUser();
	if (!user) return;

	try {
		const misMatriculas = await PedidosService.getMisMatriculas(user.id);
		(misMatriculas || []).forEach(m => {
			if (m.estado === 'PAGADO') {
				const cid = (m.curso && m.curso.id) ? m.curso.id : (m.cursoId || m.id);
				if (cid) paidCourseIds.add(cid);
			}
		});
	} catch (_) {
		/* no bloquea la vista del catálogo */
	}
}

function actualizarEstadoNavbar() {
	CartService.updateBadge();
	AuthService.updateNavbar();
}

function actualizarBotonesModalidad() {
	document.querySelectorAll('.best-cpurse button, .filter-mod-btn').forEach(b => {
		const onclickAttr = b.getAttribute('onclick') || '';
		if (onclickAttr.includes(`'${currentModalidad}'`)) {
			b.className = 'btn_one me-2 mb-2 filter-mod-btn';
		} else if (onclickAttr.includes('filtrarCursos')) {
			b.className = 'btn_two me-2 mb-2 filter-mod-btn';
		}
	});
}

function filtrarCursos(mod, btn) {
	currentModalidad = mod;
	document.querySelectorAll('.best-cpurse button').forEach(b => {
		b.className = 'btn_two me-2 mb-2';
	});
	if (btn) btn.className = 'btn_one me-2 mb-2';
	applyFilter();
}

function buscarCursos(keyword) {
	searchKeyword = keyword.toLowerCase().trim();
	applyFilter();
}

function applyFilter() {
	let filtered = CursosService.filterByModalidad(allCursos, currentModalidad);
	if (searchKeyword) {
		filtered = filtered.filter(c => 
			(c.titulo && c.titulo.toLowerCase().includes(searchKeyword)) ||
			(c.descripcion && c.descripcion.toLowerCase().includes(searchKeyword)) ||
			(c.docente && c.docente.toLowerCase().includes(searchKeyword))
		);
	}
	renderCursos(filtered);
}

function renderCursos(list) {
	const container = (document.getElementById('cursos-container'));
	if (!container) return;

	if (!list || list.length === 0) {
		container.innerHTML = `
			<div class="col-12 text-center py-5">
				<div style="max-width: 480px; margin: 0 auto; background: #ffffff; padding: 40px 30px; border-radius: 12px; border: 1px solid #eef2f6;">
					<i class="ti-search text-muted" style="font-size: 42px; display: block; margin-bottom: 12px;"></i>
					<h4 style="color: #1a2d62; font-weight: 800;">No se encontraron cursos</h4>
					<p class="text-muted" style="font-size: 14px;">Intenta cambiar el término de búsqueda o selecciona otra modalidad.</p>
					<button type="button" onclick="filtrarCursos('TODOS', null); document.getElementById('buscador-cursos').value=''; buscarCursos('');" class="btn_one mt-2" style="font-size: 13px; padding: 8px 18px; border-radius: 6px;">
						Ver todos los cursos
					</button>
				</div>
			</div>
		`;
		return;
	}

	container.innerHTML = list.map((c, i) => {
		const isVirtual = c.modalidad === 'VIRTUAL';
		const badgeHtml = isVirtual
			? `<span class="badge-mod-virtual"><i class="fa fa-video-camera"></i> Virtual en Vivo (Zoom / Meet)</span>`
			: `<span class="badge-mod-presencial"><i class="fa fa-building"></i> Presencial (Sede & Aula)</span>`;

		const total = c.aforoMaximo || 30;
		const libres = c.aforoDisponible !== undefined ? c.aforoDisponible : 30;
		let seatsClass = 'seats-live-badge';
		let seatsText = `<i class="fa fa-table"></i> <strong>${libres} Vacantes Disponibles</strong> (de ${total})`;

		if (libres <= 0) {
			seatsClass += ' soldout';
			seatsText = `<i class="fa fa-times-circle"></i> <strong>Aforo Completo (Agotado)</strong>`;
		} else if (libres <= 3) {
			seatsClass += ' urgent';
			seatsText = `<i class="fa fa-exclamation-circle"></i> <strong>¡Últimas ${libres} Vacantes!</strong>`;
		}

		const imgUrl = c.imagen || `assets/images/all-img/c${(i % 6) + 1}.png`;
		const docenteNombre = c.docente || (isVirtual ? 'Ing. Roberto Docente' : 'Ing. Carlos Mendoza');

		// Estados inteligentes del botón de acción según el usuario
		const isPaid = paidCourseIds.has(c.id);
		const inCart = CartService.isInCart(c.id);

		let actionBtnHtml = '';
		if (isPaid) {
			actionBtnHtml = `
				<a href="mis-cursos.html" class="btn_one" style="padding: 8px 16px; font-size: 13px; border-radius: 6px; text-decoration: none; background: #16a34a;">
					<i class="fa fa-graduation-cap me-1"></i> Ir a mi Clase
				</a>
			`;
		} else if (inCart) {
			actionBtnHtml = `
				<a href="carrito.html" class="btn_one" style="padding: 8px 16px; font-size: 13px; border-radius: 6px; text-decoration: none; background: #0284c7;">
					<i class="fa fa-shopping-cart me-1"></i> En el Carrito
				</a>
			`;
		} else if (libres > 0) {
			actionBtnHtml = `
				<button onclick="reservar('${c.id}')" class="btn_two btn-card-inscribir" style="cursor: pointer;">
					<i class="fa fa-shopping-cart"></i> Inscribirme
				</button>
			`;
		} else {
			actionBtnHtml = `<span class="badge bg-secondary" style="font-size: 12px; padding: 8px 12px;">Sin Vacantes</span>`;
		}

		const enrolledTag = isPaid
			? `<div style="position: absolute; top: 12px; left: 12px; background: #16a34a; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.3px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);"><i class="fa fa-check-circle me-1"></i>Ya Matriculado</div>`
			: '';

		return `
			<div class="col-lg-4 col-sm-6 col-xs-12" style="margin-bottom: 30px;">
				<div class="course-slide" style="height: 100%; display: flex; flex-direction: column; box-shadow: 0 5px 20px rgba(0,0,0,0.06); border-radius: 8px; overflow: hidden; background: #fff; position: relative;">
					<div class="course-img" style="position: relative;">
						<a href="curso-detalle.html?id=${c.id}">
							<img src="${imgUrl}" alt="${c.titulo}" style="width: 100%; height: 210px; object-fit: cover;">
						</a>
						${enrolledTag}
						<div class="course-date">
							<span class="month" style="font-weight: 700; font-size: 16px;">S/ ${Number(c.precio).toFixed(2)}</span>
						</div>
					</div>
					<div class="course-content" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 25px;">
						<div>
							<div class="mb-2">${badgeHtml}</div>
							<h3 style="font-size: 18px; line-height: 1.4; margin-bottom: 12px; min-height: 50px;">
								<a href="curso-detalle.html?id=${c.id}">${c.titulo}</a>
							</h3>
							<span class="d-block text-muted mb-1" style="font-size: 14px;"><i class="fa fa-calendar text-primary me-1"></i> ${c.horario}</span>
							<span class="d-block text-muted mb-3" style="font-size: 14px;"><i class="fa fa-user-circle text-secondary me-1"></i> ${docenteNombre}</span>
							<div class="mb-3">
								<span class="${seatsClass}">${seatsText}</span>
							</div>
						</div>
						<div class="d-flex justify-content-between align-items-center pt-3 border-top">
							<a class="c_btn" href="curso-detalle.html?id=${c.id}"><i class="fa fa-book me-1"></i> Ver Temario</a>
							${actionBtnHtml}
						</div>
					</div>
				</div>
			</div>
		`;
	}).join('');
}

function reservar(cursoId) {
	let c = (allCursos && allCursos.length > 0) ? allCursos.find(item => item.id === cursoId) : null;
	if (!c && typeof CONFIG !== 'undefined' && CONFIG.INITIAL_COURSES) {
		c = CONFIG.INITIAL_COURSES.find(item => item.id === cursoId);
	}
	if (!c) {
		const cached = JSON.parse(localStorage.getItem('app_cursos_cache') || '[]');
		c = cached.find(item => item.id === cursoId);
	}
	if (!c) {
		console.warn('Curso no localizado para ID:', cursoId);
		window.location.href = 'carrito.html';
		return;
	}

	// Si ya está pagado por el usuario, avisarle y llevar a Mis Clases
	if (paidCourseIds.has(cursoId)) {
		Notifications.showToast('Ya estás matriculado en este curso. Te llevamos a tus clases...', 'info');
		setTimeout(() => {
			window.location.href = 'mis-cursos.html';
		}, 400);
		return;
	}

	const res = CartService.addToCart(c);
	actualizarEstadoNavbar();
	applyFilter(); // Actualiza el botón de la tarjeta a "En el Carrito"

	Notifications.showToast(res.message || '¡Curso agregado a tu carrito!', 'success');
	setTimeout(() => {
		window.location.href = 'carrito.html';
	}, 350);
}

// Reactividad: refrescar botones si el carrito cambia en otra pestaña o en segundo plano
window.addEventListener('cartUpdated', () => {
	applyFilter();
});

// Inicialización
$(document).ready(initCursosPage);
