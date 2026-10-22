/**
 * API.JS - Cliente HTTP con soporte de JWT y Fallback Resiliente
 *
 * - Todas las peticiones pasan primero por el API Gateway (CONFIG.API_BASE_URL).
 * - Si el Gateway no responde (error de red), se reintenta automáticamente contra
 *   el microservicio correspondiente (auth 8081, cursos 8082, pedidos/pagos 8083).
 * - Los errores HTTP (401, 404, 409...) NO se reintentan: se lanzan con `status`
 *   para que cada servicio decida qué mostrar al usuario.
 */
const API = {
  TIMEOUT_MS: 12000,

  /** Devuelve la URL directa del microservicio para un endpoint relativo del Gateway */
  resolveDirectUrl(endpoint) {
    if (endpoint.startsWith('http')) return null;
    const map = [
      ['/auth', 'http://localhost:8081/api'],
      ['/cursos', 'http://localhost:8082/api'],
      ['/pedidos', 'http://localhost:8083/api'],
      ['/pagos', 'http://localhost:8083/api']
    ];
    const match = map.find(([prefix]) => endpoint.startsWith(prefix));
    return match ? `${match[1]}${endpoint}` : null;
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.API_BASE_URL}${endpoint}`;
    try {
      return await this._fetch(url, options);
    } catch (err) {
      // Solo reintentar directo al microservicio si fue un fallo de red/CORS (sin status HTTP)
      const directUrl = !err.status ? this.resolveDirectUrl(endpoint) : null;
      if (directUrl) {
        console.warn(`[API] Gateway no disponible para ${endpoint}, reintentando directo al microservicio...`);
        return await this._fetch(directUrl, options);
      }
      throw err;
    }
  },

  async _fetch(url, options = {}) {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };
    if (token && !token.startsWith('mock-')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), this.TIMEOUT_MS) : null;

    let response;
    try {
      response = await fetch(url, { ...options, headers, signal: controller ? controller.signal : undefined });
    } catch (networkErr) {
      const err = new Error('No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.');
      err.network = true;
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (!response.ok) {
      let data = {};
      try { data = await response.json(); } catch (_) { /* sin cuerpo JSON */ }
      const err = new Error(data.mensaje || data.message || data.error || `Error HTTP ${response.status}`);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
};
