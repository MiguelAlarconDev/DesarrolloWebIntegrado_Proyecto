/**
 * cursos.js - Lógica del Catálogo Completo de Cursos
 * Manejo de búsquedas en tiempo real, filtros combinados por modalidad y reserva con control de usuario.
 */

let allCursos = (typeof CONFIG !== 'undefined' && CONFIG.INITIAL_COURSES) ? [...CONFIG.INITIAL_COURSES] : [];
let currentModalidad = 'TODOS';
let searchKeyword = '';

async function initCursosPage() {
	actualizarEstadoNavbar();
	try {
		const remote = await CursosService.getCursos('TODOS');
		if (remote && remote.length > 0) {
			allCursos = remote;
			applyFilter();
		}
	} catch (e) {
		console.warn('[initCursosPage] Usando cursos iniciales precargados:', e);
	}
	actualizarEstadoNavbar();
}

function actualizarEstadoNavbar() {
	const counterEl = document.getElementById('cart-nav-counter');
	if (counterEl) counterEl.textContent = CartService.getCartCount();
	AuthService.updateNavbar();
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
	renderPennCourses(filtered);
}

function renderPennCourses(list) {
	const container = document.getElementById('penn-courses-container');
	if (!container) return;

	if (!list || list.length === 0) {
		container.innerHTML = `<div class="col-12 text-center py-5"><h4>No se encontraron cursos con los filtros seleccionados.</h4></div>`;
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

		return `
			<div class="col-lg-4 col-sm-6 col-xs-12" style="margin-bottom: 30px;">
				<div class="course-slide" style="height: 100%; display: flex; flex-direction: column; box-shadow: 0 5px 20px rgba(0,0,0,0.06); border-radius: 8px; overflow: hidden; background: #fff;">
					<div class="course-img" style="position: relative;">
						<a href="curso-detalle.html?id=${c.id}">
							<img src="${imgUrl}" alt="${c.titulo}" style="width: 100%; height: 210px; object-fit: cover;">
						</a>
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
							${libres > 0 ? `<button onclick="reservar('${c.id}')" class="btn_two btn-card-inscribir"><i class="fa fa-shopping-cart"></i> Inscribirme</button>` : `<span class="badge bg-secondary">Sin Vacantes</span>`}
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

	CartService.addToCart(c);
	actualizarEstadoNavbar();

	// Si no tiene usuario cargado, solicitar que inicie sesión para completar su matrícula
	if (!AuthService.isAuthenticated()) {
		Notifications.showToast('Para inscribirte necesitas cargar tu usuario. Redirigiendo...', 'info');
		setTimeout(() => {
			window.location.href = 'login.html?redirect=checkout.html';
		}, 500);
	} else {
		Notifications.showToast('¡Curso reservado! Continuando a la matrícula...', 'success');
		setTimeout(() => {
			window.location.href = 'carrito.html';
		}, 300);
	}
}

// Inicialización
$(document).ready(initCursosPage);
