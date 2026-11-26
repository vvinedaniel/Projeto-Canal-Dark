// Barragem: o aterro faz parte do relevo (relief.damY); aqui ficam as peças construídas — vertedouro de concreto
// (muros-guia, canal de aproximação, soleira, escada de degraus, bacia de dissipação com dentes e soleira terminal),
// ponte da crista sobre o vertedouro, guarda-corpos/defensas da crista, enrocamento em blocos junto à linha d'água,
// régua de nível no muro-guia. Também o MURO DE ARRIMO de gabiões do talude (margem → platô da ETA).
import * as L from '../../../lib.js';
import * as R from './relief.js';
import { stonesTex, canvas, tex } from './soil.js';
const { THREE, clamp01, lerp } = L;

/** forma (x,y) extrudada em z entre z0 e z1 */
function prism(pts, z0, z1) {
  const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, z0);
  return g;
}
const boxG = (x0, x1, y0, y1, z0, z1) => new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
function concreteTex() { // concreto com manchas, poros e marcas de fôrma (tábuas)
  const N = 512, [c, g] = canvas(N, N), rd = L.rng(1313);
  g.fillStyle = '#808080'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 900; i++) { const v = 110 + rd() * 40, r = 8 + rd() * 40; g.fillStyle = `rgba(${v},${v},${v},.14)`; g.beginPath(); g.ellipse(rd() * N, rd() * N, r, r * 0.7, rd() * 3, 0, L.TAU); g.fill(); }
  for (let i = 0; i < 9000; i++) { const v = rd() < 0.5 ? 60 : 170; g.fillStyle = `rgba(${v},${v},${v},${0.15 + rd() * 0.2})`; g.fillRect(rd() * N, rd() * N, 1 + rd() * 1.6, 1 + rd() * 1.6); }
  g.strokeStyle = 'rgba(40,40,40,.22)'; g.lineWidth = 1.5; for (let y = 0; y < N; y += N / 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); }
  const t = tex(c, { srgb: false }); return t;
}

