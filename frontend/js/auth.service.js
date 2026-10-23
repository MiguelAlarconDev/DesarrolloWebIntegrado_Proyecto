/**
 * AUTH.SERVICE.JS - Gestión de Seguridad, Login, Registro y Token JWT
 */
const AuthService = {
  /**
   * Inicia sesión llamando a auth-service / Gateway con Spring Security.
   * El modo demo local SOLO se usa si el backend no está disponible (error de red)
   * y SOLO con las cuentas de prueba: una contraseña incorrecta nunca inicia sesión.
   */
  async login(correo, password) {
    correo = (correo || '').trim().toLowerCase();
    if (!correo || !password) {
      throw new Error('Ingresa tu correo y contraseña.');
    }

    try {
      const response = await API.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ correo, password })
      });

      if (!response || !response.token) {
        throw new Error('No se pudo iniciar sesión. Inténtalo nuevamente.');
      }

      // Conservar datos de contacto guardados previamente para este mismo usuario
      const previo = this.getCurrentUser();
      const mismoUsuario = previo && previo.id === response.usuarioId;

      this.saveSession(response.token, {
        id: response.usuarioId,
        nombres: response.nombres,
        apellidos: response.apellidos || '',
        dni: response.dni || (mismoUsuario ? previo.dni : '') || '',
        correo: response.correo || correo,
        rol: response.rol,
        whatsapp: response.whatsapp || (mismoUsuario ? previo.whatsapp : '') || ''
      });
      return { success: true, user: this.getCurrentUser() };
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        throw new Error('Correo o contraseña incorrectos.');
      }
      if (err.status) throw err;

      // Backend caído: modo demo local solo con las cuentas de prueba de schema_local.sql
      const demo = this.DEMO_USERS[correo];
      if (demo && password === '123456') {
        console.warn('[AuthService] Backend no disponible, usando cuenta demo local.');
        this.saveSession('mock-jwt-token-' + demo.rol.toLowerCase(), { ...demo });
        return { success: true, user: this.getCurrentUser() };
      }
      throw new Error('No pudimos conectar con el servidor. Inténtalo en unos segundos.');
    }
  },

  DEMO_USERS: {
    'admin@cursos.com': {
      id: 'a0000000-0000-0000-0000-000000000001', nombres: 'Admin', apellidos: 'General',
      dni: '10000001', correo: 'admin@cursos.com', rol: 'ADMIN', whatsapp: '+51999111222'
    },
    'estudiante@cursos.com': {
      id: 'a0000000-0000-0000-0000-000000000003', nombres: 'Carlos', apellidos: 'Alarcón',
      dni: '30000003', correo: 'estudiante@cursos.com', rol: 'ESTUDIANTE', whatsapp: '+51999555666'
    }
  },

  /**
   * Registro de nuevo estudiante con DNI y WhatsApp
   */
  async registro(data) {
    const payload = {
      dni: data.dni,
      nombres: data.nombres,
      apellidos: data.apellidos,
      correo: (data.correo || '').trim().toLowerCase(),
      whatsapp: data.whatsapp,
      password: data.password,
      rol: 'ESTUDIANTE'
    };

    try {
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
          correo: payload.correo,
          rol: 'ESTUDIANTE',
          whatsapp: data.whatsapp
        });
        return { success: true, user: this.getCurrentUser() };
      }

      // Registro aceptado pero sin token: iniciar sesión con las mismas credenciales
      await this.login(payload.correo, payload.password);
      this.updateProfile({ dni: data.dni, whatsapp: data.whatsapp, apellidos: data.apellidos });
      return { success: true, user: this.getCurrentUser() };
    } catch (err) {
      // Errores de validación / correo duplicado deben mostrarse tal cual al usuario
      if (err.status) {
        if (err.status === 409) throw new Error('Ya existe una cuenta con ese correo o DNI. Inicia sesión.');
        throw err;
      }
      throw new Error('No pudimos conectar con el servidor para crear tu cuenta. Inténtalo en unos segundos.');
    }
  },

  saveSession(token, user) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    sessionStorage.removeItem('paid_course_ids');
    this.updateNavbar();
  },

  /** Actualiza datos de contacto del perfil (DNI, WhatsApp) sin cerrar la sesión */
  updateProfile(changes) {
    const user = this.getCurrentUser();
    if (!user) return;
    const clean = {};
    Object.keys(changes || {}).forEach(k => {
      if (changes[k]) clean[k] = changes[k];
    });
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify({ ...user, ...clean }));
  },

  logout(redirectUrl = 'index.html') {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem('app_order_history');
    localStorage.removeItem(CONFIG.STORAGE_KEYS.LAST_ORDER);
    sessionStorage.removeItem('paid_course_ids');
    sessionStorage.removeItem('pending_mp_order');
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
    return !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN) && !!this.getCurrentUser();
  },

  /**
   * Devuelve una URL de redirección segura (solo páginas internas .html),
   * evitando redirecciones abiertas a sitios externos.
   */
  getSafeRedirect(fallback = 'index.html') {
    const raw = new URLSearchParams(window.location.search).get('redirect');
    if (!raw) return fallback;
    const ok = /^[a-z0-9\-]+(\.html)?(\?[\w=&%\-.]*)?$/i.test(raw);
    return ok ? raw : fallback;
  },

  /**
   * Actualiza el Navbar en todas las páginas (botones de sesión).
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

    // Resaltar la página activa en el menú de navegación para que el usuario siempre sepa en qué sección está
    if (typeof window !== 'undefined') {
      const current = window.location.pathname.split('/').pop() || 'index.html';
      const cleanCurrent = current.replace(/\.html$/, '') || 'index';
      document.querySelectorAll('#main-menu a, .site-navigation a.nav-link').forEach(link => {
        const href = (link.getAttribute('href') || '').split('#')[0].split('?')[0];
        const cleanHref = href.replace(/\.html$/, '') || 'index';
        if (cleanHref === cleanCurrent) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
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
