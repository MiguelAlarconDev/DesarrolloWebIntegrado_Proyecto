import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { UUID_RE } from './aula.service';

export type Recomendacion = 'APTO' | 'NO_APTO' | 'SIN_DATOS_SUFICIENTES';
export type Decision = 'APROBADO' | 'NO_APROBADO' | 'REVOCADO';
export type EstadoCertificado = 'PENDIENTE' | 'EMITIDO' | 'FALLIDO';

export interface ResultadoRecomendacion {
  cursoId: string; estudianteId: string; totalTareas: number; tareasCalificadas: number; tareasPendientes: number;
  promedio: number | null; recomendacion: Recomendacion; notaMinima: number; explicacion: string;
}
export interface TareaEvidencia {
  tareaId: string; moduloId: string; tareaVersion: number; entregaId: string | null; entregaVersion: number | null;
  estado: string | null; nota: number | null; confirmada: boolean;
}
export interface Evidencia {
  evidencia: { politica: string; recomendacion: ResultadoRecomendacion; tareas: TareaEvidencia[] };
  evidenciaHash: string;
  revisionAcademica: number;
}
export interface RevisionDecision {
  id: string; aprobacionId: string; version: number; docenteId: string; decision: Decision; justificacion: string;
  fecha: string; evidenciaHash: string; revisionAcademica: number;
}
export interface EstadoDecision { revision: RevisionDecision; requiereRevision: boolean; habilitaCertificacion: boolean; }
export interface Pagina<T> { items: T[]; page: number; size: number; totalElements: number; totalPages: number; }

export interface Certificado {
  id: string; codigo: string; cursoId: string; cursoTitulo: string; estudianteId: string; estudianteNombre: string;
  estado: EstadoCertificado; fechaEmision: string; revisionAcademica: number; pdfSha256: string; tamanoBytes: number;
}
export interface AprobadoVigente {
  cursoId: string; cursoTitulo: string; estudianteId: string; estudianteNombre: string | null; decididoEn: string;
  revisionAcademica: number; certificadoId: string | null; certificadoCodigo: string | null; certificadoEstado: EstadoCertificado | null;
}
export interface EventoCertificado { evento: string; actor: string; detalle: string | null; fecha: string; }
export interface VerificacionCertificado {
  codigo: string; valido: boolean; estado: string; estudiante: string; cursoTitulo: string; fechaEmision: string; pdfSha256: string;
}

const BASE = '/cursos/certificados';

