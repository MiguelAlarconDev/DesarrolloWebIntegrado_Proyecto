import { Component, AfterViewInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { CursoModel } from '../../services/config.data';
import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title">
					<h1 id="page-course-title">Detalle de Capacitación</h1>
					<ul>
						<li>Cursos / Detalle</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->
	
	<!-- Product Details Area  -->
	<div class="prdct_dtls_page_area section-padding">
		<div class="container">
			<div class="row">
				<!-- Product Details Image -->
				<div class="col-md-6 col-xs-12">
					<div class="pd_img fix">
						<a class="venobox" id="course-img-link" href="assets/images/all-img/c1.png">
							<img id="course-main-img" src="assets/images/all-img/c1.png" class="img-fluid" alt="Curso Gestión de Cursos"/>
						</a>
					</div>
				</div>
				<!-- Product Details Content -->
				<div class="col-md-6 col-xs-12">
					<div class="prdct_dtls_content">
						<div class="mb-2" id="course-modality-badge-box">
							<span class="badge-mod-virtual"><i class="fa fa-video-camera"></i> Clases Virtuales en Vivo (Zoom / Meet)</span>
						</div>
						<a class="pd_title" href="javascript:void(0)" id="course-name-heading">Desarrollo Web Integrado con Spring Boot</a>
						
						<div class="pd_price_dtls fix">
							<div class="pd_price">
								<span class="new" id="course-price-display">S/ 150.00</span>
							</div>
							<div class="pd_ratng">
								<div class="rtngs">
									<i class="fa fa-star"></i>
									<i class="fa fa-star"></i>
									<i class="fa fa-star"></i>
									<i class="fa fa-star"></i>
									<i class="fa fa-star"></i>
									<span>(5.0)</span>
								</div>
							</div>
						</div>

						<div class="pd_text">
							<h4>Descripción y Objetivos:</h4>
							<p id="course-overview-text">Domina el desarrollo con Spring Boot, arquitectura de microservicios, seguridad con JWT y despliegue empresarial.</p>
						</div>

						<!-- Especificación de Modalidad y Aforo -->
						<div class="pd_img_size fix">
							<h4>Modalidad de Dictado:</h4>
							<a href="javascript:void(0)" class="active" id="btn-modalidad-info" style="width: auto; padding: 0 15px;">VIRTUAL EN VIVO</a>
						</div>

						<div id="modality-location-box" class="p-3 bg-light rounded mb-3 border">
							<div class="d-flex align-items-center"><i class="fa fa-video-camera text-primary me-3 fa-2x"></i><div><strong>Plataforma Online:</strong> Google Meet / Zoom en Vivo<br><small class="text-muted">Horario: Lun y Mie 19:00 - 22:00 | Enlace enviado al instante por WhatsApp</small></div></div>
						</div>

						<!-- Control de Cupos y Aforo -->
						<div class="mb-4">
							<h4>Control de Vacantes en Tiempo Real:</h4>
							<div id="seats-live-status-container">
								<span class="seats-live-badge"><i class="fa fa-table"></i> Quedan 29 vacantes libres de 30</span>
							</div>
						</div>

						<!-- Product Action -->
						<div class="pd_btn fix">
							<button id="btn-enroll-action" class="btn btn-default acc_btn" style="cursor: pointer;">
								<i class="fa fa-shopping-cart me-1"></i> Inscribirme
							</button>
							<a href="/carrito" class="btn btn-default acc_btn btn_icn"><i class="fa fa-shopping-bag"></i></a>
							<a href="/cursos" class="btn btn-default acc_btn btn_icn"><i class="fa fa-arrow-left"></i></a>
						</div>

						<div class="pd_share_area fix mt-3">
							<h4>Garantías de la plataforma:</h4>
							<ul class="text-muted small ps-3">
								<li><i class="fa fa-check text-success"></i> Descuento de cupo en tiempo real (cero sobreventa).</li>
								<li><i class="fa fa-credit-card text-primary"></i> Pago protegido con pasarela oficial de Mercado Pago.</li>
								<li><i class="fa fa-whatsapp text-success"></i> Envío automático a tu WhatsApp con los enlaces de clase o aula física.</li>
								<li><i class="fa fa-file-text-o text-info"></i> Emisión inmediata de Boleta o Factura electrónica SUNAT.</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Pestañas Gestión de Cursos: Description, Information, Reviews -->
			<div class="row">
				<div class="col-xs-12">					
					<div class="pd_tab_area fix">									
						<ul class="pd_tab_btn nav nav-tabs" role="tablist">
						  <li>
							<a [class.active]="activeTab === 'description'" href="javascript:void(0)" (click)="selectTab('description')" role="tab">Temario del Curso</a>
						  </li>
						  <li>
							<a [class.active]="activeTab === 'information'" href="javascript:void(0)" (click)="selectTab('information')" role="tab">Modalidad & Acceso</a>
						  </li>
						  <li>
							<a [class.active]="activeTab === 'reviews'" href="javascript:void(0)" (click)="selectTab('reviews')" role="tab">Docente & Reseñas</a>
						  </li>
						</ul>

						<!-- Tab panes -->
						<div class="tab-content">
							<div role="tabpanel" class="tab-pane fade" [class.show]="activeTab === 'description'" [class.active]="activeTab === 'description'" id="description">
								<div id="tab-temario-content">Contenido completo del curso...</div>
							</div>

							<div role="tabpanel" class="tab-pane fade" [class.show]="activeTab === 'information'" [class.active]="activeTab === 'information'" id="information">
								<div id="tab-info-modality"></div>
							</div>

							<div role="tabpanel" class="tab-pane fade" [class.show]="activeTab === 'reviews'" [class.active]="activeTab === 'reviews'" id="reviews">
								<div class="pda_rtng_area fix">
									<h4>5.0 <span>(Calificación)</span></h4>
									<span>Basado en opiniones de alumnos egresados</span>
								</div>
								<div class="rtng_cmnt_area fix">
									<div class="single_rtng_cmnt">
										<div class="rtngs">
											<i class="fa fa-star"></i>
											<i class="fa fa-star"></i>
											<i class="fa fa-star"></i>
											<i class="fa fa-star"></i>
											<i class="fa fa-star"></i>
										</div>
										<div class="rtng_author">
											<h3 id="docente-tab-name">Docente Certificado</h3>
											<span>Especialista en la materia</span>
										</div>
										<p>Excelente metodología 100% práctica. La plataforma me entregó al instante de pagar el acceso por WhatsApp y no tuve ningún problema para ingresar a la clase.</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
  `
})
export class CursoDetalleComponent implements AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cursoService = inject(CursoService);
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);
  private sub?: Subscription;

  activeTab: 'description' | 'information' | 'reviews' = 'description';
  activeCurso: CursoModel | null = null;

  ngAfterViewInit(): void {
    this.sub = combineLatest([this.route.params, this.route.queryParams]).subscribe(([params, queryParams]) => {
      const routeId = params['id'] || queryParams['id'] || 'b0000000-0000-0000-0000-000000000001';
      setTimeout(() => {
        this.initDetalle(routeId);
      }, 20);
    });
  }

  selectTab(tab: 'description' | 'information' | 'reviews'): void {
    this.activeTab = tab;
  }

  async initDetalle(id: string): Promise<void> {
    const cachedList = this.cursoService.getCachedCursos('TODOS');
    this.activeCurso = cachedList.find(c => c.id === id) || cachedList[0] || null;
    const cachedPaid = this.pedidoService.getCachedPaidCourseIds();

    if (this.activeCurso) {
      this.renderCursoDetalleUI(this.activeCurso, cachedPaid.has(this.activeCurso.id));
    }

    const user = this.authService.getCurrentUser();
    let isPaid = cachedPaid.has(id);

    await Promise.allSettled([
      (async () => {
        const remoteCurso = await this.cursoService.getCursoById(id);
        if (remoteCurso) {
          this.activeCurso = remoteCurso;
        }
      })(),
      (async () => {
        if (!user) {
          isPaid = false;
          return;
        }
        try {
          const matriculas = await this.pedidoService.getMisMatriculas(user.id);
          isPaid = (matriculas || []).some(m => {
            const cid = (m.curso && m.curso.id) ? m.curso.id : (m.cursoId || m.id);
            return m.estado === 'PAGADO' && cid === id;
          });
        } catch (_) {}
      })()
    ]);

    if (this.activeCurso) {
      this.renderCursoDetalleUI(this.activeCurso, isPaid);
    }
  }

  private renderCursoDetalleUI(curso: CursoModel, isPaid: boolean): void {
    const elTitle = document.getElementById('page-course-title');
    if (elTitle) elTitle.textContent = curso.titulo;

    const elHeading = document.getElementById('course-name-heading');
    if (elHeading) elHeading.textContent = curso.titulo;

    const elPrice = document.getElementById('course-price-display');
    if (elPrice) elPrice.textContent = `S/ ${Number(curso.precio).toFixed(2)}`;

    const elOverview = document.getElementById('course-overview-text');
    if (elOverview) elOverview.textContent = curso.descripcion;

    const elImg = document.getElementById('course-main-img') as HTMLImageElement | null;
    if (elImg) elImg.src = curso.imagen;

    const elImgLink = document.getElementById('course-img-link') as HTMLAnchorElement | null;
    if (elImgLink) elImgLink.href = curso.imagen;

    const elDocente = document.getElementById('docente-tab-name');
    if (elDocente) elDocente.textContent = curso.docente || 'Docente Certificado';

    const isVirtual = curso.modalidad === 'VIRTUAL';
    const badgeBox = document.getElementById('course-modality-badge-box');
    if (badgeBox) {
      badgeBox.innerHTML = isVirtual
        ? `<span class="badge-mod-virtual"><i class="fa fa-video-camera"></i> Clases Virtuales en Vivo (Zoom / Meet)</span>`
        : `<span class="badge-mod-presencial"><i class="fa fa-building"></i> Clases Presenciales en Sede Física</span>`;
    }

    const btnModInfo = document.getElementById('btn-modalidad-info');
    if (btnModInfo) {
      btnModInfo.textContent = isVirtual ? 'VIRTUAL (ZOOM / MEET)' : 'PRESENCIAL (SEDE & AULA)';
    }

    const locBox = document.getElementById('modality-location-box');
    if (locBox) {
      if (isVirtual) {
        locBox.innerHTML = `
          <p class="mb-1 text-primary"><i class="fa fa-video-camera me-1"></i> <strong>Transmisión en Vivo:</strong> Plataformas Zoom / Google Meet.</p>
          <small class="text-muted"><i class="fa fa-whatsapp text-success me-1"></i> El enlace directo de la sala se enviará automáticamente a tu WhatsApp al confirmar tu pago.</small>
        `;
      } else {
        locBox.innerHTML = `
          <p class="mb-1 text-dark"><i class="fa fa-map-marker text-danger me-1"></i> <strong>Sede:</strong> ${curso.direccionClase || 'Av. Universitaria 1234, Lima'}</p>
          <p class="mb-1 text-dark"><i class="fa fa-door-open text-primary me-1"></i> <strong>Aula asignada:</strong> <span class="badge bg-dark">${curso.aula || 'Laboratorio 204'}</span></p>
          <small class="text-danger"><i class="fa fa-exclamation-triangle me-1"></i> Aforo estricto de carpetas. Asiento reservado garantizado al pagar.</small>
        `;
      }
    }

    const total = curso.aforoMaximo || 30;
    const libres = curso.aforoDisponible !== undefined ? curso.aforoDisponible : 30;
    const seatsBox = document.getElementById('seats-live-status-container');
    const btnAction = document.getElementById('btn-enroll-action') as HTMLButtonElement | null;
    const inCart = this.cartService.isInCart(curso.id);

    if (seatsBox && btnAction) {
      if (isPaid) {
        seatsBox.innerHTML = `<span class="seats-live-badge" style="background: #f0fdf4; color: #15803d; border-color: #86efac;"><i class="fa fa-check-circle"></i> <strong>Ya estás matriculado en este curso</strong></span>`;
        btnAction.className = 'btn btn_one';
        btnAction.style.background = '#16a34a';
        btnAction.innerHTML = `<i class="fa fa-graduation-cap me-1"></i> Ir a Mis Clases`;
        btnAction.onclick = () => {
          this.router.navigateByUrl('/mis-cursos');
        };
      } else if (libres <= 0) {
        seatsBox.innerHTML = `<span class="seats-live-badge soldout"><i class="fa fa-times-circle"></i> Aforo Completo (0 vacantes disponibles)</span>`;
        btnAction.disabled = true;
        btnAction.textContent = 'Vacantes Agotadas';
        btnAction.className = 'btn btn-secondary';
      } else {
        if (inCart) {
          seatsBox.innerHTML = `<span class="seats-live-badge" style="background: #f0f9ff; color: #0369a1; border-color: #bae6fd;"><i class="fa fa-shopping-cart"></i> <strong>Curso en tu carrito - Quedan ${libres} vacantes</strong></span>`;
        } else if (libres <= 3) {
          seatsBox.innerHTML = `<span class="seats-live-badge urgent"><i class="fa fa-bolt"></i> ¡ALERTA! Solo quedan ${libres} vacantes de ${total}</span>`;
        } else {
          seatsBox.innerHTML = `<span class="seats-live-badge"><i class="fa fa-table"></i> Quedan ${libres} vacantes libres de ${total}</span>`;
        }
        btnAction.disabled = false;
        btnAction.className = 'btn btn-default acc_btn';
        btnAction.style.background = '';
        btnAction.innerHTML = `<i class="fa fa-shopping-cart me-1"></i> Inscribirme`;
        btnAction.onclick = () => {
          const res = this.cartService.addToCart(curso);
          this.cartService.bumpBadge();
          this.notifications.showToast(res.message || '¡Curso agregado al carrito!', 'success');
          setTimeout(() => {
            this.router.navigateByUrl('/carrito');
          }, 300);
        };
      }
    }

    const temariosPorCurso: Record<string, string[]> = {
      'Desarrollo Web Integrado con Spring Boot': [
        'Módulo 1: Fundamentos de Arquitectura de Microservicios con Spring Boot 3 y Maven.',
        'Módulo 2: Seguridad Empresarial y Tokens JWT con expiración automática (Spring Security 6).',
        'Módulo 3: Base de Datos Relacional PostgreSQL, Persistencia con Spring Data JPA y Transacciones ACID.',
        'Módulo 4: Integración de Pasarela de Pagos Mercado Pago y Facturación Electrónica SUNAT.'
      ],
      'Arquitectura Cloud en Java': [
        'Módulo 1: Contenedores con Docker y orquestación para aplicaciones backend Java.',
        'Módulo 2: Despliegue en AWS (Amazon Web Services), ECS, Fargate y balanceo de carga.',
        'Módulo 3: Bases de datos en la nube con PostgreSQL en AWS RDS y replicación de alta disponibilidad.',
        'Módulo 4: Pipelines CI/CD automatizados con GitHub Actions y monitoreo con CloudWatch.'
      ],
      'Taller Presencial de Java y Microservicios': [
        'Módulo 1: Configuración en Laboratorio 204 y entorno JDK 21+ con IntelliJ IDEA y PostgreSQL local.',
        'Módulo 2: Desarrollo práctico guiado cara a cara con el docente: APIs REST y diseño por capas.',
        'Módulo 3: Manejo estricto de concurrencia y control de vacantes en tiempo real para evitar sobrecupos.',
        'Módulo 4: Despliegue en servidor local, pruebas de carga y entrega de proyecto integrador presencial.'
      ]
    };

    const temario = temariosPorCurso[curso.titulo] || [
      'Módulo 1: Fundamentos y configuración de entorno profesional.',
      'Módulo 2: Arquitectura moderna, buenas prácticas y desarrollo de casos reales.',
      'Módulo 3: Pruebas, seguridad y optimización del rendimiento.',
      'Módulo 4: Proyecto final integrador con evaluación y certificación.'
    ];

    const temarioHtml = temario.map((m) => `
      <li class="mb-2"><i class="fa fa-check-circle text-success me-2"></i> ${m}</li>
    `).join('');

    const tabTemario = document.getElementById('tab-temario-content');
    if (tabTemario) {
      tabTemario.innerHTML = `
        <p class="mb-3">${curso.descripcion}</p>
        <h5 class="fw-bold mb-3">Plan de Estudios Oficial:</h5>
        <ul class="list-unstyled ps-1">${temarioHtml}</ul>
      `;
    }

    const tabInfo = document.getElementById('tab-info-modality');
    if (tabInfo) {
      tabInfo.innerHTML = isVirtual ? `
        <div class="row">
          <div class="col-md-6 mb-3">
            <h5 class="fw-bold"><i class="fa fa-video-camera text-primary me-2"></i> Modalidad 100% Virtual en Vivo</h5>
            <p class="text-muted">Las clases se dictan en tiempo real mediante Zoom y Google Meet con chat interactivo para formular preguntas al docente en el momento.</p>
          </div>
          <div class="col-md-6 mb-3">
            <h5 class="fw-bold"><i class="fa fa-clock-o text-success me-2"></i> Horario y Duración</h5>
            <p class="text-muted">${curso.horario}. Todas las sesiones quedan grabadas en alta definición con acceso ilimitado para repaso.</p>
          </div>
          <div class="col-md-6 mb-3">
            <h5 class="fw-bold"><i class="fa fa-certificate text-warning me-2"></i> Certificación Oficial</h5>
            <p class="text-muted">Se emite un Certificado Digital con código QR de verificación al aprobar las prácticas del curso.</p>
          </div>
          <div class="col-md-6 mb-3">
            <h5 class="fw-bold"><i class="fa fa-whatsapp text-success me-2"></i> Entrega Inmediata de Accesos</h5>
            <p class="text-muted">Al confirmar tu matrícula, el enlace de la sala virtual se envía de inmediato a tu WhatsApp y a tu correo.</p>
          </div>
        </div>
      ` : `
        <div class="row">
          <div class="col-md-6 mb-3">
            <h5 class="fw-bold"><i class="fa fa-building text-success me-2"></i> Modalidad Presencial en Sede</h5>
            <p class="text-muted"><strong>Sede:</strong> ${curso.direccionClase || 'Av. Universitaria 1234, Pabellón B, Lima'}<br><strong>Aula asignada:</strong> <span class="badge bg-dark">${curso.aula || 'Laboratorio 204'}</span></p>
          </div>
          <div class="col-md-6 mb-3">
            <h5 class="fw-bold"><i class="fa fa-users text-primary me-2"></i> Aforo Físico Estricto</h5>
            <p class="text-muted">Cada alumno cuenta con una computadora y carpeta física asignada. Cero riesgo de sobreventa: solo se admiten ${curso.aforoMaximo} participantes.</p>
          </div>
          <div class="col-md-6 mb-3">
            <h5 class="fw-bold"><i class="fa fa-calendar text-danger me-2"></i> Horario de Laboratorio</h5>
            <p class="text-muted">${curso.horario}. El docente asiste de forma personalizada durante cada sesión práctica.</p>
          </div>
          <div class="col-md-6 mb-3">
            <h5 class="fw-bold"><i class="fa fa-certificate text-warning me-2"></i> Certificación Física y Digital</h5>
            <p class="text-muted">Diploma emitido por Gestión de Cursos al culminar satisfactoriamente el taller.</p>
          </div>
        </div>
      `;
    }

    this.cartService.updateBadge();
    this.authService.updateNavbar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
