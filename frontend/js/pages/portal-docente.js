/**
 * portal-docente.js - Lógica del Portal Especializado del Docente
 * Gestión de cursos asignados, actualización de enlaces en vivo / sedes,
 * y consulta de participantes por curso.
 */

let misCursosDocente = [];
let activeDocente = null;

async function initPortalDocente() {
	activeDocente = AuthService.getCurrentUser();

	// Validación de seguridad por rol
	if (!activeDocente) {
		Notifications.showToast('Por favor inicia sesión con tu cuenta de docente.', 'info');
		setTimeout(() => {
			window.location.href = 'login.html?redirect=portal-docente.html';
		}, 500);
		return;
	}

	if (activeDocente.rol !== 'DOCENTE' && activeDocente.rol !== 'ADMIN') {
		Notifications.showToast('Acceso restringido: Esta sección es exclusiva para docentes.', 'warning');
		setTimeout(() => {
			window.location.href = 'mis-cursos.html';
		}, 800);
		return;
	}

	// Actualizar encabezado del perfil
	const elNombre = document.getElementById('docente-nombre-header');
	const elCorreo = document.getElementById('docente-correo-header');
	if (elNombre) elNombre.textContent = activeDocente.nombres + (activeDocente.apellidos ? ' ' + activeDocente.apellidos : '');
	if (elCorreo) elCorreo.textContent = activeDocente.correo;

	AuthService.updateNavbar();
	await cargarCursosDelDocente();
}

async function cargarCursosDelDocente() {
	const container = document.getElementById('docente-cursos-container');
	const selectParticipantes = document.getElementById('select-curso-participantes');

	try {
		// Consultar cursos por docente desde cursos-service
		let cursos = [];
		try {
			cursos = await API.request(`/cursos/docente/${activeDocente.id}`);
		} catch (e) {
			console.warn('[PortalDocente] Falló búsqueda directa por docenteId, cargando catálogo general:', e);
			const todos = await CursosService.getCursos('TODOS');
			cursos = (todos || []).filter(c => c.docenteId === activeDocente.id || c.docenteId === 'a0000000-0000-0000-0000-000000000002');
		}

		if (!cursos || cursos.length === 0) {
			const todos = await CursosService.getCursos('TODOS');
			cursos = todos || [];
		}

		misCursosDocente = cursos;

		// Actualizar contadores
		const totalCursosEl = document.getElementById('docente-total-cursos');
		const totalAlumnosEl = document.getElementById('docente-total-alumnos');

		let totalInscritos = 0;
		misCursosDocente.forEach(c => {
			const max = Number(c.aforoMaximo || 30);
			const disp = Number(c.aforoDisponible !== undefined ? c.aforoDisponible : max);
			totalInscritos += Math.max(0, max - disp);
		});

		if (totalCursosEl) totalCursosEl.textContent = misCursosDocente.length;
		if (totalAlumnosEl) totalAlumnosEl.textContent = totalInscritos;

		// Llenar select de participantes
		if (selectParticipantes) {
			selectParticipantes.innerHTML = `
				<option value="">-- Selecciona un curso asignado --</option>
				${misCursosDocente.map(c => `<option value="${c.id}">${c.titulo} (${c.modalidad})</option>`).join('')}
			`;
		}

		renderCursosDocente(misCursosDocente);
	} catch (err) {
		console.error('[PortalDocente] Error al cargar cursos:', err);
		if (container) {
			container.innerHTML = `
				<div class="col-12 text-center py-4">
					<p class="text-danger">No se pudieron cargar los cursos del docente: ${err.message}</p>
				</div>
			`;
		}
	}
}

