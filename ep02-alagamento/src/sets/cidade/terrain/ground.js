// Chão (heightfield), faces de corte do solo, tampões dos furos e paredes da vala do canal.
import * as L from '../../../lib.js';
import { soilKit, holeMask } from './soil.js';
import { holeList, holePoly, canalSweep, canalFloor, OUT0, OUT1, CULVERT_H } from './holes.js';
const { THREE, clamp01, lerp, sstep } = L;

const C = (h) => new THREE.Color(h);
const n2 = (x, z) => 0.5 * Math.sin(x * 1.7 + z * 0.9) + 0.5 * Math.sin(x * 0.63 - z * 1.31 + 1.7);
const n3 = (x, z) => 0.5 * Math.sin(x * 0.21 + z * 0.17 + 1.1) + 0.3 * Math.sin(x * 0.53 - z * 0.37) + 0.2 * Math.sin(x * 1.3 + z * 1.1 + 2);
const inRect = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

export function buildGround(ctx) {
  const { Lo, scene, shared } = ctx;
  const { X0, X1, Z0, ZF, YB } = Lo;
  const grp = new THREE.Group(); scene.add(grp);
  const TR_Z = ZF - Lo.CANAL.half - Lo.CANAL.wall;                 // 24,55: parede de trás do canal
  const OPEN = [[Lo.CANAL.x0, Lo.CANAL.culvert[0]], [Lo.CANAL.culvert[1], OUT1]]; // trechos a céu aberto (fora do bueiro)
  const floorY = (x) => canalFloor(Lo, x) - 0.02;
  const inOpen = (x) => OPEN.some(([a, b]) => x >= a - 1e-6 && x <= b + 1e-6);

  /* ---------- relevo ---------- */
  const bedNoise = (x, z) => (x > 28.4 && x < 36.4 ? 0.16 * n2(x * 1.3, z * 0.45) * sstep(28.4, 29.6, x) * (1 - sstep(35.2, 36.4, x)) : 0);
  const dly = (x) => 0.5 * clamp01((x - X0) / (26 - X0));          // atraso da obra ao longo de x (esquerda → direita)
  /** estado do relevo que muda com as obras: aterro do córrego (walks) e abertura do canal */
  const P = { walks: 0, sweep: -1e9 };
  function creekK(x) {
    if (x > OUT0 - 0.2 && x <= Lo.CREEK.x1 + 0.2 && P.sweep > x) return 0;  // depois do canal: o talude volta (a vala é recortada à parte)
    if (x >= 16 && x < P.sweep) return 0;
    if (x >= 17.2) return 1;
    const fill = sstep(0.25, 0.75, clamp01((P.walks - dly(x)) / 0.5));
    const kept = x < 16 ? 0 : sstep(16, 17.2, x);                  // a cabeceira do trecho que sobra (x 16–26) vira uma depressão suave
    return lerp(1, kept, fill);
  }
  const hAt = (x, z) => Lo.G(x, z) - Lo.creekCut(x, z) * creekK(x) + bedNoise(x, z);
  shared.groundY = (x, z) => Lo.G(x, z) + bedNoise(x, z);

  /* ---------- grade ---------- */
  const xs = [], zs = [];
  for (let x = X0; x <= X1 + 1e-6; x += 0.25) xs.push(+x.toFixed(3));
  for (let z = Z0; z <= 22 + 1e-6; z += 0.5) zs.push(+z.toFixed(3));
  for (let z = 22.25; z <= ZF + 1e-6; z += 0.25) zs.push(+z.toFixed(3));
  zs.push(TR_Z, ZF - 0.08); zs.sort((a, b) => a - b);
  const nx = xs.length, nz = zs.length, NV = nx * nz;
  const pos = new Float32Array(NV * 3), cN = new Float32Array(NV * 3), cC = new Float32Array(NV * 3), cU = new Float32Array(NV * 3), aD = new Float32Array(NV), aK = new Float32Array(NV);
  const creekV = []; // vértices cuja altura depende do estado
  // cores
  const cGrassA = C('#5fb244'), cGrassB = C('#3f8f36'), cMeadow = C('#8fbf4e'), cFloor = C('#4b6a2c'), cLitter = C('#6d5a34'), cMud = C('#6a5238'), cSand = C('#cdb27a'), cBed = C('#9f8a60'), cBedDeep = C('#6f6a4c');
  const cDirt = C('#8c6a46'), cDirt2 = C('#9a7a55'), cYard = C('#5d9c40'), cYard2 = C('#4a8a36'), cEarth = C('#8a7358'), cGravel = C('#b7afa1'), cPark = C('#58a63f');
  const c = new THREE.Color(), c2 = new THREE.Color();
  const forest = (x, z) => clamp01(0.55 + 0.9 * n3(x * 0.8, z * 0.8) - 0.55 * sstep(17, 23, z) + (inRect(Lo.HILL_FOREST, x, z) ? 1 : 0)); // densidade da mata natural
  shared.forestDensity = forest;
  const keep = (x, z) => (inRect(Lo.HILL_FOREST, x, z) || x >= Lo.RIVER.x0 ? 1 : 0);
  const urbanColor = (x, z, out) => {
    const m = n2(x * 2.2, z * 2.0), lots = ((z > 0.5 && z < 12.2) || (z > -24 && z < -11)) && x < 18.5 && !(x > Lo.STREET_C.x0 && x < Lo.STREET_C.x1);
    if (x >= Lo.PARK.x0) out.copy(cPark).lerp(cGrassB, 0.3 + 0.2 * m);
    else if (inRect(Lo.ETE, x, z)) out.copy(cGravel).multiplyScalar(0.95 + 0.05 * m);
    else if (lots) out.copy(cYard).lerp(cYard2, clamp01(0.5 + 0.5 * m));
    else out.copy(cEarth).lerp(cDirt2, clamp01(0.5 + 0.4 * m));
    return out;
  };
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix, x = xs[ix], z = zs[iz], h = hAt(x, z), cut = Lo.creekCut(x, z);
    pos[i * 3] = x; pos[i * 3 + 1] = h; pos[i * 3 + 2] = z;
    if (cut > 0) creekV.push(i);
    const n = n2(x * 0.9 + 5, z * 0.8), m = n2(x * 3.1, z * 2.7), f = forest(x, z);
    // natural: campo/mata; margem e leito do rio; lama do córrego
    c.copy(cGrassA).lerp(cGrassB, clamp01(0.45 + 0.45 * n + 0.15 * m)).lerp(cMeadow, clamp01(0.5 * sstep(16, 24, z) * (0.6 + 0.4 * m)));
    c.lerp(cFloor, clamp01(f - 0.35) * 0.85).lerp(cLitter, clamp01(f - 0.55) * 0.5 * (0.5 + 0.5 * m));
    const g0 = Lo.G(x, z);
    if (x > 25.8) { c.lerp(cSand, sstep(1.2, -1.6, g0) * 0.9).lerp(cBed, sstep(-1.9, -2.6, g0)).lerp(cBedDeep, sstep(-2.8, -4.4, g0) * 0.7); }
    c.lerp(cMud, clamp01(cut / 0.25) * 0.9);
    cN[i * 3] = c.r; cN[i * 3 + 1] = c.g; cN[i * 3 + 2] = c.b;
    // mata derrubada: terra exposta com restos de capim
    c2.copy(cDirt).lerp(cDirt2, clamp01(0.5 + 0.5 * m)).lerp(c, clamp01(0.35 - f * 0.4 + 0.2 * n)); c2.lerp(cMud, clamp01(cut / 0.25) * 0.9);
    cC[i * 3] = c2.r; cC[i * 3 + 1] = c2.g; cC[i * 3 + 2] = c2.b;
    urbanColor(x, z, c2); if (x >= 16 && cut > 0.02) c2.copy(cMud);
    cU[i * 3] = c2.r; cU[i * 3 + 1] = c2.g; cU[i * 3 + 2] = c2.b;
    aD[i] = Math.max(0, dly(x) + 0.06 * m); aK[i] = keep(x, z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cN, 3));
  geo.setAttribute('aClr', new THREE.BufferAttribute(cC, 3)); geo.setAttribute('aUrb', new THREE.BufferAttribute(cU, 3));
  geo.setAttribute('aDly', new THREE.BufferAttribute(aD, 1)); geo.setAttribute('aKeep', new THREE.BufferAttribute(aK, 1));
  const PL = Lo.PLAZA;
  function buildIndex(sweep) {
    const idx = [];
    for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
      const xc = (xs[ix] + xs[ix + 1]) / 2, zc = (zs[iz] + zs[iz + 1]) / 2;
      if (inRect(PL, xc, zc)) continue;                                           // buraco do piscinão
      if (zc > TR_Z && inOpen(xc) && xc < sweep) continue;                         // vala do canal aberta
      const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1; idx.push(a, d, b, b, d, e);
    }
    geo.setIndex(idx);
  }
  buildIndex(-1e9);
  geo.computeVertexNormals();

  // textura de detalhe do chão (capim/terra), em coordenadas do mundo
  const det = (() => {
    const N = 1024, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'), rd = L.rng(91);
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 1600; i++) { const v = 96 + rd() * 64, r = 20 + rd() * 60, x = rd() * N, y = rd() * N; g.fillStyle = `rgba(${v},${v},${v},.16)`; for (const dx of [0, -N, N]) for (const dy of [0, -N, N]) { g.beginPath(); g.ellipse(x + dx, y + dy, r, r * 0.7, rd() * 3, 0, L.TAU); g.fill(); } }
    for (let i = 0; i < 26000; i++) { const lt = rd() < 0.55, x = rd() * N, y = rd() * N, a = rd() * L.TAU, l = 3 + rd() * 9; g.strokeStyle = lt ? `rgba(230,230,230,${0.12 + rd() * 0.25})` : `rgba(15,15,15,${0.12 + rd() * 0.25})`; g.lineWidth = 0.8 + rd() * 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace; return t;
  })();
  const GU = { uClear: { value: 0 }, uUrb: { value: 0 }, tGDet: { value: det } };
  const gmat = L.mat(0xffffff, { vertexColors: true, roughness: 0.95 });
  gmat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, GU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aClr; attribute vec3 aUrb; attribute float aDly; attribute float aKeep; uniform float uClear, uUrb; varying vec3 vGWP;')
      .replace('#include <color_vertex>', '#include <color_vertex>\n{ float kc = clamp((uClear - aDly) / 0.44, 0.0, 1.0) * (1.0 - aKeep), ku = clamp((uUrb - aDly) / 0.44, 0.0, 1.0) * (1.0 - aKeep); vColor.rgb = mix(mix(color.rgb, aClr, kc), aUrb, ku); }')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tGDet; varying vec3 vGWP;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat gDt = texture2D(tGDet, vGWP.xz / 3.0).r; diffuseColor.rgb *= 0.74 + 0.52 * gDt;');
  };
  gmat.customProgramCacheKey = () => 'ground-v3';
  const ground = L.mesh(geo, gmat); ground.receiveShadow = true; ground.castShadow = false; ground.renderOrder = 2; grp.add(ground); // desenhado depois dos opacos dos outros módulos: o que fica coberto (ruas, lotes) é rejeitado pelo teste de profundidade antes de sombrear. (projetar sombra do chão inteiro custava ~2 s/quadro no mapa 4096² por software)

  /* ---------- mapa de altura (profundidade das camadas do corte) ---------- */
  const HX = [], HZ = [];
  for (let x = X0; x <= X1 + 1e-6; x += 0.25) HX.push(x);
  for (let z = Z0; z <= ZF + 1e-6; z += 0.25) HZ.push(z);
  const hData = new Float32Array(HX.length * HZ.length), hNodesDyn = [];
  for (let j = 0; j < HZ.length; j++) for (let i = 0; i < HX.length; i++) { hData[j * HX.length + i] = hAt(HX[i], HZ[j]); if (Lo.creekCut(HX[i], HZ[j]) > 0) hNodesDyn.push(j * HX.length + i); }
  // meio-float: filtro linear garantido no WebGL2
  const hHalf = new Uint16Array(hData.length);
  const toHalf = THREE.DataUtils.toHalfFloat;
  for (let i = 0; i < hData.length; i++) hHalf[i] = toHalf(hData[i]);
  const hTexL = new THREE.DataTexture(hHalf, HX.length, HZ.length, THREE.RedFormat, THREE.HalfFloatType);
  hTexL.magFilter = hTexL.minFilter = THREE.LinearFilter; hTexL.needsUpdate = true;
  const kit = soilKit(hTexL, { X0, X1, Z0, ZF, nx: HX.length, nz: HZ.length });
  shared.soilKit = kit;

  /* ---------- faces de corte ---------- */
  const holes = holeList(Lo, shared), MY = [YB - 0.5, 12];
  const mask = holeMask(holes.map((h) => holePoly(h)), X0, X1, MY[0], MY[1]);
  shared.faceHoles = holes.map((h) => ({ id: h.id, poly: holePoly(h, 0.25) }));
  const faceMat = kit.material({ mask, maskY: MY });
  const soilMat = kit.material(); shared.soilMat = soilMat;
  function strip(n, o = {}) { // faixa vertical: 2 vértices por coluna (topo, fundo)
    const g = new THREE.BufferGeometry(), p = new Float32Array(n * 6), idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; o.flip ? idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) : idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setIndex(idx);
    const nrm = new Float32Array(n * 6); for (let i = 0; i < n * 2; i++) { nrm[i * 3] = o.n[0]; nrm[i * 3 + 1] = o.n[1]; nrm[i * 3 + 2] = o.n[2]; }
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    return g;
  }
  const setCol = (g, i, x, yt, yb, z) => { const p = g.attributes.position.array; p[i * 6] = x; p[i * 6 + 1] = yt; p[i * 6 + 2] = z; p[i * 6 + 3] = x; p[i * 6 + 4] = yb; p[i * 6 + 5] = z; };
  const front = strip(nx, { n: [0, 0, 1] }), back = strip(nx, { n: [0, 0, -1], flip: true }), left = strip(nz, { n: [-1, 0, 0], flip: true }), right = strip(nz, { n: [1, 0, 0] });
  // (ordem dos z: crescente; a face x = X0 olha para −x)
  for (let ix = 0; ix < nx; ix++) setCol(back, ix, xs[ix], pos[ix * 3 + 1], YB, Z0);
  for (let iz = 0; iz < nz; iz++) { setCol(left, iz, X0, pos[(iz * nx) * 3 + 1], YB, zs[iz]); setCol(right, iz, X1, pos[(iz * nx + nx - 1) * 3 + 1], YB, zs[iz]); }
  // left/right usam z como abscissa: reordenar vértices (x fixo)
  const faceMesh = (g, m) => { const me = L.mesh(g, m, 0, 0, 0, { cast: false }); me.receiveShadow = true; me.renderOrder = 2; grp.add(me); return me; };
  faceMesh(front, faceMat); faceMesh(back, soilMat); faceMesh(left, soilMat); faceMesh(right, soilMat);
  const bottom = L.mesh(new THREE.PlaneGeometry(X1 - X0, ZF - Z0), L.mat('#2f241d', { roughness: 1, side: THREE.DoubleSide }), (X0 + X1) / 2, YB, (Z0 + ZF) / 2, { cast: false }); bottom.rotation.x = Math.PI / 2; grp.add(bottom);

  /* ---------- tampões ---------- */
  // cada tampão é uma faixa em x; tem "vãos" onde um furo revelado antes ocupa parte da mesma região
  const plugSegs = [];
  holes.forEach((h) => {
    const earlier = holes.filter((q) => q.order < h.order && q.xb > h.xa && q.xa < h.xb);
    const cuts = [h.xa, h.xb, ...(h.breaks || [])]; earlier.forEach((q) => { if (q.xa > h.xa) cuts.push(q.xa); if (q.xb < h.xb) cuts.push(q.xb); });
    const xsC = [...new Set(cuts.map((v) => +v.toFixed(4)))].sort((a, b) => a - b);
    for (let s = 0; s < xsC.length - 1; s++) {
      const a = xsC[s], b = xsC[s + 1], xm = (a + b) / 2;
      const over = earlier.filter((q) => q.xa <= xm && q.xb >= xm);
      // partes verticais que sobram depois de tirar os furos anteriores (avaliados no meio do trecho)
      let parts = [[(x) => h.bot(x), (x) => h.top(x)]];
      over.forEach((q) => {
        const np = [];
        parts.forEach(([pb, pt]) => {
          if (q.bot(xm) >= pt(xm) || q.top(xm) <= pb(xm)) { np.push([pb, pt]); return; }
          if (q.bot(xm) > pb(xm)) np.push([pb, (x) => Math.min(pt(x), q.bot(x))]);
          if (q.top(xm) < pt(xm)) np.push([(x) => Math.max(pb(x), q.top(x)), pt]);
        });
        parts = np;
      });
      const n = Math.max(2, Math.ceil((b - a) / 0.25) + 1);
      parts.forEach(([pb, pt]) => plugSegs.push({ h, a, b, n, pb, pt }));
    }
  });
  const plugN = plugSegs.reduce((s, q) => s + q.n, 0);
  const plugGeo = new THREE.BufferGeometry(), plugP = new Float32Array(plugN * 6), plugI = [];
  { let o = 0; plugSegs.forEach((q) => { q.o = o; for (let i = 0; i < q.n - 1; i++) { const a = (o + i) * 2; plugI.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } o += q.n; }); }
  plugGeo.setAttribute('position', new THREE.BufferAttribute(plugP, 3)); plugGeo.setIndex(plugI);
  { const nr = new Float32Array(plugN * 6); for (let i = 0; i < plugN * 2; i++) nr[i * 3 + 2] = 1; plugGeo.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); }
  const plugs = L.mesh(plugGeo, soilMat, 0, 0, 0, { cast: false }); plugs.receiveShadow = true; plugs.frustumCulled = false; grp.add(plugs);
  const ZP = ZF + 0.004;
  function updatePlugs(S, contour) {
    for (const q of plugSegs) {
      const h = q.h, k = clamp01(h.k(S)), xr = h.reveal === 'x' ? lerp(h.xa - 0.05, h.xb + 0.05, k) : -1e9;
      for (let i = 0; i < q.n; i++) {
        let x = lerp(q.a, q.b, i / (q.n - 1)); const hidden = h.reveal === 'x' && x < xr; if (hidden) x = Math.max(x, Math.min(xr, q.b));
        const xe = Math.min(q.b - 1e-4, Math.max(q.a + 1e-4, x)); // avalia dentro do trecho (funções com degrau nas bordas)
        let yb = q.pb(xe) - 0.02, yt = Math.min(q.pt(xe) + 0.02, contour(x));
        const kk = h.kx ? clamp01(h.kx(S, x)) : k;
        if (h.reveal === 'down') { const yr = h.top(xe) - kk * (h.top(xe) - h.bot(xe)); yt = Math.min(yt, yr + (kk >= 1 ? -1e3 : 0)); }
        if (h.reveal === 'up') { const yr = h.bot(xe) + kk * (h.top(xe) - h.bot(xe)); yb = Math.max(yb, yr + (kk >= 1 ? 1e3 : 0)); }
        if (hidden || k >= 1 && h.reveal === 'x' || yt <= yb) yt = yb;
        const j = (q.o + i) * 6; plugP[j] = x; plugP[j + 1] = yt; plugP[j + 2] = ZP; plugP[j + 3] = x; plugP[j + 4] = yb; plugP[j + 5] = ZP;
      }
    }
    plugGeo.attributes.position.needsUpdate = true;
  }

  /* ---------- vala do canal: paredes de solo (atrás do concreto) e fundo ---------- */
  const trench = new THREE.Group(); grp.add(trench);
  const ZW = TR_Z - 0.1, trSegs = OPEN.map(([a, b]) => ({ a, b, n: Math.ceil((b - a) / 0.25) + 1 }));
  const trBack = trSegs.map((s) => { const g = strip(s.n, { n: [0, 0, 1] }); const m = L.mesh(g, soilMat, 0, 0, 0, { cast: false }); m.frustumCulled = false; trench.add(m); return { ...s, g }; });
  const trFloor = trSegs.map((s) => { const g = strip(s.n, { n: [0, 1, 0], flip: true }); const m = L.mesh(g, soilMat, 0, 0, 0, { cast: false }); m.frustumCulled = false; trench.add(m); return { ...s, g }; });
  // paredes de testa: acima da boca da galeria (x 16) e acima do bueiro sob a avenida
  const culvTop = (x) => Lo.CANAL.invert(x) + CULVERT_H + Lo.CANAL.wall + 0.03;
  const ends = [[Lo.CANAL.x0 - 0.03, 1, Lo.galleryTop(Lo.GALLERY.x1, true)], [Lo.CANAL.culvert[0] + 0.03, -1, culvTop(Lo.CANAL.culvert[0])], [Lo.CANAL.culvert[1] - 0.03, 1, culvTop(Lo.CANAL.culvert[1])]].map(([x, s, y0]) => {
    const g = strip(2, { n: [s, 0, 0], flip: s < 0 }); const m = L.mesh(g, soilMat, 0, 0, 0, { cast: false }); m.frustumCulled = false; trench.add(m); return { x, g, y0 };
  });
  function updateTrench(sweep) {
    trench.visible = sweep > Lo.CANAL.x0;
    if (!trench.visible) return;
    trBack.forEach((s, k) => {
      const fl = trFloor[k];
      for (let i = 0; i < s.n; i++) {
        let x = lerp(s.a, s.b, i / (s.n - 1)); const on = x <= sweep; x = Math.min(x, Math.max(s.a, sweep));
        const yb = floorY(x) - 0.03, yt = on ? Lo.G(x, ZW) : yb;
        setCol(s.g, i, x, yt, yb, ZW);
        const p = fl.g.attributes.position.array; p[i * 6] = x; p[i * 6 + 1] = yb; p[i * 6 + 2] = ZW; p[i * 6 + 3] = x; p[i * 6 + 4] = yb; p[i * 6 + 5] = on ? ZF : ZW;
      }
      s.g.attributes.position.needsUpdate = true; fl.g.attributes.position.needsUpdate = true;
    });
    ends.forEach((e, i) => {
      const on = sweep > (i === 0 ? Lo.CANAL.x0 : i === 1 ? Lo.CANAL.x0 + 0.3 : Lo.CANAL.culvert[1] + 0.05);
      const p = e.g.attributes.position.array, yb = e.y0, yt = on ? Lo.G(e.x, ZF - 0.7) : yb;
      p[0] = e.x; p[1] = yt; p[2] = ZW; p[3] = e.x; p[4] = yb; p[5] = ZW; p[6] = e.x; p[7] = yt; p[8] = ZF; p[9] = e.x; p[10] = yb; p[11] = ZF;
      e.g.attributes.position.needsUpdate = true;
    });
  }

  /* ---------- atualização ---------- */
  let key = '';
  const contour = (x) => hAt(x, ZF);
  function update(t, S) {
    const walks = Math.round(S.build.walks * 400) / 400, sweep = canalSweep(S, Lo), sk = Math.round(sweep * 8) / 8;
    const k2 = walks + '|' + sk;
    if (k2 !== key) {
      const oldSweep = P.sweep; P.walks = walks; P.sweep = sweep; key = k2;
      for (const i of creekV) pos[i * 3 + 1] = hAt(pos[i * 3], pos[i * 3 + 2]);
      geo.attributes.position.needsUpdate = true;
      if (Math.floor(oldSweep * 4) !== Math.floor(sweep * 4)) buildIndex(sweep);
      geo.computeVertexNormals();
      for (const j of hNodesDyn) hHalf[j] = toHalf(hAt(HX[j % HX.length], HZ[Math.floor(j / HX.length)]));
      hTexL.needsUpdate = true;
      for (let ix = 0; ix < nx; ix++) setCol(front, ix, xs[ix], pos[((nz - 1) * nx + ix) * 3 + 1], YB, ZF);
      front.attributes.position.needsUpdate = true; front.computeBoundingSphere();
      updateTrench(sweep);
    }
    updatePlugs(S, contour);
    GU.uClear.value = S.build.clear; GU.uUrb.value = S.build.walks;
    // raio-x: o chão fica translúcido para mostrar as redes
    const xr = S.xray, tr = xr > 0.01;
    if (gmat.transparent !== tr) { gmat.transparent = tr; gmat.needsUpdate = true; }
    gmat.opacity = 1 - 0.75 * xr; gmat.depthWrite = xr < 0.01;
    // solo molhado na infiltração (frente de umedecimento descendo) e seco sob o asfalto
    kit.U.uSWet.value = sstep(12.2, 12.9, t) * (1 - sstep(17.4, 20.5, t)) * (t < 30 ? 1 : 0);
    kit.U.uSWetD.value = 0.3 + 2.9 * clamp01((t - 12.3) / 4.4);
    kit.U.uSDry.value = S.blocked;
    kit.U.uSInfil.value = S.infil;
    kit.U.uSRoot.value = 1 - 0.5 * S.build.walks;
  }
  return { update, hAt, contour, xs, zs, P, creekK, floorY, OUT1, kit, ground, grp };
}
