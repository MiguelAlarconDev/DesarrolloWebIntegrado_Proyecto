# Sistema de Gestión y Venta de Cursos Virtuales - Arquitectura de Microservicios

Arquitectura de **Microservicios** desarrollada en **Spring Boot 3**, **Spring Cloud Gateway** y **PostgreSQL** para la plataforma de gestión y venta de cursos virtuales.

---

## Arquitectura de microservicios

La POC está compuesta por servicios independientes que se comunican mediante API REST. Cada microservicio se ejecuta en un puerto diferente y posee una responsabilidad específica.

| Microservicio | Tecnología | Puerto | Responsabilidad |
|---|---|---:|---|
| gateway-service | Java y Spring Boot | 8080 | Punto de entrada de las solicitudes |
| auth-service | Java y Spring Boot | 8081 | Autenticación y gestión de usuarios |
| cursos-service | Java y Spring Boot | 8082 | Consulta y administración de cursos |
| pedidos-service | Java y Spring Boot | 8083 | Pedidos, matrículas y pagos con Mercado Pago |
| comprobantes-service | Python y FastAPI | 8084 | Generación de PDF y envío por correo |

## Requisitos

Para ejecutar la POC se necesita:

- Java 17 o superior.
- Maven 3.9 o superior.
- Python 3.11 o superior.
- PostgreSQL o una instancia de Supabase.
- Postman para las pruebas de los endpoints.
- Una cuenta de Mercado Pago con credenciales de prueba.
- Una cuenta SMTP para el envío de correos.

## Base de datos

Los microservicios Java utilizan PostgreSQL. Para las pruebas colaborativas se puede emplear una instancia compartida en Supabase.

Las credenciales deben configurarse mediante variables de entorno:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://servidor:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=usuario
SPRING_DATASOURCE_PASSWORD=contraseña

Las credenciales reales no deben almacenarse en el repositorio.

## Ejecución de los servicios Java

Cada microservicio debe iniciarse en una terminal independiente:

powershell
cd auth-service
mvn spring-boot:run


powershell
cd cursos-service
mvn spring-boot:run


powershell
cd pedidos-service
mvn spring-boot:run


powershell
cd gateway-service
mvn spring-boot:run

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
