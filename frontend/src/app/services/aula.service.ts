import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export type TipoMaterial = 'PDF' | 'DOCX' | 'PPTX' | 'ZIP';

export interface MaterialAula {
  id: string;
  titulo: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  tipo: TipoMaterial;
  publicadoEn: string;
}

export interface ModuloAula {
  id: string;
  titulo: string;
  orden: number;
  materiales: MaterialAula[];
}

interface DescargaAula {
  url: string;
  expiraEn: string;
  nombreArchivo: string;
}

export const AULA_MAX_BYTES = 10 * 1024 * 1024; // 10 MiB, igual que el backend
export const AULA_EXTENSIONES = ['pdf', 'docx', 'pptx', 'zip'];
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Cliente del aula virtual. La autorizacion la decide SIEMPRE el backend (JWT + matricula);
 * aqui no se cachean permisos ni se usa sessionStorage.
 */
@Injectable({ providedIn: 'root' })
export class AulaService {
  private api = inject(ApiService);

  private base(cursoId: string): string {
    if (!UUID_RE.test(cursoId)) {
      throw Object.assign(new Error('Curso no válido.'), { status: 404 });
    }
    return `/cursos/${cursoId}/aula`;
  }

  listar(cursoId: string): Promise<ModuloAula[]> {
    return this.api.request<ModuloAula[]>(this.base(cursoId), { noCache: true });
  }

  crearModulo(cursoId: string, titulo: string, orden: number): Promise<ModuloAula> {
    return this.api.request<ModuloAula>(`${this.base(cursoId)}/modulos`, { method: 'POST', body: { titulo, orden } });
  }

  editarModulo(cursoId: string, moduloId: string, titulo: string, orden: number): Promise<void> {
    return this.api.request<void>(`${this.base(cursoId)}/modulos/${moduloId}`, { method: 'PATCH', body: { titulo, orden } });
  }

  subirMaterial(cursoId: string, moduloId: string, archivo: File, titulo?: string): Promise<MaterialAula> {
    const form = new FormData();
    form.append('archivo', archivo, archivo.name);
    if (titulo && titulo.trim()) {
      form.append('titulo', titulo.trim());
    }
    return this.api.request<MaterialAula>(`${this.base(cursoId)}/modulos/${moduloId}/materiales`,
      { method: 'POST', body: form, timeoutMs: 120000 });
  }

  eliminarMaterial(cursoId: string, moduloId: string, materialId: string): Promise<void> {
    return this.api.request<void>(`${this.base(cursoId)}/modulos/${moduloId}/materiales/${materialId}`, { method: 'DELETE' });
  }

  /** Pide una URL firmada (60 s) y la abre de inmediato; la URL no se guarda en ningun sitio. */
  async descargar(cursoId: string, moduloId: string, materialId: string): Promise<void> {
    const d = await this.api.request<DescargaAula>(
      `${this.base(cursoId)}/modulos/${moduloId}/materiales/${materialId}/descarga`, { noCache: true });
    if (!d || typeof d.url !== 'string' || !/^https:\/\//i.test(d.url)) {
      throw Object.assign(new Error('No se pudo generar el enlace de descarga.'), { status: 503 });
    }
    window.location.assign(d.url);
  }

  /** Validacion previa solo para dar feedback rapido; el backend vuelve a validar todo. */
  validarArchivoLocal(archivo: File | null | undefined): string | null {
    if (!archivo) return 'Selecciona un archivo.';
    const ext = (archivo.name.split('.').pop() || '').toLowerCase();
    if (!AULA_EXTENSIONES.includes(ext)) return 'Formato no permitido. Usa PDF, DOCX, PPTX o ZIP.';
    if (archivo.size === 0) return 'El archivo está vacío.';
    if (archivo.size > AULA_MAX_BYTES) return 'El archivo supera el máximo de 10 MB.';
    return null;
  }

  // ---------------- Tareas (E.2) ----------------

  private tareasBase(cursoId: string, moduloId: string): string {
    if (!UUID_RE.test(moduloId)) {
      throw Object.assign(new Error('Módulo no válido.'), { status: 404 });
    }
    return `${this.base(cursoId)}/modulos/${moduloId}/tareas`;
  }

  listarTareas(cursoId: string, moduloId: string): Promise<TareaAula[]> {
    return this.api.request<TareaAula[]>(this.tareasBase(cursoId, moduloId), { noCache: true });
  }

