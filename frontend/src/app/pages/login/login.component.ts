import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="flex-1 min-h-[calc(100vh-4rem)] flex items-stretch">
      <div class="w-full grid grid-cols-1 lg:grid-cols-2">
        
        <!-- Left Panel: Corporate Security Showcase (50%) -->
        <div class="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 text-white p-12">
          <div>
            <div class="flex items-center gap-3 mb-8">
              <div class="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                <i class="fa-solid fa-graduation-cap"></i>
              </div>
              <span class="font-heading font-extrabold text-2xl tracking-tight">Cursos<span class="text-brand-400">Pro</span></span>
            </div>

            <div class="max-w-md">
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30 inline-block mb-4">
                CAMPUS VIRTUAL SEGURO
              </span>
              <h2 class="font-heading text-3xl font-extrabold leading-tight mb-4">
                Acceso al Entorno Académico y Gestión Docente
              </h2>
              <p class="text-sm text-slate-300 leading-relaxed mb-6">
                Protección avanzada con verificación en dos pasos (2FA OTP) para docentes y administradores.
              </p>

              <div class="space-y-3 pt-6 border-t border-slate-800 text-xs text-slate-300">
                <div class="flex items-center gap-2.5">
                  <i class="fa-solid fa-shield-halved text-emerald-400"></i> Autenticación multifactor con código de 6 dígitos
                </div>
                <div class="flex items-center gap-2.5">
                  <i class="fa-solid fa-clock text-amber-400"></i> Tokens OTP con vigencia dinámica de 5 minutos
                </div>
                <div class="flex items-center gap-2.5">
                  <i class="fa-solid fa-lock text-brand-400"></i> Cifrado de canal SSL y sesiones aisladas
                </div>
              </div>
            </div>
          </div>

          <div class="text-xs text-slate-400 border-t border-slate-800 pt-6">
            © 2026 CursosPro • Marcos de Desarrollo Web Integrado
          </div>
        </div>

        <!-- Right Panel: Login & 2FA Container (50%) -->
        <div class="flex items-center justify-center p-6 sm:p-12 bg-slate-50">
          <div class="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            
            @if (!requiere2fa) {
              
              <!-- State 1: Credenciales Estándar -->
              <div>
                <div class="text-center mb-6">
                  <h2 class="font-heading font-extrabold text-2xl text-slate-900 mb-1">Iniciar Sesión</h2>
                  <p class="text-xs text-slate-500">Ingresa tus credenciales institucionales</p>
                </div>

                <!-- Credenciales demo rápidas -->
                <div class="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div class="font-bold text-slate-700">Cuentas preconfiguradas (Seed):</div>
                  <div>• <strong>Docente (con 2FA):</strong> docente&#64;cursos.com | 123456</div>
                  <div>• <strong>Admin (con 2FA):</strong> admin&#64;cursos.com | 123456</div>
                  <div>• <strong>Estudiante:</strong> estudiante&#64;cursos.com | 123456</div>
                </div>

                @if (errorMensaje) {
                  <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-4">
                    {{ errorMensaje }}
                  </div>
                }

                <form (ngSubmit)="iniciarSesion()" class="space-y-4 text-xs">
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                    <input 
                      type="email" 
                      [(ngModel)]="correo" 
                      name="correo" 
                      required
                      placeholder="usuario@cursos.com" 
                      class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white text-xs">
                  </div>

                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Contraseña</label>
                    <input 
                      type="password" 
                      [(ngModel)]="password" 
                      name="password" 
                      required
                      placeholder="••••••••" 
                      class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 focus:bg-white text-xs">
                  </div>

                  <button 
                    type="submit" 
                    [disabled]="cargando"
                    class="w-full py-3 bg-brand-900 hover:bg-brand-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg shadow-sm transition">
                    @if (cargando) {
                      <i class="fa-solid fa-circle-notch fa-spin"></i> Validando credenciales...
                    } @else {
                      Ingresar al Campus
                    }
                  </button>
                </form>

                <div class="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                  ¿Aún no tienes cuenta? 
                  <a routerLink="/registro" class="font-bold text-brand-700 hover:text-brand-900">Regístrate como estudiante</a>
                </div>
              </div>

            } @else {

              <!-- State 2: Verificación 2FA OTP -->
              <div>
                <div class="text-center mb-6">
                  <div class="w-12 h-12 rounded-full bg-blue-100 text-brand-900 flex items-center justify-center text-xl mx-auto mb-3 shadow-2xs">
                    <i class="fa-solid fa-shield-halved"></i>
                  </div>
                  <h2 class="font-heading font-extrabold text-xl text-slate-900 mb-1">Verificación en Dos Pasos (2FA)</h2>
                  <p class="text-xs text-slate-500">Se requiere confirmación para usuarios con rol Docente o Admin</p>
                </div>

                <!-- OTP Display notice -->
                <div class="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 mb-4">
                  <div class="flex items-center gap-1.5 font-bold mb-1">
                    <i class="fa-brands fa-whatsapp text-emerald-600 text-sm"></i> Código OTP generado
                  </div>
                  <p class="text-[11px] text-blue-800 leading-relaxed">
                    Hemos generado el código para <strong>{{ correo }}</strong>. (Para fines de prueba, el código es: <strong class="text-brand-900 font-mono text-sm">{{ codigo2faGenerado }}</strong>).
                  </p>
                </div>

                <div class="flex items-center justify-center gap-2 mb-2 p-2 bg-amber-50 rounded-lg text-xs font-bold text-amber-900">
                  <i class="fa-solid fa-stopwatch text-amber-600"></i>
                  <span>Código válido por 5 minutos</span>
                </div>

                @if (errorMensaje) {
                  <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-4">
                    {{ errorMensaje }}
                  </div>
                }

                <form (ngSubmit)="verificarOtp()" class="space-y-4 text-xs">
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1 text-center">Ingresa el código de 6 dígitos</label>
                    <input 
                      type="text" 
                      maxlength="6"
                      [(ngModel)]="codigoOtp" 
                      name="codigoOtp" 
                      required
                      placeholder="000000" 
                      class="w-full tracking-widest text-center font-mono text-xl font-bold py-2.5 bg-slate-50 border-2 border-brand-800 rounded-lg focus:outline-none focus:bg-white text-brand-950">
                  </div>

                  <button 
                    type="submit" 
                    [disabled]="cargando"
                    class="w-full py-3 bg-brand-900 hover:bg-brand-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg shadow-sm transition">
                    @if (cargando) {
                      <i class="fa-solid fa-circle-notch fa-spin"></i> Verificando OTP...
                    } @else {
                      Verificar y Acceder al Panel
                    }
                  </button>
                </form>

                <div class="mt-6 pt-4 border-t border-slate-100 text-center text-xs">
                  <button (click)="requiere2fa = false" class="text-slate-500 hover:text-slate-800">
                    ← Volver a inicio de sesión
                  </button>
                </div>
              </div>

            }

          </div>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  correo = '';
  password = '';
  codigoOtp = '';
  codigo2faGenerado = '';

  requiere2fa = false;
  cargando = false;
  errorMensaje = '';

  iniciarSesion(): void {
    if (!this.correo || !this.password) {
      this.errorMensaje = 'Por favor ingrese correo y contraseña.';
      return;
    }

    this.cargando = true;
    this.errorMensaje = '';
    this.cdr.detectChanges();

    this.auth.login({ correo: this.correo, password: this.password }).subscribe({
      next: (res) => {
        this.cargando = false;
        if (res.status === 'REQUIRES_2FA') {
          this.requiere2fa = true;
          this.codigo2faGenerado = res.codigo2faGenerado || '';
          this.codigoOtp = '';
          this.cdr.detectChanges();
        } else {
          this.redirigirSegunRol(res.rol);
        }
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = 'Error al iniciar sesión: ' + (err.error?.message || err.message);
        this.cdr.detectChanges();
      }
    });
  }

  verificarOtp(): void {
    this.cargando = true;
    this.errorMensaje = '';
    this.cdr.detectChanges();

    this.auth.verificar2fa({ correo: this.correo, codigo2fa: this.codigoOtp }).subscribe({
      next: (res) => {
        this.cargando = false;
        this.redirigirSegunRol(res.rol);
      },
      error: (err) => {
        this.cargando = false;
        this.errorMensaje = 'Código incorrecto o expirado: ' + (err.error?.message || err.message);
        this.cdr.detectChanges();
      }
    });
  }

  private redirigirSegunRol(rol?: string): void {
    if (rol === 'DOCENTE') {
      this.router.navigate(['/docente']);
    } else if (rol === 'ADMIN') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/mis-cursos']);
    }
  }
}
