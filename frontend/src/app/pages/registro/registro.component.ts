import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="flex-1 py-12 px-4 flex items-center justify-center">
      <div class="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        
        <div class="text-center mb-6">
          <div class="w-12 h-12 rounded-xl bg-brand-900 text-white flex items-center justify-center text-xl mx-auto mb-3 shadow-sm">
            <i class="fa-solid fa-user-plus"></i>
          </div>
          <h2 class="font-heading font-extrabold text-2xl text-slate-900 mb-1">Registro de Estudiante</h2>
          <p class="text-xs text-slate-500">Crea tu cuenta institucional para matricularte en cursos y talleres</p>
        </div>

        @if (errorMensaje) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-4">
            {{ errorMensaje }}
          </div>
        }

        <form (ngSubmit)="registrar()" class="space-y-4 text-xs">
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Nombres</label>
              <input type="text" [(ngModel)]="nombres" name="nombres" required placeholder="Carlos" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Apellidos</label>
              <input type="text" [(ngModel)]="apellidos" name="apellidos" required placeholder="Estudiante" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">DNI (8 dígitos)</label>
              <input type="text" maxlength="8" [(ngModel)]="dni" name="dni" required placeholder="72819024" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">WhatsApp (+51)</label>
              <input type="text" [(ngModel)]="whatsapp" name="whatsapp" required placeholder="+51999888777" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
            <input type="email" [(ngModel)]="correo" name="correo" required placeholder="alumno@universidad.edu.pe" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Contraseña</label>
            <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white">
          </div>

          <button 
            type="submit" 
            [disabled]="cargando"
            class="w-full py-3 bg-brand-900 hover:bg-brand-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg shadow-sm transition">
            @if (cargando) {
              <i class="fa-solid fa-circle-notch fa-spin"></i> Registrando usuario...
            } @else {
              Crear Cuenta de Estudiante
            }
          </button>
        </form>

        <div class="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          ¿Ya tienes cuenta? 
          <a routerLink="/login" class="font-bold text-brand-700 hover:text-brand-900">Inicia sesión</a>
        </div>

      </div>
    </div>
  `
})
export class RegistroComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  nombres = '';
  apellidos = '';
  dni = '';
  whatsapp = '+51';
  correo = '';
  password = '';

  cargando = false;
  errorMensaje = '';

  registrar(): void {
    if (!this.nombres || !this.apellidos || !this.dni || !this.correo || !this.password) {
      this.errorMensaje = 'Por favor completa todos los campos requeridos.';
      return;
    }

    this.cargando = true;
    this.errorMensaje = '';

    this.auth.registrar({
      nombres: this.nombres,
      apellidos: this.apellidos,
      dni: this.dni,
      whatsapp: this.whatsapp,
      correo: this.correo,
      password: this.password,
      rol: 'ESTUDIANTE'
    }).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/mis-cursos']);
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = 'Error al registrarse: ' + (err.error?.message || err.message);
      }
    });
  }
}
