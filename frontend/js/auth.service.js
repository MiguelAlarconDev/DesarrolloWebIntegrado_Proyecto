/**
 * AUTH.SERVICE.JS - Gestión de Seguridad, Login, Registro, 2FA y Token JWT
 */
const AuthService = {
  /**
   * Inicia sesión llamando a auth-service / Gateway con Spring Security.
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

      // Manejo de verificación en dos pasos (2FA) para roles protegidos (Admin / Docente)
      if (response && response.status === 'REQUIRES_2FA') {
        return {
          requires2fa: true,
          correo: response.correo || correo,
          nombres: response.nombres,
          rol: response.rol,
          mensaje: response.mensaje || 'Se requiere código 2FA de seguridad.',
          usuarioId: response.usuarioId
        };
      }

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

  /**
   * Valida el código 2FA ingresado por el usuario
   */
  async verificar2fa(correo, codigo2fa) {
    correo = (correo || '').trim().toLowerCase();
    codigo2fa = (codigo2fa || '').trim();
    if (!correo || !codigo2fa) {
      throw new Error('Ingresa el código OTP de 6 dígitos.');
    }

    try {
      const response = await API.request('/auth/verificar-2fa', {
        method: 'POST',
        body: JSON.stringify({ correo, codigo2fa })
      });

      if (!response || !response.token) {
        throw new Error('Código de verificación incorrecto o expirado.');
      }

      this.saveSession(response.token, {
        id: response.usuarioId,
        nombres: response.nombres,
        correo: response.correo || correo,
        rol: response.rol
      });

      return { success: true, user: this.getCurrentUser() };
    } catch (err) {
      if (err.status === 401 || err.status === 400) {
        throw new Error('Código 2FA incorrecto o expirado.');
      }
      throw err;
    }
  },

  DEMO_USERS: {
    'admin@cursos.com': {
      id: 'a0000000-0000-0000-0000-000000000001', nombres: 'Admin General', apellidos: 'Administrador',
      dni: '10000001', correo: 'admin@cursos.com', rol: 'ADMIN', whatsapp: '+51999111222'
    },
    'docente@cursos.com': {
      id: 'a0000000-0000-0000-0000-000000000002', nombres: 'Roberto Docente', apellidos: 'Mendoza',
      dni: '20000002', correo: 'docente@cursos.com', rol: 'DOCENTE', whatsapp: '+51999333444'
    },
    'estudiante@cursos.com': {
      id: 'a0000000-0000-0000-0000-000000000003', nombres: 'Carlos Estudiante', apellidos: 'Alarcón',
      dni: '30000003', correo: 'estudiante@cursos.com', rol: 'ESTUDIANTE', whatsapp: '+51999555666'
    }
  },

  /**
   * Registra un nuevo alumno
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

      await this.login(payload.correo, payload.password);
      this.updateProfile({ dni: data.dni, whatsapp: data.whatsapp, apellidos: data.apellidos });
      return { success: true, user: this.getCurrentUser() };
    } catch (err) {
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
   * Obtiene la ruta del portal principal según el rol del usuario
   */
  getPortalUrlForRole(rol) {
    if (!rol) return 'index.html';
    const r = String(rol).toUpperCase();
    if (r === 'ADMIN') return 'portal-admin.html';
    if (r === 'DOCENTE') return 'portal-docente.html';
    return 'mis-cursos.html';
  },

  getSafeRedirect(fallback = 'index.html') {
    const raw = new URLSearchParams(window.location.search).get('redirect');
    if (!raw) return fallback;
    const ok = /^[a-z0-9\-]+(\.html)?(\?[\w=&%\-.]*)?$/i.test(raw);
    return ok ? raw : fallback;
  },

  /**
   * Actualiza el Navbar de forma contextual según el rol:
   * - Elimina páginas irrelevantes (ej. oculta carrito y "Mis Clases" para Admin y Docente).
   * - Muestra únicamente las opciones que corresponden al portal del usuario activo.
   */
  updateNavbar() {
    const user = this.getCurrentUser();

    if (typeof document !== 'undefined') {
      if (document.documentElement) document.documentElement.classList.toggle('is-logged-in', !!user);
      if (document.body) document.body.classList.toggle('is-logged-in', !!user);
    }

    // 1. Detectar página actual
    const currentPath = (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '') || 'index.html';
    const isPortalAdmin = currentPath.includes('portal-admin');
    const isPortalDocente = currentPath.includes('portal-docente');
    const isMisCursos = currentPath.includes('mis-cursos') || currentPath.includes('portal-estudiante');

    // 2. Ocultar o mostrar ícono de carrito de compras superior
    // (Docentes y Administradores gestionan en sus portales; no usan carrito de compra de matrículas)
    const cartIconBox = document.querySelector('.home_lc');
    if (cartIconBox) {
      if (user && (user.rol === 'ADMIN' || user.rol === 'DOCENTE')) {
        cartIconBox.style.display = 'none';
      } else {
        cartIconBox.style.display = '';
      }
    }

    // 3. Botones de acción a la derecha (Perfil / Iniciar Sesión / Salir)
    const container = document.getElementById('auth-buttons-nav');
    if (container) {
      if (user) {
        const primerNombre = (user.nombres || 'Usuario').split(' ')[0];
        let portalUrl = 'mis-cursos.html';
        let rolLabel = 'Alumno';
        let iconClass = 'fa fa-graduation-cap';

        if (user.rol === 'ADMIN') {
          portalUrl = 'portal-admin.html';
          rolLabel = 'Administrador';
          iconClass = 'fa fa-shield';
        } else if (user.rol === 'DOCENTE') {
          portalUrl = 'portal-docente.html';
          rolLabel = 'Docente';
          iconClass = 'fa fa-briefcase';
        }

        container.innerHTML = `
          <a class="btn_one btn-nav-user" href="${portalUrl}" title="Ir a mi portal de trabajo">
            <i class="${iconClass} me-1"></i> ${primerNombre} (${rolLabel})
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

    // 4. Menú de Navegación Contextual Adaptado al Rol Y a la Plataforma Actual
    // Si el usuario ya está en su plataforma de trabajo, el menú muestra exclusivamente
    // las herramientas y pestañas de su plataforma, eliminando enlaces irrelevantes.
    const mainMenu = document.querySelector('#main-menu ul');
    if (mainMenu) {
      if (isPortalAdmin && user && user.rol === 'ADMIN') {
        // En el Portal del Administrador: solo controles administrativos
        mainMenu.innerHTML = `
          <li><a class="nav-link active" id="nav-admin-cursos" href="javascript:void(0)" onclick="if(window.navToAdminTab){navToAdminTab('cursos');}else if(window.switchAdminTab){switchAdminTab('cursos');}"><i class="fa fa-book me-1"></i> Cursos</a></li>
          <li><a class="nav-link" id="nav-admin-pedidos" href="javascript:void(0)" onclick="if(window.navToAdminTab){navToAdminTab('pedidos');}else if(window.switchAdminTab){switchAdminTab('pedidos');}"><i class="fa fa-shopping-cart me-1"></i> Matrículas y Pagos</a></li>
          <li><a class="nav-link" id="nav-admin-usuarios" href="javascript:void(0)" onclick="if(window.navToAdminTab){navToAdminTab('usuarios');}else if(window.switchAdminTab){switchAdminTab('usuarios');}"><i class="fa fa-users me-1"></i> Usuarios</a></li>
          <li><a class="nav-link" href="cursos.html" title="Ver catálogo público"><i class="fa fa-eye me-1"></i> Ver Catálogo</a></li>
          <li><a class="nav-link" href="index.html" title="Ir a la portada"><i class="fa fa-home me-1"></i> Ir a la Web</a></li>
        `;
      } else if (isPortalDocente && user && (user.rol === 'DOCENTE' || user.rol === 'ADMIN')) {
        // En el Portal del Docente: solo controles docentes
        mainMenu.innerHTML = `
          <li><a class="nav-link active" id="nav-docente-cursos" href="javascript:void(0)" onclick="if(window.navToDocenteTab){navToDocenteTab('cursos');}else if(window.switchDocenteTab){switchDocenteTab('cursos');}"><i class="fa fa-book me-1"></i> Mis Cursos</a></li>
          <li><a class="nav-link" id="nav-docente-alumnos" href="javascript:void(0)" onclick="if(window.navToDocenteTab){navToDocenteTab('alumnos');}else if(window.switchDocenteTab){switchDocenteTab('alumnos');}"><i class="fa fa-users me-1"></i> Alumnos Matriculados</a></li>
          <li><a class="nav-link" href="cursos.html" title="Ver catálogo general de cursos"><i class="fa fa-graduation-cap me-1"></i> Catálogo General</a></li>
          <li><a class="nav-link" href="index.html" title="Ir a la portada"><i class="fa fa-home me-1"></i> Ir a la Web</a></li>
        `;
      } else if (isMisCursos && user && user.rol === 'ESTUDIANTE') {
        // En el Portal del Alumno (Mis Clases): navegación del estudiante
        mainMenu.innerHTML = `
          <li><a class="nav-link active" href="mis-cursos.html"><i class="fa fa-graduation-cap me-1"></i> Mis Clases</a></li>
          <li><a class="nav-link" href="cursos.html">Explorar Cursos</a></li>
          <li><a class="nav-link" href="carrito.html">Mi Carrito</a></li>
          <li><a class="nav-link" href="index.html">Inicio</a></li>
        `;
      } else if (!user) {
        // Invitado / Público general
        mainMenu.innerHTML = `
          <li><a class="nav-link" href="index.html">Inicio</a></li>
          <li><a class="nav-link" href="cursos.html">Cursos</a></li>
          <li><a class="nav-link" href="carrito.html">Mi Carrito</a></li>
        `;
      } else if (user.rol === 'ADMIN') {
        // Administrador en páginas públicas (ej. index o catálogo):
        // NO mostramos carrito ni portal docente ni clases de estudiante
        mainMenu.innerHTML = `
          <li><a class="nav-link" href="index.html">Inicio</a></li>
          <li><a class="nav-link" href="cursos.html">Catálogo</a></li>
          <li><a class="nav-link fw-bold text-primary" href="portal-admin.html"><i class="fa fa-shield me-1"></i> Mi Portal Admin</a></li>
        `;
      } else if (user.rol === 'DOCENTE') {
        // Docente en páginas públicas (ej. index o cursos):
        // NO mostramos carrito ni portal admin ni clases de estudiante
        mainMenu.innerHTML = `
          <li><a class="nav-link" href="index.html">Inicio</a></li>
          <li><a class="nav-link" href="cursos.html">Cursos</a></li>
          <li><a class="nav-link fw-bold text-success" href="portal-docente.html"><i class="fa fa-briefcase me-1"></i> Mi Portal Docente</a></li>
        `;
      } else {
        // Estudiante autenticado en páginas públicas (ej. index o catálogo):
        mainMenu.innerHTML = `
          <li><a class="nav-link" href="index.html">Inicio</a></li>
          <li><a class="nav-link" href="cursos.html">Cursos</a></li>
          <li><a class="nav-link" href="carrito.html">Mi Carrito</a></li>
          <li><a class="nav-link fw-bold text-success" href="mis-cursos.html"><i class="fa fa-graduation-cap me-1"></i> Mis Clases</a></li>
        `;
      }
    }

    // 5. Actualizar menú de pie de página (Footer) de forma limpia
    const footerMenu = document.querySelector('.footer_menu ul');
    if (footerMenu) {
      if (user && user.rol === 'ADMIN') {
        footerMenu.innerHTML = `
          <li><a href="index.html">Inicio</a></li>
          <li><a href="cursos.html">Catálogo de Cursos</a></li>
          <li><a href="portal-admin.html">Portal Administrador</a></li>
        `;
      } else if (user && user.rol === 'DOCENTE') {
        footerMenu.innerHTML = `
          <li><a href="index.html">Inicio</a></li>
          <li><a href="cursos.html">Cursos</a></li>
          <li><a href="portal-docente.html">Portal Docente</a></li>
        `;
      } else {
        footerMenu.innerHTML = `
          <li><a href="index.html">Inicio</a></li>
          <li><a href="cursos.html">Cursos</a></li>
          <li><a href="carrito.html">Mi Carrito</a></li>
          ${user ? '<li><a href="mis-cursos.html">Mis Clases</a></li>' : ''}
          <li><a href="https://wa.me/51999555666" target="_blank" rel="noopener noreferrer" class="footer-wp-link"><i class="fa fa-whatsapp text-success me-1"></i> Soporte</a></li>
        `;
      }
    }

    // 5. Resaltar la página activa
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

    // 6. Sincronizar menú móvil (SlickNav) si ya estaba renderizado
    if (typeof $ !== 'undefined' && $('#mobile_menu').length && $('#mobile_menu').children().length > 0) {
      try {
        $('#mobile_menu').empty();
        if ($.fn.slicknav && $('#main-menu').length) {
          $('#main-menu').slicknav({
            label: '',
            duration: 250,
            prependTo: '#mobile_menu',
            closeOnClick: true,
            openedSymbol: '',
            closedSymbol: ''
          });
        }
      } catch (_) {}
    }
  }
};

// Auto-ejecución inmediata
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuthService.updateNavbar());
  } else {
    AuthService.updateNavbar();
  }
}