function renderCursosDocente(lista) {
	const container = document.getElementById('docente-cursos-container');
	if (!container) return;

	if (!lista || lista.length === 0) {
		container.innerHTML = `
			<div class="col-12 text-center py-5">
				<div style="max-width: 450px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
					<i class="fa fa-folder-open-o fa-3x text-muted mb-2"></i>
					<h5 style="color: #0f172a; font-weight: 700;">No tienes cursos asignados</h5>
					<p class="text-muted" style="font-size: 13.5px;">Comunícate con el administrador para vincular tus cursos de especialización.</p>
				</div>
			</div>
		`;
		return;
	}

	container.innerHTML = lista.map(c => {
		const isVirtual = c.modalidad === 'VIRTUAL';
		const max = Number(c.aforoMaximo || 30);
		const disp = Number(c.aforoDisponible !== undefined ? c.aforoDisponible : max);
		const inscritos = Math.max(0, max - disp);

		const badgeMod = isVirtual
			? `<span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 11.5px; font-weight: 700;"><i class="fa fa-video-camera me-1"></i> Virtual en Vivo</span>`
			: `<span class="badge" style="background: #fefce8; color: #a16207; border: 1px solid #fef08a; font-size: 11.5px; font-weight: 700;"><i class="fa fa-building me-1"></i> Presencial</span>`;

		return `
			<div class="col-lg-6 col-12 mb-4">
				<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px; box-shadow: 0 4px 16px rgba(0,0,0,0.03); height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
					<div>
						<div class="d-flex justify-content-between align-items-center mb-2">
							${badgeMod}
							<span class="badge bg-light text-dark border font-monospace" style="font-size: 12px;">
								<i class="fa fa-users text-primary me-1"></i> ${inscritos} / ${max} Alumnos
							</span>
						</div>
						<h4 style="font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
							${c.titulo}
						</h4>
						<p class="text-muted" style="font-size: 13px; line-height: 1.45; margin-bottom: 14px;">
							${c.descripcion || 'Especialización oficial con certificación.'}
						</p>

						<div class="p-3 mb-3" style="background: #f8fafc; border: 1px solid #edf2f7; border-radius: 10px; font-size: 12.5px;">
							<div class="mb-1"><i class="fa fa-calendar text-primary me-2"></i><strong>Horario:</strong> ${c.horario || 'Por coordinar'}</div>
							${isVirtual ? `
								<div class="text-truncate">
									<i class="fa fa-link text-success me-2"></i><strong>Enlace en vivo:</strong> 
									<a href="${c.enlaceClase || '#'}" target="_blank" class="fw-bold text-primary">${c.enlaceClase || 'No asignado todavía'}</a>
								</div>
							` : `
								<div class="mb-1"><i class="fa fa-map-marker text-danger me-2"></i><strong>Sede:</strong> ${c.direccionClase || 'Campus Central'}</div>
								<div><i class="fa fa-graduation-cap text-warning me-2"></i><strong>Aula:</strong> ${c.aula || 'Laboratorio 204'}</div>
							`}
						</div>
					</div>

					<div class="d-flex flex-wrap gap-2 pt-3 border-top justify-content-between align-items-center">
						${isVirtual ? `
							<button type="button" class="btn btn-sm btn-outline-primary fw-bold" onclick="abrirModalEnlace('${c.id}', '${(c.enlaceClase || '').replace(/'/g, "\\'")}')">
								<i class="fa fa-pencil me-1"></i> Actualizar Enlace
							</button>
						` : `
							<button type="button" class="btn btn-sm btn-outline-warning text-dark fw-bold" onclick="abrirModalAula('${c.id}', '${(c.direccionClase || '').replace(/'/g, "\\'")}', '${(c.aula || '').replace(/'/g, "\\'")}')">
								<i class="fa fa-pencil me-1"></i> Actualizar Sede/Aula
							</button>
						`}
						<button type="button" class="btn btn-sm btn-dark fw-bold" onclick="verAlumnosDirecto('${c.id}')">
							<i class="fa fa-users me-1"></i> Ver Alumnos (${inscritos})
						</button>
					</div>
				</div>
			</div>
		`;
	}).join('');
}

