/**
 * AUTH.SERVICE.JS - Gestión de Seguridad, Login, Registro y Token JWT
 */
const AuthService = {
  /**
   * Inicia sesión llamando a auth-service / Gateway con Spring Security
   */
  async login(correo, password) {
    try {
      const response = await API.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ correo, password })
      });

      if (response && response.token) {
        this.saveSession(response.token, {
          id: response.usuarioId,
          nombres: response.nombres,
          apellidos: response.apellidos || '',
          dni: response.dni || '',
          correo: response.correo,
          rol: response.rol,
          whatsapp: response.whatsapp || '+51999555666'
        });
        return { success: true, user: this.getCurrentUser() };
      }
    } catch (err) {
      console.warn('[AuthService] Backend no disponible, usando autenticación demo local:', err.message);
      // Simulación local con los usuarios de schema_local.sql
      if (correo === 'admin@cursos.com' && password === '123456') {
        const mockUser = {
          id: 'a0000000-0000-0000-0000-000000000001',
          nombres: 'Admin',
          apellidos: 'General',
          dni: '10000001',
          correo: 'admin@cursos.com',
          rol: 'ADMIN',
          whatsapp: '+51999111222'
        };
        this.saveSession('mock-jwt-token-admin-session', mockUser);
        return { success: true, user: mockUser };
      } else if (password === '123456' || correo.includes('@')) {
        const mockUser = {
          id: 'a0000000-0000-0000-0000-000000000003',
          nombres: 'Carlos',
          apellidos: 'Alarcón',
          dni: '30000003',
          correo: correo,
          rol: 'ESTUDIANTE',
          whatsapp: '+51999555666'
        };
        this.saveSession('mock-jwt-token-estudiante-session', mockUser);
        return { success: true, user: mockUser };
      }
      throw new Error('Credenciales incorrectas. Verifique su correo y contraseña.');
    }
  },

  /**
   * Registro de nuevo estudiante con DNI y WhatsApp
   */
  async registro(data) {
    try {
      const payload = {
        dni: data.dni,
        nombres: data.nombres,
        apellidos: data.apellidos,
        correo: data.correo,
        whatsapp: data.whatsapp,
        password: data.password,
        rol: 'ESTUDIANTE'
      };

      const response = await API.request('/auth/registro', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response && response.token) {
        this.saveSession(response.token, {
          id: response.usuarioId,
          nombres: response.nombres || data.nombres,
          apellidos: response.apellidos || data.apellidos,
          dni: response.dni || data.dni,
          correo: data.correo,
          rol: 'ESTUDIANTE',
          whatsapp: data.whatsapp
        });
      }
      return { success: true };
    } catch (err) {
      console.warn('[AuthService] Usando simulación de registro local:', err.message);
      const newUser = {
        id: 'usr-' + Date.now(),
        nombres: data.nombres,
        apellidos: data.apellidos,
        dni: data.dni,
        correo: data.correo,
        rol: 'ESTUDIANTE',
        whatsapp: data.whatsapp
      };
      this.saveSession('mock-jwt-token-newuser', newUser);
      return { success: true, user: newUser };
    }
  },

  saveSession(token, user) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    this.updateNavbar();
  },

  logout(redirectUrl = 'login.html') {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem('app_order_history');
    localStorage.removeItem(CONFIG.STORAGE_KEYS.LAST_ORDER);
    this.updateNavbar();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
      if (!raw || raw === 'null' || raw === 'undefined') return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  },

  /**
   * Actualiza el Navbar en todas las páginas:
   * "Mis Clases" solo aparece si hay un usuario autenticado.
   */
  updateNavbar() {
    const user = this.getCurrentUser();

    if (typeof document !== 'undefined') {
      if (document.documentElement) document.documentElement.classList.toggle('is-logged-in', !!user);
      if (document.body) document.body.classList.toggle('is-logged-in', !!user);
    }

    const container = document.getElementById('auth-buttons-nav');
    if (container) {
      if (user) {
        const primerNombre = (user.nombres || 'Usuario').split(' ')[0];
        const rolTexto = user.rol === 'ADMIN' ? 'Admin' : 'Alumno';
        container.innerHTML = `
          <a class="btn_one btn-nav-user" href="mis-cursos.html" title="Ver mis cursos matriculados">
            <i class="fa fa-user-circle me-1"></i> ${primerNombre} (${rolTexto})
          </a>
          <a class="btn_two btn-nav-logout" href="#" onclick="AuthService.logout(); return false;" title="Cerrar sesión">
            <i class="fa fa-sign-out me-1"></i> Salir
          </a>
        `;
      } else {
        container.innerHTML = `
          <a class="btn_one" href="login.html">Ingresar</a>
          <a class="btn_two" href="registro.html">Registrarse</a>
        `;
      }
    }

    // Regla: "Mis Clases" SOLO aparece en el menú cuando hay usuario logueado
    const linksMisClases = document.querySelectorAll('a[href="mis-cursos.html"], a[href="mis-cursos"]');
    linksMisClases.forEach(link => {
      if (link.classList.contains('btn-nav-user')) return;
      const parentLi = link.closest('li');
      if (parentLi) {
        parentLi.style.display = user ? '' : 'none';
      } else {
        link.style.display = user ? '' : 'none';
      }
    });
  }
};

// Auto-ejecución inmediata para actualizar el navbar tan pronto cargue el DOM
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuthService.updateNavbar());
  } else {
    AuthService.updateNavbar();
  }
}
