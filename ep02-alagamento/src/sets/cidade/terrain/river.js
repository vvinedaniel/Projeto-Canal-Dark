// Água do rio (nível = S.river, face d'água nos cortes da frente e de trás, espuma na margem, folhas boiando)
// e do córrego natural (água rasa correndo até o rio enquanto ele existir).
import * as L from '../../../lib.js';
import { canalFloor, OUT0, OUT1 } from './holes.js';
const { THREE, clamp01, lerp, sstep, fract } = L;

const _o = new THREE.Object3D(), _c = new THREE.Color();

function laminaGeo(n) { // faixa vertical com cor por vértice (RGBA)
  const g = new THREE.BufferGeometry(), idx = [];
  for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 8), 4));
  g.setIndex(idx); return g;
}
function setV(g, i, x, y, z, col, a) { const p = g.attributes.position.array, q = g.attributes.color.array; p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z; q[i * 4] = col.r; q[i * 4 + 1] = col.g; q[i * 4 + 2] = col.b; q[i * 4 + 3] = a; }

export function buildRiver(ctx, gr) {
  const { Lo, scene } = ctx;
  const { Z0, ZF, RIVER } = Lo;
  const grp = new THREE.Group(); scene.add(grp);
  const bed = (x, z) => gr.hAt(x, z);
  // margens: base(x) é monótona em cada lado do leito
  const solve = (a, b, y) => { let lo = a, hi = b; const fa = Lo.base(a) - y; for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if ((Lo.base(m) - y) * fa > 0) lo = m; else hi = m; } return (lo + hi) / 2; };

  /* ---------- rio ---------- */
  const cNorm = new THREE.Color('#3f8db3'), cHigh = new THREE.Color('#6d8f86'), cDeep = new THREE.Color('#0d4d73'), cDeepHigh = new THREE.Color('#3d5a52');
  const wm = L.water('#ffffff', 0.84, { side: THREE.DoubleSide, depthWrite: false });
  const surfGeo = new THREE.PlaneGeometry(1, ZF - Z0, 1, 1); surfGeo.rotateX(-Math.PI / 2); surfGeo.translate(0.5, 0, (Z0 + ZF) / 2);
  const surf = L.mesh(surfGeo, wm, 0, 0, 0, { cast: false }); surf.renderOrder = 12; grp.add(surf);
  const NF = 64, faceMat = L.water('#ffffff', 1, { vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.35 });
  const fFront = laminaGeo(NF), fBack = laminaGeo(NF);
  [fFront, fBack].forEach((g) => { const m = L.mesh(g, faceMat, 0, 0, 0, { cast: false, receive: false }); m.renderOrder = 11; m.frustumCulled = false; grp.add(m); });
  // espuma na linha d'água das duas margens
  const foamMat = L.mat('#eef6f8', { transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.6 });
  const foamGeo = new THREE.PlaneGeometry(0.32, ZF - Z0 - 0.02, 1, 1); foamGeo.rotateX(-Math.PI / 2);
  const foamL = L.mesh(foamGeo, foamMat, 0, 0, (Z0 + ZF) / 2, { cast: false }), foamR = L.mesh(foamGeo, foamMat, 0, 0, (Z0 + ZF) / 2, { cast: false });
  foamL.renderOrder = foamR.renderOrder = 13; grp.add(foamL, foamR);
  // folhas e espuma boiando, correndo para o fundo (−z)
  const NB = 90, rdb = L.rng(808), bits = [];
  for (let i = 0; i < NB; i++) bits.push({ ph: rdb(), lane: rdb(), sp: 0.035 + rdb() * 0.03, s: 0.05 + rdb() * 0.08, rot: rdb() * 6, col: ['#f2f4ee', '#e9efe9', '#c9b25a', '#8fb24a', '#d9e2dc'][Math.floor(rdb() * 5)] });
  const bitIM = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2), L.mat('#ffffff', { roughness: 0.7, side: THREE.DoubleSide }), NB);
  bits.forEach((b, i) => bitIM.setColorAt(i, _c.set(b.col))); bitIM.frustumCulled = false; bitIM.castShadow = false; bitIM.renderOrder = 14; grp.add(bitIM);

  // água do rio entrando na vala de saída do canal (até a cabeceira), quando o rio está acima do fundo dela
  const TR_Z = ZF - Lo.CANAL.half - Lo.CANAL.wall, XH = OUT0 + 0.02;
  const trW = L.mesh(new THREE.PlaneGeometry(1, ZF - TR_Z + 0.1).rotateX(-Math.PI / 2).translate(0.5, 0, (TR_Z + ZF) / 2 - 0.05), wm, 0, 0, 0, { cast: false }); trW.renderOrder = 12; grp.add(trW);
  function updateRiver(t, S) {
    const y = S.river, kh = clamp01((y - RIVER.normal) / (RIVER.high - RIVER.normal));
    const xl = solve(RIVER.x0, 32.5, y), xr = solve(32.5, RIVER.x1, y);
    const inTrench = gr.P.sweep > OUT1 - 0.2 && y > canalFloor(Lo, XH) + 0.02 && xl > XH;
    trW.visible = inTrench; if (inTrench) { trW.position.set(XH, y, 0); trW.scale.set(xl - XH + 0.05, 1, 1); }
    const xlF = inTrench ? XH : xl, botF = (x) => (inTrench ? Math.min(bed(x, ZF), canalFloor(Lo, x)) : bed(x, ZF));
    surf.position.set(xl - 0.02, y, 0); surf.scale.set(xr - xl + 0.04, 1, 1);
    const top = _c.copy(cNorm).lerp(cHigh, kh * 0.75); wm.color.copy(top);
    const deep = new THREE.Color().copy(cDeep).lerp(cDeepHigh, kh * 0.7);
    for (const [g, z] of [[fFront, ZF + 0.003], [fBack, Z0 - 0.003]]) {
      const front = z > 0, x0 = front ? xlF : xl;
      for (let i = 0; i < NF; i++) {
        const x = lerp(x0, xr, i / (NF - 1)), b = Math.min(y, front ? botF(x) : bed(x, Z0)), dep = y - b;
        setV(g, i * 2, x, y + 0.004 * Math.sin(x * 3 + t * 2), z, top, 0.62); setV(g, i * 2 + 1, x, b, z, _c.copy(top).lerp(deep, clamp01(dep / 3.5)), lerp(0.62, 0.95, clamp01(dep / 2.5)));
      }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeVertexNormals();
    }
    foamL.position.x = xl + 0.1; foamR.position.x = xr - 0.1; foamL.position.y = foamR.position.y = y + 0.012;
    for (let i = 0; i < NB; i++) {
      const b = bits[i], u = fract(b.ph + t * b.sp * (1 + kh)), x = lerp(xl + 0.6, xr - 0.6, b.lane), z = lerp(ZF - 0.3, Z0 + 0.3, u);
      _o.position.set(x + 0.15 * Math.sin(t * 0.7 + i), y + 0.018, z); _o.rotation.set(0, b.rot + t * 0.3, 0);
      _o.scale.set(b.s, 1, b.s * 0.65).multiplyScalar(Math.min(1, Math.min(u, 1 - u) * 12)); _o.updateMatrix(); bitIM.setMatrixAt(i, _o.matrix);
    }
    bitIM.instanceMatrix.needsUpdate = true;
  }

  /* ---------- córrego natural ---------- */
  const CX0 = Lo.CREEK.x0 - 0.6, CX1 = Lo.CREEK.x1 + 0.1, NC = Math.round((CX1 - CX0) / 0.2) + 1, cxs = [];
  for (let i = 0; i < NC; i++) cxs.push(lerp(CX0, CX1, i / (NC - 1)));
  const cm = L.water('#ffffff', 0.9, { side: THREE.DoubleSide, depthWrite: false, vertexColors: true, roughness: 0.22 });
  const cSurf = laminaGeo(NC), cFace = laminaGeo(NC);
  const cS = L.mesh(cSurf, cm, 0, 0, 0, { cast: false, receive: false }); cS.renderOrder = 12; cS.frustumCulled = false; grp.add(cS);
  const cF = L.mesh(cFace, cm, 0, 0, 0, { cast: false, receive: false }); cF.renderOrder = 11; cF.frustumCulled = false; grp.add(cF);
  const cTop = new THREE.Color('#3f8fb0'), cLow = new THREE.Color('#2b4d3c');
  const NP = 80, rdp = L.rng(99), parts = [];
  for (let i = 0; i < NP; i++) parts.push({ ph: rdp(), w: rdp(), s: 0.018 + rdp() * 0.025, sp: 0.04 + rdp() * 0.03 });
  const pIM = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2), L.mat('#f4fbff', { roughness: 0.4, transparent: true, opacity: 0.7, depthWrite: false }), NP);
  pIM.frustumCulled = false; pIM.castShadow = false; pIM.renderOrder = 14; grp.add(pIM);
  const lev = new Float32Array(NC), wid = new Float32Array(NC), bedNow = new Float32Array(NC);

  function updateCreek(t, S) {
    const flow = S.runoffNatural, rain = S.rain;
    let any = false;
    for (let i = 0; i < NC; i++) {
      const x = cxs[i], k = gr.creekK(x), cut0 = Lo.creekCut(x, ZF), cut = cut0 * k, b = Lo.G(x, ZF) - cut;
      let d = (0.1 + 0.12 * flow + 0.04 * clamp01(rain / 0.45)) * clamp01(cut / 0.25) * sstep(0.35, 0.8, k);
      d = Math.min(d, cut * 0.8);
      if (b + d < S.river + 0.02 && x > 25) d = 0;              // a boca afoga no rio
      bedNow[i] = b; lev[i] = b + d; wid[i] = d > 0.004 ? Lo.CREEK.half * Math.min(1, Math.sqrt(d / Math.max(cut, 1e-3))) : 0;
      if (d > 0.004) any = true;
    }
    cS.visible = cF.visible = any;
    if (!any) { pIM.visible = false; return; }
    for (let i = 0; i < NC; i++) {
      const x = cxs[i], on = wid[i] > 0, w = on ? wid[i] + 0.03 : 0, y = on ? lev[i] : bedNow[i] - 0.05, dep = lev[i] - bedNow[i];
      setV(cSurf, i * 2, x, y, ZF - w, cTop, on ? 0.55 : 0); setV(cSurf, i * 2 + 1, x, y, ZF + 0.002, cTop, on ? 0.62 : 0);
      setV(cFace, i * 2, x, y, ZF + 0.002, cTop, on ? 0.45 : 0); setV(cFace, i * 2 + 1, x, on ? bedNow[i] : y, ZF + 0.002, _c.copy(cTop).lerp(cLow, clamp01(dep / 0.3)), on ? 0.7 : 0);
    }
    [cSurf, cFace].forEach((g) => { g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.computeVertexNormals(); });
    pIM.visible = true;
    const sp = 1 + 1.6 * flow;
    for (let j = 0; j < NP; j++) {
      const p = parts[j], u = fract(p.ph + t * p.sp * sp), fi = u * (NC - 1), i = Math.min(NC - 2, Math.floor(fi)), f = fi - i;
      const w = lerp(wid[i], wid[i + 1], f), y = lerp(lev[i], lev[i + 1], f), x = lerp(cxs[i], cxs[i + 1], f);
      const s = w > 0.05 ? p.s * (1 + flow * 0.5) : 0;
      _o.position.set(x, y + 0.01, ZF - 0.05 - p.w * Math.max(0, w - 0.1)); _o.rotation.set(0, 0, 0); _o.scale.set(s * 1.8, 1, s);
      _o.updateMatrix(); pIM.setMatrixAt(j, _o.matrix);
    }
    pIM.instanceMatrix.needsUpdate = true;
  }
  return { grp, update(t, S) { updateRiver(t, S); updateCreek(t, S); } };
}
