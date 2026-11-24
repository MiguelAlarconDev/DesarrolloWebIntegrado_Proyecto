import { Component, Input, inject, signal } from '@angular/core';
import {
  AulaService, ModuloAula, TareaAula, EntregaAula,
  fechaLima, plazoVencido, formatoTamano, TEXTO_MAX
} from '../../services/aula.service';

interface EstadoTarea {
  cargando: boolean;
  entrega: EntregaAula | null;
  error: string | null;
}

/**
 * Tareas de un modulo para el ESTUDIANTE: consigna, plazo (hora de Lima), entrega propia,
 * reemplazo completo antes del plazo y consulta de nota. El backend decide matricula y plazo.
 */
@Component({
  selector: 'app-tareas-estudiante',
  standalone: true,
  styleUrl: './tareas.css',
  template: `
  <div class="tareas">
    <button type="button" class="tareas-toggle" (click)="alternar()" [attr.aria-expanded]="abierto()">
      <i class="fa" [class.fa-chevron-down]="abierto()" [class.fa-chevron-right]="!abierto()"></i>
      Tareas @if (cargado()) { <span class="badge bg-light text-dark ms-1">{{ tareas().length }}</span> }
    </button>

    @if (abierto()) {
      @if (cargando()) {
        <p class="aula-vacio"><span class="spinner-border spinner-border-sm me-1"></span> Cargando tareas…</p>
      } @else if (errorCarga()) {
        <p class="text-danger small mb-2">{{ errorCarga() }}
          <button type="button" class="btn btn-link btn-sm p-0 ms-1" (click)="cargar()">Reintentar</button></p>
      } @else if (tareas().length === 0) {
        <p class="aula-vacio">No hay tareas en este módulo.</p>
      } @else {
        @for (t of tareas(); track t.id) {
          <div class="tarea-item">
            <div class="tarea-head">
              <div class="tarea-info">
                <strong>{{ t.titulo }}</strong>
                <small>
                  <span class="aula-tipo">{{ tipoTexto(t.tipoEntrega) }}</span>
                  Límite: {{ fecha(t.fechaLimite) }}
                  @if (vencida(t.fechaLimite)) { <span class="badge bg-secondary ms-1">Plazo vencido</span> }
                </small>
              </div>
              <div class="tarea-acciones">
                <button type="button" class="btn btn-outline-success btn-sm" (click)="alternarTarea(t)">
                  {{ abiertaId() === t.id ? 'Ocultar' : 'Ver / Entregar' }}</button>
              </div>
            </div>
            <p class="tarea-consigna">{{ t.consigna }}</p>

            @if (abiertaId() === t.id) {
              @if (estado()[t.id]; as st) {
                @if (st.cargando) {
                  <p class="aula-vacio"><span class="spinner-border spinner-border-sm me-1"></span> Consultando tu entrega…</p>
                } @else {
                  @if (st.error) {
                    <div class="alert alert-danger py-2 small" role="alert">{{ st.error }}</div>
                  }
                  @if (st.entrega; as e) {
                    <div class="entrega-item">
                      <div class="d-flex justify-content-between flex-wrap gap-2">
                        <strong class="small">Tu entrega</strong>
                        <span class="badge" [class.bg-success]="e.estado === 'CALIFICADA'" [class.bg-info]="e.estado !== 'CALIFICADA'">
                          {{ e.estado === 'CALIFICADA' ? 'Calificada' : 'Entregada' }}</span>
                      </div>
                      <small class="d-block text-muted">Enviada: {{ fecha(e.entregadaEn) }}</small>
                      @if (e.texto) { <p class="entrega-texto">{{ e.texto }}</p> }
                      @if (e.archivo; as a) {
                        <button type="button" class="btn btn-outline-primary btn-sm my-1" [disabled]="ocupado()" (click)="descargar(t)">
                          <i class="fa fa-download me-1"></i> {{ a.nombreOriginal }} ({{ tamano(a.tamanoBytes) }})</button>
                      }
                      @if (e.estado === 'CALIFICADA') {
                        <div class="nota-box">
                          <span class="nota-valor">{{ e.nota }}<small>/20</small></span>
                          <div>
                            <strong class="small d-block">Retroalimentación del docente</strong>
                            <p class="entrega-texto mb-0">{{ e.retroalimentacion }}</p>
                            <small class="text-muted">Calificada: {{ fecha(e.calificadaEn) }}</small>
                          </div>
                        </div>
                      }
                    </div>
                  } @else if (!st.error) {
                    <p class="aula-vacio">Aún no has enviado esta tarea.</p>
                  }

                  @if (puedeEntregar(t, st.entrega)) {
                    <form class="tarea-form" (submit)="$event.preventDefault(); enviarForm(t, st.entrega, $any($event.target))">
                      @if (st.entrega) {
                        <div class="alert alert-warning py-2 small mb-2">
                          Reemplazar sustituye <strong>toda</strong> tu entrega: el texto o archivo que no incluyas ahora se eliminará.
                        </div>
                      }
                      @if (t.tipoEntrega !== 'ARCHIVO') {
                        <label class="form-label small" [attr.for]="'tx-' + t.id">
                          Respuesta en texto{{ t.tipoEntrega === 'TEXTO' ? ' (obligatoria)' : ' (opcional si adjuntas archivo)' }}</label>
                        <textarea name="texto" [id]="'tx-' + t.id" class="form-control form-control-sm mb-2" rows="5"
                                  [attr.maxlength]="textoMax">{{ st.entrega?.texto ?? '' }}</textarea>
                      }
                      @if (t.tipoEntrega !== 'TEXTO') {
                        <label class="form-label small" [attr.for]="'ar-' + t.id">
                          Archivo PDF, DOCX, PPTX o ZIP (máx. 10 MB){{ t.tipoEntrega === 'ARCHIVO' ? ' — obligatorio' : '' }}</label>
                        <input name="archivo" [id]="'ar-' + t.id" type="file" class="form-control form-control-sm mb-2" accept=".pdf,.docx,.pptx,.zip">
                        @if (st.entrega?.archivo) {
                          <small class="d-block text-muted mb-2">Si no adjuntas un archivo nuevo, se quitará el archivo actual.</small>
                        }
                      }
                      <button type="submit" class="btn btn-success btn-sm fw-bold" [disabled]="ocupado()">
                        @if (ocupado()) { <span class="spinner-border spinner-border-sm me-1"></span> Enviando… }
                        @else { {{ st.entrega ? 'Reemplazar entrega' : 'Enviar entrega' }} }
                      </button>
                    </form>
                  } @else if (st.entrega?.estado !== 'CALIFICADA' && vencida(t.fechaLimite)) {
                    <p class="aula-vacio">El plazo de entrega venció.</p>
                  }
                }
              }
            }
          </div>
        }
      }
    }
  </div>
  `
})
export class TareasEstudianteComponent {
  @Input({ required: true }) cursoId!: string;
  @Input({ required: true }) modulo!: ModuloAula;