  crearTarea(cursoId: string, moduloId: string, datos: TareaDatos): Promise<TareaAula> {
    return this.api.request<TareaAula>(this.tareasBase(cursoId, moduloId), { method: 'POST', body: datos });
  }

  /** PATCH con los cuatro campos y la version vigente (control de concurrencia del backend). */
  editarTarea(cursoId: string, moduloId: string, tareaId: string, datos: TareaDatos, version: number): Promise<TareaAula> {
    return this.api.request<TareaAula>(`${this.tareasBase(cursoId, moduloId)}/${tareaId}`,
      { method: 'PATCH', body: { ...datos, version } });
  }

  eliminarTarea(cursoId: string, moduloId: string, tareaId: string, version: number): Promise<void> {
    return this.api.request<void>(`${this.tareasBase(cursoId, moduloId)}/${tareaId}?version=${encodeURIComponent(version)}`,
      { method: 'DELETE' });
  }

  // ---------------- Entrega propia del alumno (E.3) ----------------

  /** Devuelve null si el alumno aun no entrego (404 del backend). */
  async miEntrega(cursoId: string, moduloId: string, tareaId: string): Promise<EntregaAula | null> {
    try {
      return await this.api.request<EntregaAula>(`${this.tareasBase(cursoId, moduloId)}/${tareaId}/mi-entrega`, { noCache: true });
    } catch (err: any) {
      if (err?.status === 404) return null;
      throw err;
    }
  }

  /**
   * Entrega o reemplazo COMPLETO: lo omitido no se conserva. version = -1 para la primera entrega;
   * para reemplazar, la version devuelta por miEntrega().
   */
  entregar(cursoId: string, moduloId: string, tareaId: string, version: number,
           texto: string | null, archivo: File | null): Promise<EntregaAula> {
    const form = new FormData();
    form.append('version', String(version));
    if (texto !== null && texto.trim()) form.append('texto', texto);
    if (archivo) form.append('archivo', archivo, archivo.name);
    return this.api.request<EntregaAula>(`${this.tareasBase(cursoId, moduloId)}/${tareaId}/mi-entrega`,
      { method: 'POST', body: form, timeoutMs: 120000 });
  }

  async descargarMiArchivo(cursoId: string, moduloId: string, tareaId: string): Promise<void> {
    await this.abrirDescarga(`${this.tareasBase(cursoId, moduloId)}/${tareaId}/mi-entrega/archivo/descarga`);
  }

  // ---------------- Revision docente (E.4) ----------------

  listarEntregas(cursoId: string, moduloId: string, tareaId: string, page: number, size: number): Promise<PaginaEntregas> {
    return this.api.request<PaginaEntregas>(
      `${this.tareasBase(cursoId, moduloId)}/${tareaId}/entregas?page=${page}&size=${size}`, { noCache: true });
  }

  calificar(cursoId: string, moduloId: string, tareaId: string, entregaId: string,
            nota: number, retroalimentacion: string, version: number): Promise<EntregaAula> {
    return this.api.request<EntregaAula>(`${this.tareasBase(cursoId, moduloId)}/${tareaId}/entregas/${entregaId}/calificacion`,
      { method: 'PUT', body: { nota, retroalimentacion, version } });
  }

  async descargarArchivoEntrega(cursoId: string, moduloId: string, tareaId: string, entregaId: string): Promise<void> {
    await this.abrirDescarga(`${this.tareasBase(cursoId, moduloId)}/${tareaId}/entregas/${entregaId}/archivo/descarga`);
  }

  private async abrirDescarga(endpoint: string): Promise<void> {
    const d = await this.api.request<DescargaAula>(endpoint, { noCache: true });
    if (!d || typeof d.url !== 'string' || !/^https:\/\//i.test(d.url)) {
      throw Object.assign(new Error('No se pudo generar el enlace de descarga.'), { status: 503 });
    }
    window.location.assign(d.url);
  }

