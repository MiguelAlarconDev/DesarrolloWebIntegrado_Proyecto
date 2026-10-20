/**
 * NOTIFICATIONS.JS - Toast UI y Enlace de WhatsApp
 */
const Notifications = {
  showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;

    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-times-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'info') icon = 'fa-info-circle';

    toast.innerHTML = `
      <i class="fa ${icon}" style="font-size: 18px;"></i>
      <div style="flex: 1;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  abrirWhatsAppWeb(numero, mensaje) {
    let cleanNum = (numero || '').toString().replace(/\D/g, '');
    // Si tiene 9 dígitos (estándar Perú), anteponer código de país 51
    if (cleanNum.length === 9) {
      cleanNum = '51' + cleanNum;
    } else if (cleanNum.length === 0) {
      cleanNum = '51999555666'; // Teléfono por defecto si está vacío
    }
    const encoded = encodeURIComponent(mensaje);
    const url = `https://api.whatsapp.com/send?phone=${cleanNum}&text=${encoded}`;
    const win = window.open(url, '_blank');
    if (!win) {
      window.location.href = url;
    }
  },

  abrirCorreo(email, asunto, mensaje) {
    const encodedAsunto = encodeURIComponent(asunto);
    const encodedMensaje = encodeURIComponent(mensaje);
    const mailtoUrl = `mailto:${email}?subject=${encodedAsunto}&body=${encodedMensaje}`;
    window.location.href = mailtoUrl;
  }
};
