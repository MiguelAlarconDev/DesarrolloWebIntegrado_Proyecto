import { Component, AfterViewInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { APP_CONFIG, CursoModel } from '../../services/config.data';
import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START HOME HERO -->
	<section id="home" class="home_bg">
		<div class="container">
			<div class="row align-items-center">
				<div class="col-lg-6 col-sm-6 col-xs-12">	
					<div class="home_content">
						<h1>Capacitación <span>Profesional</span> en Vivo y Presencial</h1>
						<p>Inscripción 100% automatizada: Elige tu curso, reserva tu vacante en tiempo real sin sobreventa, paga seguro con Mercado Pago y recibe al instante tu boleta y tus accesos de Zoom o Aula por WhatsApp.</p>						
					</div>
					<div class="home_btn">
						<a href="/cursos" class="cta"><span>Explorar Cursos</span>
						  <svg width="13px" height="10px" viewBox="0 0 13 10">
							<path d="M1,5 L11,5"></path>
							<polyline points="8 1 12 5 8 9"></polyline>
						  </svg>
						</a>
					</div>		
				</div><!-- END COL-->
				<div class="col-lg-6 col-sm-6 col-xs-12">	
					<div class="home_me_img">
						<img src="assets/images/all-img/home-image.png" class="img-fluid" alt="Estudiantes Gestión de Cursos" />
						<div class="home_ps">
							<img src="assets/images/icon/user2.svg" alt="" />
							<h2>100%</h2>
							<span>Vacantes en Tiempo Real</span>
						</div>
						<div class="home_ps2">
							<img src="assets/images/icon/file2.svg" alt="" />
							<h2>Zoom & Sede</h2>
							<span>Modalidad Virtual / Física</span>
						</div>
					</div>		
				</div><!-- END COL-->
			</div><!--- END ROW -->			
		</div><!--- END CONTAINER -->
	</section>
	<!-- END HOME HERO -->

	<!-- START TOP PROMO FEATURES  -->
	<section class="tp_feature">
	   <div class="container">			
			<div class="row tp_promo_box">					
				<div class="col-lg-4 col-sm-4 col-xs-12 no-padding wow fadeInUp" data-wow-duration="1s" data-wow-delay="0.2s">
					<div class="single_tp">
						<h3>Cero Sobreventa de Vacantes</h3>
						<p>Control automático que descuenta los cupos en el momento exacto en que compras, garantizando tu asiento en el aula física o tu cupo en Zoom.</p>
						<a href="/beneficios?tema=vacantes" class="cta"><span>Ver Cursos Disponibles</span>
						  <svg width="13px" height="10px" viewBox="0 0 13 10"><path d="M1,5 L11,5"></path><polyline points="8 1 12 5 8 9"></polyline></svg>
						</a>
					</div>
				</div>			
				<div class="col-lg-4 col-sm-4 col-xs-12 no-padding wow fadeInUp" data-wow-duration="1s" data-wow-delay="0.3s">
					<div class="single_tp">
						<h3>Pago Seguro con Mercado Pago</h3>
						<p>Paga en línea al instante con tarjeta de crédito, débito o Yape/Plin mediante pasarela cifrada sin esperar transferencias manuales.</p>
						<a href="/beneficios?tema=pasarela" class="cta"><span>Conocer Pasarela</span>
						  <svg width="13px" height="10px" viewBox="0 0 13 10"><path d="M1,5 L11,5"></path><polyline points="8 1 12 5 8 9"></polyline></svg>
						</a>
					</div>
				</div>			
				<div class="col-lg-4 col-sm-4 col-xs-12 no-padding wow fadeInUp" data-wow-duration="1s" data-wow-delay="0.4s">
					<div class="single_tp">
						<h3>WhatsApp & Boleta Inmediatos</h3>
						<p>Recibe tu Boleta o Factura electrónica al instante y un mensaje automático a tu WhatsApp con los enlaces de clase o dirección del laboratorio.</p>
						<a href="/beneficios?tema=boleta" class="cta"><span>Mis Matrículas</span>
						  <svg width="13px" height="10px" viewBox="0 0 13 10"><path d="M1,5 L11,5"></path><polyline points="8 1 12 5 8 9"></polyline></svg>
						</a>
					</div>
				</div>							
			</div>
		</div>
	</section>
	<!-- END TOP PROMO FEATURES -->	

	<!-- START ABOUT US  -->
	<section class="ab_one section-padding">
		<div class="container">									
			<div class="row align-items-center">								
				<div class="col-lg-6 col-sm-12 col-xs-12 wow fadeInUp" data-wow-duration="1s" data-wow-delay="0.2s">
					<div class="ab_img">
						<img src="assets/images/all-img/about1.png" class="img-fluid" alt="Acerca de Gestión de Cursos">
					</div>
				</div>					
				<div class="col-lg-6 col-sm-12 col-xs-12 wow fadeInUp" data-wow-duration="1s" data-wow-delay="0.1s">
					<div class="ab_content">
						<h2>Aprende con <u><span>las dos modalidades</span></u> que mejor se adaptan a ti.</h2>
						<p>Hemos renovado por completo nuestra plataforma web para eliminar las demoras administrativas y ofrecerte confirmaciones al segundo.</p>
					</div>
					<div class="abmv">
						<span class="ti-video-camera"></span>
						<h4>Clases Virtuales en Vivo</h4>
						<p>Dictadas en tiempo real mediante Zoom y Google Meet con chat interactivo, docente en vivo y resolución de dudas.</p>
					</div>
					<div class="abmv">
						<span class="ti-home"></span>
						<h4>Clases Presenciales en Sede</h4>
						<p>Laboratorios de cómputo y aulas físicas equipadas con asignación estricta de carpetas para garantizar tu comodidad.</p>
					</div>	
					<a class="btn_one" href="/cursos">Explorar Todos los Cursos</a>
				</div>								  
			</div>
		</div>
	</section>
	<!-- END ABOUT US -->

	<!-- START COURSE SECTION  -->
	<div class="best-cpurse section-padding" id="cursos-section">
		<div class="container">
			<div class="section-title">
			  <h2>Cursos Destacados</h2>
			  <p>Capacitación profesional en vivo con <span><u>vacantes limitadas en tiempo real</u></span></p>
			</div>				
			
			<!-- Filtros de Modalidad -->
			<div class="text-center mb-5">
				<button type="button" (click)="filtrarCursos('TODOS')" [class]="currentModalidadHome === 'TODOS' ? 'btn_one me-2 mb-2 filter-mod-btn' : 'btn_two me-2 mb-2 filter-mod-btn'" style="cursor: pointer;">Todos los Cursos</button>
				<button type="button" (click)="filtrarCursos('VIRTUAL')" [class]="currentModalidadHome === 'VIRTUAL' ? 'btn_one me-2 mb-2 filter-mod-btn' : 'btn_two me-2 mb-2 filter-mod-btn'" style="cursor: pointer;"><i class="fa fa-video-camera"></i> Virtuales en Vivo</button>
				<button type="button" (click)="filtrarCursos('PRESENCIAL')" [class]="currentModalidadHome === 'PRESENCIAL' ? 'btn_one mb-2 filter-mod-btn' : 'btn_two mb-2 filter-mod-btn'" style="cursor: pointer;"><i class="fa fa-building"></i> Presenciales en Sede</button>
			</div>

			<!-- Grid de Cursos Gestión de Cursos con .course-slide -->
			<div class="row" id="cursos-container"></div>

			<div class="row mt-4">
				<div class="col-12 text-center">
					<a href="/cursos" class="btn_one" style="padding: 13px 32px; font-size: 15px; font-weight: 800; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
						<i class="fa fa-graduation-cap"></i> Ver Catálogo Completo de Cursos <i class="fa fa-arrow-right"></i>
					</a>
				</div>
			</div>
		</div>
	</div>
	<!-- END COURSE SECTION -->
  `
})
export class HomeComponent implements AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cursoService = inject(CursoService);
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);

  allCursos: CursoModel[] = [];
  currentModalidadHome = 'TODOS';
  searchKeywordHome = '';
  paidCourseIdsHome = new Set<string>();

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      (window as any).reservar = (id: string) => this.reservar(id);
      (window as any).filtrarCursos = (mod: string) => this.filtrarCursos(mod);
      (window as any).buscarCursos = (q: string) => this.buscarCursos(q);
    }

    this.initHome();

    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        setTimeout(() => {
          const el = document.getElementById(fragment);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    });
  }

  async initHome(): Promise<void> {
    this.actualizarEstadoNavbar();

    const params = new URLSearchParams(window.location.search);
    const urlMod = (params.get('modalidad') || '').toUpperCase();
    if (['VIRTUAL', 'PRESENCIAL', 'TODOS'].includes(urlMod)) {
      this.currentModalidadHome = urlMod;
    }
    const urlQ = params.get('q') || '';
    if (urlQ) {
      this.searchKeywordHome = urlQ.toLowerCase().trim();
    }

    this.allCursos = this.cursoService.getCachedCursos('TODOS');
    this.paidCourseIdsHome = this.pedidoService.getCachedPaidCourseIds();
    this.applyFilterHome();

    await Promise.allSettled([
      this.cargarCursosPagadosAlumnoHome(),
      (async () => {
        try {
          const remote = await this.cursoService.getCursos('TODOS');
          if (remote && remote.length > 0) {
            this.allCursos = remote;
          }
        } catch (e) {
          console.warn('Usando cursos iniciales precargados:', e);
        }
      })()
    ]);

    this.applyFilterHome();
    this.actualizarEstadoNavbar();
  }

  private async cargarCursosPagadosAlumnoHome(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.paidCourseIdsHome.clear();
      return;
    }
    try {
      const misMatriculas = await this.pedidoService.getMisMatriculas(user.id);
      this.paidCourseIdsHome.clear();
      (misMatriculas || []).forEach(m => {
        if (m.estado === 'PAGADO') {
          const cid = (m.curso && m.curso.id) ? m.curso.id : (m.cursoId || m.id);
          if (cid) this.paidCourseIdsHome.add(cid);
        }
      });
    } catch (_) {}
  }

  private actualizarEstadoNavbar(): void {
    this.cartService.updateBadge();
    this.authService.updateNavbar();
  }

  buscarCursos(keyword: string): void {
    this.searchKeywordHome = (keyword || '').toLowerCase().trim();
    this.applyFilterHome();
  }

  filtrarCursos(mod: string): void {
    this.currentModalidadHome = mod;
    this.applyFilterHome();
  }

  private applyFilterHome(): void {
    let filtered = this.cursoService.filterByModalidad(this.allCursos, this.currentModalidadHome);
    if (this.searchKeywordHome) {
      filtered = filtered.filter(c =>
        (c.titulo && c.titulo.toLowerCase().includes(this.searchKeywordHome)) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(this.searchKeywordHome)) ||
        (c.docente && c.docente.toLowerCase().includes(this.searchKeywordHome))
      );
    }
    this.renderCursos(filtered);
  }

  private renderCursos(list: CursoModel[]): void {
    const container = document.getElementById('cursos-container');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <div style="max-width: 460px; margin: 0 auto; background: #ffffff; padding: 36px 24px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); border: 1px solid #eef2f6;">
            <i class="fa fa-search text-muted mb-3" style="font-size: 38px; display: block;"></i>
            <h4 style="font-size: 18px; font-weight: 700; color: #1a2d62; margin-bottom: 8px;">No se encontraron cursos</h4>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">Intenta con otro término de búsqueda o selecciona "Todos los Cursos".</p>
            <button onclick="window.buscarCursos(''); window.filtrarCursos('TODOS');" class="btn_one" style="padding: 6px 18px; font-size: 13px;">Ver todos los cursos</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((c, i) => {
      const isVirtual = c.modalidad === 'VIRTUAL';
      const badgeHtml = isVirtual
        ? `<span class="badge-mod-virtual"><i class="fa fa-video-camera"></i> Virtual en Vivo (Zoom / Meet)</span>`
        : `<span class="badge-mod-presencial"><i class="fa fa-building"></i> Presencial (Sede & Aula)</span>`;

      const total = c.aforoMaximo || 30;
      const libres = c.aforoDisponible !== undefined ? c.aforoDisponible : 30;
      let seatsClass = 'seats-live-badge';
      let seatsText = `<i class="fa fa-table"></i> <strong>${libres} Vacantes Disponibles</strong> (de ${total})`;

      if (libres <= 0) {
        seatsClass += ' soldout';
        seatsText = `<i class="fa fa-times-circle"></i> <strong>Aforo Completo (Agotado)</strong>`;
      } else if (libres <= 3) {
        seatsClass += ' urgent';
        seatsText = `<i class="fa fa-exclamation-circle"></i> <strong>¡Últimas ${libres} Vacantes!</strong>`;
      }

      const imgUrl = c.imagen || `assets/images/all-img/c${(i % 6) + 1}.png`;
      const docenteNombre = c.docente || (isVirtual ? 'Ing. Roberto Docente' : 'Ing. Carlos Mendoza');
      const isPaid = this.paidCourseIdsHome.has(c.id);

      let actionBtnHtml = '';
      if (isPaid) {
        actionBtnHtml = `
          <a href="/mis-cursos" class="btn_one btn-card-enrolled" style="text-decoration: none; padding: 7px 14px; font-size: 12.5px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
            <i class="fa fa-graduation-cap"></i> Ir a Mi Clase
          </a>
        `;
      } else if (libres > 0) {
        actionBtnHtml = `
          <button onclick="window.reservar('${c.id}')" class="btn_two btn-card-inscribir" style="cursor: pointer;">
            <i class="fa fa-shopping-cart"></i> Inscribirme
          </button>
        `;
      } else {
        actionBtnHtml = `<button type="button" class="btn_two btn-card-agotado" disabled style="opacity: 0.65; cursor: not-allowed; background: #f1f5f9; color: #94a3b8; border: 1.5px solid #e2e8f0; font-size: 12.5px; font-weight: 700; border-radius: 6px; padding: 8px 14px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa fa-lock"></i> Agotado</button>`;
      }

      const enrolledTag = isPaid
        ? `<div class="badge-enrolled-corner"><i class="fa fa-check-circle me-1"></i>Ya Matriculado</div>`
        : '';

      return `
        <div class="col-lg-4 col-sm-6 col-xs-12" style="margin-bottom: 30px;">
          <div class="course-slide" style="height: 100%; display: flex; flex-direction: column; box-shadow: 0 5px 20px rgba(0,0,0,0.06); border-radius: 8px; overflow: hidden; background: #fff; position: relative;">
            <div class="course-img" style="position: relative;">
              <a href="/curso-detalle?id=${c.id}">
                <img src="${imgUrl}" alt="${c.titulo}" style="width: 100%; height: 210px; object-fit: cover;">
              </a>
              ${enrolledTag}
              <div class="course-date">
                <span class="month" style="font-weight: 700; font-size: 16px;">S/ ${Number(c.precio).toFixed(2)}</span>
              </div>
            </div>
            <div class="course-content" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 25px;">
              <div>
                <div class="mb-2">${badgeHtml}</div>
                <h3 style="font-size: 18px; line-height: 1.4; margin-bottom: 12px; min-height: 50px;">
                  <a href="/curso-detalle?id=${c.id}">${c.titulo}</a>
                </h3>
                <span class="d-block text-muted mb-1" style="font-size: 14px;"><i class="fa fa-calendar text-primary me-1"></i> ${c.horario}</span>
                <span class="d-block text-muted mb-3" style="font-size: 14px;"><i class="fa fa-user-circle text-secondary me-1"></i> ${docenteNombre}</span>
                <div class="mb-3">
                  <span class="${seatsClass}">${seatsText}</span>
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center pt-3 border-top">
                <a class="c_btn" href="/curso-detalle?id=${c.id}"><i class="fa fa-book me-1"></i> Ver Temario</a>
                ${actionBtnHtml}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  reservar(cursoId: string): void {
    let c = (this.allCursos && this.allCursos.length > 0) ? this.allCursos.find(item => item.id === cursoId) : undefined;
    if (!c) {
      c = APP_CONFIG.INITIAL_COURSES.find(item => item.id === cursoId);
    }
    if (!c) {
      const cached: CursoModel[] = JSON.parse(localStorage.getItem('app_cursos_cache') || '[]');
      c = cached.find(item => item.id === cursoId);
    }
    if (!c) {
      this.router.navigateByUrl('/carrito');
      return;
    }

    const res = this.cartService.addToCart(c);
    this.actualizarEstadoNavbar();
    this.cartService.bumpBadge();
    this.applyFilterHome();

    this.notifications.showToast(res.message || '¡Curso agregado a tu carrito!', 'success');
    setTimeout(() => {
      this.router.navigateByUrl('/carrito');
    }, 500);
  }
}
