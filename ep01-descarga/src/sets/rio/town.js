// Miniaturas da cidade: casas brasileiras (telhado de duas águas, caixa d'água), rua, postes, carro e a ETE em miniatura.
import * as L from '../../lib.js';
import { G, TM, Merge, vmat, circlePts, Bubbles } from './util.js';
const { THREE, TAU, PAL, lerp } = L;
const HP = Math.PI / 2;

/* ---------- casa (porta voltada para +x; cumeeira ao longo de z) ---------- */
const HW = 2.3, HD = 2.2, WH = 1.4, RH = 2.2;
export function makeHouse(o = {}) {
  const g = new THREE.Group(), m = new Merge(), gl = new Merge();
  const wall = o.wall ?? PAL.wall, roof = o.roof ?? PAL.roof, trim = '#ffffff', roofDark = new THREE.Color(roof).multiplyScalar(0.78);
  m.add(G.rbox(HD + 0.3, 0.12, HW + 0.3, 0.02), PAL.concreteDark, TM(0, 0.06, 0));
  m.add(G.extrude([[-HD / 2, 0.1], [HD / 2, 0.1], [HD / 2, WH], [0, RH], [-HD / 2, WH]], HW), wall, TM(0, 0, -HW / 2));
  m.add(G.box(HD + 0.02, 0.16, HW + 0.02), new THREE.Color(wall).multiplyScalar(0.7), TM(0, 0.2, 0));  // rodapé pintado
  const sl = Math.hypot(HD / 2, RH - WH), ang = Math.atan2(RH - WH, HD / 2), ov = 0.28;
  [1, -1].forEach((s) => {
    const R = TM(s * (HD / 4 + ov * 0.5 * Math.cos(ang)), (WH + RH) / 2 - ov * 0.5 * Math.sin(ang) + 0.05, 0, 0, 0, -s * ang);
    m.add(G.box(sl + ov, 0.07, HW + 0.44), roof, R);
    for (let i = 0; i < 12; i++) m.add(G.cyl(0.045, 0.045, sl + ov, 6), i % 2 ? roof : roofDark, R.clone().multiply(TM(0, 0.035, -HW / 2 - 0.16 + (i + 0.5) * ((HW + 0.32) / 12), 0, 0, HP)));
  });
  m.add(G.cyl(0.075, 0.075, HW + 0.46, 8), roofDark, TM(0, RH + 0.1, 0, HP, 0, 0));
  // porta e janelas da frente
  const fx = HD / 2;
  m.add(G.box(0.05, 1.02, 0.62), trim, TM(fx, 0.61, 0.5)).add(G.rbox(0.07, 0.94, 0.5, 0.015), o.door ?? '#7a4b2a', TM(fx + 0.01, 0.58, 0.5)).add(G.sph(0.03, 8, 6), '#e8c15a', TM(fx + 0.06, 0.58, 0.32));
  m.add(G.rbox(0.36, 0.08, 0.8, 0.015), PAL.concrete, TM(fx + 0.2, 0.05, 0.5));
  const win = (M, w = 0.72, h = 0.58) => {
    m.add(G.box(0.05, h + 0.1, w + 0.1), trim, M).add(G.box(0.1, 0.05, w + 0.18), trim, M.clone().multiply(TM(0.02, -h / 2 - 0.06, 0)));
    gl.add(G.box(0.07, h, w), '#7fc6e8', M);
    m.add(G.box(0.085, h, 0.035), trim, M).add(G.box(0.085, 0.035, w), trim, M);
  };
  win(TM(fx, 0.9, -0.56), 0.66);
  win(TM(0.2, 0.9, HW / 2, 0, -HP, 0), 0.6, 0.5); win(TM(-0.3, 0.9, -HW / 2, 0, HP, 0), 0.6, 0.5); win(TM(-fx, 0.9, 0.4, 0, Math.PI, 0), 0.6, 0.5);
  m.add(G.cyl(0.14, 0.14, 0.03, 12), trim, TM(0, 1.82, HW / 2 + 0.005, HP, 0, 0));                 // óculo da empena
  // caixa d'água numa torre, nos fundos
  const tx = -fx - 0.42, tz = -HW / 2 + 0.45;
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => m.add(G.box(0.06, 2.1, 0.06), PAL.concrete, TM(tx + a * 0.22, 1.05, tz + b * 0.22)));
  m.beam([tx - 0.22, 1.0, tz - 0.22], [tx + 0.22, 1.0, tz - 0.22], 0.04, 0.04, PAL.concrete).beam([tx - 0.22, 1.0, tz + 0.22], [tx + 0.22, 1.0, tz + 0.22], 0.04, 0.04, PAL.concrete);
  m.add(G.rbox(0.62, 0.07, 0.62, 0.015), PAL.concrete, TM(tx, 2.12, tz));
  m.add(G.lathe([[0, 0], [0.24, 0], [0.275, 0.06], [0.285, 0.3], [0.265, 0.36], [0.285, 0.38], [0.27, 0.41], [0.1, 0.47], [0, 0.48]], 16), '#2a6fd4', TM(tx, 2.155, tz));
  m.rod([tx + 0.2, 2.2, tz], [tx + 0.2, 1.3, tz], 0.02, '#8f9aa5', 6).rod([tx + 0.2, 1.3, tz], [-fx, 1.3, tz], 0.02, '#8f9aa5', 6);
  // muro baixo do lote e portão
  const lx0 = -fx - 0.95, lx1 = fx + 0.55, lz = HW / 2 + 0.22, mc = '#e9e4d6';
  m.add(G.box(lx1 - lx0, 0.42, 0.07), mc, TM((lx0 + lx1) / 2, 0.21, lz)).add(G.box(lx1 - lx0, 0.42, 0.07), mc, TM((lx0 + lx1) / 2, 0.21, -lz)).add(G.box(0.07, 0.42, lz * 2), mc, TM(lx0, 0.21, 0));
  m.add(G.box(0.07, 0.42, lz - 0.85 + 0.5), mc, TM(lx1, 0.21, -(lz + 0.35) / 2 - 0.02)).add(G.box(0.07, 0.42, 0.35), mc, TM(lx1, 0.21, lz - 0.17));
  [0.14, 0.86].forEach((z) => m.add(G.box(0.1, 0.62, 0.1), mc, TM(lx1, 0.31, z)));
  for (let i = 0; i < 5; i++) m.add(G.box(0.025, 0.46, 0.025), o.door ?? '#7a4b2a', TM(lx1, 0.27, 0.26 + i * 0.12));
  g.add(m.mesh(vmat({ roughness: 0.75 })), gl.mesh(vmat({ roughness: 0.12, metalness: 0.2, emissive: '#3b6f8c', emissiveIntensity: 0.35 })));
  if (o.bathroom) g.add(makeBathroom());
  g.userData.lot = [lx0, lx1, lz];
  return g;
}
/** banheiro em corte anexo à casa (lado +z): piso de azulejo, meia-parede, vaso sanitário branco */
function makeBathroom() {
  const m = new Merge(), z0 = HW / 2, w = 1.15, d = 1.0, x0 = -0.75;
  m.add(G.box(w, 0.1, d), '#bfe0ee', TM(x0 + w / 2, 0.12, z0 + d / 2));
  for (let i = 1; i < 5; i++) m.add(G.box(0.012, 0.012, d), '#ffffff', TM(x0 + (i * w) / 5, 0.175, z0 + d / 2)).add(G.box(w, 0.012, 0.012), '#ffffff', TM(x0 + w / 2, 0.175, z0 + (i * d) / 5));
  m.add(G.box(0.08, 1.15, d), PAL.cut, TM(x0, 0.68, z0 + d / 2)).add(G.box(0.08, 1.15, d), PAL.cut, TM(x0 + w, 0.68, z0 + d / 2));
  m.add(G.box(w, 0.9, 0.03), '#d6edf5', TM(x0 + w / 2, 0.62, z0 + 0.02));
  const tx = x0 + 0.5, tz = z0 + 0.42;
  m.add(G.lathe([[0.07, 0], [0.1, 0.02], [0.085, 0.12], [0.13, 0.26], [0.17, 0.33], [0.18, 0.36], [0.13, 0.36], [0.1, 0.3], [0, 0.26]], 16), PAL.ceramic, TM(tx, 0.17, tz + 0.08, 0, 0, 0, 1, 1, 1.25));
  m.add(G.rbox(0.36, 0.34, 0.15, 0.03), PAL.ceramic, TM(tx, 0.62, tz - 0.25)).add(G.rbox(0.38, 0.03, 0.17, 0.012), PAL.ceramic, TM(tx, 0.8, tz - 0.25));
  m.add(G.torus(0.15, 0.025, 6, 20), '#e9eef2', TM(tx, 0.54, tz + 0.08, HP, 0, 0, 1, 1.25, 1));
  m.rod([tx, 0.17, tz + 0.08], [tx, -0.25, tz + 0.08], 0.05, PAL.pvc, 8);
  return m.mesh(vmat({ roughness: 0.4 }));
}

