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
						<li> / Gestión Académica, Calificaciones y Asistencias</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->

	<!-- CONTENIDO DEL PORTAL DOCENTE -->
	<div class="section-padding" style="background: #f8fafc; min-height: 70vh;">
		<div class="container">
			
			<!-- PERFIL DOCENTE Y MÉTRICAS -->
			<div class="row mb-4">
				<div class="col-12">
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 pb-3 border-bottom" style="border-color: #e2e8f0 !important;">
						<div class="d-flex align-items-center gap-3">
							<div style="width: 48px; height: 48px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 22px;">
								<i class="fa fa-user"></i>
							</div>
							<div>
								<div class="d-flex align-items-center gap-2">
									<h3 id="docente-nombre-header" style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 0;">Prof. Carlos Mendoza</h3>
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

			<!-- PESTAÑAS DE TRABAJO (4 MENÚS: CURSOS, ALUMNOS, GRADEBOOK, ASISTENCIAS) -->
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
							<button type="button" class="platform-tab-btn" id="tab-btn-calificaciones" (click)="switchDocenteTab('calificaciones')">
								<i class="fa fa-calculator me-1"></i>
								<span>Libro de Calificaciones</span>
								<span class="platform-tab-badge" id="docente-tab-badge-calificaciones">0 - 20</span>
							</button>
							<button type="button" class="platform-tab-btn" id="tab-btn-asistencias" (click)="switchDocenteTab('asistencias')">
								<i class="fa fa-calendar-check-o me-1"></i>
								<span>Control de Asistencias</span>
								<span class="platform-tab-badge" id="docente-tab-badge-asistencias">Sesiones</span>
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
							<p class="text-muted" style="font-size: 13.5px; margin: 0;">Estudiantes registrados en la base de datos con matrícula confirmada:</p>
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
									<th>Condición Académica & Certificación</th>
								</tr>
							</thead>
							<tbody id="tabla-participantes-body">
								<tr>
									<td colspan="9" class="text-center py-4 text-muted">
										<i class="fa fa-spinner fa-spin me-2"></i>Cargando nómina oficial de alumnos...
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- SECCIÓN 3: LIBRO DE CALIFICACIONES DETALLADO (GRADEBOOK 0 A 20) -->
			<div id="seccion-calificaciones-docente" style="display: none;">
				<div class="clean-surface">
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
						<div>
							<h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
								<i class="fa fa-calculator text-primary me-2"></i>Libro de Calificaciones Detallado (Gradebook Oficial)
							</h4>
							<p class="text-muted" style="font-size: 13.5px; margin: 0;">
								Fórmula ponderada: <strong>EC1 / Tareas (20%)</strong> + <strong>EC2 / Continuas (30%)</strong> + <strong>Proyecto Final (50%)</strong>. Nota de aprobación: <strong>≥ 14.0</strong>.
							</p>
						</div>
						<div class="d-flex flex-wrap align-items-center gap-2">
							<select id="select-curso-calificaciones" class="form-select form-select-sm" style="min-width: 280px; font-weight: 600;" (change)="onCursoCalificacionesChange($any($event.target).value)">
								<!-- cargado dinámicamente -->
							</select>
							<button type="button" class="btn btn-sm btn-primary fw-bold" id="btn-guardar-todas-calificaciones" (click)="guardarTodasCalificaciones()">
								<i class="fa fa-save me-1"></i> Guardar Todo el Salón
							</button>
						</div>
					</div>

					<!-- TARJETAS DE RESUMEN DE NOTAS -->
					<div class="row g-3 mb-4">
						<div class="col-md-3 col-6">
							<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px;">
								<span class="text-muted text-uppercase" style="font-size: 11px; font-weight: 700;">Alumnos Calificados</span>
								<div id="resumen-evaluados" style="font-size: 20px; font-weight: 800; color: #0f172a;">-</div>
							</div>
						</div>
						<div class="col-md-3 col-6">
							<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px;">
								<span class="text-success text-uppercase" style="font-size: 11px; font-weight: 700;">Aprobados (≥ 14.0)</span>
								<div id="resumen-aprobados" style="font-size: 20px; font-weight: 800; color: #16a34a;">-</div>
							</div>
						</div>
						<div class="col-md-3 col-6">
							<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px;">
								<span class="text-danger text-uppercase" style="font-size: 11px; font-weight: 700;">Desaprobados (&lt; 14.0)</span>
								<div id="resumen-desaprobados" style="font-size: 20px; font-weight: 800; color: #dc2626;">-</div>
							</div>
						</div>
						<div class="col-md-3 col-6">
							<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px;">
								<span class="text-primary text-uppercase" style="font-size: 11px; font-weight: 700;">Promedio del Salón</span>
								<div id="resumen-promedio-general" style="font-size: 20px; font-weight: 800; color: #2563eb;">- / 20</div>
							</div>
						</div>
					</div>

					<!-- TABLA DE CALIFICACIONES CON INPUTS 0 A 20 -->
					<div class="table-responsive">
						<table class="table table-hover align-middle" style="font-size: 13.5px;">
							<thead style="background: #f8fafc; color: #475569; font-weight: 700;">
								<tr>
									<th style="width: 35px;">#</th>
									<th style="min-width: 170px;">Estudiante</th>
									<th style="width: 95px; text-align: center;">EC1 (20%)<br><small class="text-muted fw-normal">0 - 20</small></th>
									<th style="width: 95px; text-align: center;">EC2 (30%)<br><small class="text-muted fw-normal">0 - 20</small></th>
									<th style="width: 105px; text-align: center;">Proyecto (50%)<br><small class="text-muted fw-normal">0 - 20</small></th>
									<th style="width: 110px; text-align: center;">Promedio Ponderado</th>
									<th style="width: 115px; text-align: center;">Condición</th>
									<th style="min-width: 240px;">Retroalimentación / Feedback del Profesor</th>
									<th style="width: 85px; text-align: center;">Acción</th>
								</tr>
							</thead>
							<tbody id="tabla-calificaciones-body">
								<tr>
									<td colspan="9" class="text-center py-4 text-muted">
										<i class="fa fa-spinner fa-spin me-2 text-primary"></i>Cargando registro de calificaciones...
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- SECCIÓN 4: CONTROL Y REGISTRO DE ASISTENCIAS POR SESIÓN -->
			<div id="seccion-asistencias-docente" style="display: none;">
				<div class="clean-surface">
					<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
						<div>
							<h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
								<i class="fa fa-calendar-check-o text-success me-2"></i>Control de Asistencias por Sesión de Clase
							</h4>
							<p class="text-muted" style="font-size: 13.5px; margin: 0;">
								Marcación en 1 clic: <strong>P</strong> (Presente), <strong>T</strong> (Tardanza = 0.5 falta), <strong>FJ</strong> (Falta Justificada), <strong>F</strong> (Falta Injustificada). Alerta: <strong>Inhabilitado si &gt; 30% inasistencias</strong>.
							</p>
						</div>
						<div class="d-flex flex-wrap align-items-center gap-2">
							<button type="button" class="btn btn-sm btn-outline-success" (click)="marcarTodosPresentes()" title="Marcar Presente a todos">
								<i class="fa fa-check-circle me-1"></i> Todos Presentes (P)
							</button>
							<button type="button" class="btn btn-sm btn-success fw-bold" id="btn-guardar-asistencias" (click)="guardarAsistenciasSesion()">
								<i class="fa fa-save me-1"></i> Guardar Asistencia de la Sesión
							</button>
						</div>
					</div>

					<!-- SELECTORES DE SESIÓN, FECHA Y TEMA -->
					<div class="p-3 mb-4" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
						<div class="row g-3 align-items-end">
							<div class="col-md-4 col-12">
								<label class="form-label text-muted fw-bold mb-1" style="font-size: 12px;">Curso Asignado *</label>
								<select id="select-curso-asistencias" class="form-select form-select-sm fw-bold" (change)="onCursoAsistenciaChange($any($event.target).value)">
									<!-- cargado dinámicamente -->
								</select>
							</div>
							<div class="col-md-2 col-6">
								<label class="form-label text-muted fw-bold mb-1" style="font-size: 12px;">N° de Sesión *</label>
								<select id="select-sesion-asistencias" class="form-select form-select-sm fw-bold" (change)="onSesionChange($any($event.target).value)">
									<option value="1">Sesión 1</option>
									<option value="2">Sesión 2</option>
									<option value="3">Sesión 3</option>
									<option value="4">Sesión 4</option>
									<option value="5">Sesión 5</option>
									<option value="6">Sesión 6</option>
									<option value="7">Sesión 7</option>
									<option value="8">Sesión 8</option>
									<option value="9">Sesión 9</option>
									<option value="10">Sesión 10</option>
									<option value="11">Sesión 11</option>
									<option value="12">Sesión 12</option>
								</select>
							</div>
							<div class="col-md-2 col-6">
								<label class="form-label text-muted fw-bold mb-1" style="font-size: 12px;">Fecha de Sesión *</label>
								<input type="date" id="input-fecha-sesion" class="form-control form-control-sm" (change)="cambiarFechaSesion($any($event.target).value)">
							</div>
							<div class="col-md-4 col-12">
								<label class="form-label text-muted fw-bold mb-1" style="font-size: 12px;">Tema o Contenido de la Sesión</label>
								<input type="text" id="input-tema-sesion" class="form-control form-control-sm" placeholder="Ej: Arquitectura de Microservicios con Spring Boot" (input)="cambiarTemaSesion($any($event.target).value)">
							</div>
						</div>
					</div>

					<!-- TARJETAS DE MÉTRICAS DE LA SESIÓN -->
					<div class="row g-3 mb-4">
						<div class="col-md-2 col-6">
							<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; text-align: center;">
								<span class="text-muted text-uppercase" style="font-size: 10.5px; font-weight: 700;">Total Alumnos</span>
								<div id="resumen-asist-total" style="font-size: 18px; font-weight: 800; color: #0f172a;">-</div>
							</div>
						</div>
						<div class="col-md-2 col-6">
							<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; text-align: center;">
								<span class="text-success text-uppercase" style="font-size: 10.5px; font-weight: 700;">Presentes (P)</span>
								<div id="resumen-asist-p" style="font-size: 18px; font-weight: 800; color: #16a34a;">0</div>
							</div>
						</div>
						<div class="col-md-2 col-6">
							<div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 10px 14px; text-align: center;">
								<span class="text-warning text-uppercase" style="font-size: 10.5px; font-weight: 700;">Tardanzas (T)</span>
								<div id="resumen-asist-t" style="font-size: 18px; font-weight: 800; color: #ca8a04;">0</div>
							</div>
						</div>
						<div class="col-md-2 col-6">
							<div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 14px; text-align: center;">
								<span class="text-info text-uppercase" style="font-size: 10.5px; font-weight: 700;">Falta Justificada (FJ)</span>
								<div id="resumen-asist-fj" style="font-size: 18px; font-weight: 800; color: #0284c7;">0</div>
							</div>
						</div>
						<div class="col-md-2 col-6">
							<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; text-align: center;">
								<span class="text-danger text-uppercase" style="font-size: 10.5px; font-weight: 700;">Faltas (F)</span>
								<div id="resumen-asist-f" style="font-size: 18px; font-weight: 800; color: #dc2626;">0</div>
							</div>
						</div>
						<div class="col-md-2 col-6">
							<div style="background: #fff1f2; border: 1px solid #fda4af; border-radius: 8px; padding: 10px 14px; text-align: center;">
								<span class="text-danger text-uppercase" style="font-size: 10.5px; font-weight: 700;">Inhabilitados (>30%)</span>
								<div id="resumen-asist-inhabilitados" style="font-size: 18px; font-weight: 800; color: #e11d48;">0</div>
							</div>
						</div>
					</div>

					<!-- TABLA DE ASISTENCIA POR ALUMNO -->
					<div class="table-responsive">
						<table class="table table-hover align-middle" style="font-size: 13.5px;">
							<thead style="background: #f8fafc; color: #475569; font-weight: 700;">
								<tr>
									<th style="width: 35px;">#</th>
									<th style="min-width: 180px;">Estudiante</th>
									<th style="min-width: 220px; text-align: center;">Marcación de Asistencia (Sesión)</th>
									<th style="min-width: 170px;">Observación</th>
									<th style="width: 110px; text-align: center;">% Inasistencias</th>
									<th style="width: 140px; text-align: center;">Condición de Asistencia</th>
								</tr>
							</thead>
							<tbody id="tabla-asistencias-body">
								<tr>
									<td colspan="6" class="text-center py-4 text-muted">
										<i class="fa fa-spinner fa-spin me-2 text-success"></i>Cargando registro de asistencias...
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

  // Estado del Gradebook (Libro de Calificaciones)
  cursoSeleccionadoCalificaciones: string = '';
  calificacionesAlumnos: any[] = [];

  // Estado del Control de Asistencias
  cursoSeleccionadoAsistencias: string = '';
  sesionSeleccionadaAsistencias: number = 1;
  fechaSesionAsistencias: string = new Date().toISOString().split('T')[0];
  temaSesionAsistencias: string = '';
  asistenciasSesionAlumnos: any[] = [];
  resumenAsistenciasMap: Map<string, any> = new Map();

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      const w = window as any;
      w.switchDocenteTab = (tab: string) => this.switchDocenteTab(tab);
      w.abrirModalEnlace = (id: string, url: string) => this.abrirModalEnlace(id, url);
      w.abrirModalAula = (id: string, sede: string, aula: string) => this.abrirModalAula(id, sede, aula);
      w.verAlumnosDirecto = (id: string) => this.verAlumnosDirecto(id);
      w.docenteCalificarAlumno = (cid: string, estId: string, nombre: string) => this.calificarAlumno(cid, estId, nombre);
      w.docenteRevertirAlumno = (cid: string, estId: string) => this.revertirAlumno(cid, estId);

      // Bindings para Calificaciones
      w.onNotaChange = (eid: string, tipo: 'ec1' | 'ec2' | 'pf', val: string) => this.onNotaChange(eid, tipo, val);
      w.onFeedbackChange = (eid: string, fb: string) => this.onFeedbackChange(eid, fb);
      w.aplicarFeedbackRapido = (eid: string, txt: string) => this.aplicarFeedbackRapido(eid, txt);
      w.guardarCalificacionAlumno = (eid: string) => this.guardarCalificacionAlumno(eid);

      // Bindings para Asistencias
      w.marcarEstadoAsistencia = (eid: string, st: 'P' | 'T' | 'FJ' | 'F') => this.marcarEstadoAsistencia(eid, st);
      w.onObsAsistenciaChange = (eid: string, obs: string) => this.onObsAsistenciaChange(eid, obs);
    }
    this.initPortalDocente();
  }

  calificarAlumno(cursoId: string, estudianteId: string, nombre: string): void {
    this.pedidoService.guardarEvaluacionAcademica(cursoId, estudianteId, true, 18);
    this.notifications.showToast(`¡Estudiante ${nombre} aprobado con nota 18! Certificado oficial habilitado.`, 'success');
    this.renderTablaAlumnosDocente(this.misAlumnosCargados);
  }

  revertirAlumno(cursoId: string, estudianteId: string): void {
    this.pedidoService.guardarEvaluacionAcademica(cursoId, estudianteId, false);
    this.notifications.showToast('Condición actualizada a En Curso (Certificado bloqueado).', 'info');
    this.renderTablaAlumnosDocente(this.misAlumnosCargados);
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

    await this.cargarCursosDelDocente();

    this.switchDocenteTab(initialTab, false);
  }

  async cargarCursosDelDocente(): Promise<void> {
    const container = document.getElementById('docente-cursos-container');
    const selectParticipantes = document.getElementById('select-curso-participantes') as HTMLSelectElement | null;
    const selectCalificaciones = document.getElementById('select-curso-calificaciones') as HTMLSelectElement | null;
    const selectAsistencias = document.getElementById('select-curso-asistencias') as HTMLSelectElement | null;

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

      // Llenar selectores de cursos en pestañas
      const cursosOptions = this.misCursosDocente.map(c => `<option value="${c.id}">${c.titulo} (${c.modalidad})</option>`).join('');

      if (selectParticipantes) {
        selectParticipantes.innerHTML = `
          <option value="TODOS" selected>-- Todos mis cursos asignados --</option>
          ${cursosOptions}
        `;
      }

      if (selectCalificaciones) {
        selectCalificaciones.innerHTML = cursosOptions;
        if (this.misCursosDocente.length > 0) {
          selectCalificaciones.value = this.misCursosDocente[0].id;
          this.cursoSeleccionadoCalificaciones = this.misCursosDocente[0].id;
        }
      }

      if (selectAsistencias) {
        selectAsistencias.innerHTML = cursosOptions;
        if (this.misCursosDocente.length > 0) {
          selectAsistencias.value = this.misCursosDocente[0].id;
          this.cursoSeleccionadoAsistencias = this.misCursosDocente[0].id;
        }
      }

      const inputFecha = document.getElementById('input-fecha-sesion') as HTMLInputElement | null;
      if (inputFecha) inputFecha.value = this.fechaSesionAsistencias;

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
              <div class="d-flex gap-2">
                ${isVirtual ? `
                  <button type="button" class="btn btn-sm btn-outline-secondary fw-bold" onclick="window.abrirModalEnlace('${c.id}', '${safeEnlace}')">
                    <i class="fa fa-pencil me-1"></i> Enlace
                  </button>
                ` : `
                  <button type="button" class="btn btn-sm btn-outline-secondary fw-bold" onclick="window.abrirModalAula('${c.id}', '${safeSede}', '${safeAula}')">
                    <i class="fa fa-pencil me-1"></i> Aula
                  </button>
                `}
                <button type="button" class="btn btn-sm btn-outline-primary fw-bold" onclick="window.switchDocenteTab('calificaciones'); window.cargarCalificacionesDeCurso('${c.id}')" title="Abrir Libro de Calificaciones">
                  <i class="fa fa-calculator me-1"></i> Notas
                </button>
                <button type="button" class="btn btn-sm btn-outline-success fw-bold" onclick="window.switchDocenteTab('asistencias'); window.cargarAsistenciasDeCurso('${c.id}', 1)" title="Tomar Asistencias">
                  <i class="fa fa-calendar-check-o me-1"></i> Asistencia
                </button>
              </div>
              <button type="button" class="btn btn-sm btn-success fw-bold" onclick="window.verAlumnosDirecto('${c.id}')">
                <i class="fa fa-users me-1"></i> Alumnos (${inscritos})
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  switchDocenteTab(tab: string, updateHash = true): void {
    if (!['cursos', 'alumnos', 'calificaciones', 'asistencias'].includes(tab)) tab = 'cursos';

    const seccionCursos = document.getElementById('seccion-cursos-docente');
    const seccionAlumnos = document.getElementById('seccion-alumnos-docente');
    const seccionCalificaciones = document.getElementById('seccion-calificaciones-docente');
    const seccionAsistencias = document.getElementById('seccion-asistencias-docente');

    const btnCursos = document.getElementById('tab-btn-cursos');
    const btnAlumnos = document.getElementById('tab-btn-alumnos');
    const btnCalificaciones = document.getElementById('tab-btn-calificaciones');
    const btnAsistencias = document.getElementById('tab-btn-asistencias');

    // Ocultar todas las secciones
    if (seccionCursos) seccionCursos.style.display = 'none';
    if (seccionAlumnos) seccionAlumnos.style.display = 'none';
    if (seccionCalificaciones) seccionCalificaciones.style.display = 'none';
    if (seccionAsistencias) seccionAsistencias.style.display = 'none';

    // Desactivar botones
    [btnCursos, btnAlumnos, btnCalificaciones, btnAsistencias].forEach(b => {
      if (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      }
    });

    if (tab === 'cursos') {
      if (seccionCursos) seccionCursos.style.display = 'block';
      if (btnCursos) { btnCursos.classList.add('active'); btnCursos.setAttribute('aria-selected', 'true'); }
    } else if (tab === 'alumnos') {
      if (seccionAlumnos) seccionAlumnos.style.display = 'block';
      if (btnAlumnos) { btnAlumnos.classList.add('active'); btnAlumnos.setAttribute('aria-selected', 'true'); }
      if (!this.misAlumnosCargados || this.misAlumnosCargados.length === 0) {
        const select = document.getElementById('select-curso-participantes') as HTMLSelectElement | null;
        this.cargarAlumnosDeCurso(select ? (select.value || 'TODOS') : 'TODOS');
      }
    } else if (tab === 'calificaciones') {
      if (seccionCalificaciones) seccionCalificaciones.style.display = 'block';
      if (btnCalificaciones) { btnCalificaciones.classList.add('active'); btnCalificaciones.setAttribute('aria-selected', 'true'); }
      const select = document.getElementById('select-curso-calificaciones') as HTMLSelectElement | null;
      const cid = (select && select.value) ? select.value : (this.misCursosDocente[0]?.id || '');
      if (cid) {
        this.cargarCalificacionesDeCurso(cid);
      }
    } else if (tab === 'asistencias') {
      if (seccionAsistencias) seccionAsistencias.style.display = 'block';
      if (btnAsistencias) { btnAsistencias.classList.add('active'); btnAsistencias.setAttribute('aria-selected', 'true'); }
      const selectC = document.getElementById('select-curso-asistencias') as HTMLSelectElement | null;
      const selectS = document.getElementById('select-sesion-asistencias') as HTMLSelectElement | null;
      const cid = (selectC && selectC.value) ? selectC.value : (this.misCursosDocente[0]?.id || '');
      const sesion = selectS ? parseInt(selectS.value, 10) : 1;
      if (cid) {
        this.cargarAsistenciasDeCurso(cid, sesion);
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
          <td colspan="9" class="text-center py-5">
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
      const estudianteId = p.estudianteId || est.id || '';
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

      // Verificar evaluación académica guardada
      const evalItem = this.pedidoService.getEvaluacionAcademica(p.cursoId, estudianteId);
      const isAprobado = !!(evalItem && evalItem.aprobado);
      const notaVal = evalItem?.nota || 18;

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
          <td>
            <div class="d-flex align-items-center gap-2">
              ${isAprobado ? `
                <span class="badge bg-success" style="font-size: 11px;"><i class="fa fa-certificate me-1"></i>Aprobado (${notaVal}/20)</span>
                <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-1" onclick="window.docenteRevertirAlumno('${p.cursoId}', '${estudianteId}')" title="Revertir a En Curso"><i class="fa fa-undo"></i></button>
              ` : `
                <span class="badge bg-secondary" style="font-size: 11px;"><i class="fa fa-clock-o me-1"></i>En Curso</span>
                <button type="button" class="btn btn-sm btn-outline-primary py-0 px-2 fw-bold" onclick="window.switchDocenteTab('calificaciones'); window.cargarCalificacionesDeCurso('${p.cursoId}')" title="Ir al Libro de Calificaciones">
                  <i class="fa fa-calculator me-1"></i>Calificar
                </button>
              `}
            </div>
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
        <td colspan="9" class="text-center py-4 text-muted">
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
          <td colspan="9" class="text-center py-4 text-danger">
            <i class="fa fa-exclamation-triangle me-1"></i>No se pudieron cargar los alumnos: ${err?.message}
          </td>
        </tr>
      `;
    }
  }

  // =========================================================================
  // LIBRO DE CALIFICACIONES (GRADEBOOK 0 A 20)
  // =========================================================================
  onCursoCalificacionesChange(cursoId: string): void {
    this.cargarCalificacionesDeCurso(cursoId);
  }

  async cargarCalificacionesDeCurso(cursoId: string): Promise<void> {
    this.cursoSeleccionadoCalificaciones = cursoId;
    const select = document.getElementById('select-curso-calificaciones') as HTMLSelectElement | null;
    if (select && select.value !== cursoId) {
      select.value = cursoId;
    }

    const tbody = document.getElementById('tabla-calificaciones-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-4 text-muted">
            <i class="fa fa-spinner fa-spin me-2 text-primary"></i>Consultando libro de calificaciones en base de datos...
          </td>
        </tr>
      `;
    }

    try {
      // 1. Obtener los alumnos matriculados en este curso
      let participantes = await this.pedidoService.obtenerParticipantesCurso(cursoId);
      if (!participantes || participantes.length === 0) {
        // Fallback: buscar en pedidos generales
        const todos = await this.pedidoService.obtenerTodosPedidos();
        participantes = (todos || []).filter(p => p.cursoId === cursoId && p.estado === 'PAGADO');
      }

      // 2. Obtener las calificaciones oficiales guardadas en BD PostgreSQL
      const calificacionesBD = await this.cursoService.obtenerCalificaciones(cursoId);
      const notasMap = new Map<string, any>();
      (calificacionesBD || []).forEach(c => {
        if (c && c.estudianteId) notasMap.set(c.estudianteId, c);
      });

      // 3. Fusionar datos
      this.calificacionesAlumnos = (participantes || []).map(p => {
        const est = p.estudiante || {};
        const estId = p.estudianteId || est.id || '';
        const nombre = (est.nombres && est.apellidos) ? `${est.nombres} ${est.apellidos}` : (p.estudianteNombre || 'Estudiante');
        const dni = est.dni || '72481930';

        const notaExistente = notasMap.get(estId);
        const evalLocal = this.pedidoService.getEvaluacionAcademica(cursoId, estId);

        let ec1: number | null = null;
        let ec2: number | null = null;
        let pf: number | null = null;
        let promedio: number | null = null;
        let condicion = 'EN_CURSO';
        let feedback = '';

        if (notaExistente) {
          ec1 = notaExistente.ec1 !== undefined ? notaExistente.ec1 : null;
          ec2 = notaExistente.ec2 !== undefined ? notaExistente.ec2 : null;
          pf = notaExistente.proyectoFinal !== undefined ? notaExistente.proyectoFinal : null;
          promedio = notaExistente.promedioFinal !== undefined ? notaExistente.promedioFinal : null;
          condicion = notaExistente.condicion || 'EN_CURSO';
          feedback = notaExistente.feedback || '';
        } else if (evalLocal && evalLocal.aprobado) {
          // Pre-cargar notas coherentes si el estudiante ya estaba aprobado
          const n = evalLocal.nota || 18;
          ec1 = n;
          ec2 = n;
          pf = n;
          promedio = n;
          condicion = 'APROBADO';
          feedback = 'Excelente desempeño en el curso y proyecto final.';
        }

        return {
          estudianteId: estId,
          estudianteNombre: nombre,
          dni: dni,
          ec1: ec1,
          ec2: ec2,
          proyectoFinal: pf,
          promedioFinal: promedio,
          condicion: condicion,
          feedback: feedback
        };
      });

      this.renderTablaCalificaciones();
      this.actualizarMetricasCalificaciones();
    } catch (err: any) {
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="text-center py-4 text-danger">
              <i class="fa fa-exclamation-triangle me-1"></i>Error al cargar calificaciones: ${err?.message}
            </td>
          </tr>
        `;
      }
    }
  }

  private renderTablaCalificaciones(): void {
    const tbody = document.getElementById('tabla-calificaciones-body');
    if (!tbody) return;

    if (!this.calificacionesAlumnos || this.calificacionesAlumnos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-5">
            <i class="fa fa-graduation-cap fa-2x text-muted mb-2 d-block"></i>
            <span class="text-muted fw-bold">No hay estudiantes matriculados en este curso todavía.</span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.calificacionesAlumnos.map((row, idx) => {
      const eid = row.estudianteId;
      const ec1Val = row.ec1 !== null && row.ec1 !== undefined ? row.ec1 : '';
      const ec2Val = row.ec2 !== null && row.ec2 !== undefined ? row.ec2 : '';
      const pfVal = row.proyectoFinal !== null && row.proyectoFinal !== undefined ? row.proyectoFinal : '';

      const promText = row.promedioFinal !== null && row.promedioFinal !== undefined
        ? Number(row.promedioFinal).toFixed(1)
        : '-';

      let promBadgeClass = 'bg-light text-secondary border';
      if (row.promedioFinal !== null && row.promedioFinal !== undefined) {
        promBadgeClass = row.promedioFinal >= 14.0 ? 'bg-success text-white' : 'bg-danger text-white';
      }

      let condBadge = '<span class="badge bg-secondary" id="badge-cond-' + eid + '"><i class="fa fa-clock-o me-1"></i>En Curso</span>';
      if (row.condicion === 'APROBADO' || (row.promedioFinal !== null && row.promedioFinal >= 14.0)) {
        condBadge = '<span class="badge bg-success" id="badge-cond-' + eid + '"><i class="fa fa-check-circle me-1"></i>APROBADO</span>';
      } else if (row.condicion === 'DESAPROBADO' || (row.promedioFinal !== null && row.promedioFinal < 14.0 && row.ec1 !== null && row.ec2 !== null && row.proyectoFinal !== null)) {
        condBadge = '<span class="badge bg-danger" id="badge-cond-' + eid + '"><i class="fa fa-times-circle me-1"></i>DESAPROBADO</span>';
      }

      const safeFeedback = (row.feedback || '').replace(/"/g, '&quot;');

      return `
        <tr id="row-cal-${eid}">
          <td class="text-muted fw-bold">${idx + 1}</td>
          <td>
            <strong style="color: #0f172a; font-size: 13.5px; display: block;">${row.estudianteNombre}</strong>
            <span class="text-muted" style="font-size: 11px;"><i class="fa fa-id-card-o me-1"></i>DNI: ${row.dni}</span>
          </td>
          <td style="text-align: center;">
            <input type="number" min="0" max="20" step="0.5" class="form-control form-control-sm text-center fw-bold" 
              style="width: 76px; margin: 0 auto; border-color: #cbd5e1;" 
              placeholder="0-20" value="${ec1Val}" 
              oninput="window.onNotaChange('${eid}', 'ec1', this.value)">
          </td>
          <td style="text-align: center;">
            <input type="number" min="0" max="20" step="0.5" class="form-control form-control-sm text-center fw-bold" 
              style="width: 76px; margin: 0 auto; border-color: #cbd5e1;" 
              placeholder="0-20" value="${ec2Val}" 
              oninput="window.onNotaChange('${eid}', 'ec2', this.value)">
          </td>
          <td style="text-align: center;">
            <input type="number" min="0" max="20" step="0.5" class="form-control form-control-sm text-center fw-bold" 
              style="width: 76px; margin: 0 auto; border-color: #cbd5e1;" 
              placeholder="0-20" value="${pfVal}" 
              oninput="window.onNotaChange('${eid}', 'pf', this.value)">
          </td>
          <td style="text-align: center;">
            <span class="badge ${promBadgeClass}" style="font-size: 13.5px; font-weight: 800; min-width: 50px;" id="badge-prom-${eid}">
              ${promText}
            </span>
          </td>
          <td style="text-align: center;">
            ${condBadge}
          </td>
          <td>
            <div class="d-flex align-items-center gap-1">
              <input type="text" class="form-control form-control-sm" id="input-fb-${eid}" 
                placeholder="Retroalimentación (ej: Buen diseño de microservicios)..." 
                value="${safeFeedback}" 
                oninput="window.onFeedbackChange('${eid}', this.value)" 
                style="font-size: 12.5px;">
              <button type="button" class="btn btn-sm btn-outline-secondary py-1 px-2" title="Sugerencia rápida" 
                onclick="window.aplicarFeedbackRapido('${eid}', 'Excelente diseño de microservicios y cobertura de pruebas.')">
                <i class="fa fa-magic"></i>
              </button>
            </div>
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-sm btn-primary fw-bold px-2 py-1" id="btn-save-cal-${eid}" 
              onclick="window.guardarCalificacionAlumno('${eid}')" title="Guardar calificación en BD">
              <i class="fa fa-save"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  onNotaChange(estudianteId: string, tipo: 'ec1' | 'ec2' | 'pf', rawVal: string): void {
    const item = this.calificacionesAlumnos.find(a => a.estudianteId === estudianteId);
    if (!item) return;

    let val: number | null = rawVal.trim() === '' ? null : parseFloat(rawVal);
    if (val !== null) {
      if (isNaN(val)) val = null;
      else if (val < 0) val = 0;
      else if (val > 20) val = 20;
    }

    if (tipo === 'ec1') item.ec1 = val;
    else if (tipo === 'ec2') item.ec2 = val;
    else if (tipo === 'pf') item.proyectoFinal = val;

    // Calcular promedio ponderado dinámico: EC1 (20%) + EC2 (30%) + PF (50%)
    if (item.ec1 !== null || item.ec2 !== null || item.proyectoFinal !== null) {
      const v1 = item.ec1 || 0;
      const v2 = item.ec2 || 0;
      const v3 = item.proyectoFinal || 0;
      const promedio = Math.round(((v1 * 0.20) + (v2 * 0.30) + (v3 * 0.50)) * 10) / 10;
      item.promedioFinal = promedio;

      const todosLlenos = item.ec1 !== null && item.ec2 !== null && item.proyectoFinal !== null;
      if (todosLlenos) {
        item.condicion = promedio >= 14.0 ? 'APROBADO' : 'DESAPROBADO';
      } else {
        item.condicion = 'EN_CURSO';
      }
    } else {
      item.promedioFinal = null;
      item.condicion = 'EN_CURSO';
    }

    // Actualizar elementos DOM de la fila sin perder foco
    const badgeProm = document.getElementById(`badge-prom-${estudianteId}`);
    const badgeCond = document.getElementById(`badge-cond-${estudianteId}`);

    if (badgeProm) {
      if (item.promedioFinal !== null) {
        badgeProm.textContent = Number(item.promedioFinal).toFixed(1);
        badgeProm.className = `badge ${item.promedioFinal >= 14.0 ? 'bg-success text-white' : 'bg-danger text-white'}`;
      } else {
        badgeProm.textContent = '-';
        badgeProm.className = 'badge bg-light text-secondary border';
      }
    }

    if (badgeCond) {
      if (item.condicion === 'APROBADO') {
        badgeCond.className = 'badge bg-success';
        badgeCond.innerHTML = '<i class="fa fa-check-circle me-1"></i>APROBADO';
      } else if (item.condicion === 'DESAPROBADO') {
        badgeCond.className = 'badge bg-danger';
        badgeCond.innerHTML = '<i class="fa fa-times-circle me-1"></i>DESAPROBADO';
      } else {
        badgeCond.className = 'badge bg-secondary';
        badgeCond.innerHTML = '<i class="fa fa-clock-o me-1"></i>En Curso';
      }
    }

    this.actualizarMetricasCalificaciones();
  }

  onFeedbackChange(estudianteId: string, feedback: string): void {
    const item = this.calificacionesAlumnos.find(a => a.estudianteId === estudianteId);
    if (item) {
      item.feedback = feedback;
    }
  }

  aplicarFeedbackRapido(estudianteId: string, texto: string): void {
    const item = this.calificacionesAlumnos.find(a => a.estudianteId === estudianteId);
    if (item) {
      item.feedback = texto;
      const input = document.getElementById(`input-fb-${estudianteId}`) as HTMLInputElement | null;
      if (input) input.value = texto;
      this.notifications.showToast('Sugerencia de retroalimentación aplicada.', 'info');
    }
  }

  private actualizarMetricasCalificaciones(): void {
    const elEvaluados = document.getElementById('resumen-evaluados');
    const elAprobados = document.getElementById('resumen-aprobados');
    const elDesaprobados = document.getElementById('resumen-desaprobados');
    const elPromedio = document.getElementById('resumen-promedio-general');

    const lista = this.calificacionesAlumnos || [];
    let countEvaluados = 0;
    let countAprobados = 0;
    let countDesaprobados = 0;
    let sumaPromedios = 0;

    lista.forEach(item => {
      if (item.promedioFinal !== null && item.promedioFinal !== undefined) {
        countEvaluados++;
        sumaPromedios += item.promedioFinal;
        if (item.promedioFinal >= 14.0) countAprobados++;
        else countDesaprobados++;
      }
    });

    if (elEvaluados) elEvaluados.textContent = `${countEvaluados} / ${lista.length}`;
    if (elAprobados) elAprobados.textContent = String(countAprobados);
    if (elDesaprobados) elDesaprobados.textContent = String(countDesaprobados);

    if (elPromedio) {
      const promGen = countEvaluados > 0 ? (sumaPromedios / countEvaluados).toFixed(1) : '-';
      elPromedio.textContent = `${promGen} / 20`;
    }
  }

  async guardarCalificacionAlumno(estudianteId: string): Promise<void> {
    const item = this.calificacionesAlumnos.find(a => a.estudianteId === estudianteId);
    if (!item) return;

    const btn = document.getElementById(`btn-save-cal-${estudianteId}`) as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
    }

    try {
      const payload = {
        cursoId: this.cursoSeleccionadoCalificaciones,
        estudianteId: estudianteId,
        ec1: item.ec1,
        ec2: item.ec2,
        proyectoFinal: item.proyectoFinal,
        feedback: item.feedback || '',
        docenteId: this.activeDocente?.id,
        actualizadoPor: this.activeDocente?.id
      };

      const resultado = await this.cursoService.guardarCalificacion(payload);

      // Actualizar estado devuelto por el backend
      item.promedioFinal = resultado.promedioFinal;
      item.condicion = resultado.condicion;

      // Sincronizar con pedidoService para emisión inmediata del certificado si aprueba
      const estaAprobado = resultado.condicion === 'APROBADO' || (resultado.promedioFinal !== null && resultado.promedioFinal >= 14.0);
      this.pedidoService.guardarEvaluacionAcademica(
        this.cursoSeleccionadoCalificaciones,
        estudianteId,
        estaAprobado,
        resultado.promedioFinal || 18
      );

      this.notifications.showToast(
        `¡Calificación de ${item.estudianteNombre} guardada en BD! Promedio: ${resultado.promedioFinal ?? '-'} (${resultado.condicion})`,
        estaAprobado ? 'success' : 'info'
      );

      this.actualizarMetricasCalificaciones();
    } catch (err: any) {
      this.notifications.showToast(`Error al guardar calificación: ${err?.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-save"></i>';
      }
    }
  }

  async guardarTodasCalificaciones(): Promise<void> {
    if (!this.calificacionesAlumnos || this.calificacionesAlumnos.length === 0) {
      this.notifications.showToast('No hay estudiantes para calificar en este curso.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-guardar-todas-calificaciones') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Guardando salón...';
    }

    try {
      let guardados = 0;
      for (const item of this.calificacionesAlumnos) {
        if (item.ec1 !== null || item.ec2 !== null || item.proyectoFinal !== null) {
          const res = await this.cursoService.guardarCalificacion({
            cursoId: this.cursoSeleccionadoCalificaciones,
            estudianteId: item.estudianteId,
            ec1: item.ec1,
            ec2: item.ec2,
            proyectoFinal: item.proyectoFinal,
            feedback: item.feedback || '',
            docenteId: this.activeDocente?.id,
            actualizadoPor: this.activeDocente?.id
          });
          item.promedioFinal = res.promedioFinal;
          item.condicion = res.condicion;

          const estaAprobado = res.condicion === 'APROBADO' || (res.promedioFinal !== null && res.promedioFinal >= 14.0);
          this.pedidoService.guardarEvaluacionAcademica(
            this.cursoSeleccionadoCalificaciones,
            item.estudianteId,
            estaAprobado,
            res.promedioFinal || 18
          );
          guardados++;
        }
      }

      this.notifications.showToast(`¡Calificaciones guardadas exitosamente en base de datos (${guardados} estudiantes)!`, 'success');
      this.renderTablaCalificaciones();
      this.actualizarMetricasCalificaciones();
    } catch (err: any) {
      this.notifications.showToast(`Error al guardar calificaciones: ${err?.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-save me-1"></i> Guardar Todo el Salón';
      }
    }
  }

  // =========================================================================
  // CONTROL DE ASISTENCIAS POR SESIÓN
  // =========================================================================
  onCursoAsistenciaChange(cursoId: string): void {
    const selectS = document.getElementById('select-sesion-asistencias') as HTMLSelectElement | null;
    const sesion = selectS ? parseInt(selectS.value, 10) : 1;
    this.cargarAsistenciasDeCurso(cursoId, sesion);
  }

  onSesionChange(sesionVal: string): void {
    const sesion = parseInt(sesionVal, 10) || 1;
    this.cargarAsistenciasDeCurso(this.cursoSeleccionadoAsistencias, sesion);
  }

  cambiarFechaSesion(fecha: string): void {
    this.fechaSesionAsistencias = fecha;
  }

  cambiarTemaSesion(tema: string): void {
    this.temaSesionAsistencias = tema;
  }

  async cargarAsistenciasDeCurso(cursoId: string, sesion: number = 1): Promise<void> {
    this.cursoSeleccionadoAsistencias = cursoId;
    this.sesionSeleccionadaAsistencias = sesion;

    const selectC = document.getElementById('select-curso-asistencias') as HTMLSelectElement | null;
    const selectS = document.getElementById('select-sesion-asistencias') as HTMLSelectElement | null;
    if (selectC && selectC.value !== cursoId) selectC.value = cursoId;
    if (selectS && parseInt(selectS.value, 10) !== sesion) selectS.value = String(sesion);

    const tbody = document.getElementById('tabla-asistencias-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            <i class="fa fa-spinner fa-spin me-2 text-success"></i>Consultando asistencias de la Sesión ${sesion}...
          </td>
        </tr>
      `;
    }

    try {
      // 1. Obtener participantes matriculados
      let participantes = await this.pedidoService.obtenerParticipantesCurso(cursoId);
      if (!participantes || participantes.length === 0) {
        const todos = await this.pedidoService.obtenerTodosPedidos();
        participantes = (todos || []).filter(p => p.cursoId === cursoId && p.estado === 'PAGADO');
      }

      // 2. Obtener asistencias ya registradas para esta sesión específica
      const asistenciasSesion = await this.cursoService.obtenerAsistencias(cursoId, sesion);
      const asistMap = new Map<string, any>();
      (asistenciasSesion || []).forEach(a => {
        if (a && a.estudianteId) asistMap.set(a.estudianteId, a);
      });

      // Si la sesión ya tenía tema y fecha, cargarlos
      if (asistenciasSesion && asistenciasSesion.length > 0) {
        const primera = asistenciasSesion[0];
        if (primera.fechaSesion) {
          this.fechaSesionAsistencias = primera.fechaSesion;
          const inputFecha = document.getElementById('input-fecha-sesion') as HTMLInputElement | null;
          if (inputFecha) inputFecha.value = primera.fechaSesion;
        }
        if (primera.temaSesion) {
          this.temaSesionAsistencias = primera.temaSesion;
          const inputTema = document.getElementById('input-tema-sesion') as HTMLInputElement | null;
          if (inputTema) inputTema.value = primera.temaSesion;
        }
      }

      // 3. Obtener resumen acumulado de inasistencias por estudiante
      const resumenList = await this.cursoService.obtenerResumenAsistencias(cursoId);
      this.resumenAsistenciasMap = new Map<string, any>();
      (resumenList || []).forEach(r => {
        if (r && r.estudianteId) this.resumenAsistenciasMap.set(r.estudianteId, r);
      });

      // 4. Mapear estado de los alumnos para esta sesión
      this.asistenciasSesionAlumnos = (participantes || []).map(p => {
        const est = p.estudiante || {};
        const estId = p.estudianteId || est.id || '';
        const nombre = (est.nombres && est.apellidos) ? `${est.nombres} ${est.apellidos}` : (p.estudianteNombre || 'Estudiante');
        const dni = est.dni || '72481930';

        const asistReg = asistMap.get(estId);
        const resumen = this.resumenAsistenciasMap.get(estId);

        return {
          estudianteId: estId,
          estudianteNombre: nombre,
          dni: dni,
          estado: asistReg ? asistReg.estado : 'P', // Por defecto Presente para agilizar marcación
          observaciones: asistReg ? (asistReg.observaciones || '') : '',
          porcentajeInasistencia: resumen ? resumen.porcentajeInasistencia : 0.0,
          inhabilitado: resumen ? resumen.inhabilitado : false
        };
      });

      this.renderTablaAsistencias();
      this.actualizarMetricasAsistencias();
    } catch (err: any) {
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4 text-danger">
              <i class="fa fa-exclamation-triangle me-1"></i>Error al cargar asistencias: ${err?.message}
            </td>
          </tr>
        `;
      }
    }
  }

  private renderTablaAsistencias(): void {
    const tbody = document.getElementById('tabla-asistencias-body');
    if (!tbody) return;

    if (!this.asistenciasSesionAlumnos || this.asistenciasSesionAlumnos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-5">
            <i class="fa fa-calendar-times-o fa-2x text-muted mb-2 d-block"></i>
            <span class="text-muted fw-bold">No hay estudiantes matriculados en este curso todavía.</span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.asistenciasSesionAlumnos.map((row, idx) => {
      const eid = row.estudianteId;
      const st = row.estado || 'P';
      const pct = Number(row.porcentajeInasistencia || 0).toFixed(1);
      const inhabilitado = !!row.inhabilitado || Number(pct) > 30.0;

      const badgeCondicion = inhabilitado
        ? `<span class="badge bg-danger text-white fw-bold px-2 py-1"><i class="fa fa-exclamation-triangle me-1"></i> Inhabilitado (>30%)</span>`
        : `<span class="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-1"><i class="fa fa-check-circle me-1"></i> Habilitado</span>`;

      return `
        <tr id="row-asist-${eid}">
          <td class="text-muted fw-bold">${idx + 1}</td>
          <td>
            <strong style="color: #0f172a; font-size: 13.5px; display: block;">${row.estudianteNombre}</strong>
            <span class="text-muted" style="font-size: 11px;"><i class="fa fa-id-card-o me-1"></i>DNI: ${row.dni}</span>
          </td>
          <td style="text-align: center;">
            <div class="btn-group btn-group-sm" role="group" id="btn-group-asist-${eid}">
              <button type="button" class="btn ${st === 'P' ? 'btn-success fw-bold text-white' : 'btn-outline-success'}" 
                onclick="window.marcarEstadoAsistencia('${eid}', 'P')" title="Presente">
                <i class="fa fa-check me-1"></i>P
              </button>
              <button type="button" class="btn ${st === 'T' ? 'btn-warning fw-bold text-dark' : 'btn-outline-warning text-dark'}" 
                onclick="window.marcarEstadoAsistencia('${eid}', 'T')" title="Tardanza (0.5 falta)">
                <i class="fa fa-clock-o me-1"></i>T
              </button>
              <button type="button" class="btn ${st === 'FJ' ? 'btn-info fw-bold text-white' : 'btn-outline-info text-info'}" 
                onclick="window.marcarEstadoAsistencia('${eid}', 'FJ')" title="Falta Justificada">
                <i class="fa fa-file-text-o me-1"></i>FJ
              </button>
              <button type="button" class="btn ${st === 'F' ? 'btn-danger fw-bold text-white' : 'btn-outline-danger'}" 
                onclick="window.marcarEstadoAsistencia('${eid}', 'F')" title="Falta Injustificada">
                <i class="fa fa-times me-1"></i>F
              </button>
            </div>
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" placeholder="Observación..." 
              value="${(row.observaciones || '').replace(/"/g, '&quot;')}" 
              oninput="window.onObsAsistenciaChange('${eid}', this.value)" 
              style="font-size: 12px;">
          </td>
          <td style="text-align: center;">
            <span class="badge ${inhabilitado ? 'bg-danger text-white' : 'bg-light text-dark border'}" style="font-size: 12px; font-weight: 700;">
              ${pct}%
            </span>
          </td>
          <td style="text-align: center;">
            ${badgeCondicion}
          </td>
        </tr>
      `;
    }).join('');
  }

  marcarEstadoAsistencia(estudianteId: string, estado: 'P' | 'T' | 'FJ' | 'F'): void {
    const item = this.asistenciasSesionAlumnos.find(a => a.estudianteId === estudianteId);
    if (!item) return;

    item.estado = estado;

    // Actualizar visualmente el grupo de botones
    const btnGroup = document.getElementById(`btn-group-asist-${estudianteId}`);
    if (btnGroup) {
      btnGroup.innerHTML = `
        <button type="button" class="btn ${estado === 'P' ? 'btn-success fw-bold text-white' : 'btn-outline-success'}" 
          onclick="window.marcarEstadoAsistencia('${estudianteId}', 'P')" title="Presente">
          <i class="fa fa-check me-1"></i>P
        </button>
        <button type="button" class="btn ${estado === 'T' ? 'btn-warning fw-bold text-dark' : 'btn-outline-warning text-dark'}" 
          onclick="window.marcarEstadoAsistencia('${estudianteId}', 'T')" title="Tardanza (0.5 falta)">
          <i class="fa fa-clock-o me-1"></i>T
        </button>
        <button type="button" class="btn ${estado === 'FJ' ? 'btn-info fw-bold text-white' : 'btn-outline-info text-info'}" 
          onclick="window.marcarEstadoAsistencia('${estudianteId}', 'FJ')" title="Falta Justificada">
          <i class="fa fa-file-text-o me-1"></i>FJ
        </button>
        <button type="button" class="btn ${estado === 'F' ? 'btn-danger fw-bold text-white' : 'btn-outline-danger'}" 
          onclick="window.marcarEstadoAsistencia('${estudianteId}', 'F')" title="Falta Injustificada">
          <i class="fa fa-times me-1"></i>F
        </button>
      `;
    }

    this.actualizarMetricasAsistencias();
  }

  onObsAsistenciaChange(estudianteId: string, obs: string): void {
    const item = this.asistenciasSesionAlumnos.find(a => a.estudianteId === estudianteId);
    if (item) item.observaciones = obs;
  }

  marcarTodosPresentes(): void {
    (this.asistenciasSesionAlumnos || []).forEach(a => {
      a.estado = 'P';
    });
    this.renderTablaAsistencias();
    this.actualizarMetricasAsistencias();
    this.notifications.showToast('Todos los alumnos han sido marcados como Presentes (P).', 'info');
  }

  private actualizarMetricasAsistencias(): void {
    const elTotal = document.getElementById('resumen-asist-total');
    const elP = document.getElementById('resumen-asist-p');
    const elT = document.getElementById('resumen-asist-t');
    const elFJ = document.getElementById('resumen-asist-fj');
    const elF = document.getElementById('resumen-asist-f');
    const elInhab = document.getElementById('resumen-asist-inhabilitados');

    const lista = this.asistenciasSesionAlumnos || [];
    let p = 0, t = 0, fj = 0, f = 0, inhab = 0;

    lista.forEach(item => {
      if (item.estado === 'P') p++;
      else if (item.estado === 'T') t++;
      else if (item.estado === 'FJ') fj++;
      else if (item.estado === 'F') f++;

      if (item.inhabilitado || (item.porcentajeInasistencia && item.porcentajeInasistencia > 30.0)) {
        inhab++;
      }
    });

    if (elTotal) elTotal.textContent = String(lista.length);
    if (elP) elP.textContent = String(p);
    if (elT) elT.textContent = String(t);
    if (elFJ) elFJ.textContent = String(fj);
    if (elF) elF.textContent = String(f);
    if (elInhab) elInhab.textContent = String(inhab);
  }

  async guardarAsistenciasSesion(): Promise<void> {
    if (!this.asistenciasSesionAlumnos || this.asistenciasSesionAlumnos.length === 0) {
      this.notifications.showToast('No hay estudiantes para registrar asistencia en este curso.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-guardar-asistencias') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Guardando sesión...';
    }

    try {
      const payload = {
        cursoId: this.cursoSeleccionadoAsistencias,
        numeroSesion: this.sesionSeleccionadaAsistencias,
        fechaSesion: this.fechaSesionAsistencias,
        temaSesion: this.temaSesionAsistencias,
        docenteId: this.activeDocente?.id,
        registradoPor: this.activeDocente?.id,
        estudiantes: this.asistenciasSesionAlumnos.map(a => ({
          estudianteId: a.estudianteId,
          estado: a.estado || 'P',
          observaciones: a.observaciones || ''
        })),
        registros: this.asistenciasSesionAlumnos.map(a => ({
          estudianteId: a.estudianteId,
          estado: a.estado || 'P',
          observaciones: a.observaciones || ''
        }))
      };

      await this.cursoService.guardarAsistenciasLote(payload);

      // Actualizar resumen oficial tras el guardado
      const resumenList = await this.cursoService.obtenerResumenAsistencias(this.cursoSeleccionadoAsistencias);
      (resumenList || []).forEach(r => {
        if (r && r.estudianteId) {
          const item = this.asistenciasSesionAlumnos.find(a => a.estudianteId === r.estudianteId);
          if (item) {
            item.porcentajeInasistencia = r.porcentajeInasistencia;
            item.inhabilitado = r.inhabilitado;
          }
        }
      });

      this.renderTablaAsistencias();
      this.actualizarMetricasAsistencias();

      this.notifications.showToast(
        `¡Asistencia de la Sesión ${this.sesionSeleccionadaAsistencias} guardada con éxito en PostgreSQL (${payload.registros.length} alumnos)!`,
        'success'
      );
    } catch (err: any) {
      this.notifications.showToast(`Error al guardar asistencias: ${err?.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-save me-1"></i> Guardar Asistencia de la Sesión';
      }
    }
  }

  // =========================================================================
  // MODALES DE EDICIÓN DE ENLACE Y AULA
  // =========================================================================
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
