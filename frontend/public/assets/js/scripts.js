/*
Author       : theme_ocean 
Template Name: Gestión de Cursos - Plataforma de Capacitación
Version      : 2.1 (Menu Limpio y Normalizado)
*/
(function($) {
	'use strict';

	$('body').addClass('loaded');

	$(document).ready(function() {
		$('body').addClass('loaded');

		/* START MENU JS - Limpio, normal y sin flechas rotas */
		if ($.fn.slicknav && $('#main-menu').length) {
			$('#main-menu').slicknav({
				label: '',
				duration: 250,
				prependTo: '#mobile_menu',
				closeOnClick: true,
				openedSymbol: '',
				closedSymbol: ''
			});
		}

		/* NAVBAR SCROLL - Transicion normal y suave sin parpadeos ni fadeInDown */
		var updateNavbarBg = function() {
			var isScrolled = $(window).scrollTop() > 20;
			$('#navigation, .site-navigation').toggleClass('navbar-scrolled', isScrolled);
		};

		updateNavbarBg();
		$(window).on('scroll', updateNavbarBg);

		/* POPUP VIDEO (si existe) */
		if ($.fn.magnificPopup && $('.magnific_popup').length) {
			$('.magnific_popup').magnificPopup({
				disableOn: 700,
				type: 'iframe',
				mainClass: 'mfp-fade',
				removalDelay: 160,
				preloader: false,
				fixedContentPos: false
			});
		}

		/* INITIATE PURE COUNTER */
		if (typeof PureCounter !== 'undefined') {
			try { new PureCounter(); } catch (_) {}
		}

		/* START WOW ANIMATION JS */
		if (typeof WOW !== 'undefined') {
			try { new WOW().init(); } catch (_) {}
		}
	});

})(jQuery);
