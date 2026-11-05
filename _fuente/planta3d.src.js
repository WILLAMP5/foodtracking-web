/*
 * Food Tracking Perú · maqueta 3D procedural de una planta de alimentos.
 * Muestra zonificación higiénica (Z1 sucia → Z4 alto cuidado) y flujos sin cruces
 * (producto, personal, residuos). Todo se dibuja en código: no hay modelos externos.
 *
 * Compilar (genera js/planta3d.js como script clásico, para que funcione también abriendo index.html con doble clic):
 *   NODE_PATH=<carpeta que tiene node_modules> npx esbuild _fuente/planta3d.src.js \
 *     --bundle --format=iife --global-name=Planta3D --minify --outfile=js/planta3d.js
 * (three@0.170.0)
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/* ---------- datos de la planta (metros) ---------- */
export const ZONES = [
  { id: 'z1', code: 'Z1', name: 'Recepción y lavado', risk: 'Zona sucia', x: [-24, -16], z: [-12, 6], color: 0xc8813f },
  { id: 'z2', code: 'Z2', name: 'Almacén de insumos', risk: 'Bajo riesgo', x: [-16, -8], z: [-12, 6], color: 0x8b95a3 },
  { id: 'z3', code: 'Z3', name: 'Proceso', risk: 'Riesgo medio', x: [-8, 8], z: [-12, 6], color: 0x3d7fe0 },
  { id: 'z4', code: 'Z4', name: 'Envasado', risk: 'Alto cuidado', x: [8, 17], z: [-12, 6], color: 0x5ad3ff },
  { id: 'z5', code: 'Z5', name: 'Producto terminado', risk: 'Despacho', x: [17, 24], z: [-12, 6], color: 0xb4c2d3 },
  { id: 'zp', code: 'P', name: 'Vestuarios y esclusas', risk: 'Personal', x: [-24, 24], z: [6, 12], color: 0x44506a },
];

// tramos de muro [x1, z1, x2, z2]; los vanos (puertas, pasamuros) son los huecos entre tramos
const WALLS = [
  // perímetro
  [-24, -12, -22, -12], [-18, -12, -1, -12], [1, -12, 24, -12],          // sur: andén de recepción y salida de residuos
  [-24, 12, 8, 12], [10, 12, 18, 12], [19.5, 12, 24, 12],                // norte: ingreso alto cuidado y oficinas
  [-24, -12, -24, 8], [-24, 10, -24, 12],                                 // oeste: ingreso de personal
  [24, -12, 24, -6], [24, -2, 24, 12],                                    // este: andén de despacho
  // divisiones de producción
  [-16, -12, -16, -6], [-16, -3, -16, 6],
  [-8, -12, -8, -6], [-8, -3, -8, 6],
  [8, -12, 8, -5.6], [8, -4.4, 8, 6],                                     // pasamuro de la faja
  [17, -12, 17, -6], [17, -4, 17, 6],
  // franja de personal
  [-24, 6, -7, 6], [-5, 6, 10, 6], [12, 6, 24, 6],                        // esclusas hacia Z3 y Z4
  [-10, 6, -10, 8.5], [-10, 10, -10, 12],
  [-4, 6, -4, 10], [-4, 11.2, -4, 12],
  [6, 6, 6, 12], [14, 6, 14, 12],
];

const FLOWS = {
  producto: { color: 0x5b9dff, pts: [[-20, -21], [-20, -12.5], [-20, -7], [-17, -4.6], [-12, -4.8], [-8, -4.6], [-5, -6.6], [0, -6.6], [3, -5], [8, -5], [13, -5], [16, -5.2], [18.7, -6.6], [20.5, -7.1], [22.5, -5], [24, -4], [31, -4]] },
  personal: { color: 0xf2f6fb, pts: [[-31, 9], [-24, 9], [-17, 9], [-10, 9.2], [-7.2, 8.6], [-6, 6], [-6, 3], [-4.5, 1.4]] },
  alto: { color: 0xf2f6fb, pts: [[9, 16.5], [9, 12], [9.6, 9], [11, 6], [11, 3]] },
  residuos: { color: 0xe0a24f, pts: [[3, -9], [1, -10.6], [0, -12], [0, -17.5]] },
};

