/**
 * CART.SERVICE.JS - Gestión del Carrito, Contador del Navbar y Temporizador de Reserva
 *
 * El contador del icono del carrito (#cart-nav-counter) se gestiona aquí de forma
 * centralizada: se actualiza solo al cargar la página, al agregar/quitar cursos
 * y también cuando el carrito cambia en otra pestaña del navegador.
 */
const CartService = {
  RESERVATION_MINUTES: 15,

  getCart() {
    try {
      let raw = localStorage.getItem(CONFIG.STORAGE_KEYS.CART);
      // Soporte para pruebas rápidas y previsualización con ?sample=1
      if ((!raw || raw === '[]') && typeof window !== 'undefined' && window.location.search && window.location.search.includes('sample=1')) {
        const demo = [{
          id: 'b0000000-0000-0000-0000-000000000001',
          titulo: 'Desarrollo Web Integrado con Spring Boot',
          precio: 150.00,
          modalidad: 'VIRTUAL',
          horario: 'Lun y Mie 19:00 - 22:00',
          docente: 'Ing. Roberto Silva',
          imagen: 'assets/images/all-img/c1.png'
        }];
        localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(demo));
        this.startReservationTimer();
        return demo;
      }
      const cart = raw ? JSON.parse(raw) : [];
      return Array.isArray(cart) ? cart.filter(item => item && item.id) : [];
    } catch (_) {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.CART);
      return [];
    }
  },

  saveCart(cart) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(cart));
    if (cart.length === 0) this.clearReservationTimer();
    this.notifyChange();
  },

  isInCart(cursoId) {
    return this.getCart().some(item => item.id === cursoId);
  },

  /**
   * Agrega un curso al carrito (cada curso solo puede agregarse una vez: 1 vacante por alumno).
   */
  addToCart(curso) {
    if (!curso || !curso.id) {
      return { success: false, message: 'Curso inválido.' };
    }
    const cart = this.getCart();

    if (cart.some(item => item.id === curso.id)) {
      this.startReservationTimer();
      return { success: true, alreadyInCart: true, message: 'Este curso ya está en tu carrito.' };
    }

    const libres = Number(curso.aforoDisponible !== undefined ? curso.aforoDisponible : 30);
    if (libres <= 0) {
      return { success: false, message: 'Lo sentimos, las vacantes para este curso están agotadas.' };
    }

    // Guardar los datos necesarios del curso
    cart.push({
      id: curso.id,
      titulo: curso.titulo,
      precio: Number(curso.precio) || 0,
      modalidad: curso.modalidad || 'VIRTUAL',
      horario: curso.horario || '',
      docente: curso.docente || '',
      imagen: curso.imagen || 'assets/images/all-img/c1.png',
      aforoDisponible: libres,
      enlaceClase: curso.enlaceClase,
      direccionClase: curso.direccionClase,
      aula: curso.aula
    });

    this.startReservationTimer();
    this.saveCart(cart);
    this.bumpBadge();
    return { success: true, message: '¡Curso agregado a tu carrito!' };
  },

  removeFromCart(cursoId) {
    this.saveCart(this.getCart().filter(item => item.id !== cursoId));
  },

  clearCart() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CART);
    this.clearReservationTimer();
    this.notifyChange();
  },

  getCartCount() {
    return this.getCart().length;
  },

  getTotals() {
    const total = this.getCart().reduce((acc, item) => acc + (Number(item.precio) || 0), 0);
    const subtotal = total / 1.18;
    const igv = total - subtotal;
    return {
      subtotal: subtotal.toFixed(2),
      igv: igv.toFixed(2),
      total: total.toFixed(2)
    };
  },

  /* ------------------------------------------------------------------
   * Contador del icono del carrito en el navbar
   * ------------------------------------------------------------------ */
  notifyChange() {
    this.updateBadge();
    window.dispatchEvent(new Event('cartUpdated'));
  },

  updateBadge() {
    if (typeof document === 'undefined') return;
    const count = this.getCartCount();
    document.querySelectorAll('#cart-nav-counter, .cart-nav-counter').forEach(el => {
      el.textContent = count > 9 ? '9+' : String(count);
      el.classList.toggle('is-empty', count === 0);
      const link = el.closest('a');
      if (link) {
        const label = count === 0
          ? 'Tu carrito está vacío'
          : `Ver carrito (${count} ${count === 1 ? 'curso' : 'cursos'})`;
        link.setAttribute('title', label);
        link.setAttribute('aria-label', label);
      }
    });
  },

  /** Pequeña animación del icono para confirmar visualmente que se agregó un curso */
  bumpBadge() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('#cart-nav-counter, .cart-nav-counter').forEach(el => {
      const link = el.closest('a') || el;
      link.classList.remove('cart-bump');
      void link.offsetWidth; // reiniciar animación
      link.classList.add('cart-bump');
      setTimeout(() => link.classList.remove('cart-bump'), 700);
    });
  },

  /**
   * Quita del carrito los cursos que el alumno ya tiene pagados (evita pagar dos veces).
   * Devuelve la lista de cursos removidos.
   */
  removePaidCourses(paidIds) {
    if (!paidIds || paidIds.size === 0) return [];
    const cart = this.getCart();
    const removed = cart.filter(item => paidIds.has(item.id));
    if (removed.length > 0) {
      this.saveCart(cart.filter(item => !paidIds.has(item.id)));
    }
    return removed;
  },

  /* ------------------------------------------------------------------
   * Temporizador de reserva de vacante (15 minutos)
   * ------------------------------------------------------------------ */
  startReservationTimer() {
    const current = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY) || '0', 10);
    if (!current || current <= Date.now()) {
      const expiry = Date.now() + this.RESERVATION_MINUTES * 60 * 1000;
      localStorage.setItem(CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY, expiry.toString());
    }
  },

  /** Renueva la reserva (por ejemplo cuando el alumno vuelve a intentar pagar) */
  renewReservation() {
    this.clearReservationTimer();
    this.startReservationTimer();
  },

  getRemainingTime() {
    const expiry = localStorage.getItem(CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY);
    if (!expiry) return null;
    const diff = Math.max(0, parseInt(expiry, 10) - Date.now());
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return {
      expired: diff <= 0,
      urgent: diff > 0 && diff <= 2 * 60 * 1000,
      formatted: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    };
  },

  clearReservationTimer() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY);
  }
};

// Mantener el contador del carrito siempre sincronizado en todas las páginas
if (typeof window !== 'undefined') {
  const syncBadge = () => CartService.updateBadge();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncBadge);
  } else {
    syncBadge();
  }
  // Volver con el botón "atrás" del navegador (bfcache)
  window.addEventListener('pageshow', syncBadge);
  // Cambios del carrito hechos en otra pestaña
  window.addEventListener('storage', (e) => {
    if (e.key === CONFIG.STORAGE_KEYS.CART || e.key === null) {
      syncBadge();
      window.dispatchEvent(new Event('cartUpdated'));
    }
  });
}