  /** Mensajes para tareas/entregas/calificaciones, incluido 409 (version, plazo o estado). */
  mensajeErrorTarea(err: any, accion: 'tarea' | 'entrega' | 'calificacion', contexto: 'docente' | 'estudiante'): string {
    const status = err?.status;
    if (status === 409) {
      if (accion === 'tarea') {
        return 'La tarea cambió o ya tiene entregas, por lo que no se puede modificar ni eliminar. Se recargó la información.';
      }
      if (accion === 'entrega') {
        return 'No se pudo registrar la entrega: el plazo venció, ya fue calificada o cambió desde otra sesión. Se recargó tu entrega; revísala antes de reintentar.';
      }
      return 'La entrega cambió (fue reemplazada o calificada en otra sesión). Se recargó el listado; revisa antes de volver a calificar.';
    }
    if (status === 503 && accion !== 'tarea') {
      return 'No se pudo confirmar la operación porque un servicio no está disponible. Recarga para verificar si se guardó antes de reintentar.';
    }
    return this.mensajeError(err, contexto);
  }

  mensajeError(err: any, contexto: 'docente' | 'estudiante'): string {
    const status = err?.status;
    if (status === 401) return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
    if (status === 403) {
      return contexto === 'docente'
        ? 'No tienes permiso para gestionar el aula de este curso.'
        : 'Tu matrícula en este curso no figura como pagada, por lo que no puedes acceder al aula.';
    }
    if (status === 404) return 'El curso, módulo o material no existe o ya fue eliminado.';
    if (status === 413) return 'El archivo supera el máximo de 10 MB.';
    if (status === 503) {
      return contexto === 'docente'
        ? 'El almacenamiento de archivos no está disponible en este momento. Intenta nuevamente en unos minutos.'
        : 'No pudimos verificar tu matrícula o el almacenamiento no está disponible. Intenta nuevamente en unos minutos.';
    }
    if (status === 400 && err?.message) return err.message;
    if (!status) return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    return 'Ocurrió un error inesperado. Inténtalo nuevamente.';
  }
}

export function formatoTamano(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------- Tareas y entregas: tipos ----------------

export type TipoEntrega = 'TEXTO' | 'ARCHIVO' | 'AMBOS';
export type EstadoEntrega = 'ENVIO_PENDIENTE' | 'ENTREGADA' | 'CALIFICADA';

export interface TareaDatos {
  titulo: string;
  consigna: string;
  fechaLimite: string; // ISO-8601 con zona (UTC)
  tipoEntrega: TipoEntrega;
}

export interface TareaAula extends TareaDatos {
  id: string;
  moduloId: string;
  version: number;
}

export interface ArchivoEntrega {
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  tipo: TipoMaterial;
}

export interface EntregaAula {
  id: string;
  tareaId: string;
  texto: string | null;
  estado: EstadoEntrega;
  entregadaEn: string | null;
  version: number;
  archivo: ArchivoEntrega | null;
  nota: number | null;
  retroalimentacion: string | null;
  calificadaEn: string | null;
}

export interface PaginaEntregas {
  items: { estudianteId: string; entrega: EntregaAula }[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const TEXTO_MAX = 20000;

// ---------------- Fechas en America/Lima ----------------

const ZONA_LIMA = 'America/Lima';
const FORMATO_LIMA = new Intl.DateTimeFormat('es-PE', {
  timeZone: ZONA_LIMA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
});

/** Fecha legible en hora de Lima, independiente de la zona del navegador. */
export function fechaLima(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : `${FORMATO_LIMA.format(d)} (hora de Lima)`;
}

/** ISO (UTC) -> valor para <input type="datetime-local"> expresado en hora de Lima. */
export function isoAInputLima(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_LIMA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d).reduce<Record<string, string>>((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const hora = partes['hour'] === '24' ? '00' : partes['hour'];
  return `${partes['year']}-${partes['month']}-${partes['day']}T${hora}:${partes['minute']}`;
}

/**
 * Valor de <input type="datetime-local"> interpretado como hora de Lima -> ISO UTC.
 * Peru usa UTC-05:00 todo el ano (sin horario de verano).
 */
export function inputLimaAIso(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor || '')) return null;
  const d = new Date(`${valor}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Solo para la interfaz: el plazo real lo decide el reloj del servidor. */
export function plazoVencido(iso: string | null | undefined, ahora = Date.now()): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && ahora > t;
}

/** Nota 0..20 con maximo dos decimales (mismo criterio que el backend, sin redondear). */
export function notaValida(valor: string): number | null {
  const v = (valor || '').trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(v)) return null;
  const n = Number(v);
  return n >= 0 && n <= 20 ? n : null;
}
