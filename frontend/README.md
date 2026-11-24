# Frontend — Aula Viva

SPA en React + Vite que consume **solo el gateway**.

| Rol | Pantallas |
| --- | --- |
| Público | Catálogo con filtros y búsqueda, detalle del curso, ingreso con 2FA, registro |
| Estudiante | Reservar y pagar (Mercado Pago), Mis cursos con cuenta regresiva de 15 min, cancelar reserva, acceso a la clase |
| Docente | Mis clases, enlace Zoom/Meet o aula, lista de participantes |
| Admin | Pedidos y ventas, cursos (crear/publicar), usuarios (crear docentes/admin), seguridad (IPs bloqueadas) |

## Desarrollo

```bash
cp .env.example .env      # VITE_API_URL=http://localhost:8080
npm install
npm run dev               # http://localhost:5173
```

## Netlify

1. New site from Git → repositorio → **Base directory:** `frontend`.
2. Variable de entorno `VITE_API_URL` = URL pública del gateway.
3. En el gateway, agregue la URL de Netlify a `CORS_ALLOWED_ORIGINS` y en pedidos-service úsela como `FRONTEND_URL`.

`netlify.toml` ya incluye la redirección SPA y cabeceras de seguridad (CSP, HSTS, X-Frame-Options).

La sesión se guarda en `sessionStorage` (se borra al cerrar la pestaña) y se cierra sola cuando vence el token.
