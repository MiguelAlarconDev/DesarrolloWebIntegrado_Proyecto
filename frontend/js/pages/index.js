/**
 * index.js - Lógica de la Página Principal y Catálogo Unificado
 * Gestión del catálogo completo, buscador en tiempo real, filtrado por modalidad
 * y reserva de vacantes con control de usuario.
 */

let allCursos = (typeof CONFIG !== 'undefined' && CONFIG.INITIAL_COURSES) ? [...CONFIG.INITIAL_COURSES] : [];
let currentModalidadHome = 'TODOS';
let searchKeywordHome = '';
let paidCourseIdsHome = new Set();

async function initHome() {
	actualizarEstadoNavbar();

	// Soporte de modalidad y búsqueda desde URL (ej. index.html?modalidad=VIRTUAL o ?q=spring)
	const params = new URLSearchParams(window.location.search);
	const urlMod = (params.get('modalidad') || '').toUpperCase();
	if (['VIRTUAL', 'PRESENCIAL', 'TODOS'].includes(urlMod)) {
		currentModalidadHome = urlMod;
	}
	const urlQ = params.get('q') || '';
	if (urlQ) {
		searchKeywordHome = urlQ.toLowerCase().trim();
		const sInput = document.getElementById('buscador-cursos');
		if (sInput) sInput.value = urlQ;
	}

	await cargarCursosPagadosAlumnoHome();

	try {
		const remote = await CursosService.getCursos('TODOS');
		if (remote && remote.length > 0) {
			allCursos = remote;
		}
	} catch (e) {
		console.warn('Usando cursos iniciales precargados:', e);
	}

	applyFilterHome();
	actualizarEstadoNavbar();
}

async function cargarCursosPagadosAlumnoHome() {
	paidCourseIdsHome.clear();
	const user = AuthService.getCurrentUser();
	if (!user) return;

	try {
		const misMatriculas = await PedidosService.getMisMatriculas(user.id);
		(misMatriculas || []).forEach(m => {
			if (m.estado === 'PAGADO') {
				const cid = (m.curso && m.curso.id) ? m.curso.id : (m.cursoId || m.id);
				if (cid) paidCourseIdsHome.add(cid);
			}
		});
	} catch (_) {
		/* silencioso */
	}
}

function actualizarEstadoNavbar() {
	CartService.updateBadge();
	AuthService.updateNavbar();
}

function buscarCursos(keyword) {
	searchKeywordHome = (keyword || '').toLowerCase().trim();
	applyFilterHome();
}

function filtrarCursos(mod, btn) {
	currentModalidadHome = mod;
	document.querySelectorAll('#cursos-section .filter-mod-btn, #cursos-section button').forEach(b => {
		const onclickAttr = b.getAttribute('onclick') || '';
		if (onclickAttr.includes(`'${mod}'`)) {
			b.className = 'btn_one me-2 mb-2 filter-mod-btn';
		} else if (onclickAttr.includes('filtrarCursos')) {
			b.className = 'btn_two me-2 mb-2 filter-mod-btn';
		}
	});
	if (btn) btn.className = 'btn_one me-2 mb-2 filter-mod-btn';
	applyFilterHome();
}

function applyFilterHome() {
	let filtered = CursosService.filterByModalidad(allCursos, currentModalidadHome);
	if (searchKeywordHome) {
		filtered = filtered.filter(c =>
			(c.titulo && c.titulo.toLowerCase().includes(searchKeywordHome)) ||
			(c.descripcion && c.descripcion.toLowerCase().includes(searchKeywordHome)) ||
			(c.docente && c.docente.toLowerCase().includes(searchKeywordHome))
		);
	}
	renderCursos(filtered);
}

function renderCursos(list) {
	const container = document.getElementById('cursos-container');
	if (!container) return;

	if (!list || list.length === 0) {
		container.innerHTML = `
			<div class="col-12 text-center py-5">
				<div style="max-width: 460px; margin: 0 auto; background: #ffffff; padding: 36px 24px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); border: 1px solid #eef2f6;">
					<i class="fa fa-search text-muted mb-3" style="font-size: 38px; display: block;"></i>
					<h4 style="font-size: 18px; font-weight: 700; color: #1a2d62; margin-bottom: 8px;">No se encontraron cursos</h4>
					<p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">Intenta con otro término de búsqueda o selecciona "Todos los Cursos".</p>
					<button onclick="buscarCursos(''); document.getElementById('buscador-cursos').value=''; filtrarCursos('TODOS', null);" class="btn_one" style="padding: 6px 18px; font-size: 13px;">Ver todos los cursos</button>
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

		const isPaid = paidCourseIdsHome.has(c.id);
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

	if (paidCourseIdsHome.has(cursoId)) {
		Notifications.showToast('Ya estás matriculado en este curso. Te llevamos a tus clases...', 'info');
		setTimeout(() => {
			window.location.href = 'mis-cursos.html';
		}, 400);
		return;
	}

	const res = CartService.addToCart(c);
	actualizarEstadoNavbar();
	applyFilterHome();

	Notifications.showToast(res.message || '¡Curso agregado a tu carrito!', 'success');
	setTimeout(() => {
		window.location.href = 'carrito.html';
	}, 350);
}

// Reactividad ante cambios del carrito
window.addEventListener('cartUpdated', () => {
	applyFilterHome();
});

// Inicialización
$(document).ready(initHome);
