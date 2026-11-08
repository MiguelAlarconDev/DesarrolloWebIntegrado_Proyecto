import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { TareasEstudianteComponent } from './tareas-estudiante.component';
import { AulaService, ModuloAula, MaterialAula, formatoTamano, UUID_RE } from '../../services/aula.service';

/**
 * Aula virtual del ESTUDIANTE: solo lectura y descarga. El acceso lo concede el backend
 * (pedido PAGADO verificado en cada peticion); no se usa sessionStorage como permiso.
 */
@Component({
  selector: 'app-aula-estudiante',
  standalone: true,
  imports: [DatePipe, RouterLink, TareasEstudianteComponent],
  styleUrl: './aula.css',
  template: `
  <section class="aula-page">
    <div class="container">
      <a routerLink="/mis-cursos" class="aula-back"><i class="fa fa-arrow-left me-1"></i> Volver a Mis Cursos</a>
      <header class="aula-header">
        <span class="aula-kicker"><i class="fa fa-graduation-cap me-1"></i> Aula Virtual</span>
        <h1>{{ cursoTitulo() }}</h1>
        <p>Materiales publicados por tu docente, organizados por módulo.</p>
      </header>

      @if (mensaje()) {
        <div class="alert alert-danger d-flex justify-content-between align-items-start gap-2" role="alert">
          <span>{{ mensaje() }}</span>
          <button type="button" class="btn-close" aria-label="Cerrar" (click)="mensaje.set(null)"></button>
        </div>
      }

      @if (!sesion) {
        <div class="aula-estado">
          <i class="fa fa-lock"></i>
          <h3>Inicia sesión para entrar al aula</h3>
          <a routerLink="/login" [queryParams]="{ redirect: 'mis-cursos' }" class="btn_one">Iniciar sesión</a>
        </div>
      } @else if (cargando()) {
        <div class="aula-estado"><span class="spinner-border text-success" role="status"></span><p>Cargando materiales…</p></div>
      } @else if (errorCarga()) {
        <div class="aula-estado aula-estado-error">
          <i class="fa fa-exclamation-triangle"></i>
          <p>{{ errorCarga() }}</p>
          @if (reintentable()) {
            <button type="button" class="btn btn-outline-secondary btn-sm" (click)="cargar()">Reintentar</button>
          }
        </div>
      } @else if (modulos().length === 0) {
        <div class="aula-estado">
          <i class="fa fa-folder-open-o"></i>
          <h3>Todavía no hay materiales</h3>
          <p>Tu docente aún no ha publicado contenido en esta aula.</p>
        </div>
      } @else {
        @for (mod of modulos(); track mod.id) {
          <article class="aula-card aula-modulo">
            <div class="aula-modulo-head">
              <h2><span class="aula-orden">{{ mod.orden }}</span> {{ mod.titulo }}</h2>
            </div>
            @if (mod.materiales.length === 0) {
              <p class="aula-vacio">Sin materiales en este módulo.</p>
            } @else {
              <ul class="aula-lista">
                @for (mat of mod.materiales; track mat.id) {
                  <li>
                    <span class="aula-tipo" [attr.data-tipo]="mat.tipo">{{ mat.tipo }}</span>
                    <div class="aula-lista-info">
                      <strong>{{ mat.titulo }}</strong>
                      <small>{{ mat.nombreOriginal }} · {{ tamano(mat.tamanoBytes) }} · {{ mat.publicadoEn | date:'dd/MM/yyyy' }}</small>
                    </div>
                    <button type="button" class="btn btn-outline-primary btn-sm fw-bold" [disabled]="ocupadoId() === mat.id"
                            (click)="descargar(mod, mat)">
                      @if (ocupadoId() === mat.id) { <span class="spinner-border spinner-border-sm"></span> }
                      @else { <i class="fa fa-download me-1"></i> Descargar }
                    </button>
                  </li>
                }
              </ul>
            }
            <app-tareas-estudiante [cursoId]="cursoId" [modulo]="mod" />
          </article>
        }
      }
    </div>
  </section>
  `
})
export class AulaEstudianteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private aula = inject(AulaService);

  cursoId = '';
  sesion = false;
  cursoTitulo = signal('Aula Virtual');
  modulos = signal<ModuloAula[]>([]);
  cargando = signal(true);
  errorCarga = signal<string | null>(null);
  reintentable = signal(false);
  ocupadoId = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  tamano = formatoTamano;

  ngOnInit(): void {
    this.cursoId = this.route.snapshot.paramMap.get('cursoId') || '';
    this.sesion = !!this.auth.getCurrentUser();
    if (this.sesion) {
      this.cargarTitulo();
      this.cargar();
    }
  }

  private async cargarTitulo(): Promise<void> {
    if (!UUID_RE.test(this.cursoId)) return;
    try {
      const curso = await this.api.request<{ titulo?: string }>(`/cursos/${this.cursoId}`);
      if (curso?.titulo) this.cursoTitulo.set(curso.titulo);
    } catch { /* el titulo es informativo */ }
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set(null);
    try {
      this.modulos.set(await this.aula.listar(this.cursoId));
    } catch (err: any) {
      this.errorCarga.set(this.aula.mensajeError(err, 'estudiante'));
      // 403/404 no cambian al reintentar; 503 o red si.
      this.reintentable.set(!err?.status || err.status >= 500);
    } finally {
      this.cargando.set(false);
    }
  }

  async descargar(mod: ModuloAula, mat: MaterialAula): Promise<void> {
    this.ocupadoId.set(mat.id);
    this.mensaje.set(null);
    try {
      await this.aula.descargar(this.cursoId, mod.id, mat.id);
    } catch (err) {
      this.mensaje.set(this.aula.mensajeError(err, 'estudiante'));
    } finally {
      this.ocupadoId.set(null);
    }
  }
}
