import { Component, HostListener, ViewEncapsulation, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-navbar></app-navbar>
    <router-outlet></router-outlet>
    <app-footer></app-footer>
  `
})
export class AppComponent {
  private router = inject(Router);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const anchor = target?.closest?.('a') as HTMLAnchorElement | null;
    if (!anchor) return;

    if (anchor.target === '_blank' || anchor.hasAttribute('download') || anchor.getAttribute('onclick')) {
      return;
    }

    const rawHref = (anchor.getAttribute('href') || '').trim();
    if (
      !rawHref ||
      rawHref === '#' ||
      rawHref.startsWith('#') ||
      rawHref.startsWith('javascript:') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:') ||
      rawHref.startsWith('http://') ||
      rawHref.startsWith('https://') ||
      rawHref.startsWith('assets/')
    ) {
      return;
    }

    event.preventDefault();
    const targetUrl = '/' + rawHref.replace(/^\//, '');
    const hasHash = targetUrl.includes('#');

    this.router.navigateByUrl(targetUrl).then(() => {
      if (!hasHash) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const hashId = targetUrl.split('#')[1];
        if (hashId) {
          setTimeout(() => {
            const el = document.getElementById(hashId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 120);
        }
      }
    });
  }
}
