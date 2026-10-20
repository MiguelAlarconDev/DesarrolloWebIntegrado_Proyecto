/**
 * CART.SERVICE.JS - Gestión del Carrito y Temporizador de Bloqueo de Vacante
 */
const CartService = {
  getCart() {
    let raw = localStorage.getItem(CONFIG.STORAGE_KEYS.CART);
    if ((!raw || raw === '[]') && typeof window !== 'undefined' && window.location.search && window.location.search.includes('sample=1')) {
      const demo = [{
        id: 'b0000000-0000-0000-0000-000000000001',
        titulo: 'Desarrollo de Microservicios con Spring Boot y Cloud',
        precio: 350.00,
        modalidad: 'VIRTUAL',
        horario: 'Sábados y Domingos 09:00 - 13:00',
        docente: 'Ing. Carlos Mendoza',
        imagen: 'assets/images/all-img/c1.png'
      }];
      localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(demo));
      this.startReservationTimer();
      return demo;
    }
    return raw ? JSON.parse(raw) : [];
  },

  addToCart(curso) {
    if (!curso || !curso.id) {
      return { success: false, message: 'Curso inválido.' };
    }
    const cart = this.getCart();

    // Si ya está en el carrito, se considera exitoso para continuar al pago
    const exists = cart.find(item => item.id === curso.id);
    if (exists) {
      this.startReservationTimer();
      return { success: true, alreadyInCart: true, message: 'El curso ya está en tu carrito. Procediendo al pago...' };
    }

    // Verificar si quedan vacantes disponibles (defensivo)
    const libres = Number(curso.aforoDisponible !== undefined ? curso.aforoDisponible : 30);
    if (libres <= 0) {
      return { success: false, message: 'Lo sentimos, las vacantes para este curso están agotadas.' };
    }

    cart.push(curso);
    localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(cart));

    // Iniciar temporizador de reserva de 15 minutos (si no existe ya)
    this.startReservationTimer();

    window.dispatchEvent(new Event('cartUpdated'));
    return { success: true, message: '¡Curso reservado con éxito! Procediendo al carrito...' };
  },

  removeFromCart(cursoId) {
    let cart = this.getCart();
    cart = cart.filter(item => item.id !== cursoId);
    localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(cart));

    if (cart.length === 0) {
      this.clearReservationTimer();
    }

    window.dispatchEvent(new Event('cartUpdated'));
  },

  clearCart() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CART);
    this.clearReservationTimer();
    window.dispatchEvent(new Event('cartUpdated'));
  },

  getCartCount() {
    return this.getCart().length;
  },

  getTotals() {
    const cart = this.getCart();
    const total = cart.reduce((acc, item) => acc + Number(item.precio), 0);
    const subtotal = total / 1.18;
    const igv = total - subtotal;
    return {
      subtotal: subtotal.toFixed(2),
      igv: igv.toFixed(2),
      total: total.toFixed(2)
    };
  },

  /* Temporizador de reserva de vacante en tiempo real (15 minutos) */
  startReservationTimer() {
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY)) {
      const expiry = Date.now() + 15 * 60 * 1000; // 15 minutos
      localStorage.setItem(CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY, expiry.toString());
    }
  },

  getRemainingTime() {
    const expiry = localStorage.getItem(CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY);
    if (!expiry) return null;
    const diff = Math.max(0, parseInt(expiry) - Date.now());
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return {
      expired: diff <= 0,
      formatted: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    };
  },

  clearReservationTimer() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY);
  }
};
