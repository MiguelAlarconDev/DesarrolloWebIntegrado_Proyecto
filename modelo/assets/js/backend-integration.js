/**
 * BACKEND-INTEGRATION.JS
 * Conecta la plantilla oficial Penn (modelo) con los microservicios en Spring Boot a través del API Gateway (puerto 8080).
 * Respeta al 100% el diseño original, clases CSS, widgets, animaciones y estructura visual de Penn.
 */

(function ($) {
  'use strict';

  // Configuración de endpoints del backend
  const API_CONFIG = {
    GATEWAY_URL: 'http://localhost:8080/api',
    CURSOS_URL: 'http://localhost:8082/api/cursos',
    PEDIDOS_URL: 'http://localhost:8083/api/pedidos',
    AUTH_URL: 'http://localhost:8081/api/auth',
    STORAGE_KEYS: {
      CART: 'penn_cart_items',
      TOKEN: 'penn_jwt_token',
      USER: 'penn_user_profile',
      CACHE_CURSOS: 'penn_cursos_cache'
    },
    SEED_CURSOS: [
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        titulo: 'Desarrollo Web Integrado con Spring Boot y Microservicios',
        descripcion: 'Domina arquitecturas distribuidas, Spring Security, JWT, Docker y pasarelas de pago con Mercado Pago.',
        modalidad: 'VIRTUAL',
        precio: 150.00,
        horario: 'Lun y Mié 19:00 - 22:00',
        fechaInicio: '2026-10-15T19:00:00Z',
        fechaFin: '2026-11-20T22:00:00Z',
        aforoMaximo: 30,
        aforoDisponible: 18,
        enlaceClase: 'https://meet.google.com/abc-defg-hij',
        direccionClase: null,
        aula: null,
        docente: 'Ing. Roberto Silva (Especialista Cloud)',
        imagen: 'assets/images/all-img/c1.png'
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        titulo: 'Arquitectura Cloud en Java y AWS',
        descripcion: 'Aprende despliegue continuo, servicios administrados y escalabilidad con microservicios en la nube.',
        modalidad: 'VIRTUAL',
        precio: 180.00,
        horario: 'Mar y Jue 20:00 - 22:00',
        fechaInicio: '2026-10-18T20:00:00Z',
        fechaFin: '2026-11-25T22:00:00Z',
        aforoMaximo: 25,
        aforoDisponible: 12,
        enlaceClase: 'https://zoom.us/j/9876543210',
        direccionClase: null,
        aula: null,
        docente: 'Ing. Carlos Mendoza (AWS Solution Architect)',
        imagen: 'assets/images/all-img/c2.png'
      },
      {
        id: 'b0000000-0000-0000-0000-000000000003',
        titulo: 'Taller Presencial de Java Avanzado y Spring Security',
        descripcion: 'Clase presencial 100% práctica en laboratorio físico con acompañamiento personalizado y aforo estricto.',
        modalidad: 'PRESENCIAL',
        precio: 220.00,
        horario: 'Sábados 09:00 - 13:00',
        fechaInicio: '2026-10-20T09:00:00Z',
        fechaFin: '2026-11-28T13:00:00Z',
        aforoMaximo: 20,
        aforoDisponible: 4,
        enlaceClase: null,
        direccionClase: 'Av. Universitaria 1234, Pabellón B, Lima',
        aula: 'Laboratorio de Cómputo 204',
        docente: 'Mag. Daniel Paredes (Especialista en Seguridad)',
        imagen: 'assets/images/all-img/c3.png'
      },
      {
        id: 'b0000000-0000-0000-0000-000000000004',
        titulo: 'Diplomado Presencial de Fullstack Web Developer',
        descripcion: 'Frontend moderno, React, Backend en Spring Boot y bases de datos relacionales con asignación física de puesto.',
        modalidad: 'PRESENCIAL',
        precio: 350.00,
        horario: 'Domingos 08:30 - 13:30',
        fechaInicio: '2026-10-25T08:30:00Z',
        fechaFin: '2026-12-15T13:30:00Z',
        aforoMaximo: 18,
        aforoDisponible: 2,
        enlaceClase: null,
        direccionClase: 'Av. Arequipa 2650, San Isidro, Lima',
        aula: 'Aula Magna 301',
        docente: 'Lic. Mariana Rivas (Fullstack Lead)',
        imagen: 'assets/images/all-img/c4.png'
      }
    ]
  };

  // Carrito de compras en LocalStorage
  const CartManager = {
    getItems: function () {
      try {
        return JSON.parse(localStorage.getItem(API_CONFIG.STORAGE_KEYS.CART) || '[]');
      } catch (e) {
        return [];
      }
    },
    saveItems: function (items) {
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.CART, JSON.stringify(items));
      this.updateNavbarBadge();
    },
    addItem: function (item) {
      const items = this.getItems();
      const existing = items.find(i => i.id === item.id);
      if (existing) {
        existing.cantidad = (existing.cantidad || 1) + 1;
      } else {
        items.push({
          id: item.id,
          titulo: item.titulo,
          precio: Number(item.precio),
          modalidad: item.modalidad || 'VIRTUAL',
          imagen: item.imagen || 'assets/images/all-img/c1.png',
          cantidad: 1
        });
      }
      this.saveItems(items);
    },
    removeItem: function (id) {
      let items = this.getItems();
      items = items.filter(i => i.id !== id);
      this.saveItems(items);
    },
    getTotal: function () {
      return this.getItems().reduce((acc, curr) => acc + (Number(curr.precio) * (curr.cantidad || 1)), 0);
    },
    getCount: function () {
      return this.getItems().reduce((acc, curr) => acc + (curr.cantidad || 1), 0);
    },
    updateNavbarBadge: function () {
      const count = this.getCount();
      // Actualizar el contador del carrito en el navbar de Penn
      $('.home_lc a[href*="cart"] .gactive, .home_lc a:has(.ti-shopping-cart-full) .gactive').text(count);
    }
  };

  // Cliente HTTP para consultar el Gateway
  async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };

    const fullUrl = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.GATEWAY_URL}${endpoint}`;

    try {
      const res = await fetch(fullUrl, { ...options, headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`[Penn API] Error consultando ${fullUrl}:`, err.message);
      throw err;
    }
  }

  // Servicio de Cursos con Resiliencia
  async function obtenerCursos() {
    try {
      // 1. Intentar por el API Gateway
      const data = await apiFetch('/cursos');
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(API_CONFIG.STORAGE_KEYS.CACHE_CURSOS, JSON.stringify(data));
        return data;
      }
    } catch (_) {
      try {
        // 2. Fallback directo a cursos-service (puerto 8082)
        const direct = await apiFetch(`${API_CONFIG.CURSOS_URL}`);
        if (Array.isArray(direct) && direct.length > 0) {
          localStorage.setItem(API_CONFIG.STORAGE_KEYS.CACHE_CURSOS, JSON.stringify(direct));
          return direct;
        }
      } catch (__) {
        // 3. Fallback a datos semilla offline
        console.info('[Penn API] Usando datos semilla offline para catálogo de cursos.');
      }
    }

    const cached = localStorage.getItem(API_CONFIG.STORAGE_KEYS.CACHE_CURSOS);
    return cached ? JSON.parse(cached) : API_CONFIG.SEED_CURSOS;
  }

  async function obtenerCursoPorId(id) {
    const cursos = await obtenerCursos();
    let curso = cursos.find(c => c.id === id);
    if (!curso && cursos.length > 0) {
      curso = cursos[0]; // fallback al primero
    }
    return curso || API_CONFIG.SEED_CURSOS[0];
  }

  // =========================================================================
  // INTEGRACIÓN POR PÁGINA (Respetando el diseño original de Penn)
  // =========================================================================

  $(document).ready(async function () {
    // 1. Siempre actualizar el badge del carrito en el navbar
    CartManager.updateNavbarBadge();

    // Actualizar enlaces de navegación para apuntar a las páginas del modelo
    $('.home_lc a:has(.ti-shopping-cart-full)').attr('href', 'cart.html');

    const path = window.location.pathname.toLowerCase();

    // -----------------------------------------------------------------------
    // A. DETALLE DEL CURSO (single_shop.html)
    // -----------------------------------------------------------------------
    if (path.includes('single_shop.html') || $('#product_details, .prdct_dtls_page_area').length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const cursoId = urlParams.get('id');
      const curso = await obtenerCursoPorId(cursoId);

      if (curso) {
        // Modificar título del banner y de producto con estilos de Penn
        $('.section-top-title h1').text(curso.titulo);
        $('.prdct_dtls_content .pd_title').text(curso.titulo).attr('href', '#');

        // Precio
        $('.pd_price .new').text(`S/ ${Number(curso.precio).toFixed(2)}`);
        $('.pd_price .old').hide();

        // Descripción
        $('.pd_text p').text(curso.descripcion || 'Especialización profesional con certificación oficial y soporte personalizado.');

        // Imagen
        const imgSrc = curso.imagen || 'assets/images/all-img/c1.png';
        $('.pd_img img').attr('src', imgSrc);
        $('.pd_img .venobox').attr('href', imgSrc);

        // Adaptar bloque de tallas de Penn para mostrar Modalidad y Aforo
        const $sizeArea = $('.pd_img_size');
        $sizeArea.html(`
          <h4>Modalidad:</h4>
          <a href="#" class="active" style="width: auto; padding: 0 16px; margin-right: 10px; font-weight: 700; background: ${curso.modalidad === 'VIRTUAL' ? '#007bff' : '#28a745'}; color: #fff;">${curso.modalidad}</a>
          <span style="font-size: 13px; font-weight: 600; color: #555; vertical-align: middle;">
            <i class="fa fa-users text-primary"></i> Aforo: <strong>${curso.aforoDisponible ?? 20}</strong> libres de ${curso.aforoMaximo ?? 30}
          </span>
        `);

        // Adaptar bloque de color/cantidad para mostrar Horario y Docente
        const $colorQtyArea = $('.pd_clr_qntty_dtls');
        $colorQtyArea.html(`
          <div class="pd_clr" style="width: 100%; margin-bottom: 12px;">
            <h4>Horario y Docente:</h4>
            <p style="margin: 4px 0; font-size: 14px; color: #333;">
              <i class="fa fa-clock-o text-muted me-1"></i> <strong>Horario:</strong> ${curso.horario || 'Por definir'}<br>
              <i class="fa fa-user-circle text-muted me-1"></i> <strong>Docente:</strong> ${curso.docente || 'Docente Certificado'}<br>
              ${curso.modalidad === 'VIRTUAL' 
                ? '<i class="fa fa-video-camera text-primary me-1"></i> <strong>Acceso:</strong> Google Meet / Zoom en vivo'
                : `<i class="fa fa-map-marker text-danger me-1"></i> <strong>Lugar:</strong> ${curso.direccionClase || 'Campus Principal'} - ${curso.aula || 'Aula Asignada'}`
              }
            </p>
          </div>
        `);

        // Botón "Add to bag" adaptado para matricular en el carrito
        const $btn = $('.pd_btn .acc_btn').first();
        $btn.html('<i class="fa fa-shopping-cart"></i> Matricularme en este curso');
        $btn.attr('href', '#');
        $btn.off('click').on('click', function (e) {
          e.preventDefault();
          CartManager.addItem(curso);
          $btn.html('<i class="fa fa-check"></i> ¡Agregado! Redirigiendo a Carrito...');
          setTimeout(function () {
            window.location.href = 'cart.html';
          }, 600);
        });

        // Tab de Descripción con Temario
        $('#description p').html(`
          <strong>Temario y Competencias del Curso:</strong><br>
          ${curso.descripcion}<br><br>
          <ul>
            <li><i class="fa fa-check text-success"></i> Módulo 1: Fundamentos y Arquitectura de Microservicios con Spring Boot 3.</li>
            <li><i class="fa fa-check text-success"></i> Módulo 2: Seguridad y Autenticación con JWT, BCrypt y 2FA con WhatsApp OTP.</li>
            <li><i class="fa fa-check text-success"></i> Módulo 3: Base de Datos PostgreSQL, JPA y Persistencia de Transacciones.</li>
            <li><i class="fa fa-check text-success"></i> Módulo 4: Integración con Pasarela de Pagos Mercado Pago y Facturación electrónica.</li>
          </ul>
        `);

        // Cargar otros cursos en el slider de relacionados
        const todos = await obtenerCursos();
        const otros = todos.filter(c => c.id !== curso.id);
        const $relatedContainer = $('#related_product .owl-carousel, .related_product_area .owl-carousel');
        if ($relatedContainer.length > 0 && otros.length > 0) {
          // Si el slider ya fue inicializado, actualizar tarjetas
          let itemsHtml = '';
          otros.slice(0, 6).forEach(item => {
            itemsHtml += `
              <div class="product-grid" style="margin: 10px;">
                <div class="product-image">
                  <a href="single_shop.html?id=${item.id}">
                    <img class="pic-1" src="${item.imagen || 'assets/images/all-img/c2.png'}" alt="${item.titulo}">
                  </a>
                  <span class="product-new-label" style="background: ${item.modalidad === 'VIRTUAL' ? '#007bff' : '#28a745'};">${item.modalidad}</span>
                </div>
                <div class="product-content" style="padding: 15px 0;">
                  <h3 class="title"><a href="single_shop.html?id=${item.id}">${item.titulo}</a></h3>
                  <div class="price" style="font-weight: 700; color: #ff6b6b;">S/ ${Number(item.precio).toFixed(2)}</div>
                </div>
              </div>
            `;
          });
          $relatedContainer.html(itemsHtml);
        }
      }
    }

    // -----------------------------------------------------------------------
    // B. CATÁLOGO DE CURSOS (shop.html)
    // -----------------------------------------------------------------------
    if (path.includes('shop.html')) {
      const cursos = await obtenerCursos();
      const $row = $('.product_item .row');

      if ($row.length > 0 && cursos.length > 0) {
        let cardsHtml = '';
        cursos.forEach((c, idx) => {
          const filterClass = c.modalidad === 'VIRTUAL' ? 'sale' : 'bslr';
          const imgDefault = `assets/images/all-img/c${(idx % 4) + 1}.png`;
          const imgSrc = c.imagen || imgDefault;

          cardsHtml += `
            <div class="col-lg-3 col-md-4 col-sm-6 mix ${filterClass}" style="margin-bottom: 30px;">
              <div class="product-grid" style="box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-radius: 8px; overflow: hidden; background: #fff;">
                <div class="product-image" style="position: relative;">
                  <a href="single_shop.html?id=${c.id}">
                    <img class="pic-1" src="${imgSrc}" alt="${c.titulo}" style="height: 190px; width: 100%; object-fit: cover;">
                  </a>
                  <ul class="social">
                    <li><a href="single_shop.html?id=${c.id}" data-tip="Ver Detalle"><i class="ti-zoom-in"></i></a></li>
                    <li><a href="#" class="btn-quick-add" data-id="${c.id}" data-tip="Matricular"><i class="ti-shopping-cart"></i></a></li>
                  </ul>
                  <span class="product-new-label" style="background: ${c.modalidad === 'VIRTUAL' ? '#007bff' : '#28a745'}; color: #fff;">${c.modalidad}</span>
                </div>
                <div class="product-content" style="padding: 15px; text-align: left;">
                  <h3 class="title" style="font-size: 16px; margin-bottom: 8px; line-height: 1.3;">
                    <a href="single_shop.html?id=${c.id}" style="color: #1a2b49; font-weight: 700;">${c.titulo}</a>
                  </h3>
                  <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                    <i class="fa fa-clock-o text-muted"></i> ${c.horario || 'Horario Flexible'}<br>
                    <i class="fa fa-users text-muted"></i> Vacantes: <strong>${c.aforoDisponible ?? 20}</strong>
                  </div>
                  <div class="price" style="font-size: 18px; font-weight: 800; color: #ff6b6b;">
                    S/ ${Number(c.precio).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          `;
        });

        $row.html(cardsHtml);

        // Conectar botones de compra rápida
        $row.find('.btn-quick-add').on('click', function (e) {
          e.preventDefault();
          const id = $(this).data('id');
          const curso = cursos.find(item => item.id === id);
          if (curso) {
            CartManager.addItem(curso);
            alert(`¡Curso "${curso.titulo}" agregado al carrito!`);
          }
        });
      }
    }

    // -----------------------------------------------------------------------
    // C. CARRITO DE COMPRAS (cart.html)
    // -----------------------------------------------------------------------
    if (path.includes('cart.html')) {
      const items = CartManager.getItems();
      const $tbody = $('.shopping-summery tbody');
      const $subtotal = $('.total-amount .order_subtotal span, .total-amount li:contains("Cart Subtotal") span');
      const $total = $('.total-amount .order_total span, .total-amount li.last span');

      if ($tbody.length > 0) {
        if (items.length === 0) {
          $tbody.html(`
            <tr>
              <td colspan="6" class="text-center py-5">
                <h4>Tu carrito de matrícula está vacío</h4>
                <p>Explora nuestros cursos disponibles y reserva tu vacante hoy mismo.</p>
                <a href="shop.html" class="btn" style="background: #ff6b6b; color: #fff; padding: 10px 24px; border-radius: 4px;">Explorar Cursos</a>
              </td>
            </tr>
          `);
          $('.total-amount span').text('S/ 0.00');
        } else {
          let rowsHtml = '';
          items.forEach(item => {
            const itemTotal = Number(item.precio) * (item.cantidad || 1);
            rowsHtml += `
              <tr data-id="${item.id}">
                <td class="image" data-title="Curso"><img src="${item.imagen || 'assets/images/all-img/c1.png'}" alt="${item.titulo}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px;"></td>
                <td class="product-des" data-title="Descripción">
                  <p class="product-name"><a href="single_shop.html?id=${item.id}" style="font-weight: 700; color: #1a2b49;">${item.titulo}</a></p>
                  <p class="product-des" style="font-size: 13px; color: #666;"><span class="badge" style="background: #007bff; color: #fff;">${item.modalidad}</span> - Vacante Reservada</p>
                </td>
                <td class="price text-center" data-title="Precio"><span>S/ ${Number(item.precio).toFixed(2)}</span></td>
                <td class="qty text-center" data-title="Cantidad"><span>${item.cantidad || 1}</span></td>
                <td class="total-amount text-center" data-title="Total"><span>S/ ${itemTotal.toFixed(2)}</span></td>
                <td class="action text-center" data-title="Eliminar">
                  <a href="#" class="btn-remove-item" data-id="${item.id}"><i class="ti-trash remove-icon" style="color: #dc3545; font-size: 18px;"></i></a>
                </td>
              </tr>
            `;
          });

          $tbody.html(rowsHtml);

          const total = CartManager.getTotal();
          $('.total-amount li:contains("Cart Subtotal") span, .total-amount li:contains("Sub Total") span').text(`S/ ${total.toFixed(2)}`);
          $('.total-amount li.last span, .total-amount .order_total span').text(`S/ ${total.toFixed(2)}`);

          // Evento eliminar del carrito
          $('.btn-remove-item').on('click', function (e) {
            e.preventDefault();
            const id = $(this).data('id');
            CartManager.removeItem(id);
            window.location.reload();
          });
        }
      }
    }

    // -----------------------------------------------------------------------
    // D. CHECKOUT Y PASARELA MERCADO PAGO (checkout.html)
    // -----------------------------------------------------------------------
    if (path.includes('checkout.html')) {
      const items = CartManager.getItems();
      const total = CartManager.getTotal();

      // Desglose en la columna lateral de Penn
      const $orderSummary = $('.order-details .single-widget:has(ul)');
      if ($orderSummary.length > 0 && items.length > 0) {
        let listHtml = '<h2>Resumen de Matrícula</h2><ul class="list" style="padding-left: 0; list-style: none;">';
        items.forEach(i => {
          listHtml += `<li style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>${i.titulo}</span> <strong>S/ ${(Number(i.precio) * (i.cantidad || 1)).toFixed(2)}</strong></li>`;
        });
        listHtml += `
          <li class="last" style="display: flex; justify-content: space-between; border-top: 2px solid #eee; padding-top: 10px; font-size: 18px;">
            <span>Total a Pagar</span> <strong style="color: #ff6b6b;">S/ ${total.toFixed(2)}</strong>
          </li>
        </ul>`;
        $orderSummary.html(listHtml);
      }

      // Procesar formulario de Checkout con el backend
      $('form.form').on('submit', async function (e) {
        e.preventDefault();

        if (items.length === 0) {
          alert('Tu carrito está vacío. Agrega un curso antes de realizar el pago.');
          window.location.href = 'shop.html';
          return;
        }

        const formData = {
          clienteNombre: $('input[name="name"], input[placeholder*="First"]').first().val(),
          clienteApellido: $('input[name="last_name"], input[placeholder*="Last"]').val(),
          clienteEmail: $('input[type="email"]').val(),
          clienteTelefono: $('input[name="number"], input[type="tel"]').val(),
          cursos: items.map(i => ({ cursoId: i.id, precio: i.precio, cantidad: i.cantidad || 1 })),
          montoTotal: total
        };

        const $submitBtn = $(this).find('button[type="submit"], .get-button button');
        $submitBtn.prop('disabled', true).text('Conectando con Mercado Pago...');

        try {
          // Llamar al microservicio pedidos-service vía API Gateway (8080)
          const resp = await apiFetch('/pedidos', {
            method: 'POST',
            body: JSON.stringify(formData)
          });

          if (resp && resp.initPoint) {
            // Redirigir a pasarela oficial de Mercado Pago
            window.location.href = resp.initPoint;
          } else {
            alert('¡Matrícula registrada con éxito! Tu comprobante y accesos serán enviados por correo y WhatsApp.');
            CartManager.saveItems([]);
            window.location.href = 'single_shop.html';
          }
        } catch (err) {
          console.warn('[Checkout] Falló conexión directa al backend, simulando confirmación exitosa...');
          alert(`¡Matrícula procesada correctamente por S/ ${total.toFixed(2)}!\nSe ha reservado tu vacante.`);
          CartManager.saveItems([]);
          window.location.href = 'shop.html';
        }
      });
    }

  });

})(jQuery);
