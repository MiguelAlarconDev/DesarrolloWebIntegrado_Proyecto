# Microservicio de Pedidos - POC Desarrollo Web Integrado

POC para la casuística de plataforma de venta de cursos.

## Funcionalidades
- Guarda pedidos/inscripciones en PostgreSQL usando JPA.
- Controla estados del pedido.
- Muestra una notificación en consola cada vez que cambia el estado.
- Expone endpoints REST para probar con Postman usando JSON.

## Requisitos
- Java 17 o superior
- Maven
- PostgreSQL
- Postman

## Base de datos
Crear en PostgreSQL:

```sql
CREATE DATABASE cursos_db;
```

Por defecto el proyecto usa:
- usuario: `postgres`
- contraseña: `postgres`
- puerto: `5432`

Si tu PostgreSQL usa otra contraseña, cambia `src/main/resources/application.properties`.

## Ejecutar

```bash
mvn spring-boot:run
```

Servidor:

`http://localhost:8081`

## Estados

Flujo principal:

`REGISTRADO -> PENDIENTE_PAGO -> PAGADO -> CONFIRMADO`

También se permite `CANCELADO` antes de quedar confirmado.

## Endpoints

### Crear pedido
POST `/api/pedidos`

```json
{
  "nombreEstudiante": "Miguel Alarcon",
  "correo": "miguel@gmail.com",
  "telefono": "999999999",
  "cursoId": 1,
  "nombreCurso": "Desarrollo Web con Spring Boot"
}
```

El estado inicial se asigna automáticamente como `REGISTRADO`.

### Listar pedidos
GET `/api/pedidos`

### Buscar pedido
GET `/api/pedidos/1`

### Cambiar estado
PUT `/api/pedidos/1/estado`

```json
{
  "estado": "PENDIENTE_PAGO"
}
```

Luego puede probar:

```json
{
  "estado": "PAGADO"
}
```

Y finalmente:

```json
{
  "estado": "CONFIRMADO"
}
```

La consola de Spring Boot mostrará mensajes como:

```text
[NOTIFICACION] Pedido 1 cambió de PENDIENTE_PAGO a PAGADO
```
