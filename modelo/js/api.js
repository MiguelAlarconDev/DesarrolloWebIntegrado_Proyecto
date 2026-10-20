/**
 * API.JS - Cliente HTTP con soporte de JWT y Fallback Resiliente
 */
const API = {
  /**
   * Realiza una petición HTTP con el token JWT si está disponible
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (_) {
          errorData = { mensaje: `Error HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.mensaje || errorData.error || 'Error en la petición');
      }

      // Si el endpoint retorna 204 No Content
      if (response.status === 204) return null;
      return await response.json();

    } catch (err) {
      console.warn(`[API] Fallo de conexión con ${url}. Verificando modo local/simulación...`, err.message);
      throw err;
    }
  }
};
