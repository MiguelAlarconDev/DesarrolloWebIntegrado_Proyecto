import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { fechaLima } from '../../services/aula.service';
import { CertificadosService, VerificacionCertificado } from '../../services/certificados.service';

/** Verificacion publica de autenticidad por codigo (sin sesion; nombre enmascarado por el backend). */
@Component({
  selector: 'app-verificar-certificado',
  standalone: true,
  styleUrl: './certificados.css',
  template: `
  <section class="cert-page">
    <div class="container cert-verificar">
      <h1 class="cert-titulo">Verificar certificado</h1>
      <form class="d-flex gap-2 mb-3" (submit)="$event.preventDefault(); verificar(codigo.value)">
        <input #codigo class="form-control" placeholder="DWI-XXXX-XXXX-XXXX" maxlength="18" [value]="inicial" aria-label="Código del certificado">
        <button type="submit" class="btn btn-success" [disabled]="cargando()">Verificar</button>
      </form>
      @if (cargando()) { <p class="cert-vacio"><span class="spinner-border spinner-border-sm me-1"></span> Verificando…</p> }
      @if (resultado(); as r) {
        <div class="cert-estado cert-valido">
          <i class="fa fa-check-circle"></i>
          <h3>Certificado auténtico</h3>
          <p><strong>{{ r.estudiante }}</strong> aprobó <strong>{{ r.cursoTitulo }}</strong></p>
          <p>Emitido el {{ fecha(r.fechaEmision) }} · Código {{ r.codigo }}</p>
          <small class="d-block text-muted">SHA-256 del PDF original: {{ r.pdfSha256 }}</small>
        </div>
      }
      @if (noValido()) {
        <div class="cert-estado cert-invalido"><i class="fa fa-times-circle"></i><h3>No se encontró un certificado válido con ese código</h3></div>
      }
      @if (error()) { <div class="alert alert-warning">{{ error() }}</div> }
    </div>
  </section>
  `
})
export class VerificarCertificadoComponent implements OnInit {
  private cert = inject(CertificadosService);
  private route = inject(ActivatedRoute);
  inicial = '';
  cargando = signal(false);
  resultado = signal<VerificacionCertificado | null>(null);
  noValido = signal(false);
  error = signal<string | null>(null);
  fecha = fechaLima;

  ngOnInit(): void {
    this.inicial = this.route.snapshot.queryParamMap.get('codigo') || '';
    if (this.inicial) this.verificar(this.inicial);
  }

  async verificar(codigo: string): Promise<void> {
    this.cargando.set(true); this.resultado.set(null); this.noValido.set(false); this.error.set(null);
    try { this.resultado.set(await this.cert.verificar(codigo)); }
    catch (err: any) {
      if (err?.status === 404) this.noValido.set(true);
      else this.error.set(this.cert.mensaje(err, 'estudiante'));
    } finally { this.cargando.set(false); }
  }
}
