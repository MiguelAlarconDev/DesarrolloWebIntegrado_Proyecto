import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegistroRequest, Usuario, Verificar2faRequest } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';

  currentUser = signal<Usuario | null>(this.getStoredUser());

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap(res => {
        if (res.status === 'SUCCESS' && res.usuarioId) {
          this.setSession(res);
        }
      })
    );
  }

  verificar2fa(request: Verificar2faRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verificar-2fa`, request).pipe(
      tap(res => {
        if (res.status === 'SUCCESS' && res.usuarioId) {
          this.setSession(res);
        }
      })
    );
  }

  registrar(request: RegistroRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/registro`, request).pipe(
      tap(res => {
        if (res.status === 'SUCCESS' && res.usuarioId) {
          this.setSession(res);
        }
      })
    );
  }

  obtenerUsuario(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/usuarios/${id}`);
  }

  logout(): void {
    localStorage.removeItem('user_session');
    this.currentUser.set(null);
  }

  private setSession(res: AuthResponse): void {
    const user: Usuario = {
      id: res.usuarioId!,
      dni: '',
      nombres: res.nombres ? res.nombres.split(' ')[0] : 'Usuario',
      apellidos: res.nombres ? res.nombres.split(' ').slice(1).join(' ') : '',
      correo: res.correo || '',
      whatsapp: '',
      rol: res.rol || 'ESTUDIANTE'
    };
    localStorage.setItem('user_session', JSON.stringify(user));
    this.currentUser.set(user);
  }

  private getStoredUser(): Usuario | null {
    const saved = localStorage.getItem('user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  }
}
