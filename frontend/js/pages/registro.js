/**
 * registro.js - Lógica de Registro de Nuevos Alumnos
 * Validación de campos, registro en auth-service y bienvenida.
 */

async function hacerRegistro(e) {
	if (e && e.preventDefault) e.preventDefault();
	const btn = document.getElementById('btn-reg-penn');
	if (btn) {
		btn.disabled = true;
		btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Registrando en Backend...`;
	}

	const data = {
		nombres: document.getElementById('reg-nom') ? document.getElementById('reg-nom').value.trim() : '',
		apellidos: document.getElementById('reg-ape') ? document.getElementById('reg-ape').value.trim() : '',
		dni: document.getElementById('reg-dni') ? document.getElementById('reg-dni').value.trim() : '',
		whatsapp: '+51' + (document.getElementById('reg-wa') ? document.getElementById('reg-wa').value.trim() : ''),
		correo: document.getElementById('reg-mail') ? document.getElementById('reg-mail').value.trim() : '',
		password: document.getElementById('reg-pwd') ? document.getElementById('reg-pwd').value.trim() : ''
	};

	try {
		await AuthService.registro(data);
		Notifications.showToast('¡Registro exitoso! Bienvenido a Gestión de Cursos.', 'success');
		const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
		setTimeout(() => window.location.href = redirectUrl, 600);
	} catch (err) {
		Notifications.showToast(err.message, 'error');
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = `Registrarme Ahora`;
		}
	}
}

// Inicialización
$(document).ready(() => {
	CartService.updateBadge();
	AuthService.updateNavbar();

	const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
	if (redirectUrl) {
		document.querySelectorAll('a[href="login.html"], a[href^="login.html?"]').forEach(link => {
			link.href = 'login.html?redirect=' + encodeURIComponent(redirectUrl);
		});
	}
});