  private aula = inject(AulaService);
  readonly textoMax = TEXTO_MAX;

  abierto = signal(false);
  cargado = signal(false);
  cargando = signal(false);
  errorCarga = signal<string | null>(null);
  tareas = signal<TareaAula[]>([]);
  abiertaId = signal<string | null>(null);
  estado = signal<Record<string, EstadoTarea>>({});
  ocupado = signal(false);

  fecha = fechaLima;
  vencida = plazoVencido;
  tamano = formatoTamano;

  tipoTexto(t: string): string {
    return t === 'TEXTO' ? 'Texto' : t === 'ARCHIVO' ? 'Archivo' : 'Texto y/o archivo';
  }

  alternar(): void {
    this.abierto.update(v => !v);
    if (this.abierto() && !this.cargado()) this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set(null);
    try {
      this.tareas.set(await this.aula.listarTareas(this.cursoId, this.modulo.id));
      this.cargado.set(true);
    } catch (err) {
      this.errorCarga.set(this.aula.mensajeError(err, 'estudiante'));
    } finally {
      this.cargando.set(false);
    }
  }

  alternarTarea(t: TareaAula): void {
    if (this.abiertaId() === t.id) {
      this.abiertaId.set(null);
      return;
    }
    this.abiertaId.set(t.id);
    this.cargarEntrega(t);
  }

