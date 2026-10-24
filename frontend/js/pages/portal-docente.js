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

	// Inicializar pestaña por hash de URL o parámetro de consulta
	const hashTab = (window.location.hash || '').replace('#', '').toLowerCase();
	const urlParams = new URLSearchParams(window.location.search);
	const queryTab = (urlParams.get('tab') || '').toLowerCase();
	const initialTab = hashTab || queryTab || 'cursos';
	switchDocenteTab(initialTab, false);

	// Navegación con historial del navegador
	if (typeof window !== 'undefined' && !window.__docenteHashBound) {
		window.__docenteHashBound = true;
		window.addEventListener('hashchange', () => {
			const curHash = (window.location.hash || '').replace('#', '').toLowerCase();
			if (curHash) switchDocenteTab(curHash, false);
		});
	}

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
		const bDocCursos = document.getElementById('docente-tab-badge-cursos'); if (bDocCursos) bDocCursos.textContent = misCursosDocente.length;

		if (totalAlumnosEl) totalAlumnosEl.textContent = totalInscritos;
		const bDocAlumnos = document.getElementById('docente-tab-badge-alumnos'); if (bDocAlumnos) bDocAlumnos.textContent = totalInscritos;



		// Llenar select de participantes con opción de nómina completa por defecto
		if (selectParticipantes) {
			selectParticipantes.innerHTML = `
				<option value="TODOS" selected>-- Todos mis cursos asignados --</option>
				${misCursosDocente.map(c => `<option value="${c.id}">${c.titulo} (${c.modalidad})</option>`).join('')}
			`;
		}

		// Si el docente navega directamente a la pestaña alumnos o tiene hash #alumnos, cargar la nómina de inmediato
		const curHashInit = (window.location.hash || '').replace('#', '').toLowerCase();
		if (curHashInit === 'alumnos') {
			cargarAlumnosDeCurso('TODOS');
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
				<div style="background: #ffffff; border: 1px solid #eef2f6; border-top: 3px solid #2eca7f; border-radius: 10px; padding: 22px; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
					<div>
						<div class="d-flex justify-content-between align-items-center mb-2">
							${badgeMod}
							<span class="badge bg-light text-dark border font-monospace" style="font-size: 12px;">
								<i class="fa fa-users text-success me-1"></i> ${inscritos} / ${max} Alumnos
							</span>
						</div>
						<h4 style="font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
							${c.titulo}
						</h4>
						<p class="text-muted" style="font-size: 13px; line-height: 1.45; margin-bottom: 14px;">
							${c.descripcion || 'Especialización oficial con certificación.'}
						</p>

						<div class="mb-3 pt-2 border-top" style="font-size: 12.5px; color: #475569;">
							<div class="mb-1"><i class="fa fa-calendar text-muted me-2"></i><strong>Horario:</strong> ${c.horario || 'Por coordinar'}</div>
							${isVirtual ? `
								<div class="text-truncate">
									<i class="fa fa-link text-success me-2"></i><strong>Enlace en vivo:</strong> 
									<a href="${c.enlaceClase || '#'}" target="_blank" class="fw-bold text-success">${c.enlaceClase || 'No asignado todavía'}</a>
								</div>
							` : `
								<div class="mb-1"><i class="fa fa-map-marker text-danger me-2"></i><strong>Sede:</strong> ${c.direccionClase || 'Campus Central'}</div>
								<div><i class="fa fa-graduation-cap text-warning me-2"></i><strong>Aula:</strong> ${c.aula || 'Laboratorio 204'}</div>
							`}
						</div>
					</div>

					<div class="d-flex flex-wrap gap-2 pt-3 border-top justify-content-between align-items-center">
						${isVirtual ? `
							<button type="button" class="btn btn-sm btn-outline-secondary fw-bold" onclick="abrirModalEnlace('${c.id}', '${(c.enlaceClase || '').replace(/'/g, "\'")}')">
								<i class="fa fa-pencil me-1"></i> Actualizar Enlace
							</button>
						` : `
							<button type="button" class="btn btn-sm btn-outline-secondary fw-bold" onclick="abrirModalAula('${c.id}', '${(c.direccionClase || '').replace(/'/g, "\'")}', '${(c.aula || '').replace(/'/g, "\'")}')">
								<i class="fa fa-pencil me-1"></i> Actualizar Sede/Aula
							</button>
						`}
						<button type="button" class="btn btn-sm btn-success fw-bold" onclick="verAlumnosDirecto('${c.id}')">
							<i class="fa fa-users me-1"></i> Ver Alumnos (${inscritos})
						</button>
					</div>
				</div>
			</div>
		`;
	}).join('');

}



function navToDocenteTab(tab) {
	switchDocenteTab(tab, true);
	const targetSection = document.getElementById(tab === 'cursos' ? 'seccion-cursos-docente' : 'seccion-alumnos-docente');
	if (targetSection) {
		targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
}

window.navToDocenteAulas = function() {
	switchDocenteTab('cursos', true);
	const target = document.getElementById('seccion-cursos-docente');
	if (target) {
		target.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	document.querySelectorAll('#main-menu a, #mobile_menu a').forEach(a => a.classList.remove('active'));
	const navAulas = document.getElementById('nav-docente-aulas');
	if (navAulas) navAulas.classList.add('active');
	if (typeof Notifications !== 'undefined') {
		Notifications.showToast('Configura las salas de Zoom/Meet y aulas físicas en cada tarjeta de curso.', 'info');
	}
};

function switchDocenteTab(tab, updateHash = true) {
	if (tab === 'aulas') {
		tab = 'cursos';
		setTimeout(() => {
			const target = document.getElementById('seccion-cursos-docente');
			if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 100);
	}

	if (!['cursos', 'alumnos'].includes(tab)) tab = 'cursos';

	const seccionCursos = document.getElementById('seccion-cursos-docente');
	const seccionAlumnos = document.getElementById('seccion-alumnos-docente');
	const btnCursos = document.getElementById('tab-btn-cursos');
	const btnAlumnos = document.getElementById('tab-btn-alumnos');

	if (tab === 'cursos') {
		if (seccionCursos) seccionCursos.style.display = 'block';
		if (seccionAlumnos) seccionAlumnos.style.display = 'none';
		if (btnCursos) {
			btnCursos.classList.add('active');
			btnCursos.setAttribute('aria-selected', 'true');
		}
		if (btnAlumnos) {
			btnAlumnos.classList.remove('active');
			btnAlumnos.setAttribute('aria-selected', 'false');
		}
	} else {
		if (seccionCursos) seccionCursos.style.display = 'none';
		if (seccionAlumnos) seccionAlumnos.style.display = 'block';
		if (btnCursos) {
			btnCursos.classList.remove('active');
			btnCursos.setAttribute('aria-selected', 'false');
		}
		if (btnAlumnos) {
			btnAlumnos.classList.add('active');
			btnAlumnos.setAttribute('aria-selected', 'true');
		}
		// Cargar automáticamente la nómina real si no ha sido cargada
		if (!misAlumnosCargados || misAlumnosCargados.length === 0) {
			const select = document.getElementById('select-curso-participantes');
			const targetVal = select ? (select.value || 'TODOS') : 'TODOS';
			cargarAlumnosDeCurso(targetVal);
		}
	}

	// Sincronizar enlace activo en el menú superior
	document.querySelectorAll('#main-menu a, #mobile_menu a').forEach(a => a.classList.remove('active'));
	const navLink = document.getElementById('nav-docente-' + tab);
	if (navLink) navLink.classList.add('active');

	if (updateHash && typeof history !== 'undefined') {
		if (history.replaceState) {
			history.replaceState(null, null, '#' + tab);
		} else {
			window.location.hash = tab;
		}
	}
}



let misAlumnosCargados = [];

function filtrarAlumnosDocenteEnTabla(keyword) {
	const tbody = document.getElementById('tabla-participantes-body');
	if (!tbody) return;

	const q = (keyword || '').toLowerCase().trim();
	if (!q) {
		renderTablaAlumnosDocente(misAlumnosCargados);
		return;
	}

	const filtrados = misAlumnosCargados.filter(p => {
		const est = p.estudiante || {};
		const nombre = (est.nombres && est.apellidos) ? `${est.nombres} ${est.apellidos}` : (p.estudianteNombre || '');
		const dni = est.dni || '';
		const correo = est.correo || '';
		const curso = p.cursoTitulo || '';
		return nombre.toLowerCase().includes(q) || dni.toLowerCase().includes(q) || correo.toLowerCase().includes(q) || curso.toLowerCase().includes(q);
	});

	renderTablaAlumnosDocente(filtrados);
}

function renderTablaAlumnosDocente(pedidos) {
	const tbody = document.getElementById('tabla-participantes-body');
	if (!tbody) return;

	if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
		tbody.innerHTML = `
			<tr>
				<td colspan="8" class="text-center py-5">
					<i class="fa fa-info-circle text-muted fa-2x mb-2 d-block"></i>
					<span class="text-muted fw-bold">No se encontraron estudiantes matriculados para este criterio.</span>
				</td>
			</tr>
		`;
		return;
	}

	tbody.innerHTML = pedidos.map((p, idx) => {
		const est = p.estudiante || {};
		const comp = p.comprobante || {};
		const nombreCompleto = (est.nombres && est.apellidos) 
			? `${est.nombres} ${est.apellidos}` 
			: (p.estudianteNombre || 'Estudiante Registrado');
		const dni = est.dni || '72481930';
		const correo = est.correo || 'correo@estudiante.edu.pe';
		const rawWhatsapp = est.whatsapp || '+51999555666';
		const cleanWhatsapp = rawWhatsapp.replace(/[^0-9]/g, '');

		// Fecha de matrícula real
		const rawFecha = p.fechaRegistro || p.createdAt || p.fechaActualizacion;
		const fechaStr = rawFecha 
			? new Date(rawFecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) 
			: 'Reciente';

		// Curso
		const tituloCurso = p.cursoTitulo || 'Curso Especializado';
		const mod = p.modalidad || 'VIRTUAL';
		const modBadge = mod === 'PRESENCIAL' 
			? '<span class="badge bg-warning text-dark ms-1" style="font-size: 10px;">Presencial</span>' 
			: '<span class="badge bg-info text-dark ms-1" style="font-size: 10px;">Virtual</span>';

		// Comprobante
		const compText = (comp.serie && comp.numeroCorrelativo)
			? `${comp.serie}-${String(comp.numeroCorrelativo).padStart(6, '0')}`
			: (p.codigoOrden || 'ORD-MAT');

		// Iniciales para avatar visual
		const iniciales = nombreCompleto.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AL';

		return `
			<tr>
				<td class="text-muted fw-bold">${idx + 1}</td>
				<td>
					<div class="d-flex align-items-center gap-2">
						<div style="width: 34px; height: 34px; border-radius: 50%; background: rgba(46, 202, 127, 0.15); color: #16a34a; font-weight: 800; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
							${iniciales}
						</div>
						<div>
							<strong style="color: #0f172a; font-size: 14px; display: block;">${nombreCompleto}</strong>
							<span class="text-muted" style="font-size: 11.5px;"><i class="fa fa-id-card-o me-1"></i>DNI: ${dni}</span>
						</div>
					</div>
				</td>
				<td>
					<span class="fw-bold" style="color: #1e293b; font-size: 13px;">${tituloCurso}</span>
					${modBadge}
				</td>
				<td>
					<a href="mailto:${correo}" class="text-decoration-none text-secondary" style="font-size: 13px;">
						<i class="fa fa-envelope-o me-1 text-muted"></i>${correo}
					</a>
				</td>
				<td>
					<a href="https://wa.me/${cleanWhatsapp}" target="_blank" rel="noopener noreferrer" class="badge bg-light text-success text-decoration-none border px-2 py-1" style="font-size: 12px;" title="Chatear en WhatsApp">
						<i class="fa fa-whatsapp text-success me-1"></i>${rawWhatsapp}
					</a>
				</td>
				<td class="text-muted" style="font-size: 13px;">
					<i class="fa fa-calendar-o me-1"></i>${fechaStr}
				</td>
				<td>
					<span class="status-pill-success" style="font-size: 11.5px; padding: 4px 10px;">
						<i class="fa fa-check-circle me-1"></i>Pagado
					</span>
				</td>
				<td>
					<span class="font-monospace text-primary fw-bold" style="font-size: 12px; background: #eff6ff; padding: 3px 8px; border-radius: 6px; border: 1px solid #dbeafe;">
						${compText}
					</span>
				</td>
			</tr>
		`;
	}).join('');
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

	tbody.innerHTML = `
		<tr>
			<td colspan="8" class="text-center py-4 text-muted">
				<i class="fa fa-spinner fa-spin me-2 text-success"></i>Consultando participantes matriculados...
			</td>
		</tr>
	`;

	try {
		let pedidos = [];

		if (!cursoId || cursoId === 'TODOS') {
			if (!misCursosDocente || misCursosDocente.length === 0) {
				const todos = await CursosService.getCursos('TODOS');
				misCursosDocente = (todos || []).filter(c => c.docenteId === activeDocente.id || c.docenteId === 'a0000000-0000-0000-0000-000000000002');
			}

			const promesas = (misCursosDocente || []).map(async c => {
				try {
					const lista = await API.request(`/pedidos/curso/${c.id}/participantes`);
					(lista || []).forEach(p => {
						if (!p.cursoTitulo) p.cursoTitulo = c.titulo;
						if (!p.modalidad) p.modalidad = c.modalidad;
					});
					return lista || [];
				} catch (e) {
					return [];
				}
			});

			const arrays = await Promise.all(promesas);
			pedidos = arrays.flat();
		} else {
			pedidos = await API.request(`/pedidos/curso/${cursoId}/participantes`);
			const curso = (misCursosDocente || []).find(c => c.id === cursoId);
			if (curso) {
				(pedidos || []).forEach(p => {
					if (!p.cursoTitulo) p.cursoTitulo = curso.titulo;
					if (!p.modalidad) p.modalidad = curso.modalidad;
				});
			}
		}

		misAlumnosCargados = pedidos || [];

		// Actualizar contadores si cargamos todos
		if (!cursoId || cursoId === 'TODOS') {
			const bDocAlumnos = document.getElementById('docente-tab-badge-alumnos');
			if (bDocAlumnos) bDocAlumnos.textContent = misAlumnosCargados.length;
			const totalAlumnosEl = document.getElementById('docente-total-alumnos');
			if (totalAlumnosEl) totalAlumnosEl.textContent = misAlumnosCargados.length;
		}

		// Limpiar input de búsqueda
		const sInput = document.getElementById('buscador-alumnos-docente');
		if (sInput) sInput.value = '';

		renderTablaAlumnosDocente(misAlumnosCargados);
	} catch (err) {
		console.error('[PortalDocente] Error al cargar alumnos:', err);
		tbody.innerHTML = `
			<tr>
				<td colspan="8" class="text-center py-4 text-danger">
					<i class="fa fa-exclamation-triangle me-1"></i>No se pudieron cargar los alumnos: ${err.message}
				</td>
			</tr>
		`;
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

