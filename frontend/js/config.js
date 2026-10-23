/**
 * CONFIG.JS - Configuración Global y Endpoints de Microservicios
 */
const CONFIG = {
  // Enrutamiento de Microservicios a través del API Gateway
  API_BASE_URL: (typeof window !== 'undefined' && window.location.port === '8080')
    ? `${window.location.origin}/api`
    : 'http://localhost:8080/api',
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

  // Datos semilla sincronizados al 100% con database/schema_local.sql y PostgreSQL
  INITIAL_COURSES: [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      titulo: 'Desarrollo Web Integrado con Spring Boot',
      descripcion: 'Aprende microservicios y arquitectura en Java con Spring Boot, Spring Security y pasarelas de pago.',
      modalidad: 'VIRTUAL',
      precio: 150.00,
      horario: 'Lun y Mie 19:00 - 22:00',
      fechaInicio: '2026-10-15T19:00:00Z',
      fechaFin: '2026-11-20T22:00:00Z',
      aforoMaximo: 30,
      aforoDisponible: 8,
      enlaceClase: 'https://meet.google.com/abc-defg-hij',
      direccionClase: null,
      aula: null,
      docente: 'Ing. Roberto Docente',
      imagen: 'assets/images/all-img/c1.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      titulo: 'Arquitectura Cloud en Java',
      descripcion: 'Fundamentos de servicios distribuidos, contenedores Docker y escalabilidad en la nube.',
      modalidad: 'VIRTUAL',
      precio: 180.00,
      horario: 'Mar y Jue 20:00 - 22:00',
      fechaInicio: '2026-10-18T20:00:00Z',
      fechaFin: '2026-11-25T22:00:00Z',
      aforoMaximo: 25,
      aforoDisponible: 17,
      enlaceClase: 'https://zoom.us/j/9876543210',
      direccionClase: null,
      aula: null,
      docente: 'Ing. Roberto Docente',
      imagen: 'assets/images/all-img/c2.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      titulo: 'Taller Presencial de Java y Microservicios',
      descripcion: 'Práctica en laboratorio físico con acompañamiento del docente y aforo estricto de carpetas.',
      modalidad: 'PRESENCIAL',
      precio: 220.00,
      horario: 'Sab 09:00 - 13:00',
      fechaInicio: '2026-10-20T09:00:00Z',
      fechaFin: '2026-11-28T13:00:00Z',
      aforoMaximo: 20,
      aforoDisponible: 9,
      enlaceClase: null,
      direccionClase: 'Av. Universitaria 1234, Lima',
      aula: 'Laboratorio 204',
      docente: 'Ing. Carlos Mendoza',
      imagen: 'assets/images/all-img/c3.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      titulo: 'DevOps, Docker & Kubernetes para Desarrolladores',
      descripcion: 'Implementación de CI/CD pipelines, contenedores Docker, despliegue en clústeres Kubernetes y monitoreo continuo.',
      modalidad: 'VIRTUAL',
      precio: 190.00,
      horario: 'Vie 19:00 - 22:00 y Sáb 15:00 - 18:00',
      fechaInicio: '2026-10-24T19:00:00Z',
      fechaFin: '2026-11-30T22:00:00Z',
      aforoMaximo: 25,
      aforoDisponible: 12,
      enlaceClase: 'https://meet.google.com/devops-k8s-live',
      direccionClase: null,
      aula: null,
      docente: 'Ing. Roberto Docente',
      imagen: 'assets/images/all-img/c1.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000005',
      titulo: 'Frontend Moderno con React, Next.js y TypeScript',
      descripcion: 'Desarrollo de interfaces reactivas, renderizado del lado del servidor (SSR), gestión de estado global e integración con APIs REST.',
      modalidad: 'VIRTUAL',
      precio: 160.00,
      horario: 'Lun y Mie 20:00 - 22:30',
      fechaInicio: '2026-10-25T20:00:00Z',
      fechaFin: '2026-12-05T22:30:00Z',
      aforoMaximo: 30,
      aforoDisponible: 15,
      enlaceClase: 'https://zoom.us/j/1234567890',
      direccionClase: null,
      aula: null,
      docente: 'Ing. Roberto Docente',
      imagen: 'assets/images/all-img/c2.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000006',
      titulo: 'Taller Presencial de Ciberseguridad y Ethical Hacking',
      descripcion: 'Prácticas intensivas en laboratorio físico sobre pentesting, seguridad ofensiva, análisis forense y protección de infraestructuras críticas.',
      modalidad: 'PRESENCIAL',
      precio: 240.00,
      horario: 'Dom 09:00 - 14:00',
      fechaInicio: '2026-10-26T09:00:00Z',
      fechaFin: '2026-12-07T14:00:00Z',
      aforoMaximo: 20,
      aforoDisponible: 6,
      enlaceClase: null,
      direccionClase: 'Av. Universitaria 1234, Lima',
      aula: 'Laboratorio de Ciberseguridad 301',
      docente: 'Ing. Carlos Mendoza',
      imagen: 'assets/images/all-img/c3.png'
    }
  ]
};
