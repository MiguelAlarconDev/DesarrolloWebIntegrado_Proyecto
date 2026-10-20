/**
 * APP.JS - Inicializador Global, Componentes de Navbar y Eventos Comunes
 */
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  init() {
    this.renderHeader();
    this.renderFooter();
    this.updateCartBadge();
    this.hidePreloader();

    window.addEventListener('cartUpdated', () => {
      this.updateCartBadge();
    });
  },

  renderHeader() {
    const headerContainer = document.getElementById('main-header-placeholder');
    if (!headerContainer) return;

    const user = AuthService.getCurrentUser();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const authSection = user
      ? `
        <div class="dropdown d-inline-block">
          <button class="btn btn-outline-custom dropdown-toggle" type="button" id="userMenuBtn" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="fa fa-user-circle"></i> ${user.nombres.split(' ')[0]}
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm" aria-labelledby="userMenuBtn">
            <li><span class="dropdown-item-text small text-muted">${user.correo}</span></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="mis-cursos.html"><i class="fa fa-graduation-cap me-2"></i> Mis Cursos</a></li>
            <li><button class="dropdown-item text-danger" onclick="AuthService.logout()"><i class="fa fa-sign-out me-2"></i> Cerrar Sesión</button></li>
          </ul>
        </div>
      `
      : `
        <a href="login.html" class="btn btn-outline-custom"><i class="fa fa-sign-in"></i> Ingresar</a>
        <a href="registro.html" class="btn btn-secondary-custom"><i class="fa fa-user-plus"></i> Registrarme</a>
      `;

    headerContainer.innerHTML = `
      <header class="site-header">
        <div class="container py-2">
          <div class="d-flex align-items-center justify-content-between">
            <a href="index.html" class="navbar-brand-logo">
              <img src="assets/images/all-img/logo.png" alt="EduPlatform Logo">
              <div>
                EduPlatform
                <span class="brand-subtitle">Cursos Virtuales & Presenciales</span>
              </div>
            </a>

            <nav class="d-none d-md-flex align-items-center gap-1">
              <a href="index.html" class="nav-link-custom ${currentPage === 'index.html' ? 'active' : ''}">Catálogo de Cursos</a>
              <a href="mis-cursos.html" class="nav-link-custom ${currentPage === 'mis-cursos.html' ? 'active' : ''}">Mis Matrículas</a>
            </nav>

            <div class="header-actions">
              <a href="carrito.html" class="cart-icon-btn" title="Ver Carrito y Vacantes">
                <i class="fa fa-shopping-cart"></i>
                <span class="cart-counter-badge" id="header-cart-badge">0</span>
              </a>
              ${authSection}
            </div>
          </div>
        </div>
      </header>
    `;
  },

  renderFooter() {
    const footerContainer = document.getElementById('main-footer-placeholder');
    if (!footerContainer) return;

    footerContainer.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="row g-4">
            <div class="col-lg-4 col-md-6">
              <div class="footer-widget">
                <h4>EduPlatform</h4>
                <p>Plataforma automatizada de venta y dictado de cursos de capacitación profesional. Garantía de reserva de vacantes en tiempo real para clases virtuales y presenciales.</p>
                <div class="d-flex gap-3 text-white-50 mt-3" style="font-size: 18px;">
                  <i class="fa fa-facebook-square"></i>
                  <i class="fa fa-instagram"></i>
                  <i class="fa fa-linkedin-square"></i>
                  <i class="fa fa-youtube-play"></i>
                </div>
              </div>
            </div>

            <div class="col-lg-4 col-md-6">
              <div class="footer-widget">
                <h4>Modalidades & Pagos</h4>
                <ul class="footer-links">
                  <li><a href="index.html?modalidad=VIRTUAL"><i class="fa fa-video-camera"></i> Clases Virtuales en Vivo (Zoom / Meet)</a></li>
                  <li><a href="index.html?modalidad=PRESENCIAL"><i class="fa fa-building-o"></i> Clases Presenciales (Aulas y Laboratorios)</a></li>
                  <li><a href="#"><i class="fa fa-credit-card"></i> Pagos Seguros con Mercado Pago</a></li>
                  <li><a href="#"><i class="fa fa-file-text-o"></i> Emisión Automática de Boleta / Factura</a></li>
                </ul>
              </div>
            </div>

            <div class="col-lg-4 col-md-12">
              <div class="footer-widget">
                <h4>Atención Inmediata</h4>
                <p><i class="fa fa-whatsapp text-success me-2" style="font-size: 18px;"></i> Notificaciones y accesos automáticos enviados a tu WhatsApp al confirmar tu matrícula.</p>
                <p><i class="fa fa-envelope-o me-2"></i> soporte@eduplatform.com</p>
                <p><i class="fa fa-map-marker me-2"></i> Campus Central: Av. Universitaria 1234, Lima</p>
              </div>
            </div>
          </div>

          <div class="footer-bottom">
            <div>&copy; 2026 EduPlatform. Todos los derechos reservados. Desarrollado con Spring Security y JWT.</div>
            <div class="d-flex gap-3">
              <a href="#" class="text-white-50">Términos de Servicio</a>
              <a href="#" class="text-white-50">Política de Privacidad</a>
            </div>
          </div>
        </div>
      </footer>
    `;
  },

  updateCartBadge() {
    const badge = document.getElementById('header-cart-badge');
    if (badge) {
      badge.textContent = CartService.getCartCount();
    }
  },

  hidePreloader() {
    const preloader = document.getElementById('app-preloader');
    if (preloader) {
      setTimeout(() => {
        preloader.classList.add('fade-out');
        setTimeout(() => preloader.remove(), 400);
      }, 250);
    }
  }
};
