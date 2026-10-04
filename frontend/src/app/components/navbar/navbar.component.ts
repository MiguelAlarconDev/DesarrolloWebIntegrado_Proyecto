import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          
          <!-- Logo & Brand -->
          <div class="flex items-center gap-3">
            <a routerLink="/" class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-xl bg-brand-900 text-white flex items-center justify-center shadow-md">
                <i class="fa-solid fa-graduation-cap text-lg"></i>
              </div>
              <div class="flex flex-col">
                <span class="font-heading font-extrabold text-xl tracking-tight text-slate-900 leading-none">Cursos<span class="text-brand-600">Pro</span></span>
                <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Educación IT</span>
              </div>
            </a>

            <!-- Search input bar -->
            <div class="hidden md:flex items-center ml-6">
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <i class="fa-solid fa-magnifying-glass text-xs"></i>
                </span>
                <input 
                  type="text" 
                  placeholder="Buscar tecnologías, Spring Boot, Java..." 
                  class="w-64 lg:w-80 pl-9 pr-4 py-1.5 bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-xs rounded-lg border border-transparent focus:border-brand-500 focus:outline-none transition-all placeholder:text-slate-400">
              </div>
            </div>
          </div>

          <!-- Navigation Links -->
          <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a routerLink="/" routerLinkActive="text-brand-700 font-semibold" [routerLinkActiveOptions]="{exact: true}" class="hover:text-brand-600 transition">Explorar Cursos</a>
            
            @if (auth.currentUser(); as user) {
              @if (user.rol === 'ESTUDIANTE') {
                <a routerLink="/mis-cursos" routerLinkActive="text-brand-700 font-semibold" class="hover:text-brand-600 transition">Mis Cursos</a>
              }
              @if (user.rol === 'DOCENTE') {
                <a routerLink="/docente" routerLinkActive="text-brand-700 font-semibold" class="hover:text-brand-600 transition">Panel Docente</a>
              }
              @if (user.rol === 'ADMIN') {
                <a routerLink="/admin" routerLinkActive="text-brand-700 font-semibold" class="hover:text-brand-600 transition">Consola Admin</a>
              }
            }
          </nav>

          <!-- Right Action Buttons / User Menu -->
          <div class="flex items-center gap-3">
            @if (auth.currentUser(); as user) {
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                  <div class="w-7 h-7 rounded-full bg-brand-900 text-white flex items-center justify-center text-xs font-bold">
                    {{ user.nombres.charAt(0) }}
                  </div>
                  <div class="flex flex-col text-left">
                    <span class="text-xs font-semibold text-slate-800 leading-none">{{ user.nombres }}</span>
                    <span class="text-[9px] font-bold text-brand-700 uppercase leading-none mt-0.5">{{ user.rol }}</span>
                  </div>
                </div>

                <button 
                  (click)="logout()" 
                  title="Cerrar sesión"
                  class="w-8 h-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-sm transition">
                  <i class="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
              </div>
            } @else {
              <a routerLink="/login" class="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-brand-900 transition">
                Iniciar Sesión
              </a>
              <a routerLink="/registro" class="px-4 py-2 bg-brand-900 hover:bg-brand-800 text-white text-xs font-semibold rounded-lg shadow-sm transition">
                Registrarse
              </a>
            }
          </div>

        </div>
      </div>
    </header>
  `
})
export class NavbarComponent {
  auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
