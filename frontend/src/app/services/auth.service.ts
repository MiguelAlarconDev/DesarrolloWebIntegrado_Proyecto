import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_CONFIG } from './config.data';
import { ApiService } from './api.service';

export interface UserProfile {
  id: string;
  nombres: string;
  apellidos?: string;
  dni?: string;
  correo: string;
  rol: 'ESTUDIANTE' | 'DOCENTE' | 'ADMIN' | string;
  whatsapp?: string;
  is2faEnabled?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private navHashBound = false;

  readonly DEMO_USERS: Record<string, UserProfile> = {
    'admin@cursos.com': {
      id: 'a0000000-0000-0000-0000-000000000001',
      nombres: 'Admin General',
      apellidos: 'Administrador',
      dni: '10000001',
      correo: 'admin@cursos.com',
      rol: 'ADMIN',
      whatsapp: '+51999111222'
    },
    'docente@cursos.com': {
      id: 'a0000000-0000-0000-0000-000000000002',
      nombres: 'Roberto Docente',
      apellidos: 'Mendoza',
      dni: '20000002',
      correo: 'docente@cursos.com',
      rol: 'DOCENTE',
      whatsapp: '+51999333444'
    },
    'estudiante@cursos.com': {
      id: 'a0000000-0000-0000-0000-000000000003',
      nombres: 'Carlos Estudiante',
      apellidos: 'Alarcón',
      dni: '30000003',
      correo: 'estudiante@cursos.com',
      rol: 'ESTUDIANTE',
      whatsapp: '+51999555666'
    }
  };

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).__ngAuthLogout = () => this.logout('/');
    }
  }

  async login(correo: string, password: string): Promise<any> {
    correo = (correo || '').trim().toLowerCase();
    if (!correo || !password) {
      throw new Error('Ingresa tu correo y contraseña.');
    }

    try {
      const response = await this.api.request<any>('/auth/login', {
        method: 'POST',
        body: { correo, password }
      });

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

      const previo = this.getCurrentUser();
      const mismoUsuario = previo && previo.id === response.usuarioId;

      this.saveSession(response.token, {
        id: response.usuarioId,
        nombres: response.nombres,
        apellidos: response.apellidos || '',
        dni: response.dni || (mismoUsuario ? previo?.dni : '') || '',
        correo: response.correo || correo,
        rol: response.rol,
        whatsapp: response.whatsapp || (mismoUsuario ? previo?.whatsapp : '') || ''
      });
      return { success: true, user: this.getCurrentUser() };
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        throw new Error('Correo o contraseña incorrectos.');
      }
      if (err.status) throw err;

      const demo = this.DEMO_USERS[correo];
      if (demo && password === '123456') {
        console.warn('[AuthService] Backend no disponible, usando cuenta demo local.');
        this.saveSession('mock-jwt-token-' + demo.rol.toLowerCase(), { ...demo });
        return { success: true, user: this.getCurrentUser() };
      }
      throw new Error('No pudimos conectar con el servidor. Inténtalo en unos segundos.');
    }
  }

  async verificar2fa(correo: string, codigo2fa: string): Promise<any> {
    correo = (correo || '').trim().toLowerCase();
    codigo2fa = (codigo2fa || '').trim();
    if (!correo || !codigo2fa) {
      throw new Error('Ingresa el código OTP de 6 dígitos.');
    }

    try {
      const response = await this.api.request<any>('/auth/verificar-2fa', {
        method: 'POST',
        body: { correo, codigo2fa }
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
    } catch (err: any) {
      if (err.status === 401 || err.status === 400) {
        throw new Error('Código 2FA incorrecto o expirado.');
      }
      throw err;
    }
  }

  async registro(data: any): Promise<any> {
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
      const response = await this.api.request<any>('/auth/registro', {
        method: 'POST',
        body: payload
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
    } catch (err: any) {
      if (err.status) {
        if (err.status === 409) throw new Error('Ya existe una cuenta con ese correo o DNI. Inicia sesión.');
        throw err;
      }
      throw new Error('No pudimos conectar con el servidor para crear tu cuenta. Inténtalo en unos segundos.');
    }
  }

  async obtenerUsuarios(): Promise<UserProfile[]> {
    return this.api.request<UserProfile[]>('/auth/usuarios');
  }

  saveSession(token: string, user: UserProfile): void {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    sessionStorage.removeItem('paid_course_ids');
    this.updateNavbar();
  }

  updateProfile(changes: Partial<UserProfile>): void {
    const user = this.getCurrentUser();
    if (!user) return;
    const clean: any = {};
    Object.keys(changes || {}).forEach(k => {
      if ((changes as any)[k]) clean[k] = (changes as any)[k];
    });
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify({ ...user, ...clean }));
  }

  logout(redirectUrl: string | null = '/'): void {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem('app_order_history');
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.LAST_ORDER);
    sessionStorage.removeItem('paid_course_ids');
    sessionStorage.removeItem('pending_mp_order');
    this.updateNavbar();
    if (redirectUrl) {
      this.router.navigateByUrl('/' + redirectUrl.replace(/^\//, ''));
    }
  }

  getCurrentUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER);
      if (!raw || raw === 'null' || raw === 'undefined') return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN) && !!this.getCurrentUser();
  }

  getPortalUrlForRole(rol?: string): string {
    if (!rol) return '/';
    const r = String(rol).toUpperCase();
    if (r === 'ADMIN') return '/portal-admin';
    if (r === 'DOCENTE') return '/portal-docente';
    return '/mis-cursos';
  }

  getSafeRedirect(fallback = '/'): string {
    const raw = new URLSearchParams(window.location.search).get('redirect');
    if (!raw) return fallback;
    const ok = /^[a-z0-9\-]+(\.html)?(\?[\w=&%\-.]*)?$/i.test(raw);
    return ok ? raw : fallback;
  }

  updateNavbar(): void {
    if (typeof document === 'undefined') return;
    const user = this.getCurrentUser();

    if (document.documentElement) document.documentElement.classList.toggle('is-logged-in', !!user);
    if (document.body) document.body.classList.toggle('is-logged-in', !!user);

    const currentPath = (typeof window !== 'undefined' ? (window.location.pathname || '').split('/').pop() : '') || 'index.html';

    const logoLink = document.querySelector('.site-logo a, .brand-logo-link') as HTMLAnchorElement | null;
    if (logoLink) {
      if (user && user.rol === 'DOCENTE') {
        logoLink.href = '/portal-docente';
      } else if (user && user.rol === 'ADMIN') {
        logoLink.href = '/portal-admin';
      } else if (user && user.rol === 'ESTUDIANTE') {
        logoLink.href = '/mis-cursos';
      } else {
        logoLink.href = '/';
      }
    }

    const isPortalAdmin = currentPath.includes('portal-admin') || currentPath.includes('admin');
    const isPortalDocente = currentPath.includes('portal-docente') || currentPath.includes('docente');

    const cartIconBox = document.querySelector('.home_lc') as HTMLElement | null;
    if (cartIconBox) {
      const hideCart = !!(user && (user.rol === 'ADMIN' || user.rol === 'DOCENTE'));
      cartIconBox.style.display = hideCart ? 'none' : 'inline-flex';
    }

    const container = document.getElementById('auth-buttons-nav');
    if (container) {
      if (user) {
        const primerNombre = (user.nombres || 'Usuario').split(' ')[0];
        let portalUrl = '/mis-cursos';
        let rolLabel = 'Alumno';
        let iconClass = 'fa fa-graduation-cap';

        if (user.rol === 'ADMIN') {
          portalUrl = '/portal-admin';
          rolLabel = 'Admin';
          iconClass = 'fa fa-shield';
        } else if (user.rol === 'DOCENTE') {
          portalUrl = '/portal-docente';
          rolLabel = 'Docente';
          iconClass = 'fa fa-briefcase';
        }

        container.innerHTML = `
          <a class="btn_one btn-nav-user" href="${portalUrl}" title="Ir a mi portal de trabajo">
            <i class="${iconClass} me-1"></i> ${primerNombre} (${rolLabel})
          </a>
          <a class="btn_two btn-nav-logout" href="javascript:void(0)" onclick="window.__ngAuthLogout && window.__ngAuthLogout(); return false;" title="Cerrar sesión">
            <i class="fa fa-sign-out me-1"></i> Salir
          </a>
        `;
      } else {
        container.innerHTML = `
          <a class="btn_one" href="/login"><i class="fa fa-sign-in me-1"></i> Ingresar</a>
          <a class="btn_two" href="/registro"><i class="fa fa-user-plus me-1"></i> Registrarse</a>
        `;
      }
    }

    const mainMenu = document.querySelector('#main-menu ul');
    if (mainMenu) {
      if (!user) {
        // Sin iniciar sesión: Inicio SIEMPRE visible en todas las páginas públicas
        mainMenu.innerHTML = `
          <li><a class="nav-link" href="/"><i class="fa fa-home me-1"></i> Inicio</a></li>
          <li><a class="nav-link" href="/cursos"><i class="fa fa-book me-1"></i> Cursos</a></li>
          <li><a class="nav-link" href="/contacto"><i class="fa fa-envelope me-1"></i> Contacto</a></li>
          <li><a class="nav-link" href="/carrito"><i class="fa fa-shopping-cart me-1"></i> Mi Carrito</a></li>
        `;
      } else if (user.rol === 'ADMIN') {
        // Perfil Admin: sin Inicio, sin Contacto, sin Carrito
        if (isPortalAdmin) {
          mainMenu.innerHTML = `
            <li><a class="nav-link active" id="nav-admin-cursos" href="javascript:void(0)" onclick="if(window.switchAdminTab)window.switchAdminTab('cursos')"><i class="fa fa-book me-1"></i> Cursos</a></li>
            <li><a class="nav-link" id="nav-admin-pedidos" href="javascript:void(0)" onclick="if(window.switchAdminTab)window.switchAdminTab('pedidos')"><i class="fa fa-shopping-cart me-1"></i> Matrículas</a></li>
            <li><a class="nav-link" id="nav-admin-usuarios" href="javascript:void(0)" onclick="if(window.switchAdminTab)window.switchAdminTab('usuarios')"><i class="fa fa-users me-1"></i> Usuarios</a></li>
          `;
        } else {
          mainMenu.innerHTML = `
            <li><a class="nav-link" href="/portal-admin"><i class="fa fa-shield me-1"></i> Panel Admin</a></li>
            <li><a class="nav-link" href="/cursos"><i class="fa fa-book me-1"></i> Catálogo</a></li>
          `;
        }
      } else if (user.rol === 'DOCENTE') {
        // Perfil Docente: sin Inicio, sin Contacto, sin Carrito
        if (isPortalDocente) {
          mainMenu.innerHTML = `
            <li><a class="nav-link active" id="nav-docente-cursos" href="javascript:void(0)" onclick="if(window.switchDocenteTab)window.switchDocenteTab('cursos')"><i class="fa fa-book me-1"></i> Mis Cursos</a></li>
            <li><a class="nav-link" id="nav-docente-alumnos" href="javascript:void(0)" onclick="if(window.switchDocenteTab)window.switchDocenteTab('alumnos')"><i class="fa fa-users me-1"></i> Alumnos</a></li>
          `;
        } else {
          mainMenu.innerHTML = `
            <li><a class="nav-link" href="/portal-docente"><i class="fa fa-briefcase me-1"></i> Portal Docente</a></li>
            <li><a class="nav-link" href="/cursos"><i class="fa fa-book me-1"></i> Catálogo</a></li>
          `;
        }
      } else {
        // Perfil Estudiante: sin Inicio
        mainMenu.innerHTML = `
          <li><a class="nav-link" href="/cursos"><i class="fa fa-book me-1"></i> Cursos</a></li>
          <li><a class="nav-link" href="/mis-cursos"><i class="fa fa-graduation-cap me-1"></i> Mis Clases</a></li>
          <li><a class="nav-link" href="/contacto"><i class="fa fa-envelope me-1"></i> Contacto</a></li>
          <li><a class="nav-link" href="/carrito"><i class="fa fa-shopping-cart me-1"></i> Mi Carrito</a></li>
        `;
      }
    }

    const footerMenu = document.querySelector('.footer_menu ul');
    if (footerMenu) {
      footerMenu.className = 'list-unstyled footer-nav-list mb-0';
      if (user && user.rol === 'ADMIN') {
        footerMenu.innerHTML = `
          <li><a href="/portal-admin#cursos">Gestión Cursos</a></li>
          <li><a href="/portal-admin#pedidos">Matrículas</a></li>
          <li><a href="/portal-admin#usuarios">Usuarios</a></li>
        `;
      } else if (user && user.rol === 'DOCENTE') {
        footerMenu.innerHTML = `
          <li><a href="/portal-docente#cursos">Mis Cursos</a></li>
          <li><a href="/portal-docente#alumnos">Alumnos</a></li>
        `;
      } else if (user && user.rol === 'ESTUDIANTE') {
        footerMenu.innerHTML = `
          <li><a href="/cursos">Cursos</a></li>
          <li><a href="/mis-cursos">Mis Clases</a></li>
          <li><a href="/carrito">Mi Carrito</a></li>
          <li><a href="/contacto">Contacto</a></li>
        `;
      } else {
        footerMenu.innerHTML = `
          <li><a href="/">Inicio</a></li>
          <li><a href="/cursos">Cursos</a></li>
          <li><a href="/carrito">Mi Carrito</a></li>
          <li><a href="/login">Ingresar</a></li>
          <li><a href="/contacto">Contacto</a></li>
        `;
      }
    }

    document.querySelectorAll('.single_footer ul li a[href="/"]').forEach((a: any) => {
      const li = a.parentElement;
      if (li) {
        li.style.display = !user ? '' : 'none';
      }
    });

    // En las cabeceras de las páginas internas (.section-top-title ul):
    // mostrar "Inicio / ..." cuando NO ha ingresado a un perfil, y ocultarlo cuando YA ingresó a su perfil
    document.querySelectorAll('.section-top-title ul').forEach((ul: any) => {
      const existingHome = ul.querySelector('li.breadcrumb-home-item');
      if (!user) {
        if (!existingHome) {
          const li = document.createElement('li');
          li.className = 'breadcrumb-home-item';
          li.innerHTML = '<a href="/">Inicio</a>';
          ul.insertBefore(li, ul.firstChild);
        }
      } else if (existingHome) {
        existingHome.remove();
      }
    });

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
        const cleanHref = (href.split('/').pop() || '').replace(/\.html$/, '') || 'index';

        let isActive = false;
        if (hasHashContacto) {
          isActive = currentHash === '#contacto';
        } else if (cleanCurrent === 'contacto') {
          isActive = cleanHref === 'contacto';
        } else if (cleanCurrent === 'index' || cleanCurrent === '') {
          isActive = cleanHref === 'index' && currentHash !== '#contacto';
        } else if (cleanCurrent === 'cursos' || cleanCurrent === 'curso-detalle' || cleanCurrent === 'catalogo') {
          isActive = cleanHref === 'cursos';
        } else if (cleanCurrent === 'carrito' || cleanCurrent === 'checkout' || cleanCurrent === 'confirmacion') {
          isActive = cleanHref === 'carrito';
        } else if (cleanCurrent === 'mis-cursos' || cleanCurrent === 'portal-estudiante' || cleanCurrent === 'estudiante') {
          isActive = cleanHref === 'mis-cursos';
        } else if (cleanCurrent === 'portal-docente' || cleanCurrent === 'docente') {
          isActive = cleanHref === 'portal-docente';
        } else if (cleanCurrent === 'portal-admin' || cleanCurrent === 'admin') {
          isActive = cleanHref === 'portal-admin';
        }

        if (isActive) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      if (!this.navHashBound) {
        this.navHashBound = true;
        window.addEventListener('hashchange', () => {
          setTimeout(() => this.updateNavbar(), 50);
        });
      }
    }

    const $ = (window as any)?.$;
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
                  <a href="javascript:void(0)" onclick="window.__ngAuthLogout && window.__ngAuthLogout(); return false;" style="color: #e53e3e !important; font-weight: 700;">
                    <i class="fa fa-sign-out me-2"></i> Salir
                  </a>
                </li>
              `);
            } else {
              mobileUl.append(`
                <li style="border-top: 1px solid rgba(0,0,0,0.08); margin-top: 6px;">
                  <a href="/login" style="color: #2eca7f !important; font-weight: 700;"><i class="fa fa-sign-in me-2"></i> Ingresar</a>
                </li>
                <li>
                  <a href="/registro" style="color: #1a2d62 !important; font-weight: 700;"><i class="fa fa-user-plus me-2"></i> Registrarse</a>
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
}
