import { Component, AfterViewInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CursoModel } from '../../services/config.data';
import { AuthService, UserProfile } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP  -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title">
					<h1><i class="fa fa-shield me-2 text-warning"></i>Portal del Administrador</h1>
					<ul>
						<li><a href="/">Inicio</a></li>
						<li> / Control Central y Catálogo de Microservicios</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->

	<!-- CONTENIDO DEL PORTAL ADMIN -->
	<div class="section-padding" style="background: #f8fafc; min-height: 70vh;">
		<div class="container">
			
			<!-- HEADER MÉTRICAS DE LA PLATAFORMA (MINIMALISTA ABIERTO) -->
			<div class="row g-4 py-3 mb-4 border-bottom" id="metricas-resumen" style="border-color: #e2e8f0 !important;">
				<div class="col-xl-3 col-sm-6 col-12">
					<div class="pe-3">
						<span class="text-muted text-uppercase" style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">Cursos Creados</span>
						<div class="d-flex align-items-baseline gap-2 mt-1">
							<span id="admin-metric-cursos" style="font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1;">-</span>
							<span class="badge bg-light text-muted fw-normal" style="font-size: 11px;">en catálogo</span>
						</div>
					</div>
				</div>

				<div class="col-xl-3 col-sm-6 col-12">
					<div class="pe-3">
						<span class="text-muted text-uppercase" style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">Matrículas Pagadas</span>
						<div class="d-flex align-items-baseline gap-2 mt-1">
							<span id="admin-metric-matriculas" style="font-size: 26px; font-weight: 800; color: #16a34a; line-height: 1;">-</span>
							<span class="badge bg-success bg-opacity-10 text-success fw-semibold" style="font-size: 11px;">confirmadas</span>
						</div>
					</div>
				</div>

				<div class="col-xl-3 col-sm-6 col-12">
					<div class="pe-3">
						<span class="text-muted text-uppercase" style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">Recaudación Oficial</span>
						<div class="d-flex align-items-baseline gap-2 mt-1">
							<span id="admin-metric-ingresos" style="font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1;">S/ 0.00</span>
							<span class="badge bg-light text-muted fw-normal" style="font-size: 11px;">PEN</span>
						</div>
					</div>
				</div>

				<div class="col-xl-3 col-sm-6 col-12">
					<div>
						<span class="text-muted text-uppercase" style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">Usuarios del Sistema</span>
						<div class="d-flex align-items-baseline gap-2 mt-1">
							<span id="admin-metric-usuarios" style="font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1;">-</span>
							<span class="badge bg-light text-muted fw-normal" style="font-size: 11px;">cuentas</span>
						</div>
					</div>
				</div>
			</div>

			<!-- PESTAÑAS DE CONTROL ADMINISTRATIVO (CON HASH Y DEEP LINKING) -->
			<div class="row mb-4">
				<div class="col-12">
					<div class="platform-tabs-wrapper">
						<div class="platform-tabs-nav" role="tablist">
							<button type="button" class="platform-tab-btn active" id="tab-admin-cursos" (click)="switchAdminTab('cursos')" role="tab" aria-selected="true">
								<i class="fa fa-book me-2"></i>
								<span>Gestión de Cursos (CRUD)</span>
								<span class="platform-tab-badge" id="tab-badge-cursos">-</span>
							</button>
							<button type="button" class="platform-tab-btn" id="tab-admin-pedidos" (click)="switchAdminTab('pedidos')" role="tab" aria-selected="false">
								<i class="fa fa-shopping-cart me-2"></i>
								<span>Matrículas y Pagos</span>
								<span class="platform-tab-badge" id="tab-badge-pedidos">-</span>
							</button>
							<button type="button" class="platform-tab-btn" id="tab-admin-usuarios" (click)="switchAdminTab('usuarios')" role="tab" aria-selected="false">
								<i class="fa fa-users me-2"></i>
								<span>Directorio de Usuarios</span>
								<span class="platform-tab-badge" id="tab-badge-usuarios">-</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- PESTAÑA 1: GESTIÓN DE CURSOS -->
			<div id="seccion-admin-cursos">
				<div class="clean-surface">
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
						<div>
							<h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
								<i class="fa fa-cubes text-primary me-2"></i>Gestión de Cursos y Aforos
							</h4>
							<p class="text-muted" style="font-size: 13.5px; margin: 0;">Control oficial de precios, aforos en tiempo real y estado en el catálogo:</p>
						</div>
						<div>
							<button type="button" class="btn btn-success btn-sm fw-bold px-3 py-2" (click)="abrirModalCrearCurso()">
								<i class="fa fa-plus-circle me-1"></i> Crear Nuevo Curso
							</button>
						</div>
					</div>

					<div class="table-responsive">
						<table class="table table-hover align-middle" style="font-size: 13.5px;">
							<thead style="background: #f8fafc; color: #475569; font-weight: 700;">
								<tr>
									<th>Curso</th>
									<th>Modalidad</th>
									<th>Precio</th>
									<th>Aforo en Vivo</th>
									<th>Estado</th>
									<th class="text-end">Acciones</th>
								</tr>
							</thead>
							<tbody id="tabla-admin-cursos-body">
								<tr>
									<td colspan="6" class="text-center py-4 text-muted">
										<i class="fa fa-spinner fa-spin me-2"></i>Cargando cursos del sistema...
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- PESTAÑA 2: ÓRDENES Y MATRÍCULAS -->
			<div id="seccion-admin-pedidos" style="display: none;">
				<div class="clean-surface">
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
						<div>
							<h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
								<i class="fa fa-receipt text-success me-2"></i>Historial Central de Pedidos y Pagos
							</h4>
							<p class="text-muted" style="font-size: 13.5px; margin: 0;">Transacciones procesadas a través de Mercado Pago y Comprobantes SUNAT:</p>
						</div>
					</div>

					<div class="table-responsive">
						<table class="table table-hover align-middle" style="font-size: 13.5px;">
							<thead style="background: #f8fafc; color: #475569; font-weight: 700;">
								<tr>
									<th>Código Orden</th>
									<th>Alumno / DNI</th>
									<th>Curso</th>
									<th>Monto</th>
									<th>Comprobante</th>
									<th>Estado</th>
									<th>Fecha</th>
								</tr>
							</thead>
							<tbody id="tabla-admin-pedidos-body">
								<tr>
									<td colspan="7" class="text-center py-4 text-muted">
										<i class="fa fa-spinner fa-spin me-2"></i>Cargando transacciones...
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- PESTAÑA 3: DIRECTORIO DE USUARIOS -->
			<div id="seccion-admin-usuarios" style="display: none;">
				<div class="clean-surface">
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
						<div>
							<h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
								<i class="fa fa-id-card-o text-purple me-2" style="color: #9333ea;"></i>Directorio de Usuarios y Roles
							</h4>
							<p class="text-muted" style="font-size: 13.5px; margin: 0;">Cuentas registradas en auth-service (Estudiantes, Docentes y Administradores):</p>
						</div>
					</div>

					<div class="table-responsive">
						<table class="table table-hover align-middle" style="font-size: 13.5px;">
							<thead style="background: #f8fafc; color: #475569; font-weight: 700;">
								<tr>
									<th>DNI</th>
									<th>Nombres y Apellidos</th>
									<th>Correo Electrónico</th>
									<th>WhatsApp</th>
									<th>Rol</th>
									<th>Seguridad 2FA</th>
								</tr>
							</thead>
							<tbody id="tabla-admin-usuarios-body">
								<tr>
									<td colspan="6" class="text-center py-4 text-muted">
										<i class="fa fa-spinner fa-spin me-2"></i>Cargando usuarios...
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

		</div>
	</div>

	<!-- MODAL: CREAR NUEVO CURSO -->
	<div id="modal-crear-curso" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.7); z-index: 9999999; align-items: center; justify-content: center; backdrop-filter: blur(4px); overflow-y: auto; padding: 20px 0;">
		<div style="background: #ffffff; border-radius: 16px; padding: 28px 24px; max-width: 600px; width: 92%; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25); max-height: 90vh; overflow-y: auto;">
			<div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
				<h4 style="font-weight: 800; color: #0f172a; margin: 0;">
					<i class="fa fa-plus-circle text-success me-2"></i>Crear Nuevo Curso
				</h4>
				<button type="button" class="btn-close" (click)="cerrarModalCrearCurso()"></button>
			</div>
			
			<form id="form-crear-curso" (submit)="guardarNuevoCurso($event)">
				<div class="row g-3">
					<div class="col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Título del Curso *</label>
						<input type="text" id="nuevo-curso-titulo" class="form-control form-control-sm" required placeholder="Ej: Microservicios Avanzados con Spring Cloud">
					</div>

					<div class="col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Descripción *</label>
						<textarea id="nuevo-curso-desc" class="form-control form-control-sm" rows="2" required placeholder="Descripción del temario y competencias..."></textarea>
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Modalidad *</label>
						<select id="nuevo-curso-modalidad" class="form-select form-select-sm" (change)="toggleModalidadFields($any($event.target).value)">
							<option value="VIRTUAL">VIRTUAL (En Vivo)</option>
							<option value="PRESENCIAL">PRESENCIAL (Sede Física)</option>
						</select>
					</div>

					<div class="col-md-3 col-6">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Precio (S/) *</label>
						<input type="number" id="nuevo-curso-precio" class="form-control form-control-sm" min="1" step="0.5" value="180.00" required>
					</div>

					<div class="col-md-3 col-6">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Aforo Máximo *</label>
						<input type="number" id="nuevo-curso-aforo" class="form-control form-control-sm" min="1" value="25" required>
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Horario *</label>
						<input type="text" id="nuevo-curso-horario" class="form-control form-control-sm" placeholder="Ej: Lun y Mie 19:00 - 22:00" required>
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Docente Asignado *</label>
						<select id="nuevo-curso-docente" class="form-select form-select-sm">
							<option value="a0000000-0000-0000-0000-000000000002">Ing. Roberto Docente (Docente Principal)</option>
						</select>
					</div>

					<!-- Campos para Virtual -->
					<div class="col-12" id="field-virtual-box">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Enlace de Clase (Zoom / Meet)</label>
						<input type="url" id="nuevo-curso-enlace" class="form-control form-control-sm" placeholder="https://meet.google.com/xyz-abcd-efg">
					</div>

					<!-- Campos para Presencial -->
					<div class="col-md-8 col-12 d-none" id="field-presencial-sede">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Dirección de Sede</label>
						<input type="text" id="nuevo-curso-sede" class="form-control form-control-sm" placeholder="Av. Universitaria 1234, Lima">
					</div>

					<div class="col-md-4 col-12 d-none" id="field-presencial-aula">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Aula / Laboratorio</label>
						<input type="text" id="nuevo-curso-aula" class="form-control form-control-sm" placeholder="Lab 301">
					</div>
				</div>

				<div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
					<button type="button" class="btn btn-outline-secondary btn-sm" (click)="cerrarModalCrearCurso()">Cancelar</button>
					<button type="submit" class="btn btn-success btn-sm fw-bold px-3" id="btn-submit-crear-curso">
						<i class="fa fa-check me-1"></i> Publicar Curso
					</button>
				</div>
			</form>
		</div>
	</div>
  `
})
export class AdminPanelComponent implements AfterViewInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cursoService = inject(CursoService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);

  adminCursos: CursoModel[] = [];
  adminPedidos: any[] = [];
  adminUsuarios: UserProfile[] = [];

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      (window as any).switchAdminTab = (tab: string) => this.switchAdminTab(tab);
      (window as any).cambiarEstadoCurso = (id: string, estado: string) => this.cambiarEstadoCurso(id, estado);
    }
    this.initPortalAdmin();
  }

  async initPortalAdmin(): Promise<void> {
    const user = this.authService.getCurrentUser();

    if (!user) {
      this.notifications.showToast('Por favor inicia sesión con tu cuenta de Administrador.', 'info');
      setTimeout(() => {
        this.router.navigateByUrl('/login?redirect=portal-admin.html');
      }, 400);
      return;
    }

    if (user.rol !== 'ADMIN') {
      this.notifications.showToast('Acceso denegado: Esta área está reservada para Administradores.', 'error');
      setTimeout(() => {
        this.router.navigateByUrl('/' + this.authService.getPortalUrlForRole(user.rol).replace(/^\//, ''));
      }, 600);
      return;
    }

    this.authService.updateNavbar();

    const hashTab = (window.location.hash || '').replace('#', '').toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const queryTab = (urlParams.get('tab') || '').toLowerCase();
    const initialTab = (hashTab === 'resumen' || hashTab === 'pedidos' || hashTab === 'usuarios') ? hashTab : 'cursos';

    if (queryTab === 'new' || hashTab === 'nuevo' || urlParams.get('action') === 'new') {
      setTimeout(() => this.abrirModalCrearCurso(), 300);
    }
    this.switchAdminTab(initialTab, false);

    await Promise.allSettled([
      this.cargarMetricasYCursos(),
      this.cargarPedidosAdmin(),
      this.cargarUsuariosAdmin()
    ]);
  }

  async cargarMetricasYCursos(): Promise<void> {
    const tbody = document.getElementById('tabla-admin-cursos-body');
    const metricCursos = document.getElementById('admin-metric-cursos');

    try {
      this.adminCursos = await this.cursoService.obtenerTodosAdmin();
      if (metricCursos) metricCursos.textContent = String(this.adminCursos.length);
      const bCursos = document.getElementById('tab-badge-cursos');
      if (bCursos) bCursos.textContent = String(this.adminCursos.length);

      this.renderTablaCursosAdmin(this.adminCursos);
    } catch (err: any) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error: ${err?.message}</td></tr>`;
      }
    }
  }

  private renderTablaCursosAdmin(lista: CursoModel[]): void {
    const tbody = document.getElementById('tabla-admin-cursos-body');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No hay cursos registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map((c) => {
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
        ? `<button type="button" class="btn btn-sm btn-outline-danger py-1 px-2" style="font-size: 11.5px; font-weight: 700;" onclick="window.cambiarEstadoCurso('${c.id}', 'CERRADO')"><i class="fa fa-ban me-1"></i>Cerrar</button>`
        : `<button type="button" class="btn btn-sm btn-outline-success py-1 px-2" style="font-size: 11.5px; font-weight: 700;" onclick="window.cambiarEstadoCurso('${c.id}', 'PUBLICADO')"><i class="fa fa-check me-1"></i>Publicar</button>`;

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
              <a href="/curso-detalle?id=${c.id}" class="btn btn-sm btn-outline-secondary py-1 px-2" style="font-size: 11.5px;" title="Ver ficha pública">
                <i class="fa fa-external-link"></i>
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async cambiarEstadoCurso(cursoId: string, nuevoEstado: string): Promise<void> {
    try {
      await this.cursoService.cambiarEstado(cursoId, nuevoEstado);
      this.notifications.showToast(`Estado del curso actualizado a ${nuevoEstado}.`, 'success');
      await this.cargarMetricasYCursos();
    } catch (err: any) {
      this.notifications.showToast('Error al cambiar estado: ' + err?.message, 'error');
    }
  }

  async cargarPedidosAdmin(): Promise<void> {
    const tbody = document.getElementById('tabla-admin-pedidos-body');
    const metricMatriculas = document.getElementById('admin-metric-matriculas');
    const metricIngresos = document.getElementById('admin-metric-ingresos');

    try {
      this.adminPedidos = await this.pedidoService.obtenerTodosPedidos();

      let pagadas = 0;
      let totalSoles = 0;

      this.adminPedidos.forEach(p => {
        if (p.estado === 'PAGADO') {
          pagadas++;
          totalSoles += Number(p.monto || 0);
        }
      });

      if (metricMatriculas) metricMatriculas.textContent = String(pagadas);
      const bPedidos = document.getElementById('tab-badge-pedidos');
      if (bPedidos) bPedidos.textContent = String(this.adminPedidos.length);

      if (metricIngresos) metricIngresos.textContent = `S/ ${totalSoles.toFixed(2)}`;

      this.renderTablaPedidosAdmin(this.adminPedidos);
    } catch (err: any) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error: ${err?.message}</td></tr>`;
      }
    }
  }

  private renderTablaPedidosAdmin(lista: any[]): void {
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
      const rawFecha = p.fechaRegistro || p.createdAt || p.fechaActualizacion;
      const fecha = rawFecha
        ? new Date(rawFecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-';

      const nombreEst = (est.nombres && est.apellidos)
        ? `${est.nombres} ${est.apellidos}`
        : (est.nombres || p.estudianteNombre || 'Estudiante');
      const tituloCurso = p.cursoTitulo || curso.titulo || 'Curso Especializado';

      const isPagado = p.estado === 'PAGADO';
      const badgeEstado = isPagado
        ? `<span class="status-pill-success"><i class="fa fa-check-circle me-1"></i>Pagado</span>`
        : `<span class="badge bg-warning text-dark" style="font-size: 11px;">PENDIENTE</span>`;

      return `
        <tr>
          <td><strong class="font-monospace text-primary">${p.codigoOrden || 'ORD-000'}</strong></td>
          <td>
            <strong>${nombreEst}</strong>
            <span class="d-block text-muted" style="font-size: 11.5px;">DNI: ${est.dni || '-'}</span>
          </td>
          <td>${tituloCurso}</td>
          <td><strong>S/ ${Number(p.monto || 0).toFixed(2)}</strong></td>
          <td><span class="badge bg-light text-dark border font-monospace">${comp.serie ? comp.serie + '-' + String(comp.numeroCorrelativo || 1).padStart(6, '0') : '-'}</span></td>
          <td>${badgeEstado}</td>
          <td>${fecha}</td>
        </tr>
      `;
    }).join('');
  }

  async cargarUsuariosAdmin(): Promise<void> {
    const tbody = document.getElementById('tabla-admin-usuarios-body');
    const metricUsuarios = document.getElementById('admin-metric-usuarios');

    try {
      this.adminUsuarios = await this.authService.obtenerUsuarios();
      if (metricUsuarios) metricUsuarios.textContent = String(this.adminUsuarios.length);
      const bUsuarios = document.getElementById('tab-badge-usuarios');
      if (bUsuarios) bUsuarios.textContent = String(this.adminUsuarios.length);

      this.renderTablaUsuariosAdmin(this.adminUsuarios);
    } catch (err: any) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error: ${err?.message}</td></tr>`;
      }
    }
  }

  private renderTablaUsuariosAdmin(lista: UserProfile[]): void {
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

  switchAdminTab(tab: string, updateHash = true): void {
    if (tab === 'resumen') {
      const m = document.getElementById('metricas-resumen');
      if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelectorAll('#main-menu a, #mobile_menu a').forEach(a => a.classList.remove('active'));
      const navRes = document.getElementById('nav-admin-resumen');
      if (navRes) navRes.classList.add('active');
      if (updateHash && typeof history !== 'undefined' && history.replaceState) {
        history.replaceState(null, '', '#resumen');
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

    document.querySelectorAll('#main-menu a, #mobile_menu a').forEach(a => a.classList.remove('active'));
    const navLink = document.getElementById('nav-admin-' + tab);
    if (navLink) navLink.classList.add('active');

    if (updateHash && typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', '#' + tab);
    }
  }

  abrirModalCrearCurso(): void {
    const modal = document.getElementById('modal-crear-curso');
    if (modal) modal.style.display = 'flex';
  }

  cerrarModalCrearCurso(): void {
    const modal = document.getElementById('modal-crear-curso');
    if (modal) modal.style.display = 'none';
  }

  toggleModalidadFields(val: string): void {
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

  async guardarNuevoCurso(e: Event): Promise<void> {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-crear-curso') as HTMLButtonElement | null;

    const titulo = (document.getElementById('nuevo-curso-titulo') as HTMLInputElement)?.value?.trim() || '';
    const descripcion = (document.getElementById('nuevo-curso-desc') as HTMLTextAreaElement)?.value?.trim() || '';
    const modalidad = (document.getElementById('nuevo-curso-modalidad') as HTMLSelectElement)?.value || 'VIRTUAL';
    const precio = parseFloat((document.getElementById('nuevo-curso-precio') as HTMLInputElement)?.value || '0');
    const aforoMaximo = parseInt((document.getElementById('nuevo-curso-aforo') as HTMLInputElement)?.value || '0', 10);
    const horario = (document.getElementById('nuevo-curso-horario') as HTMLInputElement)?.value?.trim() || '';
    const docenteId = (document.getElementById('nuevo-curso-docente') as HTMLSelectElement)?.value || 'a0000000-0000-0000-0000-000000000002';
    const enlaceClase = (document.getElementById('nuevo-curso-enlace') as HTMLInputElement)?.value?.trim() || null;
    const direccionClase = (document.getElementById('nuevo-curso-sede') as HTMLInputElement)?.value?.trim() || null;
    const aula = (document.getElementById('nuevo-curso-aula') as HTMLInputElement)?.value?.trim() || null;

    if (!titulo || !descripcion || !horario || isNaN(precio) || isNaN(aforoMaximo)) {
      this.notifications.showToast('Por favor completa todos los campos obligatorios.', 'warning');
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
      await this.cursoService.crearCurso(payload);
      this.notifications.showToast(`¡Curso "${titulo}" creado y publicado exitosamente!`, 'success');
      this.cerrarModalCrearCurso();
      const form = document.getElementById('form-crear-curso') as HTMLFormElement | null;
      if (form) form.reset();
      await this.cargarMetricasYCursos();
    } catch (err: any) {
      this.notifications.showToast('Error al crear curso: ' + err?.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa fa-check me-1"></i> Publicar Curso`;
      }
    }
  }
}
