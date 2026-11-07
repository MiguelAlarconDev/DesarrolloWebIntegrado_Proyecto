import { Component, AfterViewInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { APP_CONFIG, CursoModel } from '../../services/config.data';
import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP  -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title">
					<h1>Catálogo de Cursos</h1>
					<ul>
						<li>Cursos Especializados</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->

	<!-- START COURSE SECTION  -->
	<div class="best-cpurse section-padding">
		<div class="container">
			<div class="section-title text-center">
				<h2>Cursos y Talleres Disponibles</h2>
				<p>Elige tu curso de especialización y <span><u>reserva tu vacante en tiempo real</u></span></p>
			</div>				
			
			<!-- Panel Completo de Filtros Avanzados -->
			<div class="row justify-content-center">
				<div class="col-12 col-xl-11">
					<div class="cursos-filter-card">
						<div class="row g-3 align-items-center">
							<!-- 1. Buscador en tiempo real -->
							<div class="col-lg-5 col-md-12">
								<label class="d-block text-muted mb-1" style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
									<i class="fa fa-search me-1"></i> Búsqueda Rápida
								</label>
								<div class="filter-search-box">
									<input type="text" id="buscador-cursos" class="filter-search-input" placeholder="Buscar por título, docente o tema..." (input)="buscarCursos($any($event.target).value)">
									<i class="fa fa-search filter-search-icon"></i>
								</div>
							</div>

							<!-- 2. Filtro por Rango de Precios -->
							<div class="col-lg-3 col-sm-6">
								<label class="d-block text-muted mb-1" style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
									<i class="fa fa-tag me-1"></i> Rango de Precio
								</label>
								<select id="filtro-precio" class="filter-control-select" (change)="cambiarFiltroPrecio($any($event.target).value)">
									<option value="TODOS">Todos los precios</option>
									<option value="HASTA_150">Económicos (Hasta S/ 150)</option>
									<option value="151_200">Intermedios (S/ 151 a S/ 200)</option>
									<option value="MAS_200">Especializados (Más de S/ 200)</option>
								</select>
							</div>

							<!-- 3. Ordenar por -->
							<div class="col-lg-4 col-sm-6">
								<label class="d-block text-muted mb-1" style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
									<i class="fa fa-sort me-1"></i> Ordenar Por
								</label>
								<select id="filtro-orden" class="filter-control-select" (change)="cambiarOrdenCursos($any($event.target).value)">
									<option value="DESTACADOS">Destacados / Por Defecto</option>
									<option value="PRECIO_ASC">Precio: de menor a mayor</option>
									<option value="PRECIO_DESC">Precio: de mayor a menor</option>
									<option value="TITULO_ASC">Título: Alfabético (A - Z)</option>
									<option value="VACANTES_DESC">Mayor cantidad de vacantes</option>
								</select>
							</div>
						</div>

						<!-- Fila Inferior: Tabs de Modalidad y Toggle de Vacantes -->
						<div class="row g-3 align-items-center mt-2 pt-2 border-top">
							<div class="col-lg-8 col-12">
								<div class="d-flex align-items-center flex-wrap gap-2">
									<span class="text-muted me-1" style="font-size: 12px; font-weight: 700; text-transform: uppercase;">Modalidad:</span>
									<div class="filter-pills-group">
										<button type="button" (click)="filtrarCursos('TODOS')" [class.active]="currentModalidad === 'TODOS'" class="filter-pill-btn filter-mod-btn">
											Todos
										</button>
										<button type="button" (click)="filtrarCursos('VIRTUAL')" [class.active]="currentModalidad === 'VIRTUAL'" class="filter-pill-btn filter-mod-btn">
											<i class="fa fa-video-camera text-primary"></i> Virtuales en Vivo
										</button>
										<button type="button" (click)="filtrarCursos('PRESENCIAL')" [class.active]="currentModalidad === 'PRESENCIAL'" class="filter-pill-btn filter-mod-btn">
											<i class="fa fa-building text-warning"></i> Presenciales en Sede
										</button>
									</div>
								</div>
							</div>

							<div class="col-lg-4 col-12 d-flex justify-content-lg-end align-items-center">
								<label class="filter-checkbox-wrap">
									<input type="checkbox" id="filtro-vacantes" (change)="toggleSoloVacantes($any($event.target).checked)">
									<span>Solo con vacantes disponibles</span>
								</label>
							</div>
						</div>

						<!-- Barra de resumen de resultados -->
						<div class="filter-results-bar">
							<div>
								<span id="filtro-contador-text" style="color: #475569; font-weight: 600;">
									Cargando cursos disponibles...
								</span>
							</div>
							<div id="filtro-limpiar-box" style="display: none;">
								<button type="button" class="btn-reset-filters" (click)="limpiarFiltros()">
									<i class="fa fa-times-circle"></i> Limpiar filtros
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Grid de Cursos -->
			<div class="row" id="cursos-container"></div>
		</div>
	</div>
	<!-- END COURSE SECTION -->
  `
})
export class CatalogoComponent implements AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cursoService = inject(CursoService);
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);
  private qSub?: Subscription;

  allCursos: CursoModel[] = [];
  currentModalidad = 'TODOS';
  searchKeyword = '';
  currentRangoPrecio = 'TODOS';
  currentOrden = 'DESTACADOS';
  onlyVacantes = false;
  paidCourseIds = new Set<string>();

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      (window as any).reservar = (id: string) => this.reservar(id);
      (window as any).limpiarFiltros = () => this.limpiarFiltros();
    }

    this.qSub = this.route.queryParams.subscribe(() => {
      setTimeout(() => {
        this.initCursosPage();
      }, 20);
    });
  }

  async initCursosPage(): Promise<void> {
    this.actualizarEstadoNavbar();

    const params = new URLSearchParams(window.location.search);
    const urlMod = (params.get('modalidad') || '').toUpperCase();
    if (['VIRTUAL', 'PRESENCIAL', 'TODOS'].includes(urlMod)) {
      this.currentModalidad = urlMod;
    } else {
      this.currentModalidad = 'TODOS';
    }

    const urlQ = params.get('q') || '';
    if (urlQ) {
      this.searchKeyword = urlQ.toLowerCase().trim();
      const searchInput = document.getElementById('buscador-cursos') as HTMLInputElement | null;
      if (searchInput) searchInput.value = urlQ;
    }

    this.allCursos = this.cursoService.getCachedCursos('TODOS');
    this.paidCourseIds = this.pedidoService.getCachedPaidCourseIds();
    this.applyFilter();

    await Promise.allSettled([
      this.cargarCursosPagadosAlumno(),
      (async () => {
        try {
          const remote = await this.cursoService.getCursos('TODOS');
          if (remote && remote.length > 0) {
            this.allCursos = remote;
          }
        } catch (e) {
          console.warn('[CatalogoComponent] Usando cursos locales precargados:', e);
        }
      })()
    ]);

    this.applyFilter();
    this.actualizarEstadoNavbar();
  }

  private async cargarCursosPagadosAlumno(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.paidCourseIds.clear();
      return;
    }

    try {
      const misMatriculas = await this.pedidoService.getMisMatriculas(user.id);
      this.paidCourseIds.clear();
      (misMatriculas || []).forEach(m => {
        if (m.estado === 'PAGADO') {
          const cid = (m.curso && m.curso.id) ? m.curso.id : (m.cursoId || m.id);
          if (cid) this.paidCourseIds.add(cid);
        }
      });
    } catch (_) {}
  }

  private actualizarEstadoNavbar(): void {
    this.cartService.updateBadge();
    this.authService.updateNavbar();
  }

  filtrarCursos(mod: string): void {
    this.currentModalidad = mod;
    this.applyFilter();
  }

  buscarCursos(keyword: string): void {
    this.searchKeyword = (keyword || '').toLowerCase().trim();
    this.applyFilter();
  }

  cambiarFiltroPrecio(valor: string): void {
    this.currentRangoPrecio = valor;
    this.applyFilter();
  }

  cambiarOrdenCursos(valor: string): void {
    this.currentOrden = valor;
    this.applyFilter();
  }

  toggleSoloVacantes(checked: boolean): void {
    this.onlyVacantes = !!checked;
    this.applyFilter();
  }

  limpiarFiltros(): void {
    this.currentModalidad = 'TODOS';
    this.searchKeyword = '';
    this.currentRangoPrecio = 'TODOS';
    this.currentOrden = 'DESTACADOS';
    this.onlyVacantes = false;

    const buscador = document.getElementById('buscador-cursos') as HTMLInputElement | null;
    if (buscador) buscador.value = '';

    const selectPrecio = document.getElementById('filtro-precio') as HTMLSelectElement | null;
    if (selectPrecio) selectPrecio.value = 'TODOS';

    const selectOrden = document.getElementById('filtro-orden') as HTMLSelectElement | null;
    if (selectOrden) selectOrden.value = 'DESTACADOS';

    const chkVacantes = document.getElementById('filtro-vacantes') as HTMLInputElement | null;
    if (chkVacantes) chkVacantes.checked = false;

    this.applyFilter();
    this.notifications.showToast('Filtros restablecidos.', 'info');
  }

  private actualizarContadorFiltros(visibles: number, total: number): void {
    const contadorEl = document.getElementById('filtro-contador-text');
    const limpiarBox = document.getElementById('filtro-limpiar-box');

    if (contadorEl) {
      contadorEl.innerHTML = `Mostrando <strong style="color: #0f172a;">${visibles}</strong> de <strong style="color: #0f172a;">${total}</strong> cursos disponibles`;
    }

    const hayFiltrosActivos = this.currentModalidad !== 'TODOS' ||
      this.searchKeyword !== '' ||
      this.currentRangoPrecio !== 'TODOS' ||
      this.currentOrden !== 'DESTACADOS' ||
      this.onlyVacantes;

    if (limpiarBox) {
      limpiarBox.style.display = hayFiltrosActivos ? 'block' : 'none';
    }
  }

  private applyFilter(): void {
    let filtered = [...this.cursoService.filterByModalidad(this.allCursos, this.currentModalidad)];

    if (this.searchKeyword) {
      filtered = filtered.filter(c =>
        (c.titulo && c.titulo.toLowerCase().includes(this.searchKeyword)) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(this.searchKeyword)) ||
        (c.docente && c.docente.toLowerCase().includes(this.searchKeyword))
      );
    }

    if (this.currentRangoPrecio === 'HASTA_150') {
      filtered = filtered.filter(c => Number(c.precio || 0) <= 150);
    } else if (this.currentRangoPrecio === '151_200') {
      filtered = filtered.filter(c => {
        const p = Number(c.precio || 0);
        return p > 150 && p <= 200;
      });
    } else if (this.currentRangoPrecio === 'MAS_200') {
      filtered = filtered.filter(c => Number(c.precio || 0) > 200);
    }

    if (this.onlyVacantes) {
      filtered = filtered.filter(c => {
        const disp = c.aforoDisponible !== undefined ? c.aforoDisponible : (c.aforoMaximo || 30);
        return Number(disp) > 0;
      });
    }

    if (this.currentOrden === 'PRECIO_ASC') {
      filtered.sort((a, b) => Number(a.precio || 0) - Number(b.precio || 0));
    } else if (this.currentOrden === 'PRECIO_DESC') {
      filtered.sort((a, b) => Number(b.precio || 0) - Number(a.precio || 0));
    } else if (this.currentOrden === 'TITULO_ASC') {
      filtered.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
    } else if (this.currentOrden === 'VACANTES_DESC') {
      filtered.sort((a, b) => {
        const aDisp = a.aforoDisponible !== undefined ? a.aforoDisponible : 30;
        const bDisp = b.aforoDisponible !== undefined ? b.aforoDisponible : 30;
        return Number(bDisp) - Number(aDisp);
      });
    }

    this.actualizarContadorFiltros(filtered.length, this.allCursos.length);
    this.renderCursos(filtered);
  }

  private renderCursos(list: CursoModel[]): void {
    const container = document.getElementById('cursos-container');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 45px 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 16px;">
              <i class="fa fa-search"></i>
            </div>
            <h4 style="color: #0f172a; font-weight: 800; margin-bottom: 8px;">No se encontraron cursos</h4>
            <p class="text-muted" style="font-size: 14px; margin-bottom: 20px;">
              No hay cursos que coincidan con los criterios seleccionados. Prueba modificando los filtros o el término de búsqueda.
            </p>
            <button type="button" onclick="window.limpiarFiltros()" class="btn_one" style="font-size: 13.5px; padding: 10px 22px; border-radius: 8px;">
              <i class="fa fa-refresh me-1"></i> Restablecer todos los filtros
            </button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((c, i) => {
      const isVirtual = c.modalidad === 'VIRTUAL';
      const badgeHtml = isVirtual
        ? `<span class="badge-mod-virtual"><i class="fa fa-video-camera"></i> Virtual en Vivo (Zoom / Meet)</span>`
        : `<span class="badge-mod-presencial"><i class="fa fa-building"></i> Presencial (Sede & Aula)</span>`;

      const total = c.aforoMaximo || 30;
      const libres = c.aforoDisponible !== undefined ? c.aforoDisponible : 30;
      let seatsClass = 'seats-live-badge';
      let seatsText = `<i class="fa fa-table"></i> <strong>${libres} Vacantes Disponibles</strong> (de ${total})`;

      if (libres <= 0) {
        seatsClass += ' soldout';
        seatsText = `<i class="fa fa-times-circle"></i> <strong>Aforo Completo (Agotado)</strong>`;
      } else if (libres <= 3) {
        seatsClass += ' urgent';
        seatsText = `<i class="fa fa-exclamation-circle"></i> <strong>¡Últimas ${libres} Vacantes!</strong>`;
      }

      const imgUrl = c.imagen || `assets/images/all-img/c${(i % 6) + 1}.png`;
      const docenteNombre = c.docente || (isVirtual ? 'Ing. Roberto Docente' : 'Ing. Carlos Mendoza');
      const isPaid = this.paidCourseIds.has(c.id);

      let actionBtnHtml = '';
      if (isPaid) {
        actionBtnHtml = `
          <a href="/mis-cursos" class="btn_one btn-card-enrolled" style="text-decoration: none; padding: 7px 14px; font-size: 12.5px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
            <i class="fa fa-graduation-cap"></i> Ir a Mi Clase
          </a>
        `;
      } else if (libres > 0) {
        actionBtnHtml = `
          <button onclick="window.reservar('${c.id}')" class="btn_two btn-card-inscribir" style="cursor: pointer;">
            <i class="fa fa-shopping-cart"></i> Inscribirme
          </button>
        `;
      } else {
        actionBtnHtml = `<button type="button" class="btn_two btn-card-agotado" disabled style="opacity: 0.65; cursor: not-allowed; background: #f1f5f9; color: #94a3b8; border: 1.5px solid #e2e8f0; font-size: 12.5px; font-weight: 700; border-radius: 6px; padding: 8px 14px; display: inline-flex; align-items: center; gap: 6px;"><i class="fa fa-lock"></i> Agotado</button>`;
      }

      const enrolledTag = isPaid
        ? `<div class="badge-enrolled-corner"><i class="fa fa-check-circle me-1"></i>Ya Matriculado</div>`
        : '';

      return `
        <div class="col-lg-4 col-sm-6 col-xs-12" style="margin-bottom: 30px;">
          <div class="course-slide" style="height: 100%; display: flex; flex-direction: column; box-shadow: 0 5px 20px rgba(0,0,0,0.06); border-radius: 8px; overflow: hidden; background: #fff; position: relative;">
            <div class="course-img" style="position: relative;">
              <a href="/curso-detalle?id=${c.id}">
                <img src="${imgUrl}" alt="${c.titulo}" style="width: 100%; height: 210px; object-fit: cover;">
              </a>
              ${enrolledTag}
              <div class="course-date course-price-wrap">
                <span class="course-price-badge"><span class="price-currency">S/</span><span class="price-amount">${Number(c.precio).toFixed(2)}</span></span>
              </div>
            </div>
            <div class="course-content" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 25px;">
              <div>
                <div class="mb-2">${badgeHtml}</div>
                <h3 style="font-size: 18px; line-height: 1.4; margin-bottom: 12px; min-height: 50px;">
                  <a href="/curso-detalle?id=${c.id}">${c.titulo}</a>
                </h3>
                <span class="d-block text-muted mb-1" style="font-size: 14px;"><i class="fa fa-calendar text-primary me-1"></i> ${c.horario}</span>
                <span class="d-block text-muted mb-3" style="font-size: 14px;"><i class="fa fa-user-circle text-secondary me-1"></i> ${docenteNombre}</span>
                <div class="mb-3">
                  <span class="${seatsClass}">${seatsText}</span>
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center pt-3 border-top">
                <a class="c_btn" href="/curso-detalle?id=${c.id}"><i class="fa fa-book me-1"></i> Ver Temario</a>
                ${actionBtnHtml}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  reservar(cursoId: string): void {
    let c = (this.allCursos && this.allCursos.length > 0) ? this.allCursos.find(item => item.id === cursoId) : undefined;
    if (!c) {
      c = APP_CONFIG.INITIAL_COURSES.find(item => item.id === cursoId);
    }
    if (!c) {
      const cached: CursoModel[] = JSON.parse(localStorage.getItem('app_cursos_cache') || '[]');
      c = cached.find(item => item.id === cursoId);
    }
    if (!c) {
      this.router.navigateByUrl('/carrito');
      return;
    }

    const res = this.cartService.addToCart(c);
    this.actualizarEstadoNavbar();
    this.cartService.bumpBadge();
    this.applyFilter();

    this.notifications.showToast(res.message || '¡Curso agregado a tu carrito!', 'success');
    setTimeout(() => {
      this.router.navigateByUrl('/carrito');
    }, 500);
  }

  ngOnDestroy(): void {
    this.qSub?.unsubscribe();
  }
}
