/**
 * CONFIG.DATA.TS - Configuración Global y Semilla Inicial en Angular TypeScript
 */
export interface CursoModel {
  id: string;
  titulo: string;
  descripcion: string;
  modalidad: 'VIRTUAL' | 'PRESENCIAL' | string;
  precio: number;
  horario: string;
  fechaInicio?: string;
  fechaFin?: string;
  aforoMaximo: number;
  aforoDisponible: number;
  enlaceClase?: string | null;
  direccionClase?: string | null;
  aula?: string | null;
  estado?: string;
  docenteId?: string;
  docente: string;
  imagen: string;
}

export const APP_CONFIG = {
  API_BASE_URL: (typeof window !== 'undefined' && window.location.port === '8080')
    ? `${window.location.origin}/api`
    : 'http://127.0.0.1:8080/api',
  AUTH_SERVICE_URL: 'http://127.0.0.1:8081/api/auth',
  CURSOS_SERVICE_URL: 'http://127.0.0.1:8082/api/cursos',
  PEDIDOS_SERVICE_URL: 'http://127.0.0.1:8083/api/pedidos',

  STORAGE_KEYS: {
    TOKEN: 'jwt_token_auth',
    USER: 'current_user_profile',
    CART: 'app_active_cart',
    RESERVATION_EXPIRY: 'reservation_timer_expiry',
    LAST_ORDER: 'last_successful_order'
  },

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
      imagen: 'assets/images/all-img/c4.png'
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
      imagen: 'assets/images/all-img/c5.png'
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
      imagen: 'assets/images/all-img/c6.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000007',
      titulo: 'Inteligencia Artificial & Machine Learning con Python',
      descripcion: 'Modelos predictivos, redes neuronales con PyTorch y TensorFlow, procesamiento de lenguaje natural y despliegue de modelos IA en producción.',
      modalidad: 'VIRTUAL',
      precio: 210.00,
      horario: 'Mar y Jue 19:00 - 22:00',
      fechaInicio: '2026-10-28T19:00:00Z',
      fechaFin: '2026-12-10T22:00:00Z',
      aforoMaximo: 30,
      aforoDisponible: 19,
      enlaceClase: 'https://meet.google.com/ia-ml-python',
      direccionClase: null,
      aula: null,
      docente: 'Ing. Roberto Docente',
      imagen: 'assets/images/all-img/c1.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000008',
      titulo: 'Desarrollo Mobile Multiplataforma con Flutter',
      descripcion: 'Creación de aplicaciones nativas para iOS y Android desde una única base de código con Dart, Flutter 3, Firebase y pasarelas móviles.',
      modalidad: 'VIRTUAL',
      precio: 175.00,
      horario: 'Lun, Mie y Vie 19:30 - 21:30',
      fechaInicio: '2026-11-02T19:30:00Z',
      fechaFin: '2026-12-14T21:30:00Z',
      aforoMaximo: 25,
      aforoDisponible: 14,
      enlaceClase: 'https://zoom.us/j/5544332211',
      direccionClase: null,
      aula: null,
      docente: 'Ing. Roberto Docente',
      imagen: 'assets/images/all-img/c2.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000009',
      titulo: 'Bases de Datos Avanzadas: PostgreSQL, MongoDB y Redis',
      descripcion: 'Diseño de esquemas de alto rendimiento, optimización de consultas SQL, indexación avanzada, replicación y caché distribuido en memoria.',
      modalidad: 'VIRTUAL',
      precio: 165.00,
      horario: 'Sab 15:00 - 19:00',
      fechaInicio: '2026-11-07T15:00:00Z',
      fechaFin: '2026-12-19T19:00:00Z',
      aforoMaximo: 25,
      aforoDisponible: 11,
      enlaceClase: 'https://meet.google.com/db-avanzadas-live',
      direccionClase: null,
      aula: null,
      docente: 'Ing. Roberto Docente',
      imagen: 'assets/images/all-img/c3.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000010',
      titulo: 'QA Automation & Testing Integral con Selenium y Postman',
      descripcion: 'Automatización de pruebas E2E, pruebas de regresión, testing de APIs REST, pruebas de carga con JMeter e integración en pipelines ágiles.',
      modalidad: 'VIRTUAL',
      precio: 155.00,
      horario: 'Mar y Jue 20:00 - 22:30',
      fechaInicio: '2026-11-05T20:00:00Z',
      fechaFin: '2026-12-17T22:30:00Z',
      aforoMaximo: 25,
      aforoDisponible: 18,
      enlaceClase: 'https://zoom.us/j/6677889900',
      direccionClase: null,
      aula: null,
      docente: 'Ing. Roberto Docente',
      imagen: 'assets/images/all-img/c4.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000011',
      titulo: 'Taller Presencial de Redes y Telecomunicaciones Cisco CCNA',
      descripcion: 'Configuración práctica con routers y switches reales en gabinete, subredes VLAN, enrutamiento OSPF y seguridad perimetral en laboratorio.',
      modalidad: 'PRESENCIAL',
      precio: 250.00,
      horario: 'Sab 14:00 - 18:30',
      fechaInicio: '2026-11-07T14:00:00Z',
      fechaFin: '2026-12-19T18:30:00Z',
      aforoMaximo: 18,
      aforoDisponible: 5,
      enlaceClase: null,
      direccionClase: 'Av. Universitaria 1234, Lima',
      aula: 'Laboratorio de Redes Cisco 105',
      docente: 'Ing. Carlos Mendoza',
      imagen: 'assets/images/all-img/c5.png'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000012',
      titulo: 'Desarrollo Backend con Node.js, Express y NestJS',
      descripcion: 'Construcción de APIs escalables con TypeScript, arquitectura limpia en NestJS, WebSockets en tiempo real y autenticación con JWT.',
      modalidad: 'VIRTUAL',
      precio: 170.00,
      horario: 'Lun y Mie 19:00 - 21:30',
      fechaInicio: '2026-11-09T19:00:00Z',
      fechaFin: '2026-12-21T21:30:00Z',
      aforoMaximo: 30,
      aforoDisponible: 21,
      enlaceClase: 'https://meet.google.com/node-nestjs-pro',
      direccionClase: null,
      aula: null,
      docente: 'Ing. Roberto Docente',
      imagen: 'assets/images/all-img/c6.png'
    }
  ] as CursoModel[]
};
