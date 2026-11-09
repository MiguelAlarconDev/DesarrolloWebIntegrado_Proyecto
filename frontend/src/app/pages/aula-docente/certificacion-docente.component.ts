import { Component, Input, inject, signal } from '@angular/core';
import { PedidoService } from '../../services/pedido.service';
import { fechaLima } from '../../services/aula.service';
import {
  CertificadosService, ResultadoRecomendacion, Evidencia, EstadoDecision, RevisionDecision,
  etiquetaRecomendacion, etiquetaDecision
} from '../../services/certificados.service';

interface Alumno { id: string; nombre: string; }
interface Detalle {
  cargando: boolean; error: string | null;
  recomendacion: ResultadoRecomendacion | null; evidencia: Evidencia | null; estado: EstadoDecision | null;
  historial: RevisionDecision[] | null;
}

/**
 * Recomendacion (Fase 1) y decision academica (Fase 2) por estudiante, dentro del aula del docente.
 * Toda regla (matricula, vigencia, versiones, hash) la valida el backend; aqui solo se presentan los datos.
 */
@Component({
  selector: 'app-certificacion-docente',
  standalone: true,
  styleUrl: '../aula-estudiante/certificados.css',
  template: `
  <section class="cert-card">
    <button type="button" class="cert-toggle" (click)="alternar()" [attr.aria-expanded]="abierto()">
      <i class="fa" [class.fa-chevron-down]="abierto()" [class.fa-chevron-right]="!abierto()"></i>
      Certificación académica
    </button>
    @if (abierto()) {
      <p class="cert-ayuda">La recomendación es orientativa: la aprobación requiere tu decisión explícita y justificada.
        Si cambian tareas o calificaciones, la decisión deja de estar vigente y debe revisarse.</p>
      @if (cargando()) {
        <p class="cert-vacio"><span class="spinner-border spinner-border-sm me-1"></span> Cargando estudiantes…</p>
      } @else if (error()) {
        <p class="text-danger small">{{ error() }} <button type="button" class="btn btn-link btn-sm p-0" (click)="cargar()">Reintentar</button></p>
      } @else if (alumnos().length === 0) {
        <p class="cert-vacio">No hay estudiantes con matrícula pagada en este curso.</p>
      } @else {
        @for (a of alumnos(); track a.id) {
          <div class="cert-item">
            <div class="cert-fila">
              <strong>{{ a.nombre }}</strong>
              <button type="button" class="btn btn-outline-success btn-sm" (click)="abrir(a)">
                {{ abiertoId() === a.id ? 'Ocultar' : 'Revisar' }}</button>
            </div>
            @if (abiertoId() === a.id) {
              @if (detalle()[a.id]; as d) {
                @if (d.cargando) {
                  <p class="cert-vacio"><span class="spinner-border spinner-border-sm me-1"></span> Consultando…</p>
                } @else {
                  @if (d.error) { <div class="alert alert-danger py-2 small" role="alert">{{ d.error }}</div> }
                  @if (d.recomendacion; as r) {
                    <div class="cert-resumen">
                      <span class="cert-badge" [attr.data-estado]="r.recomendacion">{{ etiquetaRec(r.recomendacion) }}</span>
                      <span>Promedio: <strong>{{ r.promedio ?? '—' }}</strong> (mínimo {{ r.notaMinima }})</span>
                      <span>Calificadas: {{ r.tareasCalificadas }}/{{ r.totalTareas }}</span>
                    </div>
                    <p class="cert-ayuda">{{ r.explicacion }}</p>
                  }
                  @if (d.estado; as e) {
                    <div class="cert-decision">
                      Decisión vigente: <strong>{{ etiquetaDec(e.revision.decision) }}</strong>
                      (v{{ e.revision.version }}, {{ fecha(e.revision.fecha) }})
                      @if (e.requiereRevision) {
                        <div class="alert alert-warning py-2 small mt-2 mb-0">
                          Las tareas o calificaciones cambiaron después de esta decisión. Ya no está vigente: revisa la evidencia y confirma una nueva decisión.
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="cert-vacio">Aún no hay una decisión registrada.</p>
                  }
                  @if (d.evidencia; as ev) {
                    <details class="cert-evidencia">
                      <summary>Evidencia ({{ ev.evidencia.tareas.length }} tareas, revisión {{ ev.revisionAcademica }})</summary>
                      <table class="table table-sm mb-0">
                        <thead><tr><th>#</th><th>Estado</th><th>Nota</th></tr></thead>
                        <tbody>
                          @for (t of ev.evidencia.tareas; track t.tareaId; let i = $index) {
                            <tr><td>{{ i + 1 }}</td><td>{{ t.estado ?? 'Sin entrega' }}</td><td>{{ t.nota ?? '—' }}</td></tr>
                          }
                        </tbody>
                      </table>
                      <small class="text-muted">Huella: {{ ev.evidenciaHash.slice(0, 16) }}…</small>
                    </details>
                    <form class="cert-form" (submit)="$event.preventDefault()">
                      <label class="form-label small" [attr.for]="'j-' + a.id">Justificación (obligatoria)</label>
                      <textarea #just [id]="'j-' + a.id" class="form-control form-control-sm" rows="3" maxlength="20000"></textarea>
                      <div class="cert-acciones">
                        <button type="button" class="btn btn-success btn-sm" [disabled]="ocupado()" (click)="decidir(a, 'APROBADO', just)">Aprobar</button>
                        <button type="button" class="btn btn-outline-danger btn-sm" [disabled]="ocupado()" (click)="decidir(a, 'NO_APROBADO', just)">No aprobar</button>
                        @if (d.estado && d.estado.revision.decision !== 'REVOCADO') {
                          <button type="button" class="btn btn-outline-secondary btn-sm" [disabled]="ocupado()" (click)="revocar(a, just)">Revocar decisión</button>
                        }
                      </div>
                    </form>
                  }
                  <button type="button" class="btn btn-link btn-sm p-0 mt-2" (click)="verHistorial(a)">Ver historial</button>
                  @if (d.historial; as h) {
                    @if (h.length === 0) { <p class="cert-vacio">Sin decisiones registradas.</p> }
                    <ul class="cert-historial">
                      @for (r of h; track r.id) {
                        <li><strong>v{{ r.version }} · {{ etiquetaDec(r.decision) }}</strong> · {{ fecha(r.fecha) }} · revisión {{ r.revisionAcademica }}
                          <span class="d-block">{{ r.justificacion }}</span></li>
                      }
                    </ul>
                  }
                }
              }
            }
          </div>
        }
      }
      @if (mensaje(); as m) {
        <div class="alert py-2 small mt-2" [class.alert-success]="m.ok" [class.alert-danger]="!m.ok" role="status">{{ m.texto }}</div>
      }
    }
  </section>
  `
})
export class CertificacionDocenteComponent {
  @Input({ required: true }) cursoId!: string;
  private pedidos = inject(PedidoService);
  private cert = inject(CertificadosService);

