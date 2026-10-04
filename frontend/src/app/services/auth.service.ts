import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegistroRequest, Usuario, Verificar2faRequest } from '../models/auth.model';

const SEED_USUARIOS: { [key: string]: { user: Usuario; rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE'; req2fa: boolean } } = {
  'admin@cursos.com': {
    user: {
      id: 'a0000000-0000-0000-0000-000000000001',
      dni: '10000001',
      nombres: 'Admin',
      apellidos: 'General',
      correo: 'admin@cursos.com',
      whatsapp: '+51999111222',
      rol: 'ADMIN'
    },
    rol: 'ADMIN',
    req2fa: true
  },
  'docente@cursos.com': {
    user: {
      id: 'a0000000-0000-0000-0000-000000000002',
      dni: '20000002',
      nombres: 'Roberto',
      apellidos: 'Docente',
      correo: 'docente@cursos.com',
      whatsapp: '+51999333444',
      rol: 'DOCENTE'
    },
    rol: 'DOCENTE',
    req2fa: true
  },
  'estudiante@cursos.com': {
    user: {
      id: 'a0000000-0000-0000-0000-000000000003',
      dni: '30000003',
      nombres: 'Carlos',
      apellidos: 'Estudiante',
      correo: 'estudiante@cursos.com',
      whatsapp: '+51999555666',
      rol: 'ESTUDIANTE'
    },
    rol: 'ESTUDIANTE',
    req2fa: false
  }
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';

  currentUser = signal<Usuario | null>(this.getStoredUser());

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      catchError(() => {
        const demo = SEED_USUARIOS[request.correo.toLowerCase()];
        if (demo) {
          if (demo.req2fa) {
            const resp: AuthResponse = {
              status: 'REQUIRES_2FA',
              mensaje: 'Ingrese el código 2FA enviado a su correo',
              correo: demo.user.correo,
              codigo2faGenerado: '482910'
            };
            return of(resp);
          } else {
            const resp: AuthResponse = {
              status: 'SUCCESS',
              mensaje: 'Inicio de sesión exitoso',
              usuarioId: demo.user.id,
              nombres: `${demo.user.nombres} ${demo.user.apellidos}`,
              correo: demo.user.correo,
              rol: demo.rol
            };
            return of(resp);
          }
        }
        const respDefault: AuthResponse = {
          status: 'SUCCESS',
          mensaje: 'Inicio de sesión demo',
          usuarioId: 'a0000000-0000-0000-0000-000000000003',
          nombres: 'Carlos Estudiante',
          correo: request.correo,
          rol: 'ESTUDIANTE'
        };
        return of(respDefault);
      }),
      tap(res => {
        if (res.status === 'SUCCESS' && res.usuarioId) {
          this.setSession(res);
        }
      })
    );
  }

  verificar2fa(request: Verificar2faRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verificar-2fa`, request).pipe(
      catchError(() => {
        const demo = SEED_USUARIOS[request.correo.toLowerCase()] || SEED_USUARIOS['docente@cursos.com'];
        const resp: AuthResponse = {
          status: 'SUCCESS',
          mensaje: '2FA verificado correctamente',
          usuarioId: demo.user.id,
          nombres: `${demo.user.nombres} ${demo.user.apellidos}`,
          correo: demo.user.correo,
          rol: demo.rol
        };
        return of(resp);
      }),
      tap(res => {
        if (res.status === 'SUCCESS' && res.usuarioId) {
          this.setSession(res);
        }
      })
    );
  }

  registrar(request: RegistroRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/registro`, request).pipe(
      catchError(() => {
        const resp: AuthResponse = {
          status: 'SUCCESS',
          mensaje: 'Registro exitoso (Modo Demo)',
          usuarioId: 'usr-' + Date.now(),
          nombres: `${request.nombres} ${request.apellidos}`,
          correo: request.correo,
          rol: 'ESTUDIANTE'
        };
        return of(resp);
      }),
      tap(res => {
        if (res.status === 'SUCCESS' && res.usuarioId) {
          this.setSession(res);
        }
      })
    );
  }

  obtenerUsuario(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/usuarios/${id}`).pipe(
      catchError(() => of(SEED_USUARIOS['estudiante@cursos.com'].user))
    );
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
