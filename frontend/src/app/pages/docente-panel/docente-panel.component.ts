import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CursoService } from '../../services/curso.service';
import { PedidoService } from '../../services/pedido.service';
import { AuthService } from '../../services/auth.service';
import { Curso } from '../../models/curso.model';
import { Pedido } from '../../models/pedido.model';

@Component({
  selector: 'app-docente-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex-1 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Header -->
        <div class="pb-6 border-b border-slate-200 mb-8">
          <nav class="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Campus Docente</span>
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
            <span class="text-slate-800 font-medium">Gestión Académica</span>
          </nav>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 class="font-heading font-extrabold text-2xl text-slate-900">
                Panel del Docente - Gestión de Cursos y Alumnos
              </h1>
              <p class="text-xs text-slate-500">
                Bienvenido, Prof. Roberto. Administra tus enlaces de videoconferencia y consulta la lista oficial de inscritos.
              </p>
            </div>
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-center">
              <i class="fa-solid fa-shield-halved text-emerald-600"></i> Sesión 2FA Verificada
            </span>
          </div>
        </div>

        <!-- 3 KPIs -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-brand-700 flex items-center justify-center text-xl">
              <i class="fa-solid fa-chalkboard-user"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-slate-500 block">Cursos a Cargo</span>
              <span class="font-heading font-extrabold text-2xl text-slate-900">{{ cursos.length }}</span>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
              <i class="fa-solid fa-users"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-slate-500 block">Alumnos en Curso Seleccionado</span>
              <span class="font-heading font-extrabold text-2xl text-slate-900">{{ participantes.length }}</span>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
              <i class="fa-solid fa-chart-pie"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-slate-500 block">Ocupación Promedio</span>
              <span class="font-heading font-extrabold text-2xl text-slate-900">92%</span>
            </div>
          </div>
        </div>

        <!-- Section 1: Cursos Asignados -->
        <div class="mb-10">
          <h2 class="font-heading font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-book text-brand-600"></i> Cursos Asignados y Configuración de Salas
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (c of cursos; track c.id) {
              <div 
                class="bg-white rounded-xl border-2 p-5 shadow-sm transition flex flex-col justify-between"
                [ngClass]="cursoSeleccionado?.id === c.id ? 'border-brand-700 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'">
                <div>
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-brand-700 uppercase">
                      {{ c.modalidad }}
                    </span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {{ c.estado }}
                    </span>
                  </div>

                  <h3 class="font-heading font-bold text-sm text-slate-900 mb-1 leading-snug">
                    {{ c.titulo }}
                  </h3>
                  <p class="text-[11px] text-slate-500 mb-3">{{ c.horario }}</p>

                  <!-- Aforo Progress -->
                  <div class="mb-4">
                    <div class="flex justify-between text-[11px] text-slate-500 mb-1 font-medium">
                      <span>Inscritos:</span>
                      <span class="font-bold text-slate-800">{{ c.aforoMaximo - c.aforoDisponible }} / {{ c.aforoMaximo }}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        class="h-1.5 bg-emerald-500 rounded-full"
                        [style.width.%]="((c.aforoMaximo - c.aforoDisponible) / c.aforoMaximo) * 100">
                      </div>
                    </div>
                  </div>

                  <!-- Enlace actual -->
                  <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs mb-3">
                    <span class="text-[10px] text-slate-400 block font-bold">Enlace Meet activo:</span>
                    <span class="font-mono text-blue-700 text-[11px] truncate block">
                      {{ c.enlaceClase || 'No configurado' }}
                    </span>
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button 
                    (click)="seleccionarCurso(c)"
                    class="flex-1 py-1.5 bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs rounded-lg transition">
                    Ver Participantes
                  </button>
                  <button 
                    (click)="abrirModalEnlace(c)" 
                    title="Editar enlace de Meet"
                    class="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded-lg transition">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Section 2: Lista Oficial de Participantes -->
        <div>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-4 gap-2">
            <div>
              <h2 class="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
                <i class="fa-solid fa-users text-brand-600"></i> 
                Participantes: {{ cursoSeleccionado?.titulo || 'Selecciona un curso' }}
              </h2>
              <p class="text-xs text-slate-500">Lista oficial de estudiantes con pago confirmado en Mercado Pago.</p>
            </div>
            <span class="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 self-start sm:self-auto">
              Total: {{ participantes.length }} inscritos
            </span>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-600">
                <thead class="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th class="px-6 py-3">Estudiante</th>
                    <th class="px-6 py-3">Código Orden</th>
                    <th class="px-6 py-3">Monto Pagado</th>
                    <th class="px-6 py-3">Estado</th>
                    <th class="px-6 py-3 text-right">Contacto</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  @if (participantes.length === 0) {
                    <tr>
                      <td colspan="5" class="px-6 py-8 text-center text-slate-400">
                        No hay participantes registrados o aún no se ha seleccionado un curso.
                      </td>
                    </tr>
                  } @else {
                    @for (p of participantes; track p.id) {
                      <tr class="hover:bg-slate-50 transition">
                        <td class="px-6 py-4">
                          <div class="font-bold text-slate-800">{{ p.estudianteNombre || 'Estudiante Registrado' }}</div>
                          <div class="text-[11px] text-slate-400">ID: {{ p.estudianteId }}</div>
                        </td>
                        <td class="px-6 py-4 font-mono font-bold text-slate-700">{{ p.codigoOrden }}</td>
                        <td class="px-6 py-4 font-extrabold text-slate-900">S/ {{ p.monto | number:'1.2-2' }}</td>
                        <td class="px-6 py-4">
                          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {{ p.estado }}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                          <a 
                            href="https://wa.me/51999555666" 
                            target="_blank"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-xs hover:bg-emerald-100 transition">
                            <i class="fa-brands fa-whatsapp text-emerald-600"></i> WhatsApp
                          </a>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Modal para editar enlace Meet -->
        @if (mostrarModal) {
          <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
              <h3 class="font-heading font-bold text-base text-slate-900 mb-2">
                Actualizar Enlace de Clase Virtual
              </h3>
              <p class="text-xs text-slate-500 mb-4">
                El nuevo enlace se actualizará inmediatamente en el panel de todos los alumnos matriculados.
              </p>

              <div class="mb-4 text-xs">
                <label class="block font-semibold text-slate-700 mb-1">Enlace de Google Meet / Zoom</label>
                <input 
                  type="url" 
                  [(ngModel)]="nuevoEnlace" 
                  placeholder="https://meet.google.com/xyz-uvwx-rst"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white font-mono">
              </div>

              <div class="flex justify-end gap-2">
                <button (click)="mostrarModal = false" class="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100">
                  Cancelar
                </button>
                <button (click)="guardarEnlace()" class="px-4 py-2 bg-brand-900 text-white text-xs font-bold rounded-lg hover:bg-brand-800">
                  Guardar Enlace
                </button>
              </div>
            </div>
          </div>
        }

      </div>
    </div>
  `
})
export class DocentePanelComponent implements OnInit {
  private cursoService = inject(CursoService);
  private pedidoService = inject(PedidoService);
  private auth = inject(AuthService);

  cursos: Curso[] = [];
  cursoSeleccionado: Curso | null = null;
  participantes: Pedido[] = [];

  mostrarModal = false;
  cursoAEditar: Curso | null = null;
  nuevoEnlace = '';

  ngOnInit(): void {
    const docenteId = this.auth.currentUser()?.id || 'a0000000-0000-0000-0000-000000000002';
    this.cursoService.listarPorDocente(docenteId).subscribe({
      next: (data) => {
        this.cursos = data;
        if (data.length > 0) {
          this.seleccionarCurso(data[0]);
        }
      },
      error: (err) => console.error(err)
    });
  }

  seleccionarCurso(curso: Curso): void {
    this.cursoSeleccionado = curso;
    this.pedidoService.listarParticipantesPorCurso(curso.id).subscribe({
      next: (data) => {
        this.participantes = data;
      },
      error: (err) => console.error(err)
    });
  }

  abrirModalEnlace(curso: Curso): void {
    this.cursoAEditar = curso;
    this.nuevoEnlace = curso.enlaceClase || 'https://meet.google.com/abc-defg-hij';
    this.mostrarModal = true;
  }

  guardarEnlace(): void {
    if (this.cursoAEditar && this.nuevoEnlace) {
      this.cursoService.actualizarEnlace(this.cursoAEditar.id, this.nuevoEnlace).subscribe({
        next: (updated) => {
          this.cursoAEditar!.enlaceClase = updated.enlaceClase;
          this.mostrarModal = false;
        },
        error: (err) => console.error(err)
      });
    }
  }
}
