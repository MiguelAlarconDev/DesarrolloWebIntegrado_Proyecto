# Sistema de Gestión y Venta de Cursos Virtuales - Arquitectura de Microservicios

Arquitectura de **Microservicios** desarrollada en **Java 17**, **Spring Boot 3**, **Spring Cloud Gateway**, **PostgreSQL** y **Frontend Web** para la plataforma de gestión y venta de cursos virtuales con pasarela de pago Mercado Pago.

---

## 🏛️ Arquitectura de Microservicios

El sistema está compuesto por servicios independientes que se comunican mediante API REST a través del API Gateway central:

| Microservicio | Tecnología | Puerto | Responsabilidad |
|---|---|:---:|---|
| **frontend-web** | HTML5, CSS3, JavaScript ES6 | `3000` | Portal web responsive para alumnos y docentes |
| **gateway-service** | Spring Cloud Gateway MVC | `8080` | Punto de entrada único, enrutamiento, CORS y filtros JWT |
| **auth-service** | Spring Boot, Spring Security, JWT | `8081` | Registro, autenticación, roles (Admin/Docente/Estudiante) y 2FA |
| **cursos-service** | Spring Boot, Spring Data JPA | `8082` | Catálogo de cursos, aforos en tiempo real, modalidades y enlaces |
| **pedidos-service** | Spring Boot, RestClient | `8083` | Órdenes de matrícula, Mercado Pago Sandbox y comprobantes SUNAT |

---

## 📋 Requisitos del Sistema

- **Java**: 17 o superior
- **Maven**: 3.9 o superior (o usar el ejecutable incluido `.\mvnw.cmd`)
- **Python**: 3.11 o superior (para servir el frontend estático)
- **PostgreSQL**: 16 o superior (con la base de datos `cursos_db`)
- **Postman**: Para pruebas de integración de endpoints

---

## 🗄️ Base de Datos (PostgreSQL)

Los microservicios comparten la base de datos `cursos_db` en PostgreSQL:

La conexión se configura **solo con variables de entorno o con un archivo `.env` privado** (ignorado por Git), nunca en archivos versionados. Configuración local típica (PostgreSQL 18 en `127.0.0.1:5432`):

```dotenv
DB_URL=jdbc:postgresql://127.0.0.1:5432/cursos_db
DB_USERNAME=postgres
DB_PASSWORD=<tu-contraseña-local>
```

`spring.jpa.hibernate.ddl-auto` es siempre `none` al usar el script: los servicios **no modifican el esquema**. Ver [`.env.example`](.env.example) para el resto de variables (JWT, Mercado Pago, SMTP, Meta, Supabase Storage).

> [!NOTE]
> Para inicializar una base **nueva y vacía** con las tablas y los 3 cursos semilla, ejecuta
> [`database/schema_local.sql`](database/schema_local.sql). **Contiene `DROP`**: no lo ejecutes sobre una base con datos.

---

## ⚡ Arranque rápido (Windows PowerShell)

**Primera vez** (crea tu configuración privada a partir de la plantilla; nunca sobrescribe un `.env` existente):

```powershell
.\iniciar_servicios.ps1 -CrearEnv   # copia .env.example a .env
notepad .env                        # completa los valores <...> (contraseña de BD, JWT_SECRET, token TEST de Mercado Pago...)
```

**Uso diario** (un solo comando):

```powershell
.\iniciar_servicios.ps1      # carga .env, verifica dependencias y puertos y levanta los 7 servicios
.\detener_servicios.ps1      # detiene solo los procesos lanzados por el script (.run\pids.json)
```

También funcionan `iniciar_servicios.bat` / `detener_servicios.bat` (doble clic). Opciones: `-SinFrontend` (todo menos Angular), `-EnvFile <ruta>` (otro archivo de configuración).

Cómo se resuelve la configuración:

