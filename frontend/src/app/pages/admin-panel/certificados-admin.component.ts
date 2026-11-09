import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { fechaLima, formatoTamano } from '../../services/aula.service';
import { CertificadosService, AprobadoVigente, Certificado, EventoCertificado, Pagina } from '../../services/certificados.service';

/** Seccion "Certificaciones" del portal ADMIN: aprobados vigentes, emision individual y gestion. */
@Component({
  selector: 'app-certificados-admin',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  styleUrl: '../aula-estudiante/certificados.css',
  template: `
  <section class="cert-page">
    <div class="container">
      <a routerLink="/portal-admin" class="cert-back"><i class="fa fa-arrow-left me-1"></i> Volver al portal administrador</a>
      <h1 class="cert-titulo">Certificaciones académicas</h1>
      <p class="cert-ayuda">Solo se listan decisiones APROBADO vigentes. Al emitir, el servidor vuelve a verificar la matrícula pagada,
        la vigencia académica y la evidencia; un certificado nunca se emite sobre una aprobación desactualizada.</p>

      @if (!esAdmin) {
        <div class="cert-estado"><h3>Acceso solo para administradores</h3><a routerLink="/login" class="btn_one">Iniciar sesión</a></div>
      } @else {
        @if (mensaje(); as m) {
          <div class="alert d-flex justify-content-between gap-2" [class.alert-success]="m.ok" [class.alert-danger]="!m.ok" role="alert">
            <span>{{ m.texto }}</span><button type="button" class="btn-close" aria-label="Cerrar" (click)="mensaje.set(null)"></button>
          </div>
        }
        <div class="cert-tabs" role="tablist">
          <button type="button" role="tab" [class.activa]="tab() === 'aprobados'" (click)="tab.set('aprobados')">Aprobados vigentes</button>
          <button type="button" role="tab" [class.activa]="tab() === 'emitidos'" (click)="verEmitidos()">Certificados</button>
        </div>

        @if (tab() === 'aprobados') {
          @if (cargando()) { <p class="cert-vacio"><span class="spinner-border spinner-border-sm me-1"></span> Cargando…</p> }
          @else if (aprobados(); as p) {
            @if (p.items.length === 0) { <div class="cert-estado"><p>No hay aprobaciones vigentes pendientes de certificar.</p></div> }
            @else {
              <div class="table-responsive">
                <table class="table align-middle cert-tabla">
                  <thead><tr><th>Estudiante</th><th>Curso</th><th>Aprobado</th><th>Certificado</th><th class="text-end">Acción</th></tr></thead>
                  <tbody>
                    @for (a of p.items; track a.cursoId + a.estudianteId) {
                      <tr>
                        <td>{{ a.estudianteNombre || ('ID ' + a.estudianteId.slice(0, 8)) }}</td>
                        <td>{{ a.cursoTitulo }}</td>
                        <td>{{ fecha(a.decididoEn) }}</td>
                        <td>@if (a.certificadoCodigo) { <code>{{ a.certificadoCodigo }}</code> <span class="cert-badge" [attr.data-estado]="a.certificadoEstado">{{ a.certificadoEstado }}</span> } @else { — }</td>
                        <td class="text-end">
                          @if (a.certificadoEstado !== 'EMITIDO') {
                            <button type="button" class="btn btn-success btn-sm" [disabled]="emitiendo() !== null" (click)="emitir(a)">
                              @if (emitiendo() === a.cursoId + a.estudianteId) { <span class="spinner-border spinner-border-sm me-1"></span> Emitiendo… }
                              @else { Emitir certificado }
                            </button>
                          } @else { <span class="text-success small">Emitido</span> }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <ng-container *ngTemplateOutlet="paginacion; context: { $implicit: p, ir: irAprobados }"></ng-container>
            }
          }
        } @else {
          @if (cargando()) { <p class="cert-vacio"><span class="spinner-border spinner-border-sm me-1"></span> Cargando…</p> }
          @else if (emitidos(); as p) {
            @if (p.items.length === 0) { <div class="cert-estado"><p>Aún no se ha emitido ningún certificado.</p></div> }
            @else {
              <div class="table-responsive">
                <table class="table align-middle cert-tabla">
                  <thead><tr><th>Código</th><th>Estudiante</th><th>Curso</th><th>Fecha</th><th>Estado</th><th class="text-end">Acciones</th></tr></thead>
                  <tbody>
                    @for (c of p.items; track c.id) {
                      <tr>
                        <td><code>{{ c.codigo }}</code></td><td>{{ c.estudianteNombre }}</td><td>{{ c.cursoTitulo }}</td>
                        <td>{{ fecha(c.fechaEmision) }}</td>
                        <td><span class="cert-badge" [attr.data-estado]="c.estado">{{ c.estado }}</span></td>
                        <td class="text-end text-nowrap">
                          @if (c.estado === 'EMITIDO') {
                            <button type="button" class="btn btn-outline-primary btn-sm" (click)="descargar(c)"><i class="fa fa-download"></i> PDF</button>
                          }
                          <button type="button" class="btn btn-outline-secondary btn-sm ms-1" (click)="verEventos(c)">Historial</button>
                        </td>
                      </tr>
                      @if (eventosDe() === c.id) {
                        <tr><td colspan="6">
                          <ul class="cert-historial">
                            @for (e of eventos(); track $index) { <li><strong>{{ e.evento }}</strong> · {{ fecha(e.fecha) }} @if (e.detalle) { · {{ e.detalle }} }</li> }
                          </ul>
                          <small class="text-muted">SHA-256 del PDF: {{ c.pdfSha256 }} · {{ tamano(c.tamanoBytes) }}</small>
                        </td></tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
              <ng-container *ngTemplateOutlet="paginacion; context: { $implicit: p, ir: irEmitidos }"></ng-container>
            }
          }
        }
      }
    </div>
  </section>

  <ng-template #paginacion let-p let-ir="ir">
    @if (p.totalPages > 1) {
      <div class="d-flex justify-content-center align-items-center gap-2">
        <button type="button" class="btn btn-outline-secondary btn-sm" [disabled]="p.page === 0" (click)="ir(p.page - 1)">Anterior</button>
        <span class="small">Página {{ p.page + 1 }} de {{ p.totalPages }}</span>
        <button type="button" class="btn btn-outline-secondary btn-sm" [disabled]="p.page + 1 >= p.totalPages" (click)="ir(p.page + 1)">Siguiente</button>
      </div>
    }
  </ng-template>
  `
})
export class CertificadosAdminComponent implements OnInit {
  private cert = inject(CertificadosService);
  private auth = inject(AuthService);

