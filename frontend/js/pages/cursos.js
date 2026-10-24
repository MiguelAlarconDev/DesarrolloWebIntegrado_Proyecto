/**
 * cursos.js - Lógica del Catálogo Completo de Cursos
 * Manejo de búsquedas en tiempo real, filtros combinados por modalidad,
 * rango de precios, disponibilidad de vacantes y ordenamiento multicriterio.
 */

let allCursos = (typeof CONFIG !== 'undefined' && CONFIG.INITIAL_COURSES) ? [...CONFIG.INITIAL_COURSES] : [];
let currentModalidad = 'TODOS';
let searchKeyword = '';
let currentRangoPrecio = 'TODOS';
let currentOrden = 'DESTACADOS';
let onlyVacantes = false;
let paidCourseIds = new Set();

async function initCursosPage() {
	actualizarEstadoNavbar();

	// 1. Leer parámetros de URL (ej. ?modalidad=VIRTUAL o ?q=spring)
	const params = new URLSearchParams(window.location.search);
	const urlMod = (params.get('modalidad') || '').toUpperCase();
	if (['VIRTUAL', 'PRESENCIAL', 'TODOS'].includes(urlMod)) {
		currentModalidad = urlMod;
	}

	const urlQ = params.get('q') || '';
	if (urlQ) {
		searchKeyword = urlQ.toLowerCase().trim();
		const searchInput = document.getElementById('buscador-cursos');
		if (searchInput) searchInput.value = urlQ;
	}

	actualizarBotonesModalidad();

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
	if (typeof AuthService !== 'undefined' && AuthService.updateNavbar) {
		AuthService.updateNavbar();
	}
}

function actualizarBotonesModalidad() {
	document.querySelectorAll('.filter-mod-btn').forEach(b => {
		const onclickAttr = b.getAttribute('onclick') || '';
		if (onclickAttr.includes(`'${currentModalidad}'`)) {
			b.classList.add('active');
		} else {
			b.classList.remove('active');
		}
	});
}

function filtrarCursos(mod, btn) {
	currentModalidad = mod;
	document.querySelectorAll('.filter-mod-btn').forEach(b => b.classList.remove('active'));
	if (btn) {
		btn.classList.add('active');
	} else {
		actualizarBotonesModalidad();
	}
	applyFilter();
}

function buscarCursos(keyword) {
	searchKeyword = (keyword || '').toLowerCase().trim();
	applyFilter();
}

function cambiarFiltroPrecio(valor) {
	currentRangoPrecio = valor;
	applyFilter();
}

function cambiarOrdenCursos(valor) {
	currentOrden = valor;
	applyFilter();
}

function toggleSoloVacantes(checked) {
	onlyVacantes = !!checked;
	applyFilter();
}

function limpiarFiltros() {
	currentModalidad = 'TODOS';
	searchKeyword = '';
	currentRangoPrecio = 'TODOS';
	currentOrden = 'DESTACADOS';
	onlyVacantes = false;

	const buscador = document.getElementById('buscador-cursos');
	if (buscador) buscador.value = '';

	const selectPrecio = document.getElementById('filtro-precio');
	if (selectPrecio) selectPrecio.value = 'TODOS';

	const selectOrden = document.getElementById('filtro-orden');
	if (selectOrden) selectOrden.value = 'DESTACADOS';

	const chkVacantes = document.getElementById('filtro-vacantes');
	if (chkVacantes) chkVacantes.checked = false;

	actualizarBotonesModalidad();
	applyFilter();
	Notifications.showToast('Filtros restablecidos.', 'info');
}

function actualizarContadorFiltros(visibles, total) {
	const contadorEl = document.getElementById('filtro-contador-text');
	const limpiarBox = document.getElementById('filtro-limpiar-box');

	if (contadorEl) {
		contadorEl.innerHTML = `Mostrando <strong style="color: #0f172a;">${visibles}</strong> de <strong style="color: #0f172a;">${total}</strong> cursos disponibles`;
	}

	const hayFiltrosActivos = currentModalidad !== 'TODOS' ||
		searchKeyword !== '' ||
		currentRangoPrecio !== 'TODOS' ||
		currentOrden !== 'DESTACADOS' ||
		onlyVacantes;

	if (limpiarBox) {
		limpiarBox.style.display = hayFiltrosActivos ? 'block' : 'none';
	}
}

