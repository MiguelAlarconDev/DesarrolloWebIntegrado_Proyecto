import { Component, OnInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	@if (isPortalDocente) {
		<!-- START PORTAL DASHBOARD FOOTER -->
		<footer class="portal-footer" id="pie-de-pagina">
			<div class="container-fluid px-4 py-3">
				<div class="row align-items-center g-3">
					<div class="col-md-4 col-12 text-md-start text-center">
						<div class="d-flex align-items-center justify-content-md-start justify-content-center gap-2">
							<span class="portal-brand-badge"><i class="fa fa-graduation-cap"></i></span>
							<span class="fw-bold text-white small">Gestión de Cursos</span>
							<span class="badge bg-success-subtle text-success border border-success-subtle small">Panel Docente</span>
							<span class="text-secondary small">v2.4</span>
						</div>
					</div>
					<div class="col-md-5 col-12 text-center">
						<div class="portal-system-status d-inline-flex flex-wrap align-items-center justify-content-center gap-3 small text-secondary">
							<span><i class="fa fa-circle text-success me-1" style="font-size: 8px;"></i> API Gateway: <strong>8080</strong></span>
							<span><i class="fa fa-circle text-success me-1" style="font-size: 8px;"></i> Microservicios: <strong>En línea</strong></span>
							<span><i class="fa fa-database text-info me-1"></i> PostgreSQL: <strong>Conectado</strong></span>
						</div>
					</div>
					<div class="col-md-3 col-12 text-md-end text-center">
						<div class="d-inline-flex align-items-center gap-3 small">
							<a href="javascript:void(0)" (click)="onLogout()" class="portal-footer-link text-danger"><i class="fa fa-sign-out me-1"></i> Salir</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
		<!-- END PORTAL DASHBOARD FOOTER -->
	} @else if (isPortalAdmin) {
		<!-- START PORTAL DASHBOARD FOOTER -->
		<footer class="portal-footer" id="pie-de-pagina">
			<div class="container-fluid px-4 py-3">
				<div class="row align-items-center g-3">
					<div class="col-md-4 col-12 text-md-start text-center">
						<div class="d-flex align-items-center justify-content-md-start justify-content-center gap-2">
							<span class="portal-brand-badge"><i class="fa fa-graduation-cap"></i></span>
							<span class="fw-bold text-white small">Gestión de Cursos</span>
							<span class="badge bg-primary-subtle text-primary border border-primary-subtle small">Panel Administrador</span>
							<span class="text-secondary small">v2.4</span>
						</div>
					</div>
					<div class="col-md-5 col-12 text-center">
						<div class="portal-system-status d-inline-flex flex-wrap align-items-center justify-content-center gap-3 small text-secondary">
							<span><i class="fa fa-circle text-success me-1" style="font-size: 8px;"></i> API Gateway: <strong>8080</strong></span>
							<span><i class="fa fa-circle text-success me-1" style="font-size: 8px;"></i> Microservicios: <strong>En línea</strong></span>
							<span><i class="fa fa-database text-info me-1"></i> PostgreSQL: <strong>Conectado</strong></span>
						</div>
					</div>
					<div class="col-md-3 col-12 text-md-end text-center">
						<div class="d-inline-flex align-items-center gap-3 small">
							<a href="javascript:void(0)" (click)="onLogout()" class="portal-footer-link text-danger"><i class="fa fa-sign-out me-1"></i> Salir</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
		<!-- END PORTAL DASHBOARD FOOTER -->
	} @else {
		<!-- START FOOTER -->
		<footer class="footer section-padding" id="pie-de-pagina">
			<div class="container">
				<div class="row">
					<!-- Columna 1: Logo & Descripción -->
					<div class="col-lg-3 col-sm-6 col-12 mb-4 mb-lg-0">
						<div class="single_footer">
							<a href="/" class="d-inline-block mb-3">
								<img src="assets/images/all-img/logo2.png" alt="Gestión de Cursos" style="max-height: 48px; width: auto;">
							</a>
							<p>Plataforma líder en capacitación profesional con clases virtuales en vivo y presenciales en Lima. Inscripción automatizada con Mercado Pago y soporte académico continuo.</p>
						</div>
						<div class="foot_social">
							<ul>
								<li><a href="#" title="Facebook"><i class="fa fa-facebook"></i></a></li>
								<li><a href="#" title="Twitter"><i class="fa fa-twitter"></i></a></li>
								<li><a href="#" title="LinkedIn"><i class="fa fa-linkedin"></i></a></li>
								<li><a href="https://wa.me/51999555666" target="_blank" rel="noopener noreferrer" title="WhatsApp"><i class="fa fa-whatsapp"></i></a></li>
							</ul>
						</div>
					</div><!--- END COL -->

					<!-- Columna 2: Enlaces Rápidos -->
					<div class="col-lg-3 col-sm-6 col-12 mb-4 mb-lg-0">
						<div class="single_footer">
							<h4>Enlaces Rápidos</h4>
							<ul>
								<li><a href="/">Inicio</a></li>
								<li><a href="/cursos">Catálogo de Cursos</a></li>
								<li><a href="/carrito">Carrito de Matrícula</a></li>
								<li><a href="/mis-cursos">Mis Cursos</a></li>
								<li><a href="/login">Portal de Alumnos</a></li>
							</ul>
						</div>
					</div><!--- END COL -->

					<!-- Columna 3: Modalidades & Pagos -->
					<div class="col-lg-3 col-sm-6 col-12 mb-4 mb-lg-0">
						<div class="single_footer">
							<h4>Modalidades & Pagos</h4>
							<ul>
								<li><a href="/cursos?modalidad=VIRTUAL">Clases Virtuales en Vivo</a></li>
								<li><a href="/cursos?modalidad=PRESENCIAL">Clases Presenciales en Sede</a></li>
								<li><a href="/carrito">Mercado Pago (Tarjetas & Yape)</a></li>
								<li><a href="#">Comprobantes de Pago (Boleta / Factura)</a></li>
								<li><a href="/contacto">Mesa de Ayuda al Estudiante</a></li>
							</ul>
						</div>
					</div><!--- END COL -->

					<!-- Columna 4: Contacto Directo -->
					<div class="col-lg-3 col-sm-6 col-12">
						<div class="single_footer">
							<h4>Contacto Directo</h4>
							<div class="sf_contact">
								<span class="ti-mobile"></span>
								<h3>WhatsApp Oficial</h3>
								<p>+51 999 555 666</p>
							</div>
							<div class="sf_contact">
								<span class="ti-email"></span>
								<h3>Correo Académico</h3>
								<p>soporte@cursos.com</p>
							</div>
							<div class="sf_contact">
								<span class="ti-map"></span>
								<h3>Sede Central</h3>
								<p>Av. Universitaria 1234, Lima - Perú</p>
							</div>
						</div>
					</div><!--- END COL -->
				</div><!--- END ROW -->

				<!-- Fila Inferior: Copyright & Políticas -->
				<div class="row fc align-items-center">
					<div class="col-lg-6 col-sm-6 col-12 text-center text-sm-start mb-2 mb-sm-0">
						<div class="footer_copyright">
							<p>&copy; 2026 Gestión de Cursos. Todos los derechos reservados.</p>
						</div>
					</div>
					<div class="col-lg-6 col-sm-6 col-12 text-center text-sm-end">
						<div class="footer_menu">
							<ul>
								<li><a href="/">Inicio</a></li>
								<li><a href="/cursos">Cursos</a></li>
								<li><a href="/carrito">Carrito</a></li>
								<li><a href="/contacto">Contacto</a></li>
							</ul>
						</div>
					</div><!--- END COL -->
				</div><!--- END ROW -->
			</div><!--- END CONTAINER -->
		</footer>
		<!-- END FOOTER -->
	}
  `
})
export class FooterComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private navSub?: Subscription;
  isPortalDocente = false;
  isPortalAdmin = false;

  ngOnInit(): void {
    this.checkPortalRoute(this.router.url);
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.checkPortalRoute(e.urlAfterRedirects || e.url);
        setTimeout(() => {
          this.authService.updateNavbar();
        }, 30);
      });
  }

  onLogout(): void {
    this.authService.logout('index.html');
  }

  private checkPortalRoute(url: string): void {
    const clean = (url || '').toLowerCase();
    this.isPortalDocente = clean.includes('portal-docente') || clean.includes('docente');
    this.isPortalAdmin = clean.includes('portal-admin') || clean.includes('admin');
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }
}
