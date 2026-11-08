/* Food Tracking Perú · portada: movimiento cinemático con GSAP 3.12.5 + ScrollTrigger (copias locales en js/vendor).
   1) Pausa cinemática (#cine): el recorrido de la panificadora pasa de tarjeta a pantalla completa
      y el titular entra palabra por palabra.
   2) Proyectos: cada imagen se abre al entrar y su contenido se desplaza con parallax.
   3) Ingeniería: el video se desplaza dentro de su marco (parallax).
   4) Registros digitales: las filas de la tablet se "llenan" una tras otra.
   No toca la maqueta 3D del inicio ni los paneles de servicios. Con movimiento reducido, sin GSAP
   o sin JS no se anima nada: todo queda en su estado final y visible. */
(function () {
  /* el video de la pausa usa data-auto: v2.js lo reproduce al verse y lo pausa al salir */
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  if (/[?&]poster\b/.test(location.search)) return;
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('cine-anim');

  /* parte un titular en palabras sin perder el <em>; el texto sigue siendo texto normal para lectores de pantalla */
  function splitWords(el) {
    if (!el || el.dataset.words) return [];
    el.dataset.words = '1';
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span'); s.className = 'cw'; s.textContent = part;
            frag.appendChild(s); out.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
    return out;
  }
  var cineWords = splitWords(document.querySelector('.cine-copy h2'));

  /* el video de la pausa empieza a cargar una pantalla antes de llegar */
  var cine = document.getElementById('cine');
  var cineVid = cine && cine.querySelector('video');
  if (cineVid) ScrollTrigger.create({ trigger: cine, start: 'top 200%', once: true, onEnter: function () { cineVid.preload = 'auto'; } });

  var mm = gsap.matchMedia();
  mm.add({ wide: '(min-width: 768px)', narrow: '(max-width: 767px)' }, function (ctx) {
    var narrow = ctx.conditions.narrow;

    /* 1) pausa cinemática: de tarjeta redondeada a pantalla completa, con la imagen asentándose */
    if (cine) {
      var from = narrow ? 'inset(16% 7% 16% 7% round 22px)' : 'inset(20% 22% 20% 22% round 28px)';
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: cine, start: 'top top', end: 'bottom bottom', scrub: 0.8 } })
        .fromTo('.cine-frame', { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 }, 0)
        .fromTo('.cine-frame video', { scale: 1.28 }, { scale: 1, duration: 1 }, 0)
        .fromTo('.cine-copy .eyebrow', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.18 }, 0.58)
        .fromTo(cineWords, { autoAlpha: 0, yPercent: 60, rotate: 2 }, { autoAlpha: 1, yPercent: 0, rotate: 0, duration: 0.22, stagger: 0.025 }, 0.62)
        .fromTo('.cine-copy p', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 0.84)
        .to({}, { duration: 0.3 }); /* pausa final: marco abierto y texto completo antes de soltar la sección */
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

    /* 3) ingeniería: profundidad entre el video y la tarjeta de resultados */
    var stage = document.querySelector('#ingenieria .stage');
    if (stage) {
      var st = { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true };
      gsap.fromTo('#ingenieria .screen > video', { yPercent: -6, scale: 1.14 }, { yPercent: 6, scale: 1.14, ease: 'none', scrollTrigger: st });
      /* la tarjeta de resultados no se mueve: va debajo del video, pegada al borde del panel, y cualquier
         desplazamiento la tapaba o la recortaba en anchos de tablet */
    }

    /* 4) registros digitales: las filas aparecen como si se llenaran en planta */
    var rows = gsap.utils.toArray('#digital .device tbody tr');
    if (rows.length) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: '#digital .device', start: 'top 72%', once: true } });
      tl.from(rows, { autoAlpha: 0, x: -18, duration: 0.5, ease: 'power3.out', stagger: 0.28 }, 0.35)
        .from('#digital .device .st', { scale: 0.6, autoAlpha: 0, duration: 0.4, ease: 'back.out(2)', stagger: 0.28 }, 0.55)
        .from('#digital .device .sign', { autoAlpha: 0, x: 12, duration: 0.5, ease: 'power2.out' }, '>-0.1')
        .from('#digital .device .note', { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power2.out' }, '>-0.2');
    }
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