  private fijar(id: string, st: EstadoTarea): void {
    this.estado.update(m => ({ ...m, [id]: st }));
  }

  async cargarEntrega(t: TareaAula, error: string | null = null): Promise<void> {
    this.fijar(t.id, { cargando: true, entrega: null, error: null });
    try {
      this.fijar(t.id, { cargando: false, entrega: await this.aula.miEntrega(this.cursoId, this.modulo.id, t.id), error });
    } catch (err) {
      this.fijar(t.id, { cargando: false, entrega: null, error: this.aula.mensajeError(err, 'estudiante') });
    }
  }

  /** Solo interfaz: el servidor vuelve a comprobar plazo, estado y version. */
  puedeEntregar(t: TareaAula, e: EntregaAula | null): boolean {
    return !plazoVencido(t.fechaLimite) && e?.estado !== 'CALIFICADA';
  }

  enviarForm(t: TareaAula, actual: EntregaAula | null, form: HTMLFormElement): Promise<void> {
    const ta = form.elements.namedItem('texto') as HTMLTextAreaElement | null;
    const fi = form.elements.namedItem('archivo') as HTMLInputElement | null;
    return this.enviar(t, actual, ta ? ta.value : null, fi?.files?.[0] ?? null, fi ?? undefined);
  }

  async enviar(t: TareaAula, actual: EntregaAula | null, texto: string | null, archivo: File | null,
               input?: HTMLInputElement): Promise<void> {
    const conTexto = !!(texto && texto.trim());
    if (texto && texto.length > TEXTO_MAX) return this.error(t, actual, 'El texto supera los 20000 caracteres.');
    if (archivo) {
      const problema = this.aula.validarArchivoLocal(archivo);
      if (problema) return this.error(t, actual, problema);
    }
    if (t.tipoEntrega === 'TEXTO' && !conTexto) return this.error(t, actual, 'Esta tarea requiere una respuesta en texto.');
    if (t.tipoEntrega === 'ARCHIVO' && !archivo) return this.error(t, actual, 'Esta tarea requiere adjuntar un archivo.');
    if (t.tipoEntrega === 'AMBOS' && !conTexto && !archivo) {
      return this.error(t, actual, 'Escribe una respuesta o adjunta un archivo.');
    }

    this.ocupado.set(true);
    try {
      const version = actual ? actual.version : -1;
      const entrega = await this.aula.entregar(this.cursoId, this.modulo.id, t.id, version, conTexto ? texto : null, archivo);
      if (input) input.value = '';
      this.fijar(t.id, { cargando: false, entrega, error: null });
    } catch (err: any) {
      const msg = this.aula.mensajeErrorTarea(err, 'entrega', 'estudiante');
      // 409/503: recargar la entrega vigente antes de cualquier reintento (no reenviar automaticamente).
      if (err?.status === 409 || err?.status === 503) {
        await this.cargarEntrega(t, msg);
      } else {
        this.error(t, actual, msg);
      }
    } finally {
      this.ocupado.set(false);
    }
  }

  private error(t: TareaAula, entrega: EntregaAula | null, texto: string): void {
    this.fijar(t.id, { cargando: false, entrega, error: texto });
  }

  async descargar(t: TareaAula): Promise<void> {
    this.ocupado.set(true);
    try {
      await this.aula.descargarMiArchivo(this.cursoId, this.modulo.id, t.id);
    } catch (err) {
      this.error(t, this.estado()[t.id]?.entrega ?? null, this.aula.mensajeError(err, 'estudiante'));
    } finally {
      this.ocupado.set(false);
    }
  }
}
