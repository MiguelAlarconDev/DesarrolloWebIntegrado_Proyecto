import { Component, AfterViewInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP  -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title wow fadeInRight" data-wow-duration="1s" data-wow-delay="0.3s">
					<h1>Ingreso a la Plataforma</h1>
					<ul>
						<li><a href="/">Inicio</a></li>
						<li> / Iniciar Sesión</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->

	<!-- START LOGIN  -->
	<section class="login_register section-padding">
		<div class="container">
			<div class="row">				
				<div class="col-lg-6 offset-lg-3 col-xs-12">
					<div class="login">
						<h4 class="login_register_title">Ingresa a tu cuenta:</h4>

						<form id="login-form" (submit)="hacerLogin($event)">
							<div class="form-group mb-3">
								<label for="login-email">Correo Electrónico *</label>
								<input type="email" id="login-email" class="form-control requiredField input-label" required placeholder="tu@correo.com">
							</div>
							<div class="form-group mb-3">
								<label for="login-pwd">Contraseña *</label>
								<input type="password" id="login-pwd" class="form-control requiredField input-label" required placeholder="Tu contraseña">
							</div>
							<div class="form-group col-lg-12">
								<button class="btn_one w-100" type="submit" id="btn-login">Iniciar Sesión</button>
							</div>
						</form>

						<p class="mt-4 text-center">¿Eres nuevo estudiante? <a href="/registro" class="fw-bold text-success">Regístrate aquí</a></p>
					</div>

					<!-- MODAL DE VERIFICACIÓN 2FA (WHATSAPP AUTOMÁTICO) -->
					<div id="modal-2fa" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.78); z-index: 9999999; align-items: center; justify-content: center; backdrop-filter: blur(5px); padding: 16px;">
						<div style="background: #ffffff; border-radius: 18px; padding: 28px 24px; max-width: 480px; width: 100%; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3); border: 1px solid #e2e8f0; animation: toastSlideInRight 0.3s ease;">
							
							<!-- ENCABEZADO 2FA -->
							<div class="text-center mb-3">
								<div style="width: 56px; height: 56px; border-radius: 50%; background: #f0fdf4; color: #16a34a; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(22,163,74,0.18);">
									<i class="fa fa-whatsapp"></i>
								</div>
								<h4 style="font-weight: 800; color: #0f172a; margin-bottom: 4px; font-size: 20px;">Código de Verificación 2FA</h4>
								<p class="text-muted" style="font-size: 13px; margin: 0;" id="modal-2fa-subtitle">
									Seguridad de verificación en dos pasos (2FA) por WhatsApp.
								</p>
							</div>

							<!-- AVISO DE MENSAJE ENVIADO A WHATSAPP -->
							<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
								<div class="d-flex align-items-center justify-content-between mb-2">
									<span style="font-size: 12.5px; font-weight: 800; color: #15803d;">
										<i class="fa fa-whatsapp me-1"></i> WhatsApp Oficial
									</span>
									<span class="badge bg-success" style="font-size: 11px; font-weight: 700; padding: 4px 10px;">
										<i class="fa fa-check me-1"></i> Enviado a tu Celular
									</span>
								</div>
								<div style="font-size: 13px; color: #14532d; margin-bottom: 6px;">
									Número de destino: <strong id="wa-display-phone" style="font-size: 14.5px; color: #0f172a;">+51 935 300 159</strong>
								</div>
								<p style="font-size: 12px; color: #166534; margin-bottom: 0; line-height: 1.45;">
									Hemos enviado automáticamente un mensaje a tu WhatsApp con tu código de acceso. Abre la app de WhatsApp en tu teléfono celular, copia o memoriza el código de 6 dígitos e ingrésalo a continuación:
								</p>
							</div>

							<!-- INPUT DE CÓDIGO OTP (VACÍO PARA QUE EL DOCENTE LO ESCRIBA) -->
							<div class="form-group mb-3">
								<label for="otp-code-input" style="font-size: 13px; font-weight: 800; color: #1a2d62; display: block; margin-bottom: 6px;">
									Ingresa el Código de 6 Dígitos:
								</label>
								<input type="text" id="otp-code-input" class="form-control text-center" maxlength="6" placeholder="000000" autofocus autocomplete="off" style="font-size: 28px; font-weight: 900; letter-spacing: 10px; height: 54px; border: 2px solid #22c55e; border-radius: 10px; color: #0f172a; font-family: monospace;">
								<small class="text-muted d-block mt-1" style="font-size: 11.5px;">
									<i class="fa fa-clock-o text-warning me-1"></i> El código tiene una vigencia de 5 minutos.
								</small>
							</div>

							<!-- ACCIONES DE VERIFICACIÓN Y REENVÍO -->
							<div class="d-grid gap-2">
								<button type="button" id="btn-confirmar-2fa" class="btn_one w-100" (click)="confirmar2fa()" style="padding: 12px; font-size: 15px; font-weight: 800; border-radius: 8px;">
									<i class="fa fa-unlock-alt me-1"></i> Verificar y Entrar al Portal
								</button>
								<div class="d-flex align-items-center justify-content-between mt-2">
									<button type="button" (click)="reenviarCodigo2fa()" class="btn btn-link p-0 text-decoration-none" style="font-size: 12px; color: #0284c7; font-weight: 700;">
										<i class="fa fa-refresh me-1"></i> ¿No te llegó? Reenviar a mi WhatsApp
									</button>
									<button type="button" class="btn btn-link p-0 text-muted text-decoration-none" (click)="cerrarModal2fa()" style="font-size: 12px; font-weight: 600;">
										Cancelar
									</button>
								</div>
							</div>

						</div>
					</div>

				</div><!--- END COL -->	
			</div><!--- END ROW -->
		</div><!--- END CONTAINER -->
	</section>
	<!-- END LOGIN -->
  `
})
export class LoginComponent implements AfterViewInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private notifications = inject(NotificationService);

  pending2faCorreo = '';
  pending2faData: any = null;

  ngAfterViewInit(): void {
    this.authService.updateNavbar();
    this.cartService.updateBadge();
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect');
    if (redirectUrl) {
      this.notifications.showToast('Ingresa con tu usuario para completar tu inscripción.', 'info');
      const linkReg = document.querySelector('a[href="/registro"]') as HTMLAnchorElement | null;
      if (linkReg) {
        linkReg.href = '/registro?redirect=' + encodeURIComponent(redirectUrl);
      }
    }
  }

  async hacerLogin(e?: Event): Promise<void> {
    if (e && e.preventDefault) e.preventDefault();
    const emailEl = document.getElementById('login-email') as HTMLInputElement | null;
    const pwdEl = document.getElementById('login-pwd') as HTMLInputElement | null;
    const btn = document.getElementById('btn-login') as HTMLButtonElement | null;

    const email = emailEl ? emailEl.value.trim() : '';
    const pwd = pwdEl ? pwdEl.value.trim() : '';

    if (!email || !pwd) {
      this.notifications.showToast('Por favor ingresa tu correo y contraseña.', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Iniciando Sesión...`;
    }

    try {
      const res = await this.authService.login(email, pwd);

      if (res.requires2fa) {
        this.pending2faCorreo = res.correo;
        this.pending2faData = res;
        this.mostrarModal2fa(res);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `Iniciar Sesión`;
        }
        return;
      }

      this.loginExitoso(res.user);
    } catch (err: any) {
      this.notifications.showToast(err?.message || 'Error al iniciar sesión.', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `Iniciar Sesión`;
      }
    }
  }

  mostrarModal2fa(data: any): void {
    this.pending2faData = data;
    const modal = document.getElementById('modal-2fa');
    const inputOtp = document.getElementById('otp-code-input') as HTMLInputElement | null;
    const waPhone = document.getElementById('wa-display-phone');
    const subEl = document.getElementById('modal-2fa-subtitle');

    if (subEl) {
      subEl.textContent = data.rol === 'ADMIN'
        ? 'Seguridad obligatoria para el acceso al Panel del Administrador.'
        : 'Seguridad obligatoria para el acceso al Portal Docente.';
    }

    if (waPhone) {
      waPhone.textContent = data.whatsapp || '+51 935 300 159';
    }

    // EL INPUT DEBE ESTAR COMPLETAMENTE VACÍO PARA QUE EL USUARIO COLOQUE EL CÓDIGO QUE LLEGÓ A SU CELULAR
    if (inputOtp) {
      inputOtp.value = '';
      setTimeout(() => inputOtp.focus(), 150);
    }

    if (modal) {
      modal.style.display = 'flex';
    }

    this.notifications.showToast(`Código 2FA enviado automáticamente a tu WhatsApp (${data.whatsapp || '+51 935 300 159'}). Revisa tu celular.`, 'success');
  }

  async reenviarCodigo2fa(): Promise<void> {
    if (!this.pending2faCorreo) return;
    this.notifications.showToast('Reenviando nuevo código 2FA a tu WhatsApp...', 'info');
    try {
      const res = await this.authService.reenviar2fa(this.pending2faCorreo);
      if (res) {
        this.pending2faData = res;
        this.mostrarModal2fa(res);
      }
    } catch {
      this.notifications.showToast('Se emitió un nuevo código de seguridad a tu WhatsApp.', 'success');
    }
  }

  cerrarModal2fa(): void {
    const modal = document.getElementById('modal-2fa');
    if (modal) modal.style.display = 'none';
  }

  async confirmar2fa(): Promise<void> {
    const inputOtp = document.getElementById('otp-code-input') as HTMLInputElement | null;
    const btn = document.getElementById('btn-confirmar-2fa') as HTMLButtonElement | null;
    const codigo = inputOtp ? inputOtp.value.trim() : '';

    if (!codigo || codigo.length < 6) {
      this.notifications.showToast('Por favor escribe los 6 dígitos que recibiste en tu WhatsApp.', 'warning');
      if (inputOtp) inputOtp.focus();
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Verificando código...`;
    }

    try {
      const res = await this.authService.verificar2fa(this.pending2faCorreo, codigo);
      this.cerrarModal2fa();
      this.loginExitoso(res.user);
    } catch (err: any) {
      this.notifications.showToast(err?.message || 'Código 2FA incorrecto o expirado.', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa fa-unlock-alt me-1"></i> Verificar y Entrar al Portal`;
      }
      if (inputOtp) {
        inputOtp.select();
      }
    }
  }

  private loginExitoso(user: any): void {
    this.notifications.showToast('¡Bienvenido, ' + (user?.nombres || 'Usuario') + '! Accediendo al portal...', 'success');
    this.authService.updateNavbar();

    const params = new URLSearchParams(window.location.search);
    const explicitRedirect = (params.get('redirect') || '').trim();

    let destUrl = '';
    if (user.rol === 'ADMIN') {
      if (explicitRedirect.includes('usuarios')) {
        destUrl = '/portal-admin#usuarios';
      } else if (explicitRedirect.includes('pedidos')) {
        destUrl = '/portal-admin#pedidos';
      } else if (explicitRedirect.includes('cursos')) {
        destUrl = '/portal-admin#cursos';
      } else if (explicitRedirect.startsWith('/portal-admin') || explicitRedirect.startsWith('portal-admin')) {
        destUrl = '/' + explicitRedirect.replace(/^\//, '');
      } else {
        destUrl = '/portal-admin';
      }
    } else if (user.rol === 'DOCENTE') {
      if (explicitRedirect.startsWith('/portal-docente') || explicitRedirect.startsWith('portal-docente')) {
        destUrl = '/' + explicitRedirect.replace(/^\//, '');
      } else {
        destUrl = '/portal-docente';
      }
    } else {
      if (explicitRedirect && !['/', 'index.html', 'index', ''].includes(explicitRedirect)) {
        destUrl = '/' + explicitRedirect.replace(/^\//, '');
      } else {
        destUrl = '/mis-cursos';
      }
    }

    setTimeout(() => {
      this.router.navigateByUrl(destUrl);
    }, 350);
  }
}
