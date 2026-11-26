// Águas do terreno: represa (espelho com ondulação), rio de entrada (fita que desce a serra em poços e cascatas, com
// espuma e flocos correndo), vertedouro (lâmina sobre a soleira, escoamento em degraus, ressalto na bacia), rio de saída
// e as faces d'água onde os rios atravessam o corte do bloco. Tudo animado só por t (função pura).
import * as L from '../../../lib.js';
import * as R from './relief.js';
const { THREE, clamp01, lerp, sstep, fract } = L;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

/** malha plana d'água nas células (passo 1 m) onde o chão fica abaixo do nível */
function flatWater(x0, x1, z0, z1, level, keep, step = 1) {
  const pos = [], idx = []; let n = 0;
  for (let z = z0; z < z1 - 1e-6; z += step) for (let x = x0; x < x1 - 1e-6; x += step) {
    const xa = x, xb = Math.min(x1, x + step), za = z, zb = Math.min(z1, z + step);
    const lo = Math.min(R.H(xa, za), R.H(xb, za), R.H(xa, zb), R.H(xb, zb), R.H((xa + xb) / 2, (za + zb) / 2));
    if (lo > level - 0.01 || !keep((xa + xb) / 2, (za + zb) / 2)) continue;
    pos.push(xa, level, za, xb, level, za, xa, level, zb, xb, level, zb); idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); n += 4;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const nr = new Float32Array(pos.length); for (let i = 1; i < nr.length; i += 3) nr[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(nr, 3));
  return BGUmerge(g);
}
const BGUmerge = (g) => L.BGU.mergeVertices(g, 1e-4);