/* ---------- utilidades ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => 1 - Math.pow(1 - clamp(t), 3);
const easeBack = t => { t = clamp(t); const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.75)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function gridTexture() {
  const s = 2048, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'); const cells = 60, step = s / cells;
  for (let i = 0; i <= cells; i++) {
    const major = i % 5 === 0;
    g.strokeStyle = major ? 'rgba(156,195,245,.22)' : 'rgba(156,195,245,.09)';
    g.lineWidth = major ? 2 : 1;
    g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, s); g.stroke();
    g.beginPath(); g.moveTo(0, i * step); g.lineTo(s, i * step); g.stroke();
  }
  // desvanecer hacia los bordes
  g.globalCompositeOperation = 'destination-in';
  const r = g.createRadialGradient(s / 2, s / 2, s * .12, s / 2, s / 2, s * .5);
  r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* ---------- escena ---------- */
export function init(canvas, opts = {}) {
  const small = opts.small ?? innerWidth < 760;
  const reduce = opts.reduce ?? false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(26, 1, 1, 600);

  // luces
  scene.add(new THREE.HemisphereLight(0xdbe8ff, 0x0b1626, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-30, 52, 26);
  sun.castShadow = !small;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -44, right: 44, top: 30, bottom: -30, near: 10, far: 140 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x6fa8ff, 0.8); rim.position.set(40, 20, -30); scene.add(rim);

  const root = new THREE.Group(); scene.add(root);
  const intro = []; // {obj, kind, delay}
  const reg = (obj, kind, delay) => { intro.push({ obj, kind, delay, base: obj.position.y }); return obj; };

  // materiales
  const M = {
    slab: new THREE.MeshStandardMaterial({ color: 0xcfd6de, roughness: .92 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xf1f4f8, roughness: .86 }),
    wallTop: new THREE.MeshStandardMaterial({ color: 0x9fb0c4, roughness: .7 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xdde3ea, metalness: 1, roughness: .26 }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x8b97a6, metalness: .9, roughness: .4 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x1d2633, roughness: .6 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xa47b52, roughness: .9 }),
    carton: new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: .95 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x2f6fd6, roughness: .55 }),
    rack: new THREE.MeshStandardMaterial({ color: 0x29507e, roughness: .5, metalness: .3 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf4f6f9, roughness: .55 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x151b24, roughness: .9 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, roughness: .1, transmission: 0, transparent: true, opacity: .22, depthWrite: false }),
    edge: new THREE.LineBasicMaterial({ color: 0x0b1626, transparent: true, opacity: .45 }),
    dim: new THREE.LineBasicMaterial({ color: 0x9cc3f5, transparent: true, opacity: 0 }),
  };

  const box = (w, h, d, mat, x, y, z, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; return m;
  };

  // suelo exterior con grilla técnica + recolector de sombras
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), new THREE.MeshBasicMaterial({ map: gridTexture(), transparent: true, depthWrite: false }));
  grid.rotation.x = -Math.PI / 2; grid.position.y = -0.32; root.add(grid);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), new THREE.ShadowMaterial({ opacity: .35 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = -0.3; shadowCatcher.receiveShadow = true; root.add(shadowCatcher);

  // losa
  const slab = box(48.6, .3, 24.6, M.slab, 0, -.15, 0, false); root.add(slab);
  const slabEdges = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), M.edge); slab.add(slabEdges);

  // pisos por zona
  const zoneMeshes = {};
  ZONES.forEach((zn, i) => {
    const w = zn.x[1] - zn.x[0] - .24, d = zn.z[1] - zn.z[0] - .24;
    const mat = new THREE.MeshStandardMaterial({ color: zn.color, roughness: .78, emissive: zn.color, emissiveIntensity: 0 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, .06, d), mat);
    m.position.set((zn.x[0] + zn.x[1]) / 2, .03, (zn.z[0] + zn.z[1]) / 2);
    m.receiveShadow = true; m.userData.zone = zn.id; m.userData.color = new THREE.Color(zn.color);
    root.add(m); zoneMeshes[zn.id] = m;
    reg(m, 'floor', i * .08);
  });

  // muros con aristas (estilo maqueta)
  const H = 2.8, T = .22, walls = [];
  WALLS.forEach(([x1, z1, x2, z2], i) => {
    const len = Math.hypot(x2 - x1, z2 - z1) + T;
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(len, H, T); geo.translate(0, H / 2, 0);
    const m = new THREE.Mesh(geo, M.wall); m.castShadow = true; m.receiveShadow = true;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), M.edge));
    g.add(m);
    g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    g.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    root.add(g); walls.push(g);
    const d = Math.hypot(g.position.x, g.position.z) / 30;
    reg(g, 'wall', .25 + d * .9 + (i % 3) * .03);
  });

  /* equipos */
  const equip = new THREE.Group(); root.add(equip);
  const addEquip = (obj, delay) => { equip.add(obj); reg(obj, 'drop', delay); return obj; };

  function tank(x, z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, 2.3, 40), M.steel); body.position.y = 2.15;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.95, .6, 40), M.steel); cone.rotation.x = Math.PI; cone.position.y = .7;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.95, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.steel); dome.scale.y = .35; dome.position.y = 3.3;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.97, .04, 8, 40), M.steelDark); ring.rotation.x = Math.PI / 2; ring.position.y = 2.6;
    [body, cone, dome, ring].forEach(m => { m.castShadow = true; g.add(m); });
    for (let a = 0; a < 4; a++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1.1, 8), M.steelDark);
      leg.position.set(Math.cos(a * Math.PI / 2 + .78) * .78, .55, Math.sin(a * Math.PI / 2 + .78) * .78); leg.castShadow = true; g.add(leg);
    }
    g.position.set(x, 0, z); return g;
  }
  function table(x, z, w = 2.4, d = 1, rot = 0) {
    const g = new THREE.Group();
    g.add(box(w, .06, d, M.steel, 0, .9, 0));
    g.add(box(w - .1, .03, d - .1, M.steelDark, 0, .3, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(box(.06, .9, .06, M.steelDark, a * (w / 2 - .08), .45, b * (d / 2 - .08))));
    g.position.set(x, 0, z); g.rotation.y = rot; return g;
  }
  function conveyor(x1, x2, z) {
    const g = new THREE.Group(), len = x2 - x1;
    g.add(box(len, .14, .8, M.steel, 0, .82, 0));
    g.add(box(len - .1, .03, .62, M.belt, 0, .905, 0, false));
    for (let i = 0; i <= Math.floor(len / 1.6); i++) {
      const lx = -len / 2 + .1 + i * (len - .2) / Math.floor(len / 1.6);
      g.add(box(.06, .76, .06, M.steelDark, lx, .38, -.32)); g.add(box(.06, .76, .06, M.steelDark, lx, .38, .32));
    }
    g.position.set((x1 + x2) / 2, 0, z); return g;
  }
  function pallet(x, z, kind = 'crate', layers = 3, rot = 0) {
    const g = new THREE.Group();
    g.add(box(1.2, .15, 1.0, M.wood, 0, .075, 0));
    const mat = kind === 'crate' ? M.crate : M.carton;
    for (let l = 0; l < layers; l++) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++)
      g.add(box(.56, .3, .46, mat, -.29 + a * .58, .32 + l * .32, -.24 + b * .48));
    g.position.set(x, 0, z); g.rotation.y = rot; return g;
  }
  function rack(x1, x2, z) {
    const g = new THREE.Group(), len = x2 - x1, n = Math.round(len / 2.2);
    for (let i = 0; i <= n; i++) { const lx = -len / 2 + i * len / n; g.add(box(.08, 2.6, .08, M.rack, lx, 1.3, -.5)); g.add(box(.08, 2.6, .08, M.rack, lx, 1.3, .5)); }
    [.15, 1.05, 1.95].forEach((y, k) => {
      g.add(box(len, .07, 1.08, M.rack, 0, y, 0));
      for (let i = 0; i < n; i++) if ((i + k) % 3 !== 2) g.add(box(len / n - .35, .55, .8, M.carton, -len / 2 + (i + .5) * len / n, y + .32, 0));
    });
    g.position.set((x1 + x2) / 2, 0, z); return g;
  }
  function machine(x, z) {
    const g = new THREE.Group();
    g.add(box(2.2, 1.7, 1.3, M.steel, 0, .95, 0));
    g.add(box(2.24, .1, 1.34, M.steelDark, 0, .12, 0));
    const hop = new THREE.Mesh(new THREE.CylinderGeometry(.55, .25, .8, 24), M.steel); hop.position.set(-.4, 2.2, 0); hop.castShadow = true; g.add(hop);
    g.add(box(.5, .35, .04, M.belt, .55, 1.35, .67, false));
    g.position.set(x, 0, z); return g;
  }
  function coldRoom(x1, x2, z1, z2) {
    const g = new THREE.Group(), w = x2 - x1, d = z2 - z1;
    const geo = new THREE.BoxGeometry(w, 2.7, d); geo.translate(0, 1.35, 0);
    const m = new THREE.Mesh(geo, M.glass); g.add(m);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xbfe3ff, transparent: true, opacity: .7 })));
    g.add(pallet(-w / 4, -d / 6, 'carton', 3)); g.add(pallet(w / 4, -d / 6, 'carton', 2)); g.add(pallet(-w / 4, d / 4, 'carton', 2));
    g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2); return g;
  }
  function truck(x, z, rot) {
    const g = new THREE.Group();
    g.add(box(6.4, 2.7, 2.5, M.white, 0, 1.95, 0));
    g.add(box(2.1, 2.2, 2.4, M.white, -4.4, 1.6, 0));
    g.add(box(.05, .8, 2.0, new THREE.MeshStandardMaterial({ color: 0x0e1726, roughness: .2, metalness: .5 }), -5.47, 2.1, 0, false));
    g.add(box(8.4, .25, 2.2, M.steelDark, -1.1, .62, 0));
    [[-4.3, 1], [-4.3, -1], [1.2, 1], [1.2, -1], [2.5, 1], [2.5, -1]].forEach(([wx, wz]) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, .35, 20), M.tyre); t.rotation.x = Math.PI / 2; t.position.set(wx, .48, wz * 1.08); t.castShadow = true; g.add(t);
    });
    g.position.set(x, 0, z); g.rotation.y = rot; return g;
  }

  // Z1 recepción
  addEquip(truck(-20, -16.2, Math.PI / 2), 1.0);
  addEquip(pallet(-22, -9), 1.1); addEquip(pallet(-20.4, -9.2, 'crate', 2), 1.15); addEquip(pallet(-22, 1.5), 1.2); addEquip(pallet(-20.4, 1.5, 'crate', 4), 1.25);
  addEquip(table(-18.4, -0.8, 2.2, 1.1, Math.PI / 2), 1.3);
  addEquip(box(1.6, .12, 1.6, M.steelDark, -20, .1, -4.8), 1.3);
  // Z2 almacén
  addEquip(rack(-15, -9, -10.2), 1.2); addEquip(rack(-15, -9, -.4), 1.3); addEquip(rack(-15, -9, 3.6), 1.4);
  // Z3 proceso
  [-5.6, -3, -.4].forEach((x, i) => addEquip(tank(x, -9.6), 1.3 + i * .08));
  addEquip(table(-4.2, -1.6), 1.5); addEquip(table(-.6, -1.6), 1.55); addEquip(table(3.2, -1.6), 1.6);
  addEquip(table(4.6, -9.6, 2.4, 1, Math.PI / 2), 1.6);
  addEquip(conveyor(2.6, 14.6, -5), 1.55);
  // Z4 envasado (alto cuidado)
  addEquip(machine(15.2, -5), 1.7); addEquip(table(11.2, -9.4), 1.72); addEquip(table(14.4, -9.4), 1.74); addEquip(table(12.6, -.6), 1.76);
  // Z5 producto terminado y despacho
  addEquip(coldRoom(18, 23.4, -11.6, -7.8), 1.8);
  addEquip(pallet(19, 1.6, 'carton'), 1.85); addEquip(pallet(21.4, 1.6, 'carton', 2), 1.9); addEquip(pallet(19, -1.2, 'carton', 4), 1.92);
  addEquip(truck(31.6, -4, Math.PI), 1.95);
  // franja de personal: bancas y casilleros
  addEquip(box(5, 2, .5, M.steelDark, -19, 1, 11.5), 1.4); addEquip(box(4, .45, .4, M.white, -19, .3, 9.6), 1.45);
  addEquip(box(1.4, .9, .6, M.steel, -7, .45, 11.4), 1.5); addEquip(box(1.4, .9, .6, M.steel, 9.8, .45, 11.4), 1.5);
  addEquip(table(1, 10.6, 3.2, .9), 1.55);

  // personas
  const people = [];
  const personGeo = new THREE.CapsuleGeometry(.26, .95, 4, 12);
  const headGeo = new THREE.SphereGeometry(.2, 16, 12);
  const personMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x9cc3f5, roughness: .6 });
  [[-19.5, -2.5, 'x'], [-12, -2.4, 'z'], [-3.4, -3.3, 'x'], [1.6, -.6, 'x'], [-2, -7.6, 'x'], [11.6, -3.2, 'z'], [13.2, -7.6, 'x'], [20.2, -3, 'z'], [-16, 9.2, 'x']]
    .forEach(([x, z, ax], i) => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(personGeo, personMat); b.position.y = .75; b.castShadow = true; g.add(b);
      const h = new THREE.Mesh(headGeo, capMat); h.position.y = 1.62; h.castShadow = true; g.add(h);
      g.position.set(x, 0, z); g.userData = { x, z, ax, sp: .35 + (i % 4) * .12, ph: i * 1.7 };
      root.add(g); people.push(g); reg(g, 'drop', 2.0 + i * .04);
    });

  /* flujos */
  const flows = {};
  Object.entries(FLOWS).forEach(([k, f], idx) => {
    const curve = new THREE.CatmullRomCurve3(f.pts.map(([x, z]) => new THREE.Vector3(x, .42, z)), false, 'catmullrom', .25);
    const len = curve.getLength();
    let obj;
    if (k === 'producto') {
      const geo = new THREE.TubeGeometry(curve, 360, .11, 10, false);
      obj = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: f.color, transparent: true, opacity: .95, toneMapped: false }));
      obj.userData.total = geo.index.count;
      geo.setDrawRange(0, 0);
    } else {
      const n = Math.round(len / .55), pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const p = curve.getPointAt(i / (n - 1)); pos.set([p.x, p.y, p.z], i * 3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      obj = new THREE.Points(geo, new THREE.PointsMaterial({ color: f.color, size: k === 'residuos' ? .34 : .3, transparent: true, opacity: .95, depthWrite: false, toneMapped: false }));
      obj.userData.total = n; geo.setDrawRange(0, 0);
    }
    root.add(obj);
    flows[k] = { obj, curve, len, delay: 2.0 + idx * .25 };
  });
  // partículas de producto (brillo)
  const NP = small ? 10 : 18;
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: glowTexture(), color: 0x9cc8ff, size: 1.5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 }));
  root.add(particles);

  /* cotas */
  const dims = new THREE.Group(); root.add(dims);
  function dimLine(a, b, tickDir) {
    const pts = [a, b];
    const t = tickDir.clone().multiplyScalar(.6);
    pts.push(a.clone().sub(t), a.clone().add(t), b.clone().sub(t), b.clone().add(t));
    const g = new THREE.BufferGeometry().setFromPoints([pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]]);
    dims.add(new THREE.LineSegments(g, M.dim));
  }
  dimLine(new THREE.Vector3(-24, .05, 14.6), new THREE.Vector3(24, .05, 14.6), new THREE.Vector3(0, 0, 1));
  dimLine(new THREE.Vector3(-27, .05, -12), new THREE.Vector3(-27, .05, 12), new THREE.Vector3(1, 0, 0));

  /* anclas para etiquetas HTML */
  const anchors = {
    z1: new THREE.Vector3(-20, 3.4, -4), z2: new THREE.Vector3(-12, 3.4, -6), z3: new THREE.Vector3(0, 4.4, -4),
    z4: new THREE.Vector3(12.5, 3.4, -8.5), z5: new THREE.Vector3(20.5, 3.4, 3), zp: new THREE.Vector3(-1, 3.2, 9),
    producto: new THREE.Vector3(-12, .5, -4.8), personal: new THREE.Vector3(-17, .5, 9), residuos: new THREE.Vector3(0, .5, -15.5),
    largo: new THREE.Vector3(0, .1, 14.6), ancho: new THREE.Vector3(-27, .1, 0),
  };

  /* estado y cámara */
  const S = { p: 0, hover: null, walls: 1, dims: 0, lit: Array(6).fill(.55), flowEmph: 0 };
  const cam = { r: 104, pol: 1.0, az: -.75, tx: 1.5, tz: -1 };
  const user = { az: 0, pol: 0, taz: 0, tpol: 0 };
  const KEYS = [
    { r: 122, pol: .98, az: -.62, tx: 1.5, tz: -1 },
    { r: 122, pol: .8, az: -.3, tx: 1, tz: -1.5 },
    { r: 118, pol: .62, az: -.06, tx: 0, tz: -1.5 },
    { r: 132, pol: .015, az: 0, tx: 0, tz: .8 },
  ];
  let W = 1, Hh = 1, offsetX = 0, offsetY = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); Hh = Math.max(1, r.height);
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh;
    camera.fov = W / Hh < .8 ? 40 : W / Hh < 1.2 ? 32 : 26;
    camera.updateProjectionMatrix();
  }
  resize();

  let t0 = performance.now(), last = t0, running = true, raf = 0, introDone = reduce;
  const v = new THREE.Vector3();
  const labelOut = {};

  function applyIntro(t) {
    let all = true;
    for (const it of intro) {
      const k = (t - it.delay) / (it.kind === 'wall' ? .9 : it.kind === 'floor' ? .7 : .8);
      if (k < 1) all = false;
      if (it.kind === 'wall') { it.obj.scale.y = Math.max(.0001, ease(k)) * S.walls; it.obj.visible = k > 0; }
      else if (it.kind === 'floor') { const e = ease(k); it.obj.scale.set(Math.max(.0001, e), 1, Math.max(.0001, e)); it.obj.visible = k > 0; }
      else { const e = easeBack(k); it.obj.position.y = it.base + (1 - e) * 7; it.obj.visible = k > 0; }
    }
    for (const f of Object.values(flows)) {
      const k = ease((t - f.delay) / 1.4); f.obj.geometry.setDrawRange(0, Math.floor(f.obj.userData.total * k / 3) * 3 || 0);
      if (k < 1) all = false;
    }
    particles.material.opacity = smooth(3.2, 4, t);
    return all;
  }
  function finishIntro() {
    for (const it of intro) { it.obj.visible = true; if (it.kind === 'floor') it.obj.scale.set(1, 1, 1); else if (it.kind === 'drop') it.obj.position.y = it.base; }
    for (const f of Object.values(flows)) f.obj.geometry.setDrawRange(0, Infinity);
    particles.material.opacity = 1;
  }
  if (reduce) finishIntro();

  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, .05); last = now;
    const t = Math.max(0, (now - t0) / 1000); // el sello de rAF puede ser anterior a t0
    if (!introDone) introDone = applyIntro(t);

    // objetivo de cámara según el avance del scroll (0..1, cuatro tramos)
    const seg = clamp(S.p) * 3, i = Math.min(2, Math.floor(seg)), f = smooth(0, 1, seg - i);
    const A = KEYS[i], B = KEYS[i + 1];
    const portrait = W / Hh < .8;
    if (portrait) { KEYS[3].az = Math.PI / 2; KEYS[3].r = 150; } else { KEYS[3].az = 0; KEYS[3].r = 132; } // en vertical el plano gira 90°
    const idle = (reduce || S.p > .02) ? 0 : Math.sin(t * .12) * .12;
    const target = { r: lerp(A.r, B.r, f), pol: lerp(A.pol, B.pol, f), az: lerp(A.az, B.az, f) + idle, tx: lerp(A.tx, B.tx, f), tz: lerp(A.tz, B.tz, f) };
    const intro0 = reduce ? 1 : ease(t / 3.2);
    target.r += (1 - intro0) * 26; target.az -= (1 - intro0) * .5;
    const k = reduce ? 1 : 1 - Math.pow(.0015, dt);
    for (const key in target) cam[key] = lerp(cam[key], target[key], k);
    user.az = lerp(user.az, user.taz, 1 - Math.pow(.002, dt)); user.pol = lerp(user.pol, user.tpol, 1 - Math.pow(.002, dt));
    const pol = clamp(cam.pol + user.pol * (1 - smooth(.66, 1, S.p)), .01, 1.3), az = cam.az + user.az;
    camera.position.set(cam.tx + cam.r * Math.sin(pol) * Math.sin(az), cam.r * Math.cos(pol), cam.tz + cam.r * Math.sin(pol) * Math.cos(az));
    camera.up.set(0, 1, 0);
    if (pol < .05) camera.up.set(Math.sin(az) * -1, 0, -Math.cos(az)); // vista en planta
    camera.lookAt(cam.tx, 0, cam.tz);
    // desplazar el encuadre a la derecha en escritorio (el texto va a la izquierda)
    const off = (opts.offset ? opts.offset(S.p) : { x: 0, y: 0 });
    offsetX = lerp(offsetX, off.x, k); offsetY = lerp(offsetY, off.y, k);
    if (Math.abs(offsetX) > .5 || Math.abs(offsetY) > .5) camera.setViewOffset(W, Hh, -offsetX, -offsetY, W, Hh); else camera.clearViewOffset();

    // estado de escena por tramo
    const pZ = smooth(.2, .45, S.p), pF = smooth(.45, .62, S.p) * (1 - smooth(.8, .95, S.p)), pP = smooth(.7, .95, S.p);
    S.walls = lerp(1, .32, Math.max(pF * .6, pP));
    if (introDone) walls.forEach(w => { w.scale.y = S.walls; });
    M.dim.opacity = pP * .9;
    ZONES.forEach((zn, zi) => {
      const lit = S.hover ? (S.hover === zn.id ? 1 : .15) : lerp(.4, .6, pZ) + (zi < 5 ? smooth(.2 + zi * .045, .26 + zi * .045, S.p) * .32 : pZ * .15);
      S.lit[zi] = lerp(S.lit[zi], lit, 1 - Math.pow(.001, dt));
      const m = zoneMeshes[zn.id];
      m.material.emissiveIntensity = S.lit[zi] * .55;
      m.material.color.copy(m.userData.color).lerp(new THREE.Color(0xcfd6de), 1 - clamp(S.lit[zi] * 1.6));
      m.position.y = .03 + (S.hover === zn.id ? .12 : 0);
    });
    const fe = .55 + pF * .45;
    flows.producto.obj.material.opacity = fe;
    ['personal', 'alto', 'residuos'].forEach(k2 => { flows[k2].obj.material.opacity = .45 + pF * .55; flows[k2].obj.material.size = (k2 === 'residuos' ? .34 : .3) * (1 + pF * .5); });

    // partículas a lo largo del flujo de producto
    if (!reduce || !introDone) {
      const arr = pGeo.attributes.position.array;
      for (let n = 0; n < NP; n++) { const u = clamp((((reduce ? 0 : t * .035) + n / NP) % 1 + 1) % 1); flows.producto.curve.getPointAt(u, v); arr[n * 3] = v.x; arr[n * 3 + 1] = v.y + .02; arr[n * 3 + 2] = v.z; }
      pGeo.attributes.position.needsUpdate = true;
    }
    // personas caminando
    if (!reduce) people.forEach(g => { const d = g.userData, s = Math.sin(t * d.sp + d.ph) * .9; if (d.ax === 'x') g.position.x = d.x + s; else g.position.z = d.z + s; });

    renderer.render(scene, camera);

    // proyección de etiquetas
    for (const key in anchors) {
      v.copy(anchors[key]); v.y *= (key.startsWith('z') ? Math.max(.45, S.walls) : 1); v.project(camera);
      labelOut[key] = { x: (v.x * .5 + .5) * W, y: (-v.y * .5 + .5) * Hh, vis: v.z < 1 };
    }
    opts.onFrame && opts.onFrame(labelOut, S);
  }
  function loop(now) {
    if (!running) return;
    try { frame(now); } catch (e) { running = false; console.error(e); opts.onError && opts.onError(e); return; }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  /* interacción: arrastrar para girar (solo mouse, para no bloquear el scroll táctil) */
  let drag = null;
  canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; drag = { x: e.clientX, y: e.clientY, az: user.taz, pol: user.tpol }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('grab'); });
  canvas.addEventListener('pointermove', e => {
    if (drag) { user.taz = clamp(drag.az - (e.clientX - drag.x) * .006, -1.4, 1.4); user.tpol = clamp(drag.pol - (e.clientY - drag.y) * .004, -.5, .3); return; }
    if (e.pointerType === 'mouse') pick(e);
  });
  const end = () => { drag = null; canvas.classList.remove('grab'); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (!drag) setHover(null, true); });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(Object.values(zoneMeshes), false)[0];
    setHover(hit ? hit.object.userData.zone : null, true);
  }
  function setHover(id, fromCanvas) { if (S.hover === id) return; S.hover = id; opts.onHover && opts.onHover(id, fromCanvas); }

  return {
    canvas,
    setProgress(p) { S.p = p; },
    highlight(id) { setHover(id, false); },
    resize,
    pause() { running = false; cancelAnimationFrame(raf); },
    resume() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); },
    renderOnce() { frame(performance.now()); },
    ZONES,
  };
}
