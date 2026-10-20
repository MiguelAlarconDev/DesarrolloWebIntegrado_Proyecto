/**
 * login.js - Lógica de Inicio de Sesión
 * Autenticación contra el microservicio auth-service mediante AuthService,
 * almacenamiento seguro del token JWT y soporte para redirección tras login.
 */

async function hacerLogin(e) {
	if (e && e.preventDefault) e.preventDefault();
	const emailEl = document.getElementById('login-email');
	const pwdEl = document.getElementById('login-pwd');
	const btn = document.getElementById('btn-login-penn');

	const email = emailEl ? emailEl.value.trim() : '';
	const pwd = pwdEl ? pwdEl.value.trim() : '';

	if (btn) {
		btn.disabled = true;
		btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Iniciando Sesión...`;
	}

	try {
		const res = await AuthService.login(email, pwd);
		Notifications.showToast(`¡Bienvenido, ${res.user.nombres}!`, 'success');
		AuthService.updateNavbar();

		// Soporte de redirección personalizada (ej. si venía de querer inscribirse)
		const params = new URLSearchParams(window.location.search);
		const redirectUrl = params.get('redirect') || 'index.html';

		setTimeout(() => {
			window.location.href = redirectUrl;
		}, 400);
	} catch (err) {
		Notifications.showToast(err.message, 'error');
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = `Iniciar Sesión`;
		}
	}
}

// Carga rápida del usuario estudiante de prueba
async function cargarAlumnoDemo() {
	const emailEl = document.getElementById('login-email');
	const pwdEl = document.getElementById('login-pwd');
	if (emailEl) emailEl.value = 'estudiante@cursos.com';
	if (pwdEl) pwdEl.value = '123456';
	await hacerLogin();
}

// Inicialización
$(document).ready(() => {
	AuthService.updateNavbar();
	const counterEl = document.getElementById('cart-nav-counter');
	if (counterEl) counterEl.textContent = CartService.getCartCount();

	const params = new URLSearchParams(window.location.search);
	if (params.get('redirect')) {
		Notifications.showToast('Por favor carga o inicia sesión con tu usuario para continuar con la inscripción.', 'info');
	}
});
