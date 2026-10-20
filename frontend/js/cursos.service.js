/**
 * CURSOS.SERVICE.JS - Catálogo de Cursos, Filtros y Aforo en Tiempo Real
 * Sincronizado con PostgreSQL (cursos_db) a través del API Gateway
 */
const CursosService = {
  // Inicialización de la persistencia local de cursos como fallback
  initStorage() {
    if (!localStorage.getItem('app_cursos_cache')) {
      localStorage.setItem('app_cursos_cache', JSON.stringify(CONFIG.INITIAL_COURSES));
    }
  },

  /**
   * Enriquece los datos del curso provenientes de PostgreSQL
   * asignando imágenes de la plantilla Penn y nombre del docente
   */
  enrichCurso(curso, index = 0) {
    if (!curso) return null;
    const imgNumber = (index % 6) + 1;
    return {
      ...curso,
      id: curso.id,
      titulo: curso.titulo,
      descripcion: curso.descripcion || 'Curso de especialización profesional con certificación oficial.',
      modalidad: curso.modalidad || 'VIRTUAL',
      precio: Number(curso.precio || 0),
      horario: curso.horario || 'Horario flexible',
      fechaInicio: curso.fechaInicio,
      fechaFin: curso.fechaFin,
      aforoMaximo: Number(curso.aforoMaximo || 30),
      aforoDisponible: Number(curso.aforoDisponible !== undefined ? curso.aforoDisponible : 30),
      enlaceClase: curso.enlaceClase,
      direccionClase: curso.direccionClase,
      aula: curso.aula,
      imagen: curso.imagen || `assets/images/all-img/c${imgNumber}.png`,
      docente: curso.docente || (curso.modalidad === 'VIRTUAL' ? 'Ing. Roberto Docente' : 'Ing. Carlos Mendoza')
    };
  },

  /**
   * Obtiene la lista de cursos disponibles con su aforo actualizado desde la Base de Datos
   */
  async getCursos(modalidad = 'TODOS') {
    this.initStorage();
    try {
      console.log('[CursosService] Consultando catálogo de cursos en la base de datos...');
      let remote;
      try {
        remote = await API.request('/cursos');
      } catch (err) {
        console.warn('[CursosService] Falló vía Gateway 8080, intentando directo a cursos-service 8082...', err.message);
        remote = await API.request(CONFIG.CURSOS_SERVICE_URL);
      }
      if (Array.isArray(remote) && remote.length > 0) {
        console.log(`[CursosService] ¡Éxito! Se obtuvieron ${remote.length} cursos desde PostgreSQL.`);
        const enriched = remote.map((c, i) => this.enrichCurso(c, i));
        localStorage.setItem('app_cursos_cache', JSON.stringify(enriched));
        return this.filterByModalidad(enriched, modalidad);
      }
    } catch (err) {
      console.warn('[CursosService] Error consultando backend, usando caché local:', err.message);
    }

    const cached = JSON.parse(localStorage.getItem('app_cursos_cache') || '[]');
    const enrichedCached = cached.map((c, i) => this.enrichCurso(c, i));
    return this.filterByModalidad(enrichedCached, modalidad);
  },

  /**
   * Obtiene un curso específico por su UUID desde el backend o caché
   */
  async getCursoById(id) {
    this.initStorage();
    try {
      let remote;
      try {
        remote = await API.request(`/cursos/${id}`);
      } catch (err) {
        remote = await API.request(`${CONFIG.CURSOS_SERVICE_URL}/${id}`);
      }
      if (remote && remote.id) {
        return this.enrichCurso(remote);
      }
    } catch (_) {
      // Fallback
    }

    const cached = JSON.parse(localStorage.getItem('app_cursos_cache') || '[]');
    let found = cached.find(c => c.id === id);
    if (!found && typeof CONFIG !== 'undefined' && CONFIG.INITIAL_COURSES) {
      found = CONFIG.INITIAL_COURSES.find(c => c.id === id);
    }
    return found ? this.enrichCurso(found) : null;
  },

  /**
   * Filtra según modalidad VIRTUAL o PRESENCIAL
   */
  filterByModalidad(list, modalidad) {
    if (!modalidad || modalidad === 'TODOS') return list;
    return list.filter(c => c.modalidad && c.modalidad.toUpperCase() === modalidad.toUpperCase());
  },

  /**
   * Descuenta una vacante en tiempo real (evita sobreventa)
   */
  async descontarVacante(cursoId) {
    this.initStorage();
    // Intentar descontar en el backend (PostgreSQL)
    try {
      await API.request(`/cursos/${cursoId}/descontar-aforo`, { method: 'PUT' });
      console.log(`[CursosService] Vacante descontada en la base de datos para el curso ${cursoId}`);
    } catch (e) {
      console.warn('[CursosService] No se pudo descontar aforo en BD vía API:', e.message);
    }

    // Actualizar también en el almacenamiento local reactivo
    const cached = JSON.parse(localStorage.getItem('app_cursos_cache') || '[]');
    const curso = cached.find(c => c.id === cursoId);
    if (curso && curso.aforoDisponible > 0) {
      curso.aforoDisponible -= 1;
      localStorage.setItem('app_cursos_cache', JSON.stringify(cached));
      return curso.aforoDisponible;
    }
    return 0;
  }
};
