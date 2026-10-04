import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { CursoService } from '../../services/curso.service';
import { Curso } from '../../models/curso.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="flex-1 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Breadcrumbs -->
        <nav class="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <a routerLink="/" class="hover:text-brand-900 transition">Inicio</a>
          <i class="fa-solid fa-chevron-right text-[10px]"></i>
          <a routerLink="/" class="hover:text-brand-900 transition">Catálogo</a>
          <i class="fa-solid fa-chevron-right text-[10px]"></i>
          <span class="text-slate-800 font-medium truncate max-w-xs">{{ curso?.titulo || 'Detalle' }}</span>
        </nav>

        @if (loading) {
          <div class="bg-white rounded-xl p-16 text-center border border-slate-200">
            <i class="fa-solid fa-circle-notch fa-spin text-3xl text-brand-600 mb-3"></i>
            <p class="text-xs text-slate-500">Cargando detalles académicos del curso...</p>
          </div>
        } @else if (curso) {
          
          <!-- Hero Section -->
          <div class="bg-gradient-to-r from-brand-950 via-brand-900 to-slate-900 text-white rounded-2xl p-6 sm:p-10 shadow-lg mb-8">
            <div class="max-w-3xl">
              <div class="flex flex-wrap items-center gap-2.5 mb-4">
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  ESPECIALIZACIÓN PROFESIONAL
                </span>
                @if (curso.modalidad === 'VIRTUAL') {
                  <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Virtual en Vivo (Meet/Zoom)
                  </span>
                } @else {
                  <span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                    <i class="fa-solid fa-location-dot"></i> Presencial (Campus)
                  </span>
                }
              </div>

              <h1 class="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 leading-tight">
                {{ curso.titulo }}
              </h1>
              <p class="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
                {{ curso.descripcion || 'Diseño de microservicios con Spring Boot 3, Spring Cloud Gateway, seguridad 2FA con OTP, pasarela de pago Mercado Pago y facturación electrónica automatizada en PDF.' }}
              </p>

              <!-- Metadatos del curso -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800 text-xs">
                <div>
                  <span class="text-slate-400 block text-[11px]">Horario Oficial</span>
                  <span class="font-semibold text-white">{{ curso.horario }}</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[11px]">Duración Estimada</span>
                  <span class="font-semibold text-white">30 Horas Lectivas</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[11px]">Certificación</span>
                  <span class="font-semibold text-white">Digital con QR</span>
                </div>
                <div>
                  <span class="text-slate-400 block text-[11px]">Valoración</span>
                  <span class="font-semibold text-amber-400"><i class="fa-solid fa-star"></i> 4.9/5 (120 alumnos)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Layout: Contenido Detallado 65% + Tarjeta Sticky 35% -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <!-- Columna Izquierda (65%) -->
            <div class="lg:col-span-8 space-y-8">
              
              <!-- Lo que aprenderás -->
              <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 class="font-heading font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                  <i class="fa-solid fa-bullseye text-brand-600"></i> Competencias que desarrollarás
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <i class="fa-solid fa-circle-check text-emerald-600 mt-0.5"></i>
                    <span class="text-xs text-slate-700 leading-relaxed font-medium">Arquitectura de Microservicios con Spring Cloud Gateway</span>
                  </div>
                  <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <i class="fa-solid fa-circle-check text-emerald-600 mt-0.5"></i>
                    <span class="text-xs text-slate-700 leading-relaxed font-medium">Seguridad y autenticación 2FA con OTP y expiración</span>
                  </div>
                  <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <i class="fa-solid fa-circle-check text-emerald-600 mt-0.5"></i>
                    <span class="text-xs text-slate-700 leading-relaxed font-medium">Checkout y Webhooks con pasarela Mercado Pago</span>
                  </div>
                  <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <i class="fa-solid fa-circle-check text-emerald-600 mt-0.5"></i>
                    <span class="text-xs text-slate-700 leading-relaxed font-medium">Microservicio políglota de Boletas y Facturas PDF en Python</span>
                  </div>
                </div>
              </div>

              <!-- Temario Académico Expandible -->
              <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 class="font-heading font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                  <i class="fa-solid fa-layer-group text-brand-600"></i> Temario Académico Detallado
                </h3>
                
                <div class="space-y-3">
                  <div class="border border-slate-200 rounded-lg overflow-hidden">
                    <div class="p-3.5 bg-slate-50 font-bold text-xs text-slate-900 flex justify-between items-center">
                      <span>Módulo 1: Fundamentos y Gateway Centralizado</span>
                      <span class="text-slate-500 font-normal">8 hrs</span>
                    </div>
                    <div class="p-4 text-xs text-slate-600 border-t border-slate-200 leading-relaxed">
                      Estructura Maven padre, Spring Boot 3, configuración de Spring Cloud Gateway MVC y enrutamiento centralizado.
                    </div>
                  </div>

                  <div class="border border-slate-200 rounded-lg overflow-hidden">
                    <div class="p-3.5 bg-slate-50 font-bold text-xs text-slate-900 flex justify-between items-center">
                      <span>Módulo 2: Autenticación, Roles y Seguridad 2FA</span>
                      <span class="text-slate-500 font-normal">8 hrs</span>
                    </div>
                    <div class="p-4 text-xs text-slate-600 border-t border-slate-200 leading-relaxed">
                      Gestión de roles (ADMIN, DOCENTE, ESTUDIANTE), generación de código OTP de 6 dígitos con vigencia de 5 minutos y verificación.
                    </div>
                  </div>

                  <div class="border border-slate-200 rounded-lg overflow-hidden">
                    <div class="p-3.5 bg-slate-50 font-bold text-xs text-slate-900 flex justify-between items-center">
                      <span>Módulo 3: Pedidos, Descuento de Vacantes y Mercado Pago</span>
                      <span class="text-slate-500 font-normal">8 hrs</span>
                    </div>
                    <div class="p-4 text-xs text-slate-600 border-t border-slate-200 leading-relaxed">
                      Reserva de aforo atómica, integración del SDK de Mercado Pago, generación de preferencias y procesamiento de pagos con Webhook.
                    </div>
                  </div>

                  <div class="border border-slate-200 rounded-lg overflow-hidden">
                    <div class="p-3.5 bg-slate-50 font-bold text-xs text-slate-900 flex justify-between items-center">
                      <span>Módulo 4: Microservicio de Comprobantes PDF & Correo</span>
                      <span class="text-slate-500 font-normal">6 hrs</span>
                    </div>
                    <div class="p-4 text-xs text-slate-600 border-t border-slate-200 leading-relaxed">
                      Arquitectura políglota con FastAPI en Python, cálculo de IGV 18%, generación de boletas con ReportLab y despacho SMTP.
                    </div>
                  </div>
                </div>
              </div>

              <!-- Docente -->
              <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
                <div class="w-14 h-14 rounded-full bg-brand-900 text-white flex items-center justify-center font-bold text-xl flex-shrink-0">
                  <i class="fa-solid fa-user-tie"></i>
                </div>
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <h4 class="font-heading font-bold text-sm text-slate-900">Prof. Roberto Docente</h4>
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-brand-700 border border-blue-200">Verificado</span>
                  </div>
                  <p class="text-xs font-medium text-slate-500 mb-2">Arquitecto de Software & Especialista Cloud Java</p>
                  <p class="text-xs text-slate-600 leading-relaxed">
                    Más de 10 años de experiencia diseñando plataformas de alta concurrencia y sistemas distribuidos en el sector financiero y educativo.
                  </p>
                </div>
              </div>

            </div>

            <!-- Columna Derecha: Tarjeta Sticky de Matrícula (35%) -->
            <div class="lg:col-span-4 sticky top-20 space-y-4">
              <div class="bg-white rounded-xl border border-slate-200 shadow-md p-6 overflow-hidden">
                
                <div class="text-center pb-4 border-b border-slate-100">
                  <span class="text-xs font-semibold text-slate-500 block mb-1">Inversión del Curso</span>
                  <div class="flex items-center justify-center gap-2">
                    <span class="font-heading text-3xl font-extrabold text-slate-900">
                      S/ {{ curso.precio | number:'1.2-2' }}
                    </span>
                    <span class="text-xs text-slate-400 line-through">S/ 250.00</span>
                  </div>
                  <span class="inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    40% Dcto. por matrícula anticipada
                  </span>
                </div>

                <!-- Medidor de Urgencia de Vacantes -->
                <div class="my-5 p-3.5 bg-amber-50 rounded-lg border border-amber-200">
                  <div class="flex items-center justify-between text-xs font-bold mb-1">
                    <span class="text-amber-900">
                      <i class="fa-solid fa-fire text-amber-500 mr-1"></i> ¡Pocas vacantes!
                    </span>
                    <span class="text-amber-800">{{ curso.aforoDisponible }} disponibles</span>
                  </div>
                  <div class="w-full bg-amber-200/60 rounded-full h-2 overflow-hidden mb-1">
                    <div 
                      class="h-2 rounded-full bg-amber-500"
                      [style.width.%]="((curso.aforoMaximo - curso.aforoDisponible) / curso.aforoMaximo) * 100">
                    </div>
                  </div>
                  <span class="text-[10px] text-amber-700 block">
                    {{ curso.aforoMaximo - curso.aforoDisponible }} de {{ curso.aforoMaximo }} inscritos ya aseguraron su cupo.
                  </span>
                </div>

                <!-- Botón de Matrícula Directa -->
                <button 
                  (click)="iniciarMatricula()" 
                  [disabled]="curso.aforoDisponible <= 0"
                  class="w-full py-3.5 bg-brand-900 hover:bg-brand-800 disabled:bg-slate-300 text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mb-3">
                  <i class="fa-solid fa-credit-card"></i> Matricularme Ahora
                </button>

                <!-- Garantías -->
                <ul class="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <li class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-check text-emerald-600"></i> Emisión inmediata de Boleta o Factura
                  </li>
                  <li class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-check text-emerald-600"></i> Enlace Google Meet activo tras confirmar
                  </li>
                  <li class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-check text-emerald-600"></i> Confirmación por WhatsApp instantánea
                  </li>
                </ul>

                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-3 text-slate-400 text-sm">
                  <span title="Mercado Pago"><i class="fa-solid fa-handshake"></i></span>
                  <span title="Visa"><i class="fa-brands fa-cc-visa"></i></span>
                  <span title="Mastercard"><i class="fa-brands fa-cc-mastercard"></i></span>
                  <span title="SSL 256"><i class="fa-solid fa-lock"></i></span>
                </div>

              </div>
            </div>

          </div>

        }
      </div>
    </div>
  `
})
export class CursoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cursoService = inject(CursoService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  curso: Curso | null = null;
  loading = true;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cursoService.buscarPorId(id).subscribe({
        next: (data) => {
          this.curso = data;
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
  }

  iniciarMatricula(): void {
    if (this.curso) {
      this.router.navigate(['/checkout', this.curso.id]);
    }
  }
}
