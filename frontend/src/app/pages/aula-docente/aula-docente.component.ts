import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AulaService, ModuloAula, MaterialAula, formatoTamano, UUID_RE } from '../../services/aula.service';

/**
 * Gestion del aula virtual por el DOCENTE asignado. La interfaz solo refleja lo que
 * permite el backend: cualquier operacion se vuelve a autorizar en cursos-service.
 */
@Component({
  selector: 'app-aula-docente',
  standalone: true,
  imports: [DatePipe, RouterLink],
  styleUrl: '../aula-estudiante/aula.css',
  template: `
  <section class="aula-page">
    <div class="container">
      <a routerLink="/portal-docente" class="aula-back"><i class="fa fa-arrow-left me-1"></i> Volver al portal docente</a>
      <header class="aula-header">
        <span class="aula-kicker"><i class="fa fa-graduation-cap me-1"></i> Aula Virtual · Gestión de materiales</span>
        <h1>{{ cursoTitulo() }}</h1>
        <p>Organiza el contenido por módulos (por ejemplo «Semana 1» o «Unidad 1») y publica archivos PDF, DOCX, PPTX o ZIP de hasta 10 MB.</p>
      </header>

      @if (mensaje(); as m) {
        <div class="alert d-flex justify-content-between align-items-start gap-2"
             [class.alert-success]="m.tipo === 'ok'" [class.alert-danger]="m.tipo === 'error'" role="alert">
          <span>{{ m.texto }}</span>
          <button type="button" class="btn-close" aria-label="Cerrar" (click)="mensaje.set(null)"></button>
        </div>
      }

      @if (!esDocente) {
        <div class="aula-estado">
          <i class="fa fa-lock"></i>
          <h3>Acceso solo para docentes</h3>
          <p>Inicia sesión con la cuenta del docente asignado a este curso.</p>
          <a routerLink="/login" class="btn_one">Iniciar sesión</a>
        </div>
      } @else if (cargando()) {
        <div class="aula-estado"><span class="spinner-border text-success" role="status"></span><p>Cargando el aula…</p></div>
      } @else if (errorCarga()) {
        <div class="aula-estado aula-estado-error">
          <i class="fa fa-exclamation-triangle"></i>
          <p>{{ errorCarga() }}</p>
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="cargar()">Reintentar</button>
        </div>
      } @else {
        <div class="aula-card aula-nuevo">
          <h2><i class="fa fa-plus-circle me-1"></i> Nuevo módulo</h2>
          <form class="row g-2 align-items-end" (submit)="$event.preventDefault(); crearModulo(tituloNuevo.value, ordenNuevo.value, tituloNuevo)">
            <div class="col-md-7 col-12">
              <label class="form-label" for="nuevo-titulo">Nombre</label>
              <input #tituloNuevo id="nuevo-titulo" class="form-control" maxlength="150" placeholder="Semana 1" required>
            </div>
            <div class="col-md-2 col-6">
              <label class="form-label" for="nuevo-orden">Orden</label>
              <input #ordenNuevo id="nuevo-orden" class="form-control" type="number" min="1" [value]="siguienteOrden()">
            </div>
            <div class="col-md-3 col-6">
              <button type="submit" class="btn btn-success w-100 fw-bold" [disabled]="guardando()">
                @if (guardando()) { <span class="spinner-border spinner-border-sm me-1"></span> } Crear módulo
              </button>
            </div>
          </form>
        </div>

        @if (modulos().length === 0) {
          <div class="aula-estado">
            <i class="fa fa-folder-open-o"></i>
            <h3>Aún no hay módulos</h3>
            <p>Crea el primero para empezar a publicar materiales.</p>
          </div>
        }

        @for (mod of modulos(); track mod.id) {
          <article class="aula-card aula-modulo">
            @if (editandoId() === mod.id) {
              <form class="row g-2 align-items-end mb-2"
                    (submit)="$event.preventDefault(); guardarModulo(mod, editTitulo.value, editOrden.value)">
                <div class="col-md-7 col-12">
                  <label class="form-label" [attr.for]="'t-' + mod.id">Nombre</label>
                  <input #editTitulo [id]="'t-' + mod.id" class="form-control" maxlength="150" [value]="mod.titulo" required>
                </div>
                <div class="col-md-2 col-4">
                  <label class="form-label" [attr.for]="'o-' + mod.id">Orden</label>
                  <input #editOrden [id]="'o-' + mod.id" class="form-control" type="number" min="1" [value]="mod.orden">
                </div>
                <div class="col-md-3 col-8 d-flex gap-2">
                  <button type="submit" class="btn btn-primary btn-sm fw-bold flex-fill" [disabled]="guardando()">Guardar</button>
                  <button type="button" class="btn btn-outline-secondary btn-sm flex-fill" (click)="editandoId.set(null)">Cancelar</button>
                </div>
              </form>
            } @else {
              <div class="aula-modulo-head">
                <h2><span class="aula-orden">{{ mod.orden }}</span> {{ mod.titulo }}</h2>
                <button type="button" class="btn btn-sm btn-outline-secondary" (click)="editandoId.set(mod.id)">
                  <i class="fa fa-pencil me-1"></i> Editar
                </button>
              </div>
            }

            <div class="aula-subida">
              <input #archivo type="file" class="form-control form-control-sm" accept=".pdf,.docx,.pptx,.zip"
                     [attr.aria-label]="'Archivo para ' + mod.titulo">
              <input #tituloArchivo class="form-control form-control-sm" maxlength="200" placeholder="Título (opcional)">
              <button type="button" class="btn btn-success btn-sm fw-bold" [disabled]="subiendoEn() !== null"
                      (click)="subir(mod, archivo, tituloArchivo)">
                @if (subiendoEn() === mod.id) { <span class="spinner-border spinner-border-sm me-1"></span> Subiendo… }
                @else { <i class="fa fa-upload me-1"></i> Subir }
              </button>
            </div>

            @if (mod.materiales.length === 0) {
              <p class="aula-vacio">Este módulo todavía no tiene materiales.</p>
            } @else {
              <div class="table-responsive">
                <table class="table align-middle aula-tabla">
                  <thead><tr><th>Material</th><th>Formato</th><th>Tamaño</th><th>Publicado</th><th class="text-end">Acciones</th></tr></thead>
                  <tbody>
                    @for (mat of mod.materiales; track mat.id) {
                      <tr>
                        <td><strong>{{ mat.titulo }}</strong><small class="d-block text-muted">{{ mat.nombreOriginal }}</small></td>
                        <td><span class="aula-tipo" [attr.data-tipo]="mat.tipo">{{ mat.tipo }}</span></td>
                        <td>{{ tamano(mat.tamanoBytes) }}</td>
                        <td>{{ mat.publicadoEn | date:'dd/MM/yyyy HH:mm' }}</td>
                        <td class="text-end text-nowrap">
                          @if (confirmandoId() === mat.id) {
                            <span class="me-2 small">¿Eliminar?</span>
                            <button type="button" class="btn btn-danger btn-sm" [disabled]="ocupadoId() === mat.id"
                                    (click)="eliminar(mod, mat)">Sí, eliminar</button>
                            <button type="button" class="btn btn-outline-secondary btn-sm ms-1" (click)="confirmandoId.set(null)">No</button>
                          } @else {
                            <button type="button" class="btn btn-outline-primary btn-sm" [disabled]="ocupadoId() === mat.id"
                                    (click)="descargar(mod, mat)"><i class="fa fa-download"></i> Descargar</button>
                            <button type="button" class="btn btn-outline-danger btn-sm ms-1" (click)="confirmandoId.set(mat.id)">
                              <i class="fa fa-trash"></i> Eliminar</button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </article>
        }
      }
    </div>
  </section>
  `
})
export class AulaDocenteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private aula = inject(AulaService);

  cursoId = '';
  esDocente = false;
  cursoTitulo = signal('Aula Virtual');
  modulos = signal<ModuloAula[]>([]);
  cargando = signal(true);
  errorCarga = signal<string | null>(null);
  guardando = signal(false);
  subiendoEn = signal<string | null>(null);
  ocupadoId = signal<string | null>(null);
  editandoId = signal<string | null>(null);
  confirmandoId = signal<string | null>(null);
  mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  siguienteOrden = computed(() => this.modulos().reduce((max, m) => Math.max(max, m.orden), 0) + 1);

  ngOnInit(): void {
    this.cursoId = this.route.snapshot.paramMap.get('cursoId') || '';
    // Solo decide que mostrar; el backend vuelve a validar rol y asignacion.
    this.esDocente = this.auth.getCurrentUser()?.rol === 'DOCENTE';
    if (this.esDocente) {
      this.cargarTitulo();
      this.cargar();
    }
  }

  tamano = formatoTamano;

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
    } catch (err) {
      this.errorCarga.set(this.aula.mensajeError(err, 'docente'));
    } finally {
      this.cargando.set(false);
    }
  }

  private ok(texto: string): void { this.mensaje.set({ tipo: 'ok', texto }); }
  private error(err: any): void { this.mensaje.set({ tipo: 'error', texto: this.aula.mensajeError(err, 'docente') }); }

  private validarModulo(titulo: string, orden: string): { titulo: string; orden: number } | null {
    const t = (titulo || '').trim();
    const o = Number(orden);
    if (!t || t.length > 150) {
      this.mensaje.set({ tipo: 'error', texto: 'El nombre del módulo es obligatorio (máximo 150 caracteres).' });
      return null;
    }
    if (!Number.isInteger(o) || o < 1) {
      this.mensaje.set({ tipo: 'error', texto: 'El orden debe ser un número entero mayor o igual a 1.' });
      return null;
    }
    return { titulo: t, orden: o };
  }

  async crearModulo(titulo: string, orden: string, input: HTMLInputElement): Promise<void> {
    const datos = this.validarModulo(titulo, orden);
    if (!datos) return;
    this.guardando.set(true);
    try {
      await this.aula.crearModulo(this.cursoId, datos.titulo, datos.orden);
      input.value = '';
      this.ok(`Módulo «${datos.titulo}» creado.`);
      await this.cargar();
    } catch (err) {
      this.error(err);
    } finally {
      this.guardando.set(false);
    }
  }

  async guardarModulo(mod: ModuloAula, titulo: string, orden: string): Promise<void> {
    const datos = this.validarModulo(titulo, orden);
    if (!datos) return;
    this.guardando.set(true);
    try {
      await this.aula.editarModulo(this.cursoId, mod.id, datos.titulo, datos.orden);
      this.editandoId.set(null);
      this.ok('Módulo actualizado.');
      await this.cargar();
    } catch (err) {
      this.error(err);
    } finally {
      this.guardando.set(false);
    }
  }

  async subir(mod: ModuloAula, input: HTMLInputElement, tituloInput: HTMLInputElement): Promise<void> {
    const archivo = input.files?.[0];
    const problema = this.aula.validarArchivoLocal(archivo);
    if (problema || !archivo) {
      this.mensaje.set({ tipo: 'error', texto: problema || 'Selecciona un archivo.' });
      return;
    }
    this.subiendoEn.set(mod.id);
    try {
      const creado = await this.aula.subirMaterial(this.cursoId, mod.id, archivo, tituloInput.value);
      input.value = '';
      tituloInput.value = '';
      this.ok(`Material «${creado.titulo}» publicado en ${mod.titulo}.`);
      await this.cargar();
    } catch (err) {
      this.error(err);
    } finally {
      this.subiendoEn.set(null);
    }
  }

  async descargar(mod: ModuloAula, mat: MaterialAula): Promise<void> {
    this.ocupadoId.set(mat.id);
    try {
      await this.aula.descargar(this.cursoId, mod.id, mat.id);
    } catch (err) {
      this.error(err);
    } finally {
      this.ocupadoId.set(null);
    }
  }

  async eliminar(mod: ModuloAula, mat: MaterialAula): Promise<void> {
    this.ocupadoId.set(mat.id);
    try {
      await this.aula.eliminarMaterial(this.cursoId, mod.id, mat.id);
      this.confirmandoId.set(null);
      this.ok(`Material «${mat.titulo}» eliminado.`);
      await this.cargar();
    } catch (err) {
      this.error(err);
    } finally {
      this.ocupadoId.set(null);
    }
  }
}
