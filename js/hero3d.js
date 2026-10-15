/* Escena 3D del hero: planta alimentaria estilizada (tanques de acero, tuberías, producto en flujo). */
import * as THREE from './three.module.min.js';

const host = document.querySelector('.hero-art');
if (host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-3d';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  const scene = new THREE.Scene();
  
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 4.2, 14); camera.lookAt(0, 0.4, 0);

  scene.add(new THREE.HemisphereLight(0x9fc2ee, 0x0a1d44, 0.9));
  const amber = new THREE.PointLight(0xe8920c, 55, 22); amber.position.set(-4, 4, 4); scene.add(amber);
  const blue = new THREE.PointLight(0x4f93e6, 70, 24); blue.position.set(5, 3, 5); scene.add(blue);
  const rim = new THREE.PointLight(0xffffff, 28, 20); rim.position.set(0, 6, -4); scene.add(rim);

  const world = new THREE.Group(); scene.add(world);
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xe3ecf8, metalness: 0.45, roughness: 0.22, clearcoat: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f3a73, metalness: 0.5, roughness: 0.5 });
  const glow = new THREE.MeshStandardMaterial({ color: 0xe8920c, emissive: 0xe8920c, emissiveIntensity: 1.4, roughness: 0.3 });

  /* suelo */
  const grid = new THREE.GridHelper(24, 24, 0x4f93e6, 0x1f5fb0);
  grid.material.transparent = true; grid.material.opacity = 0.28; grid.position.y = -1.6; world.add(grid);

  /* tanques */
  const tanks = [];
  [[-2.6, 2.2, 1.0], [0, 3.1, 1.25], [2.7, 1.7, 0.9]].forEach(([x, h, r], i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40), steel); body.position.y = h / 2; g.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), steel); dome.position.y = h; g.add(dome);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.05, 12, 48), glow); band.rotation.x = Math.PI / 2; band.position.y = h * 0.55; g.add(band);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), dark);
      leg.position.set(Math.cos(a) * r * 0.8, -0.2, Math.sin(a) * r * 0.8); g.add(leg);
    }
    g.position.set(x, -1.35, i === 1 ? -0.6 : 0.2); g.userData = { base: g.position.y, ph: i * 1.7 };
    world.add(g); tanks.push(g);
  });

  /* tubería entre tanques */
  const pipePts = [new THREE.Vector3(-2.6, 0.2, 0.2), new THREE.Vector3(-1.4, 1.4, -0.2), new THREE.Vector3(0, 1.6, -0.6),
                   new THREE.Vector3(1.4, 1.2, -0.1), new THREE.Vector3(2.7, 0.0, 0.2)];
  const curve = new THREE.CatmullRomCurve3(pipePts);
  world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.09, 12, false), steel));

  /* producto circulando por la tubería */
  const flow = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), glow); world.add(s); flow.push({ m: s, t: i / 9 });
  }

  /* anillo orbital (control de calidad) */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.025, 8, 160), new THREE.MeshBasicMaterial({ color: 0x9fc2ee, transparent: true, opacity: 0.55 }));
  ring.rotation.x = Math.PI / 2.3; ring.position.y = 0.6; world.add(ring);
  const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), glow); world.add(sat);

  /* partículas */
  const N = 260, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 18; pos[i * 3 + 1] = Math.random() * 9 - 2; pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xbcd4f5, size: 0.045, transparent: true, opacity: 0.8 }));
  scene.add(pts);

  /* tamaño, puntero, ciclo */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  function resize() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.z = w / h < 1.2 ? 17 : 14; camera.lookAt(0, 0.4, 0); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();
  window.addEventListener('pointermove', e => { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

  let visible = true, t0 = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) loop(); }, { threshold: 0.05 }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) loop(); });

  let raf = 0;
  function loop() {
    cancelAnimationFrame(raf);
    if (!visible || document.hidden) return;
    const t = (performance.now() - t0) / 1000;
    const intro = Math.min(t / 1.6, 1), e = 1 - Math.pow(1 - intro, 3);
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    world.scale.setScalar(0.4 + 0.6 * e); world.position.y = (1 - e) * -2;
    world.rotation.y = -0.45 + Math.sin(t * 0.25) * 0.35 + mouse.x * 0.35 + (1 - e) * 1.4;
    world.rotation.x = mouse.y * 0.08;
    tanks.forEach(g => { g.position.y = g.userData.base + Math.sin(t * 0.9 + g.userData.ph) * 0.07; });
    flow.forEach(f => { f.t = (f.t + 0.0016) % 1; f.m.position.copy(curve.getPoint(f.t)); });
    const th = Math.PI / 2.3, ang = t * 0.7;
    sat.position.set(Math.cos(ang) * 4.6, 0.6 + Math.sin(ang) * 4.6 * Math.cos(th), Math.sin(ang) * 4.6 * Math.sin(th)); sat.rotation.y = t * 2; sat.rotation.x = t;
    pts.rotation.y = t * 0.02; pts.position.y = Math.sin(t * 0.4) * 0.15;
    amber.position.x = -4 + Math.sin(t * 0.6) * 1.5;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  host.classList.add('is-3d');
  loop();
}
