import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import { Pedido } from '../../models/pedido.model';

@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="flex-1 py-10">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <!-- Stepper Indicator -->
        <div class="flex items-center justify-center max-w-xl mx-auto">
          <div class="flex items-center text-emerald-600 text-xs font-semibold">
            <span class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mr-2 text-[11px] font-bold">✔</span>
            <span>1. Selección</span>
          </div>
          <div class="flex-1 h-0.5 bg-emerald-500 mx-4"></div>
          <div class="flex items-center text-emerald-600 text-xs font-semibold">
            <span class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mr-2 text-[11px] font-bold">✔</span>
            <span>2. Facturación y Pago</span>
          </div>
          <div class="flex-1 h-0.5 bg-emerald-500 mx-4"></div>
          <div class="flex items-center text-emerald-700 text-xs font-bold">
            <span class="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center mr-2 text-[11px] font-bold">✔</span>
            <span>3. Confirmación</span>
          </div>
        </div>

        @if (loading) {
          <div class="bg-white rounded-xl p-16 text-center border border-slate-200">
            <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-600 mb-3"></i>
            <p class="text-xs text-slate-500">Cargando confirmación de matrícula...</p>
          </div>
        } @else if (pedido) {
          
          <!-- Success Banner -->
          <div class="bg-gradient-to-b from-emerald-50/80 to-white rounded-2xl border border-emerald-100 p-8 text-center shadow-sm">
            <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm">
              <i class="fa-solid fa-check"></i>
            </div>
            <h1 class="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              ¡Matrícula Confirmada con Éxito!
            </h1>
            <p class="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mb-4">
              Tu pago ha sido procesado mediante Mercado Pago y tu vacante académica en el grupo se encuentra 100% asegurada.
            </p>

            <div class="inline-flex flex-wrap items-center justify-center gap-2 text-xs">
              <span class="px-3 py-1 bg-white rounded-full border border-slate-200 font-bold text-slate-700 shadow-2xs">
                Orden: {{ pedido.codigoOrden }}
              </span>
              <span class="px-3 py-1 bg-white rounded-full border border-slate-200 font-medium text-slate-600 shadow-2xs">
                Transacción: {{ pedido.mpPaymentId || 'PAY-ONLINE' }}
              </span>
              <span class="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                ESTADO: {{ pedido.estado }}
              </span>
            </div>
          </div>

          <!-- Two Cards: Class Link + PDF Invoice -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- Card A: Detalles del Curso y Acceso -->
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div class="flex items-center gap-2 text-xs font-bold text-brand-800 uppercase tracking-wider mb-2">
                  <i class="fa-solid fa-video text-brand-600"></i> Acceso a Clases en Vivo
                </div>
                <h3 class="font-heading font-bold text-base text-slate-900 mb-1 leading-snug">
                  {{ pedido.cursoTitulo }}
                </h3>
                <p class="text-xs text-slate-500 mb-4">{{ pedido.horario }}</p>

                <!-- Class Access Box -->
                <div class="p-4 bg-blue-50/70 border border-blue-200 rounded-xl mb-4">
                  <span class="text-[11px] font-bold text-blue-900 block mb-1">
                    @if (pedido.modalidad === 'PRESENCIAL') {
                      Lugar de Clase Presencial:
                    } @else {
                      Enlace de Clase (Google Meet / Zoom):
                    }
                  </span>
                  
                  @if (pedido.modalidad === 'PRESENCIAL') {
                    <div class="text-xs font-semibold text-slate-800">
                      {{ pedido.direccionClase || 'Campus Central - Aula 204' }}
                    </div>
                  } @else {
                    <div class="text-xs font-mono font-bold text-blue-700 break-all mb-2">
                      {{ pedido.enlaceClase || 'https://meet.google.com/abc-defg-hij' }}
                    </div>
                    <a 
                      [href]="pedido.enlaceClase || 'https://meet.google.com/abc-defg-hij'" 
                      target="_blank" 
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-900 text-white rounded-lg text-xs font-bold hover:bg-brand-800 transition">
                      <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Abrir Sala de Clase
                    </a>
                  }
                </div>

                <div class="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                  <i class="fa-brands fa-whatsapp text-sm text-emerald-600"></i>
                  <span>Te enviamos este enlace a tu WhatsApp para recordatorios.</span>
                </div>
              </div>
            </div>

            <!-- Card B: Comprobante Oficial -->
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div class="flex items-center gap-2 text-xs font-bold text-brand-800 uppercase tracking-wider mb-2">
                  <i class="fa-solid fa-file-invoice text-brand-600"></i> Facturación Electrónica SUNAT
                </div>
                <h3 class="font-heading font-bold text-base text-slate-900 mb-1 leading-snug">
                  Comprobante Electrónico Emitido
                </h3>
                <p class="text-xs text-slate-500 mb-4">Generado por el servicio de comprobantes en Python / ReportLab</p>

                <div class="space-y-2 text-xs p-3.5 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                  <div class="flex justify-between text-slate-600">
                    <span>Estudiante:</span>
                    <span class="font-semibold text-slate-800">{{ pedido.estudianteNombre }}</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>S/ {{ calcularSubtotal(pedido.monto) | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span>IGV (18%):</span>
                    <span>S/ {{ calcularIgv(pedido.monto) | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                    <span>Total Pagado:</span>
                    <span class="text-brand-900">S/ {{ pedido.monto | number:'1.2-2' }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 text-[11px] text-slate-500 mb-4">
                  <i class="fa-solid fa-envelope text-emerald-600"></i>
                  <span>Copia del PDF enviada a tu correo electrónico.</span>
                </div>
              </div>

              <!-- Descargar PDF Button -->
              <a 
                [href]="getPdfUrl(pedido.id)" 
                target="_blank" 
                class="w-full py-3 border-2 border-brand-900 hover:bg-brand-50 text-brand-900 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-2xs">
                <i class="fa-solid fa-file-pdf text-red-600 text-sm"></i> Descargar Comprobante Oficial (PDF)
              </a>
            </div>

          </div>

          <!-- Bottom Actions -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a 
              routerLink="/mis-cursos" 
              class="px-6 py-3 bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2">
              <i class="fa-solid fa-graduation-cap"></i> Ir a Mis Cursos Matriculados
            </a>
            <a 
              routerLink="/" 
              class="px-6 py-3 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition">
              Explorar más cursos
            </a>
          </div>

        }

      </div>
    </div>
  `
})
export class ConfirmacionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private pedidoService = inject(PedidoService);

  pedido: Pedido | null = null;
  loading = true;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.pedidoService.buscarPorId(id).subscribe({
        next: (data) => {
          this.pedido = data;
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        }
      });
    }
  }

  calcularSubtotal(monto: number): number {
    return Math.round((monto / 1.18) * 100) / 100;
  }

  calcularIgv(monto: number): number {
    return Math.round((monto - this.calcularSubtotal(monto)) * 100) / 100;
  }

  getPdfUrl(pedidoId: string): string {
    return this.pedidoService.getComprobantePdfUrl(pedidoId);
  }
}
