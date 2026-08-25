# Sistema de Gestión y Venta de Cursos Virtuales - POC

Prueba de Concepto (POC) funcional desarrollada en **Spring Boot 3** y **PostgreSQL** para la plataforma de gestión y venta de cursos 100% virtuales.

---

## 🚀 Módulos y Funcionalidades

1. **Módulo de Seguridad (Auth & 2FA)**:
   - Registro de usuarios con DNI, WhatsApp, Nombres y Correo.
   - Roles de usuario: `ADMIN`, `DOCENTE`, `ESTUDIANTE`.
   - Doble Factor de Autenticación (2FA OTP) para roles `ADMIN` y `DOCENTE`.
2. **Módulo de Cursos Virtuales y Catálogo**:
   - Catálogo público de cursos disponibles, aforos, precios y horarios.
   - Enlaces directos a clases virtuales (Zoom / Google Meet).
   - Gestión de cursos por el Administrador y actualización de enlaces por el Docente.
3. **Módulo de Matrícula y Ventas**:
   - **Checkout**: Creación de orden de compra y reserva automática de vacante temporal.
   - **Confirmación de Pago**: Cambio de estado a `PAGADO`, emisión automática de **Comprobante fiscal en PDF** y despacho de **Notificación de WhatsApp** con el enlace de la clase.
   - **Cancelación**: Liberación inmediata de vacante (`+1` al aforo disponible).
4. **Portales por Rol**:
   - **Panel Estudiante**: Lista de cursos activos con acceso directo a los enlaces de clase.
   - **Panel Docente**: Lista en tiempo real de estudiantes matriculados y pagados.
   - **Panel Administrador**: Monitoreo general de todas las órdenes y aforos.

---

## 📋 Requisitos

- **Java 17** o superior
- **PostgreSQL 14+** (corriendo en `localhost:5432` con la base de datos `cursos_db`)
- **Postman** (para pruebas de API)

---

## 🗄️ Base de Datos

1. Crear la base de datos en PostgreSQL:
```sql
CREATE DATABASE cursos_db;
```
2. *(Opcional)* Ejecutar el script [`database/schema_local.sql`](database/schema_local.sql) para cargar datos de prueba iniciales (Admin, Docente, Estudiante y Cursos).

Credenciales por defecto en `src/main/resources/application.properties`:
- Usuario: `postgres`
- Contraseña: `postgres`
- Puerto: `5432`

---

## ▶️ Ejecutar el Proyecto

Desde tu IDE (IntelliJ IDEA, Eclipse o VS Code):
- Abrir `src/main/java/com/curso/pedidos/PedidosApplication.java` y hacer clic en el botón verde **Play (▶️)**.

O desde la terminal:
```powershell
.\mvnw.cmd spring-boot:run
```

Servidor corriendo en:
`http://localhost:8081`

---

## 📮 Pruebas con Postman

Importa la colección oficial en Postman:
📂 [`postman/GestionCursos_Local.postman_collection.json`](postman/GestionCursos_Local.postman_collection.json)

### Flujo de Prueba Rápido:
1. **Ver Catálogo**: `GET http://localhost:8081/api/cursos`
2. **Login Docente (2FA)**: `POST http://localhost:8081/api/auth/login` (ver código OTP en consola)
3. **Verificar 2FA**: `POST http://localhost:8081/api/auth/verificar-2fa`
4. **Checkout**: `POST http://localhost:8081/api/pedidos/checkout` (reserva vacante)
5. **Pagar**: `PUT http://localhost:8081/api/pedidos/{pedidoId}/pagar` (genera boleta y envía WhatsApp)
6. **Panel Estudiante**: `GET http://localhost:8081/api/pedidos/estudiante/{estudianteId}`
7. **Panel Docente**: `GET http://localhost:8081/api/pedidos/docente/{docenteId}/participantes`