function applyFilter() {
	let filtered = CursosService.filterByModalidad(allCursos, currentModalidad);

	// 1. Buscador por texto (título, descripción, docente)
	if (searchKeyword) {
		filtered = filtered.filter(c =>
			(c.titulo && c.titulo.toLowerCase().includes(searchKeyword)) ||
			(c.descripcion && c.descripcion.toLowerCase().includes(searchKeyword)) ||
			(c.docente && c.docente.toLowerCase().includes(searchKeyword))
		);
	}

	// 2. Filtro por Rango de Precio
	if (currentRangoPrecio === 'HASTA_150') {
		filtered = filtered.filter(c => Number(c.precio || 0) <= 150);
	} else if (currentRangoPrecio === '151_200') {
		filtered = filtered.filter(c => {
			const p = Number(c.precio || 0);
			return p > 150 && p <= 200;
		});
	} else if (currentRangoPrecio === 'MAS_200') {
		filtered = filtered.filter(c => Number(c.precio || 0) > 200);
	}

	// 3. Filtro por Solo Vacantes Disponibles
	if (onlyVacantes) {
		filtered = filtered.filter(c => {
			const disp = c.aforoDisponible !== undefined ? c.aforoDisponible : (c.aforoMaximo || 30);
			return Number(disp) > 0;
		});
	}

	// 4. Ordenamiento
	if (currentOrden === 'PRECIO_ASC') {
		filtered.sort((a, b) => Number(a.precio || 0) - Number(b.precio || 0));
	} else if (currentOrden === 'PRECIO_DESC') {
		filtered.sort((a, b) => Number(b.precio || 0) - Number(a.precio || 0));
	} else if (currentOrden === 'TITULO_ASC') {
		filtered.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
	} else if (currentOrden === 'VACANTES_DESC') {
		filtered.sort((a, b) => {
			const aDisp = a.aforoDisponible !== undefined ? a.aforoDisponible : 30;
			const bDisp = b.aforoDisponible !== undefined ? b.aforoDisponible : 30;
			return Number(bDisp) - Number(aDisp);
		});
	}

	actualizarContadorFiltros(filtered.length, allCursos.length);
	renderCursos(filtered);
}

function renderCursos(list) {
	const container = document.getElementById('cursos-container');
	if (!container) return;

	if (!list || list.length === 0) {
		container.innerHTML = `
			<div class="col-12 text-center py-5">
				<div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 45px 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);">
					<div style="width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 16px;">
						<i class="fa fa-search"></i>
					</div>
					<h4 style="color: #0f172a; font-weight: 800; margin-bottom: 8px;">No se encontraron cursos</h4>
					<p class="text-muted" style="font-size: 14px; margin-bottom: 20px;">
						No hay cursos que coincidan con los criterios seleccionados. Prueba modificando los filtros o el término de búsqueda.
					</p>
					<button type="button" onclick="limpiarFiltros()" class="btn_one" style="font-size: 13.5px; padding: 10px 22px; border-radius: 8px;">
						<i class="fa fa-refresh me-1"></i> Restablecer todos los filtros
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

		const imgUrl = c.imagen || `assets/images/all-img/c${(i % 3) + 1}.png`;
		const docenteNombre = c.docente || (isVirtual ? 'Ing. Roberto Docente' : 'Ing. Carlos Mendoza');

		const isPaid = paidCourseIds.has(c.id);

		let actionBtnHtml = '';
		if (isPaid) {
			actionBtnHtml = `
				<a href="mis-cursos.html" class="btn_one btn-card-enrolled" style="text-decoration: none; padding: 7px 14px; font-size: 12.5px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
					<i class="fa fa-graduation-cap"></i> Ir a Mi Clase
				</a>
			`;
		} else if (libres > 0) {
			actionBtnHtml = `
				<button onclick="reservar('${c.id}')" class="btn_two btn-card-inscribir" style="cursor: pointer;">
					<i class="fa fa-shopping-cart"></i> Inscribirme
				</button>
			`;
		} else {
			actionBtnHtml = `<button type="button" class="btn_two btn-card-agotado" disabled style="opacity: 0.65; cursor: not-allowed; background: #f1f5f9; color: #94a3b8; border: 1.5px solid #e2e8f0; font-size: 12.5px; font-weight: 700; border-radius: 6px; padding: 8px 14px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa fa-lock"></i> Agotado</button>`;
		}

		const enrolledTag = isPaid
			? `<div class="badge-enrolled-corner"><i class="fa fa-check-circle me-1"></i>Ya Matriculado</div>`
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

	const res = CartService.addToCart(c);
	actualizarEstadoNavbar();
	CartService.bumpBadge();
	applyFilter();

	Notifications.showToast(res.message || '¡Curso agregado a tu carrito!', 'success');
	setTimeout(() => {
		window.location.href = 'carrito.html';
	}, 500);
}

// Exportar globalmente a window
window.reservar = reservar;
window.filtrarCursos = filtrarCursos;
window.buscarCursos = buscarCursos;
window.cambiarFiltroPrecio = cambiarFiltroPrecio;
window.cambiarOrdenCursos = cambiarOrdenCursos;
window.toggleSoloVacantes = toggleSoloVacantes;
window.limpiarFiltros = limpiarFiltros;

// Inicialización garantizada (inmediata o en evento)
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initCursosPage);
} else {
	initCursosPage();
}
window.addEventListener('pageshow', initCursosPage);
window.addEventListener('cartUpdated', () => {
	actualizarEstadoNavbar();
	applyFilter();
});
if (typeof $ !== 'undefined') {
	$(document).ready(initCursosPage);
}
