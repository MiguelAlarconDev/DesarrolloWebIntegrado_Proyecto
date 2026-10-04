import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CursoService } from '../../services/curso.service';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { Curso } from '../../models/curso.model';
import { Pedido } from '../../models/pedido.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="flex-1 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Stepper Indicator -->
        <div class="mb-8">
          <div class="flex items-center justify-center max-w-xl mx-auto">
            <div class="flex items-center text-emerald-600 text-xs font-semibold">
              <span class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mr-2 text-[11px] font-bold">✔</span>
              <span>1. Selección</span>
            </div>
            <div class="flex-1 h-0.5 bg-brand-900 mx-4"></div>
            <div class="flex items-center text-brand-900 text-xs font-bold">
              <span class="w-6 h-6 rounded-full bg-brand-900 text-white flex items-center justify-center mr-2 text-[11px]">2</span>
              <span>2. Facturación y Pago</span>
            </div>
            <div class="flex-1 h-0.5 bg-slate-200 mx-4"></div>
            <div class="flex items-center text-slate-400 text-xs font-semibold">
              <span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mr-2 text-[11px]">3</span>
              <span>3. Confirmación</span>
            </div>
          </div>
        </div>

        @if (loading) {
          <div class="bg-white rounded-xl p-16 text-center border border-slate-200">
            <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-600 mb-3"></i>
            <p class="text-xs text-slate-500">Iniciando orden de matrícula y reservando vacante...</p>
          </div>
        } @else if (curso) {
          
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <!-- Left Form: Student, Invoicing & Payment (65%) -->
            <div class="lg:col-span-7 space-y-6">
              
              <!-- 1. Datos del Estudiante -->
              <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 class="font-heading font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-brand-900 text-white text-[10px] flex items-center justify-center">1</span>
                  Datos del Estudiante
                </h3>
                <p class="text-xs text-slate-500 mb-4">Los accesos al Google Meet y el comprobante se despacharán a estos datos.</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Nombres y Apellidos</label>
                    <input type="text" [(ngModel)]="estudianteNombres" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white font-medium">
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                    <input type="email" [(ngModel)]="estudianteCorreo" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white font-medium">
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">DNI (8 dígitos)</label>
                    <input type="text" maxlength="8" [(ngModel)]="estudianteDni" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white font-medium">
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">WhatsApp (+51)</label>
                    <input type="text" [(ngModel)]="estudianteWhatsapp" placeholder="+51 999 555 666" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white font-medium">
                  </div>
                </div>
              </div>

              <!-- 2. Tipo de Comprobante SUNAT -->
              <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 class="font-heading font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-brand-900 text-white text-[10px] flex items-center justify-center">2</span>
                  Tipo de Comprobante de Pago (SUNAT)
                </h3>
                <p class="text-xs text-slate-500 mb-4">Selecciona el tipo de documento tributario que requieres emitir.</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  
                  <div 
                    (click)="tipoComprobante = 'BOLETA'"
                    class="p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3"
                    [ngClass]="tipoComprobante === 'BOLETA' ? 'border-brand-700 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'">
                    <input type="radio" name="comprobante" [checked]="tipoComprobante === 'BOLETA'" class="mt-1 text-brand-600">
                    <div>
                      <div class="font-bold text-xs text-slate-900">Boleta de Venta Electrónica</div>
                      <p class="text-[11px] text-slate-500 mt-0.5">Para personas naturales. Emitida a tu DNI proporcionado.</p>
                    </div>
                  </div>

                  <div 
                    (click)="tipoComprobante = 'FACTURA'"
                    class="p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3"
                    [ngClass]="tipoComprobante === 'FACTURA' ? 'border-brand-700 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'">
                    <input type="radio" name="comprobante" [checked]="tipoComprobante === 'FACTURA'" class="mt-1 text-brand-600">
                    <div>
                      <div class="font-bold text-xs text-slate-900">Factura Electrónica con RUC</div>
                      <p class="text-[11px] text-slate-500 mt-0.5">Para empresas (RUC 20). Válida para crédito fiscal.</p>
                    </div>
                  </div>

                </div>

                @if (tipoComprobante === 'FACTURA') {
                  <div class="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label class="block font-semibold text-slate-700 mb-1">RUC de la Empresa (11 dígitos)</label>
                        <input type="text" maxlength="11" [(ngModel)]="rucCliente" placeholder="20601234567" class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600">
                      </div>
                      <div>
                        <label class="block font-semibold text-slate-700 mb-1">Razón Social</label>
                        <input type="text" [(ngModel)]="razonSocial" placeholder="TECH SOLUTIONS S.A.C." class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600">
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- 3. Pasarela de Pagos Mercado Pago -->
              <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 class="font-heading font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-brand-900 text-white text-[10px] flex items-center justify-center">3</span>
                  Método de Pago Seguro
                </h3>
                <p class="text-xs text-slate-500 mb-4">Procesamiento certificado con Mercado Pago Perú.</p>

                <div class="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center text-lg shadow-sm">
                      <i class="fa-solid fa-handshake"></i>
                    </div>
                    <div>
                      <div class="font-bold text-xs text-blue-950">Mercado Pago Checkout Oficial</div>
                      <div class="text-[11px] text-blue-800">Acepta Tarjetas Visa, Mastercard, Yape, Plin y PagoEfectivo.</div>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Cifrado SSL</span>
                </div>

                <div class="flex items-center gap-4 text-slate-400 text-lg">
                  <i class="fa-brands fa-cc-visa"></i>
                  <i class="fa-brands fa-cc-mastercard"></i>
                  <i class="fa-solid fa-qrcode text-emerald-600"></i>
                  <span class="text-xs font-semibold text-slate-500">Yape / Plin</span>
                </div>
              </div>

            </div>

            <!-- Right Sticky: Order Summary & Pay Button (35%) -->
            <div class="lg:col-span-5 sticky top-20 space-y-4">
              <div class="bg-white rounded-xl border border-slate-200 shadow-md p-6 overflow-hidden">
                
                <!-- Urgency Timer -->
                <div class="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs font-medium text-amber-900 flex items-center gap-2 mb-4">
                  <i class="fa-solid fa-stopwatch text-amber-600"></i>
                  <span>Vacante reservada: <strong>14:20 min restantes</strong></span>
                </div>

                <h3 class="font-heading font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 mb-4">
                  Resumen de Matrícula
                </h3>

                <!-- Mini Course preview -->
                <div class="flex items-start gap-3 pb-4 border-b border-slate-100 mb-4">
                  <div class="w-12 h-12 rounded-lg bg-slate-900 text-brand-400 flex items-center justify-center flex-shrink-0 text-xl">
                    <i class="fa-brands fa-java"></i>
                  </div>
                  <div>
                    <h4 class="font-bold text-xs text-slate-900 leading-snug">{{ curso.titulo }}</h4>
                    <span class="text-[11px] text-slate-500 block mt-0.5">{{ curso.horario }}</span>
                    <span class="text-[10px] font-semibold text-blue-600 uppercase">{{ curso.modalidad }}</span>
                  </div>
                </div>

                <!-- Financial Breakdown -->
                <div class="space-y-2 text-xs pb-4 border-b border-slate-100 mb-4">
                  <div class="flex justify-between text-slate-500">
                    <span>Precio base del curso:</span>
                    <span>S/ 250.00</span>
                  </div>
                  <div class="flex justify-between text-emerald-600 font-medium">
                    <span>Descuento aplicado (40%):</span>
                    <span>- S/ 100.00</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span>Subtotal (sin IGV):</span>
                    <span>S/ {{ calcularSubtotal(curso.precio) | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between text-slate-600">
                    <span>IGV (18% SUNAT):</span>
                    <span>S/ {{ calcularIgv(curso.precio) | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between text-slate-900 text-base font-extrabold pt-2 border-t border-slate-100">
                    <span>Total a Pagar:</span>
                    <span class="text-brand-900">S/ {{ curso.precio | number:'1.2-2' }}</span>
                  </div>
                </div>

                <!-- Error alert if any -->
                @if (errorMensaje) {
                  <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-3">
                    {{ errorMensaje }}
                  </div>
                }

                <!-- Pay Button -->
                <button 
                  (click)="procesarPago()" 
                  [disabled]="procesando"
                  class="w-full py-3.5 bg-brand-900 hover:bg-brand-800 disabled:bg-slate-400 text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2">
                  @if (procesando) {
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Procesando con Mercado Pago...
                  } @else {
                    <i class="fa-solid fa-lock"></i> Pagar S/ {{ curso.precio | number:'1.2-2' }} con Mercado Pago
                  }
                </button>

                <p class="text-[11px] text-center text-slate-400 mt-3 leading-relaxed">
                  Al completar el pago, se emitirá tu comprobante oficial y recibirás el enlace directo a tu clase.
                </p>

              </div>
            </div>

          </div>

        }
      </div>
    </div>
  `
})
export class CheckoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cursoService = inject(CursoService);
  private pedidoService = inject(PedidoService);
  private auth = inject(AuthService);

  curso: Curso | null = null;
  loading = true;
  procesando = false;
  errorMensaje = '';

  // Form
  estudianteNombres = 'Carlos Estudiante';
  estudianteCorreo = 'estudiante@cursos.com';
  estudianteDni = '30000003';
  estudianteWhatsapp = '+51999555666';

  tipoComprobante: 'BOLETA' | 'FACTURA' = 'BOLETA';
  rucCliente = '20601234567';
  razonSocial = 'TECH SOLUTIONS S.A.C.';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const user = this.auth.currentUser();
    if (user) {
      this.estudianteNombres = `${user.nombres} ${user.apellidos}`;
      this.estudianteCorreo = user.correo;
      this.estudianteDni = user.dni || '30000003';
      this.estudianteWhatsapp = user.whatsapp || '+51999555666';
    }

    if (id) {
      this.cursoService.buscarPorId(id).subscribe({
        next: (data) => {
          this.curso = data;
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

  procesarPago(): void {
    if (!this.curso) return;

    if (this.tipoComprobante === 'FACTURA') {
      if (!this.rucCliente || this.rucCliente.length !== 11) {
        this.errorMensaje = 'Para Factura, ingrese un RUC válido de 11 dígitos.';
        return;
      }
      if (!this.razonSocial) {
        this.errorMensaje = 'Ingrese la Razón Social de la empresa.';
        return;
      }
    }

    this.procesando = true;
    this.errorMensaje = '';

    // Estudiante por defecto en seed si no está logueado
    const estudianteId = this.auth.currentUser()?.id || 'a0000000-0000-0000-0000-000000000003';

    // 1. Checkout (Crea orden y descuenta vacante)
    this.pedidoService.checkout({
      estudianteId,
      cursoId: this.curso.id
    }).subscribe({
      next: (pedido) => {
        // 2. Simulación / Confirmación de Pago con Mercado Pago
        this.pedidoService.pagar(pedido.id, {
          mpPaymentId: 'PAY-' + Date.now(),
          tipoComprobante: this.tipoComprobante,
          rucCliente: this.tipoComprobante === 'FACTURA' ? this.rucCliente : undefined,
          razonSocial: this.tipoComprobante === 'FACTURA' ? this.razonSocial : undefined
        }).subscribe({
          next: (pedidoPagado) => {
            this.procesando = false;
            this.router.navigate(['/confirmacion', pedidoPagado.id]);
          },
          error: (err) => {
            this.procesando = false;
            this.errorMensaje = 'Error al confirmar el pago: ' + (err.error?.message || err.message);
          }
        });
      },
      error: (err) => {
        this.procesando = false;
        this.errorMensaje = 'Error al crear la orden de matrícula: ' + (err.error?.message || err.message);
      }
    });
  }
}
