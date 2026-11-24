import { Component, Input, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  AulaService, ModuloAula, TareaAula, TareaDatos, TipoEntrega, PaginaEntregas, EntregaAula,
  fechaLima, isoAInputLima, inputLimaAIso, plazoVencido, notaValida, formatoTamano, TEXTO_MAX
} from '../../services/aula.service';

/**
 * Tareas de un modulo para el DOCENTE asignado: CRUD con version, revision paginada de
 * entregas y calificacion 0..20 con retroalimentacion. El backend reautoriza todo.
 */
@Component({
  selector: 'app-tareas-docente',
  standalone: true,
  styleUrl: '../aula-estudiante/tareas.css',
  template: `
  <div class="tareas">
    <button type="button" class="tareas-toggle" (click)="alternar()" [attr.aria-expanded]="abierto()">
      <i class="fa" [class.fa-chevron-down]="abierto()" [class.fa-chevron-right]="!abierto()"></i>
      Tareas @if (cargado()) { <span class="badge bg-light text-dark ms-1">{{ tareas().length }}</span> }
    </button>

    @if (abierto()) {
      @if (mensaje(); as m) {
        <div class="alert py-2 small d-flex justify-content-between gap-2" [class.alert-success]="m.ok" [class.alert-danger]="!m.ok" role="alert">
          <span>{{ m.texto }}</span>
          <button type="button" class="btn-close btn-sm" aria-label="Cerrar" (click)="mensaje.set(null)"></button>
        </div>
      }

      @if (cargando()) {
        <p class="aula-vacio"><span class="spinner-border spinner-border-sm me-1"></span> Cargando tareas…</p>
      } @else if (errorCarga()) {
        <p class="text-danger small mb-2">{{ errorCarga() }}
          <button type="button" class="btn btn-link btn-sm p-0 ms-1" (click)="cargar()">Reintentar</button></p>
      } @else {
        @if (tareas().length === 0 && !formNuevo()) { <p class="aula-vacio">Este módulo no tiene tareas.</p> }

        @for (t of tareas(); track t.id) {
          <div class="tarea-item">
            @if (editandoId() === t.id) {
              <ng-container *ngTemplateOutlet="formulario; context: { $implicit: t }"></ng-container>
            } @else {
              <div class="tarea-head">
                <div class="tarea-info">
                  <strong>{{ t.titulo }}</strong>
                  <small>
                    <span class="aula-tipo">{{ t.tipoEntrega }}</span>
                    Límite: {{ fecha(t.fechaLimite) }}
                    @if (vencida(t.fechaLimite)) { <span class="badge bg-secondary ms-1">Vencida</span> }
                  </small>
                </div>
                <div class="tarea-acciones">
                  <button type="button" class="btn btn-outline-success btn-sm" (click)="verEntregas(t)">
                    <i class="fa fa-inbox me-1"></i> Entregas</button>
                  <button type="button" class="btn btn-outline-secondary btn-sm" (click)="editar(t)">
                    <i class="fa fa-pencil"></i> Editar</button>
                  @if (confirmandoId() === t.id) {
                    <button type="button" class="btn btn-danger btn-sm" [disabled]="ocupado()" (click)="eliminar(t)">Sí, eliminar</button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" (click)="confirmandoId.set(null)">No</button>
                  } @else {
                    <button type="button" class="btn btn-outline-danger btn-sm" (click)="confirmandoId.set(t.id)">
                      <i class="fa fa-trash"></i></button>
                  }
                </div>
              </div>
              <p class="tarea-consigna">{{ t.consigna }}</p>
            }

            @if (revisandoId() === t.id) {
              <div class="entregas-panel">
                <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                  <strong class="small">Entregas recibidas
                    @if (pagina(); as p) { ({{ p.totalElements }}) }</strong>
                  <button type="button" class="btn btn-link btn-sm p-0" (click)="revisandoId.set(null)">Cerrar</button>
                </div>
                @if (cargandoEntregas()) {
                  <p class="aula-vacio"><span class="spinner-border spinner-border-sm me-1"></span> Cargando entregas…</p>
                } @else if (pagina(); as p) {
                  @if (p.items.length === 0) { <p class="aula-vacio">Aún no hay entregas.</p> }
                  @for (it of p.items; track it.entrega.id) {
                    <div class="entrega-item">
                      <div class="d-flex justify-content-between flex-wrap gap-2">
                        <span class="small text-muted">Alumno <code>{{ it.estudianteId }}</code></span>
                        <span class="badge" [class.bg-success]="it.entrega.estado === 'CALIFICADA'"
                              [class.bg-info]="it.entrega.estado !== 'CALIFICADA'">{{ estadoTexto(it.entrega.estado) }}</span>
                      </div>
                      <small class="d-block text-muted">Entregada: {{ fecha(it.entrega.entregadaEn) }}</small>
                      @if (it.entrega.texto) { <p class="entrega-texto">{{ it.entrega.texto }}</p> }
                      @if (it.entrega.archivo; as a) {
                        <button type="button" class="btn btn-outline-primary btn-sm my-1" [disabled]="ocupado()"
                                (click)="descargar(t, it.entrega)">
                          <i class="fa fa-download me-1"></i> {{ a.nombreOriginal }} ({{ tamano(a.tamanoBytes) }})</button>
                      }
                      @if (it.entrega.estado === 'CALIFICADA') {
                        <p class="small mb-1"><strong>Nota: {{ it.entrega.nota }}/20</strong> · {{ fecha(it.entrega.calificadaEn) }}</p>
                        <p class="entrega-texto small">{{ it.entrega.retroalimentacion }}</p>
                      }
                      @if (calificandoId() === it.entrega.id) {
                        <form class="calificar-form" (submit)="$event.preventDefault(); calificar(t, it.entrega, nota.value, retro.value)">
                          <div class="row g-2">
                            <div class="col-sm-3 col-12">
                              <label class="form-label small" [attr.for]="'n-' + it.entrega.id">Nota (0–20)</label>
                              <input #nota [id]="'n-' + it.entrega.id" class="form-control form-control-sm" inputmode="decimal"
                                     [value]="it.entrega.nota ?? ''" placeholder="0–20" required>
                            </div>
                            <div class="col-sm-9 col-12">
                              <label class="form-label small" [attr.for]="'r-' + it.entrega.id">Retroalimentación (obligatoria)</label>
                              <textarea #retro [id]="'r-' + it.entrega.id" class="form-control form-control-sm" rows="3"
                                        [attr.maxlength]="textoMax" required>{{ it.entrega.retroalimentacion ?? '' }}</textarea>
                            </div>
                          </div>
                          <div class="d-flex gap-2 mt-2">
                            <button type="submit" class="btn btn-success btn-sm fw-bold" [disabled]="ocupado()">
                              @if (ocupado()) { <span class="spinner-border spinner-border-sm me-1"></span> }
                              {{ it.entrega.estado === 'CALIFICADA' ? 'Guardar recalificación' : 'Publicar nota' }}</button>
                            <button type="button" class="btn btn-outline-secondary btn-sm" (click)="calificandoId.set(null)">Cancelar</button>
                          </div>
                        </form>
                      } @else {
                        <button type="button" class="btn btn-sm btn-outline-success mt-1" (click)="calificandoId.set(it.entrega.id)">
                          {{ it.entrega.estado === 'CALIFICADA' ? 'Recalificar' : 'Calificar' }}</button>
                      }
                    </div>
                  }
                  @if (p.totalPages > 1) {
                    <div class="d-flex justify-content-center align-items-center gap-2 mt-2">
                      <button type="button" class="btn btn-outline-secondary btn-sm" [disabled]="p.page === 0"
                              (click)="cargarEntregas(t, p.page - 1)">Anterior</button>
                      <span class="small">Página {{ p.page + 1 }} de {{ p.totalPages }}</span>
                      <button type="button" class="btn btn-outline-secondary btn-sm" [disabled]="p.page + 1 >= p.totalPages"
                              (click)="cargarEntregas(t, p.page + 1)">Siguiente</button>
                    </div>
                  }
                }
              </div>
            }
          </div>
        }

        @if (formNuevo()) {
          <div class="tarea-item"><ng-container *ngTemplateOutlet="formulario; context: { $implicit: null }"></ng-container></div>
        } @else {
          <button type="button" class="btn btn-outline-success btn-sm" (click)="formNuevo.set(true)">
            <i class="fa fa-plus me-1"></i> Nueva tarea</button>
        }
      }
    }
  </div>

  <ng-template #formulario let-t>
    <form class="tarea-form" (submit)="$event.preventDefault(); guardar(t, titulo.value, consigna.value, limite.value, tipo.value)">
      <div class="row g-2">
        <div class="col-md-8 col-12">
          <label class="form-label small">Título</label>
          <input #titulo class="form-control form-control-sm" maxlength="200" [value]="t?.titulo ?? ''" required>
        </div>
        <div class="col-md-4 col-12">
          <label class="form-label small">Tipo de entrega</label>
          <select #tipo class="form-select form-select-sm">
            @for (op of tipos; track op.valor) {
              <option [value]="op.valor" [selected]="(t?.tipoEntrega ?? 'AMBOS') === op.valor">{{ op.texto }}</option>
            }
          </select>
        </div>
        <div class="col-12">
          <label class="form-label small">Consigna</label>
          <textarea #consigna class="form-control form-control-sm" rows="4" [attr.maxlength]="textoMax" required>{{ t?.consigna ?? '' }}</textarea>
        </div>
        <div class="col-md-6 col-12">
          <label class="form-label small">Fecha límite (hora de Lima)</label>
          <input #limite type="datetime-local" class="form-control form-control-sm" [value]="inputLima(t?.fechaLimite)" required>
        </div>
        <div class="col-md-6 col-12 d-flex align-items-end gap-2">
          <button type="submit" class="btn btn-success btn-sm fw-bold flex-fill" [disabled]="ocupado()">
            @if (ocupado()) { <span class="spinner-border spinner-border-sm me-1"></span> }
            {{ t ? 'Guardar cambios' : 'Crear tarea' }}</button>
          <button type="button" class="btn btn-outline-secondary btn-sm flex-fill" (click)="cancelarForm()">Cancelar</button>
        </div>
      </div>
    </form>
  </ng-template>
  `,
  imports: [NgTemplateOutlet]
})
export class TareasDocenteComponent {
  @Input({ required: true }) cursoId!: string;
  @Input({ required: true }) modulo!: ModuloAula;

