/**
 * CONFIG.JS - Configuración Global y Endpoints de Microservicios
 */
const CONFIG = {
  // Enrutamiento de Microservicios a través del API Gateway
  API_BASE_URL: 'http://localhost:8080/api',
  AUTH_SERVICE_URL: 'http://localhost:8081/api/auth',
  CURSOS_SERVICE_URL: 'http://localhost:8082/api/cursos',
  PEDIDOS_SERVICE_URL: 'http://localhost:8083/api/pedidos',

  // Llaves de almacenamiento local (LocalStorage)
  STORAGE_KEYS: {
    TOKEN: 'jwt_token_auth',
    USER: 'current_user_profile',
    CART: 'app_active_cart',
    RESERVATION_EXPIRY: 'reservation_timer_expiry',
    LAST_ORDER: 'last_successful_order'
  },

  // Datos semilla sincronizados con database/schema_local.sql
  // Garantiza funcionamiento offline y resiliencia si los microservicios se están iniciando
  INITIAL_COURSES: [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      titulo: 'Desarrollo Web Integrado con Spring Boot y Microservicios',
      descripcion: 'Domina arquitecturas distribuidas, Spring Security, JWT, Docker y pasarelas de pago con Mercado Pago.',
      modalidad: 'VIRTUAL',
      precio: 150.00,
      horario: 'Lun y Mié 19:00 - 22:00',
      fechaInicio: '2026-10-15T19:00:00Z',
      fechaFin: '2026-11-20T22:00:00Z',
      aforoMaximo: 30,
      aforoDisponible: 4, // Pocas vacantes para probar la alerta
      enlaceClase: 'https://meet.google.com/abc-defg-hij',
      direccionClase: null,
      aula: null,
      docente: 'Ing. Roberto Silva (Docente Certificado)',
      imagen: 'assets/images/all-img/c1.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      titulo: 'Arquitectura Cloud en Java y AWS',
      descripcion: 'Aprende despliegue continuo, servicios administrados y escalabilidad con microservicios en la nube.',
      modalidad: 'VIRTUAL',
      precio: 180.00,
      horario: 'Mar y Jue 20:00 - 22:00',
      fechaInicio: '2026-10-18T20:00:00Z',
      fechaFin: '2026-11-25T22:00:00Z',
      aforoMaximo: 25,
      aforoDisponible: 12,
      enlaceClase: 'https://zoom.us/j/9876543210',
      direccionClase: null,
      aula: null,
      docente: 'Ing. Carlos Mendoza (AWS Solution Architect)',
      imagen: 'assets/images/all-img/c2.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      titulo: 'Taller Presencial de Java Avanzado y Spring Security',
      descripcion: 'Clase presencial 100% práctica en laboratorio físico con acompañamiento personalizado y aforo estricto de carpetas.',
      modalidad: 'PRESENCIAL',
      precio: 220.00,
      horario: 'Sábados 09:00 - 13:00',
      fechaInicio: '2026-10-20T09:00:00Z',
      fechaFin: '2026-11-28T13:00:00Z',
      aforoMaximo: 20,
      aforoDisponible: 2, // Alerta crítica de aforo
      enlaceClase: null,
      direccionClase: 'Av. Universitaria 1234, Pabellón B, Lima',
      aula: 'Laboratorio de Cómputo 204',
      docente: 'Mag. Daniel Paredes (Especialista en Seguridad)',
      imagen: 'assets/images/all-img/c3.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      titulo: 'Diplomado Presencial de Fullstack Web Developer',
      descripcion: 'Frontend moderno, React, Backend en Spring Boot y bases de datos relacionales con asignación física de puesto.',
      modalidad: 'PRESENCIAL',
      precio: 350.00,
      horario: 'Domingos 08:30 - 13:30',
      fechaInicio: '2026-10-25T08:30:00Z',
      fechaFin: '2026-12-15T13:30:00Z',
      aforoMaximo: 18,
      aforoDisponible: 0, // AFORO AGOTADO para probar bloqueo
      enlaceClase: null,
      direccionClase: 'Av. Arequipa 2650, San Isidro, Lima',
      aula: 'Aula Magna 301',
      docente: 'Lic. Mariana Rivas (Fullstack Lead)',
      imagen: 'assets/images/all-img/c4.png'
    }
  ]
};
