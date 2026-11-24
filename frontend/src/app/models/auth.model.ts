export interface Usuario {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  correo: string;
  whatsapp: string;
  rol: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  is2faEnabled?: boolean;
}

export interface AuthResponse {
  mensaje: string;
  status: 'SUCCESS' | 'REQUIRES_2FA';
  usuarioId?: string;
  nombres?: string;
  correo?: string;
  rol?: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
  token?: string;
  codigo2faGenerado?: string;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface Verificar2faRequest {
  correo: string;
  codigo2fa: string;
}

export interface RegistroRequest {
  dni: string;
  nombres: string;
  apellidos: string;
  correo: string;
  whatsapp: string;
  password: string;
  rol?: 'ESTUDIANTE';
}
