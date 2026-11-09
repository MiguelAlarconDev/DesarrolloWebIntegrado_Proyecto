import { Component, OnInit, OnDestroy, ViewEncapsulation, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { APP_CONFIG, CursoModel } from '../../services/config.data';
import { AuthService, UserProfile } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { PedidoService } from '../../services/pedido.service';
import { NotificationService } from '../../services/notification.service';

export interface LeccionModel {
  id: string;
  moduloIndex: number;
  numero: number;
  titulo: string;
  duracion: string;
  descripcion: string;
  videoEmbedUrl: string;
  completada: boolean;
  recursos: { nombre: string; tipo: 'pdf' | 'zip' | 'enlace'; enlace: string }[];
}

export interface ModuloModel {
  titulo: string;
  duracion: string;
  descripcion: string;
  lecciones: LeccionModel[];
}

export interface PreguntaForo {
  id: string;
  autor: string;
  fecha: string;
  pregunta: string;
  respuesta?: {
    docente: string;
    fecha: string;
    texto: string;
  };
}

@Component({
  selector: 'app-aula-virtual',
  standalone: true,
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="aula-page-wrapper">
      <!-- TOP NAVBAR DEL AULA VIRTUAL -->
      <header class="aula-topbar">
        <div class="container-fluid px-3 px-lg-4">
          <div class="d-flex align-items-center justify-content-between py-2 flex-wrap gap-2">
            <!-- Botón Volver y Título -->
            <div class="d-flex align-items-center gap-3">
              <a href="/mis-cursos" class="aula-back-btn" title="Volver al panel de Mis Clases">
                <i class="fa fa-arrow-left me-1"></i> Mis Clases
              </a>
              <div class="vr bg-secondary opacity-50 d-none d-md-block" style="height: 24px;"></div>
              <div>
                <h1 class="aula-course-heading mb-0">
                  {{ curso?.titulo || 'Aula de Clases en Vivo' }}
                </h1>
                <div class="d-flex align-items-center gap-2 small text-muted">
                  <span class="badge" [ngClass]="curso?.modalidad === 'VIRTUAL' ? 'bg-info text-dark' : 'bg-warning text-dark'" style="font-size: 10.5px;">
                    <i class="fa" [ngClass]="curso?.modalidad === 'VIRTUAL' ? 'fa-video-camera' : 'fa-building'"></i>
                    {{ curso?.modalidad || 'VIRTUAL' }}
                  </span>
                  <span>&bull; Docente: <strong>{{ curso?.docente || 'Docente Titular' }}</strong></span>
                </div>
              </div>
            </div>

            <!-- Avance del Estudiante & Acciones -->
            <div class="d-flex align-items-center gap-3">
              <!-- Barra de Progreso Circular / Porcentaje -->
              <div class="aula-progress-badge d-flex align-items-center gap-2">
                <div class="text-end d-none d-sm-block">
                  <span class="d-block fw-bold text-dark" style="font-size: 12.5px;">Tu Progreso</span>
                  <small class="text-muted" style="font-size: 11px;">{{ leccionesCompletadasCount }} de {{ totalLeccionesCount }} lecciones</small>
                </div>
                <div class="progress-pill">
                  <span class="fw-bold" [style.color]="progresoPorcentaje === 100 ? '#16a34a' : '#2eca7f'">
                    {{ progresoPorcentaje }}%
                  </span>
                </div>
              </div>

              <!-- Botón de Certificado (si aprobó) -->
              @if (estaAprobado) {
                <a href="/mis-certificados" class="btn btn-success btn-sm fw-bold px-3 py-2 shadow-sm d-inline-flex align-items-center gap-2" style="border-radius: 8px;">
                  <i class="fa fa-certificate"></i>
                  <span>Ver Certificado Oficial</span>
                </a>
              } @else {
                <button type="button" class="btn btn-outline-secondary btn-sm px-2 py-1 small" disabled style="opacity: 0.7; font-size: 11.5px; border-radius: 6px;">
                  <i class="fa fa-lock me-1"></i> Certificado al 100% y aprobar
                </button>
              }
            </div>
          </div>
        </div>
      </header>

      <!-- CUERPO PRINCIPAL DEL AULA -->
      <main class="aula-main-body">
        <div class="container-fluid px-3 px-lg-4 py-3">
          <div class="row g-3">
            
            <!-- COLUMNA IZQUIERDA: REPRODUCTOR, CONTENIDO Y PESTAÑAS (70%) -->
            <div class="col-xl-8 col-lg-7 col-12">
              
              <!-- REPRODUCTOR DE VIDEO / PANTALLA PRINCIPAL DE CLASE -->
              <div class="aula-screen-card mb-3">
                @if (curso?.modalidad === 'VIRTUAL' && leccionActual?.videoEmbedUrl) {
                  <div class="ratio ratio-16x9 aula-video-frame">
                    <iframe
                      [src]="leccionActual?.videoEmbedUrl"
                      title="Reproductor de Clase"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen>
                    </iframe>
                  </div>
                } @else if (curso?.modalidad === 'PRESENCIAL') {
                  <div class="aula-presencial-banner p-4 text-center">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: #dcfce7; color: #16a34a; font-size: 26px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                      <i class="fa fa-building"></i>
                    </div>
                    <h3 class="fw-bold text-dark mb-1">Sesión Presencial en Campus</h3>
                    <p class="text-muted small mb-3">
                      Esta sesión se dicta físicamente en sede con asistencia y laboratorio práctico con equipos asignados.
                    </p>
                    <div class="d-inline-flex flex-wrap gap-3 bg-white p-3 rounded-3 border text-start">
                      <div><strong class="d-block text-dark small"><i class="fa fa-map-marker text-danger me-1"></i>Sede:</strong> {{ curso?.direccionClase || 'Av. Universitaria 1234, Lima' }}</div>
                      <div><strong class="d-block text-dark small"><i class="fa fa-table text-primary me-1"></i>Aula:</strong> {{ curso?.aula || 'Laboratorio 204' }}</div>
                      <div><strong class="d-block text-dark small"><i class="fa fa-calendar text-warning me-1"></i>Horario:</strong> {{ curso?.horario || 'Sábados 09:00 - 13:00' }}</div>
                    </div>
                  </div>
                } @else {
                  <div class="ratio ratio-16x9 aula-video-frame">
                    <iframe
                      src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                      title="Reproductor de Clase"
                      allowfullscreen>
                    </iframe>
                  </div>
                }

                <!-- BARRA DE CONTROL INFERIOR DEL REPRODUCTOR -->
                <div class="aula-player-controls p-3 bg-white border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div class="d-flex align-items-center gap-2">
                    <button type="button" class="btn btn-outline-secondary btn-sm" (click)="irLeccionAnterior()" [disabled]="esPrimeraLeccion()">
                      <i class="fa fa-chevron-left me-1"></i> Anterior
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" (click)="irLeccionSiguiente()" [disabled]="esUltimaLeccion()">
                      Siguiente <i class="fa fa-chevron-right ms-1"></i>
                    </button>
                  </div>

                  <div class="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      class="btn btn-sm fw-bold px-3"
                      [ngClass]="leccionActual?.completada ? 'btn-success' : 'btn-outline-success'"
                      (click)="toggleCompletarLeccionActual()">
                      <i class="fa" [ngClass]="leccionActual?.completada ? 'fa-check-circle' : 'fa-circle-o'"></i>
                      <span class="ms-1">{{ leccionActual?.completada ? 'Lección Completada' : 'Marcar como Completada' }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- BANNER DE ACCESO DIRECTO A SALA EN VIVO / ZOOM (SI ES VIRTUAL) -->
              @if (curso?.modalidad === 'VIRTUAL') {
                <div class="aula-live-alert p-3 mb-3 rounded-3 border d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div class="d-flex align-items-center gap-3">
                    <span class="live-pulse-dot"></span>
                    <div>
                      <strong class="d-block text-dark small">
                        <i class="fa fa-video-camera text-primary me-1"></i> Sala de Clases en Vivo (Google Meet / Zoom)
                      </strong>
                      <span class="text-muted small">Próxima sesión sincrónica: <strong>{{ curso?.horario }}</strong> con el docente en vivo.</span>
                    </div>
                  </div>
                  <a [href]="curso?.enlaceClase || 'https://meet.google.com/abc-defg-hij'" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm fw-bold px-3 py-2" style="border-radius: 8px;">
                    <i class="fa fa-external-link me-1"></i> Unirme a la Sala en Vivo
                  </a>
                </div>
              }

              <!-- TÍTULO Y PESTAÑAS DE LA LECCIÓN -->
              <div class="aula-tabs-container bg-white border rounded-3 p-3 p-lg-4 mb-4">
                <div class="d-flex align-items-start justify-content-between gap-3 mb-3 flex-wrap">
                  <div>
                    <span class="badge bg-light text-secondary border mb-1">
                      Módulo {{ (leccionActual?.moduloIndex || 0) + 1 }} &bull; Lección {{ leccionActual?.numero }}
                    </span>
                    <h2 class="h4 fw-bold text-dark mb-1">{{ leccionActual?.titulo }}</h2>
                    <span class="text-muted small"><i class="fa fa-clock-o me-1"></i> Duración estimada: {{ leccionActual?.duracion }}</span>
                  </div>
                  
                  @if (leccionActual?.completada) {
                    <span class="badge bg-success-subtle text-success border border-success-subtle py-2 px-3 fw-bold">
                      <i class="fa fa-check me-1"></i> Completada
                    </span>
                  }
                </div>

                <!-- NAVEGACIÓN DE PESTAÑAS INTERNAS -->
                <ul class="nav nav-pills gap-2 mb-3 border-bottom pb-2" role="tablist">
                  <li class="nav-item">
                    <button class="nav-link py-2 px-3" [class.active]="tabActivo === 'descripcion'" (click)="tabActivo = 'descripcion'">
                      <i class="fa fa-file-text-o me-1"></i> Resumen de la Clase
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link py-2 px-3" [class.active]="tabActivo === 'recursos'" (click)="tabActivo = 'recursos'">
                      <i class="fa fa-download me-1"></i> Recursos & Descargas ({{ leccionActual?.recursos?.length || 0 }})
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link py-2 px-3" [class.active]="tabActivo === 'preguntas'" (click)="tabActivo = 'preguntas'">
                      <i class="fa fa-comments-o me-1"></i> Dudas al Docente ({{ listaPreguntas.length }})
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link py-2 px-3" [class.active]="tabActivo === 'evaluacion'" (click)="tabActivo = 'evaluacion'">
                      <i class="fa fa-graduation-cap me-1"></i> Examen / Proyecto Final
                      @if (estaAprobado) {
                        <span class="badge bg-success ms-1">Nota: {{ notaFinal }}/20</span>
                      }
                    </button>
                  </li>
                </ul>

                <!-- CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA -->
                <div class="tab-content pt-2">
                  
                  <!-- TAB 1: DESCRIPCIÓN & APUNTES -->
                  @if (tabActivo === 'descripcion') {
                    <div class="tab-pane fade show active">
                      <h5 class="fw-bold text-dark mb-2">Objetivos de Aprendizaje:</h5>
                      <p class="text-secondary" style="line-height: 1.6;">
                        {{ leccionActual?.descripcion }}
                      </p>
                      
                      <div class="bg-light p-3 rounded-3 border mb-3">
                        <h6 class="fw-bold text-dark mb-2"><i class="fa fa-check text-success me-2"></i>Puntos Clave Explicados:</h6>
                        <ul class="list-unstyled mb-0 small text-secondary">
                          <li class="py-1"><i class="fa fa-arrow-right text-success me-2"></i> Arquitectura limpia, desacoplamiento y buenas prácticas de desarrollo.</li>
                          <li class="py-1"><i class="fa fa-arrow-right text-success me-2"></i> Configuración de dependencias Maven / NPM y variables de entorno seguras.</li>
                          <li class="py-1"><i class="fa fa-arrow-right text-success me-2"></i> Casos reales aplicados a la banca, pasarelas de pago y comercio electrónico.</li>
                        </ul>
                      </div>

                      <div class="alert alert-info border-0 p-3 small text-secondary" style="background: #f0fdf4; color: #166534 !important;">
                        <i class="fa fa-lightbulb-o me-1 text-success"></i> <strong>Consejo del Docente:</strong> Completa los ejercicios prácticos del laboratorio antes de avanzar a la siguiente sesión para consolidar tu aprendizaje.
                      </div>
                    </div>
                  }

                  <!-- TAB 2: RECURSOS Y DESCARGAS -->
                  @if (tabActivo === 'recursos') {
                    <div class="tab-pane fade show active">
                      <h5 class="fw-bold text-dark mb-3">Materiales Oficiales de la Sesión:</h5>
                      <div class="d-flex flex-column gap-2">
                        @for (rec of leccionActual?.recursos; track rec.nombre) {
                          <div class="d-flex align-items-center justify-content-between p-3 rounded-3 border bg-light">
                            <div class="d-flex align-items-center gap-3">
                              <div style="width: 36px; height: 36px; border-radius: 8px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                                <i class="fa" [ngClass]="rec.tipo === 'pdf' ? 'fa-file-pdf-o' : (rec.tipo === 'zip' ? 'fa-file-archive-o' : 'fa-link')"></i>
                              </div>
                              <div>
                                <strong class="d-block text-dark small">{{ rec.nombre }}</strong>
                                <span class="text-muted" style="font-size: 11px;">Formato: {{ rec.tipo | uppercase }} &bull; Descarga oficial</span>
                              </div>
                            </div>
                            <button type="button" class="btn btn-outline-primary btn-sm px-3 fw-bold" (click)="descargarRecurso(rec.nombre)">
                              <i class="fa fa-download me-1"></i> Descargar
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- TAB 3: DUDAS AL DOCENTE / FORO -->
                  @if (tabActivo === 'preguntas') {
                    <div class="tab-pane fade show active">
                      <div class="d-flex align-items-center justify-content-between mb-3">
                        <h5 class="fw-bold text-dark mb-0">Foro de Dudas & Consultas de la Clase</h5>
                        <small class="text-muted">El docente responde en menos de 24 horas.</small>
                      </div>

                      <!-- Formulario para publicar nueva duda -->
                      <div class="mb-4 p-3 bg-light rounded-3 border">
                        <label class="form-label fw-bold text-dark small">¿Tienes una duda sobre este tema?</label>
                        <textarea
                          id="txt-nueva-pregunta"
                          class="form-control mb-2"
                          rows="2"
                          placeholder="Escribe tu consulta aquí con claridad..."
                          style="font-size: 13.5px;"></textarea>
                        <div class="text-end">
                          <button type="button" class="btn btn-success btn-sm fw-bold px-3" (click)="publicarPregunta()">
                            <i class="fa fa-paper-plane me-1"></i> Enviar Consulta
                          </button>
                        </div>
                      </div>

                      <!-- Lista de Preguntas y Respuestas del Docente -->
                      <div class="d-flex flex-column gap-3">
                        @for (item of listaPreguntas; track item.id) {
                          <div class="p-3 rounded-3 border bg-white">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                              <strong class="text-dark small"><i class="fa fa-user-circle me-1 text-primary"></i> {{ item.autor }}</strong>
                              <small class="text-muted" style="font-size: 11px;">{{ item.fecha }}</small>
                            </div>
                            <p class="text-secondary small mb-2">{{ item.pregunta }}</p>

                            <!-- Respuesta del Docente -->
                            @if (item.respuesta) {
                              <div class="p-2 ps-3 rounded-2 mt-2" style="background: #f0fdf4; border-left: 3px solid #2eca7f;">
                                <div class="d-flex align-items-center justify-content-between mb-1">
                                  <span class="badge bg-success-subtle text-success fw-bold" style="font-size: 10.5px;">
                                    <i class="fa fa-graduation-cap me-1"></i> Respuesta de {{ item.respuesta.docente }}
                                  </span>
                                  <small class="text-muted" style="font-size: 10.5px;">{{ item.respuesta.fecha }}</small>
                                </div>
                                <p class="text-secondary small mb-0">{{ item.respuesta.texto }}</p>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- TAB 4: EXAMEN / PROYECTO FINAL PARA CERTIFICACIÓN -->
                  @if (tabActivo === 'evaluacion') {
                    <div class="tab-pane fade show active">
                      <div class="p-3 p-lg-4 rounded-3 border" style="background: #fafafa;">
                        <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                          <div>
                            <h4 class="fw-bold text-dark mb-1">
                              <i class="fa fa-trophy text-warning me-2"></i>Evaluación Final de Cierre del Programa
                            </h4>
                            <p class="text-muted small mb-0">
                              Responde el cuestionario para calificar el curso. Nota mínima aprobatoria: <strong>14 / 20</strong>.
                            </p>
                          </div>
                          @if (estaAprobado) {
                            <div class="text-end">
                              <span class="badge bg-success p-2 fs-6">
                                <i class="fa fa-check-circle me-1"></i> ¡Aprobado con Nota: {{ notaFinal }}/20!
                              </span>
                            </div>
                          }
                        </div>

                        <!-- Cuestionario Interactivo -->
                        <div class="d-flex flex-column gap-3 mb-4">
                          <div class="p-3 bg-white rounded-3 border">
                            <strong class="d-block text-dark small mb-2">1. ¿Cuál es el principal beneficio del desacoplamiento en arquitecturas modulares?</strong>
                            <div class="d-flex flex-column gap-1 small text-secondary">
                              <label class="d-flex align-items-center gap-2 cursor-pointer">
                                <input type="radio" name="p1" value="a" checked> Facilita el mantenimiento, escalabilidad independiente y testing continuo.
                              </label>
                              <label class="d-flex align-items-center gap-2 cursor-pointer">
                                <input type="radio" name="p1" value="b"> Permite alojar todo el código en un único archivo.
                              </label>
                              <label class="d-flex align-items-center gap-2 cursor-pointer">
                                <input type="radio" name="p1" value="c"> Elimina la necesidad de utilizar bases de datos relacionales.
                              </label>
                            </div>
                          </div>

                          <div class="p-3 bg-white rounded-3 border">
                            <strong class="d-block text-dark small mb-2">2. Para garantizar la seguridad en pasarelas de pago como Mercado Pago, ¿qué práctica es indispensable?</strong>
                            <div class="d-flex flex-column gap-1 small text-secondary">
                              <label class="d-flex align-items-center gap-2 cursor-pointer">
                                <input type="radio" name="p2" value="a"> Guardar el Access Token privado en el código frontend de Angular.
                              </label>
                              <label class="d-flex align-items-center gap-2 cursor-pointer">
                                <input type="radio" name="p2" value="b" checked> Mantener las credenciales secretas en el backend con HTTPS y validar Webhooks/IPN.
                              </label>
                              <label class="d-flex align-items-center gap-2 cursor-pointer">
                                <input type="radio" name="p2" value="c"> Permitir pagos anónimos sin verificación de número de orden.
                              </label>
                            </div>
                          </div>

                          <div class="p-3 bg-white rounded-3 border">
                            <strong class="d-block text-dark small mb-2">3. ¿Qué condición se requiere para la emisión oficial del certificado del curso?</strong>
                            <div class="d-flex flex-column gap-1 small text-secondary">
                              <label class="d-flex align-items-center gap-2 cursor-pointer">
                                <input type="radio" name="p3" value="a" checked> Culminar el 100% de las clases programadas y aprobar la evaluación final.
                              </label>
                              <label class="d-flex align-items-center gap-2 cursor-pointer">
                                <input type="radio" name="p3" value="b"> Realizar únicamente el pago de la matrícula sin asistir a clases.
                              </label>
                              <label class="d-flex align-items-center gap-2 cursor-pointer">
                                <input type="radio" name="p3" value="c"> Compartir el enlace del curso en redes sociales.
                              </label>
                            </div>
                          </div>
                        </div>

                        <!-- Botón de Rendición de Examen -->
                        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 pt-2 border-top">
                          <div>
                            @if (!estaAprobado) {
                              <small class="text-muted">
                                <i class="fa fa-info-circle me-1"></i> Al enviar tu evaluación, el docente registrará tu calificación y se emitirá tu certificado.
                              </small>
                            } @else {
                              <small class="text-success fw-bold">
                                <i class="fa fa-check-circle me-1"></i> Ya has aprobado esta evaluación con nota sobresaliente.
                              </small>
                            }
                          </div>

                          @if (!estaAprobado) {
                            <button type="button" class="btn btn-success fw-bold px-4 py-2" (click)="rendirEvaluacionFinal()">
                              <i class="fa fa-paper-plane me-1"></i> Enviar Evaluación y Aprobar Curso
                            </button>
                          } @else {
                            <a href="/mis-certificados" class="btn btn-primary fw-bold px-4 py-2">
                              <i class="fa fa-certificate me-1"></i> Ir a Descargar Mi Certificado
                            </a>
                          }
                        </div>
                      </div>
                    </div>
                  }

                </div>
              </div>

            </div>

            <!-- COLUMNA DERECHA: ÍNDICE DE MÓDULOS Y LECCIONES (30%) -->
            <div class="col-xl-4 col-lg-5 col-12">
              <div class="aula-syllabus-card bg-white border rounded-3 p-3">
                <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <h3 class="h5 fw-bold text-dark mb-0">Contenido del Curso</h3>
                  <span class="badge bg-light text-secondary border">
                    {{ leccionesCompletadasCount }} / {{ totalLeccionesCount }} completadas
                  </span>
                </div>

                <!-- Barra de Progreso del Temario -->
                <div class="progress mb-3" style="height: 8px;">
                  <div
                    class="progress-bar bg-success"
                    role="progressbar"
                    [style.width.%]="progresoPorcentaje"
                    aria-valuemin="0"
                    aria-valuemax="100">
                  </div>
                </div>

                <!-- Lista de Módulos (Acordeón de Lecciones) -->
                <div class="aula-accordion d-flex flex-column gap-2">
                  @for (mod of modulos; let mIdx = $index; track mod.titulo) {
                    <div class="aula-module-block border rounded-3 overflow-hidden">
                      <!-- Cabecera del Módulo -->
                      <button
                        type="button"
                        class="aula-module-header w-100 p-3 text-start d-flex align-items-center justify-content-between border-0 bg-light"
                        (click)="toggleModulo(mIdx)">
                        <div class="d-flex align-items-center gap-2">
                          <i class="fa" [ngClass]="openModuleIndex === mIdx ? 'fa-chevron-down' : 'fa-chevron-right'" style="font-size: 11px; color: #64748b;"></i>
                          <div>
                            <strong class="d-block text-dark small">{{ mod.titulo }}</strong>
                            <small class="text-muted" style="font-size: 11px;">{{ mod.lecciones.length }} lecciones &bull; {{ mod.duracion }}</small>
                          </div>
                        </div>
                        <span class="badge bg-white text-secondary border" style="font-size: 11px;">
                          {{ contarLeccionesCompletadasEnModulo(mod) }}/{{ mod.lecciones.length }}
                        </span>
                      </button>

                      <!-- Lista de Lecciones del Módulo -->
                      @if (openModuleIndex === mIdx) {
                        <div class="aula-lessons-list p-0 bg-white border-top">
                          @for (lec of mod.lecciones; track lec.id) {
                            <div
                              class="aula-lesson-item p-3 d-flex align-items-center justify-content-between border-bottom"
                              [class.lesson-active]="leccionActual?.id === lec.id"
                              (click)="seleccionarLeccion(lec)"
                              style="cursor: pointer; transition: background 0.15s ease;">
                              <div class="d-flex align-items-center gap-2">
                                <!-- Ícono de Estado -->
                                @if (lec.completada) {
                                  <i class="fa fa-check-circle text-success" style="font-size: 16px;"></i>
                                } @else if (leccionActual?.id === lec.id) {
                                  <i class="fa fa-play-circle text-primary" style="font-size: 16px;"></i>
                                } @else {
                                  <i class="fa fa-circle-o text-muted" style="font-size: 16px;"></i>
                                }

                                <div>
                                  <span class="d-block small" [ngClass]="leccionActual?.id === lec.id ? 'fw-bold text-primary' : 'text-dark'">
                                    {{ lec.numero }}. {{ lec.titulo }}
                                  </span>
                                  <small class="text-muted" style="font-size: 11px;"><i class="fa fa-clock-o me-1"></i>{{ lec.duracion }}</small>
                                </div>
                              </div>

                              <div>
                                @if (leccionActual?.id === lec.id) {
                                  <span class="badge bg-primary text-white" style="font-size: 10px;">Viendo</span>
                                }
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>

                <!-- Footer de la Barra Lateral -->
                <div class="mt-4 p-3 bg-light rounded-3 border text-center">
                  <span class="d-block small text-muted mb-2">¿Necesitas soporte académico?</span>
                  <a href="https://wa.me/51935300159" target="_blank" rel="noopener noreferrer" class="btn btn-outline-success btn-sm w-100 fw-bold">
                    <i class="fa fa-whatsapp me-1"></i> Mesa de Ayuda WhatsApp
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <!-- MODAL DE FELICITACIÓN AL APROBAR TODO -->
      @if (mostrarModalFelicitacion) {
        <div class="comp-modal-overlay" (click)="cerrarModalFelicitacion()">
          <div class="comp-modal-window text-center p-4" (click)="$event.stopPropagation()" style="max-width: 520px;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: #dcfce7; color: #16a34a; font-size: 38px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: 0 8px 24px rgba(22, 163, 74, 0.25);">
              <i class="fa fa-trophy"></i>
            </div>
            
            <h3 class="fw-bold text-dark mb-2">¡Felicitaciones, Curso Aprobado!</h3>
            <p class="text-muted small mb-3">
              Has culminado exitosamente el 100% de las clases de <strong>{{ curso?.titulo }}</strong> y aprobado la evaluación final con una calificación sobresaliente:
            </p>

            <div class="p-3 rounded-3 border mb-3" style="background: #f0fdf4; border-color: #86efac !important;">
              <span class="d-block text-muted small">Calificación Obtenida:</span>
              <strong style="color: #16a34a; font-size: 28px;">{{ notaFinal }} / 20</strong>
              <small class="d-block text-success fw-bold">Aprobado con Distinción Institucional</small>
            </div>

            <p class="small text-secondary mb-4">
              Tu certificado oficial con código de verificación QR y firma docente ya se encuentra emitido y habilitado para descarga en PDF.
            </p>

            <div class="d-grid gap-2">
              <a href="/mis-certificados" class="btn btn-success fw-bold py-2">
                <i class="fa fa-certificate me-1"></i> Ir a Mis Certificados y Descargar PDF
              </a>
              <button type="button" class="btn btn-outline-secondary btn-sm" (click)="cerrarModalFelicitacion()">
                Continuar en el Aula
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .aula-page-wrapper {
      min-height: 100vh;
      background: #f8fafc;
      padding-top: 85px !important;
      padding-bottom: 60px !important;
      font-family: 'Mulish', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .aula-topbar {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 80px;
      z-index: 100;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
    }

    .aula-back-btn {
      color: #0f172a;
      font-size: 13.5px;
      font-weight: 700;
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 6px;
      background: #f1f5f9;
      transition: background 0.2s ease;
    }

    .aula-back-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .aula-course-heading {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
    }

    .progress-pill {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 14px;
    }

    .aula-screen-card {
      background: #0f172a;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
    }

    .aula-video-frame iframe {
      border: none;
      width: 100%;
      height: 100%;
    }

    .aula-live-alert {
      background: #eff6ff;
      border-color: #bfdbfe !important;
    }

    .live-pulse-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ef4444;
      display: inline-block;
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      animation: livePulse 1.5s infinite;
    }

    @keyframes livePulse {
      0% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
      }
    }

    .aula-tabs-container .nav-pills .nav-link {
      color: #64748b;
      font-weight: 700;
      font-size: 13.5px;
      border-radius: 6px;
    }

    .aula-tabs-container .nav-pills .nav-link.active {
      background: #2eca7f;
      color: #ffffff;
    }

    .aula-syllabus-card {
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
      position: sticky;
      top: 155px;
    }

    .aula-module-header {
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .aula-module-header:hover {
      background: #e2e8f0;
    }

    .aula-lesson-item:hover {
      background: #f8fafc;
    }

    .lesson-active {
      background: #f0fdf4 !important;
      border-left: 3px solid #2eca7f;
    }
  `]
})
export class AulaVirtualComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cursoService = inject(CursoService);
  private pedidoService = inject(PedidoService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  curso: CursoModel | null = null;
  currentUser: UserProfile | null = null;
  modulos: ModuloModel[] = [];
  leccionActual: LeccionModel | null = null;
  openModuleIndex = 0;
  tabActivo: 'descripcion' | 'recursos' | 'preguntas' | 'evaluacion' = 'descripcion';

  estaAprobado = false;
  notaFinal = 18;
  mostrarModalFelicitacion = false;

  listaPreguntas: PreguntaForo[] = [
    {
      id: 'p1',
      autor: 'Carlos Alarcón',
      fecha: 'Ayer 15:40',
      pregunta: '¿El contenedor de base de datos se reinicia automáticamente si falla en producción?',
      respuesta: {
        docente: 'Prof. Roberto Mendoza',
        fecha: 'Ayer 17:10',
        texto: 'Sí, siempre que configures la directiva restart: always en tu archivo docker-compose.yml o la política on-failure en Kubernetes.'
      }
    },
    {
      id: 'p2',
      autor: 'Valeria Gómez',
      fecha: 'Hace 2 días',
      pregunta: '¿Para el examen final es necesario haber completado todas las lecciones del módulo?',
      respuesta: {
        docente: 'Prof. Roberto Mendoza',
        fecha: 'Hace 2 días',
        texto: 'Efectivamente, el sistema valida que tengas el 100% de lecciones vistas antes de otorgar el certificado oficial.'
      }
    }
  ];

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.notifications.showToast('Inicia sesión para ingresar al aula de clases.', 'info');
      this.router.navigateByUrl('/login?redirect=mis-cursos');
      return;
    }

    this.sub = this.route.queryParams.subscribe(params => {
      const cid = params['id'] || params['cursoId'] || 'b0000000-0000-0000-0000-000000000003';
      this.cargarAula(cid);
    });
  }

  async cargarAula(cursoId: string): Promise<void> {
    const list = this.cursoService.getCachedCursos('TODOS');
    this.curso = list.find(c => c.id === cursoId) || null;

    if (!this.curso) {
      try {
        const remote = await this.cursoService.getCursoById(cursoId);
        if (remote) this.curso = remote;
      } catch (_) {}
    }

    if (!this.curso) {
      this.curso = APP_CONFIG.INITIAL_COURSES.find(c => c.id === cursoId) || APP_CONFIG.INITIAL_COURSES[2];
    }

    // Comprobar estado de aprobación en pedidoService
    if (this.currentUser && this.curso) {
      const evalItem = this.pedidoService.getEvaluacionAcademica(this.curso.id, this.currentUser.id);
      this.estaAprobado = !!(evalItem && evalItem.aprobado);
      if (evalItem && evalItem.nota) {
        this.notaFinal = evalItem.nota;
      }
    }

    this.construirTemario(this.curso);
    this.cargarProgresoGuardado();
    this.cdr.detectChanges();
  }

  private construirTemario(c: CursoModel): void {
    const tituloCurso = c.titulo || 'Curso Profesional';
    const isVirtual = c.modalidad === 'VIRTUAL';

    const sampleEmbeds = [
      'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1',
      'https://www.youtube.com/embed/jfKfPfyJRdk',
      'https://www.youtube.com/embed/kJQP7kiw5Fk',
      'https://www.youtube.com/embed/tgbNymZ7vqY'
    ];

    this.modulos = [
      {
        titulo: 'Módulo 1: Fundamentos & Entorno Profesional',
        duracion: '3 lecciones • 2h 30m',
        descripcion: 'Configuración inicial, herramientas de desarrollo y arquitectura general.',
        lecciones: [
          {
            id: 'm1_l1',
            moduloIndex: 0,
            numero: 1,
            titulo: `Introducción a ${tituloCurso}`,
            duracion: '35 min',
            descripcion: 'En esta primera sesión analizamos los fundamentos, la arquitectura de la solución y las herramientas indispensables para el desarrollo profesional.',
            videoEmbedUrl: sampleEmbeds[0],
            completada: true,
            recursos: [
              { nombre: 'Diapositivas_Sesion_01.pdf', tipo: 'pdf', enlace: '#' },
              { nombre: 'Guia_Instalacion_Entorno.pdf', tipo: 'pdf', enlace: '#' }
            ]
          },
          {
            id: 'm1_l2',
            moduloIndex: 0,
            numero: 2,
            titulo: 'Estructura Modular & Dependencias Clave',
            duracion: '45 min',
            descripcion: 'Configuración detallada del repositorio de código, gestión de dependencias y desacoplamiento en módulos reutilizables.',
            videoEmbedUrl: sampleEmbeds[1],
            completada: false,
            recursos: [
              { nombre: 'Codigo_Base_Modulo_1.zip', tipo: 'zip', enlace: '#' },
              { nombre: 'CheatSheet_Comandos.pdf', tipo: 'pdf', enlace: '#' }
            ]
          },
          {
            id: 'm1_l3',
            moduloIndex: 0,
            numero: 3,
            titulo: 'Práctica Guiada: Primer Laboratorio en Vivo',
            duracion: '1h 10m',
            descripcion: 'Resolución paso a paso del primer caso real, pruebas unitarias y conexión a base de datos relacional.',
            videoEmbedUrl: sampleEmbeds[2],
            completada: false,
            recursos: [
              { nombre: 'Laboratorio_01_Enunciado.pdf', tipo: 'pdf', enlace: '#' }
            ]
          }
        ]
      },
      {
        titulo: 'Módulo 2: Desarrollo Core & Lógica de Negocio',
        duracion: '3 lecciones • 3h 15m',
        descripcion: 'Implementación de servicios empresariales, validaciones estrictas y persistencia.',
        lecciones: [
          {
            id: 'm2_l1',
            moduloIndex: 1,
            numero: 4,
            titulo: 'Modelado de Entidades & Transacciones ACID',
            duracion: '55 min',
            descripcion: 'Diseño relacional optimizado, integridad referencial y control estricto de transacciones en base de datos.',
            videoEmbedUrl: sampleEmbeds[3],
            completada: false,
            recursos: [
              { nombre: 'Esquema_BD_PostgreSQL.sql', tipo: 'pdf', enlace: '#' }
            ]
          },
          {
            id: 'm2_l2',
            moduloIndex: 1,
            numero: 5,
            titulo: 'Consumo de APIs RESTful & Servicios Asíncronos',
            duracion: '50 min',
            descripcion: 'Integración entre microservicios, manejo robusto de excepciones y respuestas HTTP estandarizadas.',
            videoEmbedUrl: sampleEmbeds[0],
            completada: false,
            recursos: [
              { nombre: 'Coleccion_Postman_APIs.json', tipo: 'zip', enlace: '#' }
            ]
          },
          {
            id: 'm2_l3',
            moduloIndex: 1,
            numero: 6,
            titulo: 'Laboratorio de Negocio: Gestión de Vacantes en Tiempo Real',
            duracion: '1h 30m',
            descripcion: 'Caso práctico que descuenta los cupos en tiempo real para evitar la sobreventa de vacantes en la plataforma.',
            videoEmbedUrl: sampleEmbeds[1],
            completada: false,
            recursos: [
              { nombre: 'Solucionario_Laboratorio_02.zip', tipo: 'zip', enlace: '#' }
            ]
          }
        ]
      },
      {
        titulo: 'Módulo 3: Seguridad, Pasarelas de Pago & Notificaciones',
        duracion: '3 lecciones • 2h 45m',
        descripcion: 'Autenticación JWT, verificación 2FA, integración con Mercado Pago y WhatsApp.',
        lecciones: [
          {
            id: 'm3_l1',
            moduloIndex: 2,
            numero: 7,
            titulo: 'Autenticación con JWT & Doble Factor (2FA)',
            duracion: '50 min',
            descripcion: 'Protección de rutas frontend y backend mediante tokens seguros, roles de usuario y códigos OTP.',
            videoEmbedUrl: sampleEmbeds[2],
            completada: false,
            recursos: [
              { nombre: 'Seguridad_JWT_Implementacion.pdf', tipo: 'pdf', enlace: '#' }
            ]
          },
          {
            id: 'm3_l2',
            moduloIndex: 2,
            numero: 8,
            titulo: 'Pasarela Oficial de Mercado Pago & Webhooks',
            duracion: '1h 05m',
            descripcion: 'Creación de preferencias de pago, configuración de sandbox de pruebas y conciliación automática.',
            videoEmbedUrl: sampleEmbeds[3],
            completada: false,
            recursos: [
              { nombre: 'Guia_Pasarela_MercadoPago.pdf', tipo: 'pdf', enlace: '#' }
            ]
          },
          {
            id: 'm3_l3',
            moduloIndex: 2,
            numero: 9,
            titulo: 'Comprobantes SUNAT & Alertas Automáticas de WhatsApp',
            duracion: '50 min',
            descripcion: 'Generación de Boletas y Facturas electrónicas en PDF y despacho inmediato al WhatsApp del alumno.',
            videoEmbedUrl: sampleEmbeds[0],
            completada: false,
            recursos: [
              { nombre: 'Plantilla_Comprobante_Boleta.pdf', tipo: 'pdf', enlace: '#' }
            ]
          }
        ]
      },
      {
        titulo: 'Módulo 4: Despliegue en Cloud & Cierre de Evaluación',
        duracion: '2 lecciones • 2h 00m',
        descripcion: 'Puesta en producción, evaluación final y emisión del certificado oficial.',
        lecciones: [
          {
            id: 'm4_l1',
            moduloIndex: 3,
            numero: 10,
            titulo: 'Compilación Optimizada & Despliegue Cloud',
            duracion: '1h 00m',
            descripcion: 'Buenas prácticas de rendimiento, auditoría de código y despliegue continuo en la nube.',
            videoEmbedUrl: sampleEmbeds[1],
            completada: false,
            recursos: [
              { nombre: 'Checklist_Despliegue_Produccion.pdf', tipo: 'pdf', enlace: '#' }
            ]
          },
          {
            id: 'm4_l2',
            moduloIndex: 3,
            numero: 11,
            titulo: 'Evaluación Final & Emisión de Certificado',
            duracion: '1h 00m',
            descripcion: 'Rendición del proyecto final, revisión del docente y habilitación del certificado acreditado.',
            videoEmbedUrl: sampleEmbeds[2],
            completada: false,
            recursos: [
              { nombre: 'Rubrica_Evaluacion_Final.pdf', tipo: 'pdf', enlace: '#' }
            ]
          }
        ]
      }
    ];

    this.leccionActual = this.modulos[0].lecciones[0];
  }

  private getStorageKey(): string {
    const cid = this.curso?.id || 'default';
    const uid = this.currentUser?.id || 'default';
    return `app_student_progress_${cid}_${uid}`;
  }

  private cargarProgresoGuardado(): void {
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      if (raw) {
        const completedIds: string[] = JSON.parse(raw);
        if (Array.isArray(completedIds)) {
          this.modulos.forEach(m => {
            m.lecciones.forEach(l => {
              l.completada = completedIds.includes(l.id);
            });
          });
        }
      }
    } catch (_) {}
  }

  private guardarProgresoLocal(): void {
    try {
      const completedIds: string[] = [];
      this.modulos.forEach(m => {
        m.lecciones.forEach(l => {
          if (l.completada) completedIds.push(l.id);
        });
      });
      localStorage.setItem(this.getStorageKey(), JSON.stringify(completedIds));
    } catch (_) {}
  }

  get totalLeccionesCount(): number {
    return this.modulos.reduce((acc, m) => acc + m.lecciones.length, 0);
  }

  get leccionesCompletadasCount(): number {
    return this.modulos.reduce((acc, m) => acc + m.lecciones.filter(l => l.completada).length, 0);
  }

  get progresoPorcentaje(): number {
    const total = this.totalLeccionesCount;
    if (total === 0) return 0;
    return Math.round((this.leccionesCompletadasCount / total) * 100);
  }

  contarLeccionesCompletadasEnModulo(mod: ModuloModel): number {
    return mod.lecciones.filter(l => l.completada).length;
  }

  toggleModulo(idx: number): void {
    this.openModuleIndex = this.openModuleIndex === idx ? -1 : idx;
  }

  seleccionarLeccion(lec: LeccionModel): void {
    this.leccionActual = lec;
    this.openModuleIndex = lec.moduloIndex;
    window.scrollTo({ top: 80, behavior: 'smooth' });
  }

  toggleCompletarLeccionActual(): void {
    if (!this.leccionActual) return;
    this.leccionActual.completada = !this.leccionActual.completada;
    this.guardarProgresoLocal();

    if (this.leccionActual.completada) {
      this.notifications.showToast(`¡Lección "${this.leccionActual.titulo}" completada!`, 'success');
      // Si completó la lección y no es la última, avanzar a la siguiente
      if (!this.esUltimaLeccion()) {
        setTimeout(() => this.irLeccionSiguiente(), 400);
      }
    }
    this.cdr.detectChanges();
  }

  todasLasLecciones(): LeccionModel[] {
    const arr: LeccionModel[] = [];
    this.modulos.forEach(m => arr.push(...m.lecciones));
    return arr;
  }

  esPrimeraLeccion(): boolean {
    const list = this.todasLasLecciones();
    return list.length === 0 || (list[0].id === this.leccionActual?.id);
  }

  esUltimaLeccion(): boolean {
    const list = this.todasLasLecciones();
    return list.length === 0 || (list[list.length - 1].id === this.leccionActual?.id);
  }

  irLeccionAnterior(): void {
    const list = this.todasLasLecciones();
    const idx = list.findIndex(l => l.id === this.leccionActual?.id);
    if (idx > 0) {
      this.seleccionarLeccion(list[idx - 1]);
    }
  }

  irLeccionSiguiente(): void {
    const list = this.todasLasLecciones();
    const idx = list.findIndex(l => l.id === this.leccionActual?.id);
    if (idx >= 0 && idx < list.length - 1) {
      this.seleccionarLeccion(list[idx + 1]);
    }
  }

  descargarRecurso(nombre: string): void {
    this.notifications.showToast(`Iniciando descarga de ${nombre}...`, 'info');
  }

  publicarPregunta(): void {
    const txtEl = document.getElementById('txt-nueva-pregunta') as HTMLTextAreaElement | null;
    const txt = txtEl ? txtEl.value.trim() : '';
    if (!txt) {
      this.notifications.showToast('Por favor escribe tu pregunta antes de enviar.', 'warning');
      return;
    }

    const autorNombre = this.currentUser ? `${this.currentUser.nombres} ${this.currentUser.apellidos || ''}`.trim() : 'Estudiante';
    const nueva: PreguntaForo = {
      id: 'p_' + Date.now(),
      autor: autorNombre,
      fecha: 'Hace un momento',
      pregunta: txt,
      respuesta: {
        docente: this.curso?.docente || 'Prof. Roberto Mendoza',
        fecha: 'En revisión',
        texto: '¡Excelente pregunta! El docente revisará tu consulta y te responderá en la brevedad posible.'
      }
    };

    this.listaPreguntas.unshift(nueva);
    if (txtEl) txtEl.value = '';
    this.notifications.showToast('Tu consulta fue enviada al docente con éxito.', 'success');
  }

  rendirEvaluacionFinal(): void {
    if (!this.curso || !this.currentUser) return;

    // Marcar todas las lecciones como completadas
    this.modulos.forEach(m => m.lecciones.forEach(l => l.completada = true));
    this.guardarProgresoLocal();

    // Registrar evaluación aprobada con nota 18
    this.notaFinal = 18;
    this.estaAprobado = true;
    this.pedidoService.guardarEvaluacionAcademica(this.curso.id, this.currentUser.id, true, this.notaFinal);

    this.mostrarModalFelicitacion = true;
    this.notifications.showToast('¡Felicitaciones! Has aprobado el curso con nota 18. Certificado desbloqueado.', 'success');
    this.cdr.detectChanges();
  }

  cerrarModalFelicitacion(): void {
    this.mostrarModalFelicitacion = false;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
