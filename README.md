# Sistema de Gestión y Venta de Cursos — Arquitectura de Microservicios

Plataforma para vender cursos presenciales y virtuales: catálogo con control de aforo, reserva de vacante por 15 minutos,
pago con Mercado Pago, comprobante con IGV y notificaciones por WhatsApp. Backend en **Spring Boot 3** + **Spring Cloud Gateway**,
**PostgreSQL**, servicios auxiliares en Python y Node, y frontend en **React + Vite**.

## Arquitectura

| Componente | Tecnología | Puerto | Responsabilidad | Público |
|---|---|---:|---|:-:|
| `frontend/` | React + Vite | 5173 | Interfaz para estudiantes, docentes y admin | Sí |
| `gateway-service` | Spring Cloud Gateway MVC | 8080 | Único punto de entrada; seguridad por capas | Sí |
| `auth-service` | Spring Boot | 8081 | Usuarios, JWT, 2FA por WhatsApp | No |
| `cursos-service` | Spring Boot | 8082 | Catálogo, aforos, datos de clase | No |
| `pedidos-service` | Spring Boot | 8083 | Checkout, Mercado Pago, comprobantes, expiración de reservas | No |
| `comprobantes-service` | Python + FastAPI | 8084 | PDF y envío por correo | No |
| `whatsapp-service` | Node + whatsapp-web.js | 8085 | Envío de códigos 2FA y avisos | No |

Seguridad: rate limit y bloqueo de IP, CORS por lista blanca, JWT, permisos por rol (público, estudiante, docente, admin),
clave interna entre servicios, bloqueo de cuenta y 2FA con límite de intentos. Detalle en [DEPLOY.md](DEPLOY.md#1-seguridad-por-niveles).

## Inicio rápido (todo con Docker)

```bash
cp .env.example .env            # complete JWT_SECRET e INTERNAL_API_KEY
docker compose up --build
```

- Frontend: http://localhost:8088 · API: http://localhost:8080
- Usuarios de prueba (contraseña `Clave1234`): `estudiante@cursos.com`, `docente@cursos.com` y `admin@cursos.com` (estos dos piden código 2FA).
- Sin WhatsApp vinculado, agregue `OTP_LOG_IF_WHATSAPP_DOWN=true` al `.env` para ver el código en `docker compose logs auth-service` (solo desarrollo).

## Desarrollo sin Docker

Requisitos: Java 17+, Maven 3.9+, Node 20+, Python 3.11+, PostgreSQL 16 (o Supabase).

```bash
# Base de datos local
psql -U postgres -c "create database cursos_db" && psql -U postgres -d cursos_db -f database/schema_local.sql

# Cada servicio en su terminal (las variables por defecto apuntan a localhost)
cd auth-service    && mvn spring-boot:run
cd cursos-service  && mvn spring-boot:run
cd pedidos-service && mvn spring-boot:run
cd gateway-service && mvn spring-boot:run
cd frontend        && npm install && npm run dev
```

Variables útiles en desarrollo: `SPRING_DATASOURCE_PASSWORD`, `MERCADOPAGO_ACCESS_TOKEN` (token `TEST-...`),
`OTP_LOG_IF_WHATSAPP_DOWN=true`. **Nunca** escriba credenciales en `application.properties`: todo va por variables de entorno.

Pruebas: `mvn verify` (gateway: capas de seguridad; auth: login, 2FA, bloqueos).

## Despliegue en servidores separados

Cada servicio tiene su `Dockerfile` y se configura solo por variables de entorno. Paso a paso, variables por servicio
y opciones por proveedor (Azure, Google Cloud, Render, Railway, AWS) en **[DEPLOY.md](DEPLOY.md)**.

---

## Comprobantes Service

`comprobantes-service` fue desarrollado con Python y FastAPI. Su responsabilidad es generar un comprobante en formato PDF y enviarlo al correo electrónico del estudiante.

### Configuración

Crear un archivo `.env` dentro de `comprobantes-service`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=correo_remitente@gmail.com
SMTP_PASSWORD=contraseña_de_aplicacion
SMTP_FROM=correo_remitente@gmail.com
PDF_OUTPUT_DIR=generated
```

El archivo `.env` contiene información privada y no debe subirse a GitHub.

### Instalación y ejecución

```powershell
cd comprobantes-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8084 --reload --env-file .env
```

Documentación interactiva de FastAPI:

```text
http://localhost:8084/docs
```

### Endpoints

#### Verificar el servicio

```http
GET http://localhost:8084/health
```

#### Generar y enviar un comprobante

```http
POST http://localhost:8084/api/comprobantes/enviar
Content-Type: application/json
```

Ejemplo del cuerpo:

```json
{
  "pedidoId": "e2be3beb-b7b0-4797-84de-283d0c806996",
  "codigoOrden": "ORD-PRUEBA-001",
  "estudiante": "Carlos Estudiante",
  "correo": "estudiante@cursos.com",
  "curso": "Desarrollo Web Integrado con Spring Boot",
  "monto": 150.00,
  "tipoComprobante": "BOLETA"
}
```

#### Descargar un comprobante

```http
GET http://localhost:8084/api/comprobantes/{pedidoId}/descargar
```

### Flujo probado

1. El estudiante inicia sesión.
2. Consulta los cursos publicados.
3. Crea un pedido.
4. Se genera una preferencia de pago en Mercado Pago.
5. El pedido cambia al estado correspondiente.
6. Se genera el comprobante PDF.
7. El comprobante se envía por correo electrónico.

Las peticiones pueden ejecutarse desde la colección compartida de Postman.

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
