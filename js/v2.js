/* Food Tracking Perú · portada v2.1: maqueta 3D por scroll, proyectos, cursor, letras que ruedan */
(() => {
  const $ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const fine = matchMedia('(pointer:fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // ?poster: solo la maqueta, para generar la imagen de respaldo (img/planta3d-poster.jpg)
  if (/[?&]poster\b/.test(location.search)) document.documentElement.classList.add('poster-mode');
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  /* ---------- letras que ruedan (texto real intacto para lectores de pantalla) ---------- */
  if (!reduce && fine) {
    $('#menu a, .btn').forEach(el => {
      const tn = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
      if (!tn) return;
      const txt = tn.textContent.trim();
      const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = txt;
      const rl = document.createElement('span'); rl.className = 'rl'; rl.setAttribute('aria-hidden', 'true');
      [...txt].forEach((ch, i) => {
        const c = document.createElement('span'); c.className = 'c';
        const t = ch === ' ' ? ' ' : ch; c.textContent = t; c.dataset.c = t; c.style.setProperty('--i', i);
        rl.append(c);
      });
      el.insertBefore(sr, tn); el.insertBefore(rl, tn); el.insertBefore(document.createTextNode(' '), tn); tn.remove();
    });
  }

  /* ---------- maqueta 3D ---------- */
  const sec = document.querySelector('.h3d');
  const canvas = document.getElementById('planta3d');
  if (sec && canvas) {
    if (reduce) sec.classList.add('static');
    const steps = $('.step', sec), navBtns = $('.h3d-nav button', sec), legend = $('.legend button', sec);
    const labels = {}; $('.lbl', sec).forEach(l => { labels[l.dataset.k] = l; });
    let ctrl = null, step = 0, p = 0, W = 0, H = 0;
    const measure = () => { const r = canvas.getBoundingClientRect(); W = r.width; H = r.height; };
    measure();

    const progress = () => {
      if (sec.classList.contains('static')) return 0;
      const r = sec.getBoundingClientRect(), total = r.height - innerHeight;
      return total > 0 ? clamp(-r.top / total) : 0;
    };
    const setStep = n => {
      if (n === step) return; step = n; sec.dataset.step = n;
      steps.forEach(s => s.classList.toggle('on', +s.dataset.step === n));
      navBtns.forEach(b => b.dataset.go == n ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'));
      if (n !== 1) hover(null);
    };
    const onScroll = () => {
      p = progress();
      setStep(p < .22 ? 0 : p < .47 ? 1 : p < .72 ? 2 : 3);
      if (ctrl) ctrl.setProgress(p);
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { measure(); if (ctrl) ctrl.resize(); onScroll(); });
    navBtns.forEach(b => b.addEventListener('click', () => {
      const r = sec.getBoundingClientRect(), total = r.height - innerHeight;
      scrollTo({ top: scrollY + r.top + total * [0, .34, .6, .9][+b.dataset.go], behavior: reduce ? 'auto' : 'smooth' });
    }));

    function hover(id) {
      $('.lbl', sec).forEach(l => l.classList.toggle('hot', !!id && l.dataset.k === id));
      legend.forEach(b => b.classList.toggle('on', b.dataset.zone === id));
    }
    legend.forEach(b => {
      const on = () => { if (ctrl) ctrl.highlight(b.dataset.zone); hover(b.dataset.zone); };
      const off = () => { if (ctrl) ctrl.highlight(null); hover(null); };
      b.addEventListener('mouseenter', on); b.addEventListener('focus', on);
      b.addEventListener('mouseleave', off); b.addEventListener('blur', off);
    });

    const offset = pp => {
      if (innerWidth < 761) return { x: 0, y: -H * .21 };
      if (innerWidth < 1081) return { x: W * .1, y: -H * .04 };
      return { x: W * (.18 + .03 * smooth(.15, .3, pp)), y: 0 };
    };
    const onFrame = out => {
      for (const k in out) {
        const l = labels[k]; if (!l) continue; const o = out[k];
        l.style.transform = `translate3d(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px,0) translate(-50%,-50%)`;
        const off = !o.vis || o.x < 16 || o.x > W - 16 || o.y < 80 || o.y > H - 16;
        if (off !== l.classList.contains('off')) l.classList.toggle('off', off);
      }
    };

    const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();

    async function load() {
      if (!webgl) { sec.classList.add('no3d'); return; }
      const box = sec.querySelector('.h3d-load'), num = box.querySelector('.n');
      let shown = 0, target = 0, done = false, full, lastT = performance.now();
      const reached = new Promise(r => { full = r; });
      (function tick(now = performance.now()) {
        const dt = Math.min(.25, Math.max(0, (now - lastT) / 1000)); lastT = now;
        shown += (target - shown) * (1 - Math.pow(.0001, dt)); // por tiempo, no por cuadro
        const v = done && shown > .99 ? 1 : shown;
        num.textContent = String(Math.round(v * 100)).padStart(3, '0');
        box.style.setProperty('--p', (v * 100).toFixed(1) + '%');
        if (done && v === 1) full(); else requestAnimationFrame(tick);
      })();
      const src = new URL(canvas.dataset.src, location.href).href, size = +canvas.dataset.size || 0;
      // script clásico (global Planta3D): funciona con servidor y abriendo el archivo con doble clic
      const addScript = url => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = ko; document.head.append(s); });
      try {
        if (location.protocol === 'file:') throw new Error('file');
        const res = await fetch(src);
        if (!res.ok || !res.body || !size) throw new Error(res.status);
        const rd = res.body.getReader(), chunks = []; let got = 0;
        for (;;) { const { done: d, value } = await rd.read(); if (d) break; chunks.push(value); got += value.length; target = Math.min(.97, got / size); }
        const url = URL.createObjectURL(new Blob(chunks, { type: 'text/javascript' }));
        try { await addScript(url); } finally { URL.revokeObjectURL(url); }
      } catch (e) {
        target = .6;
        try { if (!window.Planta3D) await addScript(src); } catch (e2) { sec.classList.add('no3d'); return; }
      }
      const mod = window.Planta3D;
      if (!mod) { sec.classList.add('no3d'); return; }
      target = 1; done = true;
      try {
        ctrl = mod.init(canvas, { reduce, small: innerWidth < 760, offset, onFrame, onHover: id => hover(id), onError: () => { sec.classList.remove('ready'); sec.classList.add('no3d'); } });
      } catch (e) { sec.classList.add('no3d'); return; }
      canvas._ctrl = ctrl;
      onScroll();
      if (!reduce) await Promise.race([reached, new Promise(r => setTimeout(r, 900))]);
      sec.classList.add('ready');
      let visible = true;
      new IntersectionObserver(es => es.forEach(en => { visible = en.isIntersecting; visible && !document.hidden ? ctrl.resume() : ctrl.pause(); })).observe(sec);
      document.addEventListener('visibilitychange', () => { document.hidden || !visible ? ctrl.pause() : ctrl.resume(); });
    }
    (window.requestIdleCallback || (f => setTimeout(f, 60)))(load, { timeout: 600 });
  }

  /* ---------- proyectos: video al pasar el mouse + vista ampliada ---------- */
  const lb = document.getElementById('lb');
  const media = $('.media');
  media.forEach(m => {
    const v = m.querySelector('video');
    if (v && !reduce && fine) {
      m.addEventListener('mouseenter', () => { v.preload = 'auto'; v.play().then(() => m.classList.add('playing')).catch(() => {}); });
      m.addEventListener('mouseleave', () => { m.classList.remove('playing'); setTimeout(() => { if (!m.matches(':hover')) v.pause(); }, 400); });
    }
    m.addEventListener('click', () => openLb(m));
  });
  let group = [], gi = 0;
  function render(m) {
    const box = lb.querySelector('.lb-m'), cap = lb.querySelector('figcaption'), card = m.closest('.card');
    box.textContent = ''; cap.textContent = '';
    const img = m.querySelector('img'), vsrc = m.dataset.lbvideo || m.dataset.video;
    if (vsrc) {
      const v = document.createElement('video');
      Object.assign(v, { src: vsrc, controls: true, muted: true, loop: true, playsInline: true, poster: img.currentSrc || img.src });
      v.autoplay = !reduce; box.append(v);
    } else {
      const i = document.createElement('img'); i.src = m.dataset.full; i.alt = img.alt; box.append(i);
    }
    const b = document.createElement('b');
    b.textContent = m.dataset.title || card.querySelector('h3').textContent;
    const desc = m.dataset.desc || (card.querySelector('.meta p') || {}).textContent || '';
    cap.append(b, desc);
    if (group.length > 1) { const c = document.createElement('span'); c.className = 'lb-count'; c.textContent = `${gi + 1} / ${group.length}`; cap.append(c); }
  }
  function openLb(m) {
    if (!lb || !lb.showModal) return;
    group = m.dataset.group ? $(`.media[data-group="${m.dataset.group}"]`) : [m];
    gi = Math.max(0, group.indexOf(m));
    lb.classList.toggle('grp', group.length > 1);
    render(m);
    lb.showModal();
  }
  const step = d => { if (group.length < 2) return; gi = (gi + d + group.length) % group.length; render(group[gi]); };
  if (lb) {
    lb.querySelector('.lb-x').addEventListener('click', () => lb.close());
    lb.querySelector('.lb-prev').addEventListener('click', () => step(-1));
    lb.querySelector('.lb-next').addEventListener('click', () => step(1));
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', () => { lb.querySelector('.lb-m').textContent = ''; });
  }

  /* ---------- videos que se reproducen al entrar en pantalla ---------- */
  const autos = $('video[data-auto]');
  if (autos.length && !reduce) {
    const vio = new IntersectionObserver(es => es.forEach(en => {
      const v = en.target;
      if (en.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
    }), { threshold: .35 });
    autos.forEach(v => vio.observe(v));
  }

  /* ---------- servicios: el panel elegido se expande ---------- */
  const svcItems = $('.svc > li');
  const wideSvc = matchMedia('(min-width:901px)');
  svcItems.forEach(li => {
    const pick = () => { if (!wideSvc.matches) return; svcItems.forEach(o => o.classList.toggle('on', o === li)); };
    li.addEventListener('mouseenter', pick);
    li.addEventListener('focusin', pick);
  });

  /* ---------- cursor sobre proyectos ---------- */
  const cur = document.querySelector('.cur');
  if (cur && fine && !reduce && media.length) {
    document.documentElement.classList.add('has-cur');
    const label = cur.firstElementChild;
    let x = -300, y = -300, tx = x, ty = y, s = 0, ts = 0, run = false;
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; if (!run && ts) start(); }, { passive: true });
    const start = () => { if (run) return; run = true; x = tx; y = ty; requestAnimationFrame(loop); };
    function loop() {
      x += (tx - x) * .2; y += (ty - y) * .2; s += (ts - s) * .16;
      cur.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${s.toFixed(3)})`;
      if (ts === 0 && s < .005) { run = false; cur.style.transform = 'translate3d(-300px,-300px,0) scale(0)'; return; }
      requestAnimationFrame(loop);
    }
    media.forEach(m => {
      m.addEventListener('mouseenter', () => { label.textContent = m.dataset.video ? 'Reproducir' : 'Ampliar'; cur.style.background = ''; cur.style.color = ''; ts = 1; start(); });
      m.addEventListener('mouseleave', () => { ts = 0; });
    });
    $('.sv').forEach(sv => {
      sv.addEventListener('mouseenter', () => { label.textContent = 'Ver servicio'; cur.style.background = getComputedStyle(sv).getPropertyValue('--c'); cur.style.color = '#06101d'; ts = 1; start(); });
      sv.addEventListener('mouseleave', () => { ts = 0; });
    });
  }
})();
