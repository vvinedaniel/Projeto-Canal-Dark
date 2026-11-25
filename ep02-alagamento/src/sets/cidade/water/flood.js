// LÂMINA / ALAGAMENTO: superfície horizontal na cota S.flood sobre o vale urbano. A malha só cobre as células onde o
// chão pode ficar abaixo do nível máximo (e fura o piscinão depois de escavado); o shader lê o mapa de alturas e
// desenha a margem com espuma, profundidade (cor/opacidade), ondas em volta dos carros e correnteza para o ponto baixo.
// No corte da frente (z = ZF) uma face d'água vertical mostra o volume entre a calçada e o nível.
// Detritos e flocos de espuma boiam e derivam para o ponto baixo (CPU, poucos).
import { HM_GLSL, hmUniforms, tameEnv } from './hmap.js';

export function makeFlood(ctx, hm) {
  const { L, THREE, scene, Lo, shared } = ctx;
  const root = new THREE.Group(); root.name = 'water.flood'; scene.add(root);
  const FMAX = Lo.FLOOD.before + 0.08, CELL = 0.5;
  const RES = Lo.RESERVOIR, rw = RES.wall + 0.05;
  const inRes = (x, z) => x > RES.x0 - rw && x < RES.x1 + rw && z > RES.z0 - rw && z < RES.z1 + rw;

  /* ---------- malha da lâmina (só onde pode haver água) ---------- */
  function sheetGeo(holeRes) {
    const pos = [], idx = [];
    const X0 = -40, X1 = 21.6, Z0 = -11.8, Z1 = Lo.ZF;
    const nx = Math.ceil((X1 - X0) / CELL), nz = Math.ceil((Z1 - Z0) / CELL);
    const vid = new Map();
    const v = (i, j) => { const k = i * 10000 + j; let id = vid.get(k); if (id === undefined) { id = pos.length / 3; pos.push(Math.min(X1, X0 + i * CELL), 0, Math.min(Z1, Z0 + j * CELL)); vid.set(k, id); } return id; };
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const xa = X0 + i * CELL, za = Z0 + j * CELL, xb = Math.min(X1, xa + CELL), zb = Math.min(Z1, za + CELL);
      let lo = 1e9, mk = 0;
      for (const [x, z] of [[xa, za], [xb, za], [xa, zb], [xb, zb], [(xa + xb) / 2, (za + zb) / 2]]) { lo = Math.min(lo, hm.urb(x, z)); mk = Math.max(mk, hm.mask(x, z)); }
      if (lo > FMAX || mk < 0.02) continue;
      if (holeRes && inRes((xa + xb) / 2, (za + zb) / 2)) continue;
      const a = v(i, j), b = v(i + 1, j), c = v(i, j + 1), d = v(i + 1, j + 1);
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setIndex(idx);
    return g;
  }
  const geoFull = sheetGeo(false), geoHole = sheetGeo(true);

  // carros: posição/rotação (do módulo cidade se houver, senão do layout)
  const cars = Lo.CARS.map((c) => ({ x: c.x, z: c.z, rot: c.rot }));
  if (shared.cars && shared.cars.length) shared.cars.forEach((c, i) => { if (cars[i]) { cars[i].x = c.x; cars[i].z = c.z; if (c.rot !== undefined) cars[i].rot = c.rot; } });
  const uCars = cars.slice(0, 4).map((c) => new THREE.Vector4(c.x, c.z, c.rot, 1));
  while (uCars.length < 4) uCars.push(new THREE.Vector4(0, 0, 0, 0));

  const U = { ...hmUniforms(hm), uFlood: { value: 2 }, uCars: { value: uCars }, uSag: { value: new THREE.Vector2(Lo.SAG.x, 19) }, uResOn: { value: 0 },
    uResRect: { value: new THREE.Vector4(RES.x0 - rw, RES.x1 + rw, RES.z0 - rw, RES.z1 + rw) }, uFlow: { value: 1 } };
  const SHEET_FS_HEAD = `
${HM_GLSL}
uniform float uFlood, uResOn, uFlow; uniform vec4 uCars[4]; uniform vec2 uSag; uniform vec4 uResRect;
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
`;
  const SHEET_FS_BODY = `
{
  vec4 hh = hmAt(vWPos.xz);
  // margem irregular: o asfalto real tem ondulações de poucos cm (a mancha não fica com borda reta)
  float rough = (vnoise(vWPos.xz * 0.45 + 3.0) - 0.5) * 0.05 + (vnoise(vWPos.xz * 2.3) - 0.5) * 0.012;
  float dep = uFlood - hh.g + rough;
  float roofed = step(-50.0, hh.b);
  float inR = uResOn * step(uResRect.x, vWPos.x) * step(vWPos.x, uResRect.y) * step(uResRect.z, vWPos.z) * step(vWPos.z, uResRect.w);
  if (dep < 0.0 || hh.a < 0.02 || inR > 0.5) discard;
  // cor: raso = enxurrada clara e barrenta; fundo = cinza-azulado turvo
  vec3 shallow = vec3(0.34, 0.26, 0.14), deep = vec3(0.20, 0.17, 0.11);
  float kd = smoothstep(0.0, 0.45, dep);
  vec3 c = mix(shallow, deep, kd);
  float a = mix(0.45, 0.97, smoothstep(0.0, 0.16, dep));
  // correnteza: estrias de espuma arrastadas para o ponto baixo
  vec2 toS = uSag - vWPos.xz; float dS = length(toS); vec2 dir = toS / max(dS, 0.001);
  vec2 pr = vec2(dot(vWPos.xz, dir), dot(vWPos.xz, vec2(-dir.y, dir.x)));
  float stv = vnoise(vec2(pr.x * 0.9 - uTime * 0.9 * uFlow, pr.y * 2.6));
  float streaks = smoothstep(0.66, 0.82, stv) * (0.35 + 0.65 * smoothstep(2.0, 12.0, dS)) * uFlow;
  // espuma e bolhas na margem
  float n = vnoise(vWPos.xz * 3.1 + vec2(uTime * 0.15, -uTime * 0.1));
  float shore = 1.0 - smoothstep(0.0, 0.035 + 0.05 * n, dep);
  float bub = step(0.78, vnoise(vWPos.xz * 22.0 + uTime * 0.6)) * (1.0 - smoothstep(0.0, 0.12, dep));
  // ondas e espuma em volta dos carros
  float carF = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 cc = uCars[i]; if (cc.w < 0.5) continue;
    vec2 q = vWPos.xz - cc.xy; float cs = cos(cc.z), sn = sin(cc.z); q = vec2(cs * q.x - sn * q.y, sn * q.x + cs * q.y);
    float sd = sdBox(q, vec2(2.15, 0.88)) - 0.08;
    float ring = (1.0 - smoothstep(0.0, 0.32, sd)) * step(-0.05, sd);
    float wave = (0.5 + 0.5 * sin(sd * 18.0 - uTime * 5.0)) * (1.0 - smoothstep(0.2, 1.6, sd)) * step(0.0, sd);
    carF = max(carF, ring * (0.6 + 0.4 * n) + wave * 0.35);
  }
  carF *= smoothstep(0.05, 0.25, dep);
  float foam = clamp(max(max(shore * (0.7 + 0.3 * n), bub * 0.8), max(carF, streaks * 0.55)), 0.0, 1.0);
  c = mix(c, vec3(0.62, 0.60, 0.54), foam);
  a = mix(a, 0.97, foam) * (1.0 - roofed * 0.0);
  diffuseColor.rgb = c; diffuseColor.a = a * opacity;
}`;
  function floodMat() {
    const m = L.water('#7f9aa6', 0.92, { side: THREE.FrontSide, roughness: 0.22, envMapIntensity: 0.35 });
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh) => {
      prev(sh); Object.assign(sh.uniforms, U); tameEnv(sh, 0.28);
      sh.fragmentShader = sh.fragmentShader.replace('uniform float uWStr;', 'uniform float uWStr;' + SHEET_FS_HEAD).replace('#include <color_fragment>', '#include <color_fragment>' + SHEET_FS_BODY);
    };
    m.customProgramCacheKey = () => 'water-flood-v3';
    m.depthWrite = false;
    return m;
  }
  const sheetMat = floodMat();
  const sheet = new THREE.Mesh(geoFull, sheetMat); sheet.receiveShadow = true; sheet.castShadow = false; sheet.renderOrder = 12; sheet.frustumCulled = false;
  root.add(sheet);

  /* ---------- face d'água no corte da frente ---------- */
  const faceX0 = -38, faceX1 = Math.min(16, Lo.CANAL.x0), FS = 0.25, fpos = [], ftop = [], fidx = [];
  for (let x = faceX0, i = 0; x <= faceX1 + 1e-6; x += FS, i++) {
    const yb = hm.urb(x, Lo.ZF - 0.02);
    fpos.push(x, yb, Lo.ZF + 0.004, x, yb, Lo.ZF + 0.004); ftop.push(0, 1);
    if (x + FS <= faceX1 + 1e-6) { const b = i * 2; fidx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3)); fg.setAttribute('top', new THREE.Float32BufferAttribute(ftop, 1)); fg.setIndex(fidx);
  const fn = new Float32Array(fpos.length); for (let i = 2; i < fn.length; i += 3) fn[i] = 1; fg.setAttribute('normal', new THREE.BufferAttribute(fn, 3));
  const faceMat = L.water('#6f8790', 0.9, { side: THREE.DoubleSide, roughness: 0.3, envMapIntensity: 0.3 });
  { const prev = faceMat.onBeforeCompile;
    faceMat.onBeforeCompile = (sh) => {
      prev(sh); sh.uniforms.uFlood = U.uFlood; tameEnv(sh, 0.3);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float top; uniform float uFlood;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nif (top > 0.5) transformed.y = max(uFlood, transformed.y);');
      sh.fragmentShader = sh.fragmentShader.replace('uniform float uWStr;', 'uniform float uWStr; uniform float uFlood;' + HM_GLSL.replace(/uniform sampler2D[^\n]*\n/, '').replace(/vec4 hmAt[^\n]*\n/, ''))
        .replace('#include <color_fragment>', `#include <color_fragment>
{ float dd = uFlood - vWPos.y; float k = smoothstep(0.0, 0.6, dd);
  vec3 c = mix(vec3(0.26, 0.20, 0.11), vec3(0.13, 0.10, 0.05), k);
  float sed = vnoise(vec2(vWPos.x * 6.0 - uTime * 0.8, vWPos.y * 14.0 + uTime * 0.3));
  c += (sed - 0.5) * 0.06;
  float lip = 1.0 - smoothstep(0.0, 0.035, dd);
  c = mix(c, vec3(0.6, 0.6, 0.56), lip * 0.8);
  diffuseColor.rgb = c; diffuseColor.a = mix(0.88, 0.97, k); }`);
    };
    faceMat.customProgramCacheKey = () => 'water-face-v2';
  }
  faceMat.depthWrite = false;
  const face = new THREE.Mesh(fg, faceMat); face.frustumCulled = false; face.renderOrder = 13; face.castShadow = false; root.add(face);

  /* ---------- detritos e espuma boiando (derivam para o ponto baixo) ---------- */
  const rd = L.rng(777), SAG = new THREE.Vector2(Lo.SAG.x, 19);
  // trajetos pré-calculados: partem de pontos do vale e seguem a "correnteza" (para o ponto baixo, com redemoinho)
  function trace(x, z, n, step) {
    const pts = [[x, z]];
    for (let i = 0; i < n; i++) {
      let dx = SAG.x - x, dz = SAG.y - z; const d = Math.hypot(dx, dz) + 1e-3; dx /= d; dz /= d;
      const sw = 0.55 * Math.exp(-d / 6); // giro perto do ponto baixo
      const vx = dx * (1 - sw) - dz * sw, vz = dz * (1 - sw) + dx * sw;
      x += vx * step; z += vz * step; pts.push([x, z]);
      if (d < 0.8) break;
    }
    return pts;
  }
  function seedPoint() {
    for (let k = 0; k < 200; k++) { const x = -3 + rd() * 22, z = 12 + rd() * 14; if (hm.urb(x, z) < Lo.FLOOD.before - 0.15 && hm.mask(x, z) > 0.5 && !inRes(x, z)) return [x, z]; }
    return [SAG.x, SAG.y];
  }
  function drifters(n, geo, matl, colors, o) {
    const im = new THREE.InstancedMesh(geo, matl, n); im.frustumCulled = false; im.castShadow = !!o.cast; im.receiveShadow = true;
    const items = [];
    for (let i = 0; i < n; i++) {
      const [x, z] = seedPoint(), path = trace(x, z, 400, o.step);
      items.push({ path, ph: rd(), sp: o.speed * (0.7 + rd() * 0.6), s: o.size * (0.6 + rd() * 0.8), rot: rd() * 6.28, sx: 0.5 + rd(), bob: rd() * 6 });
      im.setColorAt(i, new THREE.Color(colors[Math.floor(rd() * colors.length)]));
    }
    im.instanceColor.needsUpdate = true; im.renderOrder = 14; root.add(im);
    return { im, items, o };
  }
  const leafGeo = new THREE.CylinderGeometry(1, 1, 0.12, 7); leafGeo.scale(1, 1, 0.55);
  const debris = [
    drifters(32, leafGeo, L.mat(0xffffff, { roughness: 0.8 }), ['#6b8a3a', '#8a6a32', '#a5823e', '#5d7a34', '#7a5a2a'], { size: 0.09, speed: 0.22, step: 0.12 }),
    drifters(14, new THREE.CylinderGeometry(0.06, 0.06, 0.28, 10).rotateZ(Math.PI / 2), L.glossy(0xffffff, { roughness: 0.3 }), ['#8fd0ee', '#e8f4f8', '#4fae63'], { size: 1, speed: 0.16, step: 0.12, cast: true }),
    drifters(10, new THREE.BoxGeometry(0.7, 0.05, 0.08), L.mat('#6e5034', { roughness: 0.9 }), ['#ffffff'], { size: 1, speed: 0.14, step: 0.12, cast: true }),
    drifters(150, new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2), L.mat(0xffffff, { roughness: 0.9, transparent: true, opacity: 0.7, depthWrite: false }), ['#d9d3c2', '#cfc6b0'], { size: 0.05, speed: 0.55, step: 0.12, foam: true })
  ];
  const _d = new THREE.Object3D();
  function updDrift(t, S) {
    const F = S.flood;
    for (const D of debris) {
      const { im, items, o } = D;
      for (let i = 0; i < items.length; i++) {
        const it = items[i], P = it.path, Lp = P.length - 1;
        const u = ((it.ph + (t * it.sp) / (Lp * o.step)) % 1 + 1) % 1, f = u * Lp, k = Math.min(Lp - 1, Math.floor(f)), w = f - k;
        const x = P[k][0] + (P[k + 1][0] - P[k][0]) * w, z = P[k][1] + (P[k + 1][1] - P[k][1]) * w;
        const dep = F - hm.urb(x, z);
        const vis = L.sstep(0.04, 0.14, dep) * Math.min(1, u * 12, (1 - u) * 12) * (hm.mask(x, z) > 0.5 ? 1 : 0) * (S.build.reservoir > 0.02 && inRes(x, z) ? 0 : 1);
        _d.position.set(x, F + 0.012 + (o.foam ? 0.004 : 0.02 * Math.sin(t * 2.1 + it.bob)), z);
        _d.rotation.set(o.foam ? 0 : 0.15 * Math.sin(t * 1.7 + it.bob), it.rot + t * 0.3 * (i % 2 ? 1 : -1), o.foam ? 0 : 0.12 * Math.cos(t * 1.3 + it.bob));
        const s = it.s * vis; _d.scale.set(s * (o.foam ? it.sx : 1), s, s); _d.updateMatrix(); im.setMatrixAt(i, _d.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    }
  }

  function update(t, S) {
    const F = S.flood, wet = F > Lo.FLOOD.dry + 0.02;
    root.visible = wet;
    if (!wet) return;
    U.uFlood.value = F; U.uResOn.value = S.build.reservoir > 0.02 ? 1 : 0;
    U.uFlow.value = 0.35 + 0.65 * Math.max(S.runoff, S.rain);
    sheet.geometry = S.build.reservoir > 0.02 ? geoHole : geoFull;
    sheet.position.y = F;
    face.visible = F > hm.urb(Lo.SAG.x, Lo.ZF - 0.02) + 0.005;
    updDrift(t, S);
  }
  return { update, root };
}