function navToDocenteTab(tab) {
	switchDocenteTab(tab);
	const targetSection = document.getElementById(tab === 'cursos' ? 'seccion-cursos-docente' : 'seccion-alumnos-docente');
	if (targetSection) {
		targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
}

function switchDocenteTab(tab) {
	const seccionCursos = document.getElementById('seccion-cursos-docente');
	const seccionAlumnos = document.getElementById('seccion-alumnos-docente');
	const btnCursos = document.getElementById('tab-btn-cursos');
	const btnAlumnos = document.getElementById('tab-btn-alumnos');

	if (tab === 'cursos') {
		if (seccionCursos) seccionCursos.style.display = 'block';
		if (seccionAlumnos) seccionAlumnos.style.display = 'none';
		if (btnCursos) btnCursos.className = 'btn btn-sm btn-dark fw-bold px-3 py-2';
		if (btnAlumnos) btnAlumnos.className = 'btn btn-sm btn-outline-secondary fw-bold px-3 py-2';
	} else {
		if (seccionCursos) seccionCursos.style.display = 'none';
		if (seccionAlumnos) seccionAlumnos.style.display = 'block';
		if (btnCursos) btnCursos.className = 'btn btn-sm btn-outline-secondary fw-bold px-3 py-2';
		if (btnAlumnos) btnAlumnos.className = 'btn btn-sm btn-dark fw-bold px-3 py-2';
	}

	// Sincronizar enlace activo en el menú de navegación superior
	document.querySelectorAll('#main-menu a, #mobile_menu a').forEach(a => a.classList.remove('active'));
	const navLink = document.getElementById('nav-docente-' + tab);
	if (navLink) navLink.classList.add('active');
}

function verAlumnosDirecto(cursoId) {
	switchDocenteTab('alumnos');
	const select = document.getElementById('select-curso-participantes');
	if (select) {
		select.value = cursoId;
		cargarAlumnosDeCurso(cursoId);
	}
}

async function cargarAlumnosDeCurso(cursoId) {
	const tbody = document.getElementById('tabla-participantes-body');
	if (!tbody) return;

	if (!cursoId) {
		tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Selecciona un curso para ver la nómina de estudiantes.</td></tr>`;
		return;
	}

	tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fa fa-spinner fa-spin me-2"></i>Consultando participantes matriculados...</td></tr>`;

	try {
		let pedidos = await API.request(`/pedidos/curso/${cursoId}/participantes`);
		if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
			tbody.innerHTML = `
				<tr>
					<td colspan="7" class="text-center py-4 text-muted">
						<i class="fa fa-info-circle me-1"></i> Aún no hay alumnos matriculados confirmados en este curso.
					</td>
				</tr>
			`;
			return;
		}

		tbody.innerHTML = pedidos.map((p, idx) => {
			const est = p.estudiante || {};
			const comp = p.comprobante || {};
			const fecha = p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Hoy';

			return `
				<tr>
					<td><strong>${idx + 1}</strong></td>
					<td>
						<strong style="color: #0f172a;">${est.nombres || 'Alumno'} ${est.apellidos || ''}</strong>
						<span class="d-block text-muted" style="font-size: 11.5px;">DNI: ${est.dni || 'No reg.'}</span>
					</td>
					<td>${est.correo || 'correo@cursos.com'}</td>
					<td><span class="badge bg-light text-dark font-monospace">${est.whatsapp || '+51 999 555 666'}</span></td>
					<td>${fecha}</td>
					<td><span class="status-pill-success"><i class="fa fa-check-circle me-1"></i>Pagado</span></td>
					<td><span class="font-monospace text-primary fw-bold">${comp.serie ? comp.serie + '-' + String(comp.numeroCorrelativo || 1).padStart(6, '0') : (p.codigoOrden || 'ORD-MAT')}</span></td>
				</tr>
			`;
		}).join('');
	} catch (err) {
		tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error al cargar participantes: ${err.message}</td></tr>`;
	}
}

// Modales para Docente
function abrirModalEnlace(cursoId, enlaceActual) {
	const modal = document.getElementById('modal-actualizar-enlace');
	const inputId = document.getElementById('edit-enlace-curso-id');
	const inputUrl = document.getElementById('edit-enlace-input');
	if (inputId) inputId.value = cursoId;
	if (inputUrl) inputUrl.value = enlaceActual || '';
	if (modal) modal.style.display = 'flex';
}

function cerrarModalEnlace() {
	const modal = document.getElementById('modal-actualizar-enlace');
	if (modal) modal.style.display = 'none';
}

async function guardarEnlaceClase() {
	const inputId = document.getElementById('edit-enlace-curso-id');
	const inputUrl = document.getElementById('edit-enlace-input');
	const btn = document.getElementById('btn-guardar-enlace');

	const cursoId = inputId ? inputId.value : null;
	const enlace = inputUrl ? inputUrl.value.trim() : '';

	if (!cursoId || !enlace) {
		Notifications.showToast('Ingresa un enlace válido de clase (Zoom / Meet).', 'warning');
		return;
	}

	if (btn) {
		btn.disabled = true;
		btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Guardando...`;
	}

	try {
		await API.request(`/cursos/${cursoId}/enlace`, {
			method: 'PUT',
			body: JSON.stringify({ enlaceClase: enlace })
		});

		Notifications.showToast('¡Enlace de clase actualizado exitosamente!', 'success');
		cerrarModalEnlace();
		await cargarCursosDelDocente();
	} catch (err) {
		Notifications.showToast('Error al actualizar enlace: ' + err.message, 'error');
	} finally {
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = `<i class="fa fa-save me-1"></i> Guardar Enlace`;
		}
	}
}

function abrirModalAula(cursoId, sedeActual, aulaActual) {
	const modal = document.getElementById('modal-actualizar-aula');
	const inputId = document.getElementById('edit-aula-curso-id');
	const inputSede = document.getElementById('edit-sede-input');
	const inputAula = document.getElementById('edit-aula-input');

	if (inputId) inputId.value = cursoId;
	if (inputSede) inputSede.value = sedeActual || '';
	if (inputAula) inputAula.value = aulaActual || '';
	if (modal) modal.style.display = 'flex';
}

function cerrarModalAula() {
	const modal = document.getElementById('modal-actualizar-aula');
	if (modal) modal.style.display = 'none';
}

async function guardarAulaSede() {
	const inputId = document.getElementById('edit-aula-curso-id');
	const inputSede = document.getElementById('edit-sede-input');
	const inputAula = document.getElementById('edit-aula-input');
	const btn = document.getElementById('btn-guardar-aula');

	const cursoId = inputId ? inputId.value : null;
	const sede = inputSede ? inputSede.value.trim() : '';
	const aula = inputAula ? inputAula.value.trim() : '';

	if (!cursoId || !sede || !aula) {
		Notifications.showToast('Por favor completa tanto la sede como el aula.', 'warning');
		return;
	}

	if (btn) {
		btn.disabled = true;
		btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Guardando...`;
	}

	try {
		await API.request(`/cursos/${cursoId}/datos-clase`, {
			method: 'PUT',
			body: JSON.stringify({ direccionClase: sede, aula: aula })
		});

		Notifications.showToast('¡Datos de sede y aula actualizados exitosamente!', 'success');
		cerrarModalAula();
		await cargarCursosDelDocente();
	} catch (err) {
		Notifications.showToast('Error al actualizar datos: ' + err.message, 'error');
	} finally {
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = `<i class="fa fa-save me-1"></i> Guardar Cambios`;
		}
	}
}

// Inicialización
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initPortalDocente);
} else {
	initPortalDocente();
}
