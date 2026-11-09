import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { fechaLima } from '../../services/aula.service';
import { CertificadosService, Certificado } from '../../services/certificados.service';

/** "Mis certificados": solo los certificados EMITIDOS del estudiante autenticado (filtrado por el backend). */
@Component({
  selector: 'app-mis-certificados',
  standalone: true,
  imports: [RouterLink],
  styleUrl: './certificados.css',
  template: `
  <section class="cert-page">
    <div class="container">
      <a routerLink="/mis-cursos" class="cert-back"><i class="fa fa-arrow-left me-1"></i> Volver a Mis Cursos</a>
      <h1 class="cert-titulo">Mis certificados</h1>
      @if (error()) { <div class="alert alert-danger" role="alert">{{ error() }}</div> }
      @if (!sesion) {
        <div class="cert-estado"><h3>Inicia sesión para ver tus certificados</h3>
          <a routerLink="/login" [queryParams]="{ redirect: 'mis-cursos' }" class="btn_one">Iniciar sesión</a></div>
      } @else if (cargando()) {
        <p class="cert-vacio"><span class="spinner-border spinner-border-sm me-1"></span> Cargando certificados…</p>
      } @else if (lista().length === 0 && !error()) {
        <div class="cert-estado"><i class="fa fa-certificate"></i><h3>Aún no tienes certificados</h3>
          <p>Cuando tu docente apruebe un curso y se emita el certificado, aparecerá aquí.</p></div>
      } @else {
        <div class="cert-grid">
          @for (c of lista(); track c.id) {
            <article class="cert-tarjeta">
              <i class="fa fa-certificate cert-icono"></i>
              <h2>{{ c.cursoTitulo }}</h2>
              <p class="mb-1">Emitido el {{ fecha(c.fechaEmision) }}</p>
              <p class="mb-2">Código: <code>{{ c.codigo }}</code></p>
              <div class="d-flex gap-2 flex-wrap">
                <button type="button" class="btn btn-success btn-sm" [disabled]="ocupado() === c.id" (click)="descargar(c)">
                  <i class="fa fa-download me-1"></i> Ver / descargar PDF</button>
                <a class="btn btn-outline-secondary btn-sm" routerLink="/verificar-certificado" [queryParams]="{ codigo: c.codigo }">Verificar autenticidad</a>
              </div>
            </article>
          }
        </div>
      }
    </div>
  </section>
  `
})
export class MisCertificadosComponent implements OnInit {
  private cert = inject(CertificadosService);
  private auth = inject(AuthService);
  sesion = false;
  cargando = signal(true);
  lista = signal<Certificado[]>([]);
  error = signal<string | null>(null);
  ocupado = signal<string | null>(null);
  fecha = fechaLima;

  async ngOnInit(): Promise<void> {
    this.sesion = !!this.auth.getCurrentUser();
    if (!this.sesion) { this.cargando.set(false); return; }
    try { this.lista.set(await this.cert.mios()); }
    catch (err) { this.error.set(this.cert.mensaje(err, 'estudiante')); }
    finally { this.cargando.set(false); }
  }

  async descargar(c: Certificado): Promise<void> {
    this.ocupado.set(c.id);
    try { await this.cert.descargar(c.id); }
    catch (err) { this.error.set(this.cert.mensaje(err, 'estudiante')); }
    finally { this.ocupado.set(null); }
  }
}
