import { Injectable } from '@angular/core';
import { APP_CONFIG } from './config.data';

export interface CartItem {
  id: string;
  titulo: string;
  precio: number;
  modalidad: string;
  horario: string;
  docente: string;
  imagen: string;
  aforoDisponible?: number;
  enlaceClase?: string | null;
  direccionClase?: string | null;
  aula?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  readonly RESERVATION_MINUTES = 15;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === APP_CONFIG.STORAGE_KEYS.CART || e.key === null) {
          this.updateBadge();
          window.dispatchEvent(new Event('cartUpdated'));
        }
      });
    }
  }

  getCart(): CartItem[] {
    try {
      const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.CART);
      if ((!raw || raw === '[]') && typeof window !== 'undefined' && window.location.search && window.location.search.includes('sample=1')) {
        const demo: CartItem[] = [{
          id: 'b0000000-0000-0000-0000-000000000001',
          titulo: 'Desarrollo Web Integrado con Spring Boot',
          precio: 150.00,
          modalidad: 'VIRTUAL',
          horario: 'Lun y Mie 19:00 - 22:00',
          docente: 'Ing. Roberto Silva',
          imagen: 'assets/images/all-img/c1.png'
        }];
        try {
          const u = new URL(window.location.href);
          u.searchParams.delete('sample');
          window.history.replaceState({}, document.title, u.pathname + (u.search ? u.search : ''));
        } catch (_) {}
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CART, JSON.stringify(demo));
        this.startReservationTimer();
        return demo;
      }
      const cart = raw ? JSON.parse(raw) : [];
      return Array.isArray(cart) ? cart.filter(item => item && item.id) : [];
    } catch (_) {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.CART);
      return [];
    }
  }

  saveCart(cart: CartItem[]): void {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CART, JSON.stringify(cart));
    if (cart.length === 0) this.clearReservationTimer();
    this.notifyChange();
  }

  isInCart(cursoId: string): boolean {
    return this.getCart().some(item => item.id === cursoId);
  }

  addToCart(curso: any): { success: boolean; alreadyInCart?: boolean; message: string } {
    if (!curso || !curso.id) {
      return { success: false, message: 'Curso inválido.' };
    }
    const cart = this.getCart();

    if (cart.some(item => item.id === curso.id)) {
      this.startReservationTimer();
      this.bumpBadge();
      return { success: true, alreadyInCart: true, message: 'Este curso ya está en tu carrito.' };
    }

    const libres = Number(curso.aforoDisponible !== undefined ? curso.aforoDisponible : 30);
    if (libres <= 0) {
      return { success: false, message: 'Lo sentimos, las vacantes para este curso están agotadas.' };
    }

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
  }

  removeFromCart(cursoId: string): void {
    if (!cursoId) return;
    const targetId = String(cursoId).trim();
    this.saveCart(this.getCart().filter(item => item && String(item.id).trim() !== targetId));
  }

  clearCart(): void {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.CART);
    this.clearReservationTimer();
    this.notifyChange();
  }

  getCartCount(): number {
    return this.getCart().length;
  }

  getTotals(): { subtotal: string; igv: string; total: string } {
    const total = this.getCart().reduce((acc, item) => acc + (Number(item.precio) || 0), 0);
    const subtotal = total / 1.18;
    const igv = total - subtotal;
    return {
      subtotal: subtotal.toFixed(2),
      igv: igv.toFixed(2),
      total: total.toFixed(2)
    };
  }

  notifyChange(): void {
    this.updateBadge();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cartUpdated'));
    }
  }

  updateBadge(): void {
    if (typeof document === 'undefined') return;
    const count = this.getCartCount();
    document.querySelectorAll('#cart-nav-counter, .cart-nav-counter').forEach((el: any) => {
      el.textContent = count > 9 ? '9+' : String(count);
      el.classList.toggle('is-empty', count === 0);
      el.classList.toggle('has-items', count > 0);
      el.style.display = count > 0 ? 'inline-flex' : 'none';
      const link = el.closest('a');
      if (link) {
        link.classList.toggle('has-items', count > 0);
        link.classList.toggle('is-empty', count === 0);
        const label = count === 0
          ? 'Ver carrito de cursos'
          : `Ver carrito (${count} ${count === 1 ? 'curso' : 'cursos'})`;
        link.setAttribute('title', label);
        link.setAttribute('aria-label', label);
      }
    });

    document.querySelectorAll('nav a[href="/carrito"], #main-menu a[href="/carrito"], #mobile_menu a[href="/carrito"]').forEach((a: any) => {
      let badge = a.querySelector('.cart-menu-pill');
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'badge bg-success cart-menu-pill ms-1';
          badge.style.fontSize = '10.5px';
          badge.style.padding = '2px 6px';
          badge.style.borderRadius = '8px';
          badge.style.verticalAlign = 'middle';
          a.appendChild(badge);
        }
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.style.display = 'inline-block';
      } else if (badge) {
        badge.style.display = 'none';
      }
    });
  }

  bumpBadge(): void {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('#cart-nav-counter, .cart-nav-counter, .home_lc a, .hlc').forEach((el: any) => {
      el.classList.remove('cart-bump');
      void el.offsetWidth;
      el.classList.add('cart-bump');
      setTimeout(() => el.classList.remove('cart-bump'), 320);
    });
  }

  checkPaidCourses(paidIds: Set<string>): CartItem[] {
    if (!paidIds || paidIds.size === 0) return [];
    return this.getCart().filter(item => paidIds.has(item.id));
  }

  startReservationTimer(): void {
    const current = parseInt(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY) || '0', 10);
    if (!current || current <= Date.now()) {
      const expiry = Date.now() + this.RESERVATION_MINUTES * 60 * 1000;
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY, expiry.toString());
    }
  }

  renewReservation(): void {
    this.clearReservationTimer();
    this.startReservationTimer();
  }

  getRemainingTime(): { expired: boolean; urgent: boolean; formatted: string } | null {
    const expiry = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY);
    if (!expiry) return null;
    const diff = Math.max(0, parseInt(expiry, 10) - Date.now());
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return {
      expired: diff <= 0,
      urgent: diff > 0 && diff <= 2 * 60 * 1000,
      formatted: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    };
  }

  clearReservationTimer(): void {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.RESERVATION_EXPIRY);
  }
}
