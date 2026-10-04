import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrearCursoRequest, Curso } from '../models/curso.model';

@Injectable({
  providedIn: 'root'
})
export class CursoService {
  private apiUrl = 'http://localhost:8080/api/cursos';

  constructor(private http: HttpClient) {}

  listarPublicos(): Observable<Curso[]> {
    return this.http.get<Curso[]>(this.apiUrl);
  }

  listarTodos(): Observable<Curso[]> {
    return this.http.get<Curso[]>(`${this.apiUrl}/todos`);
  }

  buscarPorId(id: string): Observable<Curso> {
    return this.http.get<Curso>(`${this.apiUrl}/${id}`);
  }

  listarPorDocente(docenteId: string): Observable<Curso[]> {
    return this.http.get<Curso[]>(`${this.apiUrl}/docente/${docenteId}`);
  }

  crear(request: CrearCursoRequest): Observable<Curso> {
    return this.http.post<Curso>(this.apiUrl, request);
  }

  actualizar(id: string, request: CrearCursoRequest): Observable<Curso> {
    return this.http.put<Curso>(`${this.apiUrl}/${id}`, request);
  }

  actualizarEnlace(id: string, enlaceClase: string): Observable<Curso> {
    return this.http.put<Curso>(`${this.apiUrl}/${id}/enlace`, { enlaceClase });
  }

  cambiarEstado(id: string, estado: string): Observable<Curso> {
    return this.http.put<Curso>(`${this.apiUrl}/${id}/estado?estado=${estado}`, {});
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