  esAdmin = false;
  tab = signal<'aprobados' | 'emitidos'>('aprobados');
  cargando = signal(false);
  aprobados = signal<Pagina<AprobadoVigente> | null>(null);
  emitidos = signal<Pagina<Certificado> | null>(null);
  emitiendo = signal<string | null>(null);
  eventosDe = signal<string | null>(null);
  eventos = signal<EventoCertificado[]>([]);
  mensaje = signal<{ ok: boolean; texto: string } | null>(null);
  fecha = fechaLima;
  tamano = formatoTamano;
  readonly size = 20;

  ngOnInit(): void {
    this.esAdmin = this.auth.getCurrentUser()?.rol === 'ADMIN'; // solo presentacion; el backend exige ADMIN
    if (this.esAdmin) this.irAprobados(0);
  }

  irAprobados = async (page: number): Promise<void> => {
    this.cargando.set(true);
    try { this.aprobados.set(await this.cert.aprobados(Math.max(0, page), this.size)); }
    catch (err) { this.mensaje.set({ ok: false, texto: this.cert.mensaje(err, 'admin') }); }
    finally { this.cargando.set(false); }
  };

  irEmitidos = async (page: number): Promise<void> => {
    this.cargando.set(true);
    try { this.emitidos.set(await this.cert.certificados(Math.max(0, page), this.size)); }
    catch (err) { this.mensaje.set({ ok: false, texto: this.cert.mensaje(err, 'admin') }); }
    finally { this.cargando.set(false); }
  };

  verEmitidos(): void { this.tab.set('emitidos'); this.irEmitidos(0); }

  async emitir(a: AprobadoVigente): Promise<void> {
    const accion = `emitir:${a.cursoId}:${a.estudianteId}`;
    this.emitiendo.set(a.cursoId + a.estudianteId);
    try {
      const c = await this.cert.emitir(a.cursoId, a.estudianteId, this.cert.claveDe(accion));
      if (c.estado === 'EMITIDO') {
        this.cert.terminar(accion);
        this.mensaje.set({ ok: true, texto: `Certificado ${c.codigo} emitido para ${c.estudianteNombre}.` });
      } else if (c.estado === 'FALLIDO') {
        this.cert.terminar(accion);
        this.mensaje.set({ ok: false, texto: 'La emisión anterior con esta solicitud falló. Vuelve a intentarlo.' });
      } else {
        this.mensaje.set({ ok: false, texto: 'La emisión sigue en curso. Actualiza en unos segundos.' });
      }
    } catch (err: any) {
      // 503 (red/almacenamiento): se conserva la clave para un reintento idempotente.
      if (err?.status !== 503 && err?.status) this.cert.terminar(accion);
      this.mensaje.set({ ok: false, texto: this.cert.mensaje(err, 'admin') });
    } finally {
      this.emitiendo.set(null);
      await this.irAprobados(this.aprobados()?.page ?? 0);
    }
  }

  async verEventos(c: Certificado): Promise<void> {
    if (this.eventosDe() === c.id) { this.eventosDe.set(null); return; }
    try { this.eventos.set(await this.cert.eventos(c.id)); this.eventosDe.set(c.id); }
    catch (err) { this.mensaje.set({ ok: false, texto: this.cert.mensaje(err, 'admin') }); }
  }

  async descargar(c: Certificado): Promise<void> {
    try { await this.cert.descargar(c.id); }
    catch (err) { this.mensaje.set({ ok: false, texto: this.cert.mensaje(err, 'admin') }); }
  }
}
