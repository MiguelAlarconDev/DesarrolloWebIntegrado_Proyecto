import { Component, AfterViewInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { APP_CONFIG } from '../../services/config.data';
import { AuthService } from '../../services/auth.service';
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
						<li>Mis Cursos y Accesos</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->

	<!-- CONTENIDO DEL PORTAL -->
	<div class="best-cpurse section-padding">
		<div class="container">
			<div class="section-title">
			  <h2>Mis Cursos Matriculados</h2>
			  <p>Accede directamente a tu <span><u>enlace de Zoom / Meet</u></span> o consulta tu <span><u>aula física</u></span></p>
			</div>

			<div class="row g-4" id="mis-cursos-list">
				<!-- Inyectado dinámicamente según el usuario que ingrese -->
			</div>
		</div>
	</div>
  `
})
export class EstudiantePanelComponent implements AfterViewInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      (window as any).cargarAlumnoDemoMisCursos = () => this.cargarAlumnoDemoMisCursos();
      (window as any).cerrarSesionMisCursos = () => this.cerrarSesionMisCursos();
    }
    this.initMisCursos();
  }

  async cargarAlumnoDemoMisCursos(): Promise<void> {
    try {
      this.notifications.showToast('Autenticando alumno en el sistema...', 'info');
      const res = await this.authService.login('estudiante@cursos.com', '123456');
      this.notifications.showToast(`¡Bienvenido, ${res.user.nombres}! Cargando tus clases...`, 'success');
      this.authService.updateNavbar();
      await this.initMisCursos();
    } catch (err: any) {
      this.notifications.showToast('Error al cargar alumno: ' + err?.message, 'error');
    }
  }

  cerrarSesionMisCursos(): void {
    this.authService.logout(null);
    this.initMisCursos();
    this.notifications.showToast('Sesión cerrada. Puedes ingresar con otra cuenta.', 'info');
  }

  async initMisCursos(): Promise<void> {
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
    if (!user && typeof window !== 'undefined' && window.location.search && window.location.search.includes('sample=1')) {
      user = {
        id: 'a0000000-0000-0000-0000-000000000003',
        nombres: 'Carlos',
        apellidos: 'Alarcón',
        correo: 'estudiante@cursos.com',
        dni: '30000003',
        whatsapp: '999555666',
        rol: 'ESTUDIANTE'
      };
    }

    const container = document.getElementById('mis-cursos-list');
    if (!container) return;

    container.innerHTML = '';

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
              Accede a tus Clases Matriculadas
            </h3>
            <p style="color: #64748b; font-size: 14px; line-height: 1.55; margin-bottom: 24px;">
              Inicia sesión con tu cuenta de alumno para entrar a tus salas virtuales de Zoom/Meet, consultar tus horarios y revisar tus aulas asignadas.
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
                <i class="fa fa-bolt me-1"></i> Cargar Usuario Estudiante (Carlos Alarcón)
              </button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Cargando tus clases...</span>
        </div>
        <p class="mt-3 text-muted" style="font-size: 14px;">Consultando tus matrículas oficiales en la base de datos...</p>
      </div>
    `;

    const todasMatriculas = await this.pedidoService.getMisMatriculas(user.id);

    const cursosVistos = new Set<string>();
    const matriculas = (todasMatriculas || []).filter(item => {
      const isPagado = item.estado === 'PAGADO';
      if (!isPagado) return false;
      const cid = (item.curso && item.curso.id) ? item.curso.id : (item.cursoId || item.id);
      if (cursosVistos.has(cid)) return false;
      cursosVistos.add(cid);
      return true;
    });

    const nombreAlumno = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Estudiante';
    const iniciales = ((user.nombres ? user.nombres[0] : 'A') + (user.apellidos ? user.apellidos[0] : 'L')).toUpperCase();

    if (matriculas.length === 0) {
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
                <div style="font-size: 12px; color: #475569;">${user.correo} &bull; DNI: ${user.dni || '30000003'}</div>
              </div>
            </div>
            <button type="button" onclick="window.cerrarSesionMisCursos()" style="border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; padding: 8px 16px; font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer;">
              <i class="fa fa-sign-out me-1"></i> Cerrar Sesión
            </button>
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
                  ${matriculas.length} ${matriculas.length === 1 ? 'Curso Matriculado' : 'Cursos Matriculados'}
                </span>
              </div>
              <h4 style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 0 0 3px;">${nombreAlumno}</h4>
              <div style="font-size: 12.5px; color: #64748b; display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                <span><i class="fa fa-envelope text-muted me-1"></i>${user.correo}</span>
                <span>&bull; <i class="fa fa-id-card text-muted me-1"></i>DNI: <strong>${user.dni || '30000003'}</strong></span>
                <span>&bull; <i class="fa fa-whatsapp text-success me-1"></i><strong>+51 ${user.whatsapp ? user.whatsapp.replace('+51', '').trim() : '999555666'}</strong></span>
              </div>
            </div>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <a href="/mis-comprobantes" class="btn_two" style="font-size: 13px; font-weight: 700; padding: 10px 16px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #cbd5e1; color: #1a2d62;">
              <i class="fa fa-file-text-o"></i> Mis Comprobantes
            </a>
            <a href="/cursos" class="btn_one" style="font-size: 13px; font-weight: 700; padding: 10px 18px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa fa-plus"></i> Matricular otro curso
            </a>
            <button type="button" onclick="window.cerrarSesionMisCursos()" style="border: 1px solid #cbd5e1; background: #ffffff; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 700; color: #475569; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease;">
              <i class="fa fa-sign-out"></i> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    `;

    const cardsHtml = matriculas.map((item, idx) => {
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

      let accessAction = '';
      if (isVirtual) {
        accessAction = `
          <div class="access-box-fixed">
            <div>
              <strong class="d-block mb-1" style="color: #0284c7; font-size: 13px;">
                <i class="fa fa-video-camera me-1"></i> Sala Virtual en Vivo (Meet / Zoom)
              </strong>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 0; line-height: 1.4;">
                Clases online en tiempo real con interacción docente.
              </p>
            </div>
            <a href="${curso.enlaceClase || 'https://meet.google.com/abc-defg-hij'}" target="_blank" rel="noopener noreferrer" class="btn_one w-100 text-center d-flex align-items-center justify-content-center gap-2" style="font-size: 12.5px; padding: 9px 14px; border-radius: 8px; text-decoration: none; font-weight: 700;">
              <i class="fa fa-external-link"></i> Entrar a la Sala Virtual
            </a>
          </div>
        `;
      } else {
        accessAction = `
          <div class="access-box-fixed">
            <div>
              <strong class="d-block mb-1" style="color: #166534; font-size: 13px;">
                <i class="fa fa-building me-1"></i> Clase Presencial con Asiento Asignado
              </strong>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 0; line-height: 1.4;">
                <i class="fa fa-map-marker text-danger me-1"></i>${curso.direccionClase || 'Sede Central - Av. Universitaria 1234'} &bull; <strong>Aula: ${curso.aula || 'Lab 302'}</strong>
              </p>
            </div>
            <a href="https://maps.google.com/?q=${encodeURIComponent(curso.direccionClase || 'Av. Universitaria 1234, Lima')}" target="_blank" rel="noopener noreferrer" class="btn_two w-100 text-center d-flex align-items-center justify-content-center gap-2" style="font-size: 12.5px; padding: 9px 14px; border-radius: 8px; text-decoration: none; font-weight: 700;">
              <i class="fa fa-map-marker"></i> Ver Ubicación de Sede
            </a>
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