- **Prioridad:** variables ya definidas en la sesión de PowerShell → `.env` → valores por defecto de cada servicio. Sin `.env`, el script pregunta URL, usuario y contraseña (sin eco).
- Los valores vacíos o con forma `<...>` se ignoran; `PORT`, `PATH` y otras variables del sistema no se aceptan desde `.env`.
- Nunca se imprimen valores: solo nombres de variables. Tras lanzar los servicios, las variables cargadas desde `.env` y la contraseña se retiran de la sesión.
- Si falta `JWT_SECRET`, se genera uno aleatorio por ejecución (las sesiones iniciadas no sobreviven a un reinicio); defínelo en `.env` para conservarlas.
- Avisa si el token de Mercado Pago no es de prueba (`TEST-`) y si hay SMTP configurado (los correos serían reales).

Protecciones: si ya hay servicios del proyecto en ejecución o algún puerto está ocupado, el script **no inicia nada** e indica el puerto, el proceso y su PID. `.run\pids.json` guarda PID e instante de inicio, de modo que `detener_servicios.ps1` nunca detiene un proceso ajeno aunque Windows reutilice el PID.

Logs en `.run\logs\`. Puertos: Gateway 8080, Auth 8081, Cursos 8082, Pedidos 8083, Comprobantes 8084, WhatsApp 8085, Angular 4200.

## 🚀 Ejecución de los Servicios

### 1. Iniciar Microservicios Backend (Java / Spring Boot)

Abre terminales independientes en la raíz del proyecto o ejecuta:

```powershell
# 1. Auth Service (Puerto 8081)
.\mvnw.cmd -pl auth-service spring-boot:run

# 2. Cursos Service (Puerto 8082)
.\mvnw.cmd -pl cursos-service spring-boot:run

# 3. Pedidos Service (Puerto 8083)
.\mvnw.cmd -pl pedidos-service spring-boot:run

# 4. API Gateway (Puerto 8080)
.\mvnw.cmd -pl gateway-service spring-boot:run
```

### 2. Iniciar el Frontend Web

```powershell
# Frontend Web (Puerto 3000)
python frontend_server.py
```

Acceso al sistema en el navegador: **[http://localhost:3000](http://localhost:3000)**

---

## 👥 Cuentas de Prueba Pre-registradas

| Rol | Correo | Contraseña | WhatsApp | Verificación 2FA |
| :--- | :--- | :--- | :--- | :---: |
| **Estudiante** | `estudiante@cursos.com` | `123456` | `+51999999993` | No requerida |
| **Docente** | `docente@cursos.com` | `123456` | `+51999999992` | Requerida (Código en consola) |
| **Admin** | `admin@cursos.com` | `123456` | `+51999999991` | Requerida (Código en consola) |

---

## 📮 Pruebas con Postman

Importa la colección oficial en Postman:
📂 [`postman/GestionCursos_Microservicios.postman_collection.json`](postman/GestionCursos_Microservicios.postman_collection.json)

> [!TIP]
> Puedes enviar todas las peticiones a través del **Gateway** (`http://localhost:8080/api/...`) o directamente a cada microservicio (`8081`, `8082`, `8083`).

### Flujo de Prueba Rápido:
1. **Ver Catálogo**: `GET http://localhost:8080/api/cursos`
2. **Login Docente (2FA)**: `POST http://localhost:8080/api/auth/login` (ver código OTP en consola)
3. **Verificar 2FA**: `POST http://localhost:8080/api/auth/verificar-2fa`
4. **Checkout (Matrícula)**: `POST http://localhost:8080/api/pedidos/checkout` (reserva vacante en `cursos-service`)
5. **Crear Preferencia Mercado Pago**: `POST http://localhost:8080/api/pagos/crear-preferencia`
6. **Confirmar Pago**: `PUT http://localhost:8080/api/pedidos/{pedidoId}/pagar` (emite boleta/factura)
7. **Mis Cursos**: `GET http://localhost:8080/api/pedidos/estudiante/{estudianteId}`
8. **Participantes por Curso**: `GET http://localhost:8080/api/pedidos/curso/{cursoId}/participantes`
