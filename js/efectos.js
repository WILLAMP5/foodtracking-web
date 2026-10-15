/* Movimiento: titular animado, reveal por scroll, tilt 3D en tarjetas, barra de progreso, carga diferida del hero 3D. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* barra de progreso de lectura */
  var bar = document.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
  var tick = false;
  function prog() { tick = false; var h = root.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(scrollY / h, 1) : 0) + ')'; }
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(prog); } }, { passive: true }); prog();

  if (reduce) return;
  root.classList.add('fx');

  /* titular: cada palabra sube con retraso escalonado (el texto sigue siendo legible por lectores de pantalla) */
  var h1 = document.querySelector('.hero h1');
  if (h1) {
    var i = 0;
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            var o = document.createElement('span'); o.className = 'w'; var s = document.createElement('span'); s.textContent = w; s.style.animationDelay = (0.15 + i++ * 0.07) + 's'; o.appendChild(s); frag.appendChild(o);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) split(n);
      });
    })(h1);
  }

  /* títulos de sección y bloques: reveal */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.15 });
    document.querySelectorAll('.sec-head,.metrics .m-grid > *,.band .wrap > *').forEach(function (el, k) { el.classList.add('rv'); el.style.transitionDelay = (k % 5) * 60 + 'ms'; io.observe(el); });
  }

  /* tilt 3D con el puntero en tarjetas (solo ratón) */
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = 'perspective(800px) rotateY(' + x * 9 + 'deg) rotateX(' + -y * 9 + 'deg) translateY(-5px)';
        c.style.setProperty('--mx', (x + 0.5) * 100 + '%'); c.style.setProperty('--my', (y + 0.5) * 100 + '%');
      });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    });
  }

  /* hero 3D: solo si hay WebGL, tras la carga y sin bloquear nada */
  function webgl() { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  if (document.querySelector('.hero-art') && webgl()) {
    var go = function () { import('./hero3d.js').catch(function () {}); };
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2000 }); else setTimeout(go, 800);
  }
})();
