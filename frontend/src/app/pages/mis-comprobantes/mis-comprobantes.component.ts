import { Component, OnInit, AfterViewInit, ViewEncapsulation, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { APP_CONFIG } from '../../services/config.data';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

export interface ComprobanteItemView {
  pedidoId: string;
  codigoOrden: string;
  serie: string;
  numero: string;
  correlativo: string;
  tipo: 'BOLETA' | 'FACTURA';
  fechaEmision: string;
  timestamp: number;
  cursoId: string;
  cursoTitulo: string;
  cursoImagen: string;
  modalidad: 'VIRTUAL' | 'PRESENCIAL' | string;
  horario: string;
  clienteNombre: string;
  docTipo: 'DNI' | 'RUC';
  docNumero: string;
  correo: string;
  metodoPago: string;
  subtotal: number;
  igv: number;
  total: number;
  pdfUrl: string;
}

@Component({
  selector: 'app-mis-comprobantes',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title">
					<h1>Mis Comprobantes</h1>
					<ul>
						<li>Facturación Electrónica</li>
					</ul>
				</div>
			</div>
		</div>
	</section>
	<!-- END SECTION TOP -->

	<!-- SECCIÓN PRINCIPAL (MISMO DISEÑO QUE TE GUSTÓ) -->
	<div class="shopping-cart section">
		<div class="container">
			@if (!isLogged) {
				<div class="row">
					<div class="col-12 text-center py-5">
						<i class="ti-receipt text-muted" style="font-size: 72px;"></i>
						<h3 class="mt-3">Inicia sesión para ver tus comprobantes</h3>
						<p class="text-muted">Ingresa con tu cuenta de estudiante para consultar y descargar tus boletas o facturas.</p>
						<a href="/login?redirect=mis-comprobantes" class="btn_one mt-3">Iniciar Sesión</a>
					</div>
				</div>
			} @else {
				<!-- Filtro con las clases nativas del sistema -->
				<div class="row">
					<div class="col-12">
						<div class="cursos-filter-card" style="margin-bottom: 24px;">
							<div class="row g-3 align-items-center">
								<div class="col-lg-5 col-md-12">
									<div class="filter-search-box">
										<input
											type="text"
											id="buscador-comprobantes"
											class="filter-search-input"
											placeholder="Buscar por curso, serie (B001/F001) u orden..."
											[value]="searchKeyword"
											(input)="onSearchChange($any($event.target).value)">
										<i class="fa fa-search filter-search-icon"></i>
									</div>
								</div>

								<div class="col-lg-4 col-md-7">
									<div class="filter-pills-group">
										<button
											type="button"
											(click)="onTipoChange('TODOS')"
											[class.active]="currentTipo === 'TODOS'"
											class="filter-pill-btn">
											Todos ({{ allComprobantes.length }})
										</button>
										<button
											type="button"
											(click)="onTipoChange('BOLETA')"
											[class.active]="currentTipo === 'BOLETA'"
											class="filter-pill-btn">
											Boletas ({{ countBoletas }})
										</button>
										<button
											type="button"
											(click)="onTipoChange('FACTURA')"
											[class.active]="currentTipo === 'FACTURA'"
											class="filter-pill-btn">
											Facturas ({{ countFacturas }})
										</button>
									</div>
								</div>

								<div class="col-lg-3 col-md-5">
									<select class="filter-control-select" [value]="currentOrden" (change)="onOrdenChange($any($event.target).value)">
										<option value="RECIENTES">Más recientes</option>
										<option value="ANTIGUOS">Más antiguos</option>
										<option value="MONTO_DESC">Mayor importe</option>
										<option value="MONTO_ASC">Menor importe</option>
									</select>
								</div>
							</div>

							<div class="filter-results-bar">
								<span style="color: #475569; font-weight: 600;">
									@if (isLoading) {
										Cargando comprobantes...
									} @else {
										Mostrando <strong style="color: #0f172a;">{{ filteredComprobantes.length }}</strong> de <strong style="color: #0f172a;">{{ allComprobantes.length }}</strong> comprobantes
									}
								</span>
								@if (hasActiveFilters) {
									<button type="button" class="btn-reset-filters" (click)="limpiarFiltros()">
										<i class="fa fa-times-circle"></i> Limpiar filtros
									</button>
								}
							</div>
						</div>
					</div>
				</div>

				@if (isLoading) {
					<div class="row">
						<div class="col-12 text-center py-5">
							<div class="spinner-border text-success" role="status">
								<span class="visually-hidden">Cargando...</span>
							</div>
						</div>
					</div>
				} @else if (allComprobantes.length === 0) {
					<div class="row">
						<div class="col-12 text-center py-5">
							<i class="ti-receipt text-muted" style="font-size: 72px;"></i>
							<h3 class="mt-3">Aún no tienes comprobantes emitidos</h3>
							<p class="text-muted">Cuando te matricules en un curso, tu boleta o factura electrónica aparecerá aquí.</p>
							<a href="/cursos" class="btn_one mt-3">Ver Catálogo de Cursos</a>
						</div>
					</div>
				} @else if (filteredComprobantes.length === 0) {
					<div class="row">
						<div class="col-12 text-center py-5">
							<h4 class="mb-2">No se encontraron comprobantes con ese filtro</h4>
							<p class="text-muted mb-3">Prueba con otro término o restablece los filtros.</p>
							<button type="button" class="btn_one" (click)="limpiarFiltros()">Restablecer filtros</button>
						</div>
					</div>
				} @else {
					<!-- Tabla nativa del sistema (shopping-summery) -->
					<div class="row">
						<div class="col-12">
							<table class="table shopping-summery">
								<thead>
									<tr class="main-hading">
										<th>CURSO</th>
										<th>DETALLE Y RECEPTOR</th>
										<th class="text-center">COMPROBANTE</th>
										<th class="text-center">FECHA</th>
										<th class="text-center">TOTAL</th>
										<th class="text-center">ACCIONES</th>
									</tr>
								</thead>
								<tbody>
									@for (comp of filteredComprobantes; track comp.cursoId) {
										<tr>
											<td class="image" data-title="Curso">
												<img [src]="comp.cursoImagen" [alt]="comp.cursoTitulo">
											</td>
											<td class="product-des" data-title="Detalle">
												<p class="product-name">
													<a [href]="'/curso-detalle?id=' + comp.cursoId">{{ comp.cursoTitulo }}</a>
												</p>
												<p class="product-des mb-1">
													<span [class]="comp.modalidad === 'VIRTUAL' ? 'badge-mod-virtual' : 'badge-mod-presencial'">
														<i class="fa" [ngClass]="comp.modalidad === 'VIRTUAL' ? 'fa-video-camera' : 'fa-building'"></i>
														{{ comp.modalidad }}
													</span>
													&bull; Orden: {{ comp.codigoOrden }}
												</p>
												<small class="text-muted">
													{{ comp.clienteNombre }} &bull; {{ comp.docTipo }}: {{ comp.docNumero }}
												</small>
											</td>
											<td class="qty text-center" data-title="Comprobante">
												<span class="badge bg-light text-dark p-2 border">{{ comp.correlativo }}</span>
												<small class="d-block text-muted mt-1">{{ comp.tipo }}</small>
											</td>
											<td class="price text-center" data-title="Fecha">
												<span>{{ comp.fechaEmision }}</span>
											</td>
											<td class="total-amount text-center" data-title="Total">
												<span>S/ {{ comp.total.toFixed(2) }}</span>
											</td>
											<td class="action text-center" data-title="Acciones">
												<div class="d-inline-flex align-items-center justify-content-center gap-2">
													<button type="button" class="c_btn" (click)="abrirModalDetalle(comp)" title="Ver comprobante">
														<i class="fa fa-eye"></i> Ver
													</button>
													<button type="button" class="btn_two btn-card-inscribir" (click)="descargarPdfOficial(comp)" title="Descargar PDF">
														<i class="fa fa-download"></i> PDF
													</button>
												</div>
											</td>
										</tr>
									}
								</tbody>
							</table>
						</div>
					</div>

					<!-- Resumen inferior nativo (total-amount) -->
					<div class="row">
						<div class="col-12">
							<div class="total-amount">
								<div class="row align-items-center">
									<div class="col-lg-8 col-md-5 col-12">
										<div class="left">
											<div class="abmv mb-0">
												<span class="ti-shield"></span>
												<h4>Facturación Electrónica SUNAT</h4>
												<p>Tus boletas y facturas electrónicas corresponden a tus matrículas confirmadas y están disponibles para descarga inmediata en formato PDF.</p>
											</div>
										</div>
									</div>
									<div class="col-lg-4 col-md-7 col-12">
										<div class="right">
											<ul>
												<li>Subtotal (sin IGV)<span>S/ {{ filteredSubtotalSum.toFixed(2) }}</span></li>
												<li>I.G.V. (18%)<span>S/ {{ filteredIgvSum.toFixed(2) }}</span></li>
												<li class="last">Total Pagado<span>S/ {{ filteredTotalSum.toFixed(2) }}</span></li>
											</ul>
											<div class="button5">
												<a href="/mis-cursos" class="btn">Ir a Mis Clases</a>
												<a href="/cursos" class="btn">Seguir Explorando Cursos</a>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				}
			}
		</div>
	</div>

	<!-- VENTANA MODAL MINIMALISTA AL PULSAR "VER" -->
	@if (selectedComprobante) {
		<div class="comp-modal-overlay" (click)="cerrarModalDetalle()">
			<div class="comp-modal-window" (click)="$event.stopPropagation()">
				<!-- Cabecera simple y limpia -->
				<div class="comp-modal-head">
					<div>
						<span class="comp-modal-type">
							{{ selectedComprobante.tipo === 'FACTURA' ? 'Factura Electrónica' : 'Boleta de Venta' }}
						</span>
						<h4 class="comp-modal-number">{{ selectedComprobante.correlativo }}</h4>
					</div>
					<button type="button" class="comp-modal-close-btn" (click)="cerrarModalDetalle()" aria-label="Cerrar">
						&times;
					</button>
				</div>

				<!-- Lista limpia de datos (clave / valor) -->
				<div class="comp-modal-content">
					<div class="comp-modal-row">
						<span>Curso</span>
						<strong>{{ selectedComprobante.cursoTitulo }}</strong>
					</div>
					<div class="comp-modal-row">
						<span>Modalidad</span>
						<strong>{{ selectedComprobante.modalidad }}</strong>
					</div>
					<div class="comp-modal-row">
						<span>Código de orden</span>
						<strong>{{ selectedComprobante.codigoOrden }}</strong>
					</div>
					<div class="comp-modal-row">
						<span>Fecha de emisión</span>
						<strong>{{ selectedComprobante.fechaEmision }}</strong>
					</div>
					<div class="comp-modal-row">
						<span>Titular</span>
						<strong>{{ selectedComprobante.clienteNombre }}</strong>
					</div>
					<div class="comp-modal-row">
						<span>{{ selectedComprobante.docTipo }}</span>
						<strong>{{ selectedComprobante.docNumero }}</strong>
					</div>
					<div class="comp-modal-row">
						<span>Estado</span>
						<strong style="color: #16a34a;">Pagado</strong>
					</div>

					<div class="comp-modal-divider"></div>

					<div class="comp-modal-row">
						<span>Subtotal (sin IGV)</span>
						<span>S/ {{ selectedComprobante.subtotal.toFixed(2) }}</span>
					</div>
					<div class="comp-modal-row">
						<span>I.G.V. (18%)</span>
						<span>S/ {{ selectedComprobante.igv.toFixed(2) }}</span>
					</div>
					<div class="comp-modal-row comp-modal-total">
						<span>Total Pagado</span>
						<strong>S/ {{ selectedComprobante.total.toFixed(2) }}</strong>
					</div>
				</div>

				<!-- Botones del sistema -->
				<div class="comp-modal-actions">
					<button type="button" class="c_btn" (click)="cerrarModalDetalle()">
						Cerrar
					</button>
					<button type="button" class="btn_two btn-card-inscribir" (click)="descargarPdfOficial(selectedComprobante)">
						<i class="fa fa-download"></i> Descargar PDF
					</button>
				</div>
			</div>
		</div>
	}
  `
})
export class MisComprobantesComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  isLogged = true;
  isLoading = true;
  userName = 'Estudiante';
  userEmail = '';
  userDni = '30000003';

  allComprobantes: ComprobanteItemView[] = [];
  filteredComprobantes: ComprobanteItemView[] = [];
  selectedComprobante: ComprobanteItemView | null = null;

  searchKeyword = '';
  currentTipo: 'TODOS' | 'BOLETA' | 'FACTURA' = 'TODOS';
  currentOrden = 'RECIENTES';

  private resolveUser(): any {
    let user = this.authService.getCurrentUser();
    if (!user && typeof window !== 'undefined' && window.location.search && window.location.search.includes('sample=1')) {
      user = {
        id: 'a0000000-0000-0000-0000-000000000003',
        nombres: 'Carlos',
        apellidos: 'Alarcón',
        correo: 'estudiante@cursos.com',
        dni: '30000003',
        whatsapp: '999555666',
        rol: 'ESTUDIANTE'
      };
    }
    return user;
  }

  ngOnInit(): void {
    const user = this.resolveUser();
    if (user) {
      this.isLogged = true;
      this.userName = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Estudiante';
      this.userEmail = user.correo || 'estudiante@cursos.com';
      this.userDni = user.dni || '30000003';
    } else {
      this.isLogged = false;
      this.isLoading = false;
    }
    this.initComprobantes();
  }

  ngAfterViewInit(): void {
    this.cartService.updateBadge();
    this.authService.updateNavbar();
    this.cdr.detectChanges();
  }

  get countBoletas(): number {
    return this.allComprobantes.filter(c => c.tipo === 'BOLETA').length;
  }

  get countFacturas(): number {
    return this.allComprobantes.filter(c => c.tipo === 'FACTURA').length;
  }

  get filteredSubtotalSum(): number {
    return this.filteredComprobantes.reduce((acc, c) => acc + c.subtotal, 0);
  }

  get filteredIgvSum(): number {
    return this.filteredComprobantes.reduce((acc, c) => acc + c.igv, 0);
  }

  get filteredTotalSum(): number {
    return this.filteredComprobantes.reduce((acc, c) => acc + c.total, 0);
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchKeyword.trim().length > 0 ||
      this.currentTipo !== 'TODOS' ||
      this.currentOrden !== 'RECIENTES'
    );
  }

  async initComprobantes(): Promise<void> {
    this.cartService.updateBadge();
    this.authService.updateNavbar();

    const user = this.resolveUser();
    if (user && user.rol === 'ADMIN') {
      this.router.navigateByUrl('/portal-admin');
      return;
    }
    if (user && user.rol === 'DOCENTE') {
      this.router.navigateByUrl('/portal-docente');
      return;
    }

    if (!user) {
      this.isLogged = false;
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.isLogged = true;
    this.userName = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || 'Estudiante';
    this.userEmail = user.correo || 'estudiante@cursos.com';
    this.userDni = user.dni || '30000003';
    this.isLoading = true;
    this.cdr.detectChanges();

    const remoteOrders = await this.pedidoService.getMisMatriculas(user.id);
    const localHistory = this.pedidoService.getMisMatriculasSync();
    const lastOrder = this.pedidoService.getLastOrder();

    const localMap = new Map<string, any>();
    if (lastOrder) {
      if (lastOrder.id) localMap.set(String(lastOrder.id), lastOrder);
      if (lastOrder.codigoOrden) localMap.set(String(lastOrder.codigoOrden), lastOrder);
    }
    (localHistory || []).forEach(lo => {
      if (lo && lo.id) localMap.set(String(lo.id), lo);
      if (lo && lo.codigoOrden) localMap.set(String(lo.codigoOrden), lo);
    });

    const combinedRaw: any[] = [...(remoteOrders || [])];
    (localHistory || []).forEach(lo => {
      if (lo && lo.estado === 'PAGADO') {
        const exists = combinedRaw.some(ro => ro.id === lo.id || ro.codigoOrden === lo.codigoOrden);
        if (!exists) combinedRaw.push(lo);
      }
    });

    const cursosVistos = new Set<string>();
    const items: ComprobanteItemView[] = [];

    combinedRaw.forEach((raw, idx) => {
      if (!raw || raw.estado !== 'PAGADO') return;

      const localMatch = localMap.get(String(raw.id)) || localMap.get(String(raw.codigoOrden)) || {};
      const merged = { ...localMatch, ...raw, comprobante: raw.comprobante || localMatch.comprobante };

      const cid = String((merged.curso && merged.curso.id) ? merged.curso.id : (merged.cursoId || merged.id));
      if (cursosVistos.has(cid)) return;
      cursosVistos.add(cid);

      const cursoRef = APP_CONFIG.INITIAL_COURSES.find(c => c.id === cid);
      const cursoTitulo = (merged.curso && merged.curso.titulo) || merged.cursoTitulo || (cursoRef ? cursoRef.titulo : 'Curso Profesional');
      const modalidad = (merged.curso && merged.curso.modalidad) || merged.modalidad || (cursoRef ? cursoRef.modalidad : 'VIRTUAL');
      const horario = (merged.curso && merged.curso.horario) || merged.horario || (cursoRef ? cursoRef.horario : 'Horario flexible');
      const cursoImagen = (merged.curso && merged.curso.imagen) || (cursoRef ? cursoRef.imagen : `assets/images/all-img/c${(idx % 3) + 1}.png`);

      const comp = merged.comprobante || {};
      const rucDigits = comp.rucCliente || (comp.docIdentidad && String(comp.docIdentidad).length === 11 ? comp.docIdentidad : '');
      const isFactura = comp.tipo === 'FACTURA' || comp.tipoComprobante === 'FACTURA' || (rucDigits && String(rucDigits).length === 11);
      const tipo: 'BOLETA' | 'FACTURA' = isFactura ? 'FACTURA' : 'BOLETA';
      const serie = comp.serie || (tipo === 'FACTURA' ? 'F001' : 'B001');

      const orderDigits = String(merged.codigoOrden || '').replace(/\D/g, '');
      const numBase = comp.numero || comp.numeroCorrelativo || (orderDigits ? orderDigits.slice(-8) : String(1042 + idx));
      const numeroPadded = String(numBase).padStart(8, '0');
      const correlativo = comp.correlativo || `${serie}-${numeroPadded}`;

      const total = Number(comp.total || comp.montoTotal || merged.monto || (cursoRef ? cursoRef.precio : 150));
      const subtotal = +(total / 1.18).toFixed(2);
      const igv = +(total - subtotal).toFixed(2);

      const rawDate = merged.fechaActualizacion || merged.fechaRegistro || merged.createdAt || new Date().toISOString();
      const parsedDate = new Date(rawDate);
      const timestamp = isNaN(parsedDate.getTime()) ? Date.now() - idx * 86400000 : parsedDate.getTime();
      const fechaEmision = isNaN(parsedDate.getTime())
        ? (merged.fechaPago || new Date().toLocaleDateString('es-PE'))
        : parsedDate.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const clienteNombre = isFactura
        ? (comp.razonSocial || comp.cliente || this.userName)
        : (comp.cliente || this.userName);
      const docTipo: 'DNI' | 'RUC' = isFactura ? 'RUC' : 'DNI';
      const docNumero = isFactura
        ? (rucDigits || '20609876543')
        : (comp.docIdentidad || this.userDni);

      const pedidoId = String(merged.id || '87a51c94-c263-4a80-8550-5ff9300f47ac');
      const codigoOrden = String(merged.codigoOrden || `ORD-${100000 + idx}`);

      const params = new URLSearchParams({
        codigoOrden,
        estudiante: clienteNombre,
        correo: this.userEmail,
        curso: cursoTitulo,
        monto: total.toFixed(2),
        tipoComprobante: tipo,
        ...(isFactura ? { rucCliente: docNumero, razonSocial: clienteNombre } : {})
      });

      const pdfUrl = `${APP_CONFIG.API_BASE_URL}/comprobantes/${pedidoId}/descargar?${params.toString()}`;

      items.push({
        pedidoId,
        codigoOrden,
        serie,
        numero: numeroPadded,
        correlativo,
        tipo,
        fechaEmision,
        timestamp,
        cursoId: cid,
        cursoTitulo,
        cursoImagen,
        modalidad,
        horario,
        clienteNombre,
        docTipo,
        docNumero,
        correo: this.userEmail,
        metodoPago: merged.metodoPago || 'Mercado Pago',
        subtotal,
        igv,
        total,
        pdfUrl
      });
    });

    this.allComprobantes = items;
    this.isLoading = false;
    this.aplicarFiltros();
    this.cdr.detectChanges();
  }

  onSearchChange(val: string): void {
    this.searchKeyword = val || '';
    this.aplicarFiltros();
  }

  onTipoChange(tipo: 'TODOS' | 'BOLETA' | 'FACTURA'): void {
    this.currentTipo = tipo;
    this.aplicarFiltros();
  }

  onOrdenChange(orden: string): void {
    this.currentOrden = orden || 'RECIENTES';
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.searchKeyword = '';
    this.currentTipo = 'TODOS';
    this.currentOrden = 'RECIENTES';
    const inputEl = document.getElementById('buscador-comprobantes') as HTMLInputElement | null;
    if (inputEl) inputEl.value = '';
    this.aplicarFiltros();
    this.notifications.showToast('Filtros restablecidos.', 'info');
  }

  aplicarFiltros(): void {
    const q = this.searchKeyword.toLowerCase().trim();

    let list = this.allComprobantes.filter(item => {
      if (this.currentTipo !== 'TODOS' && item.tipo !== this.currentTipo) {
        return false;
      }
      if (q) {
        const haystack = `${item.cursoTitulo} ${item.correlativo} ${item.codigoOrden} ${item.docNumero} ${item.clienteNombre}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (this.currentOrden === 'RECIENTES') {
      list.sort((a, b) => b.timestamp - a.timestamp);
    } else if (this.currentOrden === 'ANTIGUOS') {
      list.sort((a, b) => a.timestamp - b.timestamp);
    } else if (this.currentOrden === 'MONTO_DESC') {
      list.sort((a, b) => b.total - a.total);
    } else if (this.currentOrden === 'MONTO_ASC') {
      list.sort((a, b) => a.total - b.total);
    }

    this.filteredComprobantes = list;
    this.cdr.detectChanges();
  }

  abrirModalDetalle(comp: ComprobanteItemView): void {
    this.selectedComprobante = comp;
    this.cdr.detectChanges();
  }

  cerrarModalDetalle(): void {
    this.selectedComprobante = null;
    this.cdr.detectChanges();
  }

  async descargarPdfOficial(comp: ComprobanteItemView): Promise<void> {
    try {
      this.notifications.showToast(`Descargando ${comp.correlativo}.pdf...`, 'info');
      const response = await fetch(comp.pdfUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Comprobante_${comp.correlativo}_${comp.codigoOrden}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      this.notifications.showToast(`Comprobante ${comp.correlativo} descargado.`, 'success');
    } catch (_) {
      window.open(comp.pdfUrl, '_blank');
    }
  }
}
