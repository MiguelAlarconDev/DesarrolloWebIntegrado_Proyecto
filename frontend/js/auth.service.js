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
   * Actualiza el Navbar de forma minimalista, limpia y adaptada a cada rol:
   * - Docente: Solo sus herramientas esenciales (Mis Cursos y Alumnos), sin 'Inicio' ni 'Catálogo'.
   * - Admin: Solo sus herramientas esenciales (Cursos, Matrículas y Usuarios), sin 'Inicio' ni 'Catálogo'.
   * - Alumno: Solo sus opciones esenciales (Mis Clases, Cursos y Mi Carrito).
   * - Invitado: Inicio, Cursos y Mi Carrito.
   * - Botón verde oficial #2eca7f con icono de rol y botón salir minimalista.
   */
  updateNavbar() {
    const user = this.getCurrentUser();

    if (typeof document !== 'undefined') {
      if (document.documentElement) document.documentElement.classList.toggle('is-logged-in', !!user);
      if (document.body) document.body.classList.toggle('is-logged-in', !!user);
    }

    // 1. Detectar página actual
    const currentPath = (typeof window !== 'undefined' ? (window.location.pathname || '').split('/').pop() : '') || 'index.html';

    // Actualizar enlace del logo principal para dirigir al portal correspondiente según el rol
    const logoLink = document.querySelector('.site-logo a, .brand-logo-link');
    if (logoLink) {
      if (user && user.rol === 'DOCENTE') {
        logoLink.href = 'portal-docente.html';
      } else if (user && user.rol === 'ADMIN') {
        logoLink.href = 'portal-admin.html';
      } else if (user && user.rol === 'ESTUDIANTE') {
        logoLink.href = 'mis-cursos.html';
      } else {
        logoLink.href = 'index.html';
      }
    }
    const isPortalAdmin = currentPath.includes('portal-admin');
    const isPortalDocente = currentPath.includes('portal-docente');
    const isMisCursos = currentPath.includes('mis-cursos') || currentPath.includes('portal-estudiante');
    const isCatalogo = currentPath.includes('cursos') || currentPath.includes('curso-detalle');

    // 2. El ícono del carrito de compras superior siempre visible para todos los roles
    const cartIconBox = document.querySelector('.home_lc');
    if (cartIconBox) {
      cartIconBox.style.display = 'inline-flex';
    }

    // 3. Botones de acción a la derecha (Perfil / Iniciar Sesión / Salir) - Estilo Verde Minimalista
    const container = document.getElementById('auth-buttons-nav');
    if (container) {
      if (user) {
        const primerNombre = (user.nombres || 'Usuario').split(' ')[0];
        let portalUrl = 'mis-cursos.html';
        let rolLabel = 'Alumno';
        let iconClass = 'fa fa-graduation-cap';

        if (user.rol === 'ADMIN') {
          portalUrl = 'portal-admin.html';
          rolLabel = 'Admin';
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
          <a class="btn_one" href="login.html"><i class="fa fa-sign-in me-1"></i> Ingresar</a>
          <a class="btn_two" href="registro.html"><i class="fa fa-user-plus me-1"></i> Registrarse</a>
        `;
      }
    }

    // 4. Menú de Navegación Contextual (#main-menu ul) - Mismo diseño visual unificado, contenido adaptado por rol con Contacto
    const mainMenu = document.querySelector('#main-menu ul');
    if (mainMenu) {
      if (!user) {
        // Invitado / Público general: Inicio, Cursos, Contacto, Mi Carrito
        mainMenu.innerHTML = `
          <li><a class="nav-link" href="index.html"><i class="fa fa-home me-1"></i> Inicio</a></li>
          <li><a class="nav-link" href="cursos.html"><i class="fa fa-book me-1"></i> Cursos</a></li>
          <li><a class="nav-link" href="index.html#contacto"><i class="fa fa-envelope me-1"></i> Contacto</a></li>
          <li><a class="nav-link" href="carrito.html"><i class="fa fa-shopping-cart me-1"></i> Mi Carrito</a></li>
        `;
      } else if (user.rol === 'ADMIN') {
        // Administrador: En su portal sus herramientas + Contacto
        if (isPortalAdmin) {
          mainMenu.innerHTML = `
            <li><a class="nav-link active" id="nav-admin-cursos" href="javascript:void(0)" onclick="if(window.switchAdminTab)switchAdminTab('cursos')"><i class="fa fa-book me-1"></i> Cursos</a></li>
            <li><a class="nav-link" id="nav-admin-pedidos" href="javascript:void(0)" onclick="if(window.switchAdminTab)switchAdminTab('pedidos')"><i class="fa fa-shopping-cart me-1"></i> Matrículas</a></li>
            <li><a class="nav-link" id="nav-admin-usuarios" href="javascript:void(0)" onclick="if(window.switchAdminTab)switchAdminTab('usuarios')"><i class="fa fa-users me-1"></i> Usuarios</a></li>
            <li><a class="nav-link" href="index.html#contacto"><i class="fa fa-envelope me-1"></i> Contacto</a></li>
          `;
        } else {
          // Administrador en catálogo/inicio/carrito
          mainMenu.innerHTML = `
            <li><a class="nav-link" href="index.html"><i class="fa fa-home me-1"></i> Inicio</a></li>
            <li><a class="nav-link" href="cursos.html"><i class="fa fa-book me-1"></i> Cursos</a></li>
            <li><a class="nav-link" href="portal-admin.html"><i class="fa fa-shield me-1"></i> Panel Admin</a></li>
            <li><a class="nav-link" href="index.html#contacto"><i class="fa fa-envelope me-1"></i> Contacto</a></li>
            <li><a class="nav-link" href="carrito.html"><i class="fa fa-shopping-cart me-1"></i> Mi Carrito</a></li>
          `;
        }
      } else if (user.rol === 'DOCENTE') {
        // Docente: En su portal sus herramientas + Contacto
        if (isPortalDocente) {
          mainMenu.innerHTML = `
            <li><a class="nav-link active" id="nav-docente-cursos" href="javascript:void(0)" onclick="if(window.switchDocenteTab)switchDocenteTab('cursos')"><i class="fa fa-book me-1"></i> Mis Cursos</a></li>
            <li><a class="nav-link" id="nav-docente-alumnos" href="javascript:void(0)" onclick="if(window.switchDocenteTab)switchDocenteTab('alumnos')"><i class="fa fa-users me-1"></i> Alumnos</a></li>
            <li><a class="nav-link" href="index.html#contacto"><i class="fa fa-envelope me-1"></i> Contacto</a></li>
          `;
        } else {
          // Docente en catálogo/inicio/carrito
          mainMenu.innerHTML = `
            <li><a class="nav-link" href="index.html"><i class="fa fa-home me-1"></i> Inicio</a></li>
            <li><a class="nav-link" href="cursos.html"><i class="fa fa-book me-1"></i> Cursos</a></li>
            <li><a class="nav-link" href="portal-docente.html"><i class="fa fa-briefcase me-1"></i> Portal Docente</a></li>
            <li><a class="nav-link" href="index.html#contacto"><i class="fa fa-envelope me-1"></i> Contacto</a></li>
            <li><a class="nav-link" href="carrito.html"><i class="fa fa-shopping-cart me-1"></i> Mi Carrito</a></li>
          `;
        }
      } else {
        // Alumno / Estudiante: Inicio, Cursos, Mis Clases, Contacto, Mi Carrito
        mainMenu.innerHTML = `
          <li><a class="nav-link" href="index.html"><i class="fa fa-home me-1"></i> Inicio</a></li>
          <li><a class="nav-link" href="cursos.html"><i class="fa fa-book me-1"></i> Cursos</a></li>
          <li><a class="nav-link" href="mis-cursos.html"><i class="fa fa-graduation-cap me-1"></i> Mis Clases</a></li>
          <li><a class="nav-link" href="index.html#contacto"><i class="fa fa-envelope me-1"></i> Contacto</a></li>
          <li><a class="nav-link" href="carrito.html"><i class="fa fa-shopping-cart me-1"></i> Mi Carrito</a></li>
        `;
      }
    }

    // 5. Menú de pie de página (Footer) adaptado al rol del usuario (Diseño EduMim)
    const footerMenu = document.querySelector('.footer_menu ul');
    if (footerMenu) {
      footerMenu.className = 'list-unstyled footer-nav-list mb-0';
      if (user && user.rol === 'ADMIN') {
        footerMenu.innerHTML = `
          <li><a href="index.html">Inicio</a></li>
          <li><a href="portal-admin.html#cursos">Gestión Cursos</a></li>
          <li><a href="portal-admin.html#pedidos">Matrículas</a></li>
          <li><a href="portal-admin.html#usuarios">Usuarios</a></li>
          <li><a href="https://wa.me/51999555666" target="_blank" rel="noopener noreferrer">Contacto</a></li>
        `;
      } else if (user && user.rol === 'DOCENTE') {
        footerMenu.innerHTML = `
          <li><a href="index.html">Inicio</a></li>
          <li><a href="portal-docente.html#cursos">Mis Cursos</a></li>
          <li><a href="portal-docente.html#alumnos">Alumnos</a></li>
          <li><a href="carrito.html">Mi Carrito</a></li>
          <li><a href="https://wa.me/51999555666" target="_blank" rel="noopener noreferrer">Contacto</a></li>
        `;
      } else if (user && user.rol === 'ESTUDIANTE') {
        footerMenu.innerHTML = `
          <li><a href="index.html">Inicio</a></li>
          <li><a href="cursos.html">Cursos</a></li>
          <li><a href="mis-cursos.html">Mis Clases</a></li>
          <li><a href="carrito.html">Mi Carrito</a></li>
          <li><a href="https://wa.me/51999555666" target="_blank" rel="noopener noreferrer">Contacto</a></li>
        `;
      } else {
        footerMenu.innerHTML = `
          <li><a href="index.html">Inicio</a></li>
          <li><a href="cursos.html">Cursos</a></li>
          <li><a href="carrito.html">Mi Carrito</a></li>
          <li><a href="login.html">Ingresar</a></li>
          <li><a href="https://wa.me/51999555666" target="_blank" rel="noopener noreferrer">Contacto</a></li>
        `;
      }
    }

    // 6. Resaltar página activa con precisión (incluye Contacto con deep-linking hash)
    if (typeof window !== 'undefined') {
      const pathname = (window.location.pathname || '').toLowerCase();
      const current = pathname.split('/').pop() || 'index.html';
      const cleanCurrent = current.replace(/\.html$/, '') || 'index';
      const currentHash = (window.location.hash || '').toLowerCase();

      document.querySelectorAll('#main-menu a, .site-navigation a.nav-link').forEach(link => {
        const rawHref = link.getAttribute('href') || '';
        if (rawHref.startsWith('javascript:')) return;

        const hasHashContacto = rawHref.includes('#contacto');
        const href = rawHref.split('#')[0].split('?')[0].toLowerCase();
        const cleanHref = (href.split('/').pop() || '').replace(/\.html$/, '');

        let isActive = false;
        if (hasHashContacto) {
          isActive = currentHash === '#contacto';
        } else if (cleanCurrent === 'index' || cleanCurrent === '') {
          isActive = cleanHref === 'index' && currentHash !== '#contacto';
        } else if (cleanCurrent === 'cursos' || cleanCurrent === 'curso-detalle') {
          isActive = cleanHref === 'cursos';
        } else if (cleanCurrent === 'carrito' || cleanCurrent === 'checkout' || cleanCurrent === 'confirmacion') {
          isActive = cleanHref === 'carrito';
        } else if (cleanCurrent === 'mis-cursos' || cleanCurrent === 'portal-estudiante') {
          isActive = cleanHref === 'mis-cursos';
        } else if (cleanCurrent === 'portal-docente') {
          isActive = cleanHref === 'portal-docente';
        } else if (cleanCurrent === 'portal-admin') {
          isActive = cleanHref === 'portal-admin';
        }

        if (isActive) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      // Escuchar cambios de hash para actualizar la navegación dinámicamente
      if (!window.__navHashBound) {
        window.__navHashBound = true;
        window.addEventListener('hashchange', () => {
          setTimeout(() => AuthService.updateNavbar(), 50);
        });
      }
    }

    // 7. Sincronizar menú móvil (SlickNav) limpio
    if (typeof $ !== 'undefined' && $('#mobile_menu').length) {
      try {
        $('#mobile_menu').empty();
        $('#main-menu').removeData('plugin_slicknav');
        if ($.fn.slicknav && $('#main-menu').length) {
          $('#main-menu').slicknav({
            label: '',
            duration: 250,
            prependTo: '#mobile_menu',
            closeOnClick: true,
            openedSymbol: '',
            closedSymbol: ''
          });

          // Agregar accesos de sesión en la parte inferior del menú móvil
          const mobileUl = $('#mobile_menu .slicknav_nav');
          if (mobileUl.length) {
            if (user) {
              const primerNombre = (user.nombres || 'Usuario').split(' ')[0];
              const rolLabel = user.rol === 'ADMIN' ? 'Admin' : user.rol === 'DOCENTE' ? 'Docente' : 'Alumno';
              mobileUl.prepend(`
                <li style="padding: 10px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); background: rgba(46, 202, 127, 0.08);">
                  <strong style="color: #16a34a; font-size: 13.5px; display: block;">${primerNombre} (${rolLabel})</strong>
                </li>
              `);
              mobileUl.append(`
                <li style="border-top: 1px solid rgba(0,0,0,0.08); margin-top: 6px;">
                  <a href="#" onclick="AuthService.logout(); return false;" style="color: #e53e3e !important; font-weight: 700;">
                    <i class="fa fa-sign-out me-2"></i> Salir
                  </a>
                </li>
              `);
            } else {
              mobileUl.append(`
                <li style="border-top: 1px solid rgba(0,0,0,0.08); margin-top: 6px;">
                  <a href="login.html" style="color: #2eca7f !important; font-weight: 700;"><i class="fa fa-sign-in me-2"></i> Ingresar</a>
                </li>
                <li>
                  <a href="registro.html" style="color: #1a2d62 !important; font-weight: 700;"><i class="fa fa-user-plus me-2"></i> Registrarse</a>
                </li>
              `);
            }
          }
        }
      } catch (err) {
        console.warn('[AuthService] Error al sincronizar SlickNav:', err);
      }
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
