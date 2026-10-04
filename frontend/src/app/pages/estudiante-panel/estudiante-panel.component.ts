import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { Pedido } from '../../models/pedido.model';

@Component({
  selector: 'app-estudiante-panel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="flex-1 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 mb-8 gap-4">
          <div>
            <nav class="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Campus Digital</span>
              <i class="fa-solid fa-chevron-right text-[10px]"></i>
              <span class="text-slate-800 font-medium">Panel del Estudiante</span>
            </nav>
            <h1 class="font-heading font-extrabold text-2xl text-slate-900">
              Mis Cursos y Comprobantes
            </h1>
            <p class="text-xs text-slate-500">
              Bienvenido de nuevo, {{ user?.nombres || 'Carlos' }}. Consulta tus salas de clase y documentos tributarios.
            </p>
          </div>

          <a routerLink="/" class="inline-flex items-center gap-2 px-4 py-2 bg-brand-900 hover:bg-brand-800 text-white rounded-lg text-xs font-bold shadow-sm transition">
            <i class="fa-solid fa-plus"></i> Matricularme en otro curso
          </a>
        </div>

        <!-- 3 KPIs -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-brand-700 flex items-center justify-center text-xl">
              <i class="fa-solid fa-book-open"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-slate-500 block">Cursos Matriculados</span>
              <span class="font-heading font-extrabold text-2xl text-slate-900">{{ pedidos.length }}</span>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
              <i class="fa-solid fa-video"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-slate-500 block">Salas Meet Habilitadas</span>
              <span class="font-heading font-extrabold text-2xl text-slate-900">{{ pedidos.length }}</span>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
              <i class="fa-solid fa-file-invoice"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-slate-500 block">Comprobantes SUNAT</span>
              <span class="font-heading font-extrabold text-2xl text-slate-900">{{ pedidos.length }} Boletas</span>
            </div>
          </div>
        </div>

        <!-- Section 1: Mis Cursos Activos -->
        <div class="mb-10">
          <h2 class="font-heading font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-graduation-cap text-brand-600"></i> Mis Cursos Activos
          </h2>

          @if (loading) {
            <div class="bg-white rounded-xl p-12 text-center border border-slate-200">
              <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-600 mb-2"></i>
              <p class="text-xs text-slate-500">Cargando tus cursos matriculados...</p>
            </div>
          } @else if (pedidos.length === 0) {
            <div class="bg-white rounded-xl p-12 text-center border border-slate-200">
              <i class="fa-solid fa-graduation-cap text-4xl text-slate-300 mb-3"></i>
              <h4 class="font-bold text-sm text-slate-800 mb-1">No tienes matrículas activas</h4>
              <p class="text-xs text-slate-500 mb-4">Explora nuestro catálogo y empieza tu especialización hoy.</p>
              <a routerLink="/" class="px-4 py-2 bg-brand-900 text-white font-bold text-xs rounded-lg shadow-sm">
                Ver Catálogo de Cursos
              </a>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              @for (p of pedidos; track p.id) {
                <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-3">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                        {{ p.modalidad || 'VIRTUAL' }}
                      </span>
                      <span class="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <i class="fa-solid fa-circle-check"></i> {{ p.estado }}
                      </span>
                    </div>

                    <h3 class="font-heading font-bold text-base text-slate-900 mb-1">
                      {{ p.cursoTitulo || 'Curso Especializado' }}
                    </h3>
                    <p class="text-xs text-slate-500 mb-4">{{ p.horario || 'Horario oficial confirmado' }}</p>

                    <!-- Class Link Container -->
                    <div class="p-3.5 bg-blue-50/60 border border-blue-100 rounded-lg mb-4 text-xs">
                      <span class="text-[11px] font-bold text-blue-900 block mb-1">
                        @if (p.modalidad === 'PRESENCIAL') {
                          Aula Presencial:
                        } @else {
                          Enlace de Clase (Google Meet / Zoom):
                        }
                      </span>

                      @if (p.modalidad === 'PRESENCIAL') {
                        <p class="font-medium text-slate-800">{{ p.direccionClase || 'Campus Central - Aula 204' }}</p>
                      } @else {
                        <div class="flex items-center justify-between gap-2">
                          <span class="font-mono text-blue-700 truncate text-[11px]">
                            {{ p.enlaceClase || 'https://meet.google.com/abc-defg-hij' }}
                          </span>
                          <a 
                            [href]="p.enlaceClase || 'https://meet.google.com/abc-defg-hij'" 
                            target="_blank" 
                            class="px-2.5 py-1 bg-brand-900 hover:bg-brand-800 text-white font-bold text-[10px] rounded flex-shrink-0 transition">
                            Entrar
                          </a>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span class="text-slate-400">Orden: {{ p.codigoOrden }}</span>
                    <a 
                      [href]="getPdfUrl(p.id)" 
                      target="_blank" 
                      class="text-brand-700 font-bold hover:underline flex items-center gap-1 text-xs">
                      <i class="fa-solid fa-file-pdf text-red-600"></i> Descargar Boleta PDF
                    </a>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Section 2: Historial de Comprobantes SUNAT -->
        <div>
          <h2 class="font-heading font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-receipt text-brand-600"></i> Historial de Comprobantes Electrónicos (SUNAT)
          </h2>

          <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-600">
                <thead class="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th class="px-6 py-3">Código Orden</th>
                    <th class="px-6 py-3">Curso</th>
                    <th class="px-6 py-3">Monto</th>
                    <th class="px-6 py-3">Estado</th>
                    <th class="px-6 py-3 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  @for (p of pedidos; track p.id) {
                    <tr class="hover:bg-slate-50 transition">
                      <td class="px-6 py-4 font-mono font-bold text-slate-800">{{ p.codigoOrden }}</td>
                      <td class="px-6 py-4 text-slate-800 font-semibold">{{ p.cursoTitulo || 'Curso Especializado' }}</td>
                      <td class="px-6 py-4 font-extrabold text-slate-900">S/ {{ p.monto | number:'1.2-2' }}</td>
                      <td class="px-6 py-4">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {{ p.estado }}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-right">
                        <a 
                          [href]="getPdfUrl(p.id)" 
                          target="_blank" 
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition">
                          <i class="fa-solid fa-file-pdf text-red-600"></i> Boleta PDF
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class EstudiantePanelComponent implements OnInit {
  private pedidoService = inject(PedidoService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  user = this.auth.currentUser();
  pedidos: Pedido[] = [];
  loading = true;

  ngOnInit(): void {
    const estudianteId = this.user?.id || 'a0000000-0000-0000-0000-000000000003';
    this.pedidoService.listarPorEstudiante(estudianteId).subscribe({
      next: (data) => {
        this.pedidos = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getPdfUrl(pedidoId: string): string {
    return this.pedidoService.getComprobantePdfUrl(pedidoId);
  }
}