export function buildDam(ctx) {
  const { Lo, scene } = ctx;
  const grp = new THREE.Group(); grp.name = 'terreno.dam'; scene.add(grp);
  const sp = R.SPILL, D = R.DAMG, crest = D.crest;
  const cTex = concreteTex(); cTex.repeat.set(0.25, 0.25);
  const conc = L.mat('#aaa79f', { roughness: 0.85, map: null });
  conc.onBeforeCompile = (sh) => {
    sh.uniforms.tCon = { value: cTex };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCWP; varying vec3 vCWN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vCWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tCon; varying vec3 vCWP; varying vec3 vCWN;')
      .replace('#include <map_fragment>', `{ vec3 an = abs(vCWN); vec2 uvc = an.y > 0.7 ? vCWP.xz : (an.x > an.z ? vCWP.zy : vCWP.xy); float cv = texture2D(tCon, uvc * 0.25).r; diffuseColor.rgb *= 0.7 + 0.6 * cv;
        float wet = (1.0 - smoothstep(${(Lo.LAKE.level + 0.05).toFixed(2)}, ${(Lo.LAKE.level + 0.5).toFixed(2)}, vCWP.y)) * step(vCWP.x, ${sp.sill1.toFixed(2)}); diffuseColor.rgb *= 1.0 - 0.35 * wet;
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.72, 0.76, 0.66), (1.0 - smoothstep(-2.0, 1.2, vCWP.y)) * 0.6); }`);
  };
  conc.customProgramCacheKey = () => 'ep3-concrete';
  const parts = [];

  /* ---------- vertedouro ---------- */
  const z0 = sp.z - sp.hw, z1 = sp.z + sp.hw, bot = -3.2;
  // laje/fundo: canal de aproximação → soleira arredondada → escada → bacia → soleira terminal
  const prof = [[sp.x0, bot], [sp.x0, sp.apron]];
  for (let i = 0; i <= 8; i++) { const k = i / 8; prof.push([sp.sill0 + 0.6 * k, lerp(sp.apron, sp.sill, Math.sin(k * Math.PI / 2))]); }
  prof.push([sp.sill1, sp.sill]);
  const n = sp.steps, dx = (sp.chute1 - sp.sill1) / n;
  for (let i = 0; i < n; i++) { const y = sp.sill - (sp.sill - sp.basinY) * (i + 1) / n; prof.push([sp.sill1 + i * dx, y], [sp.sill1 + (i + 1) * dx, y]); }
  prof.push([sp.basin1, sp.basinY], [sp.basin1, sp.endSill], [sp.end, sp.endSill], [sp.end + 0.6, Lo.RIVER_OUT.bed - 0.2], [sp.end + 0.6, bot]);
  parts.push(prism(prof.slice().reverse(), z0, z1));
  // dentes da bacia (blocos de dissipação) e dentes da soleira terminal
  for (let i = 0; i < 5; i++) { const zc = lerp(z0 + 0.7, z1 - 0.7, i / 4); parts.push(boxG(sp.chute1 + 1.6, sp.chute1 + 2.2, sp.basinY, sp.basinY + 0.55, zc - 0.3, zc + 0.3)); }
  for (let i = 0; i < 6; i++) { const zc = lerp(z0 + 0.5, z1 - 0.5, i / 5); parts.push(boxG(sp.basin1 + 0.05, sp.basin1 + 0.45, sp.endSill, sp.endSill + 0.3, zc - 0.25, zc + 0.25)); }
  // muros-guia (topo acompanha o aterro e desce com a escada)
  const wallTop = (x, zE) => Math.max(R.damY(x, zE), R.Hnat(x, zE), R.spillFloor(x) + 1.7) + 0.35;
  [[z0 - sp.wall, z0, z0 - sp.wall], [z1, z1 + sp.wall, z1 + sp.wall]].forEach(([a, b, zE]) => {
    const top = []; for (let x = sp.x0; x <= sp.end + 0.6 + 1e-6; x += 0.25) top.push([x, Math.min(crest + 0.45, wallTop(x, zE))]);
    parts.push(prism([[sp.x0, bot], [sp.end + 0.6, bot], ...top.reverse()], a, b));
    // pingadeira/coroamento do muro (friso)
  });
  // ponte da crista sobre o vertedouro (tabuleiro + vigas + guarda-corpo de concreto)
  const bx0 = D.c0 - 0.1, bx1 = D.c1 + 0.1, deckY = crest + 0.08;
  parts.push(boxG(bx0, bx1, deckY - 0.35, deckY, z0 - sp.wall - 0.2, z1 + sp.wall + 0.2));
  [bx0 + 0.5, bx1 - 0.5].forEach((x) => parts.push(boxG(x - 0.2, x + 0.2, deckY - 0.85, deckY - 0.35, z0 - 0.1, z1 + 0.1)));
  [bx0 + 0.08, bx1 - 0.08].forEach((x) => { parts.push(boxG(x - 0.08, x + 0.08, deckY, deckY + 0.95, z0 - sp.wall - 0.2, z1 + sp.wall + 0.2)); });
  // cabeceiras de concreto da crista junto aos muros
  const spillMesh = L.mesh(L.BGU.mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g).map((g) => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; }), false), conc);
  grp.add(spillMesh);

  /* ---------- defensas da crista e guarda-corpo da ponte (metal galvanizado) ---------- */
  const steel = L.metal('#b9c1c7', { roughness: 0.45, metalness: 0.6 }), postGeo = new THREE.BoxGeometry(0.1, 0.9, 0.1).translate(0, 0.45, 0);
  const posts = [], rails = [];
  const crestZ = [[D.z0 + 5, z0 - sp.wall - 0.2], [z1 + sp.wall + 0.2, D.z1]];
  [D.c0 + 0.25, D.c1 - 0.25].forEach((x) => crestZ.forEach(([a, b]) => {
    const yAt = (z) => R.H(x, z);
    for (let z = a; z <= b + 1e-6; z += 2) { if (yAt(z) < crest - 0.2) continue; posts.push([x, yAt(z), z]); }
    const pts = []; for (let z = a; z <= b + 1e-6; z += 2) { if (yAt(z) < crest - 0.2) continue; pts.push(new THREE.Vector3(x, yAt(z) + 0.72, z)); }
    if (pts.length > 1) rails.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.05, 6), new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().setY(p.y - 0.34))), pts.length * 2, 0.04, 6));
  }));
  const postIM = L.scatter(postGeo, steel, posts.length, (i, r, d) => { d.position.set(...posts[i]); }, 3); grp.add(postIM);
  grp.add(L.mesh(L.BGU.mergeGeometries(rails.map((g) => { g.deleteAttribute('uv'); return g; })), steel));

  /* ---------- régua de nível no muro-guia (faixas pretas/brancas) ---------- */
  {
    const rx = sp.sill0 - 1.4, rz = z0 - sp.wall - 0.01, ry0 = sp.apron, ry1 = crest - 0.3, segs = [];
    for (let y = ry0; y < ry1 - 0.01; y += 0.25) segs.push(boxG(rx - 0.12, rx + 0.12, y, y + 0.245, rz - 0.02, rz));
    const blk = L.mat('#1f2328', { roughness: 0.6 }), wht = L.mat('#f2f2ee', { roughness: 0.5 });
    grp.add(L.mesh(L.BGU.mergeGeometries(segs.filter((_, i) => i % 2 === 0)), wht, 0, 0, 0, { cast: false }), L.mesh(L.BGU.mergeGeometries(segs.filter((_, i) => i % 2 === 1)), blk, 0, 0, 0, { cast: false }));
  }

  /* ---------- enrocamento: blocos de pedra na linha d'água do talude de montante ---------- */
  const rockGeoD = new THREE.IcosahedronGeometry(1, 0); { const p = rockGeoD.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = 1 + 0.22 * Math.sin(x * 4.1 + y * 2.3) * Math.cos(z * 3.7 - y); p.setXYZ(i, x * f, y * f * 0.7, z * f); } rockGeoD.computeVertexNormals(); }
  const rrock = [];
  { const rd = L.rng(808); for (let i = 0; i < 520 && rrock.length < 240; i++) {
    const z = lerp(D.z0 + 6, D.z1 + 2, rd()), y = lerp(Lo.LAKE.level - 0.9, Lo.LAKE.level + 1.1, rd()), x = D.c0 - (crest - y) * D.up;
    if (R.inSpillBand(z, 0.8) || R.damY(x, z) < R.Hnat(x, z) + 0.2) continue;
    rrock.push([x, y, z, 0.28 + rd() * 0.32, rd()]);
  } }
  const rIM = L.scatter(rockGeoD, L.mat('#ffffff', { roughness: 0.9, flatShading: true }), rrock.length, (i, r, d) => { const q = rrock[i]; d.position.set(q[0], q[1] - q[3] * 0.25, q[2]); d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.set(q[3] * (1 + r() * 0.4), q[3], q[3] * (0.9 + r() * 0.4)); return new THREE.Color(['#8b8780', '#9d978c', '#77726b', '#a7a196'][Math.floor(q[4] * 4)]); }, 21);
  grp.add(rIM);

  /* ---------- MURO DE ARRIMO de gabiões no talude (z −88 … −81) ---------- */
  const gab = (() => {
    const [cv, g] = canvas(512, 256), rd = L.rng(5150);
    g.fillStyle = '#5b5750'; g.fillRect(0, 0, 512, 256);
    const st = []; for (let i = 0; i < 420; i++) st.push({ x: rd() * 512, y: rd() * 256, r: 9 + rd() * 16, e: 0.55 + rd() * 0.35, a: rd() * 3, v: rd() });
    st.sort((a, b) => a.y - b.y).forEach((s) => {
      g.save(); g.translate(s.x, s.y); g.rotate(s.a);
      g.fillStyle = 'rgba(20,16,12,.55)'; g.beginPath(); g.ellipse(2, 3, s.r * 1.08, s.r * s.e * 1.1, 0, 0, L.TAU); g.fill();
      const b = 120 + s.v * 80, gr = g.createRadialGradient(-s.r * 0.3, -s.r * 0.3, 1, 0, 0, s.r);
      gr.addColorStop(0, `rgb(${b + 40},${b + 34},${b + 24})`); gr.addColorStop(1, `rgb(${b * 0.62},${b * 0.6},${b * 0.56})`);
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, s.r, s.r * s.e, 0, 0, L.TAU); g.fill(); g.restore();
    });
    g.strokeStyle = 'rgba(205,210,214,.85)'; g.lineWidth = 2; // tela hexagonal de arame galvanizado
    for (let k = -256; k < 512 + 256; k += 26) { g.beginPath(); for (let y = 0; y <= 256; y += 8) g.lineTo(k + 13 * Math.sin(y * 0.12) + y * 0.5, y); g.stroke(); g.beginPath(); for (let y = 0; y <= 256; y += 8) g.lineTo(k + 13 * Math.sin(y * 0.12 + Math.PI) - y * 0.5 + 128, y); g.stroke(); }
    g.strokeStyle = 'rgba(225,228,232,.95)'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 250);
    return tex(cv);
  })();
  const gabMat = L.mat('#ffffff', { map: gab, roughness: 0.85 });
  const zAt = (y) => { let a = -88, b = -81; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (Lo.G(0, m) < y) a = m; else b = m; } return (a + b) / 2; };
  const boxes = [], GW = 2.0;
  const segX = [[R.ZONES.wallX[0], R.ZONES.wallGap[0]], [R.ZONES.wallGap[1], R.ZONES.wallX[1]]];
  for (let i = 0; i < 10; i++) {
    const yb = Lo.SHORE_Y + i, zf = -88.45 + i * 0.63;
    segX.forEach(([a, b]) => { for (let x = a + (i % 2 ? GW / 2 : 0); x < b - 0.2; x += GW) { const w = Math.min(GW, b - x); if (w < 0.6) continue; boxes.push([x + w / 2, yb + 0.5, zf + 0.5, w]); } if (i % 2) boxes.push([a + GW / 4, yb + 0.5, zf + 0.5, GW / 2]); });
  }
  const gabIM = L.scatter(new THREE.BoxGeometry(1, 1, 1), gabMat, boxes.length, (i, r, d) => { const b = boxes[i]; d.position.set(b[0], b[1], b[2]); d.scale.set(b[3] - 0.03, 0.985, 1); }, 9);
  gabIM.castShadow = true; grp.add(gabIM);
  // coroamento de concreto + canaleta de pé + guarda-corpo no topo
  const cap = [], top = zAt(13.99) + 0.2;
  segX.forEach(([a, b]) => { cap.push(boxG(a, b, 13.98, 14.22, -82.9, -81.6)); cap.push(boxG(a, b, 3.85, 4.06, -89.25, -88.55)); });
  grp.add(L.mesh(L.BGU.mergeGeometries(cap), conc));
  const fp = [];
  segX.forEach(([a, b]) => { for (let x = a + 0.3; x <= b - 0.2; x += 2.4) fp.push([x, 14.22, -81.85]); });
  grp.add(L.scatter(new THREE.BoxGeometry(0.08, 1.05, 0.08).translate(0, 0.52, 0), steel, fp.length, (i, r, d) => d.position.set(...fp[i]), 4));
  const fr = []; segX.forEach(([a, b]) => { [0.55, 1.0].forEach((h) => fr.push(new THREE.CylinderGeometry(0.035, 0.035, b - a - 0.4, 6).rotateZ(Math.PI / 2).translate((a + b) / 2, 14.22 + h, -81.85))); });
  grp.add(L.mesh(L.BGU.mergeGeometries(fr), steel));
  void top;

  return { update() {}, grp };
}
