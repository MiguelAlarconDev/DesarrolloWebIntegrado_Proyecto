import { Component, AfterViewInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START CONFIRMATION CONTENT -->
	<main class="confirmacion-page">
		<div class="container">
			<!-- Header Hero de Éxito -->
			<div class="confirm-hero">
				<div class="confirm-success-icon">
					<i class="fa fa-check"></i>
				</div>
				<h1>¡Matrícula Confirmada con Éxito!</h1>
				<p>
					Tu vacante ha sido asegurada y tu comprobante oficial fue emitido en <strong>Gestión de Cursos</strong>.
				</p>
				<div class="confirm-meta-bar">
					<span><i class="fa fa-barcode" style="color: #2eca7f; margin-right: 4px;"></i> Código: <strong id="code-order-display">ORD-894210</strong></span>
					<span style="color: #cbd5e1;">&bull;</span>
					<span><i class="fa fa-calendar" style="color: #2eca7f; margin-right: 4px;"></i> Fecha: <strong id="order-date-display">23/10/2026</strong></span>
					<span style="color: #cbd5e1;">&bull;</span>
					<span class="badge-paid"><i class="fa fa-check-circle me-1"></i>Pago Confirmado</span>
				</div>
			</div>

			<!-- Grid Principal: Detalle de Clase + Comprobante Oficial -->
			<div class="row">
				<!-- Columna 1: DETALLES DEL PROGRAMA Y ACCESO -->
				<div class="col-lg-6 col-12 mb-4">
					<div class="confirm-card">
						<div class="confirm-card-header">
							<h3 class="confirm-card-title"><i class="fa fa-graduation-cap"></i> Detalles de tu Programa</h3>
							<span id="rec-curso-mod" class="badge bg-primary" style="font-size: 11px; padding: 5px 10px; font-weight: 700; border-radius: 999px;">VIRTUAL</span>
						</div>
						
						<h4 id="rec-curso-title" style="color: #0f172a; font-weight: 800; font-size: 19px; margin-bottom: 10px; line-height: 1.35;">
							Desarrollo Web Integrado con Spring Boot
						</h4>

						<div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px; color: #64748b; font-size: 13.5px;">
							<i class="fa fa-clock-o" style="color: #2eca7f;"></i>
							<span id="rec-horario" style="font-weight: 600; color: #334155;">Sábados y Domingos 09:00 - 13:00</span>
						</div>

						<!-- Caja Destacada de Acceso al Aula -->
						<div id="box-acceso-aula" class="access-room-box">
							<h5>
								<i class="fa fa-video-camera" style="color: #2eca7f;"></i> Sala de Clases en Vivo (Google Meet / Zoom)
							</h5>
							<p>
								El enlace para unirte a tus sesiones en tiempo real ya se encuentra habilitado para tu cuenta:
							</p>
							<a id="btn-link-clase" href="https://meet.google.com" target="_blank" class="btn-enter-room">
								<i class="fa fa-external-link"></i> Entrar a la Sala Virtual
							</a>
						</div>

						<!-- Datos del Estudiante Matriculado -->
						<div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: auto;">
							<h5 style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
								Datos del Alumno Titular
							</h5>
							<div class="row g-2" style="font-size: 13px; color: #334155;">
								<div class="col-sm-6 col-12"><strong>Alumno:</strong> <span id="rec-cliente">Carlos Alarcón</span></div>
								<div class="col-sm-6 col-12"><strong>Documento:</strong> <span id="rec-doc">74859612</span></div>
								<div class="col-sm-6 col-12"><strong>WhatsApp:</strong> <span id="rec-telefono">935300159</span></div>
								<div class="col-sm-6 col-12"><strong>Correo:</strong> <span id="rec-correo">alumno@cursos.com</span></div>
							</div>
						</div>
					</div>
				</div>

				<!-- Columna 2: COMPROBANTE OFICIAL SUNAT -->
				<div class="col-lg-6 col-12 mb-4">
					<div class="confirm-card">
						<div class="confirm-card-header">
							<h3 class="confirm-card-title"><i class="fa fa-file-text-o"></i> Comprobante Electrónico SUNAT</h3>
							<span id="rec-metodo" class="badge" style="background: #009ee3; color: #fff; font-size: 11px; padding: 5px 10px; border-radius: 999px;">Mercado Pago</span>
						</div>

						<!-- Header de Facturación Oficial -->
						<div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f1f5f9; padding-bottom: 14px; margin-bottom: 16px; gap: 15px;">
							<div>
								<h5 style="font-weight: 800; color: #0f172a; margin-bottom: 3px; font-size: 15px;">Gestión de Cursos S.A.C.</h5>
								<p style="color: #64748b; font-size: 12px; margin-bottom: 2px;">RUC: 20609876543 &bull; Lima, Perú</p>
								<p style="color: #64748b; font-size: 11.5px; margin-bottom: 0;">Capacitación Profesional y Tecnológica</p>
							</div>
							<div class="sunat-official-box">
								<span style="font-size: 10px; color: #64748b; display: block; font-weight: 700;">R.U.C. 20609876543</span>
								<strong id="sunat-tipo-title" style="font-size: 10.5px; color: #0f172a; display: block; text-transform: uppercase;">BOLETA DE VENTA ELECTRÓNICA</strong>
								<span id="sunat-serie-display" style="font-size: 13.5px; font-weight: 800; color: #dc2626; display: block;">B001-00001042</span>
							</div>
						</div>

						<!-- Tabla de Ítems del Comprobante -->
						<table class="sunat-table">
							<thead>
								<tr>
									<th>Descripción del Programa</th>
									<th class="text-center" style="width: 85px;">Modalidad</th>
									<th class="text-end" style="width: 95px;">Importe</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td id="rec-table-desc" style="font-weight: 600;">Desarrollo Web Integrado con Spring Boot</td>
									<td class="text-center"><span class="badge bg-secondary" id="rec-table-mod">VIRTUAL</span></td>
									<td class="text-end" id="rec-table-total" style="font-weight: 700;">S/ 150.00</td>
								</tr>
							</tbody>
						</table>

						<!-- Totales y Medio de Pago -->
						<div class="sunat-totals-card">
							<div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #64748b;">
								<span>Op. Gravada / Subtotal:</span>
								<strong id="rec-subtotal-val" style="color: #0f172a;">S/ 127.12</strong>
							</div>
							<div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #64748b;">
								<span>I.G.V. (18%):</span>
								<strong id="rec-igv-val" style="color: #0f172a;">S/ 22.88</strong>
							</div>
							<div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 15px;">
								<strong style="color: #0f172a;">Total Pagado:</strong>
								<strong id="rec-total-val" style="color: #16a34a; font-size: 18px; font-weight: 800;">S/ 150.00</strong>
							</div>
						</div>

						<div style="margin-top: auto;">
							<button type="button" (click)="imprimirComprobante()" class="btn-print-voucher">
								<i class="fa fa-print"></i> Imprimir o Guardar en PDF
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- AVISO DE CONFIRMACIÓN ACADÉMICA -->
			<div class="row" style="margin-top: 15px;">
				<div class="col-12 mt-2 mb-2">
					<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 22px; font-size: 14px; color: #166534; display: flex; align-items: center; gap: 14px; box-shadow: 0 4px 15px rgba(22, 101, 52, 0.05);">
						<div style="width: 44px; height: 44px; border-radius: 50%; background: #22c55e; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;">
							<i class="fa fa-check"></i>
						</div>
						<div>
							<strong style="font-size: 15px; display: block; margin-bottom: 2px;">¡Matrícula Confirmada y Registrada!</strong>
							<span>Tu pago ha sido acreditado y tu vacante ha quedado asegurada. Tu comprobante oficial y los accesos a tus clases ya están disponibles directamente en tu cuenta en el apartado <a href="/mis-cursos" style="font-weight: 700; color: #15803d; text-decoration: underline;">Mis Clases</a>.</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Botones de Acción Final -->
			<div class="row" style="margin-top: 25px; margin-bottom: 20px;">
				<div class="col-12 text-center">
					<a href="/mis-cursos" class="btn-primary-classes">
						<i class="fa fa-graduation-cap"></i> Ingresar a Mis Clases
					</a>
					<div class="mt-3">
						<a href="/" class="back-home-link" style="font-size: 13.5px; color: #64748b; text-decoration: none; font-weight: 600;">
							<i class="fa fa-arrow-left me-1"></i> Volver al Catálogo Principal
						</a>
					</div>
				</div>
			</div>
		</div>
	</main>
	<!-- END CONFIRMATION CONTENT -->
  `
})
export class ConfirmacionComponent implements AfterViewInit {
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);

  ngAfterViewInit(): void {
    this.initConfirmacion();
  }

  imprimirComprobante(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  private formatDisplayPhone(rawDigits: string): string {
    let digits = String(rawDigits || '').replace(/\D/g, '');
    if (digits.startsWith('51') && digits.length === 11) {
      digits = digits.substring(2);
    }
    if (digits.length === 9) {
      return `+51 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
    }
    return `+51 ${digits}`;
  }

  async initConfirmacion(): Promise<void> {
    let order = this.pedidoService.getLastOrder();
    if (!order) {
      const history = this.pedidoService.getMisMatriculasSync();
      if (history && history.length > 0) {
        order = history[0];
      } else {
        try {
          const remoteHistory = await this.pedidoService.getMisMatriculas();
          if (remoteHistory && remoteHistory.length > 0) {
            order = remoteHistory[0];
          }
        } catch (_) {}
      }
    }

    const user = this.authService.getCurrentUser();

    if (!order) {
      const defaultName = user ? `${user.nombres || ''} ${user.apellidos || ''}`.trim() : 'Jose Elmer Coronado';
      const defaultDni = (user && user.dni) || '75187638';
      const defaultWa = (user && user.whatsapp) || '935300159';
      const defaultCorreo = (user && user.correo) || 'carlokasike333@gmail.com';

      order = {
        codigoOrden: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        estado: 'PAGADO',
        metodoPago: 'Mercado Pago Checkout',
        curso: {
          id: 'b0000000-0000-0000-0000-000000000001',
          titulo: 'Desarrollo Web Integrado con Spring Boot',
          modalidad: 'VIRTUAL',
          horario: 'Sábados y Domingos 09:00 - 13:00',
          precio: 150.00,
          enlaceClase: 'https://meet.google.com/abc-defg-hij',
          direccionClase: 'Sede Central - Av. Universitaria 1234, Lima',
          aula: 'Laboratorio 302'
        },
        comprobante: {
          tipo: 'BOLETA',
          correlativo: 'B001-' + String(Math.floor(1000 + Math.random() * 9000)).padStart(8, '0'),
          cliente: defaultName,
          docIdentidad: defaultDni,
          subtotal: '127.12',
          igv: '22.88',
          total: '150.00',
          clienteCorreo: defaultCorreo,
          clienteTelefono: defaultWa
        }
      };
    }

    const elCode = document.getElementById('code-order-display');
    if (elCode) elCode.textContent = order.codigoOrden || 'ORD-894210';
    const fechaActual = new Date().toLocaleDateString('es-PE');
    const elDate = document.getElementById('order-date-display');
    if (elDate) elDate.textContent = fechaActual;

    const comp = order.comprobante || {
      tipo: 'BOLETA',
      correlativo: 'B001-00001042',
      cliente: (user && user.nombres) ? `${user.nombres} ${user.apellidos || ''}`.trim() : 'Jose Elmer Coronado',
      docIdentidad: (user && user.dni) || '75187638',
      fechaEmision: fechaActual,
      subtotal: '127.12',
      igv: '22.88',
      total: '150.00'
    };

    const elSunatTipo = document.getElementById('sunat-tipo-title');
    if (elSunatTipo) elSunatTipo.textContent = (comp.tipo === 'FACTURA' || comp.tipoComprobante === 'FACTURA') ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';
    const elSerie = document.getElementById('sunat-serie-display');
    const correlativoStr = comp.correlativo || (comp.serie && comp.numeroCorrelativo ? `${comp.serie}-${String(comp.numeroCorrelativo).padStart(8, '0')}` : 'B001-00001042');
    if (elSerie) elSerie.textContent = correlativoStr;

    let nombreTitular = comp.cliente || comp.razonSocial || '';
    if (user && (!nombreTitular || nombreTitular === 'Carlos Alarcón' || nombreTitular === 'Alumno')) {
      nombreTitular = `${user.nombres || ''} ${user.apellidos || ''}`.trim() || nombreTitular;
    }
    const elCliente = document.getElementById('rec-cliente');
    if (elCliente) elCliente.textContent = nombreTitular || 'Alumno Titular';

    const dniTitular = comp.docIdentidad || comp.rucCliente || (user && user.dni) || '75187638';
    const elDoc = document.getElementById('rec-doc');
    if (elDoc) elDoc.textContent = dniTitular;

    const activeTelAlumno = (user && user.whatsapp) || (comp && comp.clienteTelefono) || (order.notificacionWhatsApp && order.notificacionWhatsApp.telefono) || '935300159';
    const activeCorreoAlumno = (user && user.correo) || (comp && comp.clienteCorreo) || 'carlokasike333@gmail.com';

    const elTel = document.getElementById('rec-telefono');
    if (elTel) elTel.textContent = this.formatDisplayPhone(activeTelAlumno);
    const elMail = document.getElementById('rec-correo');
    if (elMail) elMail.textContent = activeCorreoAlumno;

    const metodo = order.metodoPago || 'Mercado Pago';
    const recMetodo = document.getElementById('rec-metodo');
    if (recMetodo) {
      recMetodo.textContent = metodo;
      recMetodo.style.background = '#009ee3';
    }

    const curso = order.curso || {
      titulo: order.cursoTitulo || 'Desarrollo Web Integrado con Spring Boot',
      modalidad: order.modalidad || 'VIRTUAL',
      horario: order.horario || 'Sábados y Domingos 09:00 - 13:00',
      enlaceClase: order.enlaceClase || 'https://meet.google.com/abc-defg-hij',
      direccionClase: order.direccionClase || 'Sede Central - Av. Universitaria 1234, Lima',
      aula: order.aula || 'Laboratorio 302'
    };

    const elTitle = document.getElementById('rec-curso-title');
    if (elTitle) elTitle.textContent = curso.titulo;

    const elMod = document.getElementById('rec-curso-mod');
    if (elMod) {
      elMod.textContent = curso.modalidad;
      elMod.className = curso.modalidad === 'VIRTUAL' ? 'badge bg-primary' : 'badge bg-success';
    }
    const elHorario = document.getElementById('rec-horario');
    if (elHorario) elHorario.textContent = curso.horario;

    const totalNum = Number(comp.total || comp.montoTotal || order.monto || 150);
    const subNum = Number(comp.subtotal || +(totalNum / 1.18).toFixed(2));
    const igvNum = Number(comp.igv || +(totalNum - subNum).toFixed(2));

    const elTableDesc = document.getElementById('rec-table-desc');
    if (elTableDesc) elTableDesc.textContent = curso.titulo;
    const elTableMod = document.getElementById('rec-table-mod');
    if (elTableMod) elTableMod.textContent = curso.modalidad;
    const elTableTotal = document.getElementById('rec-table-total');
    if (elTableTotal) elTableTotal.textContent = `S/ ${totalNum.toFixed(2)}`;

    const elSubVal = document.getElementById('rec-subtotal-val');
    if (elSubVal) elSubVal.textContent = `S/ ${subNum.toFixed(2)}`;
    const elIgvVal = document.getElementById('rec-igv-val');
    if (elIgvVal) elIgvVal.textContent = `S/ ${igvNum.toFixed(2)}`;
    const elTotVal = document.getElementById('rec-total-val');
    if (elTotVal) elTotVal.textContent = `S/ ${totalNum.toFixed(2)}`;

    const boxAula = document.getElementById('box-acceso-aula');
    const btnLink = document.getElementById('btn-link-clase') as HTMLAnchorElement | null;
    if (curso.modalidad === 'PRESENCIAL') {
      if (boxAula) {
        boxAula.innerHTML = `
          <h5>
            <i class="fa fa-building" style="color: #2eca7f;"></i> Sede Física y Aula Asignada
          </h5>
          <p style="margin-bottom: 6px;">
            <strong>Sede:</strong> ${curso.direccionClase || 'Sede Central - Av. Universitaria 1234, Lima'}
          </p>
          <p style="margin-bottom: 0;">
            <strong>Aula:</strong> ${curso.aula || 'Laboratorio 302'} &bull; Acceso presencial habilitado con tu DNI.
          </p>
        `;
      }
    } else {
      if (btnLink) btnLink.href = curso.enlaceClase || 'https://meet.google.com';
    }

    this.cartService.updateBadge();
    this.authService.updateNavbar();

    setTimeout(() => {
      this.notifications.showToast('¡Matrícula y pago completados con éxito! Ya puedes acceder a tus clases.', 'success');
    }, 400);
  }
}
