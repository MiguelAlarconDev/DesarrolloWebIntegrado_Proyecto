import { Injectable } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  /**
   * Muestra un mensaje flotante (toast) con diseño de alta visibilidad,
   * barra de progreso y botón de cierre inmediato.
   */
  showToast(message: string, type: ToastType = 'success', duration = 4500): void {
    if (typeof document === 'undefined') return;

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    let icon = 'fa-check';
    if (type === 'error') icon = 'fa-times';
    if (type === 'warning') icon = 'fa-exclamation';
    if (type === 'info') icon = 'fa-info';

    toast.innerHTML = `
      <div class="toast-icon-wrap">
        <i class="fa ${icon}"></i>
      </div>
      <div class="toast-content-body">${message}</div>
      <button type="button" class="toast-close-btn" aria-label="Cerrar notificación" title="Cerrar">&times;</button>
      <div class="toast-progress-bar"></div>
    `;

    container.appendChild(toast);

    const progressBar = toast.querySelector('.toast-progress-bar') as HTMLElement | null;
    if (progressBar) {
      progressBar.style.transition = `width ${duration}ms linear`;
      requestAnimationFrame(() => {
        progressBar.style.width = '0%';
      });
    }

    let hideTimeout: any = null;

    const dismiss = () => {
      if (toast.classList.contains('toast-hiding')) return;
      if (hideTimeout) clearTimeout(hideTimeout);
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        try { toast.remove(); } catch (_) {}
      }, 300);
    };

    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismiss();
      });
    }

    hideTimeout = setTimeout(dismiss, duration);
  }

  success(message: string, duration = 4500): void {
    this.showToast(message, 'success', duration);
  }

  error(message: string, duration = 4500): void {
    this.showToast(message, 'error', duration);
  }

  warning(message: string, duration = 4500): void {
    this.showToast(message, 'warning', duration);
  }

  info(message: string, duration = 4500): void {
    this.showToast(message, 'info', duration);
  }

  abrirWhatsAppWeb(numero: string, mensaje: string): void {
    let cleanNum = (numero || '').toString().replace(/\D/g, '');
    if (cleanNum.length === 9) {
      cleanNum = '51' + cleanNum;
    } else if (cleanNum.length === 0) {
      cleanNum = '51999555666';
    }
    const encoded = encodeURIComponent(mensaje);
    const url = `https://api.whatsapp.com/send?phone=${cleanNum}&text=${encoded}`;
    const win = window.open(url, '_blank');
    if (!win) {
      window.location.href = url;
    }
  }

  abrirCorreo(email: string, asunto: string, mensaje: string): void {
    const encodedAsunto = encodeURIComponent(asunto);
    const encodedMensaje = encodeURIComponent(mensaje);
    const mailtoUrl = `mailto:${email}?subject=${encodedAsunto}&body=${encodedMensaje}`;
    window.location.href = mailtoUrl;
  }
}