/* ---------- rua (ao longo de z, de z0 a z1), calçadas, tampas de PV, postes ---------- */
export function makeStreet(z0, z1) {
  const g = new THREE.Group(), m = new Merge(), len = z1 - z0, zc = (z0 + z1) / 2;
  m.add(G.box(2.0, 0.06, len), PAL.asphalt, TM(0, 0.03, zc));
  m.add(G.cyl(1.0, 1.0, 0.06, 20, false), PAL.asphalt, TM(0, 0.03, z0));                    // balão de retorno
  [1, -1].forEach((s) => m.add(G.rbox(0.5, 0.11, len, 0.02), PAL.sidewalk, TM(s * 1.25, 0.055, zc)).add(G.box(0.05, 0.115, len), PAL.concreteDark, TM(s * 0.99, 0.058, zc)));
  for (let z = z0 + 0.5; z < z1 - 0.4; z += 0.9) m.add(G.box(0.06, 0.01, 0.45), '#f1d04a', TM(0, 0.064, z));
  for (let z = z0 + 1.2; z < z1; z += 3.0) m.add(G.cyl(0.2, 0.2, 0.02, 14), PAL.iron, TM(0.45, 0.066, z)).add(G.torus(0.2, 0.025, 6, 16), '#2e353c', TM(0.45, 0.07, z, HP, 0, 0));
  const lamps = new Merge();
  for (let i = 0; i < 3; i++) {
    const z = z0 + 1.4 + i * 3.1, s = i % 2 ? 1 : -1, x = s * 1.3;
    m.add(G.cyl(0.028, 0.045, 2.3, 8), '#56616b', TM(x, 1.15, z)).add(G.cyl(0.06, 0.07, 0.16, 8), '#56616b', TM(x, 0.16, z));
    m.add(G.torus(0.3, 0.024, 6, 10, HP), '#56616b', TM(x - s * 0.3, 2.3, z, 0, s > 0 ? 0 : Math.PI, 0));
    m.add(G.rbox(0.34, 0.06, 0.14, 0.025), '#3d464e', TM(x - s * 0.45, 2.58, z));
    lamps.add(G.box(0.24, 0.02, 0.1), '#fff3c4', TM(x - s * 0.45, 2.545, z));
  }
  g.add(m.mesh(vmat({ roughness: 0.85 })), L.mesh(lamps.geo(), L.glow('#ffe9a8', 1.2, { vertexColors: false }), 0, 0, 0, { cast: false }));
  return g;
}

