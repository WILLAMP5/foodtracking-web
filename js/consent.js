/* Analítica con permiso: Metricool solo se carga si el visitante la acepta.
   La decisión se guarda en este navegador (localStorage, clave "ft-analitica": "si" o "no"). */
(function () {
  var KEY = 'ft-analitica';
  var HASH = '931da99e850e4b4b1ff02c28d5899ec3';

  function leer() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function borrar() { try { localStorage.removeItem(KEY); } catch (e) {} }

  function cargarMetricool() {
    if (window.__ftAnalitica) return;
    window.__ftAnalitica = true;
    var s = document.createElement('script');
    s.src = 'https://tracker.metricool.com/resources/be.js';
    s.onload = function () { try { window.beTracker.t({ hash: HASH }); } catch (e) {} };
    document.head.appendChild(s);
  }

  function estilos() {
    if (document.getElementById('ft-cons-css')) return;
    var st = document.createElement('style');
    st.id = 'ft-cons-css';
    st.textContent =
      '#ft-cons{position:fixed;left:16px;bottom:16px;z-index:9999;max-width:440px;padding:16px 18px;border-radius:14px;' +
      'background:#0d1b2e;color:#eef3f9;border:1px solid rgba(255,255,255,.18);box-shadow:0 20px 50px -20px rgba(0,0,0,.7);' +
      'font:400 14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}' +
      '#ft-cons p{margin:0 0 12px}#ft-cons a{color:#8fd0ff}' +
      '#ft-cons .b{display:flex;gap:10px;flex-wrap:wrap}' +
      '#ft-cons button{min-height:44px;padding:0 18px;border-radius:999px;border:1px solid rgba(255,255,255,.35);' +
      'background:transparent;color:inherit;font:600 14px system-ui,sans-serif;cursor:pointer}' +
      '#ft-cons button.ok{background:#fff;color:#08111f;border-color:#fff}' +
      '#ft-cons button:focus-visible{outline:2px solid #8fd0ff;outline-offset:3px}' +
      '@media (max-width:560px){#ft-cons{right:16px;bottom:84px;max-width:none}}';
    document.head.appendChild(st);
  }

  function cerrar() { var b = document.getElementById('ft-cons'); if (b) b.remove(); }

  function mostrar() {
    if (document.getElementById('ft-cons')) return;
    estilos();
    var d = document.createElement('div');
    d.id = 'ft-cons';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Preferencias de analítica');
    d.innerHTML =
      '<p>Usamos una herramienta de analítica (Metricool) para saber qué páginas se visitan. ' +
      'Solo se activa si la aceptas. <a href="' + base() + 'privacidad.html">Política de privacidad</a>.</p>' +
      '<div class="b"><button type="button" class="ok" data-v="si">Aceptar</button>' +
      '<button type="button" data-v="no">Rechazar</button></div>';
    d.addEventListener('click', function (e) {
      var v = e.target && e.target.getAttribute && e.target.getAttribute('data-v');
      if (!v) return;
      guardar(v);
      if (v === 'si') cargarMetricool();
      cerrar();
      estado();
    });
    document.body.appendChild(d);
  }

  function base() { return /\/(guias|servicios|zasscan)\//.test(location.pathname) ? '../' : ''; }

  function estado() {
    var el = document.getElementById('cons-state');
    if (!el) return;
    var v = leer();
    el.textContent = v === 'si' ? 'Ahora: aceptada.' : v === 'no' ? 'Ahora: rechazada.' : 'Ahora: sin elegir.';
  }

  function iniciar() {
    var v = leer();
    if (v === 'si') cargarMetricool();
    else if (v === null) mostrar();
    var r = document.getElementById('cons-reset');
    if (r) r.addEventListener('click', function () { borrar(); estado(); mostrar(); });
    estado();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
