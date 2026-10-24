/**

 * portal-admin.js - Lógica del Portal Especializado del Administrador

 * Métricas globales, CRUD de cursos, control de pedidos y directorio de usuarios.

 */



let adminCursos = [];

let adminPedidos = [];

let adminUsuarios = [];



async function initPortalAdmin() {

	const user = AuthService.getCurrentUser();



	// Validación de seguridad de rol

	if (!user) {

		Notifications.showToast('Por favor inicia sesión con tu cuenta de Administrador.', 'info');

		setTimeout(() => {

			window.location.href = 'login.html?redirect=portal-admin.html';

		}, 500);

		return;

	}



	if (user.rol !== 'ADMIN') {

		Notifications.showToast('Acceso denegado: Esta área está reservada para Administradores.', 'error');

		setTimeout(() => {

			window.location.href = AuthService.getPortalUrlForRole(user.rol);

		}, 800);

		return;

	}



	AuthService.updateNavbar();

	// Inicializar pestaña por hash de URL o parámetro de consulta
	const hashTab = (window.location.hash || '').replace('#', '').toLowerCase();
	const urlParams = new URLSearchParams(window.location.search);
	const queryTab = (urlParams.get('tab') || '').toLowerCase();
	const initialTab = (hashTab === 'resumen' || hashTab === 'pedidos' || hashTab === 'usuarios') ? hashTab : 'cursos';

	// Abrir modal si se solicita crear curso desde navbar
	if (queryTab === 'new' || hashTab === 'nuevo' || urlParams.get('action') === 'new') {
		setTimeout(() => abrirModalCrearCurso(), 300);
	}
	switchAdminTab(initialTab, false);

	// Navegación con historial del navegador
	if (typeof window !== 'undefined' && !window.__adminHashBound) {
		window.__adminHashBound = true;
		window.addEventListener('hashchange', () => {
			const curHash = (window.location.hash || '').replace('#', '').toLowerCase();
			if (curHash) switchAdminTab(curHash, false);
		});
	}



	// Cargar todos los módulos en paralelo

	await Promise.allSettled([

		cargarMetricasYCursos(),

		cargarPedidosAdmin(),

		cargarUsuariosAdmin()

	]);

}