/* ---------- carro ---------- */
export function makeCar(color = '#d8433a') {
  const m = new Merge(), gl = new Merge(), g = new THREE.Group(), w = 0.66;
  m.add(G.extrude([[-0.8, 0.14], [0.78, 0.14], [0.8, 0.3], [0.74, 0.4], [0.42, 0.44], [-0.72, 0.46], [-0.8, 0.4]], w - 0.04, 0.02), color, TM(0, 0, -w / 2 + 0.02));
  gl.add(G.extrude([[-0.6, 0.45], [0.36, 0.44], [0.14, 0.7], [-0.44, 0.71]], w - 0.1, 0.01), '#22303a', TM(0, 0, -w / 2 + 0.05));
  m.add(G.rbox(0.56, 0.035, w - 0.08, 0.015), color, TM(-0.15, 0.72, 0));
  [[-0.5, 1], [0.5, 1], [-0.5, -1], [0.5, -1]].forEach(([x, s]) => m.add(G.cyl(0.15, 0.15, 0.12, 14), '#1b1f23', TM(x, 0.15, s * (w / 2 - 0.03), HP, 0, 0)).add(G.cyl(0.08, 0.08, 0.13, 10), '#c9d1d7', TM(x, 0.15, s * (w / 2 - 0.03), HP, 0, 0)));
  [1, -1].forEach((s) => m.add(G.sph(0.045, 8, 6), '#fff6cf', TM(0.79, 0.33, s * 0.22)).add(G.box(0.03, 0.06, 0.12), '#a31f1f', TM(-0.81, 0.36, s * 0.22)));
  g.add(m.mesh(vmat({ roughness: 0.3, metalness: 0.3 })), gl.mesh(vmat({ roughness: 0.1, metalness: 0.4 })));
  return g;
}

