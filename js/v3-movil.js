/* Food Tracking Perú · v3 móvil (método Lusion + mobile-native)
   Todo lo que añade es progresivo: sin JS o en escritorio la web queda igual que antes. */
(() => {
  'use strict';
  const $ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const mq = matchMedia('(max-width:860px)');
  const root = document.documentElement;
  const buzz = ms => { try { if (!reduce && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
  const WA = 'https://wa.me/51952255734';
  const WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.3.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></svg>';
  const NAMES = { inicio: 'Planta 3D', proyectos: 'Proyectos', cine: 'Recorrido', servicios: 'Servicios', ingenieria: 'Simulación', digital: 'Registros', metodo: 'Método', nosotros: 'Nosotros', faq: 'Preguntas', contacto: 'Contacto' };
  const IDS = Object.keys(NAMES);

  let built = false, menuOpen = false;
  let mnav, dock, burger, hud, cue, dockLab, dockNum, bar, h3d, norms, lb;
  let curId = '', lastLabel = '', lastY = scrollY, vel = 0, ticking = false;
  let anim = null, mqv = null, mqRun = false, rate = 1, skew = 0, svcVisible = false, svcItems = [];

  /* ---------- menú a pantalla completa ---------- */
  function buildMenu() {
    const items = [['Proyectos', '#proyectos'], ['Servicios', '#servicios'], ['Simulación', '#ingenieria'], ['Registros', '#digital'], ['Nosotros', '#nosotros'], ['Contacto', '#contacto']];
    mnav = document.createElement('div');
    mnav.className = 'v3-mnav'; mnav.id = 'mnav';
    mnav.setAttribute('role', 'dialog'); mnav.setAttribute('aria-modal', 'true'); mnav.setAttribute('aria-label', 'Menú'); mnav.setAttribute('aria-hidden', 'true');
    mnav.innerHTML =
      '<nav aria-label="Menú móvil"><ol>' + items.map(([t, h], i) => `<li style="--i:${i}"><a href="${h}"><span>${t}</span></a></li>`).join('') + '</ol></nav>' +
      '<div class="m-foot">' +
      '<a class="m-cta" href="#contacto"><span>Solicitar diagnóstico</span><i aria-hidden="true">→</i></a>' +
      `<a class="m-wa" href="${WA}" target="_blank" rel="noopener">${WA_SVG}<span>WhatsApp 952 255 734</span></a>` +
      '<p class="m-meta">Lima, Perú · Consultoría HACCP y diseño de plantas de alimentos</p></div>';
    document.body.append(mnav);

    burger = document.getElementById('burger');
    if (burger) burger.setAttribute('aria-controls', 'mnav');
    // se adelanta al manejador viejo (main.js) para que no abra el desplegable anterior
    document.addEventListener('click', e => {
      if (!mq.matches || !e.target.closest('#burger')) return;
      e.stopImmediatePropagation(); e.preventDefault();
      menuOpen ? closeMenu(true) : openMenu();
    }, true);
    mnav.addEventListener('click', e => {
      const a = e.target.closest('a'); if (!a) return;
      buzz(8);
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#')) {
        e.preventDefault();
        const t = document.querySelector(href);
        closeMenu(false);
        if (t) requestAnimationFrame(() => t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }));
      } else closeMenu(false);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) closeMenu(true); });
  }
  function openMenu() {
    menuOpen = true;
    if (bar) bar.classList.remove('hide');
    mnav.classList.add('open'); mnav.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Cerrar menú');
    root.classList.add('v3-lock');
    $('a[aria-current]', mnav).forEach(a => a.removeAttribute('aria-current'));
    const cur = $('li a', mnav).find(a => a.getAttribute('href') === '#' + curId);
    if (cur) cur.setAttribute('aria-current', 'true');
    buzz(10);
    setTimeout(() => { if (menuOpen) { const f = mnav.querySelector('a'); f && f.focus({ preventScroll: true }); } }, 380);
    frame();
  }
  function closeMenu(restoreFocus) {
    if (!menuOpen) return;
    menuOpen = false;
    mnav.classList.remove('open'); mnav.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menú');
    root.classList.remove('v3-lock');
    if (restoreFocus) burger.focus({ preventScroll: true });
    frame();
  }

  /* ---------- dock inferior ---------- */
  function buildDock() {
    dock = document.createElement('div');
    dock.className = 'v3-dock'; dock.setAttribute('role', 'region'); dock.setAttribute('aria-label', 'Acciones rápidas');
    dock.innerHTML =
      '<span class="d-ring" aria-hidden="true"><b>01</b></span>' +
      '<span class="d-lab" aria-hidden="true"><span class="d-l">Proyectos</span></span>' +
      `<a class="d-wa" href="${WA}" target="_blank" rel="noopener" aria-label="Escribir por WhatsApp">${WA_SVG}</a>` +
      '<a class="d-cta" href="#contacto" aria-label="Solicitar diagnóstico">Diagnóstico<i aria-hidden="true">→</i></a>';
    document.body.append(dock);
    dockLab = dock.querySelector('.d-l'); dockNum = dock.querySelector('.d-ring b');
    dock.addEventListener('click', e => { if (e.target.closest('a')) buzz(8); });
  }
  function setLabel(txt) {
    if (txt === lastLabel) return; lastLabel = txt;
    if (reduce || !dockLab.animate) { dockLab.textContent = txt; return; }
    dockLab.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-110%)', opacity: 0 }], { duration: 180, easing: 'cubic-bezier(.4,0,.1,1)' }).onfinish = () => {
      dockLab.textContent = txt;
      dockLab.animate([{ transform: 'translateY(110%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
    };
  }

  /* ---------- hero: historias de progreso y pista de scroll ---------- */
  function buildHero() {
    const stage = $('.h3d-stage')[0]; if (!stage) return;
    hud = document.createElement('div'); hud.className = 'v3-hud'; hud.setAttribute('aria-hidden', 'true'); hud.innerHTML = '<i></i><i></i><i></i><i></i>';
    cue = document.createElement('div'); cue.className = 'v3-cue'; cue.setAttribute('aria-hidden', 'true'); cue.innerHTML = '<span>Desliza</span><i></i>';
    stage.append(hud, cue);
  }
  const B = [0, .22, .47, .72, 1]; // mismos cortes que el recorrido de la maqueta (v2.js)
  function heroProgress() {
    if (!h3d) return 0;
    const r = h3d.getBoundingClientRect(), total = r.height - innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  }

  /* ---------- marquesina de normas ---------- */
  function buildMarquee() {
    norms = $('.norms')[0]; if (!norms || reduce) return;
    const ul = norms.querySelector('ul'); if (!ul || !ul.animate) return;
    const clone = ul.cloneNode(true); clone.setAttribute('aria-hidden', 'true');
    mqv = document.createElement('div'); mqv.className = 'v3-mqv';
    const track = document.createElement('div'); track.className = 'v3-mq';
    ul.before(mqv); mqv.append(track); track.append(ul, clone);
    norms.classList.add('v3on');
    anim = track.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: 34000, iterations: Infinity, easing: 'linear' });
    new IntersectionObserver(es => es.forEach(en => { en.isIntersecting ? anim.play() : anim.pause(); }), { rootMargin: '80px' }).observe(norms);
  }
  function mqTick() {
    if (!anim) return;
    const sp = Math.abs(vel);
    const target = sp > .4 ? clamp(1 + sp * .3, 1, 6) : 1; // solo se acelera: el sentido de giro no se invierte
    rate += (target - rate) * .12;
    skew += (clamp(-vel * .22, -7, 7) - skew) * .15;
    anim.updatePlaybackRate(rate);
    mqv.style.transform = `skewX(${skew.toFixed(2)}deg)`;
    vel *= .9;
    if (Math.abs(rate - 1) > .02 || Math.abs(skew) > .05 || Math.abs(vel) > .3) requestAnimationFrame(mqTick);
    else { mqRun = false; anim.updatePlaybackRate(1); mqv.style.transform = ''; }
  }

  /* ---------- proyectos: carrusel con color por proyecto ---------- */
  function buildWork() {
    const work = $('.work')[0], sec = $('#proyectos')[0]; if (!work || !sec) return;
    const cards = $('.card', work); if (cards.length < 2) return;
    const wp = document.createElement('div'); wp.className = 'v3-wp'; wp.setAttribute('aria-hidden', 'true');
    wp.innerHTML = `<div class="segs">${cards.map(() => '<i></i>').join('')}</div><div class="cnt"><b>01</b> / ${String(cards.length).padStart(2, '0')}</div><div class="hint">Desliza</div>`;
    work.after(wp);
    const segs = $('.segs i', wp), cnt = wp.querySelector('.cnt b'), hint = wp.querySelector('.hint');
    let act = -1, first = true;
    const upd = () => {
      if (innerWidth > 760) return;
      let best = 0, bd = 9;
      cards.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - innerWidth / 2) / r.width;
        if (d < bd) { bd = d; best = i; }
        const k = clamp(d, 0, 1);
        el.style.setProperty('--s', (1 - .06 * k).toFixed(3));
        el.style.setProperty('--o', (1 - .5 * k).toFixed(3));
      });
      if (best !== act) {
        act = best;
        const c = cards[best];
        if (c.dataset.colorBg) sec.style.setProperty('--wbg', c.dataset.colorBg);
        if (c.dataset.colorAcc) sec.style.setProperty('--wacc', c.dataset.colorAcc);
        segs.forEach((s, i) => s.classList.toggle('on', i <= best));
        cnt.textContent = String(best + 1).padStart(2, '0');
        if (best > 0) hint.style.visibility = 'hidden'; else hint.style.visibility = '';
        if (!first) buzz(6); first = false;
      }
    };
    work.addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
    upd();
  }

  /* ---------- servicios: la tarjeta que queda atrás se hunde ---------- */
  function buildStack() {
    svcItems = $('.svc > li'); const ul = $('.svc')[0]; if (!svcItems.length || !ul || reduce) return;
    new IntersectionObserver(es => es.forEach(en => { svcVisible = en.isIntersecting; if (svcVisible) frame(); }), { rootMargin: '120px' }).observe(ul);
  }
  function stackUpdate() {
    if (!svcVisible) return;
    if (innerWidth > 760) { svcItems.forEach(li => li.style.removeProperty('--d')); return; }
    svcItems.forEach((li, i) => {
      const next = svcItems[i + 1];
      if (!next) return;
      const a = li.getBoundingClientRect(), n = next.getBoundingClientRect();
      const d = clamp((a.bottom - n.top) / a.height, 0, 1);
      li.style.setProperty('--d', d.toFixed(3));
    });
  }

  /* ---------- cifras que cuentan al aparecer (valores ya publicados, no se inventa ninguno) ---------- */
  function buildCounters() {
    if (reduce) return;
    const fmt = n => n >= 1000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(n);
    const groups = $('.results').map(box => {
      const dts = $('dt', box).map(dt => ({ dt, n: parseInt(dt.textContent.replace(/\D/g, ''), 10), raw: dt.textContent })).filter(o => o.n > 0);
      dts.forEach(o => { o.dt.textContent = '0'; });
      return { box, dts };
    });
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return; io.unobserve(en.target);
      const g = groups.find(x => x.box === en.target); if (!g) return;
      const t0 = performance.now(), D = 1500;
      (function f(t) {
        const p = clamp((t - t0) / D), e = 1 - Math.pow(1 - p, 3);
        g.dts.forEach(o => { o.dt.textContent = p < 1 ? fmt(Math.round(o.n * e)) : o.raw; });
        if (p < 1) requestAnimationFrame(f);
      })(t0);
    }), { threshold: .4 });
    groups.forEach(g => io.observe(g.box));
  }

  /* ---------- bucle de scroll (un solo manejador, un solo rAF) ---------- */
  function frame() {
    ticking = false;
    const y = scrollY, dy = y - lastY; lastY = y;
    vel += (dy - vel) * .25;
    if (!mq.matches) return;

    // sección actual
    let cur = IDS[0], idx = 0;
    IDS.forEach((id, i) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < innerHeight * .45) { cur = id; idx = i; } });
    curId = cur;

    // hero: historias y pista
    if (hud) {
      const p = heroProgress();
      $('i', hud).forEach((s, i) => s.style.setProperty('--f', clamp((p - B[i]) / (B[i + 1] - B[i])).toFixed(3)));
    }
    if (cue) cue.classList.toggle('off', y > 24);

    // dock
    const hb = h3d ? h3d.getBoundingClientRect().bottom : 0;
    const ct = document.getElementById('contacto');
    const atContact = ct ? ct.getBoundingClientRect().top < innerHeight * .5 : false;
    const show = hb < innerHeight * .92 && !atContact && !menuOpen && !(lb && lb.open);
    dock.classList.toggle('show', show);
    if (show) {
      setLabel(NAMES[cur]);
      dockNum.textContent = String(idx + 1).padStart(2, '0');
      const h = document.documentElement.scrollHeight - innerHeight;
      dock.style.setProperty('--p', (h > 0 ? clamp(y / h) * 100 : 0).toFixed(1));
    }

    // marquesina y pila de servicios
    if (anim && !mqRun && Math.abs(vel) > .4) { mqRun = true; requestAnimationFrame(mqTick); }
    stackUpdate();
  }

  function init() {
    built = true;
    bar = document.getElementById('bar'); h3d = $('.h3d')[0]; lb = document.getElementById('lb');
    try { buildMenu(); buildDock(); buildHero(); buildMarquee(); buildWork(); buildStack(); buildCounters(); }
    catch (e) { console.error('v3-movil', e); }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    addEventListener('resize', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } });
    frame();
  }

  const sync = () => {
    root.classList.toggle('v3m', mq.matches);
    if (mq.matches && !built) init();
    if (!mq.matches && menuOpen) closeMenu(false);
    if (built) frame();
  };
  (mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();
