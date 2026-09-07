# 🚀 Guía de Flujo de Trabajo en Git y GitHub para el Equipo

Este documento define la metodología oficial para colaborar eficientemente entre los **5 integrantes** sin pisarse el código ni generar conflictos en este proyecto de Microservicios Spring Boot.

---

## 👥 Asignación de Roles y Ramas

| Integrante | Módulo Asignado | Rama en GitHub | Responsabilidades |
| :--- | :--- | :--- | :--- |
| **Integrante 1** | gateway-service / Raíz | eature/gateway-service | Ruteo de peticiones, CORS, Maven pom.xml padre, despliegue. |
| **Integrante 2** | uth-service | eature/auth-service | Autenticación, JWT, roles (Admin/Docente/Estudiante), OTP 2FA. |
| **Integrante 3** | cursos-service | eature/cursos-service | Catálogo de cursos, aforos, docentes, enlaces Zoom/Meet. |
| **Integrante 4** | pedidos-service | eature/pedidos-service | Checkout, pasarela Mercado Pago, comprobantes, notificaciones WhatsApp. |
| **Integrante 5** | database/ y postman/ | eature/database-qa | Mantenimiento de scripts SQL (schema_local.sql), colección Postman, pruebas integrales. |

---

## 🌳 Arquitectura de Ramas

`	ext
main      <-- Versión estable / Producción (solo se actualiza para la entrega final)
  ↑
develop   <-- Rama de integración común (aquí se unen las ramas mediante Pull Request)
  ↑
feature/* <-- Ramas de trabajo de cada integrante
`

---

## 🔄 Flujo de Trabajo Diario (Paso a Paso)

### 1. Al comenzar el día: Sincronizar tu rama con develop
Abre la terminal en la raíz del proyecto:
`powershell
# Cambiarse a tu rama asignada (ejemplo: pedidos)
git checkout feature/pedidos-service

# Traer los últimos cambios que otros compañeros hayan unido a develop
git pull origin develop
`

---

### 2. Durante el desarrollo: Probar solo tu microservicio
Para compilar y verificar rápidamente sin tener que compilar todo el proyecto:
`powershell
# Reemplaza 'pedidos-service' por el módulo en el que trabajas:
.\mvnw.cmd clean compile -pl pedidos-service
`

---

### 3. Guardar tus cambios y subirlos a GitHub
Cuando tu avance compile y funcione:
`powershell
# Ver qué archivos modificaste
git status

# Agregar los cambios
git add .

# Crear el commit con un mensaje descriptivo
git commit -m "feat(pedidos): agregar validacion de stock en checkout"

# Subir a tu rama en GitHub
git push origin feature/pedidos-service
`

---

### 4. Abrir un Pull Request (PR) en GitHub
1. Entra al repositorio en GitHub: https://github.com/MiguelAlarconDev/DesarrolloWebIntegrado_Proyecto
2. Haz clic en **"Compare & pull request"**.
3. **IMPORTANTE:** Verifica que la rama destino sea ase: develop (NO a main).
4. Avisa a un compañero del equipo por WhatsApp/Discord para que revise y haga clic en **"Merge pull request"**.

---

## ⚠️ Reglas de Oro para Todo el Equipo

1. **NUNCA hacer git push directo a main o develop:** Todo cambio debe entrar a través de un Pull Request aprobado.
2. **Cuidado con las contraseñas de Base de Datos:**
   - La contraseña de PostgreSQL está configurada por defecto como variable de entorno o fallback.
   - Si tu PostgreSQL local tiene una clave diferente, usa el archivo pplication-local.properties (que ya está en .gitignore) o define la variable de entorno DB_PASSWORD. No subas tu contraseña personal en pplication.properties.
3. **Commits pequeños y continuos:** No esperes a tener 30 archivos modificados para hacer commit. Es mejor hacer commits pequeños al terminar cada función.
