import { Component, OnInit, AfterViewInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title">
					<h1>Contacto y Soporte</h1>
					<ul>
						<li>Contáctanos</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->

	<!-- START CONTACT SECTION (DISEÑO MODERNO) -->
	<section class="section-contact-modern" id="contacto">
		<div class="container">
			<div class="row align-items-center g-5">
				<!-- Columna Izquierda: Información de Contacto -->
				<div class="col-lg-5 col-md-12">
					<div class="contact-info-wrapper">
						<span class="contact-eyebrow"><i class="fa fa-headphones me-1"></i> Contáctanos</span>
						<h2 class="contact-main-heading">
							Comunícate con <span class="highlight-coral-word">Nosotros<svg class="handdrawn-stroke" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M 0 15 Q 50 0 100 12" stroke="#2eca7f" stroke-width="4" fill="none" stroke-linecap="round"></path></svg></span>
						</h2>
						<p class="contact-subtext">
							¿Tienes dudas sobre nuestros cursos, matrículas o certificaciones universitarias? Nuestro equipo de soporte académico está listo para ayudarte en todo momento.
						</p>

						<div class="contact-items-list">
							<!-- Item 1: Correo Electrónico -->
							<div class="contact-item-card">
								<div class="contact-icon-box icon-box-pink">
									<i class="fa fa-envelope-o"></i>
								</div>
								<div class="contact-item-content">
									<h4 class="contact-item-title">Correo Electrónico :</h4>
									<a href="mailto:soporte@cursos.com" class="contact-item-link">soporte@cursos.com</a>
								</div>
							</div>

							<!-- Item 2: Teléfonos de Contacto -->
							<div class="contact-item-card">
								<div class="contact-icon-box icon-box-teal">
									<i class="fa fa-phone"></i>
								</div>
								<div class="contact-item-content">
									<h4 class="contact-item-title">Llámanos o WhatsApp :</h4>
									<a href="tel:+51999555666" class="contact-item-link">+51 999 555 666</a>, <a href="tel:+5113118888" class="contact-item-link">+51 (01) 311 8888</a>
								</div>
							</div>

							<!-- Item 3: Sede Central -->
							<div class="contact-item-card">
								<div class="contact-icon-box icon-box-yellow">
									<i class="fa fa-map-marker"></i>
								</div>
								<div class="contact-item-content">
									<h4 class="contact-item-title">Sede Central :</h4>
									<p class="contact-item-text mb-0">Av. Universitaria 1801, San Miguel, Lima, Perú</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Columna Derecha: Tarjeta con Formulario de Contacto -->
				<div class="col-lg-7 col-md-12">
					<div class="contact-form-card">
						<form id="homeContactForm" (submit)="onContactSubmit($event)">
							<div class="row g-3">
								<div class="col-md-6 col-12">
									<input type="text" class="form-control contact-input" placeholder="Nombre Completo *" required>
								</div>
								<div class="col-md-6 col-12">
									<input type="email" class="form-control contact-input" placeholder="Correo Electrónico *" required>
								</div>
								<div class="col-md-6 col-12">
									<input type="text" class="form-control contact-input" placeholder="Asunto o Curso de Interés *" required>
								</div>
								<div class="col-md-6 col-12">
									<input type="tel" class="form-control contact-input" placeholder="Teléfono o WhatsApp">
								</div>
								<div class="col-12">
									<textarea class="form-control contact-textarea" rows="4" placeholder="Escribe aquí tu mensaje o consulta... *" required></textarea>
								</div>
								<div class="col-12">
									<button type="submit" class="btn btn-contact-submit">
										<i class="fa fa-paper-plane me-2"></i> Enviar Mensaje
									</button>
								</div>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	</section>
	<!-- END CONTACT SECTION -->
  `
})
export class ContactoComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private notifications = inject(NotificationService);

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      if (user.rol === 'ESTUDIANTE') {
        this.router.navigateByUrl('/mis-cursos');
      } else if (user.rol === 'DOCENTE') {
        this.router.navigateByUrl('/portal-docente');
      } else if (user.rol === 'ADMIN') {
        this.router.navigateByUrl('/portal-admin');
      }
    }
  }

  ngAfterViewInit(): void {
    this.authService.updateNavbar();
    this.cartService.updateBadge();
  }

  onContactSubmit(event: Event): void {
    event.preventDefault();
    this.notifications.success('¡Gracias por comunicarte con nosotros! Te responderemos a la brevedad.');
    const form = event.target as HTMLFormElement;
    if (form && form.reset) form.reset();
  }
}
