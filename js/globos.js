/* Esferas que giran como un globo terráqueo (canvas 2D, sin librerías). */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function tex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }

  /* textura del globo del logo: malla azul + teselas, como el logo original */
  function texLogo() {
    return tex(1024, 512, function (g, w, h) {
      var grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#f4f9ff'); grad.addColorStop(1, '#dbe9fa');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      var cols = 24, rows = 12, cw = w / cols, ch = h / rows, pal = ['#1f5fb0', '#4f93e6', '#7fb4ee', '#0f2a5e', '#0a1d44', '#a9cdf5', '#2b78d4'];
      var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) if (rnd() < 0.36) { g.fillStyle = pal[Math.floor(rnd() * pal.length)]; g.fillRect(c * cw + 3, r * ch + 3, cw - 6, ch - 6); }
      g.strokeStyle = 'rgba(31,95,176,.75)'; g.lineWidth = 2.2;
      for (var i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, h); g.stroke(); }
      for (var j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(w, j * ch); g.stroke(); }
    });
  }

  /* textura del emblema: franjas de azul en degradé con borde ondulado, continuas alrededor de toda la esfera */
  function texF() {
    var cols = [[138, 214, 248], [63, 176, 238], [31, 134, 214], [19, 86, 168], [11, 55, 121], [7, 32, 74]];
    return tex(1024, 512, function (g, w, h) {
      var img = g.createImageData(w, h), d = img.data, n = cols.length;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var u = x / w, vv = y / h + 0.012 * Math.sin(u * Math.PI * 4);
        var t = Math.max(0, Math.min(0.9999, vv)) * n, k = Math.floor(t), fr = t - k, c = cols[k], i = (y * w + x) * 4, lift = fr < 0.045 && k > 0 ? 0.55 : 0;
        d[i] = c[0] + (255 - c[0]) * lift; d[i + 1] = c[1] + (255 - c[1]) * lift; d[i + 2] = c[2] + (255 - c[2]) * lift; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }

  function globo(canvas, texture, opts) {
    var S = canvas.width, ctx = canvas.getContext('2d'), tw = texture.width, th = texture.height;
    var td = texture.getContext('2d').getImageData(0, 0, tw, th).data, out = ctx.createImageData(S, S), od = out.data;
    var roll = (opts && opts.roll) || 0, cr = Math.cos(roll), sr = Math.sin(roll), over = opts && opts.over, tilt = (opts && opts.tilt) || 0.35, ct = Math.cos(tilt), st = Math.sin(tilt), speed = (opts && opts.speed) || 0.5, rot = 0, last = 0, vis = true, R = S / 2 - 1;
    var L = [-0.45, -0.5, 0.74];
    function frame(ts) {
      if (!vis || document.hidden) { last = 0; return; }
      var dt = last ? (ts - last) / 1000 : 0; last = ts; rot += dt * speed;
      for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
        var nx = (x + 0.5 - S / 2) / R, ny = -(y + 0.5 - S / 2) / R, d2 = nx * nx + ny * ny, i = (y * S + x) * 4;
        if (d2 >= 1) { od[i + 3] = 0; continue; }
        var nz = Math.sqrt(1 - d2);
        var rx = nx * cr + ny * sr, ry = -nx * sr + ny * cr;
        var y2 = ry * ct - nz * st, z2 = ry * st + nz * ct;
        var lon = Math.atan2(rx, z2) + rot, u = lon / (Math.PI * 2); u -= Math.floor(u);
        var v = 0.5 - Math.asin(Math.max(-1, Math.min(1, y2))) / Math.PI;
        var px = Math.min(tw - 1, (u * tw) | 0), py = Math.min(th - 1, Math.max(0, (v * th) | 0)), ti = (py * tw + px) * 4;
        var diff = nx * L[0] + ny * L[1] + nz * L[2], sh = 0.62 + 0.45 * Math.max(0, diff), spec = Math.pow(Math.max(0, diff), 24) * 70, edge = Math.min(1, (1 - Math.sqrt(d2)) * R / 1.4);
        od[i] = Math.min(255, td[ti] * sh + spec); od[i + 1] = Math.min(255, td[ti + 1] * sh + spec); od[i + 2] = Math.min(255, td[ti + 2] * sh + spec); od[i + 3] = 255 * edge;
      }
      ctx.putImageData(out, 0, 0); if (over) over(ctx, S); requestAnimationFrame(frame);
    }
    new IntersectionObserver(function (e) { var was = vis; vis = e[0].isIntersecting; if (vis && !was) requestAnimationFrame(frame); }).observe(canvas);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && vis) requestAnimationFrame(frame); });
    requestAnimationFrame(frame);
  }

  function size(px) { return Math.round(px * Math.min(window.devicePixelRatio || 1, 2)); }

  /* encabezado: esfera del logo girando + texto de marca */
  var logo = document.querySelector('.brand .logo') || document.querySelector('a.logo img');
  if (logo) {
    var cv = document.createElement('canvas'); cv.className = 'globo'; cv.width = cv.height = size(54);
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', logo.getAttribute('alt') || 'Food Tracking Perú');
    var tx = document.createElement('img'); tx.className = 'brand-texto'; tx.alt = ''; tx.setAttribute('aria-hidden', 'true');
    tx.src = logo.getAttribute('src').replace('logo-minimalista.jpg', 'logo-texto.png').replace('logo.png', 'logo-texto.png'); tx.height = 34; tx.width = 121;
    tx.onload = function () {
      var br = logo.parentNode; br.classList.add('has-globo'); br.insertBefore(cv, logo); br.insertBefore(tx, logo); logo.style.display = 'none';
      globo(cv, texLogo(), { tilt: -0.5, roll: -0.25, speed: 0.55 });
    };
  }

  /* pie de página: esfera con meridianos que giran y la "F" fija encima */
  var f = document.querySelector('.foot-wm-icon') || document.querySelector('.fbrand img');
  if (f) {
    var im = new Image(); im.onload = function () {
      var c2 = document.createElement('canvas'); c2.className = f.className + ' globo'; c2.width = c2.height = size(50); c2.style.width = c2.style.height = '50px'; c2.style.flex = 'none'; c2.setAttribute('aria-hidden', 'true');
      f.parentNode.replaceChild(c2, f);
      globo(c2, texF(), { tilt: -0.28, speed: 0.9, over: function (ctx, S) { var w = S * 0.4, h = w * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, (S - w) / 2, (S - h) / 2, w, h); } });
    }; im.src = f.src.replace('logo-f.png', 'logo-f-letra.png').replace('isotipo.png', 'logo-f-letra.png');
  }
})();
