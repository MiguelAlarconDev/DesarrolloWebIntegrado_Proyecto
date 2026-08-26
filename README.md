# Sistema de Gestión y Venta de Cursos Virtuales - Arquitectura de Microservicios

Arquitectura de **Microservicios** desarrollada en **Spring Boot 3**, **Spring Cloud Gateway** y **PostgreSQL** para la plataforma de gestión y venta de cursos virtuales.

---

## 🏗️ Arquitectura de Microservicios

El sistema está dividido en módulos independientes bajo una estructura **Maven Multi-Módulo**:

| Microservicio | Puerto | Descripción |
| :--- | :---: | :--- |
| **`gateway-service`** | `8080` | **API Gateway Centralizado**: Punto de entrada único que enruta las peticiones hacia los microservicios. |
| **`auth-service`** | `8081` | **Autenticación y Seguridad**: Registro, Login, 2FA OTP para Admin/Docente y consulta de usuarios. |
| **`cursos-service`** | `8082` | **Catálogo y Cursos**: Gestión de cursos, aforos, docentes y enlaces a clases virtuales (Zoom / Meet). |
| **`pedidos-service`** | `8083` | **Matrículas y Pagos**: Checkout, reserva temporal de vacantes, confirmación de pago, comprobantes fiscales y notificaciones de WhatsApp. |

---

## 🗄️ Base de Datos

1. Crear la base de datos en PostgreSQL:
```sql
CREATE DATABASE cursos_db;
```
2. Ejecutar el script [`database/schema_local.sql`](database/schema_local.sql) para cargar la estructura y datos de prueba iniciales (Admin, Docente, Estudiante y Cursos).

Credenciales por defecto en cada microservicio:
- Usuario: `postgres`
- Contraseña: `postgres`
- Puerto: `5432`

---

## ▶️ Cómo Ejecutar los Microservicios

### Opción 1: Desde tu IDE (IntelliJ IDEA, VS Code o Eclipse)
Ejecutar la clase principal de cada servicio (puedes iniciar todos a la vez):
1. `auth-service`: `com.curso.auth.AuthServiceApplication` (▶️)
2. `cursos-service`: `com.curso.cursos.CursosServiceApplication` (▶️)
3. `pedidos-service`: `com.curso.pedidos.PedidosServiceApplication` (▶️)
4. `gateway-service`: `com.curso.gateway.GatewayServiceApplication` (▶️)

### Opción 2: Desde la Terminal

Compilar todo el proyecto:
```powershell
.\mvnw.cmd clean package -DskipTests
```

Iniciar cada servicio en terminales separadas:
```powershell
# Terminal 1 - Auth Service (8081)
.\mvnw.cmd spring-boot:run -pl auth-service

# Terminal 2 - Cursos Service (8082)
.\mvnw.cmd spring-boot:run -pl cursos-service

# Terminal 3 - Pedidos Service (8083)
.\mvnw.cmd spring-boot:run -pl pedidos-service

# Terminal 4 - API Gateway (8080)
.\mvnw.cmd spring-boot:run -pl gateway-service
```

---

## 📮 Pruebas con Postman

Importa la colección oficial en Postman:
📂 [`postman/GestionCursos_Microservicios.postman_collection.json`](postman/GestionCursos_Microservicios.postman_collection.json)

> [!TIP]
> Puedes enviar todas las peticiones directamente a través del **Gateway** (`http://localhost:8080`) o apuntar a los puertos individuales (`8081`, `8082`, `8083`).

### Flujo de Prueba Rápido:
1. **Ver Catálogo**: `GET http://localhost:8080/api/cursos`
2. **Login Docente (2FA)**: `POST http://localhost:8080/api/auth/login` (ver código OTP generado en consola o respuesta)
3. **Verificar 2FA**: `POST http://localhost:8080/api/auth/verificar-2fa`
4. **Checkout (Matrícula)**: `POST http://localhost:8080/api/pedidos/checkout` (descuenta vacante en `cursos-service`)
5. **Confirmar Pago**: `PUT http://localhost:8080/api/pedidos/{pedidoId}/pagar` (emite boleta y despacha WhatsApp)
6. **Panel Estudiante**: `GET http://localhost:8080/api/pedidos/estudiante/{estudianteId}`
7. **Panel Docente**: `GET http://localhost:8080/api/pedidos/curso/{cursoId}/participantes`
