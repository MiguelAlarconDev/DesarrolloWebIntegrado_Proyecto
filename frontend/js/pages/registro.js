/**
 * registro.js - Lógica de Registro de Nuevos Alumnos
 * Validación de campos, registro de usuario y bienvenida amigable.
 */

async function hacerRegistro(e) {
	if (e && e.preventDefault) e.preventDefault();
	const btn = document.getElementById('btn-reg');
	if (btn) {
		btn.disabled = true;
		btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Creando tu cuenta...`;
	}

	const nombres = document.getElementById('reg-nom') ? document.getElementById('reg-nom').value.trim() : '';
	const apellidos = document.getElementById('reg-ape') ? document.getElementById('reg-ape').value.trim() : '';
	const dni = document.getElementById('reg-dni') ? document.getElementById('reg-dni').value.trim() : '';
	const waRaw = document.getElementById('reg-wa') ? document.getElementById('reg-wa').value.replace(/^\+?51/, '').trim() : '';
	const correo = document.getElementById('reg-mail') ? document.getElementById('reg-mail').value.trim() : '';
	const password = document.getElementById('reg-pwd') ? document.getElementById('reg-pwd').value.trim() : '';

	if (!nombres || !apellidos) {
		Notifications.showToast('Por favor ingresa tus nombres y apellidos completos.', 'warning');
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = `Crear Cuenta y Continuar`;
		}
		return;
	}

	if (!correo || !correo.includes('@')) {
		Notifications.showToast('Ingresa un correo electrónico válido para recibir tus accesos.', 'warning');
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = `Crear Cuenta y Continuar`;
		}
		return;
	}

	if (password.length < 6) {
		Notifications.showToast('Tu contraseña debe tener al menos 6 caracteres.', 'warning');
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = `Crear Cuenta y Continuar`;
		}
		return;
	}

	const data = {
		nombres: nombres,
		apellidos: apellidos,
		dni: dni,
		whatsapp: '+51' + waRaw,
		correo: correo,
		password: password
	};

	try {
		await AuthService.registro(data);
		const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
		const isCheckout = redirectUrl.includes('checkout');

		if (btn) {
			btn.innerHTML = `<i class="fa fa-check"></i> ¡Cuenta creada con éxito!`;
		}

		Notifications.showToast(
			isCheckout
				? '¡Cuenta creada! Te estamos llevando a la pantalla de pago para finalizar tu inscripción...'
				: '¡Bienvenido! Tu cuenta ha sido creada exitosamente.',
			'success'
		);

		setTimeout(() => {
			window.location.href = redirectUrl;
		}, 600);
	} catch (err) {
		Notifications.showToast(err.message, 'error');
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = `Crear Cuenta y Continuar`;
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