  private aula = inject(AulaService);
  readonly textoMax = TEXTO_MAX;
  readonly tipos: { valor: TipoEntrega; texto: string }[] = [
    { valor: 'TEXTO', texto: 'Solo texto' }, { valor: 'ARCHIVO', texto: 'Solo archivo' }, { valor: 'AMBOS', texto: 'Texto y/o archivo' }
  ];
  readonly pageSize = 10;

  abierto = signal(false);
  cargado = signal(false);
  cargando = signal(false);
  errorCarga = signal<string | null>(null);
  tareas = signal<TareaAula[]>([]);
  formNuevo = signal(false);
  editandoId = signal<string | null>(null);
  confirmandoId = signal<string | null>(null);
  revisandoId = signal<string | null>(null);
  calificandoId = signal<string | null>(null);
  pagina = signal<PaginaEntregas | null>(null);
  cargandoEntregas = signal(false);
  ocupado = signal(false);
  mensaje = signal<{ ok: boolean; texto: string } | null>(null);

  fecha = fechaLima;
  inputLima = isoAInputLima;
  vencida = plazoVencido;
  tamano = formatoTamano;

  estadoTexto(e: string): string {
    return e === 'CALIFICADA' ? 'Calificada' : e === 'ENTREGADA' ? 'Por calificar' : e;
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
      this.errorCarga.set(this.aula.mensajeError(err, 'docente'));
    } finally {
      this.cargando.set(false);
    }
  }

  editar(t: TareaAula): void {
    this.formNuevo.set(false);
    this.editandoId.set(t.id);
  }

  cancelarForm(): void {
    this.formNuevo.set(false);
    this.editandoId.set(null);
  }

  private datos(titulo: string, consigna: string, limite: string, tipo: string): TareaDatos | null {
    const fechaLimite = inputLimaAIso(limite);
    if (!titulo.trim() || titulo.length > 200) return this.invalido('El título es obligatorio (máximo 200 caracteres).');
    if (!consigna.trim() || consigna.length > TEXTO_MAX) return this.invalido('La consigna es obligatoria (máximo 20000 caracteres).');
    if (!fechaLimite) return this.invalido('Indica una fecha y hora límite válidas.');
    if (!['TEXTO', 'ARCHIVO', 'AMBOS'].includes(tipo)) return this.invalido('Selecciona el tipo de entrega.');
    return { titulo: titulo.trim(), consigna, fechaLimite, tipoEntrega: tipo as TipoEntrega };
  }

  private invalido(texto: string): null {
    this.mensaje.set({ ok: false, texto });
    return null;
  }

  async guardar(t: TareaAula | null, titulo: string, consigna: string, limite: string, tipo: string): Promise<void> {
    const datos = this.datos(titulo, consigna, limite, tipo);
    if (!datos) return;
    this.ocupado.set(true);
    try {
      if (t) {
        await this.aula.editarTarea(this.cursoId, this.modulo.id, t.id, datos, t.version);
        this.mensaje.set({ ok: true, texto: 'Tarea actualizada.' });
      } else {
        await this.aula.crearTarea(this.cursoId, this.modulo.id, datos);
        this.mensaje.set({ ok: true, texto: `Tarea «${datos.titulo}» creada.` });
      }
      this.cancelarForm();
      await this.cargar();
    } catch (err: any) {
      this.mensaje.set({ ok: false, texto: this.aula.mensajeErrorTarea(err, 'tarea', 'docente') });
      if (err?.status === 409) { this.cancelarForm(); await this.cargar(); }
    } finally {
      this.ocupado.set(false);
    }
  }

  async eliminar(t: TareaAula): Promise<void> {
    this.ocupado.set(true);
    try {
      await this.aula.eliminarTarea(this.cursoId, this.modulo.id, t.id, t.version);
      this.confirmandoId.set(null);
      if (this.revisandoId() === t.id) this.revisandoId.set(null);
      this.mensaje.set({ ok: true, texto: `Tarea «${t.titulo}» eliminada.` });
      await this.cargar();
    } catch (err: any) {
      this.confirmandoId.set(null);
      this.mensaje.set({ ok: false, texto: this.aula.mensajeErrorTarea(err, 'tarea', 'docente') });
      if (err?.status === 409) await this.cargar();
    } finally {
      this.ocupado.set(false);
    }
  }

  verEntregas(t: TareaAula): void {
    this.calificandoId.set(null);
    this.revisandoId.set(t.id);
    this.cargarEntregas(t, 0);
  }

  async cargarEntregas(t: TareaAula, page: number): Promise<void> {
    this.cargandoEntregas.set(true);
    try {
      this.pagina.set(await this.aula.listarEntregas(this.cursoId, this.modulo.id, t.id, Math.max(0, page), this.pageSize));
    } catch (err) {
      this.pagina.set(null);
      this.mensaje.set({ ok: false, texto: this.aula.mensajeError(err, 'docente') });
    } finally {
      this.cargandoEntregas.set(false);
    }
  }

  async calificar(t: TareaAula, e: EntregaAula, notaTexto: string, retro: string): Promise<void> {
    const nota = notaValida(notaTexto);
    if (nota === null) {
      this.mensaje.set({ ok: false, texto: 'La nota debe estar entre 0 y 20, con máximo dos decimales.' });
      return;
    }
    if (!retro.trim() || retro.length > TEXTO_MAX) {
      this.mensaje.set({ ok: false, texto: 'La retroalimentación es obligatoria (máximo 20000 caracteres).' });
      return;
    }
    this.ocupado.set(true);
    const pagina = this.pagina()?.page ?? 0;
    try {
      // Se envia la version vigente de la entrega; si cambio, el backend responde 409.
      await this.aula.calificar(this.cursoId, this.modulo.id, t.id, e.id, nota, retro, e.version);
      this.calificandoId.set(null);
      this.mensaje.set({ ok: true, texto: `Nota ${nota}/20 publicada.` });
      await this.cargarEntregas(t, pagina);
    } catch (err: any) {
      this.mensaje.set({ ok: false, texto: this.aula.mensajeErrorTarea(err, 'calificacion', 'docente') });
      if (err?.status === 409) { this.calificandoId.set(null); await this.cargarEntregas(t, pagina); }
    } finally {
      this.ocupado.set(false);
    }
  }

  async descargar(t: TareaAula, e: EntregaAula): Promise<void> {
    this.ocupado.set(true);
    try {
      await this.aula.descargarArchivoEntrega(this.cursoId, this.modulo.id, t.id, e.id);
    } catch (err) {
      this.mensaje.set({ ok: false, texto: this.aula.mensajeErrorTarea(err, 'calificacion', 'docente') });
    } finally {
      this.ocupado.set(false);
    }
  }
}