function nuevaClave(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Cliente de Fases 1-3. Reutiliza los endpoints del backend (sin duplicar reglas): la vigencia,
 * la matricula y los permisos los decide siempre cursos-service.
 * Las claves de idempotencia se conservan mientras una accion se reintenta y se descartan al terminar.
 */
@Injectable({ providedIn: 'root' })
export class CertificadosService {
  private api = inject(ApiService);
  private claves = new Map<string, string>();

  private aula(cursoId: string, estudianteId: string): string {
    if (!UUID_RE.test(cursoId) || !UUID_RE.test(estudianteId)) {
      throw Object.assign(new Error('Identificador no válido.'), { status: 404 });
    }
    return `/cursos/${cursoId}/aula`;
  }

  /** Misma clave para reintentos de la MISMA accion; se libera con terminar(). */
  claveDe(accion: string): string {
    let k = this.claves.get(accion);
    if (!k) { k = nuevaClave(); this.claves.set(accion, k); }
    return k;
  }
  terminar(accion: string): void { this.claves.delete(accion); }

  // -------- Docente (Fases 1 y 2) --------
  recomendacion(cursoId: string, estudianteId: string): Promise<ResultadoRecomendacion> {
    return this.api.request(`${this.aula(cursoId, estudianteId)}/recomendaciones/${estudianteId}`, { noCache: true });
  }
  evidencia(cursoId: string, estudianteId: string): Promise<Evidencia> {
    return this.api.request(`${this.aula(cursoId, estudianteId)}/aprobaciones/${estudianteId}/evidencia`, { noCache: true });
  }
  /** null si aun no hay decision (404 del backend). */
  async estado(cursoId: string, estudianteId: string): Promise<EstadoDecision | null> {
    try {
      return await this.api.request<EstadoDecision>(`${this.aula(cursoId, estudianteId)}/aprobaciones/${estudianteId}`, { noCache: true });
    } catch (err: any) {
      if (err?.status === 404) return null;
      throw err;
    }
  }
  historial(cursoId: string, estudianteId: string, page = 0, size = 20): Promise<Pagina<RevisionDecision>> {
    return this.api.request(`${this.aula(cursoId, estudianteId)}/aprobaciones/${estudianteId}/historial?page=${page}&size=${size}`,
      { noCache: true });
  }
  confirmar(cursoId: string, estudianteId: string, decision: 'APROBADO' | 'NO_APROBADO', justificacion: string,
            versionEsperada: number, evidenciaHash: string, clave: string): Promise<RevisionDecision> {
    return this.api.request(`${this.aula(cursoId, estudianteId)}/aprobaciones/${estudianteId}`, {
      method: 'POST', headers: { 'Idempotency-Key': clave }, body: { decision, justificacion, versionEsperada, evidenciaHash }
    });
  }
  revocar(cursoId: string, estudianteId: string, justificacion: string, versionEsperada: number,
          evidenciaHash: string, clave: string): Promise<RevisionDecision> {
    return this.api.request(`${this.aula(cursoId, estudianteId)}/aprobaciones/${estudianteId}/revocaciones`, {
      method: 'POST', headers: { 'Idempotency-Key': clave }, body: { justificacion, versionEsperada, evidenciaHash }
    });
  }

  // -------- Administrador (Fase 3) --------
  aprobados(page = 0, size = 20): Promise<Pagina<AprobadoVigente>> {
    return this.api.request(`${BASE}/admin/aprobados?page=${page}&size=${size}`, { noCache: true });
  }
  certificados(page = 0, size = 20): Promise<Pagina<Certificado>> {
    return this.api.request(`${BASE}/admin?page=${page}&size=${size}`, { noCache: true });
  }
  eventos(id: string): Promise<EventoCertificado[]> {
    return this.api.request(`${BASE}/admin/${id}/eventos`, { noCache: true });
  }
  emitir(cursoId: string, estudianteId: string, clave: string): Promise<Certificado> {
    return this.api.request(`${BASE}/admin/emisiones`, {
      method: 'POST', headers: { 'Idempotency-Key': clave }, body: { cursoId, estudianteId }, timeoutMs: 60000
    });
  }

  // -------- Estudiante / descarga --------
  mios(): Promise<Certificado[]> {
    return this.api.request(`${BASE}/mios`, { noCache: true });
  }
  async descargar(id: string): Promise<void> {
    if (!UUID_RE.test(id)) throw Object.assign(new Error('Certificado no válido.'), { status: 404 });
    const d = await this.api.request<{ url: string }>(`${BASE}/${id}/descarga`, { noCache: true });
    if (!d || typeof d.url !== 'string' || !/^https:\/\//i.test(d.url)) {
      throw Object.assign(new Error('No se pudo generar el enlace de descarga.'), { status: 503 });
    }
    window.location.assign(d.url);
  }

  // -------- Verificacion publica --------
  verificar(codigo: string): Promise<VerificacionCertificado> {
    const c = (codigo || '').trim().toUpperCase();
    if (!CODIGO_RE.test(c)) return Promise.reject(Object.assign(new Error('Código no válido.'), { status: 404 }));
    return this.api.request(`${BASE}/verificacion/${encodeURIComponent(c)}`, { noCache: true });
  }

  mensaje(err: any, contexto: 'docente' | 'admin' | 'estudiante'): string {
    const s = err?.status;
    if (s === 401) return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
    if (s === 403) {
      if (contexto === 'docente') return 'No tienes permiso sobre este curso o el estudiante no tiene matrícula pagada.';
      if (contexto === 'admin') return 'Solo un administrador puede gestionar certificados, y el estudiante debe tener matrícula pagada.';
      return 'No tienes acceso a este recurso.';
    }
    if (s === 404) return contexto === 'estudiante' ? 'Certificado no encontrado.' : 'El recurso no existe o no hay una decisión registrada.';
    if (s === 409) {
      if (contexto === 'docente') return 'La evidencia o la decisión cambió (tareas o calificaciones nuevas). Se recargaron los datos; revísalos antes de confirmar.';
      if (contexto === 'admin') return err?.message && !/^Http failure/i.test(err.message) ? err.message
        : 'No se puede emitir: la aprobación no está vigente, ya existe un certificado o hay una emisión en curso.';
    }
    if (s === 400) return err?.message || 'Datos no válidos.';
    if (s === 503) return 'Un servicio no está disponible (matrícula, usuarios o almacenamiento). Inténtalo nuevamente en unos minutos.';
    if (!s) return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    return 'Ocurrió un error inesperado. Inténtalo nuevamente.';
  }
}

export const CODIGO_RE = /^DWI-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

export function etiquetaRecomendacion(r: Recomendacion | string | null | undefined): string {
  return r === 'APTO' ? 'Apto' : r === 'NO_APTO' ? 'No apto' : r === 'SIN_DATOS_SUFICIENTES' ? 'Sin datos suficientes' : '-';
}
export function etiquetaDecision(d: Decision | string | null | undefined): string {
  return d === 'APROBADO' ? 'Aprobado' : d === 'NO_APROBADO' ? 'No aprobado' : d === 'REVOCADO' ? 'Revocada' : 'Sin decisión';
}
