// Configuracion en tiempo de ejecucion (no requiere recompilar).
// En Netlify/Docker este archivo se genera con la URL publica del gateway:
//   window.__APP_CONFIG__ = { apiUrl: 'https://mi-gateway.ejemplo.com/api' };
// Vacio = desarrollo local (usa http://127.0.0.1:8080/api o el mismo origen si se sirve desde el gateway).
window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};
