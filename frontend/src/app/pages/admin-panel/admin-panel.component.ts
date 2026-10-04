import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CursoService } from '../../services/curso.service';
import { PedidoService } from '../../services/pedido.service';
import { CrearCursoRequest, Curso } from '../../models/curso.model';
import { Pedido } from '../../models/pedido.model';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex-1 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Header & Microservices Health Status -->
        <div class="pb-6 border-b border-slate-200 mb-8">
          <nav class="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Administración General</span>
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
            <span class="text-slate-800 font-medium">Consola Central</span>
          </nav>

          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 class="font-heading font-extrabold text-2xl text-slate-900">
                Consola de Administración - Cursos y Finanzas
              </h1>
              <p class="text-xs text-slate-500">
                Supervisa el rendimiento académico, gestiona aforos y registra nuevos cursos en la plataforma.
              </p>
            </div>

            <!-- Health Pill -->
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-center shadow-2xs">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Microservicios: Gateway • Auth • Cursos • Pedidos • Comprobantes (OK)
            </span>
          </div>
        </div>

        <!-- 4 KPI Metrics -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <span class="text-xs font-semibold text-slate-500 block mb-1">Recaudación Total</span>
            <div class="font-heading font-extrabold text-2xl text-brand-950">
              S/ {{ totalRecaudado | number:'1.2-2' }}
            </div>
            <span class="text-[11px] text-emerald-600 font-bold mt-1 block">
              <i class="fa-solid fa-arrow-trend-up"></i> +18.4% este mes
            </span>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <span class="text-xs font-semibold text-slate-500 block mb-1">Matrículas Confirmadas</span>
            <div class="font-heading font-extrabold text-2xl text-slate-900">
              {{ pedidos.length }} alumnos
            </div>
            <span class="text-[11px] text-slate-400 mt-1 block">Pagos vía Mercado Pago</span>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <span class="text-xs font-semibold text-slate-500 block mb-1">Cursos en Catálogo</span>
            <div class="font-heading font-extrabold text-2xl text-slate-900">
              {{ cursos.length }} cursos
            </div>
            <span class="text-[11px] text-blue-600 font-bold mt-1 block">Aforo promedio: 90%</span>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <span class="text-xs font-semibold text-slate-500 block mb-1">Usuarios Registrados</span>
            <div class="font-heading font-extrabold text-2xl text-slate-900">
              124
            </div>
            <span class="text-[11px] text-slate-400 mt-1 block">Estudiantes & Docentes</span>
          </div>
        </div>

        <!-- Layout: Master Course Inventory + Create Course Form -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- Master Inventory (7 cols) -->
          <div class="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div class="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 class="font-heading font-bold text-sm text-slate-900">Inventario Maestro de Cursos</h3>
                <p class="text-xs text-slate-500">Gestión de estados, vacantes y precios</p>
              </div>
              <button (click)="cargarDatos()" class="p-2 text-slate-400 hover:text-slate-600 text-xs">
                <i class="fa-solid fa-arrows-rotate"></i>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-600">
                <thead class="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px]">
                  <tr>
                    <th class="px-5 py-3">Curso</th>
                    <th class="px-5 py-3">Aforo</th>
                    <th class="px-5 py-3">Precio</th>
                    <th class="px-5 py-3">Estado</th>
                    <th class="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  @for (c of cursos; track c.id) {
                    <tr class="hover:bg-slate-50 transition">
                      <td class="px-5 py-4">
                        <div class="font-bold text-slate-900">{{ c.titulo }}</div>
                        <span class="text-[10px] text-brand-700 font-bold uppercase">{{ c.modalidad }}</span>
                      </td>
                      <td class="px-5 py-4">
                        <div class="text-[11px] font-bold text-slate-800">
                          {{ c.aforoDisponible }} / {{ c.aforoMaximo }}
                        </div>
                        <div class="w-16 bg-slate-100 rounded-full h-1 mt-1">
                          <div 
                            class="h-1 bg-emerald-500 rounded-full"
                            [style.width.%]="((c.aforoMaximo - c.aforoDisponible) / c.aforoMaximo) * 100">
                          </div>
                        </div>
                      </td>
                      <td class="px-5 py-4 font-bold text-slate-900">
                        S/ {{ c.precio | number:'1.2-2' }}
                      </td>
                      <td class="px-5 py-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                          [ngClass]="c.estado === 'PUBLICADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'">
                          {{ c.estado }}
                        </span>
                      </td>
                      <td class="px-5 py-4 text-right">
                        <button 
                          (click)="cambiarEstado(c)" 
                          class="px-2.5 py-1 text-[11px] border border-slate-200 hover:bg-slate-100 rounded font-semibold text-slate-700">
                          {{ c.estado === 'PUBLICADO' ? 'Pausar' : 'Publicar' }}
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Quick Create Course Form (5 cols) -->
          <div class="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 class="font-heading font-bold text-base text-slate-900 mb-1 flex items-center gap-2">
              <i class="fa-solid fa-plus-circle text-brand-600"></i> Registrar Nuevo Curso
            </h3>
            <p class="text-xs text-slate-500 mb-4">Mapeado directamente al DTO CrearCursoRequest</p>

            @if (mensajeExito) {
              <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 mb-4">
                {{ mensajeExito }}
              </div>
            }

            <form (ngSubmit)="crearCurso()" class="space-y-3.5 text-xs">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Título del Curso</label>
                <input type="text" [(ngModel)]="nuevoCurso.titulo" name="titulo" required placeholder="Ej. DevOps con Kubernetes y Docker" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Descripción Breve</label>
                <textarea [(ngModel)]="nuevoCurso.descripcion" name="descripcion" rows="2" placeholder="Objetivos y tecnologías..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white"></textarea>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Modalidad</label>
                  <select [(ngModel)]="nuevoCurso.modalidad" name="modalidad" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
                    <option value="VIRTUAL">VIRTUAL</option>
                    <option value="PRESENCIAL">PRESENCIAL</option>
                  </select>
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Horario</label>
                  <input type="text" [(ngModel)]="nuevoCurso.horario" name="horario" placeholder="Mar y Jue 19:00 - 22:00" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Aforo Máximo</label>
                  <input type="number" [(ngModel)]="nuevoCurso.aforoMaximo" name="aforo" min="1" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Precio (S/)</label>
                  <input type="number" [(ngModel)]="nuevoCurso.precio" name="precio" min="0" step="0.5" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
                </div>
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">
                  {{ nuevoCurso.modalidad === 'VIRTUAL' ? 'Enlace Meet / Zoom' : 'Dirección del Campus / Aula' }}
                </label>
                <input 
                  type="text" 
                  [(ngModel)]="nuevoCurso.enlaceClase" 
                  name="enlace" 
                  placeholder="https://meet.google.com/xyz-123" 
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
              </div>

              <button 
                type="submit" 
                class="w-full py-2.5 bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs rounded-lg shadow-sm transition">
                <i class="fa-solid fa-cloud-arrow-up mr-1.5"></i> Guardar y Publicar Curso
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  `
})
export class AdminPanelComponent implements OnInit {
  private cursoService = inject(CursoService);
  private pedidoService = inject(PedidoService);
  private cdr = inject(ChangeDetectorRef);

  cursos: Curso[] = [];
  pedidos: Pedido[] = [];
  totalRecaudado = 0;
  mensajeExito = '';

  nuevoCurso: CrearCursoRequest = {
    titulo: '',
    descripcion: '',
    docenteId: 'a0000000-0000-0000-0000-000000000002', // Roberto Docente
    fechaInicio: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 19),
    fechaFin: new Date(Date.now() + 86400000 * 33).toISOString().slice(0, 19),
    horario: 'Mar y Jue 19:00 - 22:00',
    modalidad: 'VIRTUAL',
    aforoMaximo: 25,
    precio: 180,
    enlaceClase: 'https://meet.google.com/dev-spring-boot'
  };

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cursoService.listarTodos().subscribe({
      next: (data) => {
        this.cursos = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });

    this.pedidoService.listarTodos().subscribe({
      next: (data) => {
        this.pedidos = data;
        this.totalRecaudado = data.reduce((acc, p) => acc + (p.monto || 0), 0);
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  cambiarEstado(c: Curso): void {
    const nuevo = c.estado === 'PUBLICADO' ? 'BORRADOR' : 'PUBLICADO';
    this.cursoService.cambiarEstado(c.id, nuevo).subscribe({
      next: () => this.cargarDatos(),
      error: (err) => console.error(err)
    });
  }

  crearCurso(): void {
    if (!this.nuevoCurso.titulo) return;

    this.cursoService.crear(this.nuevoCurso).subscribe({
      next: (creado) => {
        this.mensajeExito = `¡Curso '${creado.titulo}' registrado con éxito!`;
        this.nuevoCurso.titulo = '';
        this.nuevoCurso.descripcion = '';
        this.cargarDatos();
        setTimeout(() => this.mensajeExito = '', 4000);
      },
      error: (err) => console.error(err)
    });
  }
}
