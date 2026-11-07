import { Component, AfterViewInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CursoModel } from '../../services/config.data';
import { AuthService, UserProfile } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-docente-panel',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP  -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title">
					<h1><i class="fa fa-briefcase me-2"></i>Portal del Docente</h1>
					<ul>
						<li><a href="/">Inicio</a></li>
						<li> / Gestión de Cursos y Aulas</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->

	<!-- CONTENIDO DEL PORTAL DOCENTE -->
	<div class="section-padding" style="background: #f8fafc; min-height: 70vh;">
		<div class="container">
			
			<!-- PERFIL DOCENTE Y MÉTRICAS (DISEÑO ABIERTO Y HUMANO) -->
			<div class="row mb-4">
				<div class="col-12">
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 pb-3 border-bottom" style="border-color: #e2e8f0 !important;">
						<div class="d-flex align-items-center gap-3">
							<div style="width: 48px; height: 48px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 22px;">
								<i class="fa fa-user"></i>
							</div>
							<div>
								<div class="d-flex align-items-center gap-2">
									<h3 id="docente-nombre-header" style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 0;">Prof. Roberto Mendoza</h3>
									<span class="badge bg-success bg-opacity-10 text-success fw-bold" style="font-size: 11px;">Docente Oficial</span>
								</div>
								<span id="docente-correo-header" style="font-size: 13.5px; color: #64748b;">docente@cursos.com</span>
							</div>
						</div>
						<div class="d-flex align-items-center gap-4">
							<div>
								<span class="text-muted text-uppercase" style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">Cursos a Cargo</span>
								<div id="docente-total-cursos" style="font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.1;">-</div>
							</div>
							<div style="width: 1px; height: 30px; background: #e2e8f0;"></div>
							<div>
								<span class="text-muted text-uppercase" style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">Alumnos Inscritos</span>
								<div id="docente-total-alumnos" style="font-size: 22px; font-weight: 800; color: #16a34a; line-height: 1.1;">-</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- PESTAÑAS DE TRABAJO (SUBRAYADO MINIMALISTA) -->
			<div class="row mb-3">
				<div class="col-12">
					<div class="platform-tabs-wrapper">
						<div class="platform-tabs-nav" role="tablist">
							<button type="button" class="platform-tab-btn active" id="tab-btn-cursos" (click)="switchDocenteTab('cursos')">
								<i class="fa fa-book me-1"></i>
								<span>Mis Cursos Asignados</span>
								<span class="platform-tab-badge" id="docente-tab-badge-cursos">-</span>
							</button>
							<button type="button" class="platform-tab-btn" id="tab-btn-alumnos" (click)="switchDocenteTab('alumnos')">
								<i class="fa fa-users me-1"></i>
								<span>Lista de Alumnos Matriculados</span>
								<span class="platform-tab-badge" id="docente-tab-badge-alumnos">-</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- SECCIÓN 1: MIS CURSOS ASIGNADOS -->
			<div id="seccion-cursos-docente">
				<div class="row" id="docente-cursos-container">
					<div class="col-12 text-center py-5">
						<i class="fa fa-spinner fa-spin fa-2x text-primary mb-2"></i>
						<p class="text-muted">Cargando tus cursos asignados...</p>
					</div>
				</div>
			</div>

			<!-- SECCIÓN 2: LISTA DE ALUMNOS MATRICULADOS -->
			<div id="seccion-alumnos-docente" style="display: none;">
				<div class="clean-surface">
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
						<div>
							<h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
								<i class="fa fa-users text-success me-2"></i>Nómina Real de Estudiantes Matriculados
							</h4>
							<p class="text-muted" style="font-size: 13.5px; margin: 0;">Estudiantes reales registrados en la base de datos con matrícula confirmada:</p>
						</div>
						<div class="d-flex flex-wrap align-items-center gap-2">
							<div class="input-group input-group-sm" style="width: 260px;">
								<span class="input-group-text bg-white border-end-0"><i class="fa fa-search text-muted"></i></span>
								<input type="text" id="buscador-alumnos-docente" class="form-control border-start-0" placeholder="Buscar por alumno, DNI o correo..." (input)="filtrarAlumnosDocenteEnTabla($any($event.target).value)">
							</div>
							<select id="select-curso-participantes" class="form-select form-select-sm" style="min-width: 260px; font-weight: 600;" (change)="cargarAlumnosDeCurso($any($event.target).value)">
								<option value="TODOS">-- Todos mis cursos asignados --</option>
							</select>
							<button type="button" class="btn btn-sm btn-outline-secondary" (click)="imprimirNomina()" title="Imprimir lista">
								<i class="fa fa-print"></i> Imprimir
							</button>
						</div>
					</div>

					<div class="table-responsive">
						<table class="table table-hover align-middle" style="font-size: 13.5px;">
							<thead style="background: #f8fafc; color: #475569; font-weight: 700;">
								<tr>
									<th style="width: 40px;">#</th>
									<th>Estudiante</th>
									<th>Curso Asignado</th>
									<th>Correo Electrónico</th>
									<th>WhatsApp</th>
									<th>Fecha de Matrícula</th>
									<th>Estado</th>
									<th>Comprobante</th>
								</tr>
							</thead>
							<tbody id="tabla-participantes-body">
								<tr>
									<td colspan="8" class="text-center py-4 text-muted">
										<i class="fa fa-spinner fa-spin me-2"></i>Cargando nómina oficial de alumnos...
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

		</div>
	</div>

	<!-- MODAL: ACTUALIZAR ENLACE DE CLASE (VIRTUAL) -->
	<div id="modal-actualizar-enlace" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.7); z-index: 9999999; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
		<div style="background: #ffffff; border-radius: 16px; padding: 28px 24px; max-width: 500px; width: 92%; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);">
			<h4 style="font-weight: 800; color: #0f172a; margin-bottom: 6px;">
				<i class="fa fa-video-camera text-primary me-2"></i>Actualizar Enlace de Clase en Vivo
			</h4>
			<p class="text-muted" style="font-size: 13px;">Los alumnos matriculados verán este enlace de inmediato en su portal para conectarse a clase.</p>
			
			<input type="hidden" id="edit-enlace-curso-id">
			
			<div class="form-group mb-3">
				<label for="edit-enlace-input" style="font-size: 12.5px; font-weight: 700; color: #334155;">Enlace de Zoom / Google Meet / Teams *</label>
				<input type="url" id="edit-enlace-input" class="form-control" placeholder="https://meet.google.com/..." required>
			</div>

			<div class="d-flex justify-content-end gap-2 mt-4">
				<button type="button" class="btn btn-outline-secondary btn-sm" (click)="cerrarModalEnlace()">Cancelar</button>
				<button type="button" class="btn btn-primary btn-sm fw-bold px-3" id="btn-guardar-enlace" (click)="guardarEnlaceClase()">
					<i class="fa fa-save me-1"></i> Guardar Enlace
				</button>
			</div>
		</div>
	</div>

	<!-- MODAL: ACTUALIZAR DATOS DE SEDE Y AULA (PRESENCIAL) -->
	<div id="modal-actualizar-aula" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.7); z-index: 9999999; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
		<div style="background: #ffffff; border-radius: 16px; padding: 28px 24px; max-width: 500px; width: 92%; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);">
			<h4 style="font-weight: 800; color: #0f172a; margin-bottom: 6px;">
				<i class="fa fa-building text-warning me-2"></i>Actualizar Sede y Aula Física
			</h4>
			<p class="text-muted" style="font-size: 13px;">Informa a tus estudiantes la dirección exacta del campus y el aula o laboratorio asignado.</p>
			
			<input type="hidden" id="edit-aula-curso-id">
			
			<div class="form-group mb-3">
				<label for="edit-sede-input" style="font-size: 12.5px; font-weight: 700; color: #334155;">Dirección de Sede / Campus *</label>
				<input type="text" id="edit-sede-input" class="form-control" placeholder="Ej: Av. Universitaria 1234, Lima" required>
			</div>

			<div class="form-group mb-3">
				<label for="edit-aula-input" style="font-size: 12.5px; font-weight: 700; color: #334155;">Aula o Laboratorio *</label>
				<input type="text" id="edit-aula-input" class="form-control" placeholder="Ej: Laboratorio 204" required>
			</div>

			<div class="d-flex justify-content-end gap-2 mt-4">
				<button type="button" class="btn btn-outline-secondary btn-sm" (click)="cerrarModalAula()">Cancelar</button>
				<button type="button" class="btn btn-primary btn-sm fw-bold px-3" id="btn-guardar-aula" (click)="guardarAulaSede()">
					<i class="fa fa-save me-1"></i> Guardar Cambios
				</button>
			</div>
		</div>
	</div>
  `
})
export class DocentePanelComponent implements AfterViewInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cursoService = inject(CursoService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);

  misCursosDocente: CursoModel[] = [];
  misAlumnosCargados: any[] = [];
  activeDocente: UserProfile | null = null;

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      (window as any).switchDocenteTab = (tab: string) => this.switchDocenteTab(tab);
      (window as any).abrirModalEnlace = (id: string, url: string) => this.abrirModalEnlace(id, url);
      (window as any).abrirModalAula = (id: string, sede: string, aula: string) => this.abrirModalAula(id, sede, aula);
      (window as any).verAlumnosDirecto = (id: string) => this.verAlumnosDirecto(id);
    }
    this.initPortalDocente();
  }

  imprimirNomina(): void {
    if (typeof window !== 'undefined') window.print();
  }

  async initPortalDocente(): Promise<void> {
    this.activeDocente = this.authService.getCurrentUser();

    if (!this.activeDocente) {
      this.notifications.showToast('Por favor inicia sesión con tu cuenta de docente.', 'info');
      setTimeout(() => {
        this.router.navigateByUrl('/login?redirect=portal-docente.html');
      }, 400);
      return;
    }

    if (this.activeDocente.rol !== 'DOCENTE' && this.activeDocente.rol !== 'ADMIN') {
      this.notifications.showToast('Acceso restringido: Esta sección es exclusiva para docentes.', 'warning');
      setTimeout(() => {
        this.router.navigateByUrl('/mis-cursos');
      }, 500);
      return;
    }

    const elNombre = document.getElementById('docente-nombre-header');
    const elCorreo = document.getElementById('docente-correo-header');
    if (elNombre) elNombre.textContent = this.activeDocente.nombres + (this.activeDocente.apellidos ? ' ' + this.activeDocente.apellidos : '');
    if (elCorreo) elCorreo.textContent = this.activeDocente.correo;

    this.authService.updateNavbar();

    const hashTab = (window.location.hash || '').replace('#', '').toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const queryTab = (urlParams.get('tab') || '').toLowerCase();
    const initialTab = hashTab || queryTab || 'cursos';
    this.switchDocenteTab(initialTab, false);

    await this.cargarCursosDelDocente();
  }

  async cargarCursosDelDocente(): Promise<void> {
    const container = document.getElementById('docente-cursos-container');
    const selectParticipantes = document.getElementById('select-curso-participantes') as HTMLSelectElement | null;

    try {
      const docenteId = this.activeDocente?.id || 'a0000000-0000-0000-0000-000000000002';
      this.misCursosDocente = await this.cursoService.obtenerCursosDocente(docenteId);

      const totalCursosEl = document.getElementById('docente-total-cursos');
      const totalAlumnosEl = document.getElementById('docente-total-alumnos');

      let totalInscritos = 0;
      this.misCursosDocente.forEach(c => {
        const max = Number(c.aforoMaximo || 30);
        const disp = Number(c.aforoDisponible !== undefined ? c.aforoDisponible : max);
        totalInscritos += Math.max(0, max - disp);
      });

      if (totalCursosEl) totalCursosEl.textContent = String(this.misCursosDocente.length);
      const bDocCursos = document.getElementById('docente-tab-badge-cursos');
      if (bDocCursos) bDocCursos.textContent = String(this.misCursosDocente.length);

      if (totalAlumnosEl) totalAlumnosEl.textContent = String(totalInscritos);
      const bDocAlumnos = document.getElementById('docente-tab-badge-alumnos');
      if (bDocAlumnos) bDocAlumnos.textContent = String(totalInscritos);

      if (selectParticipantes) {
        selectParticipantes.innerHTML = `
          <option value="TODOS" selected>-- Todos mis cursos asignados --</option>
          ${this.misCursosDocente.map(c => `<option value="${c.id}">${c.titulo} (${c.modalidad})</option>`).join('')}
        `;
      }

      const curHashInit = (window.location.hash || '').replace('#', '').toLowerCase();
      if (curHashInit === 'alumnos') {
        this.cargarAlumnosDeCurso('TODOS');
      }

      this.renderCursosDocente(this.misCursosDocente);
    } catch (err: any) {
      if (container) {
        container.innerHTML = `
          <div class="col-12 text-center py-4">
            <p class="text-danger">No se pudieron cargar los cursos del docente: ${err?.message}</p>
          </div>
        `;
      }
    }
  }

  private renderCursosDocente(lista: CursoModel[]): void {
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

      const safeEnlace = (c.enlaceClase || '').replace(/'/g, "\\'");
      const safeSede = (c.direccionClase || '').replace(/'/g, "\\'");
      const safeAula = (c.aula || '').replace(/'/g, "\\'");

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
                <button type="button" class="btn btn-sm btn-outline-secondary fw-bold" onclick="window.abrirModalEnlace('${c.id}', '${safeEnlace}')">
                  <i class="fa fa-pencil me-1"></i> Actualizar Enlace
                </button>
              ` : `
                <button type="button" class="btn btn-sm btn-outline-secondary fw-bold" onclick="window.abrirModalAula('${c.id}', '${safeSede}', '${safeAula}')">
                  <i class="fa fa-pencil me-1"></i> Actualizar Sede/Aula
                </button>
              `}
              <button type="button" class="btn btn-sm btn-success fw-bold" onclick="window.verAlumnosDirecto('${c.id}')">
                <i class="fa fa-users me-1"></i> Ver Alumnos (${inscritos})
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  switchDocenteTab(tab: string, updateHash = true): void {
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
      if (!this.misAlumnosCargados || this.misAlumnosCargados.length === 0) {
        const select = document.getElementById('select-curso-participantes') as HTMLSelectElement | null;
        const targetVal = select ? (select.value || 'TODOS') : 'TODOS';
        this.cargarAlumnosDeCurso(targetVal);
      }
    }

    document.querySelectorAll('#main-menu a, #mobile_menu a').forEach(a => a.classList.remove('active'));
    const navLink = document.getElementById('nav-docente-' + tab);
    if (navLink) navLink.classList.add('active');

    if (updateHash && typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', '#' + tab);
    }
  }

  filtrarAlumnosDocenteEnTabla(keyword: string): void {
    const q = (keyword || '').toLowerCase().trim();
    if (!q) {
      this.renderTablaAlumnosDocente(this.misAlumnosCargados);
      return;
    }

    const filtrados = this.misAlumnosCargados.filter(p => {
      const est = p.estudiante || {};
      const nombre = (est.nombres && est.apellidos) ? `${est.nombres} ${est.apellidos}` : (p.estudianteNombre || '');
      const dni = est.dni || '';
      const correo = est.correo || '';
      const curso = p.cursoTitulo || '';
      return nombre.toLowerCase().includes(q) || dni.toLowerCase().includes(q) || correo.toLowerCase().includes(q) || curso.toLowerCase().includes(q);
    });

    this.renderTablaAlumnosDocente(filtrados);
  }

  private renderTablaAlumnosDocente(pedidos: any[]): void {
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

      const rawFecha = p.fechaRegistro || p.createdAt || p.fechaActualizacion;
      const fechaStr = rawFecha
        ? new Date(rawFecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Reciente';

      const tituloCurso = p.cursoTitulo || 'Curso Especializado';
      const mod = p.modalidad || 'VIRTUAL';
      const modBadge = mod === 'PRESENCIAL'
        ? '<span class="badge bg-warning text-dark ms-1" style="font-size: 10px;">Presencial</span>'
        : '<span class="badge bg-info text-dark ms-1" style="font-size: 10px;">Virtual</span>';

      const compText = (comp.serie && comp.numeroCorrelativo)
        ? `${comp.serie}-${String(comp.numeroCorrelativo).padStart(6, '0')}`
        : (p.codigoOrden || 'ORD-MAT');

      const iniciales = nombreCompleto.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AL';

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

  verAlumnosDirecto(cursoId: string): void {
    this.switchDocenteTab('alumnos');
    const select = document.getElementById('select-curso-participantes') as HTMLSelectElement | null;
    if (select) {
      select.value = cursoId;
      this.cargarAlumnosDeCurso(cursoId);
    }
  }

  async cargarAlumnosDeCurso(cursoId: string): Promise<void> {
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
      let pedidos: any[] = [];

      if (!cursoId || cursoId === 'TODOS') {
        if (!this.misCursosDocente || this.misCursosDocente.length === 0) {
          const docId = this.activeDocente?.id || 'a0000000-0000-0000-0000-000000000002';
          this.misCursosDocente = await this.cursoService.obtenerCursosDocente(docId);
        }

        const cursosMap = new Map((this.misCursosDocente || []).map(c => [c.id, c]));
        const todosPedidos = await this.pedidoService.obtenerTodosPedidos();
        pedidos = (todosPedidos || []).filter(p => p.estado === 'PAGADO' && (cursosMap.size === 0 || cursosMap.has(p.cursoId)));
        pedidos.forEach(p => {
          const c = cursosMap.get(p.cursoId);
          if (c) {
            if (!p.cursoTitulo) p.cursoTitulo = c.titulo;
            if (!p.modalidad) p.modalidad = c.modalidad;
          }
        });
      } else {
        pedidos = await this.pedidoService.obtenerParticipantesCurso(cursoId);
        const curso = (this.misCursosDocente || []).find(c => c.id === cursoId);
        if (curso) {
          (pedidos || []).forEach(p => {
            if (!p.cursoTitulo) p.cursoTitulo = curso.titulo;
            if (!p.modalidad) p.modalidad = curso.modalidad;
          });
        }
      }

      this.misAlumnosCargados = pedidos || [];

      if (!cursoId || cursoId === 'TODOS') {
        const bDocAlumnos = document.getElementById('docente-tab-badge-alumnos');
        if (bDocAlumnos) bDocAlumnos.textContent = String(this.misAlumnosCargados.length);
        const totalAlumnosEl = document.getElementById('docente-total-alumnos');
        if (totalAlumnosEl) totalAlumnosEl.textContent = String(this.misAlumnosCargados.length);
      }

      const sInput = document.getElementById('buscador-alumnos-docente') as HTMLInputElement | null;
      if (sInput) sInput.value = '';

      this.renderTablaAlumnosDocente(this.misAlumnosCargados);
    } catch (err: any) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-danger">
            <i class="fa fa-exclamation-triangle me-1"></i>No se pudieron cargar los alumnos: ${err?.message}
          </td>
        </tr>
      `;
    }
  }

  abrirModalEnlace(cursoId: string, enlaceActual: string): void {
    const modal = document.getElementById('modal-actualizar-enlace');
    const inputId = document.getElementById('edit-enlace-curso-id') as HTMLInputElement | null;
    const inputUrl = document.getElementById('edit-enlace-input') as HTMLInputElement | null;
    if (inputId) inputId.value = cursoId;
    if (inputUrl) inputUrl.value = enlaceActual || '';
    if (modal) modal.style.display = 'flex';
  }

  cerrarModalEnlace(): void {
    const modal = document.getElementById('modal-actualizar-enlace');
    if (modal) modal.style.display = 'none';
  }

  async guardarEnlaceClase(): Promise<void> {
    const inputId = document.getElementById('edit-enlace-curso-id') as HTMLInputElement | null;
    const inputUrl = document.getElementById('edit-enlace-input') as HTMLInputElement | null;
    const btn = document.getElementById('btn-guardar-enlace') as HTMLButtonElement | null;

    const cursoId = inputId ? inputId.value : null;
    const enlace = inputUrl ? inputUrl.value.trim() : '';

    if (!cursoId || !enlace) {
      this.notifications.showToast('Ingresa un enlace válido de clase (Zoom / Meet).', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Guardando...`;
    }

    try {
      await this.cursoService.actualizarEnlace(cursoId, enlace);
      this.notifications.showToast('¡Enlace de clase actualizado exitosamente!', 'success');
      this.cerrarModalEnlace();
      await this.cargarCursosDelDocente();
    } catch (err: any) {
      this.notifications.showToast('Error al actualizar enlace: ' + err?.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa fa-save me-1"></i> Guardar Enlace`;
      }
    }
  }

  abrirModalAula(cursoId: string, sedeActual: string, aulaActual: string): void {
    const modal = document.getElementById('modal-actualizar-aula');
    const inputId = document.getElementById('edit-aula-curso-id') as HTMLInputElement | null;
    const inputSede = document.getElementById('edit-sede-input') as HTMLInputElement | null;
    const inputAula = document.getElementById('edit-aula-input') as HTMLInputElement | null;

    if (inputId) inputId.value = cursoId;
    if (inputSede) inputSede.value = sedeActual || '';
    if (inputAula) inputAula.value = aulaActual || '';
    if (modal) modal.style.display = 'flex';
  }

  cerrarModalAula(): void {
    const modal = document.getElementById('modal-actualizar-aula');
    if (modal) modal.style.display = 'none';
  }

  async guardarAulaSede(): Promise<void> {
    const inputId = document.getElementById('edit-aula-curso-id') as HTMLInputElement | null;
    const inputSede = document.getElementById('edit-sede-input') as HTMLInputElement | null;
    const inputAula = document.getElementById('edit-aula-input') as HTMLInputElement | null;
    const btn = document.getElementById('btn-guardar-aula') as HTMLButtonElement | null;

    const cursoId = inputId ? inputId.value : null;
    const sede = inputSede ? inputSede.value.trim() : '';
    const aula = inputAula ? inputAula.value.trim() : '';

    if (!cursoId || !sede || !aula) {
      this.notifications.showToast('Por favor completa tanto la sede como el aula.', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Guardando...`;
    }

    try {
      await this.cursoService.actualizarDatosClase(cursoId, {
        modalidad: 'PRESENCIAL',
        direccionClase: sede,
        aula
      });
      this.notifications.showToast('¡Datos de sede y aula actualizados exitosamente!', 'success');
      this.cerrarModalAula();
      await this.cargarCursosDelDocente();
    } catch (err: any) {
      this.notifications.showToast('Error al actualizar datos: ' + err?.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa fa-save me-1"></i> Guardar Cambios`;
      }
    }
  }
}
