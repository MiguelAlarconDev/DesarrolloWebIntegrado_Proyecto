/*
Author       : theme_ocean 
Template Name: Gestión de Cursos - Plataforma de Capacitación
Version      : 2.0 (Optimizado)
*/
(function($) {
	'use strict';

	$('body').addClass('loaded');

	$(document).ready(function() {
		$('body').addClass('loaded');

		/* START MENU JS */
		if ($.fn.slicknav && $('#main-menu').length) {
			$('#main-menu').slicknav({
				label: '',
				duration: 500,
				prependTo: '#mobile_menu',
				closeOnClick: true,
				openedSymbol: "&#9660;",
				closedSymbol: "&#9658;"
			});
		}

		/* NAVBAR SCROLL BACKGROUND */
		var updateNavbarBg = function() {
			if ($(window).scrollTop() > 100) {
				$('.site-navigation, .fixed-top').addClass('menu-bg navbar-fixed');
			} else {
				$('.site-navigation, .fixed-top').removeClass('menu-bg navbar-fixed');
			}
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
