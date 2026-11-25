// ÁGUA NAS RUAS: asfalto molhado + poças (pele fina sobre o leito), ENXURRADA nas sarjetas (fitas rasas que engrossam
// ladeira abaixo, com estrias de espuma correndo para o ponto baixo), redemoinho entrando nas bocas de lobo,
// água descendo dos condutores dos telhados e jorrando na sarjeta, gotas pingando dos beirais.
import { HM_GLSL, hmUniforms, onStreet, tameEnv } from './hmap.js';

export function makeStreet(ctx, hm) {
  const { L, THREE, scene, Lo, shared } = ctx;
  const root = new THREE.Group(); root.name = 'water.street'; scene.add(root);
  const A = Lo.STREET_A, B = Lo.STREET_B, C = Lo.STREET_C;
  const streetH = (x, z) => hm.urb(x, z); // no leito da rua não há guia: é o chão urbano

  /* ---------- pele molhada + poças ---------- */
  const U = { ...hmUniforms(hm), uWet: { value: 0 }, uPud: { value: 0 }, uFlood: { value: 0 } };
  function skinGeo(x0, x1, z0, z1, d = 0.5) {
    const nx = Math.ceil((x1 - x0) / d), nz = Math.ceil((z1 - z0) / d), pos = [], idx = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = Math.min(x1, x0 + i * d), z = Math.min(z1, z0 + j * d); pos.push(x, streetH(x, z) + 0.047, z); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, e = c + 1; idx.push(a, c, b, b, c, e); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const skinMat = L.water('#2a3138', 0.5, { roughness: 0.16, metalness: 0.05 });
  { const prev = skinMat.onBeforeCompile;
    skinMat.onBeforeCompile = (sh) => {
      prev(sh); Object.assign(sh.uniforms, U); tameEnv(sh, 0.22);
      sh.fragmentShader = sh.fragmentShader.replace('uniform float uWStr;', 'uniform float uWStr; uniform float uWet, uPud, uFlood;' + HM_GLSL)
        .replace('#include <color_fragment>', `#include <color_fragment>
{ vec4 hh = hmAt(vWPos.xz);
  // poças: manchas de ruído, mais fáceis perto das guias e nos trechos baixos
  float n = vnoise(vWPos.xz * 0.55 + 11.0) * 0.6 + vnoise(vWPos.xz * 1.3 + 4.0) * 0.28 + vnoise(vWPos.xz * 3.7) * 0.12;
  float low = 1.0 - smoothstep(2.6, 4.2, hh.g);
  float th = 1.0 - uPud * (0.26 + 0.24 * low);
  float pud = smoothstep(th, th + 0.04, n);
  float rim = smoothstep(th - 0.05, th, n) * (1.0 - pud);
  vec3 c = mix(vec3(0.05, 0.055, 0.06), vec3(0.10, 0.11, 0.11), pud);
  float a = uWet * 0.38 + pud * 0.42 + rim * 0.1;
  if (uFlood > hh.g + 0.01) a *= 0.0;
  if (a < 0.004) discard;
  diffuseColor.rgb = c; diffuseColor.a = a; }`);
    };
    skinMat.customProgramCacheKey = () => 'water-skin-v2';
  }
  skinMat.depthWrite = false;
  const skins = [skinGeo(A.x0, A.x1, A.z0, A.z1), skinGeo(B.x0, B.x1, B.z0, B.z1), skinGeo(C.x0, C.x1, B.z1, A.z0)].map((g) => {
    const m = new THREE.Mesh(g, skinMat); m.renderOrder = 8; m.receiveShadow = true; m.castShadow = false; root.add(m); return m;
  });

  /* ---------- enxurrada nas sarjetas ---------- */
  // cada sarjeta: linha da guia (pontos), normal para dentro da rua, bocas de lobo nela (posições ao longo de x)
  const gut = [];
  const lineX = (x0, x1, z, nz, inl) => { const p = []; for (let x = x0; x <= x1 + 1e-6; x += 0.25) p.push([x, z]); return { p, n: [0, nz], inl }; };
  const lineZ = (z0, z1, x, nx) => { const p = []; for (let z = z0; z <= z1 + 1e-6; z += 0.25) p.push([x, z]); return { p, n: [nx, 0], inl: null }; };
  gut.push(lineX(A.x0 + 0.3, A.x1 - 0.2, A.z1, -1, true));   // guia da frente da rua A (bocas de lobo)
  gut.push(lineX(A.x0 + 0.3, A.x1 - 0.2, A.z0, 1, false));   // guia de trás da rua A
  gut.push(lineX(B.x0 + 0.3, B.x1 - 0.2, B.z1, -1, false));
  gut.push(lineX(B.x0 + 0.3, B.x1 - 0.2, B.z0, 1, false));
  gut.push(lineZ(B.z1 + 0.2, A.z0 + 0.6, C.x0, 1));
  gut.push(lineZ(B.z1 + 0.2, A.z0 + 0.6, C.x1, -1));
  const inl0 = Lo.INLETS.slice(), inl1 = Lo.INLETS.concat(Lo.INLETS_EXTRA);
  // acumulação a montante (largura cresce ladeira abaixo), com reinício nas bocas de lobo
  function accum(h, xs, inlets) {
    const n = h.length, AL = new Float32Array(n), AR = new Float32Array(n);
    const near = (a, b) => inlets && inlets.some((q) => q > Math.min(a, b) - 1e-6 && q <= Math.max(a, b) + 1e-6);
    for (let i = 1; i < n; i++) if (h[i] < h[i - 1] - 1e-5) AL[i] = near(xs[i - 1], xs[i]) ? 0 : AL[i - 1] + 0.25;
    for (let i = n - 2; i >= 0; i--) if (h[i] < h[i + 1] - 1e-5) AR[i] = near(xs[i + 1], xs[i]) ? 0 : AR[i + 1] + 0.25;
    // a montante de uma boca de lobo a fita "entra" nela: mantém; logo a jusante recomeça fina
    return Array.from(AL, (v, i) => Math.min(1, Math.sqrt((v + AR[i]) / 22)));
  }
  const gutMat = L.water('#8a8272', 0.85, { roughness: 0.14, side: THREE.DoubleSide });
  const GU = { uRun: { value: 0 }, uInl: { value: 0 }, uEnl: { value: 0 }, uWmax: { value: 1.15 }, uFlood: { value: 0 }, ...hmUniforms(hm) };
  { const prev = gutMat.onBeforeCompile;
    gutMat.onBeforeCompile = (sh) => {
      prev(sh); Object.assign(sh.uniforms, GU); tameEnv(sh, 0.5);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec3 aBase; attribute vec2 aN; attribute float aAcross, aSig, aAcc, aAccI, aAccI2; uniform float uRun, uInl, uEnl, uWmax;
varying float vAcr, vSig, vW;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
float acc = mix(aAcc, mix(aAccI, aAccI2, uEnl), uInl);
float wE = uRun * (0.18 + 0.82 * acc);
transformed = aBase + vec3(aN.x, 0.0, aN.y) * (0.04 + aAcross * uWmax * wE) + vec3(0.0, 0.012 + 0.025 * wE * (1.0 - aAcross), 0.0);
vAcr = aAcross; vSig = aSig; vW = wE;`);
      sh.fragmentShader = sh.fragmentShader.replace('uniform float uWStr;', 'uniform float uWStr; uniform float uFlood; varying float vAcr, vSig, vW;' + HM_GLSL)
        .replace('#include <color_fragment>', `#include <color_fragment>
{ float st = vnoise(vec2(vSig * 1.6 - uTime * 2.4, vAcr * 3.0 + vSig * 0.13));
  float st2 = vnoise(vec2(vSig * 5.0 - uTime * 6.0, vAcr * 9.0));
  float foam = smoothstep(0.55, 0.75, st) * 0.75 + smoothstep(0.7, 0.95, st2) * 0.35 + smoothstep(0.72, 0.92, vAcr) * 0.55;
  vec3 c = mix(vec3(0.26, 0.20, 0.11), vec3(0.75, 0.72, 0.64), clamp(foam, 0.0, 1.0));
  float a = (0.78 + 0.18 * (1.0 - vAcr)) * smoothstep(1.0, 0.9, vAcr) * smoothstep(0.02, 0.1, vW);
  vec4 hh = hmAt(vWPos.xz); if (uFlood > hh.g + 0.03) a *= 0.0;
  if (a < 0.004) discard;
  diffuseColor.rgb = c; diffuseColor.a = a; }`);
    };
    gutMat.customProgramCacheKey = () => 'water-gutter-v2';
  }
  gutMat.depthWrite = false;
  const gutters = gut.map((G) => {
    const P = G.p, n = P.length, along = G.n[0] === 0 ? 0 : 1; // 0: ao longo de x, 1: ao longo de z
    const h = P.map(([x, z]) => streetH(x + G.n[0] * 0.2, z + G.n[1] * 0.2));
    const xs = P.map((p) => p[along]);
    const acc = accum(h, xs, null), accI = G.inl ? accum(h, xs, inl0) : acc, accI2 = G.inl ? accum(h, xs, inl1) : acc;
    const sig = [0]; for (let i = 1; i < n; i++) sig.push(sig[i - 1] + 0.25 * Math.sign(h[i - 1] - h[i] || 1e-9));
    const base = [], aN = [], acr = [], aS = [], aA = [], aI = [], aI2 = [], pos = [], idx = [];
    const M = 4; // faixas na largura
    for (let i = 0; i < n; i++) for (let k = 0; k <= M; k++) {
      const [x, z] = P[i]; base.push(x, h[i] + 0.04, z); pos.push(x, h[i], z); aN.push(G.n[0], G.n[1]); acr.push(k / M); aS.push(sig[i]); aA.push(acc[i]); aI.push(accI[i]); aI2.push(accI2[i]);
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < M; k++) { const a = i * (M + 1) + k, b = a + 1, c = a + M + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aBase', new THREE.Float32BufferAttribute(base, 3));
    g.setAttribute('aN', new THREE.Float32BufferAttribute(aN, 2)); g.setAttribute('aAcross', new THREE.Float32BufferAttribute(acr, 1)); g.setAttribute('aSig', new THREE.Float32BufferAttribute(aS, 1));
    g.setAttribute('aAcc', new THREE.Float32BufferAttribute(aA, 1)); g.setAttribute('aAccI', new THREE.Float32BufferAttribute(aI, 1)); g.setAttribute('aAccI2', new THREE.Float32BufferAttribute(aI2, 1));
    const nr = new Float32Array(pos.length); for (let i = 1; i < nr.length; i += 3) nr[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(nr, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, gutMat); m.frustumCulled = false; m.renderOrder = 9; m.receiveShadow = true; m.castShadow = false; root.add(m);
    return { m, G, h, P, sig };
  });
  // partículas de espuma correndo nas sarjetas (ladeira abaixo, até o ponto baixo / boca de lobo)
  const foamFlows = [];
  gutters.forEach((gu, gi) => {
    const { P, h, G } = gu; let i = 0;
    while (i < P.length - 8) { // trechos monótonos, descendo
      const dir = Math.sign(h[i] - h[i + 1]); let j = i + 1;
      while (j < P.length - 1 && Math.sign(h[j] - h[j + 1]) === dir) j++;
      if (j - i > 16) {
        const seg = P.slice(i, j + 1).map(([x, z], k) => [x + G.n[0] * 0.28, h[i + k] + 0.085, z + G.n[1] * 0.3]);
        if (dir < 0) seg.reverse();
        const len = (j - i) * 0.25;
        const f = new L.Flow(seg, { n: Math.round(len * 3), size: 0.045, color: '#efece2', jitter: [G.n[0] ? 0 : 0.0, 0.005, 0], seed: 31 + gi * 7 + i, sizeVar: 0.5,
          geo: new THREE.SphereGeometry(1, 6, 4), material: L.mat(0xffffff, { roughness: 0.9 }) });
        f.mesh.scale.set(1, 0.35, 1); f.mesh.position.y = 0; root.add(f.mesh); foamFlows.push({ f, len, G, off: seg });
      }
      i = j;
    }
  });

  /* ---------- bocas de lobo: redemoinho entrando na grelha ---------- */
  const inletPts = () => {
    if (shared.inlets && shared.inlets.length) return shared.inlets.map((q) => ({ x: q.x, y: q.y, z: q.z, extra: !!q.extra }));
    return inl1.map((x) => ({ x, y: Lo.streetY(x) + 0.01, z: A.z1 - 0.45, extra: Lo.INLETS_EXTRA.includes(x) }));
  };
  const IU = { uIn: { value: 0 }, uCurbZ: { value: A.z1 - 0.01 } };
  const swirlMat = L.water('#9a9280', 0.85, { roughness: 0.12, side: THREE.DoubleSide });
  { const prev = swirlMat.onBeforeCompile;
    swirlMat.onBeforeCompile = (sh) => {
      prev(sh); Object.assign(sh.uniforms, IU); tameEnv(sh, 0.5);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vLoc;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position.xz;');
      sh.fragmentShader = sh.fragmentShader.replace('uniform float uWStr;', 'uniform float uWStr; uniform float uIn, uCurbZ; varying vec2 vLoc;')
        .replace('#include <color_fragment>', `#include <color_fragment>
{ if (vWPos.z > uCurbZ) discard;
  float r = length(vLoc); float ang = atan(vLoc.y, vLoc.x);
  float arms = 0.5 + 0.5 * sin(ang * 3.0 + log(r + 0.05) * 7.0 + uTime * 7.0);
  float foam = smoothstep(0.55, 0.9, arms) * smoothstep(0.06, 0.3, r);
  vec3 c = mix(vec3(0.24, 0.19, 0.11), vec3(0.8, 0.78, 0.7), foam);
  float a = uIn * smoothstep(1.0, 0.75, r) * (0.75 + 0.25 * foam);
  if (a < 0.004) discard; diffuseColor.rgb = c; diffuseColor.a = a; }`);
    };
    swirlMat.customProgramCacheKey = () => 'water-swirl-v1';
  }
  swirlMat.depthWrite = false;
  const swirlGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
  // funil: o centro afunda um pouco (a água "cai" na grelha)
  { const p = swirlGeo.attributes.position; for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)); p.setY(i, -0.05 * Math.pow(1 - r, 2)); } }
  const swirls = [], swirlFlows = [];
  inletPts().forEach((q, k) => {
    const m = new THREE.Mesh(swirlGeo, swirlMat); m.position.set(q.x, q.y + 0.03, q.z); m.scale.set(0.8, 1, 0.6); m.renderOrder = 10; m.receiveShadow = true; root.add(m);
    // partículas em espiral descendo pela grelha
    const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40, r = 0.7 * (1 - u) + 0.03, a = u * 9.5 + k; pts.push([q.x + Math.cos(a) * r, q.y + 0.045 - 0.2 * Math.pow(u, 3), Math.min(A.z1 - 0.05, q.z + Math.sin(a) * r * 0.55)]); }
    const f = new L.Flow(pts, { n: 30, size: 0.022, color: '#f1eee4', seed: 90 + k, geo: new THREE.SphereGeometry(1, 6, 4), material: L.mat(0xffffff, { roughness: 0.9 }) });
    root.add(f.mesh); swirls.push({ m, q }); swirlFlows.push({ f, q });
  });

  /* ---------- condutores dos telhados: jato até o chão e filete até a sarjeta ---------- */
  const spouts = (shared.downspouts && shared.downspouts.length ? shared.downspouts : Lo.HOUSES.flatMap((h) => {
    const zf = h.face === 'A' ? h.z1 + 0.12 : h.z0 - 0.12, y = Lo.G(h.x, zf) + 0.35;
    return [{ x: h.x - h.w / 2 + 0.25, y, z: zf }, { x: h.x + h.w / 2 - 0.25, y, z: zf }];
  })).map((s) => ({ ...s }));
  const jetMat = L.water('#a9b8bd', 0.8, { roughness: 0.1 });
  const jets = [], rivulets = [];
  const rivMat = gutMat; // mesma água rasa
  spouts.forEach((s, k) => {
    // lado da rua: A se a saída está na frente (z > 8), B se atrás
    const toA = s.z > 7.5, dz = toA ? 1 : -1, gY = hm.urb(s.x, s.z + dz * 0.4);
    const land = [s.x, gY + 0.01, s.z + dz * 0.45];
    const arc = [[s.x, s.y, s.z], [s.x, (s.y + land[1]) / 2 + 0.05, s.z + dz * 0.3], land];
    const tb = L.tube(arc, 0.035, jetMat, 12, 6); tb.castShadow = false; root.add(tb);
    const f = new L.Flow(arc, { n: 8, size: 0.035, color: '#e8f0f2', seed: 200 + k, geo: new THREE.SphereGeometry(1, 6, 4), material: L.mat(0xffffff, { roughness: 0.6 }) });
    root.add(f.mesh);
    // filete pelo lote e pela calçada até a guia
    const zc = toA ? A.z0 : B.z1, pts = [];
    for (let z = land[2]; toA ? z <= zc + 0.3 : z >= zc - 0.3; z += dz * 0.2) pts.push([s.x + 0.08 * Math.sin(z * 2.1 + k), hm.urb(s.x, z) + 0.018, z]);
    if (pts.length > 2) {
      const pos = [], idx = []; const w = 0.09;
      pts.forEach((p, i) => { pos.push(p[0] - w, p[1], p[2], p[0] + w, p[1], p[2]); if (i < pts.length - 1) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const rm = new THREE.Mesh(g, jetMat); rm.renderOrder = 9; rm.receiveShadow = true; root.add(rm); rivulets.push(rm);
      const ff = new L.Flow(pts.map((p) => [p[0], p[1] + 0.02, p[2]]), { n: Math.max(4, Math.round(pts.length / 2)), size: 0.03, color: '#eef2f0', seed: 300 + k, geo: new THREE.SphereGeometry(1, 6, 4), material: L.mat(0xffffff, { roughness: 0.8 }) });
      root.add(ff.mesh); rivulets.push(ff);
    }
    jets.push({ tb, f, s });
  });
  void rivMat;

  /* ---------- gotas pingando dos beirais ---------- */
  const roofs = hm.roofs.filter((r) => r.y < 20);
  const drips = [];
  roofs.forEach((r) => {
    for (const z of [r.z0 - 0.05, r.z1 + 0.05]) for (let x = r.x0 + 0.3; x < r.x1 - 0.2; x += 0.55) drips.push({ x, z, y0: r.y - 0.9, y1: hm.urb(x, z) });
  });
  const dripIM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), L.glass('#d8ecf6', 0.7), drips.length);
  dripIM.frustumCulled = false; dripIM.castShadow = false; dripIM.renderOrder = 15; root.add(dripIM);
  const drd = L.rng(55); drips.forEach((d) => { d.ph = drd(); d.P = 0.55 + drd() * 0.5; });
  const _d = new THREE.Object3D();
  function updDrips(t, a) {
    for (let i = 0; i < drips.length; i++) {
      const d = drips[i], u = ((t / d.P + d.ph) % 1), fall = d.y0 - d.y1;
      // pende na borda (0–0.45), cai (0.45–1)
      let y = d.y0, s = 0.035;
      if (u > 0.45) { const k = (u - 0.45) / 0.55, tt = k * Math.sqrt((2 * fall) / 9.8); y = d.y0 - Math.min(fall, 4.9 * tt * tt); }
      else s = 0.035 * (0.4 + u / 0.45);
      _d.position.set(d.x, y, d.z); _d.scale.set(s * a, s * a * (u > 0.45 ? 2.2 : 1.3), s * a); _d.updateMatrix(); dripIM.setMatrixAt(i, _d.matrix);
    }
    dripIM.instanceMatrix.needsUpdate = true;
  }

  function update(t, S) {
    const urban = S.build.asphalt > 0.98, rain = S.rain, run = S.runoff;
    const F = S.flood;
    const wet = urban ? L.clamp01(Math.max(rain * 1.8, run)) : 0;
    const inlOn = S.build.inlets > 0.99;
    // poças: com chuva sem drenagem crescem; com bocas de lobo funcionando ficam pequenas; secam junto com a lâmina
    const pud = urban ? L.clamp01(Math.max(run * (inlOn ? 0.35 + 0.65 * (1 - S.inletIn) : 1), L.sstep(Lo.FLOOD.dry, 2.9, F))) : 0;
    U.uWet.value = wet; U.uPud.value = pud * wet; U.uFlood.value = F;
    skins.forEach((m) => { m.visible = wet > 0.01; });
    const r = urban ? run : 0;
    GU.uRun.value = r; GU.uInl.value = inlOn ? S.inletIn : 0; GU.uEnl.value = S.build.enlarge > 0.98 ? 1 : 0; GU.uFlood.value = F;
    gutters.forEach(({ m }) => { m.visible = r > 0.01; });
    foamFlows.forEach(({ f }) => { f.mesh.visible = r > 0.05; });
    // velocidade: 1,6 m/s na sarjeta → fase por comprimento
    foamFlows.forEach(({ f, len }) => {
      if (!f.mesh.visible) return;
      f.update(t, { speed: 1.6 / len, amount: L.sstep(0.05, 0.4, r), size: 0.045 * (0.6 + 0.6 * r) });
      // espuma que entrou na lâmina do alagamento some (a lâmina tem a própria correnteza)
      const arr = f.mesh.instanceMatrix.array;
      for (let i = 0; i < f.n; i++) { const o = i * 16; if (arr[o + 13] - 0.06 < F) for (let k = 0; k < 11; k++) arr[o + k] = 0; }
    });
    // bocas de lobo
    const enl = S.build.enlarge > 0.98;
    const inA = inlOn ? L.clamp01(S.inletIn * 1.3) * L.sstep(0.02, 0.2, r) : 0;
    IU.uIn.value = inA;
    swirls.forEach(({ m, q }) => { const on = inA > 0.01 && (!q.extra || enl) && F < q.y + 0.04; m.visible = on; });
    swirlFlows.forEach(({ f, q }) => { const on = inA > 0.01 && (!q.extra || enl) && F < q.y + 0.04; f.mesh.visible = on; if (on) f.update(t, { speed: 0.9, amount: inA }); });
    // condutores
    const roofOn = S.build.houses > 0.99 && urban;
    const sp = roofOn ? L.sstep(0.05, 0.4, Math.max(run, rain * 0.8)) : 0;
    jets.forEach(({ tb, f }) => { tb.visible = sp > 0.01; tb.scale.setScalar(1); f.mesh.visible = sp > 0.01; if (sp > 0.01) f.update(t, { speed: 2.2, amount: sp }); });
    rivulets.forEach((o) => { if (o.isMesh) o.visible = sp > 0.01; else { o.mesh.visible = sp > 0.01; if (sp > 0.01) o.update(t, { speed: 0.5, amount: sp }); } });
    // pingos dos beirais
    const da = roofOn ? L.sstep(0.05, 0.3, rain) : 0;
    dripIM.visible = da > 0.01; if (da > 0.01) updDrips(t, 1);
    root.visible = wet > 0.01 || r > 0.01 || sp > 0.01;
    void onStreet;
  }
  return { update, root };
}