async function cargarMetricasYCursos() {

	const tbody = document.getElementById('tabla-admin-cursos-body');

	const metricCursos = document.getElementById('admin-metric-cursos');



	try {

		let cursos = [];

		try {

			cursos = await API.request('/cursos/todos');

		} catch (_) {

			cursos = await CursosService.getCursos('TODOS');

		}



		adminCursos = cursos || [];

		if (metricCursos) metricCursos.textContent = adminCursos.length;
		const bCursos = document.getElementById('tab-badge-cursos'); if (bCursos) bCursos.textContent = adminCursos.length;



		renderTablaCursosAdmin(adminCursos);

	} catch (err) {

		console.error('Error al cargar cursos:', err);

		if (tbody) {

			tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error: ${err.message}</td></tr>`;

		}

	}

}



function renderTablaCursosAdmin(lista) {

	const tbody = document.getElementById('tabla-admin-cursos-body');

	if (!tbody) return;



	if (!lista || lista.length === 0) {

		tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No hay cursos registrados.</td></tr>`;

		return;

	}



	tbody.innerHTML = lista.map((c, i) => {

		const isVirtual = c.modalidad === 'VIRTUAL';

		const badgeMod = isVirtual

			? `<span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 11px;"><i class="fa fa-video-camera me-1"></i> Virtual</span>`

			: `<span class="badge" style="background: #fefce8; color: #a16207; border: 1px solid #fef08a; font-size: 11px;"><i class="fa fa-building me-1"></i> Presencial</span>`;



		const max = Number(c.aforoMaximo || 30);

		const disp = Number(c.aforoDisponible !== undefined ? c.aforoDisponible : max);

		const ocupados = Math.max(0, max - disp);



		const isPublicado = (c.estado || 'PUBLICADO') === 'PUBLICADO';

		const badgeEstado = isPublicado

			? `<span class="badge bg-success" style="font-size: 11px;"><i class="fa fa-check-circle me-1"></i>PUBLICADO</span>`

			: `<span class="badge bg-secondary" style="font-size: 11px;"><i class="fa fa-lock me-1"></i>CERRADO</span>`;



		const btnToggleEstado = isPublicado

			? `<button type="button" class="btn btn-sm btn-outline-danger py-1 px-2" style="font-size: 11.5px; font-weight: 700;" onclick="cambiarEstadoCurso('${c.id}', 'CERRADO')"><i class="fa fa-ban me-1"></i>Cerrar</button>`

			: `<button type="button" class="btn btn-sm btn-outline-success py-1 px-2" style="font-size: 11.5px; font-weight: 700;" onclick="cambiarEstadoCurso('${c.id}', 'PUBLICADO')"><i class="fa fa-check me-1"></i>Publicar</button>`;



		return `

			<tr>

				<td>

					<strong style="color: #0f172a; font-size: 14px;">${c.titulo}</strong>

					<span class="d-block text-muted" style="font-size: 12px;"><i class="fa fa-calendar me-1"></i>${c.horario || 'Horario regular'}</span>

				</td>

				<td>${badgeMod}</td>

				<td><strong>S/ ${Number(c.precio || 0).toFixed(2)}</strong></td>

				<td>

					<span class="badge bg-light text-dark border font-monospace">

						${ocupados} / ${max} vacantes

					</span>

				</td>

				<td>${badgeEstado}</td>

				<td class="text-end">

					<div class="d-inline-flex gap-1">

						${btnToggleEstado}

						<a href="curso-detalle.html?id=${c.id}" target="_blank" class="btn btn-sm btn-outline-secondary py-1 px-2" style="font-size: 11.5px;" title="Ver ficha pública">

							<i class="fa fa-external-link"></i>

						</a>

					</div>

				</td>

			</tr>

		`;

	}).join('');

}



async function cambiarEstadoCurso(cursoId, nuevoEstado) {

	try {

		await API.request(`/cursos/${cursoId}/estado?estado=${nuevoEstado}`, {

			method: 'PUT'

		});

		Notifications.showToast(`Estado del curso actualizado a ${nuevoEstado}.`, 'success');

		await cargarMetricasYCursos();

	} catch (err) {

		Notifications.showToast('Error al cambiar estado: ' + err.message, 'error');

	}

}



async function cargarPedidosAdmin() {

	const tbody = document.getElementById('tabla-admin-pedidos-body');

	const metricMatriculas = document.getElementById('admin-metric-matriculas');

	const metricIngresos = document.getElementById('admin-metric-ingresos');



	try {

		let pedidos = [];

		try {

			pedidos = await API.request('/pedidos');

		} catch (e) {

			console.warn('[PortalAdmin] No se pudo obtener /api/pedidos general:', e);

		}



		adminPedidos = pedidos || [];



		// Calcular recaudación y órdenes pagadas

		let pagadas = 0;

		let totalSoles = 0;



		adminPedidos.forEach(p => {

			if (p.estado === 'PAGADO') {

				pagadas++;

				totalSoles += Number(p.monto || 0);

			}

		});



		if (metricMatriculas) metricMatriculas.textContent = pagadas;
		const bPedidos = document.getElementById('tab-badge-pedidos'); if (bPedidos) bPedidos.textContent = adminPedidos.length;

		if (metricIngresos) metricIngresos.textContent = `S/ ${totalSoles.toFixed(2)}`;



		renderTablaPedidosAdmin(adminPedidos);

	} catch (err) {

		if (tbody) {

			tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error: ${err.message}</td></tr>`;

		}

	}

}



function renderTablaPedidosAdmin(lista) {

	const tbody = document.getElementById('tabla-admin-pedidos-body');

	if (!tbody) return;



	if (!lista || lista.length === 0) {

		tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Aún no hay pedidos registrados.</td></tr>`;

		return;

	}



	tbody.innerHTML = lista.map(p => {

		const est = p.estudiante || {};

		const curso = p.curso || {};

		const comp = p.comprobante || {};

		const fecha = p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';



		const isPagado = p.estado === 'PAGADO';

		const badgeEstado = isPagado

			? `<span class="status-pill-success"><i class="fa fa-check-circle me-1"></i>Pagado</span>`

			: `<span class="badge bg-warning text-dark" style="font-size: 11px;">PENDIENTE</span>`;



		return `

			<tr>

				<td><strong class="font-monospace text-primary">${p.codigoOrden || 'ORD-000'}</strong></td>

				<td>

					<strong>${est.nombres || 'Estudiante'}</strong>

					<span class="d-block text-muted" style="font-size: 11.5px;">DNI: ${est.dni || '-'}</span>

				</td>

				<td>${curso.titulo || 'Curso Especializado'}</td>

				<td><strong>S/ ${Number(p.monto || 0).toFixed(2)}</strong></td>

				<td><span class="badge bg-light text-dark border font-monospace">${comp.serie ? comp.serie + '-' + String(comp.numeroCorrelativo || 1).padStart(6, '0') : '-'}</span></td>

				<td>${badgeEstado}</td>

				<td>${fecha}</td>

			</tr>

		`;

	}).join('');

}



async function cargarUsuariosAdmin() {

	const tbody = document.getElementById('tabla-admin-usuarios-body');

	const metricUsuarios = document.getElementById('admin-metric-usuarios');



	try {

		let usuarios = [];

		try {

			usuarios = await API.request('/auth/usuarios');

		} catch (e) {

			console.warn('[PortalAdmin] No se pudo consultar /api/auth/usuarios:', e);

		}



		adminUsuarios = usuarios || [];

		if (metricUsuarios) metricUsuarios.textContent = adminUsuarios.length;
		const bUsuarios = document.getElementById('tab-badge-usuarios'); if (bUsuarios) bUsuarios.textContent = adminUsuarios.length;



		renderTablaUsuariosAdmin(adminUsuarios);

	} catch (err) {

		if (tbody) {

			tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error: ${err.message}</td></tr>`;

		}

	}

}



function renderTablaUsuariosAdmin(lista) {

	const tbody = document.getElementById('tabla-admin-usuarios-body');

	if (!tbody) return;



	if (!lista || lista.length === 0) {

		tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No se pudieron cargar usuarios.</td></tr>`;

		return;

	}



	tbody.innerHTML = lista.map(u => {

		let badgeRol = '';

		if (u.rol === 'ADMIN') {

			badgeRol = `<span class="badge bg-dark" style="font-size: 11px;"><i class="fa fa-shield me-1"></i>ADMIN</span>`;

		} else if (u.rol === 'DOCENTE') {

			badgeRol = `<span class="badge bg-primary" style="font-size: 11px;"><i class="fa fa-briefcase me-1"></i>DOCENTE</span>`;

		} else {

			badgeRol = `<span class="badge bg-success" style="font-size: 11px;"><i class="fa fa-graduation-cap me-1"></i>ESTUDIANTE</span>`;

		}



		const is2fa = Boolean(u.is2faEnabled);

		const badge2fa = is2fa

			? `<span class="text-success fw-bold" style="font-size: 12px;"><i class="fa fa-check-circle me-1"></i>Activo (OTP)</span>`

			: `<span class="text-muted" style="font-size: 12px;">Desactivado</span>`;



		return `

			<tr>

				<td><span class="font-monospace fw-bold">${u.dni || '-'}</span></td>

				<td><strong>${u.nombres || ''} ${u.apellidos || ''}</strong></td>

				<td>${u.correo || ''}</td>

				<td><span class="badge bg-light text-dark font-monospace">${u.whatsapp || '-'}</span></td>

				<td>${badgeRol}</td>

				<td>${badge2fa}</td>

			</tr>

		`;

	}).join('');

}



function navToAdminTab(tab) {
	switchAdminTab(tab, true);
	const targetSection = document.getElementById(tab === 'cursos' ? 'seccion-admin-cursos' : tab === 'pedidos' ? 'seccion-admin-pedidos' : 'seccion-admin-usuarios');
	if (targetSection) {
		targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
}

function switchAdminTab(tab, updateHash = true) {
	if (tab === 'resumen') {
		const m = document.getElementById('metricas-resumen');
		if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' });
		document.querySelectorAll('#main-menu a, #mobile_menu a').forEach(a => a.classList.remove('active'));
		const navRes = document.getElementById('nav-admin-resumen');
		if (navRes) navRes.classList.add('active');
		if (updateHash && typeof history !== 'undefined') {
			if (history.replaceState) history.replaceState(null, null, '#resumen');
			else window.location.hash = 'resumen';
		}
		return;
	}

	if (!['cursos', 'pedidos', 'usuarios'].includes(tab)) tab = 'cursos';

	const secCursos = document.getElementById('seccion-admin-cursos');
	const secPedidos = document.getElementById('seccion-admin-pedidos');
	const secUsuarios = document.getElementById('seccion-admin-usuarios');

	const btnCursos = document.getElementById('tab-admin-cursos');
	const btnPedidos = document.getElementById('tab-admin-pedidos');
	const btnUsuarios = document.getElementById('tab-admin-usuarios');

	[secCursos, secPedidos, secUsuarios].forEach(el => { if (el) el.style.display = 'none'; });
	[btnCursos, btnPedidos, btnUsuarios].forEach(btn => {
		if (btn) {
			btn.classList.remove('active');
			btn.setAttribute('aria-selected', 'false');
		}
	});

	if (tab === 'cursos') {
		if (secCursos) secCursos.style.display = 'block';
		if (btnCursos) {
			btnCursos.classList.add('active');
			btnCursos.setAttribute('aria-selected', 'true');
		}
	} else if (tab === 'pedidos') {
		if (secPedidos) secPedidos.style.display = 'block';
		if (btnPedidos) {
			btnPedidos.classList.add('active');
			btnPedidos.setAttribute('aria-selected', 'true');
		}
	} else if (tab === 'usuarios') {
		if (secUsuarios) secUsuarios.style.display = 'block';
		if (btnUsuarios) {
			btnUsuarios.classList.add('active');
			btnUsuarios.setAttribute('aria-selected', 'true');
		}
	}

	// Sincronizar enlace activo en navbar superior
	document.querySelectorAll('#main-menu a, #mobile_menu a').forEach(a => a.classList.remove('active'));
	const navLink = document.getElementById('nav-admin-' + tab);
	if (navLink) navLink.classList.add('active');

	if (updateHash && typeof history !== 'undefined') {
		if (history.replaceState) {
			history.replaceState(null, null, '#' + tab);
		} else {
			window.location.hash = tab;
		}
	}
}



// Modal Crear Curso

function abrirModalCrearCurso() {

	const modal = document.getElementById('modal-crear-curso');

	if (modal) modal.style.display = 'flex';

}



function cerrarModalCrearCurso() {

	const modal = document.getElementById('modal-crear-curso');

	if (modal) modal.style.display = 'none';

}



function toggleModalidadFields(val) {

	const boxVirtual = document.getElementById('field-virtual-box');

	const boxSede = document.getElementById('field-presencial-sede');

	const boxAula = document.getElementById('field-presencial-aula');



	if (val === 'VIRTUAL') {

		if (boxVirtual) boxVirtual.classList.remove('d-none');

		if (boxSede) boxSede.classList.add('d-none');

		if (boxAula) boxAula.classList.add('d-none');

	} else {

		if (boxVirtual) boxVirtual.classList.add('d-none');

		if (boxSede) boxSede.classList.remove('d-none');

		if (boxAula) boxAula.classList.remove('d-none');

	}

}



async function guardarNuevoCurso(e) {

	if (e && e.preventDefault) e.preventDefault();

	const btn = document.getElementById('btn-submit-crear-curso');



	const titulo = document.getElementById('nuevo-curso-titulo').value.trim();

	const descripcion = document.getElementById('nuevo-curso-desc').value.trim();

	const modalidad = document.getElementById('nuevo-curso-modalidad').value;

	const precio = parseFloat(document.getElementById('nuevo-curso-precio').value);

	const aforoMaximo = parseInt(document.getElementById('nuevo-curso-aforo').value, 10);

	const horario = document.getElementById('nuevo-curso-horario').value.trim();

	const docenteId = document.getElementById('nuevo-curso-docente').value;

	const enlaceClase = document.getElementById('nuevo-curso-enlace') ? document.getElementById('nuevo-curso-enlace').value.trim() : null;

	const direccionClase = document.getElementById('nuevo-curso-sede') ? document.getElementById('nuevo-curso-sede').value.trim() : null;

	const aula = document.getElementById('nuevo-curso-aula') ? document.getElementById('nuevo-curso-aula').value.trim() : null;



	if (!titulo || !descripcion || !horario || isNaN(precio) || isNaN(aforoMaximo)) {

		Notifications.showToast('Por favor completa todos los campos obligatorios.', 'warning');

		return;

	}



	const now = new Date();

	const fechaInicio = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

	const fechaFin = new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000).toISOString();



	const payload = {

		titulo,

		descripcion,

		modalidad,

		precio,

		aforoMaximo,

		fechaInicio,

		fechaFin,

		horario,

		docenteId,

		enlaceClase: modalidad === 'VIRTUAL' ? enlaceClase : null,

		direccionClase: modalidad === 'PRESENCIAL' ? direccionClase : null,

		aula: modalidad === 'PRESENCIAL' ? aula : null

	};



	if (btn) {

		btn.disabled = true;

		btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Guardando...`;

	}



	try {

		await API.request('/cursos', {

			method: 'POST',

			body: JSON.stringify(payload)

		});



		Notifications.showToast(`¡Curso "${titulo}" creado y publicado exitosamente!`, 'success');

		cerrarModalCrearCurso();

		document.getElementById('form-crear-curso').reset();

		await cargarMetricasYCursos();

	} catch (err) {

		Notifications.showToast('Error al crear curso: ' + err.message, 'error');

	} finally {

		if (btn) {

			btn.disabled = false;

			btn.innerHTML = `<i class="fa fa-check me-1"></i> Publicar Curso`;

		}

	}

}



// Inicialización

if (document.readyState === 'loading') {

	document.addEventListener('DOMContentLoaded', initPortalAdmin);

} else {

	initPortalAdmin();

}