  abierto = signal(false);
  cargando = signal(false);
  error = signal<string | null>(null);
  alumnos = signal<Alumno[]>([]);
  abiertoId = signal<string | null>(null);
  detalle = signal<Record<string, Detalle>>({});
  ocupado = signal(false);
  mensaje = signal<{ ok: boolean; texto: string } | null>(null);

  fecha = fechaLima;
  etiquetaRec = etiquetaRecomendacion;
  etiquetaDec = etiquetaDecision;

  alternar(): void {
    this.abierto.update(v => !v);
    if (this.abierto() && this.alumnos().length === 0) this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const pedidos = await this.pedidos.obtenerParticipantesCurso(this.cursoId);
      const vistos = new Map<string, Alumno>();
      for (const p of pedidos || []) {
        const id = p?.estudianteId || p?.estudiante?.id;
        if (!id || vistos.has(id)) continue;
        const nombre = (p?.estudianteNombre || `${p?.estudiante?.nombres ?? ''} ${p?.estudiante?.apellidos ?? ''}`).trim();
        vistos.set(id, { id, nombre: nombre || `Estudiante ${String(id).slice(0, 8)}` });
      }
      this.alumnos.set([...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    } catch (err) {
      this.error.set(this.cert.mensaje(err, 'docente'));
    } finally {
      this.cargando.set(false);
    }
  }

  private fijar(id: string, d: Partial<Detalle>): void {
    this.detalle.update(m => ({ ...m, [id]: { ...(m[id] ?? { cargando: false, error: null, recomendacion: null, evidencia: null, estado: null, historial: null }), ...d } }));
  }

  abrir(a: Alumno): void {
    if (this.abiertoId() === a.id) { this.abiertoId.set(null); return; }
    this.abiertoId.set(a.id);
    this.mensaje.set(null);
    this.recargar(a);
  }

  async recargar(a: Alumno, error: string | null = null): Promise<void> {
    this.fijar(a.id, { cargando: true, error: null });
    try {
      const [recomendacion, evidencia, estado] = await Promise.all([
        this.cert.recomendacion(this.cursoId, a.id), this.cert.evidencia(this.cursoId, a.id), this.cert.estado(this.cursoId, a.id)
      ]);
      this.fijar(a.id, { cargando: false, error, recomendacion, evidencia, estado });
    } catch (err) {
      this.fijar(a.id, { cargando: false, error: this.cert.mensaje(err, 'docente') });
    }
  }

  async verHistorial(a: Alumno): Promise<void> {
    try {
      const h = await this.cert.historial(this.cursoId, a.id, 0, 50);
      this.fijar(a.id, { historial: h.items });
    } catch (err) {
      this.fijar(a.id, { error: this.cert.mensaje(err, 'docente') });
    }
  }

  async decidir(a: Alumno, decision: 'APROBADO' | 'NO_APROBADO', just: HTMLTextAreaElement): Promise<void> {
    const d = this.detalle()[a.id];
    const texto = (just.value || '').trim();
    if (!texto) { this.mensaje.set({ ok: false, texto: 'La justificación es obligatoria.' }); return; }
    if (!d?.evidencia) return;
    const version = d.estado ? d.estado.revision.version : -1;
    // Misma clave mientras se reintenta esta misma decision sobre la misma evidencia y version.
    const accion = `decision:${this.cursoId}:${a.id}:${decision}:${version}:${d.evidencia.evidenciaHash}`;
    await this.ejecutar(a, accion, () => this.cert.confirmar(this.cursoId, a.id, decision, texto, version,
      d.evidencia!.evidenciaHash, this.cert.claveDe(accion)), just, `Decisión registrada: ${etiquetaDecision(decision)}.`);
  }

  async revocar(a: Alumno, just: HTMLTextAreaElement): Promise<void> {
    const d = this.detalle()[a.id];
    const texto = (just.value || '').trim();
    if (!texto) { this.mensaje.set({ ok: false, texto: 'La justificación es obligatoria para revocar.' }); return; }
    if (!d?.estado || !d.evidencia) return;
    const accion = `revocar:${this.cursoId}:${a.id}:${d.estado.revision.version}:${d.evidencia.evidenciaHash}`;
    await this.ejecutar(a, accion, () => this.cert.revocar(this.cursoId, a.id, texto, d.estado!.revision.version,
      d.evidencia!.evidenciaHash, this.cert.claveDe(accion)), just, 'Decisión revocada.');
  }

  private async ejecutar(a: Alumno, accion: string, op: () => Promise<RevisionDecision>, just: HTMLTextAreaElement, ok: string): Promise<void> {
    this.ocupado.set(true);
    try {
      await op();
      this.cert.terminar(accion);
      just.value = '';
      this.mensaje.set({ ok: true, texto: ok });
      await this.recargar(a);
    } catch (err: any) {
      const texto = this.cert.mensaje(err, 'docente');
      // 409: datos cambiaron -> nueva lectura; la clave anterior ya no aplica.
      if (err?.status === 409 || err?.status === 400) { this.cert.terminar(accion); await this.recargar(a, texto); }
      else this.mensaje.set({ ok: false, texto });
    } finally {
      this.ocupado.set(false);
    }
  }
}
