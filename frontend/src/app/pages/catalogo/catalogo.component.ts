import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CursoService } from '../../services/curso.service';
import { Curso } from '../../models/curso.model';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="flex-1 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Breadcrumbs -->
        <nav class="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <a routerLink="/" class="hover:text-brand-900 transition">Inicio</a>
          <i class="fa-solid fa-chevron-right text-[10px]"></i>
          <span class="text-slate-800 font-medium">Catálogo de Cursos Profesionales</span>
        </nav>

        <!-- Hero Section -->
        <div class="bg-gradient-to-r from-brand-950 via-brand-900 to-slate-900 text-white rounded-2xl p-6 sm:p-10 shadow-lg mb-8 relative overflow-hidden">
          <div class="relative z-10 max-w-2xl">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 mb-3">
              <i class="fa-solid fa-sparkles text-[10px]"></i> Matrícula Abierta • Semestre 2026-I
            </span>
            <h1 class="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 leading-tight">
              Especialízate en Arquitecturas Web y Microservicios
            </h1>
            <p class="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
              Cursos dictados por profesionales de la industria con acceso en vivo por Google Meet, proyectos de arquitectura distribuida y certificación digital verificable.
            </p>
            <div class="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <div class="flex items-center gap-1.5">
                <i class="fa-solid fa-circle-check text-emerald-400"></i> Clases en Vivo & Presenciales
              </div>
              <div class="flex items-center gap-1.5">
                <i class="fa-solid fa-circle-check text-emerald-400"></i> Boletas y Facturas Inmediatas
              </div>
              <div class="flex items-center gap-1.5">
                <i class="fa-solid fa-circle-check text-emerald-400"></i> Pagos con Mercado Pago
              </div>
            </div>
          </div>
          <div class="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-10 translate-y-10">
            <i class="fa-solid fa-cubes text-[240px]"></i>
          </div>
        </div>

        <!-- Main Layout: Sidebar Filters + Course Cards Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          <!-- Filters Sidebar -->
          <div class="lg:col-span-1 space-y-6">
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm sticky top-20">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 class="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                  <i class="fa-solid fa-sliders text-brand-600"></i> Filtros
                </h3>
                <button (click)="resetFiltros()" class="text-xs text-slate-500 hover:text-brand-600 transition">
                  Limpiar
                </button>
              </div>

              <!-- Search -->
              <div class="mb-5">
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">Búsqueda rápida</label>
                <div class="relative">
                  <input 
                    type="text" 
                    [(ngModel)]="filtroTexto" 
                    (input)="filtrarCursos()"
                    placeholder="Buscar curso..." 
                    class="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
                </div>
              </div>

              <!-- Modality Filter -->
              <div class="mb-5">
                <label class="block text-xs font-semibold text-slate-700 mb-2">Modalidad</label>
                <div class="space-y-2">
                  <label class="flex items-center text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                    <input type="radio" name="modalidad" value="TODAS" [(ngModel)]="filtroModalidad" (change)="filtrarCursos()" class="mr-2 text-brand-600 focus:ring-brand-500">
                    Todas las modalidades
                  </label>
                  <label class="flex items-center text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                    <input type="radio" name="modalidad" value="VIRTUAL" [(ngModel)]="filtroModalidad" (change)="filtrarCursos()" class="mr-2 text-brand-600 focus:ring-brand-500">
                    <span class="inline-flex items-center gap-1.5"><i class="fa-solid fa-video text-blue-500"></i> Virtual (Meet/Zoom)</span>
                  </label>
                  <label class="flex items-center text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                    <input type="radio" name="modalidad" value="PRESENCIAL" [(ngModel)]="filtroModalidad" (change)="filtrarCursos()" class="mr-2 text-brand-600 focus:ring-brand-500">
                    <span class="inline-flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-purple-500"></i> Presencial (Campus)</span>
                  </label>
                </div>
              </div>

              <!-- Support Card -->
              <div class="p-3.5 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-900">
                <div class="font-bold mb-1 flex items-center gap-1.5">
                  <i class="fa-brands fa-whatsapp text-emerald-600 text-sm"></i> ¿Dudas sobre matrícula?
                </div>
                <p class="text-[11px] text-blue-800 leading-relaxed mb-2">
                  Escríbenos para asistencia inmediata con vacantes y pagos corporativos.
                </p>
                <a href="https://wa.me/51999111222" target="_blank" class="font-bold text-[11px] text-brand-800 underline hover:text-brand-900">Contactar Asesor</a>
              </div>
            </div>
          </div>

          <!-- Course Cards Grid -->
          <div class="lg:col-span-3">
            
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs text-slate-500">
                Mostrando <strong class="text-slate-800">{{ cursosFiltrados.length }}</strong> cursos disponibles
              </span>
            </div>

            @if (loading) {
              <div class="bg-white rounded-xl p-12 text-center border border-slate-200">
                <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-600 mb-3"></i>
                <p class="text-xs text-slate-500">Cargando catálogo oficial desde el Gateway...</p>
              </div>
            } @else if (errorMensaje) {
              <div class="bg-white rounded-xl p-12 text-center border border-amber-200 bg-amber-50/30">
                <i class="fa-solid fa-clock-rotate-left text-3xl text-amber-500 mb-3"></i>
                <h4 class="font-bold text-sm text-slate-800 mb-1">Microservicios en inicialización</h4>
                <p class="text-xs text-slate-600 max-w-md mx-auto mb-4 leading-relaxed">{{ errorMensaje }}</p>
                <button (click)="cargarCursos()" class="px-4 py-2 bg-brand-900 text-white font-bold text-xs rounded-lg hover:bg-brand-800 shadow-sm transition">
                  <i class="fa-solid fa-rotate-right mr-1.5"></i> Reintentar Conexión
                </button>
              </div>
            } @else if (cursosFiltrados.length === 0) {
              <div class="bg-white rounded-xl p-12 text-center border border-slate-200">
                <i class="fa-solid fa-box-open text-4xl text-slate-300 mb-3"></i>
                <h4 class="font-bold text-sm text-slate-800 mb-1">No se encontraron cursos</h4>
                <p class="text-xs text-slate-500 mb-4">Prueba modificando tus filtros de búsqueda.</p>
                <button (click)="resetFiltros()" class="px-4 py-1.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200">
                  Restablecer Filtros
                </button>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                @for (curso of cursosFiltrados; track curso.id) {
                  <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">
                    
                    <!-- Card Top Image / Banner -->
                    <div class="h-44 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                      <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent z-10"></div>
                      
                      <!-- Decorative Technology Vector -->
                      <div class="text-slate-700 group-hover:scale-105 transition-transform duration-500">
                        <i class="fa-brands fa-java text-8xl opacity-30"></i>
                      </div>

                      <!-- Badges Overlay -->
                      <div class="absolute top-3 left-3 z-20 flex gap-2">
                        @if (curso.modalidad === 'VIRTUAL') {
                          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/90 text-white backdrop-blur-sm flex items-center gap-1 shadow-sm">
                            <i class="fa-solid fa-video text-[10px]"></i> Virtual en Vivo
                          </span>
                        } @else {
                          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-600/90 text-white backdrop-blur-sm flex items-center gap-1 shadow-sm">
                            <i class="fa-solid fa-location-dot text-[10px]"></i> Presencial
                          </span>
                        }
                      </div>

                      <div class="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between text-xs text-slate-300">
                        <span class="flex items-center gap-1"><i class="fa-regular fa-clock"></i> {{ curso.horario }}</span>
                      </div>
                    </div>

                    <!-- Card Body -->
                    <div class="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 class="font-heading font-bold text-base text-slate-900 leading-snug group-hover:text-brand-700 transition mb-2">
                          {{ curso.titulo }}
                        </h3>
                        <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                          {{ curso.descripcion || 'Especialízate con proyectos reales, arquitecturas distribuidas y asesoría directa del docente.' }}
                        </p>
                      </div>

                      <div>
                        <!-- Vacancy Progress Meter -->
                        <div class="mb-4">
                          <div class="flex items-center justify-between text-[11px] mb-1">
                            <span class="text-slate-500 font-medium">Disponibilidad</span>
                            <span class="font-bold" [ngClass]="curso.aforoDisponible <= 5 ? 'text-amber-600' : 'text-emerald-600'">
                              {{ curso.aforoDisponible }} vacantes disponibles de {{ curso.aforoMaximo }}
                            </span>
                          </div>
                          <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              class="h-1.5 rounded-full transition-all duration-500" 
                              [ngClass]="curso.aforoDisponible <= 5 ? 'bg-amber-500' : 'bg-emerald-500'"
                              [style.width.%]="((curso.aforoMaximo - curso.aforoDisponible) / curso.aforoMaximo) * 100">
                            </div>
                          </div>
                        </div>

                        <!-- Price & CTA Button -->
                        <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span class="text-[10px] uppercase font-bold text-slate-400 block">Inversión</span>
                            <span class="font-heading text-xl font-extrabold text-slate-900">
                              S/ {{ curso.precio | number:'1.2-2' }}
                            </span>
                          </div>

                          <a 
                            [routerLink]="['/curso', curso.id]" 
                            class="px-4 py-2 bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 group-hover:gap-2">
                            Ver Detalle <i class="fa-solid fa-arrow-right text-[10px]"></i>
                          </a>
                        </div>
                      </div>

                    </div>

                  </div>
                }
              </div>
            }

          </div>

        </div>

      </div>
    </div>
  `
})
export class CatalogoComponent implements OnInit {
  private cursoService = inject(CursoService);
  private cdr = inject(ChangeDetectorRef);

  cursos: Curso[] = [];
  cursosFiltrados: Curso[] = [];
  loading = true;
  errorMensaje = '';

  filtroTexto = '';
  filtroModalidad = 'TODAS';

  ngOnInit(): void {
    this.cargarCursos();
  }

  cargarCursos(): void {
    this.loading = true;
    this.errorMensaje = '';
    this.cdr.detectChanges();

    console.log('[Catalogo] Solicitando cursos al backend...');
    this.cursoService.listarPublicos().subscribe({
      next: (data) => {
        console.log('[Catalogo] Cursos recibidos del backend:', data);
        this.cursos = data;
        this.cursosFiltrados = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[Catalogo] Error cargando cursos:', err);
        this.loading = false;
        this.errorMensaje = 'No se pudo conectar con el microservicio de cursos. Si recién ejecutaste iniciar-todo.bat, los microservicios terminan de cargar en unos segundos. Haz clic abajo para reintentar.';
        this.cdr.detectChanges();
      }
    });
  }

  filtrarCursos(): void {
    this.cursosFiltrados = this.cursos.filter(c => {
      const matchText = this.filtroTexto.trim() === '' || 
        c.titulo.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(this.filtroTexto.toLowerCase()));
      
      const matchModalidad = this.filtroModalidad === 'TODAS' || c.modalidad === this.filtroModalidad;

      return matchText && matchModalidad;
    });
  }

  resetFiltros(): void {
    this.filtroTexto = '';
    this.filtroModalidad = 'TODAS';
    this.cursosFiltrados = [...this.cursos];
  }
}
