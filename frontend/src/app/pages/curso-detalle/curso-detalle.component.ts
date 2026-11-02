import { Component, OnInit, OnDestroy, ViewEncapsulation, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { CursoModel } from '../../services/config.data';
import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { CartService } from '../../services/cart.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="cd-page-wrapper">
      <div class="container cd-container">
        
        <!-- Breadcrumb de Navegación -->
        <nav class="cd-breadcrumb-nav mb-3" aria-label="breadcrumb">
          <ol class="breadcrumb m-0 small fw-bold">
            <li class="breadcrumb-item"><a routerLink="/" class="text-success text-decoration-none"><i class="fa fa-home me-1"></i>Inicio</a></li>
            <li class="breadcrumb-item"><a routerLink="/cursos" class="text-success text-decoration-none">Cursos</a></li>
            <li class="breadcrumb-item active text-muted" aria-current="page">{{ curso?.titulo || 'Detalle del Curso' }}</li>
          </ol>
        </nav>

        <div class="row g-4">
          
          <!-- COLUMNA PRINCIPAL (IZQUIERDA) -->
          <div class="col-lg-8 col-md-12">
            
            <!-- Hero Banner / Imagen Principal -->
            <div class="cd-hero-card">
              <img [src]="curso?.imagen || 'assets/images/all-img/c1.png'" 
                   [alt]="curso?.titulo || 'Detalle del Curso'"
                   class="cd-hero-img"
                   (error)="onImgError($event)" />
              <div class="cd-hero-badge-corner" title="Vista previa oficial">
                <i class="fa fa-play"></i>
              </div>
            </div>

            <!-- Título y Metadatos -->
            <div class="cd-course-header mt-3">
              <h1 class="cd-course-title">{{ curso?.titulo || 'Professional Ceramic Moulding for Beginners' }}</h1>
              
              <div class="cd-meta-row">
                <span class="cd-meta-item">
                  <i class="fa fa-calendar-o cd-green-icon"></i> 
                  {{ formattedDate }}
                </span>
                <span class="cd-meta-item">
                  <i class="fa fa-clock-o cd-green-icon"></i> 
                  {{ durationBadge }}
                </span>
                <span class="cd-meta-item">
                  <i class="fa fa-users cd-green-icon"></i> 
                  {{ seatsAvailableBadge }}
                </span>
              </div>

              <!-- Párrafos Introductorios -->
              <p class="cd-text-desc">
                {{ curso?.descripcion || 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.' }}
              </p>
              <p class="cd-text-desc">
                Este programa integral está diseñado con metodologías ágiles y casos prácticos reales para potenciar tus habilidades profesionales. Cada módulo incluye laboratorios guiados paso a paso, código fuente descargable y soporte directo del docente especialista para asegurar tu dominio integral.
              </p>
            </div>

            <!-- Barra de Pestañas (Tabs) -->
            <div class="cd-tabs-nav">
              <button type="button" 
                      class="cd-tab-btn" 
                      [class.active]="activeTab === 'overview'" 
                      (click)="selectTab('overview')">
                OVERVIEW
              </button>
              <button type="button" 
                      class="cd-tab-btn" 
                      [class.active]="activeTab === 'curriculum'" 
                      (click)="selectTab('curriculum')">
                CURRICULUM
              </button>
              <button type="button" 
                      class="cd-tab-btn" 
                      [class.active]="activeTab === 'instructor'" 
                      (click)="selectTab('instructor')">
                INSTRUCTOR
              </button>
              <button type="button" 
                      class="cd-tab-btn" 
                      [class.active]="activeTab === 'reviews'" 
                      (click)="selectTab('reviews')">
                REVIEWS
              </button>
            </div>

            <!-- Contenido de las Pestañas -->
            <div class="cd-tab-content-area">

              <!-- TAB 1: OVERVIEW -->
              <div *ngIf="activeTab === 'overview'" class="cd-tab-pane animate-fade">
                <p class="cd-text-desc">
                  Aprende las mejores prácticas de la industria con un enfoque 100% práctico y orientado a proyectos. Descubre cómo optimizar tus flujos de trabajo, resolver problemas complejos y aplicar soluciones empresariales modernas con acompañamiento docente continuo.
                </p>

                <!-- Tarjeta Multimedia / Video Showcase interactivo -->
                <div class="cd-video-showcase-box" (click)="openVideoModal()">
                  <div class="cd-video-overlay-bg"></div>
                  
                  <div class="cd-video-center-content">
                    <div class="cd-video-pill-title">
                      {{ videoTitleTag }}
                    </div>
                    <div class="cd-video-pill-sub">
                      {{ videoSubtitleTag }}
                    </div>
                    
                    <!-- Botón Play Rojo estilo YouTube -->
                    <div class="cd-yt-play-btn" title="Ver clase muestra">
                      <div class="cd-yt-triangle"></div>
                    </div>

                    <!-- Badge de Tecnología / Excel / Código -->
                    <div class="cd-video-tech-badge">
                      <span class="cd-tech-icon-x">{{ techBadgeLetter }}</span>
                    </div>
                  </div>

                  <!-- Barra inferior de la preview de video -->
                  <div class="cd-video-bottom-bar">
                    <div class="cd-video-action-icons">
                      <i class="fa fa-share-alt" title="Compartir"></i>
                      <i class="fa fa-clock-o ms-3" title="Ver más tarde"></i>
                    </div>
                    <div class="cd-yt-brand-btn">
                      <span>Mirar en <strong>YouTube</strong></span>
                    </div>
                  </div>
                </div>

                <p class="cd-text-desc mt-3">
                  Al completar este curso obtendrás un certificado oficial acreditado con código de verificación QR, listo para incluir en tu portafolio y LinkedIn. Además, tendrás acceso vitalicio a las grabaciones en alta definición y a la comunidad privada de estudiantes.
                </p>

                <!-- Barra de Acciones / Botones Inferiores -->
                <div class="cd-bottom-action-bar mt-4">
                  <div class="cd-action-buttons-group">
                    <button type="button" class="cd-btn-enroll-pill" (click)="enrollNow()">
                      ENROLL NOW <i class="fa fa-angle-right ms-1"></i>
                    </button>
                    <button type="button" class="cd-btn-membership-pill" (click)="addToCart()">
                      {{ inCart ? 'EN TU CARRITO' : 'GET MEMBERSHIP' }}
                    </button>
                  </div>

                  <div class="cd-social-share-group">
                    <a href="javascript:void(0)" class="cd-social-circle cd-social-fb" title="Facebook">
                      <i class="fa fa-facebook"></i>
                    </a>
                    <a href="javascript:void(0)" class="cd-social-circle cd-social-tw" title="Twitter">
                      <i class="fa fa-twitter"></i>
                    </a>
                    <a href="javascript:void(0)" class="cd-social-circle cd-social-ig" title="Instagram">
                      <i class="fa fa-instagram"></i>
                    </a>
                  </div>
                </div>
              </div>

              <!-- TAB 2: CURRICULUM -->
              <div *ngIf="activeTab === 'curriculum'" class="cd-tab-pane animate-fade">
                <h4 class="fw-bold mb-3 text-dark">Plan de Estudios Oficial & Temario Modular</h4>
                <p class="text-muted mb-4">El contenido está estructurado progresivamente para garantizar un aprendizaje sólido desde los fundamentos hasta el despliegue profesional.</p>
                
                <div class="cd-curriculum-list">
                  <div *ngFor="let mod of temarioModulos; let i = index" class="cd-curriculum-item">
                    <div class="cd-curriculum-header" (click)="toggleModulo(i)">
                      <div class="d-flex align-items-center gap-2">
                        <i class="fa" [class.fa-chevron-down]="openModuleIndex === i" [class.fa-chevron-right]="openModuleIndex !== i"></i>
                        <strong>{{ mod.titulo }}</strong>
                      </div>
                      <span class="badge bg-light text-success border border-success">{{ mod.duracion }}</span>
                    </div>
                    <div *ngIf="openModuleIndex === i" class="cd-curriculum-body">
                      <p class="text-muted small mb-2">{{ mod.descripcion }}</p>
                      <ul class="list-unstyled mb-0">
                        <li *ngFor="let tema of mod.temas" class="py-1 d-flex align-items-center justify-content-between border-bottom border-light">
                          <span><i class="fa fa-play-circle text-success me-2"></i> {{ tema.nombre }}</span>
                          <span class="text-muted small">{{ tema.tiempo }}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 3: INSTRUCTOR -->
              <div *ngIf="activeTab === 'instructor'" class="cd-tab-pane animate-fade">
                <div class="cd-instructor-card">
                  <div class="cd-instructor-avatar">
                    <img src="assets/images/all-img/clients/client02.png" 
                         [alt]="curso?.docente || 'Docente Certificado'"
                         (error)="onAvatarError($event)" />
                  </div>
                  <div class="cd-instructor-info">
                    <h4 class="mb-1 fw-bold text-dark">{{ curso?.docente || 'Docente Certificado' }}</h4>
                    <p class="text-success fw-bold small mb-2">Ingeniero de Software Senior & Instructor Certificado</p>
                    <p class="text-muted small mb-3">
                      Más de 8 años liderando arquitecturas de software empresarial, desarrollo full-stack con Java Spring Boot, microservicios distribuidos y frontend moderno con Angular. Apasionado por la docencia práctica y el aprendizaje activo.
                    </p>
                    <div class="d-flex gap-2">
                      <span class="badge bg-light text-dark border"><i class="fa fa-star text-warning me-1"></i> 4.9 Valoración</span>
                      <span class="badge bg-light text-dark border"><i class="fa fa-user me-1"></i> 1,420 Alumnos</span>
                      <span class="badge bg-light text-dark border"><i class="fa fa-book me-1"></i> 6 Cursos</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 4: REVIEWS -->
              <div *ngIf="activeTab === 'reviews'" class="cd-tab-pane animate-fade">
                <div class="cd-reviews-summary">
                  <div class="cd-rating-big">
                    <h1>5.0</h1>
                    <div class="cd-stars">
                      <i class="fa fa-star"></i>
                      <i class="fa fa-star"></i>
                      <i class="fa fa-star"></i>
                      <i class="fa fa-star"></i>
                      <i class="fa fa-star"></i>
                    </div>
                    <span class="text-muted small">Basado en 48 reseñas verificadas</span>
                  </div>
                  
                  <div class="cd-rating-bars">
                    <div class="cd-bar-row">
                      <span>5 estrellas</span>
                      <div class="cd-bar-track"><div class="cd-bar-fill" style="width: 95%;"></div></div>
                      <span>95%</span>
                    </div>
                    <div class="cd-bar-row">
                      <span>4 estrellas</span>
                      <div class="cd-bar-track"><div class="cd-bar-fill" style="width: 5%;"></div></div>
                      <span>5%</span>
                    </div>
                    <div class="cd-bar-row">
                      <span>3 estrellas</span>
                      <div class="cd-bar-track"><div class="cd-bar-fill" style="width: 0%;"></div></div>
                      <span>0%</span>
                    </div>
                  </div>
                </div>

                <div class="cd-testimonials-list mt-4">
                  <div class="cd-testimonial-item">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <strong>Carlos Mendoza</strong>
                      <span class="text-warning small"><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i></span>
                    </div>
                    <p class="text-muted small mb-0">"Excelente curso, las clases en vivo son muy dinámicas y el docente resuelve todas las dudas en el acto. La integración con Mercado Pago y WhatsApp funcionó al 100%."</p>
                  </div>
                  <div class="cd-testimonial-item">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <strong>Valeria Gómez</strong>
                      <span class="text-warning small"><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i><i class="fa fa-star"></i></span>
                    </div>
                    <p class="text-muted small mb-0">"El temario es completo y muy actualizado. El código del repositorio está limpio y bien documentado. Lo recomiendo totalmente."</p>
                  </div>
                </div>
              </div>

            </div>

          </div>

          <!-- COLUMNA LATERAL (DERECHA / SIDEBAR) -->
          <div class="col-lg-4 col-md-12">
            
            <!-- TARJETA 1: COURSE FEATURES -->
            <div class="cd-features-card">
              <div class="cd-features-header">
                Course features
              </div>
              <div class="cd-features-body">
                <div class="cd-feature-row">
                  <span class="cd-feature-label">
                    <i class="fa fa-calendar-check-o cd-green-icon me-2"></i> Course duration
                  </span>
                  <span class="cd-feature-badge">10 days</span>
                </div>
                <div class="cd-feature-row">
                  <span class="cd-feature-label">
                    <i class="fa fa-user-circle-o cd-green-icon me-2"></i> Total Lectures
                  </span>
                  <span class="cd-feature-badge">30</span>
                </div>
                <div class="cd-feature-row">
                  <span class="cd-feature-label">
                    <i class="fa fa-users cd-green-icon me-2"></i> Total Students
                  </span>
                  <span class="cd-feature-badge">1000</span>
                </div>
                <div class="cd-feature-row">
                  <span class="cd-feature-label">
                    <i class="fa fa-graduation-cap cd-green-icon me-2"></i> Certification
                  </span>
                  <span class="cd-feature-badge">YES</span>
                </div>

                <!-- Price Banner Verde -->
                <div class="cd-price-banner">
                  Price - S/ {{ curso ? (curso.precio | number:'1.2-2') : '150.00' }}
                </div>

                <!-- Botón Register Today -->
                <button type="button" class="cd-btn-register-today" (click)="enrollNow()">
                  Register Today
                </button>
              </div>
            </div>

            <!-- TARJETA 2: RELATED COURSE -->
            <div class="cd-sidebar-box">
              <h3 class="cd-sidebar-title">Related Course</h3>
              <div class="cd-related-list">
                <div *ngFor="let rel of relatedCourses" 
                     class="cd-related-item" 
                     (click)="goToCourse(rel.id)">
                  <img [src]="rel.imagen || 'assets/images/all-img/c2.png'" 
                       [alt]="rel.titulo"
                       class="cd-related-thumb"
                       (error)="onImgError($event)" />
                  <div class="cd-related-info">
                    <div class="cd-stars-gold">
                      <i class="fa fa-star"></i>
                      <i class="fa fa-star"></i>
                      <i class="fa fa-star"></i>
                      <i class="fa fa-star"></i>
                      <i class="fa fa-star"></i>
                    </div>
                    <a href="javascript:void(0)" class="cd-related-title" [title]="rel.titulo">
                      {{ rel.titulo | slice:0:26 }}{{ rel.titulo.length > 26 ? '...' : '' }}
                    </a>
                    <span class="cd-related-price">
                      S/ {{ rel.precio | number:'1.2-2' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- TARJETA 3: CATEGORIES -->
            <div class="cd-sidebar-box">
              <h3 class="cd-sidebar-title">CATEGORIES</h3>
              <div class="cd-categories-grid">
                <a href="/cursos" class="cd-category-tag">Education <sup>11</sup></a>
                <a href="/cursos" class="cd-category-tag">AI Content <sup>44</sup></a>
                <a href="/cursos" class="cd-category-tag">New Course <sup>33</sup></a>
                <a href="/cursos" class="cd-category-tag">Marketing <sup>14</sup></a>
                <a href="/cursos" class="cd-category-tag">Software <sup>23</sup></a>
                <a href="/cursos" class="cd-category-tag">Design <sup>61</sup></a>
              </div>
            </div>

            <!-- TARJETA 4: FOLLOW US -->
            <div class="cd-sidebar-box">
              <h3 class="cd-sidebar-title">FOLLOW US</h3>
              <div class="cd-social-grid">
                <a href="https://facebook.com" target="_blank" rel="noopener" class="cd-social-tile cd-fb">
                  <i class="fa fa-facebook"></i>
                  <span>250K Likes</span>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener" class="cd-social-tile cd-tw">
                  <i class="fa fa-twitter"></i>
                  <span>120K Followers</span>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener" class="cd-social-tile cd-yt">
                  <i class="fa fa-youtube-play"></i>
                  <span>95K Subscribers</span>
                </a>
                <a href="https://pinterest.com" target="_blank" rel="noopener" class="cd-social-tile cd-pin">
                  <i class="fa fa-pinterest"></i>
                  <span>350K Followers</span>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener" class="cd-social-tile cd-in">
                  <i class="fa fa-linkedin"></i>
                  <span>80K Followers</span>
                </a>
                <a href="javascript:void(0)" class="cd-social-tile cd-rss">
                  <i class="fa fa-rss"></i>
                  <span>412 Followers</span>
                </a>
              </div>
            </div>

          </div>

        </div>
      </div>

      <!-- MODAL DE VÍDEO DEMO / TRAILER -->
      <div *ngIf="showVideoModal" class="cd-modal-backdrop" (click)="closeVideoModal()">
        <div class="cd-modal-dialog" (click)="$event.stopPropagation()">
          <div class="cd-modal-header">
            <h5 class="m-0 fw-bold text-white">{{ curso?.titulo || 'Clase Muestra' }}</h5>
            <button type="button" class="btn-close btn-close-white" (click)="closeVideoModal()"></button>
          </div>
          <div class="cd-modal-body p-0">
            <div class="ratio ratio-16x9">
              <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
                      title="Video demostrativo del curso" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowfullscreen>
              </iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ==========================================================================
       ESTILOS EXCLUSIVOS DEL DETALLE DE CURSO (MODELO EXACTO DE LA IMAGEN)
       ========================================================================== */
    .cd-page-wrapper {
      background-color: #ffffff;
      min-height: 100vh;
      padding-top: 110px !important;
      padding-bottom: 120px !important;
      font-family: 'Mulish', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .cd-breadcrumb-nav .breadcrumb-item + .breadcrumb-item::before {
      color: #94a3b8;
    }

    .cd-breadcrumb-nav a {
      color: #2eca7f !important;
      text-decoration: none;
    }

    .cd-breadcrumb-nav a:hover {
      text-decoration: underline;
    }

    /* Contenedor principal ajustado un 10% menos ancho (1080px) */
    .cd-container,
    .cd-page-wrapper .container {
      max-width: 1080px !important;
      margin-left: auto !important;
      margin-right: auto !important;
      padding-left: 20px !important;
      padding-right: 20px !important;
    }

    /* Hero Banner Izquierdo */
    .cd-hero-card {
      position: relative;
      width: 100%;
      height: 360px;
      border-radius: 14px;
      overflow: hidden;
      background: #0f172a;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .cd-hero-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.4s ease;
    }

    .cd-hero-card:hover .cd-hero-img {
      transform: scale(1.02);
    }

    .cd-hero-badge-corner {
      position: absolute;
      top: 18px;
      left: 18px;
      width: 36px;
      height: 36px;
      background: rgba(15, 23, 42, 0.85);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      cursor: pointer;
    }

    /* Encabezado del Curso */
    .cd-course-title {
      font-size: 30px;
      font-weight: 800;
      color: #1a2d62;
      line-height: 1.28;
      margin-bottom: 14px;
      letter-spacing: -0.4px;
    }

    .cd-meta-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 22px;
      margin-bottom: 18px;
    }

    .cd-meta-item {
      display: inline-flex;
      align-items: center;
      font-size: 14px;
      font-weight: 700;
      color: #64748b;
    }

    .cd-green-icon {
      color: #2eca7f !important;
      font-size: 15px;
      margin-right: 6px;
    }

    .cd-text-desc {
      font-size: 14.5px;
      color: #475569;
      line-height: 1.75;
      margin-bottom: 14px;
    }

    /* Pestañas (Tabs) */
    .cd-tabs-nav {
      display: flex;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      margin: 28px 0 24px 0;
      background: #ffffff;
    }

    .cd-tab-btn {
      flex: 1;
      padding: 13px 10px;
      font-size: 13.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: none;
      background: transparent;
      color: #1a2d62;
      cursor: pointer;
      transition: all 0.2s ease;
      border-right: 1px solid #e2e8f0;
      text-align: center;
    }

    .cd-tab-btn:last-child {
      border-right: none;
    }

    .cd-tab-btn:hover {
      background: #f8fafc;
      color: #2eca7f;
    }

    .cd-tab-btn.active {
      background: #2eca7f !important;
      color: #ffffff !important;
    }

    /* Contenedor Video Showcase */
    .cd-video-showcase-box {
      position: relative;
      width: 100%;
      height: 300px;
      border-radius: 12px;
      overflow: hidden;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      margin: 22px 0;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 24px 20px 14px 20px;
    }

    .cd-video-overlay-bg {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at center, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%);
      pointer-events: none;
    }

    .cd-video-center-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: auto 0;
    }

    .cd-video-pill-title {
      background: #2eca7f;
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      padding: 8px 32px;
      border-radius: 8px;
      letter-spacing: -0.3px;
      box-shadow: 0 4px 15px rgba(46, 202, 127, 0.35);
      margin-bottom: 12px;
      text-align: center;
    }

    .cd-video-pill-sub {
      background: #25b36f;
      color: #ffffff;
      font-size: 18px;
      font-weight: 700;
      padding: 6px 26px;
      border-radius: 8px;
      margin-bottom: 18px;
      text-align: center;
    }

    .cd-yt-play-btn {
      width: 64px;
      height: 44px;
      background: #ff0000;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 20px rgba(255, 0, 0, 0.5);
      transition: transform 0.2s ease;
      margin-bottom: 16px;
    }

    .cd-video-showcase-box:hover .cd-yt-play-btn {
      transform: scale(1.12);
    }

    .cd-yt-triangle {
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 9px 0 9px 16px;
      border-color: transparent transparent transparent #ffffff;
      margin-left: 3px;
    }

    .cd-video-tech-badge {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .cd-tech-icon-x {
      font-weight: 900;
      font-size: 20px;
      color: #107c41;
      font-family: Arial, sans-serif;
    }

    .cd-video-bottom-bar {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      color: #94a3b8;
      font-size: 14px;
    }

    .cd-video-action-icons i {
      cursor: pointer;
      transition: color 0.2s;
    }

    .cd-video-action-icons i:hover {
      color: #ffffff;
    }

    .cd-yt-brand-btn {
      background: rgba(0, 0, 0, 0.6);
      padding: 4px 12px;
      border-radius: 4px;
      color: #ffffff;
      font-size: 12px;
    }

    /* Barra Inferior de Acción (Enroll Now + Get Membership + Redes) */
    .cd-bottom-action-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
    }

    .cd-action-buttons-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .cd-btn-enroll-pill {
      background: #2eca7f;
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      padding: 12px 30px;
      border-radius: 50px;
      border: none;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 14px rgba(46, 202, 127, 0.3);
      display: inline-flex;
      align-items: center;
    }

    .cd-btn-enroll-pill:hover {
      background: #25b36f;
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(46, 202, 127, 0.4);
    }

    .cd-btn-membership-pill {
      background: #ffffff;
      color: #475569;
      font-size: 13.5px;
      font-weight: 700;
      padding: 11px 26px;
      border-radius: 50px;
      border: 1.5px solid #cbd5e1;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .cd-btn-membership-pill:hover {
      border-color: #2eca7f;
      color: #2eca7f;
    }

    .cd-social-share-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .cd-social-circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .cd-social-fb {
      background: #2eca7f;
      color: #ffffff;
    }

    .cd-social-tw {
      background: #f1f5f9;
      color: #475569;
    }

    .cd-social-ig {
      background: #f1f5f9;
      color: #475569;
    }

    .cd-social-circle:hover {
      transform: scale(1.1);
      opacity: 0.9;
    }

    /* SIDEBAR (Columna Derecha) */
    .cd-features-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 28px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
    }

    .cd-features-header {
      background: #2eca7f;
      color: #ffffff;
      font-size: 18px;
      font-weight: 800;
      padding: 14px 20px;
      text-align: center;
      letter-spacing: -0.2px;
    }

    .cd-features-body {
      padding: 20px;
    }

    .cd-feature-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .cd-feature-row:last-of-type {
      border-bottom: none;
    }

    .cd-feature-label {
      font-size: 14.5px;
      font-weight: 700;
      color: #334155;
      display: inline-flex;
      align-items: center;
    }

    .cd-feature-badge {
      background: #2eca7f;
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      padding: 3px 12px;
      border-radius: 20px;
    }

    .cd-price-banner {
      background: #2eca7f;
      color: #ffffff;
      font-size: 19px;
      font-weight: 800;
      text-align: center;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 20px 0 12px 0;
      box-shadow: 0 3px 10px rgba(46, 202, 127, 0.25);
    }

    .cd-btn-register-today {
      background: #2eca7f;
      color: #ffffff;
      font-size: 15px;
      font-weight: 800;
      text-align: center;
      padding: 13px 20px;
      border-radius: 8px;
      border: none;
      width: 100%;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 14px rgba(46, 202, 127, 0.28);
    }

    .cd-btn-register-today:hover {
      background: #25b36f;
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(46, 202, 127, 0.38);
    }

    /* Caja Genérica de Sidebar */
    .cd-sidebar-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 22px;
      margin-bottom: 28px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
    }

    .cd-sidebar-title {
      font-size: 17px;
      font-weight: 800;
      color: #1a2d62;
      margin: 0 0 18px 0;
      letter-spacing: -0.2px;
    }

    /* Lista de Cursos Relacionados */
    .cd-related-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .cd-related-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .cd-related-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .cd-related-item:hover {
      transform: translateX(4px);
    }

    .cd-related-thumb {
      width: 64px;
      height: 64px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
      background: #f1f5f9;
    }

    .cd-related-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .cd-stars-gold {
      color: #f59e0b;
      font-size: 11px;
      margin-bottom: 2px;
    }

    .cd-related-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      text-decoration: none;
      line-height: 1.35;
      margin-bottom: 2px;
      transition: color 0.2s;
    }

    .cd-related-item:hover .cd-related-title {
      color: #2eca7f;
    }

    .cd-related-price {
      font-size: 15px;
      font-weight: 800;
      color: #2eca7f;
    }

    /* Categorías */
    .cd-categories-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 18px;
    }

    .cd-category-tag {
      font-size: 14px;
      font-weight: 700;
      color: #1a2d62;
      text-decoration: none;
      position: relative;
      transition: color 0.2s;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 2px;
    }

    .cd-category-tag sup {
      color: #2eca7f;
      font-size: 10px;
      font-weight: 800;
      margin-left: 2px;
    }

    .cd-category-tag:hover {
      color: #2eca7f;
      border-bottom-color: #2eca7f;
    }

    /* Redes Sociales FOLLOW US */
    .cd-social-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .cd-social-tile {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 6px;
      color: #ffffff !important;
      font-size: 11px;
      font-weight: 700;
      text-decoration: none !important;
      transition: opacity 0.2s, transform 0.2s;
    }

    .cd-social-tile:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .cd-social-tile i {
      font-size: 14px;
    }

    .cd-fb  { background-color: #1877f2; }
    .cd-tw  { background-color: #00acee; }
    .cd-yt  { background-color: #ff0000; }
    .cd-pin { background-color: #e60023; }
    .cd-in  { background-color: #0077b5; }
    .cd-rss { background-color: #f59e0b; }

    /* Estilos del Curriculum */
    .cd-curriculum-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .cd-curriculum-item {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
    }

    .cd-curriculum-header {
      padding: 14px 18px;
      background: #f8fafc;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
    }

    .cd-curriculum-body {
      padding: 16px 18px;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
    }

    /* Instructor Card */
    .cd-instructor-card {
      display: flex;
      gap: 20px;
      align-items: center;
      background: #f8fafc;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .cd-instructor-avatar img {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }

    /* Reseñas */
    .cd-reviews-summary {
      display: flex;
      gap: 30px;
      align-items: center;
      background: #f8fafc;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      margin-bottom: 20px;
    }

    .cd-rating-big {
      text-align: center;
      min-width: 140px;
    }

    .cd-rating-big h1 {
      font-size: 48px;
      font-weight: 900;
      color: #1a2d62;
      margin: 0;
      line-height: 1;
    }

    .cd-stars {
      color: #f59e0b;
      font-size: 16px;
      margin: 6px 0;
    }

    .cd-rating-bars {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .cd-bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      color: #64748b;
    }

    .cd-bar-track {
      flex: 1;
      height: 8px;
      background: #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }

    .cd-bar-fill {
      height: 100%;
      background: #2eca7f;
      border-radius: 10px;
    }

    .cd-testimonial-item {
      padding: 16px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    /* Modal de Video */
    .cd-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: cdFadeIn 0.25s ease;
    }

    .cd-modal-dialog {
      width: 100%;
      max-width: 800px;
      background: #0f172a;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    }

    .cd-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid #1e293b;
    }

    @keyframes cdFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .animate-fade {
      animation: cdFadeIn 0.3s ease;
    }

    /* Responsividad */
    @media (max-width: 991.98px) {
      .cd-hero-card {
        height: 280px;
      }
      .cd-course-title {
        font-size: 24px;
      }
      .cd-video-showcase-box {
        height: 280px;
      }
      .cd-video-pill-title {
        font-size: 20px;
        padding: 6px 18px;
      }
      .cd-video-pill-sub {
        font-size: 14px;
        padding: 4px 14px;
      }
      .cd-bottom-action-bar {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class CursoDetalleComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cursoService = inject(CursoService);
  private cartService = inject(CartService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  curso: CursoModel | null = null;
  relatedCourses: CursoModel[] = [];
  activeTab: 'overview' | 'curriculum' | 'instructor' | 'reviews' = 'overview';
  openModuleIndex: number = 0;
  isPaid: boolean = false;
  inCart: boolean = false;
  showVideoModal: boolean = false;

  formattedDate: string = '10 Oct 2026';
  durationBadge: string = '10 days';
  seatsAvailableBadge: string = '30 Seats Available';
  videoTitleTag: string = '10 Excel Formulas';
  videoSubtitleTag: string = 'Make you Excel Expert';
  techBadgeLetter: string = 'X';

  temarioModulos = [
    {
      titulo: 'Módulo 1: Fundamentos & Entorno Profesional',
      duracion: '3 lecciones • 2h 30m',
      descripcion: 'Instalación de herramientas, configuración de arquitectura y creación del primer proyecto base.',
      temas: [
        { nombre: 'Introducción a la plataforma y herramientas requeridas', tiempo: '35 min' },
        { nombre: 'Estructura modular del proyecto y dependencias clave', tiempo: '45 min' },
        { nombre: 'Práctica guiada: Hola Mundo y configuración de repositorio', tiempo: '1h 10m' }
      ]
    },
    {
      titulo: 'Módulo 2: Desarrollo Core & Lógica de Negocio',
      duracion: '4 lecciones • 3h 45m',
      descripcion: 'Implementación de servicios, componentes reactivos y persistencia de datos relacionales.',
      temas: [
        { nombre: 'Modelado de entidades y transacciones en base de datos', tiempo: '55 min' },
        { nombre: 'Consumo de APIs RESTful y gestión de respuestas asíncronas', tiempo: '50 min' },
        { nombre: 'Control de estados reactivos y validaciones estrictas', tiempo: '1h 00m' },
        { nombre: 'Laboratorio: Caso práctico con datos reales del negocio', tiempo: '1h 00m' }
      ]
    },
    {
      titulo: 'Módulo 3: Seguridad, Pagos & Notificaciones',
      duracion: '3 lecciones • 3h 00m',
      descripcion: 'Integración de autenticación JWT con 2FA, pasarela oficial de Mercado Pago y avisos automáticos.',
      temas: [
        { nombre: 'Protección de rutas y tokens con expiración controlada', tiempo: '50 min' },
        { nombre: 'Checkout seguro con Mercado Pago (Sandbox y Producción)', tiempo: '1h 10m' },
        { nombre: 'Generación de comprobantes PDF y despacho por WhatsApp', tiempo: '1h 00m' }
      ]
    },
    {
      titulo: 'Módulo 4: Despliegue en Producción & Certificación',
      duracion: '2 lecciones • 2h 00m',
      descripcion: 'Optimizaciones finales de rendimiento, pruebas de carga y entrega del certificado oficial.',
      temas: [
        { nombre: 'Compilación optimizada y despliegue en servidor cloud', tiempo: '1h 00m' },
        { nombre: 'Evaluación final y emisión del diploma con código QR', tiempo: '1h 00m' }
      ]
    }
  ];

  ngOnInit(): void {
    this.sub = combineLatest([this.route.params, this.route.queryParams]).subscribe(([params, queryParams]) => {
      const id = params['id'] || queryParams['id'] || 'b0000000-0000-0000-0000-000000000001';
      this.cargarCurso(id);
    });
  }

  async cargarCurso(id: string): Promise<void> {
    const list = this.cursoService.getCachedCursos('TODOS');
    this.curso = list.find(c => c.id === id) || list[0] || null;
    this.cargarCursosRelacionados(id, list);

    if (this.curso) {
      this.actualizarMetadatos(this.curso);
    }

    const user = this.authService.getCurrentUser();
    const paidIds = this.pedidoService.getCachedPaidCourseIds();
    this.isPaid = paidIds.has(id);
    this.inCart = this.cartService.isInCart(id);

    try {
      const remote = await this.cursoService.getCursoById(id);
      if (remote) {
        this.curso = remote;
        this.actualizarMetadatos(remote);
      }

      if (user) {
        const matriculas = await this.pedidoService.getMisMatriculas(user.id);
        this.isPaid = (matriculas || []).some(m => {
          const cid = (m.curso && m.curso.id) ? m.curso.id : (m.cursoId || m.id);
          return m.estado === 'PAGADO' && cid === id;
        });
      }
    } catch (_) {}

    this.cdr.detectChanges();
  }

  private actualizarMetadatos(c: CursoModel): void {
    if (c.fechaInicio) {
      try {
        const d = new Date(c.fechaInicio);
        this.formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (_) {
        this.formattedDate = '10 Oct 2026';
      }
    } else {
      this.formattedDate = '10 Oct 2026';
    }

    this.durationBadge = c.modalidad === 'VIRTUAL' ? '10 days' : '40 hours';
    const vac = c.aforoDisponible !== undefined ? c.aforoDisponible : (c.aforoMaximo || 30);
    this.seatsAvailableBadge = `${vac} Seats Available`;

    // Adaptar títulos de la caja de video
    if (c.titulo.toLowerCase().includes('excel')) {
      this.videoTitleTag = '10 Excel Formulas';
      this.videoSubtitleTag = 'Make you Excel Expert';
      this.techBadgeLetter = 'X';
    } else if (c.titulo.toLowerCase().includes('java') || c.titulo.toLowerCase().includes('spring')) {
      this.videoTitleTag = 'Java & Spring Boot';
      this.videoSubtitleTag = 'Microservicios Empresariales';
      this.techBadgeLetter = 'J';
    } else if (c.titulo.toLowerCase().includes('angular') || c.titulo.toLowerCase().includes('frontend')) {
      this.videoTitleTag = 'Angular 22 Mastery';
      this.videoSubtitleTag = 'Standalone & Reactive Signals';
      this.techBadgeLetter = 'A';
    } else {
      this.videoTitleTag = c.titulo.length > 22 ? c.titulo.substring(0, 22) + '...' : c.titulo;
      this.videoSubtitleTag = 'Clase Demostrativa en Vivo';
      this.techBadgeLetter = c.titulo.charAt(0) || 'C';
    }

    this.inCart = this.cartService.isInCart(c.id);
  }

  private cargarCursosRelacionados(currentId: string, todos: CursoModel[]): void {
    const filtrados = todos.filter(c => c.id !== currentId);
    if (filtrados.length >= 3) {
      this.relatedCourses = filtrados.slice(0, 3);
    } else {
      // Semilla visual con los nombres y precios exactos del diseño de referencia
      const defaults: CursoModel[] = [
        {
          id: 'b0000000-0000-0000-0000-000000000002',
          titulo: 'UI/UX Design and Prototyping...',
          descripcion: 'Diseño de interfaces intuitivas y sistemas de diseño escalables con Figma.',
          modalidad: 'VIRTUAL',
          precio: 42.00,
          horario: 'Mar y Jue 19:00 - 21:00',
          aforoMaximo: 30,
          aforoDisponible: 12,
          docente: 'Lic. Claudia UX',
          imagen: 'assets/images/all-img/c2.png'
        },
        {
          id: 'b0000000-0000-0000-0000-000000000003',
          titulo: 'Greatest Passion In Development...',
          descripcion: 'Metodologías ágiles, buenas prácticas y arquitectura limpia en proyectos de TI.',
          modalidad: 'VIRTUAL',
          precio: 37.00,
          horario: 'Sábados 09:00 - 13:00',
          aforoMaximo: 25,
          aforoDisponible: 5,
          docente: 'Ing. Marco Tech',
          imagen: 'assets/images/all-img/c3.png'
        },
        {
          id: 'b0000000-0000-0000-0000-000000000004',
          titulo: 'Incorporate your art into code...',
          descripcion: 'Frontend creativo con animaciones CSS, canvas y componentes interactivos.',
          modalidad: 'PRESENCIAL',
          precio: 21.00,
          horario: 'Viernes 18:00 - 22:00',
          aforoMaximo: 20,
          aforoDisponible: 8,
          docente: 'Mag. Elena Art',
          imagen: 'assets/images/all-img/c4.png'
        }
      ];
      this.relatedCourses = filtrados.concat(defaults).slice(0, 3);
    }
  }

  selectTab(tab: 'overview' | 'curriculum' | 'instructor' | 'reviews'): void {
    this.activeTab = tab;
  }

  toggleModulo(index: number): void {
    this.openModuleIndex = this.openModuleIndex === index ? -1 : index;
  }

  enrollNow(): void {
    if (!this.curso) return;

    if (this.isPaid) {
      this.notifications.showToast('Ya estás matriculado en este curso. Redirigiendo a tu panel...', 'info');
      this.router.navigateByUrl('/mis-cursos');
      return;
    }

    if ((this.curso.aforoDisponible !== undefined) && this.curso.aforoDisponible <= 0) {
      this.notifications.showToast('Vacantes agotadas para este curso.', 'warning');
      return;
    }

    this.cartService.addToCart(this.curso);
    this.inCart = true;
    this.router.navigate(['/checkout'], { queryParams: { cursoId: this.curso.id } });
  }

  addToCart(): void {
    if (!this.curso) return;

    if (this.isPaid) {
      this.notifications.showToast('Ya te encuentras matriculado en este curso.', 'info');
      return;
    }

    const res = this.cartService.addToCart(this.curso);
    this.inCart = true;
    this.cartService.bumpBadge();
    this.notifications.showToast(res.message || '¡Curso agregado a tu carrito!', 'success');
  }

  goToCourse(id: string): void {
    this.router.navigate(['/curso-detalle'], { queryParams: { id } }).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  openVideoModal(): void {
    this.showVideoModal = true;
  }

  closeVideoModal(): void {
    this.showVideoModal = false;
  }

  onImgError(e: Event): void {
    const el = e.target as HTMLImageElement;
    if (el) el.src = 'assets/images/all-img/c1.png';
  }

  onAvatarError(e: Event): void {
    const el = e.target as HTMLImageElement;
    if (el) el.src = 'assets/images/all-img/clients/client02.png';
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
