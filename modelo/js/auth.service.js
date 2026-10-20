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

  logout() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    this.updateNavbar();
    window.location.href = 'index.html';
  },

  getCurrentUser() {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  },

  /**
   * Actualiza el Navbar en todas las páginas mostrando el usuario conectado
   */
  updateNavbar() {
    const user = this.getCurrentUser();
    const container = document.getElementById('auth-buttons-nav');
    if (container) {
      if (user) {
        const primerNombre = (user.nombres || 'Usuario').split(' ')[0];
        const rolTexto = user.rol === 'ADMIN' ? 'Admin' : 'Alumno';
        container.innerHTML = `
          <a class="btn_one" href="mis-cursos.html" style="padding: 8px 15px; font-size: 13px;" title="Ver mis cursos comprados">
            <i class="fa fa-user-circle me-1"></i> ${primerNombre} (${rolTexto})
          </a>
          <a class="btn_two" href="#" onclick="AuthService.logout(); return false;" style="padding: 8px 12px; font-size: 13px; border:none; cursor:pointer;" title="Cerrar sesión">
            <i class="fa fa-sign-out"></i> Salir
          </a>
        `;
      } else {
        container.innerHTML = `
          <a class="btn_one" href="login.html">Login</a>
          <a class="btn_two" href="registro.html">Sign Up</a>
        `;
      }
    }

    // Actualizar también en el menú principal si existe
    const mainMenu = document.querySelector('#main-menu ul, #navigation ul');
    if (mainMenu && user) {
      let existingUserLi = document.getElementById('nav-user-item');
      if (!existingUserLi) {
        existingUserLi = document.createElement('li');
        existingUserLi.id = 'nav-user-item';
        mainMenu.appendChild(existingUserLi);
      }
      const primerNombre = (user.nombres || 'Usuario').split(' ')[0];
      existingUserLi.innerHTML = `
        <a class="nav-link" href="mis-cursos.html" style="color: #2eca7f !important; font-weight: 700;">
          <i class="fa fa-user-circle"></i> Mi Perfil (${primerNombre})
        </a>
      `;
    } else if (mainMenu && !user) {
      const existingUserLi = document.getElementById('nav-user-item');
      if (existingUserLi) existingUserLi.remove();
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
