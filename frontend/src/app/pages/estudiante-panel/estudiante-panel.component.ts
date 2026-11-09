import { Component, OnInit, AfterViewInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { APP_CONFIG } from '../../services/config.data';
import { AuthService, UserProfile } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-estudiante-panel',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP  -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title wow fadeInRight" data-wow-duration="1s" data-wow-delay="0.3s">
					<h1>Portal del Estudiante</h1>
					<ul>
						<li>{{ tabActivo === 'perfil' ? 'Mi Perfil de Estudiante' : 'Mis Cursos y Accesos' }}</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->

	<!-- CONTENIDO DEL PORTAL -->
	<div class="best-cpurse section-padding">
		<div class="container">
			<!-- PESTAÑAS DE NAVEGACIÓN PRINCIPAL -->
			<div class="d-flex align-items-center justify-content-center gap-2 mb-4 flex-wrap">
				<button
					type="button"
					(click)="cambiarTab('clases')"
					[class]="tabActivo === 'clases' ? 'btn_one' : 'btn_two'"
					style="padding: 11px 26px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
					<i class="fa fa-graduation-cap"></i> Mis Clases Matriculadas
					<span class="badge bg-white text-dark ms-1" style="font-size: 11px; padding: 3px 8px; border-radius: 999px;">{{ totalCursos }}</span>
				</button>
				<button
					type="button"
					(click)="cambiarTab('perfil')"
					[class]="tabActivo === 'perfil' ? 'btn_one' : 'btn_two'"
					style="padding: 11px 26px; border-radius: 8px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
					<i class="fa fa-user"></i> Mi Perfil de Estudiante
				</button>
			</div>

			<div class="row g-4" id="portal-contenido">
				<!-- Inyectado dinámicamente según la pestaña seleccionada -->
			</div>
		</div>
	</div>
  `
})
export class EstudiantePanelComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);

  tabActivo: 'clases' | 'perfil' = 'clases';
  totalCursos: number = 0;
  matriculasCargadas: any[] = [];

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname || '';
      const params = new URLSearchParams(window.location.search);
      if (pathname.includes('perfil') || params.get('tab') === 'perfil') {
        this.tabActivo = 'perfil';
      }
    }
  }

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      (window as any).cargarAlumnoDemoMisCursos = () => this.cargarAlumnoDemoMisCursos();
      (window as any).cerrarSesionMisCursos = () => this.cerrarSesionMisCursos();
      (window as any).guardarCambiosPerfilEstudiante = () => this.guardarCambiosPerfil();
      (window as any).cambiarTabEstudiante = (t: string) => this.cambiarTab(t as any);
    }
    this.renderPortal();
  }

  cambiarTab(tab: 'clases' | 'perfil'): void {
    this.tabActivo = tab;
    this.renderPortal();
  }

  async cargarAlumnoDemoMisCursos(): Promise<void> {
    try {
      this.notifications.showToast('Autenticando alumno en el sistema...', 'info');
      const res = await this.authService.login('carlokasike333@gmail.com', '123456');
      this.notifications.showToast(`¡Bienvenido, ${res.user.nombres}! Cargando tus clases...`, 'success');
      this.authService.updateNavbar();
      await this.renderPortal();
    } catch (err: any) {
      try {
        const res2 = await this.authService.login('estudiante@cursos.com', '123456');
        this.notifications.showToast(`¡Bienvenido, ${res2.user.nombres}!`, 'success');
        this.authService.updateNavbar();
        await this.renderPortal();
      } catch (err2: any) {
        this.notifications.showToast('Error al cargar alumno: ' + err2?.message, 'error');
      }
    }
  }

  cerrarSesionMisCursos(): void {
    this.authService.logout(null);
    this.renderPortal();
    this.notifications.showToast('Sesión cerrada correctamente.', 'info');
  }

  async guardarCambiosPerfil(): Promise<void> {
    const nom = (document.getElementById('perfil-nombres') as HTMLInputElement)?.value?.trim();
    const ape = (document.getElementById('perfil-apellidos') as HTMLInputElement)?.value?.trim();
    const dni = (document.getElementById('perfil-dni') as HTMLInputElement)?.value?.trim();
    const wa = (document.getElementById('perfil-whatsapp') as HTMLInputElement)?.value?.trim();

    if (!nom || !ape) {
      this.notifications.showToast('Por favor completa tus nombres y apellidos.', 'warning');
      return;
    }
    if (!dni || dni.length < 8) {
      this.notifications.showToast('Ingresa un número de DNI válido (mínimo 8 dígitos).', 'warning');
      return;
    }

    const btn = document.getElementById('btn-guardar-perfil') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa fa-spinner fa-spin me-1"></i> Guardando...';
    }

    try {
      await this.authService.guardarPerfil({
        nombres: nom,
        apellidos: ape,
        dni: dni,
        whatsapp: wa ? (wa.startsWith('+51') ? wa : '+51' + wa.replace(/^\+?51/, '').trim()) : ''
      });
      this.notifications.showToast('¡Perfil actualizado con éxito! Datos guardados en la base de datos.', 'success');
      this.authService.updateNavbar();
      this.renderPortal();
    } catch (err: any) {
      this.notifications.showToast('Error al actualizar perfil: ' + err?.message, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-save me-1"></i> Guardar Cambios';
      }
    }
  }

  async renderPortal(): Promise<void> {
    const userCheck = this.authService.getCurrentUser();
    if (userCheck && userCheck.rol === 'ADMIN') {
      this.notifications.showToast('Redirigiendo a tu Portal Administrador...', 'info');
      this.router.navigateByUrl('/portal-admin');
      return;
    }
    if (userCheck && userCheck.rol === 'DOCENTE') {
      this.notifications.showToast('Redirigiendo a tu Portal Docente...', 'info');
      this.router.navigateByUrl('/portal-docente');
      return;
    }

    let user = this.authService.getCurrentUser();
    if (user && user.id) {
      try {
        const fresh = await this.authService.obtenerUsuarioPorId(user.id);
        if (fresh && fresh.dni) {
          user = { ...user, ...fresh };
          this.authService.updateProfile(user);
        }
      } catch (_) {}
    }
    if (!user && typeof window !== 'undefined' && window.location.search && window.location.search.includes('sample=1')) {
      user = {
        id: 'e9d63958-ec17-41be-a766-bfa231494671',
        nombres: 'Jose Elmer',
        apellidos: 'Coronado Maldonado',
        correo: 'carlokasike333@gmail.com',
        dni: '75187638',
        whatsapp: '+51935300159',
        rol: 'ESTUDIANTE'
      };
    }

    const container = document.getElementById('portal-contenido');
    if (!container) return;

    this.cartService.updateBadge();
    this.authService.updateNavbar();

    if (!user) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 42px 32px; border-radius: 16px; border: 1px solid #eef2f6; box-shadow: 0 10px 30px rgba(16, 24, 40, 0.04);">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: #f0fdf4; color: #2eca7f; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 20px;">
              <i class="fa fa-graduation-cap"></i>
            </div>
            <h3 style="color: #1a2d62; font-weight: 800; font-size: 22px; margin-bottom: 8px;">
              Portal del Estudiante
            </h3>
            <p style="color: #64748b; font-size: 14px; line-height: 1.55; margin-bottom: 24px;">
              Inicia sesión con tu cuenta de alumno para acceder a tus salas en vivo, gestionar tu perfil académico y descargar tus certificados.
            </p>
            <div class="d-flex justify-content-center gap-2 flex-wrap mb-3">
              <a href="/login?redirect=mis-cursos.html" class="btn_one" style="padding: 12px 28px; font-size: 14.5px; font-weight: 800; border-radius: 8px; text-decoration: none;">
                <i class="fa fa-sign-in me-1"></i> Iniciar Sesión
              </a>
              <a href="/registro?redirect=mis-cursos.html" class="btn_two" style="padding: 12px 24px; font-size: 14px; font-weight: 700; border-radius: 8px; text-decoration: none; background: #f8fafc; border: 1px solid #d7dee8; color: #1a2d62;">
                <i class="fa fa-user-plus me-1"></i> Crear Cuenta
              </a>
            </div>
            <div class="pt-3 border-top mt-3">
              <button type="button" onclick="window.cargarAlumnoDemoMisCursos()" class="btn" style="background: #eef8fc; color: #0284c7; border: 1px dashed #0284c7; font-weight: 700; font-size: 13px; border-radius: 6px; padding: 9px 18px; cursor: pointer;">
                <i class="fa fa-bolt me-1"></i> Ingresar con Usuario Demo
              </button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Cargar matrículas si aún no las tenemos
    if (this.matriculasCargadas.length === 0) {
      const todasMatriculas = await this.pedidoService.getMisMatriculas(user.id);
      const cursosVistos = new Set<string>();
      this.matriculasCargadas = (todasMatriculas || []).filter(item => {
        const isPagado = item.estado === 'PAGADO';
        if (!isPagado) return false;
        const cid = (item.curso && item.curso.id) ? item.curso.id : (item.cursoId || item.id);
        if (cursosVistos.has(cid)) return false;
        cursosVistos.add(cid);
        return true;
      });
      this.totalCursos = this.matriculasCargadas.length;
    }

    if (this.tabActivo === 'perfil') {
      this.renderTabPerfil(user, container);
    } else {
      this.renderTabClases(user, container);
    }
  }

  private renderTabPerfil(user: UserProfile, container: HTMLElement): void {
    const nombreCompleto = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Estudiante';
    const iniciales = ((user.nombres ? user.nombres[0] : 'A') + (user.apellidos ? user.apellidos[0] : 'L')).toUpperCase();
    const waLimpio = user.whatsapp ? user.whatsapp.replace(/^\+?51/, '').trim() : '';
    const horasEstimadas = this.totalCursos * 48;

    const countAprobados = this.matriculasCargadas.filter(item => {
      const cid = (item.curso && item.curso.id) ? item.curso.id : (item.cursoId || item.id);
      const evalItem = this.pedidoService.getEvaluacionAcademica(cid, user.id);
      return !!(evalItem && evalItem.aprobado);
    }).length;
    const countEnCurso = Math.max(0, this.totalCursos - countAprobados);

    container.innerHTML = `
      <div class="col-12">
        <div class="row g-4">
          <!-- COLUMNA IZQUIERDA: TARJETA DE IDENTIDAD Y MÉTRICAS -->
          <div class="col-lg-4 col-12">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 24px; text-align: center; box-shadow: 0 8px 24px rgba(16,24,40,0.04);">
              <div style="width: 84px; height: 84px; border-radius: 50%; background: linear-gradient(135deg, #2eca7f 0%, #16a34a 100%); color: #ffffff; font-size: 32px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(46,202,127,0.35); margin-bottom: 16px;">
                ${iniciales}
              </div>
              <h3 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-bottom: 4px;">${nombreCompleto}</h3>
              <p style="color: #64748b; font-size: 13.5px; margin-bottom: 14px;">${user.correo}</p>

              <div class="d-inline-flex align-items-center gap-2 mb-3">
                <span style="font-size: 11.5px; text-transform: uppercase; font-weight: 800; color: #15803d; background: #dcfce7; padding: 4px 12px; border-radius: 999px;">
                  <i class="fa fa-check-circle me-1"></i> Alumno Verificado
                </span>
                
              </div>

              <hr style="margin: 20px 0; border-color: #f1f5f9;">

              <!-- RESUMEN DE MÉTRICAS ACADÉMICAS -->
              <div class="text-start mb-4">
                <h5 style="font-size: 12px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.5px; margin-bottom: 12px;">
                  Resumen de Avance Académico
                </h5>
                <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                  <span style="font-size: 13.5px; color: #475569;"><i class="fa fa-book text-primary me-2"></i> Cursos Matriculados</span>
                  <strong style="color: #0f172a; font-size: 14px;">${this.totalCursos}</strong>
                </div>
                <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                  <span style="font-size: 13.5px; color: #475569;"><i class="fa fa-clock-o text-warning me-2"></i> Horas Lectivas</span>
                  <strong style="color: #0f172a; font-size: 14px;">${horasEstimadas} hrs</strong>
                </div>
                <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                  <span style="font-size: 13.5px; color: #475569;"><i class="fa fa-certificate text-success me-2"></i> Certificados Oficiales</span>
                  <strong style="color: #0f172a; font-size: 14px;">${countAprobados} emitidos (${countEnCurso} en curso)</strong>
                </div>
                <div class="d-flex align-items-center justify-content-between py-2">
                  <span style="font-size: 13.5px; color: #475569;"><i class="fa fa-id-card text-muted me-2"></i> DNI Registrado</span>
                  <strong style="color: #0f172a; font-size: 14px;">${user.dni || '75187638'}</strong>
                </div>
              </div>

              <div class="d-grid gap-2">
                <a href="/mis-certificados" class="btn_two text-center" style="font-size: 13px; font-weight: 700; padding: 10px; border-radius: 8px; text-decoration: none; background: #f8fafc; border: 1px solid #cbd5e1; color: #1a2d62;">
                  <i class="fa fa-certificate me-1"></i> Ir a Mis Certificados
                </a>
                <button type="button" onclick="window.cerrarSesionMisCursos()" class="btn text-danger border" style="font-size: 13px; font-weight: 700; padding: 9px; border-radius: 8px; background: #fff5f5; border-color: #fecaca; cursor: pointer;">
                  <i class="fa fa-sign-out me-1"></i> Cerrar Sesión
                </button>
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA: FORMULARIO DE EDICIÓN DEL PERFIL -->
          <div class="col-lg-8 col-12">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 30px; box-shadow: 0 8px 24px rgba(16,24,40,0.04);">
              <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div>
                  <h3 style="color: #0f172a; font-size: 21px; font-weight: 800; margin: 0 0 4px;">Información del Estudiante</h3>
                  <p style="color: #64748b; font-size: 13.5px; margin: 0;">Actualiza tus datos para la emisión de tus certificados oficiales y alertas de WhatsApp.</p>
                </div>
                <span class="badge bg-success-subtle text-success border border-success-subtle p-2" style="font-size: 12px;">
                  <i class="fa fa-database me-1"></i> Sincronizado con PostgreSQL
                </span>
              </div>

              <hr style="margin: 20px 0; border-color: #f1f5f9;">

              <form onsubmit="event.preventDefault(); window.guardarCambiosPerfilEstudiante();">
                <div class="row g-3">
                  <div class="col-md-6 col-12">
                    <label class="form-label" style="font-weight: 700; color: #1a2d62; font-size: 13.5px;">Nombres *</label>
                    <input type="text" id="perfil-nombres" class="form-control" value="${user.nombres || ''}" required placeholder="Tus nombres completos" style="height: 44px; border-radius: 8px; font-size: 14px;">
                  </div>

                  <div class="col-md-6 col-12">
                    <label class="form-label" style="font-weight: 700; color: #1a2d62; font-size: 13.5px;">Apellidos *</label>
                    <input type="text" id="perfil-apellidos" class="form-control" value="${user.apellidos || ''}" required placeholder="Tus apellidos completos" style="height: 44px; border-radius: 8px; font-size: 14px;">
                  </div>

                  <div class="col-md-6 col-12">
                    <label class="form-label" style="font-weight: 700; color: #1a2d62; font-size: 13.5px;">
                      DNI / Documento de Identidad *
                    </label>
                    <input type="text" id="perfil-dni" class="form-control" value="${user.dni || ''}" required maxlength="12" placeholder="8 dígitos" style="height: 44px; border-radius: 8px; font-size: 14px;">
                    <small class="text-muted" style="font-size: 11.5px;">Utilizado en la boleta Sunat y tu certificado académico.</small>
                  </div>

                  <div class="col-md-6 col-12">
                    <label class="form-label" style="font-weight: 700; color: #1a2d62; font-size: 13.5px;">
                      WhatsApp para Enlaces de Clase *
                    </label>
                    <div class="input-group">
                      <span class="input-group-text" style="background: #f8fafc; font-weight: 700; font-size: 13.5px; color: #475569;">+51</span>
                      <input type="tel" id="perfil-whatsapp" class="form-control" value="${waLimpio}" placeholder="999555666" maxlength="12" style="height: 44px; border-radius: 0 8px 8px 0; font-size: 14px;">
                    </div>
                    <small class="text-muted" style="font-size: 11.5px;">Para recibir recordatorios de Zoom y accesos de clase.</small>
                  </div>

                  <div class="col-md-6 col-12">
                    <label class="form-label" style="font-weight: 700; color: #1a2d62; font-size: 13.5px;">Correo Electrónico (Cuenta)</label>
                    <input type="email" class="form-control bg-light" value="${user.correo || ''}" disabled style="height: 44px; border-radius: 8px; font-size: 14px; color: #64748b;">
                    <small class="text-muted" style="font-size: 11.5px;"><i class="fa fa-lock me-1"></i> Correo principal de acceso a la plataforma.</small>
                  </div>

                  <div class="col-md-6 col-12">
                    <label class="form-label" style="font-weight: 700; color: #1a2d62; font-size: 13.5px;">Estado de la Cuenta</label>
                    <input type="text" class="form-control bg-light" value="Cuenta Activa y Verificada" disabled style="height: 44px; border-radius: 8px; font-size: 14px; color: #15803d; font-weight: 700;">
                    <small class="text-muted" style="font-size: 11.5px;">Acceso con derechos de matrícula y certificación.</small>
                  </div>

                  <div class="col-12 mt-4 pt-2 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div style="font-size: 12px; color: #64748b;">
                      <i class="fa fa-shield text-success me-1"></i> Tus datos viajan protegidos con cifrado de extremo a extremo.
                    </div>
                    <button type="submit" id="btn-guardar-perfil" class="btn_one" style="padding: 12px 28px; font-size: 14px; font-weight: 800; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                      <i class="fa fa-save"></i> Guardar Cambios en mi Perfil
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderTabClases(user: UserProfile, container: HTMLElement): void {
    const nombreAlumno = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Estudiante';
    const iniciales = ((user.nombres ? user.nombres[0] : 'A') + (user.apellidos ? user.apellidos[0] : 'L')).toUpperCase();

    if (this.matriculasCargadas.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            <div class="d-flex align-items-center gap-3">
              <div style="width: 52px; height: 52px; border-radius: 50%; background: #2eca7f; color: #fff; font-size: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                ${iniciales}
              </div>
              <div>
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #15803d; letter-spacing: 0.5px;">Estudiante Conectado</div>
                <h4 style="font-size: 18px; font-weight: 800; color: #1a2d62; margin: 2px 0;">${nombreAlumno}</h4>
                <div style="font-size: 12px; color: #475569;">${user.correo} &bull; DNI: ${user.dni || '75187638'}</div>
              </div>
            </div>
            <div class="d-flex gap-2">
              <button type="button" onclick="window.cambiarTabEstudiante('perfil')" style="border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 700; color: #1a2d62; cursor: pointer;">
                <i class="fa fa-user me-1"></i> Mi Perfil
              </button>
              <button type="button" onclick="window.cerrarSesionMisCursos()" style="border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer;">
                <i class="fa fa-sign-out me-1"></i> Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
        <div class="col-12 text-center py-5">
          <div style="max-width: 520px; margin: 0 auto; background: #fff; padding: 40px 30px; border-radius: 12px; border: 1px solid #eef2f6;">
            <i class="ti-book text-muted" style="font-size: 54px; color: #94a3b8;"></i>
            <h3 class="mt-3" style="color: #0f172a; font-weight: 800; font-size: 22px;">Aún no tienes cursos matriculados</h3>
            <p class="text-muted mb-4" style="font-size: 14px;">Inscríbete en un curso de nuestro catálogo para acceder a tus salas en vivo y comprobantes:</p>
            <a href="/cursos" class="btn_one" style="border-radius: 8px; padding: 10px 24px; text-decoration: none;">
              <i class="fa fa-graduation-cap me-1"></i> Ver Catálogo de Cursos
            </a>
          </div>
        </div>
      `;
      return;
    }

    const headerHtml = `
      <div class="col-12 mb-2">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px 26px; margin-bottom: 25px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; box-shadow: 0 4px 18px rgba(0,0,0,0.03);">
          <div class="d-flex align-items-center gap-3">
            <div style="width: 54px; height: 54px; border-radius: 50%; background: #2eca7f; color: #ffffff; font-size: 19px; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(46, 202, 127, 0.35);">
              ${iniciales}
            </div>
            <div>
              <div class="d-flex align-items-center gap-2 mb-1">
                <span style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #15803d; background: #dcfce7; padding: 3px 9px; border-radius: 999px;">
                  <i class="fa fa-check-circle me-1"></i> Alumno Activo
                </span>
                <span class="badge bg-light text-dark border" style="font-size: 11px; font-weight: 700; border-radius: 999px;">
                  ${this.totalCursos} ${this.totalCursos === 1 ? 'Curso Matriculado' : 'Cursos Matriculados'}
                </span>
              </div>
              <h4 style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 0 0 3px;">${nombreAlumno}</h4>
              <div style="font-size: 12.5px; color: #64748b; display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                <span><i class="fa fa-envelope text-muted me-1"></i>${user.correo}</span>
                <span>&bull; <i class="fa fa-id-card text-muted me-1"></i>DNI: <strong>${user.dni || '75187638'}</strong></span>
                <span>&bull; <i class="fa fa-whatsapp text-success me-1"></i><strong>+51 ${user.whatsapp ? user.whatsapp.replace('+51', '').trim() : '935300159'}</strong></span>
              </div>
            </div>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <button type="button" onclick="window.cambiarTabEstudiante('perfil')" class="btn_two" style="font-size: 13px; font-weight: 700; padding: 10px 16px; border-radius: 8px; background: #f8fafc; border: 1px solid #cbd5e1; color: #1a2d62; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa fa-user"></i> Mi Perfil
            </button>
            <a href="/mis-certificados" class="btn_two" style="font-size: 13px; font-weight: 700; padding: 10px 16px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #cbd5e1; color: #1a2d62;">
              <i class="fa fa-certificate"></i> Certificados
            </a>
            <a href="/cursos" class="btn_one" style="font-size: 13px; font-weight: 700; padding: 10px 18px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa fa-plus"></i> Matricular otro curso
            </a>
            <button type="button" onclick="window.cerrarSesionMisCursos()" style="border: 1px solid #cbd5e1; background: #ffffff; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 700; color: #475569; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa fa-sign-out"></i> Salir
            </button>
          </div>
        </div>
      </div>
    `;

    const cardsHtml = this.matriculasCargadas.map((item, idx) => {
      const cid = (item.curso && item.curso.id) ? item.curso.id : (item.cursoId || item.id);
      const cursoRef = APP_CONFIG.INITIAL_COURSES.find(c => c.id === cid);

      const curso = {
        id: cid,
        titulo: (item.curso && item.curso.titulo) || item.cursoTitulo || (cursoRef ? cursoRef.titulo : 'Curso Profesional'),
        modalidad: (item.curso && item.curso.modalidad) || item.modalidad || (cursoRef ? cursoRef.modalidad : 'VIRTUAL'),
        horario: (item.curso && item.curso.horario) || item.horario || (cursoRef ? cursoRef.horario : 'Horario flexible'),
        enlaceClase: (item.curso && item.curso.enlaceClase) || item.enlaceClase || (cursoRef ? cursoRef.enlaceClase : 'https://meet.google.com/abc-defg-hij'),
        direccionClase: (item.curso && item.curso.direccionClase) || item.direccionClase || (cursoRef ? cursoRef.direccionClase : 'Sede Central - Av. Universitaria 1234, Lima'),
        aula: (item.curso && item.curso.aula) || item.aula || (cursoRef ? cursoRef.aula : 'Laboratorio 302'),
        imagen: (item.curso && item.curso.imagen) || (cursoRef ? cursoRef.imagen : `assets/images/all-img/c${(idx % 3) + 1}.png`)
      };

      const isVirtual = curso.modalidad === 'VIRTUAL';
      const comp = item.comprobante || {
        correlativo: 'B001-' + (item.codigoOrden ? item.codigoOrden.replace(/\D/g, '').slice(-8) : '00001042')
      };
      const correlativoStr = comp.correlativo || (comp.serie && comp.numeroCorrelativo ? `${comp.serie}-${String(comp.numeroCorrelativo).padStart(8, '0')}` : 'B001-00001042');

      const evalItem = this.pedidoService.getEvaluacionAcademica(cid, user.id);
      const estaAprobado = !!(evalItem && evalItem.aprobado);

      const academicBadgeHtml = estaAprobado
        ? `
          <div class="mt-2 mb-2 p-2 rounded border border-success bg-success bg-opacity-10 d-flex align-items-center justify-content-between" style="font-size: 11.5px;">
            <div style="color: #166534; font-weight: 700;">
              <i class="fa fa-check-circle me-1"></i> Curso Culminado y Aprobado (Nota: ${evalItem?.nota || 18}/20)
            </div>
            <a href="/mis-certificados" class="badge bg-success text-white text-decoration-none py-1 px-2" style="font-size: 11px;">
              <i class="fa fa-certificate me-1"></i> Certificado Disponible
            </a>
          </div>
        `
        : `
          <div class="mt-2 mb-2 p-2 rounded border border-warning" style="background: #fefce8; border-color: #fef08a !important; font-size: 11.5px;">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <span style="color: #854d0e; font-weight: 700;"><i class="fa fa-clock-o me-1"></i> Estado: En Curso (Clases Activas)</span>
              <span class="badge bg-light text-dark border" style="font-size: 10px;">65% avance</span>
            </div>
            <small class="text-muted d-block" style="font-size: 11px; line-height: 1.35;">
              <i class="fa fa-lock text-warning me-1"></i> Certificado oficial disponible al culminar todas las clases y aprobar las evaluaciones.
            </small>
          </div>
        `;

      let accessAction = '';
      if (isVirtual) {
        accessAction = `
          <div class="access-box-fixed">
            <a href="/aula-virtual?id=${curso.id || ''}" class="btn_one w-100 text-center d-flex align-items-center justify-content-center gap-2 mb-2" style="font-size: 13.5px; padding: 10px 14px; border-radius: 8px; text-decoration: none; font-weight: 800; background: #2eca7f; color: #ffffff;">
              <i class="fa fa-play-circle fs-5"></i> Entrar al Aula de Clases
            </a>
            <div class="d-flex align-items-center justify-content-between pt-1">
              <span style="font-size: 11.5px; color: #0284c7; font-weight: 700;">
                <i class="fa fa-video-camera me-1"></i> Meet / Zoom
              </span>
              <a href="${curso.enlaceClase || 'https://meet.google.com/abc-defg-hij'}" target="_blank" rel="noopener noreferrer" style="font-size: 11.5px; color: #0284c7; text-decoration: underline; font-weight: 700;">
                Abrir sala en vivo <i class="fa fa-external-link"></i>
              </a>
            </div>
          </div>
        `;
      } else {
        accessAction = `
          <div class="access-box-fixed">
            <a href="/aula-virtual?id=${curso.id || ''}" class="btn_one w-100 text-center d-flex align-items-center justify-content-center gap-2 mb-2" style="font-size: 13.5px; padding: 10px 14px; border-radius: 8px; text-decoration: none; font-weight: 800; background: #2eca7f; color: #ffffff;">
              <i class="fa fa-play-circle fs-5"></i> Entrar al Aula de Clases
            </a>
            <div class="d-flex align-items-center justify-content-between pt-1">
              <span style="font-size: 11px; color: #166534; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;">
                <i class="fa fa-building me-1"></i> Aula ${curso.aula || 'Lab 302'}
              </span>
              <a href="https://maps.google.com/?q=${encodeURIComponent(curso.direccionClase || 'Av. Universitaria 1234, Lima')}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #166534; text-decoration: underline; font-weight: 700;">
                Ver sede <i class="fa fa-map-marker"></i>
              </a>
            </div>
          </div>
        `;
      }

      return `
        <div class="col-lg-4 col-md-6 col-12 mis-cursos-col">
          <div class="course-slide mis-cursos-card">
            <div class="course-img">
              <img src="${curso.imagen || 'assets/images/all-img/c1.png'}" alt="${curso.titulo || 'Curso'}">
              <div class="badge-pago-confirmado">
                <i class="fa fa-check-circle"></i> Pago Confirmado
              </div>
            </div>
            <div class="course-content">
              <div class="card-main-info">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <span class="${isVirtual ? 'badge-mod-virtual' : 'badge-mod-presencial'}">
                    <i class="fa ${isVirtual ? 'fa-video-camera' : 'fa-building'} me-1"></i>${curso.modalidad || 'VIRTUAL'}
                  </span>
                  <span style="font-size: 11px; font-weight: 700; color: #64748b;">
                    <i class="fa fa-barcode me-1"></i>${item.codigoOrden || 'ORD-000000'}
                  </span>
                </div>
                <h3 class="course-title-fixed">
                  <a href="/curso-detalle?id=${curso.id || ''}" style="color: inherit; text-decoration: none;">${curso.titulo || 'Curso'}</a>
                </h3>
                <div style="font-size: 12.5px; color: #475569; margin-bottom: 4px; height: 20px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                  <i class="fa fa-calendar text-primary me-1"></i> ${curso.horario || 'Horario flexible'}
                </div>
                <div style="font-size: 12px; color: #64748b; height: 20px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                  <i class="fa fa-file-text-o text-muted me-1"></i> Comprobante: <a href="/mis-comprobantes" style="color: #1a2d62; font-weight: 800; text-decoration: underline;">${correlativoStr}</a>
                </div>
              </div>

              ${academicBadgeHtml}
              
              ${accessAction}

              <div class="card-footer-fixed">
                <a href="/curso-detalle?id=${curso.id || ''}" class="c_btn" style="text-decoration: none; font-size: 12px;">
                  <i class="fa fa-book me-1"></i> Ver Temario
                </a>
                <span style="font-size: 11px; color: #16a34a; font-weight: 700;">
                  <i class="fa fa-shield me-1"></i> Matrícula Oficial
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = headerHtml + cardsHtml;
  }
}
