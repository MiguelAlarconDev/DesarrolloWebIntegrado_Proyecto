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
