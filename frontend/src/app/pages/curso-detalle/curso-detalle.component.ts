import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { CursoModel } from '../../services/config.data';
import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.Emulated,
  styles: [`
    :host { display: block; color: #243449; }
    .detail-page { background: #f7f9fc; padding: 125px 0 64px; }
    .detail-shell { width: calc(100% - 32px); max-width: 1180px; margin: auto; }
    .detail-breadcrumb { margin-bottom: 24px; font-size: .9rem; }
    .detail-breadcrumb a, .section-nav button { color: #14663b; text-decoration: underline; text-underline-offset: 4px; }
    .section-nav button { background: none; border: 0; padding: 0; font: inherit; text-align: left; cursor: pointer; }
    .detail-header { margin-bottom: 28px; overflow-wrap: anywhere; }
    .detail-header h1 { font-size: clamp(1.75rem, 4vw, 2.75rem); line-height: 1.2; color: #192e52; margin: 12px 0; }
    .detail-kicker { color: #14663b; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; font-size: .8rem; }
    .detail-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 28px; align-items: start; }
    .detail-main, .enrollment-card { min-width: 0; }
    .detail-card { background: #fff; border: 1px solid #dce3eb; border-radius: 16px; padding: 28px; overflow-wrap: anywhere; }
    .detail-main .detail-card + .detail-card { margin-top: 20px; }
    .detail-image { width: 100%; max-height: 420px; object-fit: contain; display: block; border-radius: 12px; }
    .image-empty { padding: 32px 16px; text-align: center; color: #536276; background: #f1f5f9; border-radius: 12px; }
    .section-nav { display: flex; flex-wrap: wrap; gap: 12px 24px; margin: 24px 0; }
    .detail-section { scroll-margin-top: 150px; }
    .detail-card h2 { font-size: 1.35rem; color: #192e52; margin: 0 0 20px; }
    .detail-description { white-space: pre-line; margin: 0; line-height: 1.8; }
    .detail-info { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 12px 20px; margin: 0; }
    .detail-info dt { font-weight: 600; } .detail-info dd { margin: 0; }
    .enrollment-card { box-shadow: 0 10px 30px rgba(25, 46, 82, .07); }
    .detail-price { display: block; color: #192e52; font-size: clamp(1.8rem, 3vw, 2.4rem); margin: 8px 0 24px; line-height: 1.25; }
    .enrollment-status { padding: 16px; border-radius: 10px; background: #f1f5f9; margin-bottom: 20px; }
    .enrollment-status.paid { background: #edf8f1; color: #14532d; }
    .detail-actions { display: flex; flex-wrap: wrap; gap: 12px; }
    .enrollment-card .detail-actions { flex-direction: column; }
    .detail-actions button, .detail-actions a { padding: 12px 16px; white-space: normal; overflow-wrap: anywhere; border-radius: 8px; text-align: center; }
    .primary-action { background: #14663b; color: #fff; border: 1px solid #14663b; font-weight: 700; }
    .primary-action:hover:not(:disabled) { background: #104e2e; }
    .primary-action:disabled { background: #e2e8f0; color: #475569; border-color: #cbd5e1; cursor: not-allowed; }
    .secondary-action { border: 1px solid #718096; color: #243449; background: #fff; text-decoration: none; }
    button:focus-visible, a:focus-visible { outline: 3px solid #14663b; outline-offset: 4px; }
    .error-card { border-left: 4px solid #a16207; }
    @media (max-width: 991.98px) { .detail-grid { grid-template-columns: minmax(0, 1fr); } }
    @media (max-width: 575.98px) {
      .detail-page { padding-top: 120px; }
      .detail-card { padding: 20px 16px; }
      .detail-info { grid-template-columns: minmax(0, 1fr); gap: 4px; }
      .detail-info dd { margin-bottom: 12px; }
    }
  `],
  template: `
    <div class="detail-page">
      <div class="detail-shell" [attr.aria-busy]="estado === 'cargando'">
        <nav class="detail-breadcrumb" aria-label="Ubicación">
          <a href="/cursos">Cursos</a> <span aria-hidden="true"> / </span>
          <span aria-current="page">Detalle del curso</span>
        </nav>
        <header class="detail-header">
          <span class="detail-kicker">Información del curso</span>
          <h1>{{ activeCurso?.titulo || 'Detalle de capacitación' }}</h1>
        </header>
        @if (estado === 'cargando') {
          <div class="detail-card" role="status">Cargando información del curso…</div>
        } @else if (estado !== 'listo') {
          <div class="detail-card error-card" role="alert">
            @if (estado === 'no-encontrado') {
              <h2>Curso no encontrado</h2><p>El curso solicitado no está disponible.</p>
            } @else if (estado === 'conexion') {
              <h2>No pudimos conectar con el servicio de cursos</h2><p>Inténtalo nuevamente. No se ha habilitado la inscripción.</p>
            } @else {
              <h2>No pudimos validar la información del curso</h2><p>El servicio devolvió una respuesta errónea. No se ha habilitado la inscripción.</p>
            }
            <div class="detail-actions">
              <button type="button" class="primary-action" (click)="initDetalle(requestedId)">Reintentar</button>
              <a href="/cursos" class="secondary-action">Volver al catálogo</a>
            </div>
          </div>
        }
        @if (estado === 'listo' && activeCurso; as curso) {
          <div class="detail-grid">
            <div class="detail-main">
              <div class="detail-card">
                @if (curso.imagen && !imagenFallida) {
                  <img [src]="curso.imagen" [alt]="curso.titulo" class="detail-image" (error)="imagenFallida = true">
                } @else {
                  <div class="image-empty">Imagen no disponible</div>
                }
                <nav class="section-nav" aria-label="Secciones del curso">
                  @if (curso.descripcion) { <button type="button" aria-controls="descripcion-curso" (click)="descripcion.focus({preventScroll: true}); descripcion.scrollIntoView({block: 'start'})">Descripción</button> }
                  <button type="button" aria-controls="informacion-curso" (click)="informacion.focus({preventScroll: true}); informacion.scrollIntoView({block: 'start'})">Información del curso</button>
                </nav>
                <section #descripcion id="descripcion-curso" tabindex="-1" class="detail-section" aria-labelledby="titulo-descripcion">
                  <h2 id="titulo-descripcion">Descripción y objetivos</h2>
                  <p class="detail-description">{{ curso.descripcion || 'Descripción no disponible.' }}</p>
                </section>
              </div>
              <section #informacion id="informacion-curso" tabindex="-1" class="detail-card detail-section" aria-labelledby="titulo-informacion">
                <h2 id="titulo-informacion">Información del curso</h2>
                <dl class="detail-info">
                  <dt>Modalidad</dt><dd>{{ curso.modalidad || 'No disponible' }}</dd>
                  <dt>Horario</dt><dd>{{ curso.horario || 'No disponible' }}</dd>
                  @if (curso.docente) { <dt>Docente</dt><dd>{{ curso.docente }}</dd> }
                  @if (curso.modalidad === 'PRESENCIAL') {
                    <dt>Sede</dt><dd>{{ curso.direccionClase || 'No disponible' }}</dd>
                    <dt>Aula</dt><dd>{{ curso.aula || 'No disponible' }}</dd>
                  }
                </dl>
              </section>
            </div>
            <aside class="detail-card enrollment-card" aria-labelledby="titulo-inscripcion">
              <h2 id="titulo-inscripcion">Inscripción</h2>
              <span>Precio del curso</span>
              <strong class="detail-price">S/ {{ curso.precio.toFixed(2) }}</strong>
              <p class="enrollment-status" [class.paid]="isPaid" role="status">
                @if (isPaid) { Ya estás matriculado en este curso. }
                @else if (curso.aforoDisponible <= 0) { Aforo completo (0 vacantes disponibles). }
                @else {
                  @if (inCart) { Curso en tu carrito. }
                  Quedan {{ curso.aforoDisponible }} vacantes de {{ curso.aforoMaximo }}.
                }
              </p>
              <div class="detail-actions">
                <button id="btn-enroll-action" type="button" class="primary-action"
                  [disabled]="!isPaid && curso.aforoDisponible <= 0" (click)="inscribirme()">
                  {{ isPaid ? 'Ir a Mis Clases' : curso.aforoDisponible <= 0 ? 'Vacantes agotadas' : 'Inscribirme' }}
                </button>
                <a href="/carrito" class="secondary-action">Ver carrito</a>
                <a href="/cursos" class="secondary-action">Volver al catálogo</a>
              </div>
            </aside>
          </div>
        }
      </div>
    </div>
  `
})
export class CursoDetalleComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cursoService = inject(CursoService);
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;
  private requestVersion = 0;
  private redirectTimer?: ReturnType<typeof setTimeout>;

  estado: 'cargando' | 'listo' | 'no-encontrado' | 'conexion' | 'error' = 'cargando';
  activeCurso: CursoModel | null = null;
  requestedId = '';
  isPaid = false;
  inCart = false;
  imagenFallida = false;

  ngOnInit(): void {
    this.sub = combineLatest([this.route.params, this.route.queryParams]).subscribe(([params, queryParams]) => {
      void this.initDetalle(params['id'] || queryParams['id'] || '');
    });
  }

  async initDetalle(id: string): Promise<void> {
    const version = ++this.requestVersion;
    clearTimeout(this.redirectTimer);
    this.requestedId = id;
    this.activeCurso = null;
    this.estado = 'cargando';
    this.isPaid = false;
    this.inCart = false;
    this.imagenFallida = false;
    try {
      const curso = await this.cursoService.getCursoDetalle(id);
      if (version !== this.requestVersion) return;
      const user = this.authService.getCurrentUser();
      let isPaid = user ? this.pedidoService.getCachedPaidCourseIds().has(id) : false;
      if (user) {
        try {
          const matriculas = await this.pedidoService.getMisMatriculas(user.id);
          isPaid = (matriculas || []).some(m => {
            const cid = (m.curso && m.curso.id) ? m.curso.id : (m.cursoId || m.id);
            return m.estado === 'PAGADO' && cid === id;
          });
        } catch (_) {}
      }
      if (version !== this.requestVersion) return;
      this.activeCurso = curso;
      this.isPaid = isPaid;
      this.inCart = this.cartService.isInCart(curso.id);
      this.estado = 'listo';
      this.cartService.updateBadge();
      this.authService.updateNavbar();
    } catch (error: any) {
      if (version !== this.requestVersion) return;
      this.activeCurso = null;
      this.estado = error?.status === 404 ? 'no-encontrado'
        : !error?.status || [502, 503, 504].includes(error.status) ? 'conexion' : 'error';
    } finally {
      if (version === this.requestVersion) this.cdr.markForCheck();
    }
  }

  inscribirme(): void {
    const curso = this.activeCurso;
    if (this.estado !== 'listo' || !curso || curso.id.toLowerCase() !== this.requestedId.toLowerCase()) return;
    if (this.isPaid) {
      this.router.navigateByUrl('/mis-cursos');
      return;
    }
    if (curso.aforoDisponible <= 0) return;
    const res = this.cartService.addToCart(curso);
    this.inCart = this.cartService.isInCart(curso.id);
    this.cartService.bumpBadge();
    this.notifications.showToast(res.message || '¡Curso agregado al carrito!', 'success');
    clearTimeout(this.redirectTimer);
    this.redirectTimer = setTimeout(() => this.router.navigateByUrl('/carrito'), 300);
  }

  ngOnDestroy(): void {
    ++this.requestVersion;
    clearTimeout(this.redirectTimer);
    this.sub?.unsubscribe();
  }
}
