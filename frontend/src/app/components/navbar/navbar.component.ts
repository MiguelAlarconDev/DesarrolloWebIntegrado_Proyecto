import { Component, AfterViewInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START NAVBAR -->  
	<div id="navigation" class="fixed-top navbar-light bg-faded site-navigation">
		<div class="container">
			<div class="row align-items-center">
				<div class="col-lg-3 col-md-4 col-sm-6">
					<div class="site-logo">
						<a href="/" class="brand-logo-link">
							<span class="brand-icon"><i class="fa fa-graduation-cap"></i></span>
							<span class="brand-text">Gestión de Cursos</span>
						</a>          			        				
					</div>
				</div>
				<div class="col-lg-6 col-md-6 col-sm-6">
					<div class="header_right">
						<nav id="main-menu" class="ms-auto">
							<ul>
								<li><a class="nav-link active" href="/"><i class="fa fa-home me-1"></i> Inicio</a></li>
								<li><a class="nav-link" href="/cursos"><i class="fa fa-book me-1"></i> Cursos</a></li>
								<li><a class="nav-link" href="/contacto"><i class="fa fa-envelope me-1"></i> Contacto</a></li>
								<li><a class="nav-link" href="/carrito"><i class="fa fa-shopping-cart me-1"></i> Mi Carrito</a></li>
							</ul>
						</nav>
						<div id="mobile_menu"></div>
					</div>
				</div>
				<div class="col-lg-3 col-md-3 col-sm-12">
					<div class="home_lc">
						<a href="/carrito" class="hlc" title="Ver Carrito de Matrícula" aria-label="Ver Carrito de Matrícula">
							<i class="fa fa-shopping-cart"></i>
							<span class="gactive is-empty" id="cart-nav-counter" style="display: none;">0</span>
						</a>
					</div>
					<div class="call_to_action" id="auth-buttons-nav">
						<a class="btn_one" href="/login">Ingresar</a>
						<a class="btn_two" href="/registro">Registrarse</a>
					</div>
				</div>
			</div>
		</div>
	</div> 	  
	<!-- END NAVBAR -->
  `
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private navSub?: Subscription;

  ngAfterViewInit(): void {
    this.syncNavbar();
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => this.syncNavbar(), 20);
      });
  }

  syncNavbar(): void {
    this.authService.updateNavbar();
    this.cartService.updateBadge();
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }
}
