/*
Author       : theme_ocean 
Template Name: Gestión de Cursos - Plataforma de Capacitación
Version      : 1.0
*/
(function($) {
	'use strict';
	
	/* Inmediatamente marcar como cargado */
	$('body').addClass('loaded');

	$(document).ready(function(){
		$('body').addClass('loaded');	
			
		/*START MENU JS*/				
		$('#main-menu').slicknav({
			label: '',
			duration: 1000,
			easingOpen: "easeOutBounce", //available with jQuery UI
			prependTo:'#mobile_menu',
			closeOnClick: true,
			easingClose:"swing", 
			easingOpen:"swing", 
			openedSymbol: "&#9660;",
			closedSymbol: "&#9658;" 	
		});
		
		if ($(window).scrollTop() > 200) {
              $('.fixed-top').addClass('menu-bg');
          } else {
              $('.fixed-top').removeClass('menu-bg');
          }
			$(window).on('scroll', function(){
				if ( $(window).scrollTop() > 70 ) {
					$('.site-navigation, .header-white, .header').addClass('navbar-fixed');
				} else {
					$('.site-navigation, .header-white, .header').removeClass('navbar-fixed');
				}
			});		  	
		/*END MENU JS*/
		
		/*START VIDEO JS*/
		$('.video-play').magnificPopup({
            type: 'iframe'
        });
		$('.co-video-play').magnificPopup({
            type: 'iframe'
        });
		if ($.fn.mixItUp) {
			$('.product_item').mixItUp();
		}
		/*END VIDEO JS*/	

		/* START VIDEO POPUP JS */
		$('.magnific_popup').magnificPopup({
		  disableOn: 700,
		  type: 'iframe',
		  mainClass: 'mfp-fade',
		  removalDelay: 160,
		  preloader: false,
		  fixedContentPos: false,
		  disableOn: 300
		});			

		/* PRODUCT IMAGE POPUP */
		$('.venobox').magnificPopup({
			type: 'image',
			closeOnContentClick: true,
			mainClass: 'mfp-img-mobile',
			image: {
				verticalFit: true
			}
		});

		/* PRODUCT SIZE & COLOR SELECTORS */
		$('.pd_img_size a').on('click', function(e) {
			e.preventDefault();
			$('.pd_img_size a').removeClass('active');
			$(this).addClass('active');
		});

		$('.pd_clr a').on('click', function(e) {
			e.preventDefault();
			$('.pd_clr a').removeClass('active');
			$(this).addClass('active');
		});

		/*START PARTNER LOGO*/
		$('.partner').owlCarousel({
		  autoPlay: 3000, //Set AutoPlay to 3 seconds
		  items : 5,
		  itemsDesktop : [1199,3],
		  itemsDesktopSmall : [979,3]
		});
		/*END PARTNER LOGO*/		

		/*START TESTIMONIAL JS*/	
		$("#testimonial-slider").owlCarousel({
		   items:3,
			itemsDesktop:[1000,3],
			itemsDesktopSmall:[980,2],
			itemsTablet:[768,2],
			itemsMobile:[650,1],
			pagination:true,
			navigation:true,
			navigationText:["",""],
			slideSpeed:1000,
			autoPlay:false
		});
		/*END TESTIMONIAL JS*/

		/* START EVENT JS */
		 $("#event-slider").owlCarousel({
			items:3,
			itemsDesktop:[1199,3],
			itemsDesktopSmall:[979,2],
			itemsTablet:[768,2],
			itemsMobile:[600,1],
			pagination: false,
			navigation:true,
			navigationText:["",""],
			slideSpeed:1000,
			autoPlay:false
		});
		/* END EVENT JS */		
			
	}); 		
	
	/*START RANGE SLIDER*/
	    var rangeSlider = function(){
        var slider = $('.range-slider'),
            range = $('.range-slider input[type="range"]'),
            value = $('.range-value');
        slider.each(function(){
            value.each(function(){
                var value = $(this).prev().attr('value');
                $(this).html(value);
            });
            range.on('input', function(){
                $(this).next(value).html(this.value);
            });
        });
    };
    rangeSlider();
	/*END RANGE SLIDER*/
	
	/*INITIATE PURE COUNTER*/
	if (typeof PureCounter !== 'undefined') {
		try { new PureCounter(); } catch (e) { console.warn('PureCounter init error:', e); }
	}

	/*START WOW ANIMATION JS*/
	if (typeof WOW !== 'undefined') {
		try { new WOW().init(); } catch (e) { console.warn('WOW init error:', e); }
	}
	/*END WOW ANIMATION JS*/	
			
})(jQuery);


  