/** face d'água vertical num corte: amostras [u, yTop, yBot] → faixa no plano (axis 'x' = plano x=c, 'z' = plano z=c) */
function waterFace(samples, axis, c, colTop, colBot) {
  const pos = [], col = [], idx = [];
  samples.forEach(([u, yt, yb], i) => {
    const P = (y) => (axis === 'x' ? [c, y, u] : [u, y, c]);
    pos.push(...P(yt), ...P(yb)); col.push(colTop.r, colTop.g, colTop.b, colBot.r, colBot.g, colBot.b);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function buildWater(ctx) {
  const { Lo, scene } = ctx;
  const grp = new THREE.Group(); grp.name = 'terreno.water'; scene.add(grp);
  const lake = Lo.LAKE.level, sp = R.SPILL, X1 = Lo.X1, Z0 = Lo.Z0;

  /* ---------- represa ---------- */
  const lakeMat = L.water(Lo.WATER.lake, 0.84, { depthWrite: false, side: THREE.DoubleSide });
  const lakeGeo = flatWater(Lo.LAKE.x0 - 6, 36, Lo.LAKE.z0 - 6, -96, lake, (x, z) => (R.inSpillBand(z) ? x < sp.sill1 : x < R.DAMG.c0));
  const lakeM = L.mesh(lakeGeo, lakeMat, 0, 0, 0, { cast: false }); lakeM.renderOrder = 12; grp.add(lakeM);

  /* ---------- rio de entrada: fita d'água ---------- */
  const RI = R.RIN, cIn = new THREE.Color('#5f9c8c'), cFoam = new THREE.Color('#e9f3f2'), cPool = new THREE.Color('#4d8a80');
  const sEnd = RI.sFace + 31.4, D = RI.D.filter((q) => q.s <= sEnd + 0.01);
  const fallK = (s) => { let k = 0; for (const f of RI.falls) { k = Math.max(k, sstep(f.s0 - 0.5, f.s0, s) * (1 - sstep(f.s1 + 1.6, f.s1 + 3.2, s))); } return k; };
  const rapid = (s) => clamp01((s - (RI.sFace + 22.7)) / 2) * (1 - clamp01((s - (RI.sFace + 28.5)) / 3));
  {
    const pos = [], col = [], idx = [], W = RI.hw + 0.7, NA = 5;
    D.forEach((q, i) => {
      const a = D[Math.max(0, i - 1)], b = D[Math.min(D.length - 1, i + 1)], tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nzz = tx / tl;
      const y = RI.wl(q.s) + 0.02, f = Math.max(fallK(q.s), rapid(q.s) * 0.6);
      for (let j = 0; j < NA; j++) {
        const u = (j / (NA - 1)) * 2 - 1; let x = q.x + nx * u * W, z = q.z + nzz * u * W; if (z < Z0) { z = Z0; }
        pos.push(x, y + 0.04 * (1 - u * u) * f, z);
        _c.copy(cIn).lerp(cPool, 0.4 * (1 - f)).lerp(cFoam, clamp01(f * (0.75 + 0.25 * Math.sin(q.s * 3.1 + j))));
        col.push(_c.r, _c.g, _c.b);
        if (i && j) { const p0 = (i - 1) * NA + j - 1, p1 = p0 + 1, p2 = i * NA + j - 1, p3 = p2 + 1; idx.push(p0, p2, p1, p1, p2, p3); }
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = L.mesh(g, L.water('#ffffff', 0.9, { vertexColors: true, depthWrite: false, side: THREE.DoubleSide }), 0, 0, 0, { cast: false }); m.renderOrder = 13; grp.add(m);
  }
  // face d'água do rio de entrada no corte de trás (z = Z0)
  {
    const q = RI.near(-59.2, Z0), wl = RI.wl(q.s), smp = [];
    for (let x = -62; x <= -54; x += 0.1) { const b = R.H(x, Z0); if (b < wl) smp.push([x, wl, b - 0.02]); }
    if (smp.length > 1) { const m = L.mesh(waterFace(smp, 'z', Z0 - 0.01, new THREE.Color('#5f9c8c'), new THREE.Color('#1d4a45')), L.water('#ffffff', 0.92, { vertexColors: true, depthWrite: false, side: THREE.DoubleSide }), 0, 0, 0, { cast: false }); m.renderOrder = 11; grp.add(m); }
  }

  /* ---------- vertedouro: lâmina, degraus, bacia ---------- */
  const spillY = (x) => { // superfície da água ao longo do vertedouro
    if (x < sp.sill0 + 0.6) return lake;
    if (x < sp.sill1) return lerp(lake, sp.sill + 0.16, sstep(sp.sill0 + 0.6, sp.sill1, x));
    if (x < sp.chute1) { const k = (x - sp.sill1) / (sp.chute1 - sp.sill1); return lerp(sp.sill + 0.16, sp.basinY + 0.55, Math.pow(k, 0.92)) + 0.1; }
    if (x < sp.chute1 + 2.2) return lerp(sp.basinY + 0.65, Lo.RIVER_OUT.level + 0.25, sstep(sp.chute1, sp.chute1 + 2.2, x));
    return Lo.RIVER_OUT.level + 0.25 * (1 - sstep(sp.chute1 + 2.2, sp.basin1, x));
  };
  const foamAt = (x) => sstep(sp.sill1 - 0.4, sp.sill1 + 0.6, x) * (1 - 0.65 * sstep(sp.chute1 + 2.5, sp.end + 1, x));
  {
    const pos = [], col = [], idx = [], NA = 7, xs = []; for (let x = sp.sill0 + 0.3; x <= sp.end + 0.6; x += 0.12) xs.push(x);
    const cA = new THREE.Color(Lo.WATER.lake), cW = new THREE.Color('#f2f7f6');
    xs.forEach((x, i) => {
      for (let j = 0; j < NA; j++) {
        const u = j / (NA - 1), z = sp.z - sp.hw + 0.02 + u * (2 * sp.hw - 0.04), f = foamAt(x);
        const bump = f * 0.06 * Math.sin(x * 7.3 + j * 1.9) * Math.sin(x * 2.1 + j);
        pos.push(x, spillY(x) + bump, z);
        _c.copy(cA).lerp(cW, clamp01(f * (0.8 + 0.2 * Math.sin(x * 5 + j * 2.3)))); col.push(_c.r, _c.g, _c.b);
        if (i && j) { const p0 = (i - 1) * NA + j - 1, p1 = p0 + 1, p2 = i * NA + j - 1, p3 = p2 + 1; idx.push(p0, p1, p2, p1, p3, p2); }
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = L.mesh(g, L.water('#ffffff', 0.9, { vertexColors: true, depthWrite: false, side: THREE.DoubleSide }), 0, 0, 0, { cast: false }); m.renderOrder = 13; grp.add(m);
  }

  /* ---------- rio de saída (nível constante) + bacia ---------- */
  const RO = R.ROUT, outLevel = Lo.RIVER_OUT.level;
  const outGeo = flatWater(sp.chute1 + 2.2, X1, -132, -96, outLevel, (x, z) => (R.inSpillBand(z) ? x > sp.chute1 + 2.2 : RO.near(x, z).d < RO.hw + 4), 0.5);
  const outM = L.mesh(outGeo, L.water('#4f8a82', 0.86, { depthWrite: false, side: THREE.DoubleSide }), 0, 0, 0, { cast: false }); outM.renderOrder = 12; grp.add(outM);
  {
    const smp = []; for (let z = -112; z <= -98; z += 0.1) { const b = R.H(X1, z); if (b < outLevel) smp.push([z, outLevel, b - 0.02]); }
    if (smp.length > 1) { const m = L.mesh(waterFace(smp, 'x', X1 + 0.01, new THREE.Color('#4f8a82'), new THREE.Color('#183f3a')), L.water('#ffffff', 0.92, { vertexColors: true, depthWrite: false, side: THREE.DoubleSide }), 0, 0, 0, { cast: false }); m.renderOrder = 11; grp.add(m); }
  }

  /* ---------- espuma e flocos correndo (instâncias, posições só de t) ---------- */
  const foamMat = L.mat('#f4f8f8', { roughness: 0.55, transparent: true, opacity: 0.92, depthWrite: false });
  const flake = new THREE.CircleGeometry(1, 7); flake.rotateX(-Math.PI / 2); flake.scale(1, 1, 0.45);
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const rd = L.rng(4242);
  // rio de entrada
  const NI = 170, fin = []; for (let i = 0; i < NI; i++) fin.push({ ph: rd(), lane: (rd() * 2 - 1) * 0.85, sp: 0.85 + rd() * 0.4, s: 0.1 + rd() * 0.16, r: rd() * 6 });
  const finIM = new THREE.InstancedMesh(flake, foamMat, NI); finIM.frustumCulled = false; finIM.renderOrder = 14; grp.add(finIM);
  // quedas: borrifo (bolhas que crescem e somem) na base de cada cascata e na base da escada do vertedouro
  const bursts = RI.falls.map((f) => { const q = RI.D.find((d) => d.s >= f.s1 + 0.2) || RI.D[RI.D.length - 1]; return { x: q.x, z: q.z, y: RI.wl(q.s), w: RI.hw }; });
  bursts.push({ x: sp.chute1 + 0.6, z: sp.z, y: outLevel + 0.15, w: sp.hw * 0.9, big: 1 });
  const NB = 46, bur = []; bursts.forEach((b, bi) => { const n = b.big ? NB * 2 : NB; for (let i = 0; i < n; i++) bur.push({ b, ph: rd(), lane: rd() * 2 - 1, dz: (rd() * 2 - 1), r: 0.12 + rd() * 0.22 * (b.big ? 1.3 : 1), up: 0.5 + rd() * 0.9 }); });
  const burIM = new THREE.InstancedMesh(puff, foamMat, bur.length); burIM.frustumCulled = false; burIM.renderOrder = 14; grp.add(burIM);
  // vertedouro: espuma descendo a escada e flocos na bacia/rio de saída
  const NS = 120, fsp = []; for (let i = 0; i < NS; i++) fsp.push({ ph: rd(), lane: rd() * 2 - 1, s: 0.1 + rd() * 0.16 });
  const spIM = new THREE.InstancedMesh(puff, foamMat, NS); spIM.frustumCulled = false; spIM.renderOrder = 14; grp.add(spIM);
  const NO = 130, fout = []; for (let i = 0; i < NO; i++) fout.push({ ph: rd(), lane: (rd() * 2 - 1) * 0.8, s: 0.1 + rd() * 0.18, r: rd() * 6 });
  const outIM = new THREE.InstancedMesh(flake, foamMat, NO); outIM.frustumCulled = false; outIM.renderOrder = 14; grp.add(outIM);
  const pointOn = (Dl, s, lane, w, out) => { // ponto ao longo de uma linha densa (com deslocamento lateral)
    let i = 0, lo = 0, hi = Dl.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Dl[m].s <= s) lo = m; else hi = m; } i = lo;
    const a = Dl[i], b = Dl[Math.min(Dl.length - 1, i + 1)], k = b.s > a.s ? clamp01((s - a.s) / (b.s - a.s)) : 0, tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz) || 1;
    out.x = lerp(a.x, b.x, k) - (tz / tl) * lane * w; out.z = lerp(a.z, b.z, k) + (tx / tl) * lane * w; out.a = Math.atan2(-tz, tx); return out;
  };
  const tmp = {};
  const outLen = RO.len;

  function update(t) {
    // rio de entrada: flocos descendo (mais rápidos nas cascatas)
    for (let i = 0; i < NI; i++) {
      const f = fin[i], u = fract(f.ph + t * 0.055 * f.sp), s = RI.sFace + 0.5 + u * (sEnd - RI.sFace - 0.5);
      pointOn(D, s, f.lane, RI.hw * 0.8, tmp);
      const fk = fallK(s), sc = f.s * (1 + fk * 1.6) * Math.min(1, u * 20, (1 - u) * 12);
      _p.set(tmp.x, RI.wl(s) + 0.05 + fk * 0.08, tmp.z); _q.setFromEuler(_e.set(0, tmp.a + f.r, 0)); _s.set(sc * 1.6, sc, sc);
      finIM.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    finIM.instanceMatrix.needsUpdate = true;
    // borrifo nas bases das quedas
    for (let i = 0; i < bur.length; i++) {
      const p = bur[i], b = p.b, u = fract(p.ph + t * 0.9), y = b.y + Math.sin(u * Math.PI) * 0.35 * p.up * (b.big ? 1.4 : 1);
      const sc = p.r * Math.sin(Math.PI * Math.min(1, u * 1.15));
      if (b.big) _p.set(b.x + u * 1.8 * p.up + p.dz * 0.4, y, b.z + p.lane * b.w);
      else _p.set(b.x + p.lane * b.w * 0.6 + p.dz * 0.3 * u, y, b.z + p.dz * b.w * 0.6);
      _s.set(sc, sc * 0.8, sc); burIM.setMatrixAt(i, _m.compose(_p, _q.identity(), _s));
    }
    burIM.instanceMatrix.needsUpdate = true;
    // escada do vertedouro
    for (let i = 0; i < NS; i++) {
      const f = fsp[i], u = fract(f.ph + t * 0.42), x = lerp(sp.sill1 - 0.2, sp.chute1 + 1.0, u);
      const sc = f.s * (0.6 + 0.8 * sstep(sp.sill1, sp.sill1 + 1, x)) * Math.min(1, (1 - u) * 8, u * 10);
      _p.set(x, spillY(x) + 0.06, sp.z + f.lane * (sp.hw - 0.3)); _s.set(sc * 1.4, sc * 0.6, sc); spIM.setMatrixAt(i, _m.compose(_p, _q.identity(), _s));
    }
    spIM.instanceMatrix.needsUpdate = true;
    // rio de saída
    for (let i = 0; i < NO; i++) {
      const f = fout[i], u = fract(f.ph + t * 0.05), s = u * outLen;
      pointOn(RO.D, s, f.lane, RO.hw * 0.8, tmp);
      const vis = tmp.x < X1 - 0.3 ? 1 : 0, sc = vis * f.s * (1.4 - 0.8 * u) * Math.min(1, u * 25, (1 - u) * 10);
      _p.set(tmp.x, outLevel + 0.03, tmp.z); _q.setFromEuler(_e.set(0, tmp.a + f.r, 0)); _s.set(sc * 1.6, sc, sc);
      outIM.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    outIM.instanceMatrix.needsUpdate = true;
  }
  return { update, grp, spillY };
}
