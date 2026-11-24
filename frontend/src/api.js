// Cliente HTTP unico: todas las llamadas van al gateway.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const SESSION_KEY = 'aula.sesion';

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.exp && s.exp * 1000 < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function saveSession(auth) {
  const payload = decodeJwt(auth.token);
  const s = {
    token: auth.token,
    id: auth.usuarioId,
    nombre: auth.nombres,
    correo: auth.correo,
    rol: auth.rol,
    exp: payload?.exp
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function decodeJwt(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part));
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(status, message, retryAfter) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const MENSAJES = {
  401: 'Tu sesión expiró o los datos no son correctos.',
  403: 'No tienes permiso para esta acción.',
  404: 'No encontramos lo que buscas.',
  423: 'La cuenta está bloqueada temporalmente.',
  429: 'Hiciste demasiadas solicitudes. Espera un minuto e inténtalo de nuevo.',
  503: 'El servicio no está disponible en este momento. Inténtalo en unos minutos.'
};

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const session = getSession();
  if (auth && session?.token) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    if (res.status === 401 && session && auth) {
      clearSession();
      window.dispatchEvent(new Event('aula:sesion-expirada'));
    }
    const msg = (data && (data.message || data.detail)) || MENSAJES[res.status] || 'Ocurrió un error inesperado.';
    throw new ApiError(res.status, msg, res.headers.get('Retry-After'));
  }
  return data;
}

export const fmt = {
  soles: (n) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(n || 0)),
  fecha: (iso) =>
    iso ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—',
  fechaHora: (iso) =>
    iso
      ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
      : '—'
};

// Solo se permite abrir enlaces http(s) que vienen del servidor (evita javascript:)
export function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}
