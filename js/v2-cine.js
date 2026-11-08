/* Food Tracking Perú · portada: movimiento cinemático con GSAP 3.12.5 + ScrollTrigger (copias locales en js/vendor).
   1) Pausa cinemática (#cine): el recorrido de la panificadora pasa de tarjeta a pantalla completa.
   2) Proyectos: cada imagen se abre al entrar y su contenido se desplaza con parallax.
   No toca la maqueta 3D del inicio ni los paneles de servicios. Con movimiento reducido, sin GSAP
   o sin JS no se anima nada: las imágenes quedan en su estado final y visibles. */
(function () {
  /* el video de la pausa usa data-auto: v2.js lo reproduce al verse y lo pausa al salir */
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  if (/[?&]poster\b/.test(location.search)) return;
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('cine-anim');

  var mm = gsap.matchMedia();
  mm.add({ wide: '(min-width: 768px)', narrow: '(max-width: 767px)' }, function (ctx) {
    var narrow = ctx.conditions.narrow;

    /* 1) pausa cinemática: de tarjeta redondeada a pantalla completa, con la imagen asentándose */
    var cine = document.getElementById('cine');
    if (cine) {
      var from = narrow ? 'inset(24% 6% 24% 6% round 22px)' : 'inset(20% 22% 20% 22% round 28px)';
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: cine, start: 'top top', end: 'bottom bottom', scrub: 0.8 } })
        .fromTo('.cine-frame', { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 }, 0)
        .fromTo('.cine-frame video', { scale: 1.28 }, { scale: 1, duration: 1 }, 0)
        .fromTo('.cine-copy > *', { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.08 }, 0.62);
    }

    /* 2) proyectos: la tarjeta se abre suavemente al entrar y la imagen se desplaza dentro */
    gsap.utils.toArray('#proyectos .media').forEach(function (m) {
      gsap.fromTo(m, { clipPath: narrow ? 'inset(5% 5% 5% 5% round 22px)' : 'inset(9% 9% 9% 9% round 22px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none',
          scrollTrigger: { trigger: m, start: 'top 98%', end: 'top 45%', scrub: 0.6 } });
      var inner = m.querySelectorAll(':scope > img, :scope > video');
      if (!inner.length || m.classList.contains('plan')) return;
      var amp = narrow ? 5 : 8;
      gsap.fromTo(inner, { yPercent: -amp, scale: 1.16 }, { yPercent: amp, scale: 1.16, ease: 'none',
        scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  /* la altura de la página cambia después de "load" (la maqueta 3D se arma tarde, fuentes, imágenes):
     cada vez que el alto del documento cambia, se recalculan las posiciones de los disparadores */
  var t, lastH = 0;
  function r() { ScrollTrigger.refresh(); }
  function onH() { var h = document.documentElement.scrollHeight; if (Math.abs(h - lastH) < 2) return; lastH = h; clearTimeout(t); t = setTimeout(r, 180); }
  if ('ResizeObserver' in window) new ResizeObserver(onH).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(r, 300); });
  addEventListener('load', function () { setTimeout(r, 200); });
})();
