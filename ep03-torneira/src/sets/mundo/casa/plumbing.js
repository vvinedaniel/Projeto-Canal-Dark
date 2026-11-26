// Canos da casa (todos em corte, com água azul e setas no sentido CERTO: da rua para a torneira).
//  - RAMAL (PEAD azul): sai da luva de espera da rede (ctx.shared.houseTap, módulo cidade) com uma junta de compressão,
//    corre enterrado sob a rua e a calçada (corte voltado para cima: aparece com o raio-x) e sobe na mureta até o cavalete.
//  - TRONCO (PVC marrom, água fria): do cavalete desce, atravessa o jardim enterrado e sobe na face de corte da casa.
//  - DIRETO: tê no radier → cozinha (sobe no armário da ilha até o registro, flexível e torneira).
//  - SUBIDA: tê → parede direita (no corte) → laje do sótão → torneira de boia da caixa-d'água.
//  - DESCIDA: saída da caixa (registro) → sótão → desce no corte da parede do banheiro → chuveiro (por gravidade).
// Cada trecho é um L.cutPipe num plano (kit.planePipe). Cotovelos entre planos diferentes ganham uma conexão (joelho).
import { FZ } from './house.js';

export function buildPlumbing(ctx, K, H, MT) {
  const { L, THREE, Lo, shared } = ctx, { G, TM, Merge, vmat, planePipe } = K;
  const Hh = Lo.HOUSE, root = new THREE.Group();
  const WC = Lo.WATER.treated;
  const pvc = L.mat(Lo.PIPE.pvcHouse, { roughness: 0.5, side: THREE.DoubleSide }), pvcCut = L.mat('#d39a62', { roughness: 0.7, side: THREE.DoubleSide });
  const pead = L.mat('#2f7fd6', { roughness: 0.45, side: THREE.DoubleSide }), peadCut = L.mat('#6aa6ea', { roughness: 0.6, side: THREE.DoubleSide });
  const ZS = Hh.z1 + 0.004;                    // plano dos canos embutidos que aparecem na face de corte da casa
  const R = 0.032, RR = 0.045;
  const pieces = [];
  const add = (sys, pts, o) => { const p = planePipe(pts, { r: R, mat: pvc, cutMat: pvcCut, water: WC, bend: 0.08, ...o }); p.sys = sys; root.add(p.group); pieces.push(p); return p; };
  const fit = new Merge();
  const elbow = (p, r = R, c = Lo.PIPE.pvcHouse) => fit.add(G.sph(r * 1.38, 14, 10), c, TM(...p));

  /* ---------------- ramal ---------------- */
  const tap = (shared.houseTap && shared.houseTap.p) ? shared.houseTap.p : [3, -1.2, Lo.ZF - 1.47];
  const TY = tap[1], RX = MT.XIN, ZC = MT.ZC;
  const j0 = [tap[0], TY, tap[2] - 0.16];       // fim da junta (redução) — começo do tubo do ramal
  const ram1 = add('ramal', [j0, [tap[0], TY, 22.3], [RX, TY, 22.3], [RX, TY, ZC]], { plane: 'y', r: RR, mat: pead, cutMat: peadCut, bend: 0.25 });
  const ram2 = add('ramal', [[RX, TY, ZC], [RX, MT.NF - 0.02, ZC]], { plane: 'z', r: RR, mat: pead, cutMat: peadCut });
  // junta de compressão (preta) na luva de espera + redução; joelho no pé da mureta; adaptador PEAD→cavalete
  { const jm = new Merge(), j = tap;
    jm.add(G.cyl(0.115, 0.115, 0.05, 24), '#1f2328', TM(j[0], j[1], j[2] - 0.02, Math.PI / 2));
    jm.add(G.cyl(RR * 1.25, 0.1, 0.1, 24), '#2a2f35', TM(j[0], j[1], j[2] - 0.09, Math.PI / 2));
    jm.add(G.cyl(RR * 1.3, RR * 1.3, 0.05, 6), '#2a2f35', TM(j[0], j[1], j[2] - 0.15, Math.PI / 2));
    jm.add(G.sph(RR * 1.4, 14, 10), '#2a2f35', TM(RX, TY, ZC));
    jm.add(G.cyl(RR * 1.3, RR * 1.3, 0.06, 6), '#2a2f35', TM(RX, MT.NF - 0.05, ZC));
    const jmesh = jm.mesh(vmat({ roughness: 0.5 })); root.add(jmesh); }

  /* ---------------- tronco e ramos internos ---------------- */
  const XO = MT.XOUT, YT = 0.12, YB = -0.32, XR = Hh.x1 - 0.075, YA = H.ATT + 0.1, TZ = Hh.tank.z;
  const tr1 = add('trunk', [[XO, MT.NF - 0.02, ZC], [XO, YB, ZC]], { plane: 'z' });
  const tr2 = add('trunk', [[XO, YB, ZC], [XO, YB, Hh.z1], [XO, -0.04, Hh.z1]], { plane: 'x' });
  const tr3 = add('trunk', [[XO, -0.04, ZS], [XO, YT, ZS]], { plane: 'z' });
  elbow([XO, YB, ZC]); elbow([XO, -0.04, Hh.z1 + 0.002]);
  // direto: tê → cozinha
  const KXF = -2.75;
  const d1 = add('direct', [[XO, YT, ZS], [KXF, YT, ZS]], { plane: 'z' });
  const d2 = add('direct', [[KXF, YT, ZS - 0.004], [KXF, YT, FZ]], { plane: 'x' });     // dentro do radier (escondido)
  const d3 = add('direct', [[KXF, YT, FZ], [KXF, 0.6, FZ]], { plane: 'z' });
  // subida: tê → parede direita → sótão → boia
  const tank = Hh.tank, TX1 = tank.x + 0.73;
  const u1 = add('up', [[XO, YT, ZS], [XR, YT, ZS], [XR, YA, ZS]], { plane: 'z' });
  const u2 = add('up', [[XR, YA, ZS], [XR, YA, TZ], [3.45, YA, TZ]], { plane: 'y', bend: 0.12 });
  const u3 = add('up', [[3.45, YA, TZ], [3.45, tank.inletY, TZ], [TX1 + 0.06, tank.inletY, TZ]], { plane: 'z' });
  elbow([XR, YA, ZS - 0.01]); elbow([3.45, YA, TZ]);
  // tê no radier (conexão)
  fit.add(G.box(0.1, 0.1, 0.012), Lo.PIPE.pvcHouse, TM(XO, YT, ZS - 0.004));
  // descida: saída da caixa → registro → sótão → banheiro (chuveiro)
  const XD = H.BX0 + 0.075, YD = tank.y0 + 0.11, SHY = H.TOP - 0.85;
  const DX0 = tank.x - 0.62;
  const w1 = add('down', [[DX0, YD, TZ], [XD, YD, TZ]], { plane: 'z' });
  const w2 = add('down', [[XD, YD, TZ], [XD, YD, ZS - 0.01]], { plane: 'y' });
  const w3 = add('down', [[XD, YD, ZS], [XD, SHY, ZS], [XD + 0.38, SHY, ZS]], { plane: 'z' });
  elbow([XD, YD, TZ]); elbow([XD, YD, ZS - 0.01]);
  // suportes (tacos) dos canos sobre a laje do sótão
  [[XR, 17.5], [XR, 15.5], [XR, 13.6], [XD, 14.5], [XD, 16.5], [XD, 18.3]].forEach(([x, z]) => fit.add(G.box(0.12, YA - H.ATT - R, 0.08), '#8d7355', TM(x, (H.ATT + YA - R) / 2, z)));
  [[4.2, TZ], [XD + 0.1, TZ]].forEach(([x, z]) => fit.add(G.box(0.08, YA - H.ATT - R, 0.12), '#8d7355', TM(x, (H.ATT + YA - R) / 2, z)));
  // registro da saída da caixa (gaveta, volante voltado para a câmera)
  const gate = new Merge(); { const gx = DX0 - 0.16, y = YD; gate.add(G.cyl(0.045, 0.045, 0.09, 6), '#c99a3c', TM(gx, y, TZ, 0, 0, Math.PI / 2)).add(G.cyl(0.018, 0.022, 0.08, 10), '#c99a3c', TM(gx, y + 0.07, TZ));
    gate.add(G.torus(0.04, 0.007, 6, 20), '#d8312a', TM(gx, y + 0.115, TZ, Math.PI / 2)).add(G.box(0.08, 0.008, 0.008), '#d8312a', TM(gx, y + 0.115, TZ)).add(G.box(0.008, 0.008, 0.08), '#d8312a', TM(gx, y + 0.115, TZ)); }
  root.add(gate.mesh(vmat({ roughness: 0.35, metalness: 0.7 })));
  // chuveiro (braço + ducha) e registro de pressão do banheiro no corte
  const shower = new Merge(); { const x = XD + 0.38; shower.add(G.cyl(0.02, 0.02, 0.06, 12), '#d2d8dd', TM(x, SHY, ZS - 0.03, Math.PI / 2)).add(G.lathe([[0.012, 0.0], [0.03, -0.06], [0.1, -0.12], [0.1, -0.14], [0, -0.14]], 24), '#d2d8dd', TM(x + 0.04, SHY - 0.02, ZS - 0.12));
    shower.rod([x, SHY, ZS - 0.03], [x + 0.04, SHY - 0.03, ZS - 0.12], 0.012, '#d2d8dd'); }
  root.add(shower.mesh(vmat({ roughness: 0.2, metalness: 0.9 })));
  const showerHead = new THREE.Vector3(XD + 0.42, SHY - 0.17, ZS - 0.12);
  // ponto de água da cozinha: registro de pressão cromado + flexível trançado até o corpo da torneira
  const kit = new Merge(); { const y = 0.6; kit.add(G.cyl(0.03, 0.03, 0.06, 12), '#d2d8dd', TM(KXF, y + 0.02, FZ)).add(G.cyl(0.012, 0.012, 0.06, 10), '#d2d8dd', TM(KXF + 0.04, y + 0.03, FZ, 0, 0, Math.PI / 2)).add(G.cyl(0.026, 0.026, 0.014, 16), '#d2d8dd', TM(KXF + 0.075, y + 0.03, FZ, 0, 0, Math.PI / 2));
    const top = Hh.kitchen.counterY - 0.07; for (let i = 0; i < 14; i++) { const yy = y + 0.06 + (top - y - 0.06) * i / 14; kit.add(G.torus(0.013, 0.004, 5, 14), '#b9c1c8', TM(KXF, yy, FZ, Math.PI / 2)); }
    kit.add(G.cyl(0.015, 0.015, top - y - 0.06, 12), '#aab3ba', TM(KXF, (y + 0.06 + top) / 2, FZ)).add(G.cyl(0.02, 0.02, 0.025, 6), '#d2d8dd', TM(KXF, top, FZ)); }
  root.add(kit.mesh(vmat({ roughness: 0.25, metalness: 0.85 })));
  const fitMesh = fit.mesh(vmat({ roughness: 0.5 })); root.add(fitMesh);
  L.shadows(root);

  /* ---------------- setas (chevrons) por sistema ---------------- */
  const chev = [];
  pieces.forEach((p) => {
    if (p === d2) return;
    const n = Math.max(2, Math.round(p.len / 0.45));
    const nrm = p.plane === 'z' ? [0, 0, 1] : p.plane === 'y' ? [0, 1, 0] : [1, 0, 0];
    const off = nrm.map((v) => v * 0.006);
    const c = new L.Chevrons(p.curve, { n, size: p.cp.r * 0.75, normal: nrm, offset: off });
    root.add(c.mesh); chev.push({ c, p });
  });
  // gotas do chuveiro (quando a caixa abastece a casa)
  const drops = new L.Flow(L.curve([[showerHead.x, showerHead.y, showerHead.z], [showerHead.x + 0.02, H.TOP - 2.2, showerHead.z + 0.02], [showerHead.x + 0.03, Hh.floor + 0.02, showerHead.z + 0.03]]), { n: 70, size: 0.008, colors: ['#bfe9fb', '#e9f8ff'], jitter: [0.07, 0.0, 0.07], material: L.flat(0xffffff), seed: 4 });
  root.add(drops.mesh);

  /* ---------------- enchimento por sistema (frações ao longo do caminho) ---------------- */
  // cada sistema é uma lista ordenada de trechos; a água avança de u = 0 a 1 ao longo do comprimento total
  const SYS = { ramal: [ram1, ram2], trunk: [tr1, tr2, tr3], direct: [d1, d2, d3], up: [u1, u2, u3], down: [w1, w2, w3] };
  for (const k in SYS) { let tot = 0; SYS[k].forEach((p) => { p.a = tot; tot += p.len; }); SYS[k].forEach((p) => { p.a /= tot; p.b = p.a + p.len / tot; }); }
  const fillSys = (k, f) => SYS[k].forEach((p) => p.water.range(0, L.clamp01((f - p.a) / (p.b - p.a))));

  function update(t, S) {
    const P = S.present, Wt = S.water;
    const ff = P ? 1 : null;
    // frações de enchimento: ramal ocupa 0–0.82 de S.water.ramal (o resto é o cavalete, ver meter.js)
    const fr = P ? 1 : L.clamp01(Wt.ramal / 0.82);
    const fTrunk = P ? 1 : L.clamp01(Wt.direct / 0.3), fDirect = P ? 1 : L.clamp01((Wt.direct - 0.3) / 0.7);
    const fUp = P ? 1 : Wt.up, fDown = P ? 1 : L.clamp01(Wt.tank / 0.25);
    fillSys('ramal', fr); fillSys('trunk', fTrunk); fillSys('direct', fDirect); fillSys('up', fUp); fillSys('down', fDown);
    // movimento: há fluxo quando a frente avança ou quando há consumo
    const moving = (f) => (f > 0.001 && f < 0.999 ? 1 : 0);
    const late = t > 100.6;
    const tankIn = P ? 0 : (late ? L.clamp01((1 - S.floatFinal) / 0.3) : (Wt.up >= 0.999 ? 1 - Wt.float : 0));
    const shower = P ? 0 : (late ? L.clamp01((1 - S.floatFinal) / 0.3) : 0);
    const faucet = (P || Wt.direct >= 0.999) ? S.run.faucet : 0;
    const main = Math.max(P ? 1 : S.run.meter, moving(fr), moving(fTrunk), moving(fDirect), moving(fUp), tankIn, faucet);
    const amt = { ramal: Math.max(main, moving(fr)), trunk: Math.max(faucet, tankIn, moving(fTrunk), moving(fDirect), moving(fUp)), direct: Math.max(faucet, moving(fDirect)), up: Math.max(tankIn, moving(fUp)), down: Math.max(shower, moving(fDown)) };
    if (!P && fr < 0.001) amt.ramal = 0;
    chev.forEach(({ c, p }) => {
      const f = { ramal: fr, trunk: fTrunk, direct: fDirect, up: fUp, down: fDown }[p.sys];
      const head = L.clamp01((f - p.a) / (p.b - p.a));
      c.update(t, { speed: 0.9 / Math.max(0.6, p.len), head, amount: amt[p.sys] * (head > 0.02 ? 1 : 0) });
    });
    drops.update(t, { speed: 1.6, amount: shower });
    return { faucetWater: P ? 1 : (Wt.direct >= 0.999 ? 1 : 0) };
  }
  return { root, update, pieces, SYS };
}