/* ---------- ETE em miniatura ---------- */
function clarifier(root, x, z, r, waterColor, phase = 0) {
  const g = L.group(root, x, 0, z), m = new Merge();
  m.add(G.lathe([[r, -0.3], [r, 0.5], [r + 0.16, 0.5], [r + 0.16, 0.42], [r + 0.2, 0.36], [r + 0.2, -0.3]], 40), PAL.concrete);
  m.add(G.lathe([[r - 0.2, 0.2], [r - 0.2, 0.44], [r - 0.17, 0.44], [r - 0.17, 0.2]], 40), PAL.steel);            // vertedor
  m.add(G.cyl(0.11, 0.11, 0.9, 12), PAL.concreteDark, TM(0, 0.2, 0)).add(G.cyl(0.42, 0.42, 0.34, 20, true), PAL.steel, TM(0, 0.42, 0));
  g.add(m.mesh(vmat({ roughness: 0.8 })));
  const w = L.mesh(new THREE.CircleGeometry(r - 0.005, 40), L.water(waterColor, 0.93, { roughness: 0.15 }), 0, 0.37, 0, { cast: false }); w.rotation.x = -HP; g.add(w);
  // ponte raspadora giratória com guarda-corpo e acionamento
  const br = L.group(g, 0, 0, 0), b = new Merge(), L1 = r + 0.1;
  b.add(G.box(L1, 0.05, 0.3), '#9aa7b1', TM(L1 / 2, 0.62, 0)).rail([0, 0.645, 0.14], [L1, 0.645, 0.14], 0.26).rail([0, 0.645, -0.14], [L1, 0.645, -0.14], 0.26);
  b.add(G.rbox(0.3, 0.24, 0.26, 0.03), '#2f7fd6', TM(0, 0.78, 0)).add(G.cyl(0.07, 0.07, 0.2, 10), '#3d464e', TM(0, 0.98, 0));
  b.add(G.rbox(0.2, 0.2, 0.34, 0.03), '#3d464e', TM(L1 - 0.02, 0.56, 0)).add(G.cyl(0.07, 0.07, 0.36, 10), '#1b1f23', TM(L1 + 0.02, 0.53, 0, HP, 0, 0));
  b.beam([0.15, 0.6, 0], [0.15, 0.38, 0], 0.03, 0.03, '#7f8b95').beam([L1 * 0.6, 0.6, 0], [L1 * 0.6, 0.38, 0], 0.03, 0.03, '#7f8b95').beam([0.1, 0.4, 0], [r - 0.3, 0.4, 0], 0.025, 0.05, '#7f8b95');
  br.add(b.mesh(vmat({ roughness: 0.5, metalness: 0.3 })));
  return (t) => { br.rotation.y = phase + t * 0.35; };
}
export function makeETE(x0, x1, z0, z1) {
  const g = new THREE.Group(), m = new Merge(), ups = [], cx = -6;
  // gradeamento / chegada
  m.add(G.extrude([[-0.75, -0.55], [0.75, -0.55], [0.75, 0.55], [-0.75, 0.55]], 0.55, 0, [[[-0.55, -0.32], [-0.55, 0.32], [0.55, 0.32], [0.55, -0.32]]]), PAL.concrete, TM(cx, 0.45, -11.55, HP, 0, 0));
  for (let i = 0; i < 9; i++) m.beam([cx - 0.5 + i * 0.125, 0.0, -11.75], [cx - 0.5 + i * 0.125, 0.62, -11.5], 0.02, 0.02, '#56616b');
  m.add(G.rbox(1.2, 0.1, 0.14, 0.02), '#2f7fd6', TM(cx, 0.66, -11.48)).add(G.rbox(0.26, 0.3, 0.22, 0.03), '#2f7fd6', TM(cx + 0.55, 0.82, -11.48));
  m.add(G.extrude([[-0.45, 0], [0.45, 0], [0.55, 0.45], [-0.55, 0.45]], 0.55, 0.01), '#e0a020', TM(cx + 1.5, 0.02, -11.85));               // caçamba
  // tanque de aeração
  const ax = -4.3, az = -7.9, aw = 4.4, ad = 2.3;
  m.add(G.extrude([[-aw / 2, -ad / 2], [aw / 2, -ad / 2], [aw / 2, ad / 2], [-aw / 2, ad / 2]], 0.9, 0, [[[-aw / 2 + 0.16, -ad / 2 + 0.16], [-aw / 2 + 0.16, ad / 2 - 0.16], [aw / 2 - 0.16, ad / 2 - 0.16], [aw / 2 - 0.16, -ad / 2 + 0.16]]]), PAL.concrete, TM(ax, 0.6, az, HP, 0, 0));
  m.add(G.box(0.12, 0.55, ad - 0.3), PAL.concrete, TM(ax, 0.32, az));
  m.add(G.box(aw + 0.1, 0.045, 0.34), '#9aa7b1', TM(ax, 0.64, az)).rail([ax - aw / 2, 0.66, az + 0.16], [ax + aw / 2, 0.66, az + 0.16], 0.26).rail([ax - aw / 2, 0.66, az - 0.16], [ax + aw / 2, 0.66, az - 0.16], 0.26);
  m.rod([ax - aw / 2 - 0.3, 0.72, az - ad / 2 - 0.12], [ax + aw / 2, 0.72, az - ad / 2 - 0.12], 0.06, '#2f7fd6', 10);                           // coletor de ar
  for (let i = 0; i < 6; i++) { const x = ax - aw / 2 + 0.45 + i * 0.7; m.rod([x, 0.72, az - ad / 2 - 0.12], [x, 0.72, az - ad / 2 + 0.3], 0.035, '#2f7fd6', 8).rod([x, 0.72, az - ad / 2 + 0.3], [x, 0.3, az - ad / 2 + 0.3], 0.035, '#2f7fd6', 8); }
  m.add(G.rbox(0.9, 0.7, 0.8, 0.04), '#e9e4d6', TM(ax - aw / 2 - 0.75, 0.35, az - ad / 2 - 0.1)).add(G.box(1.0, 0.06, 0.9), '#7f8b95', TM(ax - aw / 2 - 0.75, 0.72, az - ad / 2 - 0.1));   // casa dos sopradores
  for (let i = 0; i < 4; i++) m.add(G.box(0.5, 0.025, 0.02), '#56616b', TM(ax - aw / 2 - 0.75, 0.25 + i * 0.09, az - ad / 2 + 0.31));
  // digestor + queimador de biogás
  const dx = -2.3, dz = -10.75;
  m.add(G.lathe([[0, 0], [0.92, 0], [0.98, 0.2], [0.98, 1.25], [0.9, 1.55], [0.62, 1.85], [0.25, 1.98], [0.25, 2.1], [0, 2.1]], 28), '#dfe3e6', TM(dx, 0, dz));
  [0.45, 1.1].forEach((y) => m.add(G.torus(0.99, 0.03, 6, 28), PAL.steel, TM(dx, y, dz, HP, 0, 0)));
  m.rod([dx, 2.05, dz], [dx + 0.9, 2.05, dz - 0.5], 0.035, '#e0a020', 8).rod([dx + 0.9, 2.05, dz - 0.5], [dx + 0.9, 0.1, dz - 0.5], 0.035, '#e0a020', 8);
  for (let i = 0; i < 8; i++) m.beam([dx + 0.99, 0.2 + i * 0.22, dz + 0.5], [dx + 0.99, 0.2 + i * 0.22, dz + 0.75], 0.02, 0.02, '#56616b');
  m.rod([dx + 0.99, 0, dz + 0.5], [dx + 0.99, 1.9, dz + 0.5], 0.015, '#56616b', 6).rod([dx + 0.99, 0, dz + 0.75], [dx + 0.99, 1.9, dz + 0.75], 0.015, '#56616b', 6);
  const fl = [dx + 1.25, 0, dz - 1.1];
  m.add(G.cyl(0.05, 0.07, 2.4, 8), PAL.steel, TM(fl[0], 1.2, fl[2])).add(G.cyl(0.11, 0.07, 0.26, 10, true), '#56616b', TM(fl[0], 2.5, fl[2])).add(G.cyl(0.16, 0.2, 0.1, 10), PAL.concreteDark, TM(fl[0], 0.05, fl[2]));
  // prédio administrativo
  const bx = -2.15, bz = -5.4;
  m.add(G.rbox(1.7, 1.0, 1.4, 0.03), '#f1ece0', TM(bx, 0.5, bz)).add(G.box(1.84, 0.1, 1.54), '#7f8b95', TM(bx, 1.05, bz)).add(G.box(1.72, 0.2, 1.42), '#2f7fd6', TM(bx, 0.12, bz));
  m.add(G.rbox(0.4, 0.75, 0.05, 0.01), '#3d6f9f', TM(bx - 0.45, 0.42, bz + 0.71)).add(G.rbox(0.45, 0.22, 0.3, 0.03), '#c9d1d7', TM(bx + 0.5, 1.2, bz - 0.3));
  const gl = new Merge(); gl.add(G.box(0.7, 0.4, 0.04), '#7fc6e8', TM(bx + 0.3, 0.62, bz + 0.705)).add(G.box(0.04, 0.4, 0.8), '#7fc6e8', TM(bx - 0.855, 0.62, bz));
  // tubulações aparentes entre unidades (com flanges)
  const pipe = (pts, r = 0.07, c = '#6f7c88') => { for (let i = 0; i < pts.length - 1; i++) { m.rod(pts[i], pts[i + 1], r, c, 10); m.add(G.sph(r * 1.05, 8, 6), c, TM(...pts[i + 1])); } const a = L.v3(pts[0]), b = L.v3(pts[1]); m.rod(a, a.clone().lerp(b, 0.04 / a.distanceTo(b)), r * 1.5, '#4d5964', 10); };
  pipe([[cx, 0.16, -11.0], [cx, 0.16, -10.3], [-7.3, 0.16, -10.0]]);
  pipe([[-7.3, 0.16, -8.9], [-6.9, 0.16, -8.1], [-6.6, 0.16, -8.1]]);
  pipe([[-6.5, 0.16, -7.2], [-7.2, 0.16, -6.6]]);
  pipe([[-7.4, 0.16, -4.8], [-6.2, 0.16, -4.2], [-5.6, 0.16, -3.9]], 0.08, '#2f7fd6');
  pipe([[-7.6, 0.14, -10.6], [-5, 0.14, -12.0], [-3.4, 0.14, -11.6]], 0.05, PAL.sludge);
  // cerca
  const post = (x, z) => m.add(G.box(0.05, 0.6, 0.05), '#56616b', TM(x, 0.3, z));
  const run = (a, b) => { const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.85); for (let i = 0; i <= n; i++) post(lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)); [0.55, 0.32, 0.1].forEach((y) => m.beam([a[0], y, a[1]], [b[0], y, b[1]], 0.014, 0.014, '#8b97a1')); };
  run([x0, z0], [cx - 0.9, z0]); run([cx + 0.9, z0], [x1, z0]); run([x1, z0], [x1, z1]); run([x1, z1], [x0, z1]); run([x0, z1], [x0, z0]);
  g.add(m.mesh(vmat({ roughness: 0.8 })), gl.mesh(vmat({ roughness: 0.12, metalness: 0.2, emissive: '#3b6f8c', emissiveIntensity: 0.3 })));
  // água da grade e da aeração
  const wq = (w, d, c, x, y, z) => { const q = L.mesh(new THREE.PlaneGeometry(w, d), L.water(c, 0.95, { roughness: 0.2 }), x, y, z, { cast: false }); q.rotation.x = -HP; g.add(q); return q; };
  wq(1.1, 0.64, PAL.sewage, cx, 0.3, -11.55); wq(aw - 0.3, ad - 0.3, PAL.haze, ax, 0.5, az);
  const bub = new Bubbles(110, { seed: 5, size: 0.05, rate: 1.1, material: L.mat('#f4fbf6', { roughness: 0.3 }), place: (q, u, d) => d.position.set(ax + (q.a - 0.5) * (aw - 0.5), 0.5 + 0.02 * Math.sin(u * Math.PI), az + (q.b - 0.5) * (ad - 0.5)) });
  g.add(bub.mesh);
  ups.push(clarifier(g, -8.7, -9.5, 1.45, PAL.murky, 0.4), clarifier(g, -8.5, -5.9, 1.5, PAL.clear, 2.2));
  // chama do queimador
  const flame = L.mesh(G.lathe([[0, 0], [0.09, 0.08], [0.11, 0.2], [0.06, 0.38], [0, 0.55]], 10), L.glow(PAL.flame, 2.2, { transparent: true, opacity: 0.92 }), fl[0], 2.56, fl[2], { cast: false });
  const flame2 = L.mesh(G.lathe([[0, 0], [0.05, 0.06], [0.055, 0.15], [0, 0.3]], 8), L.glow('#fff1a8', 2.6), fl[0], 2.58, fl[2], { cast: false });
  g.add(flame, flame2);
  const update = (t) => { ups.forEach((f) => f(t)); bub.update(t); flame.scale.set(1 + 0.12 * Math.sin(t * 17), 1 + 0.22 * Math.sin(t * 23 + 1) + 0.1 * Math.sin(t * 41), 1 + 0.12 * Math.cos(t * 19)); flame2.scale.y = 1 + 0.25 * Math.sin(t * 29 + 2); };
  return { group: g, update };
}
