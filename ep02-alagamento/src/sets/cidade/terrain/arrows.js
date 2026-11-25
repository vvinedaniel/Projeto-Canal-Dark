// Setas no solo em corte: infiltração natural (S.infil) descendo entre os grãos até o lençol freático,
// e bloqueio (S.blocked): sob calçadas/ruas/telhados a água bate na superfície, desvia de lado, com um X vermelho.
import * as L from '../../../lib.js';
const { THREE, PAL, clamp01, lerp, sstep, fract } = L;

const _o = new THREE.Object3D();

export function buildArrows(ctx, gr) {
  const { Lo, scene, shared } = ctx;
  const { ZF } = Lo;
  const grp = new THREE.Group(); scene.add(grp);
  const ZA = ZF + 0.07;
  const wt = (x) => Math.min(gr.contour(x) - 2.6, -2.2 + 0.11 * Math.max(0, 26 - x)); // mesma cota do shader do solo
  const blue = '#5cc8ff', rd = L.rng(4242);

  /* ---------- infiltração ---------- */
  const IX = [-34, -31, -27.5, -24, -21, -18.6, -17.2, -15.9, -14.6, -13.4, -12.1, -10.9, -9.6, -8.3, -6.6, -4.4, -2.0];
  const inf = IX.map((x0, k) => {
    const yt = Lo.G(x0, ZF) - 0.08, yb = wt(x0) + 0.12, n = 7, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push([x0 + 0.22 * Math.sin(u * 7 + k * 1.7) + 0.1 * Math.sin(u * 17 + k), lerp(yt, yb, u), ZA]); }
    const ch = new L.Chevrons(pts, { n: 5, size: 0.25, color: blue, normal: [0, 0, 1] });
    const drops = new L.Flow(pts, { n: 9, size: 0.055, color: '#a9e4ff', material: L.mat('#ffffff', { emissive: '#3aa6ff', emissiveIntensity: 0.6, roughness: 0.2 }), seed: 30 + k, jitter: [0.06, 0, 0] });
    grp.add(ch.mesh, drops.mesh);
    return { ch, drops, sp: 0.16 + rd() * 0.06 };
  });
  // lençol freático: corrente lenta para o rio
  const wpts = []; for (let x = -32; x <= 24; x += 2) wpts.push([x, wt(x) - 0.45, ZA]);
  const gw = new L.Chevrons(wpts, { n: 22, size: 0.14, color: '#7fd6ff', normal: [0, 0, 1] }); grp.add(gw.mesh);

  /* ---------- bloqueio ---------- */
  const BX = [-24, -21, -18, -15, -12, -9];
  const pave = 0.28; // topo da calçada/asfalto (aprox.) acima do chão
  const xMat = L.flat(PAL.warn, { transparent: true, toneMapped: false, depthWrite: false });
  const xGeo = (() => { const a = new THREE.BoxGeometry(0.5, 0.11, 0.04), b = a.clone(); a.rotateZ(Math.PI / 4); b.rotateZ(-Math.PI / 4); return L.BGU.mergeGeometries([a, b]); })();
  const blk = [];
  const addBlock = (x, ys, dir, z, len = 1.2) => {
    const pts = [[x, ys + 2.4, z], [x, ys + 0.9, z], [x, ys + 0.25, z], [x + dir * 0.35, ys + 0.12, z], [x + dir * len, ys + 0.1 - 0.05 * len, z]];
    const ch = new L.Chevrons(L.curve(pts, false, 0.2), { n: 7, size: 0.22, color: blue, normal: [0, 0, 1] });
    const xm = new THREE.Mesh(xGeo, xMat); xm.position.set(x, ys + 0.02, z + 0.03); xm.renderOrder = 31;
    grp.add(ch.mesh, xm); blk.push({ ch, xm, ph: rd() });
  };
  BX.forEach((x, i) => addBlock(x, Lo.G(x, ZF) + pave, 1, ZA));
  let roofsDone = false;
  function roofArrows() { // telhados (registrados pelo módulo cidade): a chuva bate e escorre para o beiral
    roofsDone = true;
    const roofs = (shared.roofs || []).filter((r) => r.x1 > -27 && r.x0 < -5).slice(0, 4);
    roofs.forEach((r) => { const xc = (r.x0 + r.x1) / 2, zc = Math.max(r.z0, r.z1) - 0.3; addBlock(xc - 0.6, r.y + 0.05, 1, zc, (r.x1 - r.x0) / 2); });
  }

  function update(t, S) {
    const a = S.infil;
    inf.forEach((p, i) => { p.ch.update(t, { speed: p.sp, amount: a, size: 0.25 }); p.drops.update(t + i * 0.37, { speed: p.sp * 0.8, amount: a > 0.01 ? 1 : 0, size: 0.055 * clamp01(a * 1.5) }); });
    gw.update(t, { speed: 0.05, amount: a * 0.75 });
    if (!roofsDone && shared.roofs) roofArrows();
    const b = S.blocked;
    blk.forEach((p) => {
      p.ch.update(t, { speed: 0.3, amount: b });
      const f = fract(t * 0.6 + p.ph), pop = b * (0.75 + 0.25 * Math.sin(f * Math.PI));
      p.xm.visible = b > 0.01; xMat.opacity = b; p.xm.scale.setScalar(Math.max(1e-3, pop));
    });
  }
  return { update, grp };
}
