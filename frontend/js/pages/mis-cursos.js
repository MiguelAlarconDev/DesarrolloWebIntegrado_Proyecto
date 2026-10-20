/**
 * mis-cursos.js - Lógica de Mis Clases y Matrículas
 * Visualización del historial de cursos adquiridos, comprobantes asociados,
 * enlaces directos a salas virtuales (Zoom/Meet) y detalles de sedes presenciales.
 */

function initMisCursos() {
	const container = document.getElementById('mis-cursos-penn-list');
	if (!container) return;

	const matriculas = PedidosService.getMisMatriculas();

	const counterEl = document.getElementById('cart-nav-counter');
	if (counterEl) counterEl.textContent = CartService.getCartCount();
	AuthService.updateNavbar();

	if (matriculas.length === 0) {
		container.innerHTML = `
			<div class="col-12 text-center py-5">
				<i class="ti-book text-muted" style="font-size: 64px;"></i>
				<h3 class="mt-3">Aún no tienes cursos matriculados</h3>
				<p class="text-muted">Explora nuestro catálogo de cursos en vivo y asegura tu vacante inmediatamente.</p>
				<a href="cursos.html" class="btn_one mt-2">Ver Catálogo</a>
			</div>
		`;
		return;
	}

	container.innerHTML = matriculas.map((item) => {
		const curso = item.curso || {};
		const isVirtual = curso.modalidad === 'VIRTUAL';
		const comp = item.comprobante || {};

		let accessAction = '';
		if (isVirtual) {
			accessAction = `
				<div class="p-3 bg-light rounded mt-3 border">
					<strong class="d-block text-primary mb-1"><i class="fa fa-video-camera"></i> Sala Virtual en Vivo (Zoom / Meet)</strong>
					<a href="${curso.enlaceClase || '#'}" target="_blank" class="btn_one d-inline-block mt-2" style="font-size: 12px; padding: 8px 18px;">
						<i class="fa fa-external-link"></i> Ingresar a la Clase
					</a>
				</div>
			`;
		} else {
			accessAction = `
				<div class="p-3 bg-light rounded mt-3 border">
					<strong class="d-block text-success mb-1"><i class="fa fa-building"></i> Clase Presencial con Asiento Asignado</strong>
					<small class="d-block text-muted"><strong>Sede:</strong> ${curso.direccionClase || 'Sede Central'}</small>
					<small class="d-block text-muted"><strong>Aula:</strong> <span class="badge bg-dark">${curso.aula || 'Laboratorio 204'}</span></small>
				</div>
			`;
		}

		return `
			<div class="col-lg-4 col-sm-6 col-xs-12">
				<div class="course-slide" style="margin-bottom: 30px;">
					<div class="course-img">
						<img src="${curso.imagen || 'assets/images/all-img/c1.png'}" alt="${curso.titulo || 'Curso'}">
						<div class="course-date">
							<span class="month">Pagado</span>
						</div>
					</div>
					<div class="course-content">
						<div class="mb-2">
							<span class="${isVirtual ? 'badge-mod-virtual' : 'badge-mod-presencial'}">
								${curso.modalidad || 'VIRTUAL'}
							</span>
						</div>
						<h3><a href="curso-detalle.html?id=${curso.id}">${curso.titulo || 'Curso'}</a></h3>
						<span><i class="fa fa-calendar"></i> ${curso.horario || 'Horario por coordinar'}</span>
						<span><i class="fa fa-file-text-o"></i> ${comp.correlativo || 'B001-00000000'}</span>
						
						${accessAction}
					</div>
				</div>
			</div>
		`;
	}).join('');
}

// Inicialización
$(document).ready(initMisCursos);
