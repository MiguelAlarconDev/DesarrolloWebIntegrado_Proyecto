import { Injectable, inject } from '@angular/core';
import { APP_CONFIG, CursoModel } from './config.data';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class CursoService {
  private api = inject(ApiService);
  private memCache: CursoModel[] | null = null;

  clearCache(): void {
    this.memCache = null;
    this.api.clearCache();
  }

  getCachedCursos(modalidad = 'TODOS'): CursoModel[] {
    let cursos = this.memCache;
    if (!cursos || cursos.length === 0) {
      try {
        const raw = localStorage.getItem('app_cursos_cache');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cursos = this.normalizeCursos(parsed);
            this.memCache = cursos;
          }
        }
      } catch (_) {}
    }
    if (!cursos || cursos.length === 0) {
      cursos = [...APP_CONFIG.INITIAL_COURSES];
    }
    return this.filterByModalidad(cursos, modalidad);
  }

  async getCursos(modalidad = 'TODOS'): Promise<CursoModel[]> {
    let cursos: CursoModel[] = [];
    try {
      const data = await this.api.request<any[]>('/cursos');
      if (Array.isArray(data) && data.length > 0) {
        cursos = this.normalizeCursos(data);
        this.memCache = cursos;
        localStorage.setItem('app_cursos_cache', JSON.stringify(cursos));
      } else {
        cursos = this.getCachedCursos('TODOS');
      }
    } catch (error: any) {
      console.warn('[CursoService] Usando catálogo en caché local:', error?.message);
      cursos = this.getCachedCursos('TODOS');
    }

    return this.filterByModalidad(cursos, modalidad);
  }

  async getCursoById(id: string): Promise<CursoModel> {
    try {
      const data = await this.api.request<any>(`/cursos/${id}`);
      if (data && data.id) {
        return this.normalizeSingleCurso(data, 0);
      }
    } catch (_) {
      console.warn(`[CursoService] Buscando curso ${id} en caché local.`);
    }

    const cached = this.getCachedCursos('TODOS');
    return cached.find(c => c.id === id) || APP_CONFIG.INITIAL_COURSES.find(c => c.id === id) || APP_CONFIG.INITIAL_COURSES[0];
  }

  filterByModalidad(cursos: CursoModel[], modalidad: string): CursoModel[] {
    if (!modalidad || modalidad === 'TODOS') return cursos;
    return cursos.filter(c => c.modalidad && c.modalidad.toUpperCase() === modalidad.toUpperCase());
  }

  async descontarAforo(cursoId: string): Promise<any> {
    this.clearCache();
    try {
      return await this.api.request(`/cursos/${cursoId}/descontar-aforo`, { method: 'PUT' });
    } catch (_) {
      const cached: CursoModel[] = JSON.parse(localStorage.getItem('app_cursos_cache') || 'null') || [...APP_CONFIG.INITIAL_COURSES];
      const idx = cached.findIndex(c => c.id === cursoId);
      if (idx !== -1 && cached[idx].aforoDisponible > 0) {
        cached[idx].aforoDisponible -= 1;
        localStorage.setItem('app_cursos_cache', JSON.stringify(cached));
      }
      return cached[idx];
    }
  }

  async liberarAforo(cursoId: string): Promise<any> {
    this.clearCache();
    try {
      return await this.api.request(`/cursos/${cursoId}/liberar-aforo`, { method: 'PUT' });
    } catch (_) {
      const cached: CursoModel[] = JSON.parse(localStorage.getItem('app_cursos_cache') || 'null') || [...APP_CONFIG.INITIAL_COURSES];
      const idx = cached.findIndex(c => c.id === cursoId);
      if (idx !== -1 && cached[idx].aforoDisponible < cached[idx].aforoMaximo) {
        cached[idx].aforoDisponible += 1;
        localStorage.setItem('app_cursos_cache', JSON.stringify(cached));
      }
      return cached[idx];
    }
  }

  async obtenerTodosAdmin(): Promise<CursoModel[]> {
    try {
      const data = await this.api.request<any[]>('/cursos/todos');
      return Array.isArray(data) ? this.normalizeCursos(data) : [];
    } catch (_) {
      return this.getCursos('TODOS');
    }
  }

  async obtenerCursosDocente(docenteId: string): Promise<CursoModel[]> {
    try {
      const data = await this.api.request<any[]>(`/cursos/docente/${docenteId}`);
      if (Array.isArray(data) && data.length > 0) {
        return this.normalizeCursos(data);
      }
    } catch (_) {}
    const todos = await this.getCursos('TODOS');
    const filtrados = todos.filter(c => c.docenteId === docenteId || c.docenteId === 'a0000000-0000-0000-0000-000000000002');
    return filtrados.length > 0 ? filtrados : todos;
  }

  async crearCurso(payload: any): Promise<any> {
    this.clearCache();
    return this.api.request('/cursos', {
      method: 'POST',
      body: payload
    });
  }

  async actualizarEnlace(cursoId: string, enlaceClase: string): Promise<any> {
    this.clearCache();
    return this.api.request(`/cursos/${cursoId}/enlace`, {
      method: 'PUT',
      body: { enlaceClase }
    });
  }

  async actualizarDatosClase(cursoId: string, datos: { modalidad?: string; direccionClase?: string; aula?: string; enlaceClase?: string }): Promise<any> {
    this.clearCache();
    return this.api.request(`/cursos/${cursoId}/datos-clase`, {
      method: 'PUT',
      body: datos
    });
  }

  async cambiarEstado(cursoId: string, nuevoEstado: string): Promise<any> {
    this.clearCache();
    return this.api.request(`/cursos/${cursoId}/estado?estado=${nuevoEstado}`, {
      method: 'PUT'
    });
  }

  private normalizeCursos(list: any[]): CursoModel[] {
    return list.map((item, index) => this.normalizeSingleCurso(item, index));
  }

  private normalizeSingleCurso(item: any, index = 0): CursoModel {
    const images = [
      'assets/images/all-img/c1.png',
      'assets/images/all-img/c2.png',
      'assets/images/all-img/c3.png',
      'assets/images/all-img/c4.png',
      'assets/images/all-img/c5.png',
      'assets/images/all-img/c6.png'
    ];
    const seedMatch = APP_CONFIG.INITIAL_COURSES.find(c => c.id === item.id || c.titulo === item.titulo);

    return {
      id: item.id,
      titulo: item.titulo || 'Curso Especializado',
      descripcion: item.descripcion || 'Formación práctica con certificación oficial.',
      modalidad: item.modalidad || 'VIRTUAL',
      precio: Number(item.precio || 150.00),
      horario: item.horario || 'Horario flexible',
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      aforoMaximo: item.aforoMaximo !== undefined ? item.aforoMaximo : 30,
      aforoDisponible: item.aforoDisponible !== undefined ? item.aforoDisponible : 15,
      enlaceClase: item.enlaceClase || (seedMatch ? seedMatch.enlaceClase : 'https://meet.google.com/abc-defg-hij'),
      direccionClase: item.direccionClase || (seedMatch ? seedMatch.direccionClase : 'Av. Universitaria 1234, Lima'),
      aula: item.aula || (seedMatch ? seedMatch.aula : 'Laboratorio 204'),
      estado: item.estado || 'PUBLICADO',
      docenteId: item.docenteId,
      docente: item.docente || (seedMatch ? seedMatch.docente : 'Docente Especialista'),
      imagen: item.imagen || (seedMatch ? seedMatch.imagen : images[index % images.length])
    };
  }
}
