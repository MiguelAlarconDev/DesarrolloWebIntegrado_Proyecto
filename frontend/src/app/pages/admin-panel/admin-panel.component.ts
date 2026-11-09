import { Component, AfterViewInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
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

			<!-- PESTAÑAS DE CONTROL ADMINISTRATIVO -->
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
								<i class="fa fa-th-list text-primary me-2"></i>Catálogo Central de Cursos
							</h4>
							<p class="text-muted" style="font-size: 13.5px; margin: 0;">Gestiona el aforo, modalidad y disponibilidad de los cursos en tiempo real:</p>
						</div>
						<div class="d-flex gap-2">
							<button type="button" class="btn btn-sm btn-success fw-bold px-3" (click)="abrirModalCrearCurso()">
								<i class="fa fa-plus me-1"></i> Crear Nuevo Curso
							</button>
						</div>
					</div>

					<div class="table-responsive">
						<table class="table table-hover align-middle" style="font-size: 13.5px;">
							<thead style="background: #f8fafc; color: #475569; font-weight: 700;">
								<tr>
									<th>Título y Horario</th>
									<th>Modalidad</th>
									<th>Precio Oficial</th>
									<th>Aforo y Vacantes</th>
									<th>Estado</th>
									<th class="text-end">Acciones</th>
								</tr>
							</thead>
							<tbody id="tabla-admin-cursos-body">
								<tr>
									<td colspan="6" class="text-center py-4 text-muted">
										<i class="fa fa-spinner fa-spin me-2"></i>Cargando cursos desde cursos-service...
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- PESTAÑA 2: MATRÍCULAS Y PAGOS -->
			<div id="seccion-admin-pedidos" style="display: none;">
				<div class="clean-surface">
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
						<div>
							<h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
								<i class="fa fa-credit-card text-success me-2"></i>Historial de Pagos y Comprobantes
							</h4>
							<p class="text-muted" style="font-size: 13.5px; margin: 0;">Transacciones procesadas a través de Mercado Pago y comprobantes de pago:</p>
						</div>
					</div>

					<div class="table-responsive">
						<table class="table table-hover align-middle" style="font-size: 13.5px;">
							<thead style="background: #f8fafc; color: #475569; font-weight: 700;">
								<tr>
									<th>Código Orden</th>
									<th>Estudiante</th>
									<th>Curso</th>
									<th>Monto Pagado</th>
									<th>Comprobante</th>
									<th>Fecha</th>
									<th>Estado</th>
								</tr>
							</thead>
							<tbody id="tabla-admin-pedidos-body">
								<tr>
									<td colspan="7" class="text-center py-4 text-muted">
										<i class="fa fa-spinner fa-spin me-2"></i>Cargando pedidos desde pedidos-service...
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- PESTAÑA 3: DIRECTORIO DE USUARIOS (CRUD COMPLETO) -->
			<div id="seccion-admin-usuarios" style="display: none;">
				<div class="clean-surface">
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
						<div>
							<h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
								<i class="fa fa-id-card-o text-purple me-2" style="color: #9333ea;"></i>Directorio de Usuarios y Roles
							</h4>
							<p class="text-muted" style="font-size: 13.5px; margin: 0;">Administra cuentas registradas en auth-service (Estudiantes, Docentes y Administradores):</p>
						</div>
						<div class="d-flex flex-wrap align-items-center gap-2">
							<div class="input-group input-group-sm" style="width: 250px;">
								<span class="input-group-text bg-white border-end-0"><i class="fa fa-search text-muted"></i></span>
								<input type="text" id="buscador-admin-usuarios" class="form-control border-start-0" placeholder="Buscar por DNI, nombre, correo..." (input)="filtrarUsuariosAdmin($any($event.target).value)">
							</div>
							<button type="button" class="btn btn-sm btn-primary fw-bold" (click)="abrirModalCrearUsuario()">
								<i class="fa fa-user-plus me-1"></i> Nuevo Usuario
							</button>
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
									<th style="width: 175px; text-align: center;">Acciones</th>
								</tr>
							</thead>
							<tbody id="tabla-admin-usuarios-body">
								<tr>
									<td colspan="7" class="text-center py-4 text-muted">
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
							<option value="a0000000-0000-0000-0000-000000000002">Ing. Roberto Mendoza</option>
							<option value="a0000000-0000-0000-0000-000000000004">Prof. Carlos Mendoza</option>
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

	<!-- MODAL: EDITAR USUARIO -->
	<div id="modal-editar-usuario" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.75); z-index: 9999999; align-items: center; justify-content: center; backdrop-filter: blur(4px); overflow-y: auto; padding: 20px 0;">
		<div style="background: #ffffff; border-radius: 16px; padding: 28px 24px; max-width: 550px; width: 92%; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25); max-height: 90vh; overflow-y: auto;">
			<div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
				<h4 style="font-weight: 800; color: #0f172a; margin: 0;">
					<i class="fa fa-pencil text-primary me-2"></i>Editar Cuenta de Usuario
				</h4>
				<button type="button" class="btn-close" (click)="cerrarModalEditarUsuario()"></button>
			</div>

			<form id="form-editar-usuario" (submit)="guardarUsuarioEditado($event)">
				<input type="hidden" id="edit-user-id">

				<div class="row g-3">
					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Nombres *</label>
						<input type="text" id="edit-user-nombres" class="form-control form-control-sm" required>
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Apellidos *</label>
						<input type="text" id="edit-user-apellidos" class="form-control form-control-sm" required>
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">DNI (8 a 15 dígitos) *</label>
						<input type="text" id="edit-user-dni" class="form-control form-control-sm" maxlength="15" required>
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">WhatsApp Oficial *</label>
						<input type="text" id="edit-user-whatsapp" class="form-control form-control-sm" placeholder="+51935300159" required>
					</div>

					<div class="col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Correo Electrónico *</label>
						<input type="email" id="edit-user-correo" class="form-control form-control-sm" required>
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Rol en el Sistema *</label>
						<select id="edit-user-rol" class="form-select form-select-sm fw-bold">
							<option value="ESTUDIANTE">ESTUDIANTE (Alumno)</option>
							<option value="DOCENTE">DOCENTE (Profesor)</option>
							<option value="ADMIN">ADMIN (Administrador)</option>
						</select>
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Seguridad 2FA (WhatsApp OTP) *</label>
						<select id="edit-user-2fa" class="form-select form-select-sm">
							<option value="false">Desactivado</option>
							<option value="true">Activado (Requiere código OTP)</option>
						</select>
					</div>

					<div class="col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Restablecer Contraseña (Opcional)</label>
						<input type="password" id="edit-user-password" class="form-control form-control-sm" placeholder="Dejar en blanco para conservar la actual">
						<small class="text-muted" style="font-size: 11px;">Solo escribe aquí si deseas cambiarle la contraseña a este usuario.</small>
					</div>
				</div>

				<div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
					<button type="button" class="btn btn-outline-secondary btn-sm" (click)="cerrarModalEditarUsuario()">Cancelar</button>
					<button type="submit" class="btn btn-primary btn-sm fw-bold px-3" id="btn-submit-editar-usuario">
						<i class="fa fa-save me-1"></i> Guardar Cambios
					</button>
				</div>
			</form>
		</div>
	</div>

	<!-- MODAL: CREAR NUEVO USUARIO -->
	<div id="modal-crear-usuario" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.75); z-index: 9999999; align-items: center; justify-content: center; backdrop-filter: blur(4px); overflow-y: auto; padding: 20px 0;">
		<div style="background: #ffffff; border-radius: 16px; padding: 28px 24px; max-width: 550px; width: 92%; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25); max-height: 90vh; overflow-y: auto;">
			<div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
				<h4 style="font-weight: 800; color: #0f172a; margin: 0;">
					<i class="fa fa-user-plus text-success me-2"></i>Registrar Nuevo Usuario
				</h4>
				<button type="button" class="btn-close" (click)="cerrarModalCrearUsuario()"></button>
			</div>

			<form id="form-crear-usuario" (submit)="guardarNuevoUsuario($event)">
				<div class="row g-3">
					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Nombres *</label>
						<input type="text" id="nuevo-user-nombres" class="form-control form-control-sm" required placeholder="Ej: Pedro">
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Apellidos *</label>
						<input type="text" id="nuevo-user-apellidos" class="form-control form-control-sm" required placeholder="Ej: Sánchez">
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">DNI (8 dígitos) *</label>
						<input type="text" id="nuevo-user-dni" class="form-control form-control-sm" maxlength="15" required placeholder="72109845">
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">WhatsApp Oficial *</label>
						<input type="text" id="nuevo-user-whatsapp" class="form-control form-control-sm" placeholder="+51935300159" required>
					</div>

					<div class="col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Correo Electrónico *</label>
						<input type="email" id="nuevo-user-correo" class="form-control form-control-sm" required placeholder="usuario@cursos.com">
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Rol en el Sistema *</label>
						<select id="nuevo-user-rol" class="form-select form-select-sm fw-bold">
							<option value="ESTUDIANTE">ESTUDIANTE (Alumno)</option>
							<option value="DOCENTE">DOCENTE (Profesor)</option>
							<option value="ADMIN">ADMIN (Administrador)</option>
						</select>
					</div>

					<div class="col-md-6 col-12">
						<label class="form-label fw-bold" style="font-size: 12.5px;">Contraseña Inicial *</label>
						<input type="password" id="nuevo-user-password" class="form-control form-control-sm" required placeholder="123456" value="123456">
					</div>
				</div>

				<div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
					<button type="button" class="btn btn-outline-secondary btn-sm" (click)="cerrarModalCrearUsuario()">Cancelar</button>
					<button type="submit" class="btn btn-success btn-sm fw-bold px-3" id="btn-submit-crear-usuario">
						<i class="fa fa-check me-1"></i> Crear Usuario
					</button>
				</div>
			</form>
		</div>
	</div>

	<!-- MODAL: CONFIRMAR ELIMINAR USUARIO -->
	<div id="modal-eliminar-usuario" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.75); z-index: 9999999; align-items: center; justify-content: center; backdrop-filter: blur(4px); padding: 16px;">
		<div style="background: #ffffff; border-radius: 16px; padding: 28px 24px; max-width: 440px; width: 100%; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3); text-align: center;">
			<div style="width: 56px; height: 56px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 14px;">
				<i class="fa fa-trash"></i>
			</div>
			<h4 style="font-weight: 800; color: #0f172a; margin-bottom: 8px;">¿Eliminar este Usuario?</h4>
			<p class="text-muted" style="font-size: 13.5px; margin-bottom: 14px;">
				Estás a punto de eliminar permanentemente la cuenta de:
			</p>

			<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: left;">
				<div class="mb-1"><strong>Nombre:</strong> <span id="delete-user-nombre">-</span></div>
				<div><strong>Correo:</strong> <span id="delete-user-correo" class="text-muted">-</span></div>
			</div>

			<input type="hidden" id="delete-user-id">

			<div class="d-flex justify-content-center gap-2">
				<button type="button" class="btn btn-outline-secondary btn-sm px-3" (click)="cerrarModalEliminarUsuario()">Cancelar</button>
				<button type="button" class="btn btn-danger btn-sm fw-bold px-3" id="btn-submit-eliminar-usuario" (click)="ejecutarEliminarUsuario()">
					<i class="fa fa-trash me-1"></i> Sí, Eliminar Cuenta
				</button>
			</div>
		</div>
	</div>
  `
})
export class AdminPanelComponent implements AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cursoService = inject(CursoService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);
  private routeSub?: Subscription;

  adminCursos: CursoModel[] = [];
  adminPedidos: any[] = [];
  adminUsuarios: UserProfile[] = [];

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      const w = window as any;
      w.switchAdminTab = (tab: string) => this.switchAdminTab(tab);
      w.cambiarEstadoCurso = (id: string, estado: string) => this.cambiarEstadoCurso(id, estado);
      w.abrirModalEditarUsuario = (id: string) => this.abrirModalEditarUsuario(id);
      w.confirmarEliminarUsuario = (id: string, nombre: string, correo: string) => this.confirmarEliminarUsuario(id, nombre, correo);

      window.addEventListener('hashchange', () => {
        const h = (window.location.hash || '').replace('#', '').toLowerCase();
        if (['cursos', 'pedidos', 'usuarios', 'resumen'].includes(h)) {
          this.switchAdminTab(h, false);
        }
      });
    }

    this.routeSub = this.route.fragment.subscribe(fragment => {
      if (fragment && ['cursos', 'pedidos', 'usuarios', 'resumen'].includes(fragment.toLowerCase())) {
        this.switchAdminTab(fragment.toLowerCase(), false);
      }
    });

    this.initPortalAdmin();
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
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

    const routeFrag = (this.route.snapshot.fragment || '').toLowerCase();
    const hashTab = (window.location.hash || '').replace('#', '').toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const queryTab = (urlParams.get('tab') || '').toLowerCase();
    const pathTab = (typeof window !== 'undefined' && window.location.pathname.includes('usuarios')) ? 'usuarios' : '';
    const targetTab = routeFrag || hashTab || queryTab || pathTab;
    const initialTab = (targetTab === 'resumen' || targetTab === 'pedidos' || targetTab === 'usuarios') ? targetTab : 'cursos';

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
      let totalIngresos = 0;

      this.adminPedidos.forEach(p => {
        if (p.estado === 'PAGADO') {
          pagadas++;
          totalIngresos += Number(p.montoTotal || p.monto || 0);
        }
      });

      if (metricMatriculas) metricMatriculas.textContent = String(pagadas);
      if (metricIngresos) metricIngresos.textContent = `S/ ${totalIngresos.toFixed(2)}`;

      const bPedidos = document.getElementById('tab-badge-pedidos');
      if (bPedidos) bPedidos.textContent = String(this.adminPedidos.length);

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
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hay registros de matrículas ni compras.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map((p) => {
      const est = p.estudiante || {};
      const estNombre = (est.nombres && est.apellidos) ? `${est.nombres} ${est.apellidos}` : (p.estudianteNombre || 'Estudiante');
      const comp = p.comprobante || {};
      const numComp = comp.serie && comp.numeroCorrelativo
        ? `${comp.serie}-${String(comp.numeroCorrelativo).padStart(6, '0')}`
        : '-';

      const fechaStr = p.createdAt || p.fechaCreacion || p.fechaRegistro || p.fechaActualizacion;
      const fechaFmt = fechaStr ? new Date(fechaStr).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente';

      const estadoPill = p.estado === 'PAGADO'
        ? `<span class="badge bg-success" style="font-size: 11px;"><i class="fa fa-check me-1"></i>PAGADO</span>`
        : `<span class="badge bg-warning text-dark" style="font-size: 11px;">PENDIENTE</span>`;

      return `
        <tr>
          <td><span class="font-monospace fw-bold text-primary">${p.codigoOrden || 'ORD-MAT'}</span></td>
          <td>
            <strong>${estNombre}</strong>
            <span class="d-block text-muted" style="font-size: 11.5px;">${est.correo || ''}</span>
          </td>
          <td>${p.cursoTitulo || 'Curso Especializado'}</td>
          <td><strong>S/ ${Number(p.montoTotal || p.monto || 0).toFixed(2)}</strong></td>
          <td><span class="font-monospace text-secondary fw-semibold">${numComp}</span></td>
          <td>${fechaFmt}</td>
          <td>${estadoPill}</td>
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
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error: ${err?.message}</td></tr>`;
      }
    }
  }

  filtrarUsuariosAdmin(query: string): void {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      this.renderTablaUsuariosAdmin(this.adminUsuarios);
      return;
    }
    const filtrados = this.adminUsuarios.filter(u => {
      const nom = `${u.nombres || ''} ${u.apellidos || ''}`.toLowerCase();
      const dni = (u.dni || '').toLowerCase();
      const cor = (u.correo || '').toLowerCase();
      const tel = (u.whatsapp || '').toLowerCase();
      const rol = (u.rol || '').toLowerCase();
      return nom.includes(q) || dni.includes(q) || cor.includes(q) || tel.includes(q) || rol.includes(q);
    });
    this.renderTablaUsuariosAdmin(filtrados);
  }

  private renderTablaUsuariosAdmin(lista: UserProfile[]): void {
    const tbody = document.getElementById('tabla-admin-usuarios-body');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron usuarios para este criterio.</td></tr>`;
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

      const safeNombre = `${u.nombres || ''} ${u.apellidos || ''}`.replace(/'/g, "\\'");
      const esAdminPrincipal = u.correo === 'admin@cursos.com';

      return `
        <tr>
          <td><span class="font-monospace fw-bold">${u.dni || '-'}</span></td>
          <td><strong>${u.nombres || ''} ${u.apellidos || ''}</strong></td>
          <td>${u.correo || ''}</td>
          <td><span class="badge bg-light text-dark font-monospace">${u.whatsapp || '-'}</span></td>
          <td>${badgeRol}</td>
          <td>${badge2fa}</td>
          <td style="text-align: center;">
            <div class="d-inline-flex gap-1">
              <button type="button" class="btn btn-sm btn-outline-primary py-1 px-2" title="Editar datos y rol" onclick="window.abrirModalEditarUsuario('${u.id}')">
                <i class="fa fa-pencil me-1"></i>Editar
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger py-1 px-2" title="Eliminar cuenta de usuario" onclick="window.confirmarEliminarUsuario('${u.id}', '${safeNombre}', '${u.correo}')" ${esAdminPrincipal ? 'disabled title="No se puede eliminar el administrador principal"' : ''}>
                <i class="fa fa-trash me-1"></i>Eliminar
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================
  // MODAL EDITAR USUARIO
  // ==========================================
  async abrirModalEditarUsuario(id: string): Promise<void> {
    let usuario = this.adminUsuarios.find(u => u.id === id);
    if (!usuario) {
      try {
        usuario = await this.authService.obtenerUsuarioPorId(id);
      } catch (_) {}
    }
    if (!usuario) {
      this.notifications.showToast('Usuario no encontrado.', 'warning');
      return;
    }

    const modal = document.getElementById('modal-editar-usuario');
    const inputId = document.getElementById('edit-user-id') as HTMLInputElement | null;
    const inputNombres = document.getElementById('edit-user-nombres') as HTMLInputElement | null;
    const inputApellidos = document.getElementById('edit-user-apellidos') as HTMLInputElement | null;
    const inputDni = document.getElementById('edit-user-dni') as HTMLInputElement | null;
    const inputWhatsapp = document.getElementById('edit-user-whatsapp') as HTMLInputElement | null;
    const inputCorreo = document.getElementById('edit-user-correo') as HTMLInputElement | null;
    const selectRol = document.getElementById('edit-user-rol') as HTMLSelectElement | null;
    const select2fa = document.getElementById('edit-user-2fa') as HTMLSelectElement | null;
    const inputPwd = document.getElementById('edit-user-password') as HTMLInputElement | null;

    if (inputId) inputId.value = usuario.id;
    if (inputNombres) inputNombres.value = usuario.nombres || '';
    if (inputApellidos) inputApellidos.value = usuario.apellidos || '';
    if (inputDni) inputDni.value = usuario.dni || '';
    if (inputWhatsapp) inputWhatsapp.value = usuario.whatsapp || '';
    if (inputCorreo) inputCorreo.value = usuario.correo || '';
    if (selectRol) selectRol.value = usuario.rol || 'ESTUDIANTE';
    if (select2fa) select2fa.value = String(Boolean(usuario.is2faEnabled));
    if (inputPwd) inputPwd.value = '';

    if (modal) modal.style.display = 'flex';
  }

  cerrarModalEditarUsuario(): void {
    const modal = document.getElementById('modal-editar-usuario');
    if (modal) modal.style.display = 'none';
  }

  async guardarUsuarioEditado(e: Event): Promise<void> {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-editar-usuario') as HTMLButtonElement | null;

    const id = (document.getElementById('edit-user-id') as HTMLInputElement)?.value;
    const nombres = (document.getElementById('edit-user-nombres') as HTMLInputElement)?.value?.trim();
    const apellidos = (document.getElementById('edit-user-apellidos') as HTMLInputElement)?.value?.trim();
    const dni = (document.getElementById('edit-user-dni') as HTMLInputElement)?.value?.trim();
    const whatsapp = (document.getElementById('edit-user-whatsapp') as HTMLInputElement)?.value?.trim();
    const correo = (document.getElementById('edit-user-correo') as HTMLInputElement)?.value?.trim();
    const rol = (document.getElementById('edit-user-rol') as HTMLSelectElement)?.value;
    const is2faEnabled = (document.getElementById('edit-user-2fa') as HTMLSelectElement)?.value === 'true';
    const password = (document.getElementById('edit-user-password') as HTMLInputElement)?.value?.trim();

    if (!id || !nombres || !apellidos || !dni || !correo || !whatsapp) {
      this.notifications.showToast('Por favor completa todos los campos obligatorios.', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa fa-spinner fa-spin me-1"></i> Guardando...`;
    }

    try {
      const payload: any = {
        nombres,
        apellidos,
        dni,
        whatsapp,
        correo,
        rol,
        is2faEnabled
      };
      if (password) {
        payload.password = password;
      }

      await this.authService.actualizarUsuario(id, payload);
      this.notifications.showToast(`¡Usuario "${nombres} ${apellidos}" actualizado exitosamente!`, 'success');
      this.cerrarModalEditarUsuario();
      await this.cargarUsuariosAdmin();
    } catch (err: any) {
      this.notifications.showToast('Error al actualizar usuario: ' + err?.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa fa-save me-1"></i> Guardar Cambios`;
      }
    }
  }

  // ==========================================
  // MODAL CREAR NUEVO USUARIO
  // ==========================================
  abrirModalCrearUsuario(): void {
    const modal = document.getElementById('modal-crear-usuario');
    const form = document.getElementById('form-crear-usuario') as HTMLFormElement | null;
    if (form) form.reset();
    const pwdInput = document.getElementById('nuevo-user-password') as HTMLInputElement | null;
    if (pwdInput) pwdInput.value = '123456';
    if (modal) modal.style.display = 'flex';
  }

  cerrarModalCrearUsuario(): void {
    const modal = document.getElementById('modal-crear-usuario');
    if (modal) modal.style.display = 'none';
  }

  async guardarNuevoUsuario(e: Event): Promise<void> {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-crear-usuario') as HTMLButtonElement | null;

    const nombres = (document.getElementById('nuevo-user-nombres') as HTMLInputElement)?.value?.trim();
    const apellidos = (document.getElementById('nuevo-user-apellidos') as HTMLInputElement)?.value?.trim();
    const dni = (document.getElementById('nuevo-user-dni') as HTMLInputElement)?.value?.trim();
    const whatsapp = (document.getElementById('nuevo-user-whatsapp') as HTMLInputElement)?.value?.trim();
    const correo = (document.getElementById('nuevo-user-correo') as HTMLInputElement)?.value?.trim();
    const rol = (document.getElementById('nuevo-user-rol') as HTMLSelectElement)?.value || 'ESTUDIANTE';
    const password = (document.getElementById('nuevo-user-password') as HTMLInputElement)?.value?.trim() || '123456';

    if (!nombres || !apellidos || !dni || !correo || !whatsapp || !password) {
      this.notifications.showToast('Por favor completa todos los campos requeridos.', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa fa-spinner fa-spin me-1"></i> Registrando...`;
    }

    try {
      await this.authService.registro({
        nombres,
        apellidos,
        dni,
        whatsapp,
        correo,
        rol,
        password,
        is2faEnabled: rol === 'DOCENTE' || rol === 'ADMIN'
      });

      this.notifications.showToast(`¡Usuario "${nombres} ${apellidos}" creado exitosamente!`, 'success');
      this.cerrarModalCrearUsuario();
      await this.cargarUsuariosAdmin();
    } catch (err: any) {
      this.notifications.showToast('Error al registrar usuario: ' + err?.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa fa-check me-1"></i> Crear Usuario`;
      }
    }
  }

  // ==========================================
  // MODAL ELIMINAR USUARIO
  // ==========================================
  confirmarEliminarUsuario(id: string, nombre: string, correo: string): void {
    if (correo === 'admin@cursos.com') {
      this.notifications.showToast('No es posible eliminar la cuenta principal de Administrador.', 'warning');
      return;
    }

    const modal = document.getElementById('modal-eliminar-usuario');
    const inputId = document.getElementById('delete-user-id') as HTMLInputElement | null;
    const spanNombre = document.getElementById('delete-user-nombre');
    const spanCorreo = document.getElementById('delete-user-correo');

    if (inputId) inputId.value = id;
    if (spanNombre) spanNombre.textContent = nombre;
    if (spanCorreo) spanCorreo.textContent = correo;

    if (modal) modal.style.display = 'flex';
  }

  cerrarModalEliminarUsuario(): void {
    const modal = document.getElementById('modal-eliminar-usuario');
    if (modal) modal.style.display = 'none';
  }

  async ejecutarEliminarUsuario(): Promise<void> {
    const inputId = document.getElementById('delete-user-id') as HTMLInputElement | null;
    const btn = document.getElementById('btn-submit-eliminar-usuario') as HTMLButtonElement | null;
    const id = inputId ? inputId.value : null;

    if (!id) return;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa fa-spinner fa-spin me-1"></i> Eliminando...`;
    }

    try {
      await this.authService.eliminarUsuario(id);
      this.notifications.showToast('¡Usuario eliminado exitosamente del sistema!', 'success');
      this.cerrarModalEliminarUsuario();
      await this.cargarUsuariosAdmin();
    } catch (err: any) {
      this.notifications.showToast('Error al eliminar usuario: ' + err?.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa fa-trash me-1"></i> Sí, Eliminar Cuenta`;
      }
    }
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
