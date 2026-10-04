import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { CrearCursoRequest, Curso } from '../models/curso.model';

const SEED_CURSOS: Curso[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    titulo: 'Desarrollo Web Integrado con Spring Boot',
    descripcion: 'Aprende microservicios y arquitectura en Java con Spring Cloud Gateway, JPA y PostgreSQL.',
    docenteId: 'a0000000-0000-0000-0000-000000000002',
    docenteNombre: 'Roberto Docente',
    fechaInicio: '2026-10-15T19:00:00Z',
    fechaFin: '2026-11-20T22:00:00Z',
    horario: 'Lun y Mié 19:00 - 22:00',
    modalidad: 'VIRTUAL',
    aforoMaximo: 30,
    aforoDisponible: 24,
    precio: 150.00,
    enlaceClase: 'https://meet.google.com/abc-defg-hij',
    estado: 'PUBLICADO'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    titulo: 'Arquitectura Cloud en Java y Microservicios',
    descripcion: 'Fundamentos de servicios distribuidos, contenedores Docker y pasarelas de pago con Mercado Pago.',
    docenteId: 'a0000000-0000-0000-0000-000000000002',
    docenteNombre: 'Roberto Docente',
    fechaInicio: '2026-10-18T20:00:00Z',
    fechaFin: '2026-11-25T22:00:00Z',
    horario: 'Mar y Jue 20:00 - 22:00',
    modalidad: 'VIRTUAL',
    aforoMaximo: 25,
    aforoDisponible: 18,
    precio: 180.00,
    enlaceClase: 'https://zoom.us/j/9876543210',
    estado: 'PUBLICADO'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    titulo: 'Taller Presencial de Java Avanzado y Microservicios',
    descripcion: 'Práctica intensiva en laboratorio de cómputo con acompañamiento directo del docente y proyectos reales.',
    docenteId: 'a0000000-0000-0000-0000-000000000002',
    docenteNombre: 'Roberto Docente',
    fechaInicio: '2026-10-20T09:00:00Z',
    fechaFin: '2026-11-28T13:00:00Z',
    horario: 'Sáb 09:00 - 13:00',
    modalidad: 'PRESENCIAL',
    aforoMaximo: 20,
    aforoDisponible: 5,
    precio: 220.00,
    direccionClase: 'Av. Universitaria 1234, Lima',
    aula: 'Laboratorio 204',
    estado: 'PUBLICADO'
  }
];

@Injectable({
  providedIn: 'root'
})
export class CursoService {
  private apiUrl = 'http://localhost:8080/api/cursos';

  constructor(private http: HttpClient) {}

  listarPublicos(): Observable<Curso[]> {
    return this.http.get<Curso[]>(this.apiUrl).pipe(
      catchError(() => of(SEED_CURSOS))
    );
  }

  listarTodos(): Observable<Curso[]> {
    return this.http.get<Curso[]>(`${this.apiUrl}/todos`).pipe(
      catchError(() => of(SEED_CURSOS))
    );
  }

  buscarPorId(id: string): Observable<Curso> {
    return this.http.get<Curso>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => {
        const encontrado = SEED_CURSOS.find(c => c.id === id);
        return of(encontrado || SEED_CURSOS[0]);
      })
    );
  }

  listarPorDocente(docenteId: string): Observable<Curso[]> {
    return this.http.get<Curso[]>(`${this.apiUrl}/docente/${docenteId}`).pipe(
      catchError(() => of(SEED_CURSOS.slice(0, 2)))
    );
  }

  crear(request: CrearCursoRequest): Observable<Curso> {
    return this.http.post<Curso>(this.apiUrl, request).pipe(
      catchError(() => {
        const nuevo: Curso = {
          id: 'curso-' + Date.now(),
          ...request,
          aforoDisponible: request.aforoMaximo,
          estado: 'PUBLICADO'
        };
        return of(nuevo);
      })
    );
  }

  actualizar(id: string, request: CrearCursoRequest): Observable<Curso> {
    return this.http.put<Curso>(`${this.apiUrl}/${id}`, request).pipe(
      catchError(() => {
        const act: Curso = {
          id,
          ...request,
          aforoDisponible: request.aforoMaximo,
          estado: 'PUBLICADO'
        };
        return of(act);
      })
    );
  }

  actualizarEnlace(id: string, enlaceClase: string): Observable<Curso> {
    return this.http.put<Curso>(`${this.apiUrl}/${id}/enlace`, { enlaceClase }).pipe(
      catchError(() => of({ ...SEED_CURSOS[0], enlaceClase }))
    );
  }

  cambiarEstado(id: string, estado: string): Observable<Curso> {
    return this.http.put<Curso>(`${this.apiUrl}/${id}/estado?estado=${estado}`, {}).pipe(
      catchError(() => of({ ...SEED_CURSOS[0], estado: estado as 'PUBLICADO' | 'BORRADOR' | 'FINALIZADO' }))
    );
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(() => of(undefined))
    );
  }
}
