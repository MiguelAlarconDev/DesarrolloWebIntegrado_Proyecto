import { Component, OnInit, AfterViewInit, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-beneficios',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
	<!-- START SECTION TOP -->
	<section class="section-top">
		<div class="container">
			<div class="col-lg-10 offset-lg-1 text-center">
				<div class="section-top-title">
					<h1>{{ bannerTitle }}</h1>
					<ul>
						<li>{{ bannerSubtitle }}</li>
					</ul>
				</div>
			</div>
		</div>
	</section>	
	<!-- END SECTION TOP -->

	<!-- NAVEGACIÓN DE TEMAS CON BOTONES -->
	<div class="best-cpurse" style="padding-top: 50px; padding-bottom: 10px;">
		<div class="container">
			<div class="text-center">
				<button type="button" (click)="seleccionarTema('docentes')" [class]="temaActivo === 'docentes' ? 'btn_one me-2 mb-2' : 'btn_two me-2 mb-2'" style="cursor: pointer;">
					<i class="fa fa-graduation-cap me-1"></i> Docentes y Metodología
				</button>
				<button type="button" (click)="seleccionarTema('vacantes')" [class]="temaActivo === 'vacantes' ? 'btn_one me-2 mb-2' : 'btn_two me-2 mb-2'" style="cursor: pointer;">
					<i class="fa fa-check-circle me-1"></i> Cero Sobreventa de Vacantes
				</button>
				<button type="button" (click)="seleccionarTema('pasarela')" [class]="temaActivo === 'pasarela' ? 'btn_one me-2 mb-2' : 'btn_two me-2 mb-2'" style="cursor: pointer;">
					<i class="fa fa-credit-card me-1"></i> Pago Seguro con Mercado Pago
				</button>
				<button type="button" (click)="seleccionarTema('boleta')" [class]="temaActivo === 'boleta' ? 'btn_one me-2 mb-2' : 'btn_two me-2 mb-2'" style="cursor: pointer;">
					<i class="fa fa-whatsapp me-1"></i> WhatsApp & Boleta Inmediatos
				</button>
				<button type="button" (click)="seleccionarTema('todos')" [class]="temaActivo === 'todos' ? 'btn_one mb-2' : 'btn_two mb-2'" style="cursor: pointer;">
					<i class="fa fa-th-large me-1"></i> Ver Todos
				</button>
			</div>
		</div>
	</div>

	<!-- 1. SECCIÓN: DOCENTES Y METODOLOGÍA (CON IMAGEN DE LA PROFESORA) -->
	@if (temaActivo === 'docentes' || temaActivo === 'todos') {
		<section class="ab_one section-padding" id="detalle-docentes">
			<div class="container">									
				<div class="row align-items-center">								
					<div class="col-lg-6 col-sm-12 col-xs-12">
						<div class="ab_img position-relative" style="overflow: hidden; border-radius: 20px; box-shadow: 0 16px 40px rgba(0,0,0,0.12);">
							<img src="assets/images/all-img/profesora-beneficios.jpg" class="img-fluid w-100" alt="Docentes Especialistas en Clase" style="display: block; object-fit: cover; max-height: 460px; transition: transform 0.3s ease;">
							<div style="position: absolute; bottom: 20px; left: 20px; background: rgba(26,45,98,0.92); color: #ffffff; padding: 12px 20px; border-radius: 12px; backdrop-filter: blur(8px); border-left: 4px solid #2eca7f;">
								<span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #2eca7f; font-weight: 800;">Formación Profesional</span>
								<strong style="font-size: 15px;">Clases Prácticas con Docentes Expertos</strong>
							</div>
						</div>
						<div class="course_features mt-4">
							<h3>Calidad Académica Garantizada</h3>
							<ul>
								<li><i class="fa fa-graduation-cap"></i> Docentes <b>Ingenieros & Especialistas</b></li>
								<li><i class="fa fa-laptop"></i> Metodología <b>Teoría + Práctica en Vivo</b></li>
								<li><i class="fa fa-comments"></i> Consultas <b>Atención Directa en Clase</b></li>
								<li><i class="fa fa-certificate"></i> Certificación <b>Con Valor Curricular Oficial</b></li>
							</ul>
						</div>
					</div>					
					<div class="col-lg-6 col-sm-12 col-xs-12">
						<div class="ab_content">
							<h2>Aprende con <u><span>Docentes Expertos</span></u> y Metodología 100% Práctica.</h2>
							<p>Nuestros cursos están dictados por profesionales con amplia experiencia real en la industria y en docencia universitaria. Desde la resolución paso a paso en pizarra hasta la implementación de proyectos completos de software y tecnología.</p>
						</div>
						<div class="abmv">
							<span class="ti-user"></span>
							<h4>Docentes del Sector Tecnológico</h4>
							<p>Profesionales titulados y certificados que te guían en el aprendizaje de herramientas demandadas por las mejores empresas.</p>
						</div>
						<div class="abmv">
							<span class="ti-blackboard"></span>
							<h4>Resolución Paso a Paso y Laboratorios Reales</h4>
							<p>Clases dinámicas con explicación clara de conceptos, demostraciones en vivo y desarrollo de ejercicios prácticos desde cero.</p>
						</div>
						<div class="abmv">
							<span class="ti-medall"></span>
							<h4>Certificado Oficial de Aprobación</h4>
							<p>Al aprobar tus cursos recibes tu certificado emitido con código verificable (CERT-2026-XXXXXX) para enriquecer tu CV y perfil de LinkedIn.</p>
						</div>
						<div class="mt-4">
							<a class="btn_one me-2 mb-2" href="/cursos"><i class="fa fa-book me-1"></i> Ver Catálogo de Cursos</a>
							<a class="btn_two mb-2" href="/contacto">Consultar con un Asesor</a>
						</div>
					</div>								  
				</div>
			</div>
		</section>

		<section class="marketing_content_area section-padding bg-light">
			<div class="container">
				<div class="section-title">
					<h2>Metodología de Aprendizaje</h2>
					<p>¿Cómo impulsamos tu <span><u>crecimiento académico</u></span>?</p>
				</div>
				<div class="row tp_promo_box">
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-video-clapper ss_one"></span>
								<h2><a href="/cursos">1. Sesiones en Vivo</a></h2>
							</div>
							<p>Interacción directa con el profesor a través de Zoom o en laboratorios físicos con equipos equipados.</p>
						</div>
					</div>
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-light-bulb ss_two"></span>
								<h2><a href="/cursos">2. Proyectos Reales</a></h2>
							</div>
							<p>Aplica lo aprendido resolviendo desafíos y casos prácticos que te preparan para el mercado laboral.</p>
						</div>
					</div>
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-award ss_three"></span>
								<h2><a href="/mis-certificados">3. Acreditación</a></h2>
							</div>
							<p>Descarga tus certificados en PDF con registro de horas académicas oficiales y firma de tu docente.</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	}

	<!-- 2. SECCIÓN: CERO SOBREVENTA DE VACANTES -->
	@if (temaActivo === 'vacantes' || temaActivo === 'todos') {
		<section class="ab_one section-padding" id="detalle-vacantes">
			<div class="container">									
				<div class="row align-items-center">								
					<div class="col-lg-6 col-sm-12 col-xs-12">
						<div class="ab_img">
							<img src="assets/images/all-img/about1.png" class="img-fluid" alt="Cero Sobreventa de Vacantes">
						</div>
						<div class="course_features mt-4">
							<h3>Control de Aforo en Tiempo Real</h3>
							<ul>
								<li><i class="fa fa-users"></i> Descuento de Cupos <b>Automático</b></li>
								<li><i class="fa fa-video-camera"></i> Modalidad Virtual <b>Zoom / Meet</b></li>
								<li><i class="fa fa-building"></i> Modalidad Presencial <b>Aula & Sede</b></li>
								<li><i class="fa fa-shield"></i> Riesgo de Sobreventa <b>0% Garantizado</b></li>
							</ul>
						</div>
					</div>					
					<div class="col-lg-6 col-sm-12 col-xs-12">
						<div class="ab_content">
							<h2>Control automático con <u><span>Cero Sobreventa de Vacantes</span></u> en tiempo real.</h2>
							<p>Nuestro sistema descuenta los cupos en el momento exacto en que realizas tu compra, garantizando tu asiento en el aula física o tu acceso exclusivo en Zoom sin sobrecupos ni listas de espera.</p>
						</div>
						<div class="abmv">
							<span class="ti-check-box"></span>
							<h4>Reserva Instantánea al Comprar</h4>
							<p>En el instante en que se confirma tu matrícula, el microservicio de cursos actualiza las vacantes disponibles en la base de datos para bloquear tu lugar inmediatamente.</p>
						</div>
						<div class="abmv">
							<span class="ti-desktop"></span>
							<h4>Asiento en Laboratorio o Cupo en Zoom</h4>
							<p>En clases presenciales tienes asegurada tu carpeta y equipo de cómputo en sede; en clases virtuales cuentas con acceso directo a la sesión interactiva en vivo con el docente.</p>
						</div>
						<div class="abmv">
							<span class="ti-reload"></span>
							<h4>Bloqueo Automático por Aforo Completo</h4>
							<p>Cuando un curso alcanza el límite de su capacidad, el catálogo cambia su estado a "Aforo Completo (Agotado)" impidiendo pagos adicionales.</p>
						</div>
						<div class="mt-4">
							<a class="btn_one me-2 mb-2" href="/cursos"><i class="fa fa-book me-1"></i> Ir al Catálogo de Cursos Disponibles</a>
							<a class="btn_two mb-2" href="/contacto">Contacto y Soporte</a>
						</div>
					</div>								  
				</div>
			</div>
		</section>

		<section class="marketing_content_area section-padding">
			<div class="container">
				<div class="section-title">
					<h2>Proceso Automatizado</h2>
					<p>¿Cómo garantizamos tu <span><u>vacante en tiempo real</u></span>?</p>
				</div>
				<div class="row tp_promo_box">
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-search ss_one"></span>
								<h2><a href="/cursos">1. Consulta en Vivo</a></h2>
							</div>
							<p>Visualiza en cada tarjeta del catálogo la cantidad exacta de vacantes libres antes de agregar el curso a tu carrito.</p>
						</div>
					</div>
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-shopping-cart-full ss_two"></span>
								<h2><a href="/carrito">2. Validación de Cupo</a></h2>
							</div>
							<p>Al iniciar el proceso de pago, el sistema verifica que el curso cuente con disponibilidad activa en el servidor.</p>
						</div>
					</div>
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-lock ss_three"></span>
								<h2><a href="/mis-cursos">3. Asignación Inmediata</a></h2>
							</div>
							<p>Confirmado el pago, tu vacante queda descontada y registrada a tu nombre en el listado oficial del docente.</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	}

	<!-- 3. SECCIÓN: PAGO SEGURO CON MERCADO PAGO -->
	@if (temaActivo === 'pasarela' || temaActivo === 'todos') {
		<section class="ab_one section-padding" id="detalle-pasarela">
			<div class="container">									
				<div class="row align-items-center">								
					<div class="col-lg-6 col-sm-12 col-xs-12">
						<div class="ab_img">
							<img src="assets/images/all-img/home-image.png" class="img-fluid" alt="Pago Seguro con Mercado Pago">
						</div>
						<div class="course_features mt-4">
							<h3>Ficha de Pasarela de Pagos</h3>
							<ul>
								<li><i class="fa fa-lock"></i> Pasarela Oficial <b>Mercado Pago</b></li>
								<li><i class="fa fa-credit-card"></i> Tarjetas Aceptadas <b>Crédito / Débito</b></li>
								<li><i class="fa fa-qrcode"></i> Billeteras Digitales <b>Yape / Plin</b></li>
								<li><i class="fa fa-bolt"></i> Aprobación de Matrícula <b>Al Instante</b></li>
							</ul>
						</div>
					</div>					
					<div class="col-lg-6 col-sm-12 col-xs-12">
						<div class="ab_content">
							<h2>Paga en línea al instante con <u><span>Mercado Pago</span></u> sin esperas manuales.</h2>
							<p>Realiza tu inscripción de forma 100% digital con tarjeta de crédito, débito o Yape/Plin mediante nuestra pasarela cifrada, sin necesidad de enviar vouchers por correo ni esperar verificaciones administrativas.</p>
						</div>
						<div class="abmv">
							<span class="ti-credit-card"></span>
							<h4>Tarjetas de Crédito, Débito y Yape / Plin</h4>
							<p>Aceptamos todas las tarjetas Visa, Mastercard, Diners y American Express, además de pagos rápidos con código de aprobación desde tu aplicativo Yape o Plin.</p>
						</div>
						<div class="abmv">
							<span class="ti-shield"></span>
							<h4>Pasarela Cifrada de Nivel Bancario</h4>
							<p>Todas las operaciones viajan protegidas con encriptación de extremo a extremo a través del servicio integrado con Mercado Pago.</p>
						</div>
						<div class="abmv">
							<span class="ti-bolt"></span>
							<h4>Activación Automática de tu Matrícula</h4>
							<p>En cuanto la pasarela aprueba la transacción, tu orden pasa automáticamente a estado PAGADO y habilita tus cursos sin intervención manual.</p>
						</div>
						<div class="mt-4">
							<a class="btn_one me-2 mb-2" href="/carrito"><i class="fa fa-shopping-cart me-1"></i> Ir a Mi Carrito y Pasarela</a>
							<a class="btn_two mb-2" href="/cursos">Explorar Cursos</a>
						</div>
					</div>								  
				</div>
			</div>
		</section>

		<section class="marketing_content_area section-padding">
			<div class="container">
				<div class="section-title">
					<h2>Pasarela Integrada</h2>
					<p>¿Cómo funciona el <span><u>pago en línea</u></span>?</p>
				</div>
				<div class="row tp_promo_box">
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-bag ss_one"></span>
								<h2><a href="/carrito">1. Revisa tu Carrito</a></h2>
							</div>
							<p>Selecciona tus cursos virtuales o presenciales y verifica el resumen detallado con Subtotal e IGV (18%).</p>
						</div>
					</div>
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-credit-card ss_two"></span>
								<h2><a href="/checkout">2. Elige tu Medio de Pago</a></h2>
							</div>
							<p>Ingresa los datos de tu tarjeta o selecciona pago rápido con billetera digital dentro de la pasarela segura.</p>
						</div>
					</div>
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-check ss_three"></span>
								<h2><a href="/confirmacion">3. Confirmación al Segundo</a></h2>
							</div>
							<p>Recibe en pantalla tu código de operación, tu comprobante electrónico y el acceso inmediato a tus clases.</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	}

	<!-- 4. SECCIÓN: WHATSAPP Y BOLETA INMEDIATOS -->
	@if (temaActivo === 'boleta' || temaActivo === 'todos') {
		<section class="ab_one section-padding" id="detalle-boleta">
			<div class="container">									
				<div class="row align-items-center">								
					<div class="col-lg-6 col-sm-12 col-xs-12">
						<div class="ab_img">
							<img src="assets/images/all-img/about1.png" class="img-fluid" alt="WhatsApp y Boleta Inmediatos">
						</div>
						<div class="course_features mt-4">
							<h3>Comprobante y Notificación</h3>
							<ul>
								<li><i class="fa fa-file-text-o"></i> Comprobante <b>Boleta o Factura</b></li>
								<li><i class="fa fa-whatsapp"></i> Envío de Accesos <b>WhatsApp Oficial</b></li>
								<li><i class="fa fa-video-camera"></i> Cursos Virtuales <b>Link de Zoom / Meet</b></li>
								<li><i class="fa fa-map-marker"></i> Cursos Presenciales <b>Sede y Laboratorio</b></li>
							</ul>
						</div>
					</div>					
					<div class="col-lg-6 col-sm-12 col-xs-12">
						<div class="ab_content">
							<h2>Recibe al instante tu <u><span>Boleta o Factura y tus accesos por WhatsApp</span></u>.</h2>
							<p>Apenas completas tu inscripción, el sistema genera tu comprobante de pago electrónico y envía un mensaje automático a tu WhatsApp con los enlaces de clase en vivo o la dirección exacta de tu aula.</p>
						</div>
						<div class="abmv">
							<span class="ti-receipt"></span>
							<h4>Boleta de Venta o Factura Electrónica al Instante</h4>
							<p>Solicita Boleta con tu DNI o Factura con número de RUC y Razón Social. Puedes visualizar, imprimir o descargar tu comprobante en cualquier momento.</p>
						</div>
						<div class="abmv">
							<span class="ti-mobile"></span>
							<h4>Mensaje Automático a tu WhatsApp</h4>
							<p>Recibe en tu celular la confirmación de tu matrícula junto con el link de ingreso a Zoom/Google Meet o la ubicación del laboratorio asignado.</p>
						</div>
						<div class="abmv">
							<span class="ti-medall"></span>
							<h4>Panel "Mis Clases" Siempre Disponible</h4>
							<p>En tu portal de estudiante encontrarás todos tus cursos pagados, horarios, docentes, enlaces de transmisión y comprobantes emitidos.</p>
						</div>
						<div class="mt-4">
							<a class="btn_one me-2 mb-2" href="/mis-cursos"><i class="fa fa-graduation-cap me-1"></i> Ir a Mis Matrículas</a>
							<a class="btn_two mb-2" href="/cursos">Ver Catálogo de Cursos</a>
						</div>
					</div>								  
				</div>
			</div>
		</section>

		<section class="marketing_content_area section-padding">
			<div class="container">
				<div class="section-title">
					<h2>Entrega Inmediata</h2>
					<p>¿Qué recibes al <span><u>confirmar tu matrícula</u></span>?</p>
				</div>
				<div class="row tp_promo_box">
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-files ss_one"></span>
								<h2><a href="/mis-comprobantes">1. Boleta / Factura</a></h2>
							</div>
							<p>Comprobante electrónico numerado (<strong>B001</strong> o <strong>F001</strong>) con el detalle de tus cursos matriculados e impuestos de ley.</p>
						</div>
					</div>
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-comment-alt ss_two"></span>
								<h2><a href="/mis-cursos">2. Alerta por WhatsApp</a></h2>
							</div>
							<p>Notificación directa a tu número registrado con las credenciales de acceso virtual o el pabellón y aula presencial.</p>
						</div>
					</div>
					<div class="col-lg-4 col-sm-6 col-xs-12">
						<div class="single_feature_one">
							<div class="sf_top">
								<span class="ti-bookmark-alt ss_three"></span>
								<h2><a href="/mis-cursos">3. Acceso al Portal</a></h2>
							</div>
							<p>Ingreso inmediato a la sección "Mis Clases" para unirte a tus sesiones en vivo y descargar tus constancias.</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	}

	<!-- 5. BLOQUES INFERIORES DE RESUMEN -->
	<section class="tp_feature" style="padding-top: 30px;">
	   <div class="container">			
			<div class="row tp_promo_box">					
				<div class="col-lg-3 col-sm-6 col-xs-12 no-padding">
					<div class="single_tp">
						<h3>Docentes Especialistas</h3>
						<p>Clases en vivo dictadas por ingenieros y especialistas con enfoque 100% práctico y certificación oficial.</p>
						<a href="javascript:void(0)" (click)="seleccionarTema('docentes')" class="cta"><span>Ver Metodología</span>
						  <svg width="13px" height="10px" viewBox="0 0 13 10"><path d="M1,5 L11,5"></path><polyline points="8 1 12 5 8 9"></polyline></svg>
						</a>
					</div>
				</div>
				<div class="col-lg-3 col-sm-6 col-xs-12 no-padding">
					<div class="single_tp">
						<h3>Cero Sobreventa</h3>
						<p>Control automático que descuenta los cupos en tiempo real, garantizando tu asiento o acceso en Zoom.</p>
						<a href="javascript:void(0)" (click)="seleccionarTema('vacantes')" class="cta"><span>Ver Cupos</span>
						  <svg width="13px" height="10px" viewBox="0 0 13 10"><path d="M1,5 L11,5"></path><polyline points="8 1 12 5 8 9"></polyline></svg>
						</a>
					</div>
				</div>			
				<div class="col-lg-3 col-sm-6 col-xs-12 no-padding">
					<div class="single_tp">
						<h3>Mercado Pago Seguro</h3>
						<p>Paga al instante con tarjeta de crédito, débito o Yape/Plin mediante pasarela bancaria cifrada.</p>
						<a href="javascript:void(0)" (click)="seleccionarTema('pasarela')" class="cta"><span>Conocer Pasarela</span>
						  <svg width="13px" height="10px" viewBox="0 0 13 10"><path d="M1,5 L11,5"></path><polyline points="8 1 12 5 8 9"></polyline></svg>
						</a>
					</div>
				</div>			
				<div class="col-lg-3 col-sm-6 col-xs-12 no-padding">
					<div class="single_tp">
						<h3>WhatsApp & Boleta</h3>
						<p>Recibe tu Boleta o Factura electrónica al instante y un mensaje a tu WhatsApp con los enlaces de clase.</p>
						<a href="javascript:void(0)" (click)="seleccionarTema('boleta')" class="cta"><span>Ver Envío</span>
						  <svg width="13px" height="10px" viewBox="0 0 13 10"><path d="M1,5 L11,5"></path><polyline points="8 1 12 5 8 9"></polyline></svg>
						</a>
					</div>
				</div>							
			</div>
		</div>
	</section>
  `
})
export class BeneficiosComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private qSub?: Subscription;

  temaActivo: 'docentes' | 'vacantes' | 'pasarela' | 'boleta' | 'todos' = 'todos';
  bannerTitle = 'Beneficios de Nuestra Plataforma';
  bannerSubtitle = 'Educación Práctica y Matrícula Automatizada';

  ngOnInit(): void {
    this.qSub = this.route.queryParams.subscribe(params => {
      const tema = (params['tema'] || '').toLowerCase();
      if (tema === 'docentes' || tema === 'vacantes' || tema === 'pasarela' || tema === 'boleta' || tema === 'todos') {
        this.aplicarTema(tema as any);
      } else {
        this.aplicarTema('todos');
      }
    });
  }

  ngAfterViewInit(): void {
    this.authService.updateNavbar();
    this.cartService.updateBadge();
  }

  seleccionarTema(tema: 'docentes' | 'vacantes' | 'pasarela' | 'boleta' | 'todos'): void {
    this.aplicarTema(tema);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private aplicarTema(tema: 'docentes' | 'vacantes' | 'pasarela' | 'boleta' | 'todos'): void {
    this.temaActivo = tema;
    if (tema === 'docentes') {
      this.bannerTitle = 'Docentes Expertos & Metodología Práctica';
      this.bannerSubtitle = 'Educación Superior de Calidad';
    } else if (tema === 'vacantes') {
      this.bannerTitle = 'Cero Sobreventa de Vacantes';
      this.bannerSubtitle = 'Control de Aforo en Tiempo Real';
    } else if (tema === 'pasarela') {
      this.bannerTitle = 'Pago Seguro con Mercado Pago';
      this.bannerSubtitle = 'Pasarela de Pago en Línea';
    } else if (tema === 'boleta') {
      this.bannerTitle = 'WhatsApp & Boleta Inmediatos';
      this.bannerSubtitle = 'Comprobantes y Accesos al Instante';
    } else {
      this.bannerTitle = 'Beneficios de Nuestra Plataforma';
      this.bannerSubtitle = 'Educación Práctica y Matrícula Automatizada';
    }
  }

  ngOnDestroy(): void {
    this.qSub?.unsubscribe();
  }
}
