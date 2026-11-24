import { Component, HostListener, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.applySystemZoom80();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.applySystemZoom80();
  }

  /**
   * Garantiza que todo el sistema se vea siempre al 80% real en pantalla,
   * compensando automáticamente si el navegador tiene guardado 67%, 75%, 80% o 100%.
   */
  private applySystemZoom80(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const TARGET_SCALE = 0.8; // 80%
    let cssZoom = TARGET_SCALE;

    if (window.outerWidth > 0 && window.innerWidth > 0) {
      const browserZoom = window.outerWidth / window.innerWidth;
      // Si el navegador está entre 50% y 105% de zoom (ej. 67%, 75%, 80%, 90%, 100%)
      if (browserZoom >= 0.5 && browserZoom <= 1.05) {
        cssZoom = Number((TARGET_SCALE / browserZoom).toFixed(4));
      }
    }

    const htmlEl = document.documentElement;
    htmlEl.style.setProperty('zoom', String(cssZoom), 'important');
    const minVh = Math.ceil(100 / cssZoom);
    htmlEl.style.setProperty('--app-min-vh', `${minVh}vh`);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a') as HTMLAnchorElement | null;
    if (!anchor) return;

    const rawHref = anchor.getAttribute('href');
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
      return;
    }

    if (anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) {
      return;
    }

    if (/^https?:\/\//i.test(rawHref)) {
      return;
    }

    // Interceptar navegación interna para usar Angular Router (SPA sin recarga de página ni .html)
    event.preventDefault();
    let cleanUrl = rawHref.startsWith('/') ? rawHref : `/${rawHref}`;
    cleanUrl = cleanUrl.replace(/^\/index\.html/i, '/').replace(/\.html(?=[?#]|$)/i, '');
    this.router.navigateByUrl(cleanUrl).then(() => {
      if (!cleanUrl.includes('#')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}
