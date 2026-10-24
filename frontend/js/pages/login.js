/**
 * login.js - Lógica de Inicio de Sesión, Verificación 2FA y Redirección Multirrol
 */

let pending2faCorreo = null;

async function hacerLogin(e) {
	if (e && e.preventDefault) e.preventDefault();
	const emailEl = document.getElementById('login-email');
	const pwdEl = document.getElementById('login-pwd');
	const btn = document.getElementById('btn-login');

	const email = emailEl ? emailEl.value.trim() : '';
	const pwd = pwdEl ? pwdEl.value.trim() : '';

	if (!email || !pwd) {
		Notifications.showToast('Por favor ingresa tu correo y contraseña.', 'warning');
		return;
	}

	if (btn) {
		btn.disabled = true;
		btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Iniciando Sesión...`;
	}

	try {
		const res = await AuthService.login(email, pwd);

		if (res.requires2fa) {
			pending2faCorreo = res.correo;
			mostrarModal2fa(res);
			if (btn) {
				btn.disabled = false;
				btn.innerHTML = `Iniciar Sesión`;
			}
			return;
		}

		loginExitoso(res.user);
	} catch (err) {
		Notifications.showToast(err.message, 'error');
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = `Iniciar Sesión`;
		}
	}
}

function mostrarModal2fa(data) {
	const modal = document.getElementById('modal-2fa');
	const boxMsg = document.getElementById('modal-2fa-msg');
	const inputOtp = document.getElementById('otp-code-input');

	// Extraer código de 6 dígitos si viene presente en la respuesta del backend
	let codeMatch = (data.mensaje || '').match(/\b\d{6}\b/);
	const code = codeMatch ? codeMatch[0] : '';

	if (boxMsg) {
		boxMsg.innerHTML = `
			<div class="alert alert-info py-2 px-3 mb-3" style="font-size: 13px; border-radius: 8px;">
				<i class="fa fa-shield me-1"></i> Se requiere autenticación 2FA para <strong>${data.nombres || data.correo}</strong> (${data.rol || 'Docente/Admin'}).
				${code ? `<div class="mt-2 pt-2 border-top"><strong>Código OTP generado:</strong> <span class="badge bg-dark fs-6 font-monospace ms-1">${code}</span></div>` : ''}
			</div>
		`;
	}

	if (inputOtp && code) {
		inputOtp.value = code;
	}

	if (modal) {
		modal.style.display = 'flex';
	}
}

function cerrarModal2fa() {
	const modal = document.getElementById('modal-2fa');
	if (modal) modal.style.display = 'none';
}

async function confirmar2fa() {
	const inputOtp = document.getElementById('otp-code-input');
	const btn = document.getElementById('btn-confirmar-2fa');
	const codigo = inputOtp ? inputOtp.value.trim() : '';

	if (!codigo || codigo.length < 4) {
		Notifications.showToast('Por favor ingresa el código de 6 dígitos.', 'warning');
		return;
	}

	if (btn) {
		btn.disabled = true;
		btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Verificando...`;
	}

	try {
		const res = await AuthService.verificar2fa(pending2faCorreo, codigo);
		cerrarModal2fa();
		loginExitoso(res.user);
	} catch (err) {
		Notifications.showToast(err.message, 'error');
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = `Verificar y Entrar`;
		}
	}
}

function loginExitoso(user) {
	Notifications.showToast(`¡Bienvenido, ${user.nombres}! Accediendo al portal...`, 'success');
	AuthService.updateNavbar();

	// Redirigir según el rol del usuario o URL explícita
	const params = new URLSearchParams(window.location.search);
	const explicitRedirect = params.get('redirect');

	let destUrl = AuthService.getPortalUrlForRole(user.rol);
	if (explicitRedirect) {
		const isStudentUrl = explicitRedirect.includes('mis-cursos') || explicitRedirect.includes('carrito');
		if ((user.rol === 'ADMIN' || user.rol === 'DOCENTE') && isStudentUrl) {
			destUrl = AuthService.getPortalUrlForRole(user.rol);
		} else {
			destUrl = explicitRedirect;
		}
	}

	setTimeout(() => {
		window.location.href = destUrl;
	}, 400);
}

// Carga rápida con 1 clic para cada perfil
async function cargarDemo(correo) {
	const emailEl = document.getElementById('login-email');
	const pwdEl = document.getElementById('login-pwd');
	if (emailEl) emailEl.value = correo;
	if (pwdEl) pwdEl.value = '123456';
	await hacerLogin();
}

function cargarAlumnoDemo() {
	cargarDemo('estudiante@cursos.com');
}

// Inicialización
$(document).ready(() => {
	AuthService.updateNavbar();
	CartService.updateBadge();

	const params = new URLSearchParams(window.location.search);
	const redirectUrl = params.get('redirect');
	if (redirectUrl) {
		Notifications.showToast('Ingresa con tu usuario para completar tu inscripción.', 'info');
		const linkReg = document.querySelector('a[href="registro.html"]');
		if (linkReg) {
			linkReg.href = 'registro.html?redirect=' + encodeURIComponent(redirectUrl);
		}
	}
});
