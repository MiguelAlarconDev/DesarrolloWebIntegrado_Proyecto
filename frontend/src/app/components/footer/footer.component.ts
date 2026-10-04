import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="bg-slate-900 text-slate-400 mt-auto border-t border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div class="space-y-3">
            <div class="flex items-center gap-2 text-white">
              <i class="fa-solid fa-graduation-cap text-brand-500 text-xl"></i>
              <span class="font-heading font-extrabold text-lg text-white">Cursos<span class="text-brand-500">Pro</span></span>
            </div>
            <p class="text-xs leading-relaxed text-slate-400">
              Plataforma de alta especialización en Marcos de Desarrollo Web Integrado y Arquitecturas de Microservicios con Spring Boot, Python y Cloud.
            </p>
            <div class="flex items-center gap-3 pt-2 text-slate-400 text-sm">
              <a href="#" class="hover:text-white transition"><i class="fa-brands fa-github"></i></a>
              <a href="#" class="hover:text-white transition"><i class="fa-brands fa-linkedin"></i></a>
              <a href="#" class="hover:text-white transition"><i class="fa-brands fa-discord"></i></a>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-white mb-3">Académico</h4>
            <ul class="space-y-2 text-xs">
              <li><a routerLink="/" class="hover:text-white transition">Catálogo de Cursos</a></li>
              <li><a href="#" class="hover:text-white transition">Certificación con QR</a></li>
              <li><a href="#" class="hover:text-white transition">Plana Docente</a></li>
              <li><a href="#" class="hover:text-white transition">Convenios y Alianzas</a></li>
            </ul>
          </div>

          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-white mb-3">Soporte y Seguridad</h4>
            <ul class="space-y-2 text-xs">
              <li><span class="text-emerald-400 flex items-center gap-1.5"><i class="fa-solid fa-shield-halved"></i> Autenticación 2FA OTP</span></li>
              <li><span class="text-emerald-400 flex items-center gap-1.5"><i class="fa-solid fa-file-invoice"></i> Boletas y Facturas SUNAT</span></li>
              <li><span class="text-emerald-400 flex items-center gap-1.5"><i class="fa-brands fa-google"></i> Salas Google Meet en Vivo</span></li>
              <li><a href="#" class="hover:text-white transition">Mesa de Ayuda WhatsApp</a></li>
            </ul>
          </div>

          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-white mb-3">Legal y Transparencia</h4>
            <ul class="space-y-2 text-xs">
              <li><a href="#" class="hover:text-white transition">Términos y Condiciones</a></li>
              <li><a href="#" class="hover:text-white transition">Política de Privacidad</a></li>
              <li><a href="#" class="hover:text-white transition">Libro de Reclamaciones</a></li>
            </ul>
            <div class="mt-4 p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/60 text-[11px] text-slate-300">
              <i class="fa-solid fa-lock text-brand-400 mr-1.5"></i> Pagos 100% seguros con Mercado Pago Perú
            </div>
          </div>

        </div>

        <div class="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 CursosPro. Curso Marcos de Desarrollo Web Integrado. Todos los derechos reservados.</p>
          <p class="mt-2 sm:mt-0 font-medium">Arquitectura de Microservicios: Gateway • Auth • Cursos • Pedidos • Comprobantes</p>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {}
