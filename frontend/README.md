# 🎓 Frontend Angular 22 - Plataforma de Gestión y Venta de Cursos

Aplicación frontend moderna desarrollada en **Angular 22** con **Tailwind CSS**, arquitectura basada en componentes independientes (*Standalone Components*), enrutamiento reactivo e integración integral con pasarela de pagos oficial **Mercado Pago** y microservicios backend (**Spring Boot**, **PostgreSQL** y **Python FastAPI**).

---

## 🚀 1. Tecnologías y Arquitectura

* **Framework:** Angular 22 (Standalone Components + Signals + Control Flow `@if`, `@for`)
* **Estilos:** Tailwind CSS con paleta institucional Navy Blue (`#1E3A8A`), verde esmeralda y tipografías *Plus Jakarta Sans* e *Inter*.
* **Pasarela de Pagos:** Mercado Pago Checkout Oficial (Soporta Tarjetas Visa/Mastercard/Amex, Yape, Plin y Modo Sandbox).
* **Facturación Electrónica:** SUNAT con selector dinámico de Boleta de Venta (`B001`) o Factura con RUC (`F001`).
* **Notificaciones:** Integración autónoma con WhatsApp y Correo SMTP para confirmaciones de matrícula con enlace directo a Google Meet.
* **Consumo de Microservicios:** Enrutamiento centralizado mediante **API Gateway** en `http://localhost:8080/api`.

---

## 📂 2. Estructura del Proyecto

```text
src/
├── app/
│   ├── components/
│   │   ├── navbar/             # Barra de navegación principal con menú dinámico por rol
│   │   └── footer/             # Pie de página institucional de 4 columnas
│   ├── models/
│   │   ├── auth.model.ts       # Modelos de usuario, sesión JWT y 2FA
│   │   ├── curso.model.ts      # Modelos de cursos, modalidades y aforos
│   │   └── pedido.model.ts     # Modelos de órdenes, pagos Mercado Pago y comprobantes
│   ├── pages/
│   │   ├── catalogo/           # Catálogo público, búsqueda, filtros y sección de contacto
│   │   ├── curso-detalle/      # Ficha modular del curso, temario y enlace de reserva
│   │   ├── checkout/           # Facturación SUNAT, temporizador de reserva y Mercado Pago
│   │   ├── confirmacion/       # Comprobante emitido, enlace Google Meet y descarga PDF
│   │   ├── login/              # Acceso con credenciales y verificación 2FA OTP
│   │   ├── registro/           # Registro de nuevos estudiantes
│   │   ├── estudiante-panel/   # Portal del alumno con sus cursos y comprobantes
│   │   ├── docente-panel/      # Portal docente para gestionar salas Google Meet y alumnos
│   │   └── admin-panel/        # Consola administrativa con KPIs y catálogo maestro
│   ├── services/
│   │   ├── auth.service.ts     # Conexión con auth-service (Puerto 8081)
│   │   ├── curso.service.ts    # Conexión con cursos-service (Puerto 8082)
│   │   └── pedido.service.ts   # Conexión con pedidos-service (Puerto 8083)
│   ├── app.config.ts           # Configuración de proveedores (HttpClient, Router, Zone.js)
│   ├── app.routes.ts           # Tabla de rutas del frontend
│   └── app.ts                  # Componente raíz
└── index.html                  # Plantilla HTML base con fuentes y SDKs
```

---

## ⚡ 3. Requisitos Previos y Ejecución

### 3.1. Requisitos
* **Node.js:** v18+ o v24+
* **npm:** v10+ o v11+
* **Backend de Microservicios:** En ejecución a través del API Gateway en el puerto `8080`.

### 3.2. Instalación de Dependencias
```bash
npm install
```

### 3.3. Servidor de Desarrollo
Para iniciar la aplicación en modo desarrollo:
```bash
npm start
# o
ng serve
```
Abre tu navegador en: **`http://localhost:4200`**

### 3.4. Compilación para Producción
```bash
npm run build
```
Los archivos optimizados se generarán en la carpeta `dist/frontend`.

---

## 💳 4. Tarjetas de Prueba Sandbox (Mercado Pago)

Para realizar pruebas de matrícula en entorno local:

| Tipo | Número de Tarjeta | Fecha Exp. | CVV |
| :--- | :--- | :---: | :---: |
| **Visa Sandbox** | `4242 4242 4242 4242` | `12/28` | `123` |
| **Mastercard Sandbox** | `5555 5555 5555 4444` | `11/27` | `456` |

---

## 👥 5. Cuentas de Acceso de Prueba (Seed Data)

| Rol | Correo | Contraseña | Destino tras Login |
| :--- | :--- | :---: | :--- |
| **Docente** | `docente@cursos.com` | `123456` | Verificación 2FA OTP &rarr; `/docente` |
| **Administrador** | `admin@cursos.com` | `123456` | Verificación 2FA OTP &rarr; `/admin` |
| **Estudiante** | `estudiante@cursos.com` | `123456` | Acceso directo a `/mis-cursos` |

---

## 🌐 6. Conexión con GitHub

Este directorio cuenta con su propio repositorio Git inicializado (`main`). Para vincularlo a tu repositorio remoto de GitHub:

```bash
git remote add origin https://github.com/TU_USUARIO/frontend-angular.git
git push -u origin main
```
