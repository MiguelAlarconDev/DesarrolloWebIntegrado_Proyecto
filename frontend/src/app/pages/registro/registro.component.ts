import { Component, AfterViewInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP  -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title wow fadeInRight" data-wow-duration="1s" data-wow-delay="0.3s">
					<h1>Registro de Estudiantes</h1>
					<ul>
						<li><a href="/">Inicio</a></li>
						<li> / Crear Cuenta de Alumno</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->

	<!-- START REGISTER  -->
	<section class="login_register section-padding">
		<div class="container">
			<div class="row">				
				<div class="col-lg-6 offset-lg-3 col-xs-12">
					<div class="register">
						<h4 class="login_register_title">Crea tu cuenta de estudiante:</h4>
						<p class="text-muted small mb-3">Completa tus datos para matricularte, recibir tu comprobante oficial y los enlaces de tus clases por WhatsApp y correo.</p>

						<form id="registro-form" (submit)="hacerRegistro($event)">
							<div class="form-group mb-2">
								<label>Nombres *</label>
								<input type="text" id="reg-nom" class="form-control requiredField input-label" required placeholder="Tus nombres">
							</div>
							<div class="form-group mb-2">
								<label>Apellidos *</label>
								<input type="text" id="reg-ape" class="form-control requiredField input-label" required placeholder="Tus apellidos">
							</div>
							<div class="form-group mb-2">
								<label>DNI / Documento *</label>
								<input type="text" id="reg-dni" class="form-control requiredField input-label" required maxlength="12" placeholder="8 dígitos">
							</div>
							<div class="form-group mb-2">
								<label>WhatsApp (Para recibir tus enlaces de clase) *</label>
								<input type="tel" id="reg-wa" class="form-control requiredField input-label" required placeholder="Ej. 999555666">
							</div>
							<div class="form-group mb-2">
								<label>Correo Electrónico *</label>
								<input type="email" id="reg-mail" class="form-control requiredField input-label" required placeholder="correo@ejemplo.com">
							</div>
							<div class="form-group mb-3">
								<label>Contraseña *</label>
								<input type="password" id="reg-pwd" class="form-control requiredField input-label" required minlength="6" placeholder="Mínimo 6 caracteres">
							</div>
							<div class="form-group col-lg-12">
								<button class="btn_one w-100" type="submit" id="btn-reg">Crear Cuenta y Continuar</button>
							</div>
						</form>

						<p class="mt-3 text-center">¿Ya tienes cuenta? <a href="/login" class="fw-bold text-success">Inicia sesión</a></p>
					</div>
				</div>
			</div>
		</div>
	</section>
	<!-- END REGISTER -->
  `
})
export class RegistroComponent implements AfterViewInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private notifications = inject(NotificationService);

  ngAfterViewInit(): void {
    this.cartService.updateBadge();
    this.authService.updateNavbar();
    const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
    if (redirectUrl) {
      document.querySelectorAll('a[href="/login"], a[href^="/login?"]').forEach((link: any) => {
        link.href = '/login?redirect=' + encodeURIComponent(redirectUrl);
      });
    }
  }

  async hacerRegistro(e: Event): Promise<void> {
    e.preventDefault();
    const btn = document.getElementById('btn-reg') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Creando tu cuenta...`;
    }

    const nombres = (document.getElementById('reg-nom') as HTMLInputElement)?.value?.trim() || '';
    const apellidos = (document.getElementById('reg-ape') as HTMLInputElement)?.value?.trim() || '';
    const dni = (document.getElementById('reg-dni') as HTMLInputElement)?.value?.trim() || '';
    const waRaw = ((document.getElementById('reg-wa') as HTMLInputElement)?.value || '').replace(/^\+?51/, '').trim();
    const correo = (document.getElementById('reg-mail') as HTMLInputElement)?.value?.trim() || '';
    const password = (document.getElementById('reg-pwd') as HTMLInputElement)?.value?.trim() || '';

    if (!nombres || !apellidos) {
      this.notifications.showToast('Por favor ingresa tus nombres y apellidos completos.', 'warning');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `Crear Cuenta y Continuar`;
      }
      return;
    }

    if (!correo || !correo.includes('@')) {
      this.notifications.showToast('Ingresa un correo electrónico válido para recibir tus accesos.', 'warning');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `Crear Cuenta y Continuar`;
      }
      return;
    }

    if (password.length < 6) {
      this.notifications.showToast('Tu contraseña debe tener al menos 6 caracteres.', 'warning');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `Crear Cuenta y Continuar`;
      }
      return;
    }

    const data = {
      nombres,
      apellidos,
      dni,
      whatsapp: '+51' + waRaw,
      correo,
      password
    };

    try {
      await this.authService.registro(data);
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
      const isCheckout = redirectUrl.includes('checkout');

      if (btn) {
        btn.innerHTML = `<i class="fa fa-check"></i> ¡Cuenta creada con éxito!`;
      }

      this.notifications.showToast(
        isCheckout
          ? '¡Cuenta creada! Te estamos llevando a la pantalla de pago para finalizar tu inscripción...'
          : '¡Bienvenido! Tu cuenta ha sido creada exitosamente.',
        'success'
      );

      setTimeout(() => {
        this.router.navigateByUrl('/' + redirectUrl.replace(/^\//, ''));
      }, 500);
    } catch (err: any) {
      this.notifications.showToast(err?.message || 'Error al registrar cuenta.', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `Crear Cuenta y Continuar`;
      }
    }
  }
}
