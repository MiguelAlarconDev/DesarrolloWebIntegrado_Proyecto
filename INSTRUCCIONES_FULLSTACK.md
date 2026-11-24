# 🚀 Guía de Ejecución Full-Stack (Rama: `test/fullstack-angular`)

Esta rama experimental integra la **culminación del Backend de Microservicios** junto a la **aplicación Frontend desarrollada en Angular 22**, permitiendo ejecutar y validar todo el flujo de inicio a fin (*End-to-End*).

---

## 🏗️ 1. Novedades y Mejoras Implementadas

### Backend (Java & Python)
1. **Soporte Global de CORS en `gateway-service`:**
   - Configurado en `com.curso.gateway.config.CorsConfig` para permitir llamadas desde la aplicación Angular (`http://localhost:4200`).
2. **Ruta Centralizada para Comprobantes:**
   - Añadida la ruta `/api/comprobantes/**` en el API Gateway hacia el microservicio en Python (`http://localhost:8084`).
3. **Despacho Automático de Facturación:**
   - Integrado `ComprobanteClient` en `pedidos-service`, invocando a `comprobantes-service` para generar el PDF (ReportLab) y enviar el correo SMTP en cuanto el pedido se confirma.
4. **CRUD de Cursos Completo:**
   - Añadidos endpoints de edición (`PUT /api/cursos/{id}`) y eliminación (`DELETE /api/cursos/{id}`) en `cursos-service` para la consola de administración.

### Frontend (Angular 22 + Tailwind CSS)
Ubicado en la carpeta `/frontend`:
* **Diseño Institucional EdTech:** Basado en los prototipos oficiales de **Stitch** con paleta *Navy Blue* (`#1E3A8A`), verde esmeralda y tipografías *Plus Jakarta Sans* e *Inter*.
* **Vistas Implementadas:**
  1. `Catálogo de Cursos`: Búsqueda, filtros por modalidad (*Virtual Meet/Zoom* vs *Presencial*), precios y barra de aforo.
  2. `Ficha de Detalle de Curso`: Temario modular, datos del docente y tarjeta *sticky* de reserva.
  3. `Checkout y Facturación SUNAT`: Selector entre Boleta con DNI o Factura con RUC (11 dígitos) y simulación con Mercado Pago.
  4. `Confirmación de Matrícula`: Enlace de sala Google Meet, desglose tributario y botón para descargar el comprobante en PDF.
  5. `Login y Seguridad 2FA OTP`: Entrada con 6 dígitos y cuenta regresiva de 5 minutos.
  6. `Panel del Estudiante`: Mis cursos activos (con botón para entrar a Google Meet) y tabla de comprobantes con descarga de PDF.
  7. `Panel del Docente`: Gestión de cursos a cargo, actualización de enlace de Google Meet y lista de participantes oficiales.
  8. `Consola de Administración`: KPIs financieros en Soles, inventario maestro y formulario de alta rápida de cursos.

---

## ⚙️ 2. Instrucciones para Levantar la Aplicación

### Paso 1: Base de Datos PostgreSQL
Asegúrate de tener creada la base de datos `cursos_db` en PostgreSQL e importar el script con datos semilla:
```powershell
# En psql o pgAdmin:
psql -U postgres -d cursos_db -f database/schema_local.sql
```

---

### Paso 2: Iniciar los Microservicios Backend

Abre terminales independientes en la raíz del proyecto para cada servicio:

```powershell
# Terminal 1 - Auth Service (Puerto 8081)
.\mvnw.cmd spring-boot:run -pl auth-service

# Terminal 2 - Cursos Service (Puerto 8082)
.\mvnw.cmd spring-boot:run -pl cursos-service

# Terminal 3 - Pedidos Service (Puerto 8083)
.\mvnw.cmd spring-boot:run -pl pedidos-service

# Terminal 4 - API Gateway (Puerto 8080)
.\mvnw.cmd spring-boot:run -pl gateway-service
```

*(Opcional) Microservicio de Comprobantes (Python FastAPI en Puerto 8084):*
```powershell
# Terminal 5
cd comprobantes-service
python -m uvicorn app.main:app --port 8084 --reload
```

---

### Paso 3: Iniciar el Frontend en Angular

En una terminal adicional:
```powershell
cd frontend
npm start
```
Abre tu navegador en: **`http://localhost:4200`**

---

## 🔑 3. Cuentas de Prueba Preconfiguradas (Seed Data)

| Rol | Correo | Contraseña | Flujo de Acceso |
| :--- | :--- | :--- | :--- |
| **Docente** | `docente@cursos.com` | `123456` *(o tu password local)* | Pasa por verificación 2FA OTP (6 dígitos) y redirige a `/docente`. |
| **Admin** | `admin@cursos.com` | `123456` | Pasa por 2FA OTP y redirige a `/admin`. |
| **Estudiante** | `estudiante@cursos.com` | `123456` | Acceso directo a `/mis-cursos` o compra en `/checkout`. |
