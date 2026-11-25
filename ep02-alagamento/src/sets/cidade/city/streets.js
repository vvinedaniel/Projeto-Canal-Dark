// Ruas A, B, C e avenida D: leito de terra → brita → asfalto (vibroacabadora + rolo), guias, sarjetas, calçadas com
// juntas, faixas, faixas de pedestre, ponte do bueiro sob a avenida D, postes, placas e lixeiras.
// Tudo é revelado por drawRange a partir de S.build.walks / S.build.asphalt (função pura de S).
import { makeMachines } from './machines.js';

export function buildStreets(ctx, K) {
  const { L, THREE, Lo, shared } = ctx, { M, sweep, Revealer, tex, TM, G, Merge, vmat } = K;
  const root = new THREE.Group();
  const A = Lo.STREET_A, B = Lo.STREET_B, C = Lo.STREET_C, D = Lo.AVENUE_D, CH = A.curbH, ZF = Lo.ZF;
  /** superfície da rua (a rua A é plana em z e segue streetY) */
  const H = (x, z) => (z >= 12.3 && z <= ZF + 0.1 && x <= D.x0 + 0.01 ? Lo.streetY(x) : Lo.G(x, z));
  const YA = 0.03, YF = 0.034, YM = 0.037, YS = 0.042, YB = 0.022, YD = 0.014; // asfalto, asfalto fresco, pintura, sarjeta, brita, terra

  /* ---------- materiais (raio-x: asfalto, calçadas, guias, sarjetas) ---------- */
  const tA = tex.asphalt.clone(); tA.needsUpdate = true;
  const asphaltM = L.mat('#7d828a', { map: tA, roughness: 0.92 });
  const freshM = L.mat('#2a2d31', { map: tA, roughness: 0.38, metalness: 0.05, emissive: '#2a1808', emissiveIntensity: 0.25 });
  const walkM = L.mat('#ffffff', { map: tex.walk, roughness: 0.88 });
  const curbM = L.mat('#c3c7ca', { roughness: 0.82 });
  const gutterM = L.mat('#a9aeb2', { roughness: 0.85 });
  const gravelM = L.mat('#ffffff', { map: tex.gravel, roughness: 1 });
  const dirtM = L.mat('#ffffff', { map: tex.dirt, roughness: 1 });
  const paintY = L.mat('#f2c230', { roughness: 0.6 }), paintW = L.mat('#eef0f0', { roughness: 0.6 });
  const xrayMats = [asphaltM, freshM, walkM, curbM, gutterM, paintY, paintW];
  [asphaltM, freshM, walkM, curbM, gutterM, gravelM, dirtM, paintY, paintW].forEach((m) => { m.side = THREE.DoubleSide; });

  /* ---------- perfis ---------- */
  const curbP = [[0, -0.14], [0, CH - 0.02], [0.03, CH], [0.15, CH], [0.15, -0.14]];
  const curbLowP = [[0, -0.14], [0, 0.05], [0.15, 0.05], [0.15, -0.14]];           // guia rebaixada (garagem)
  const gutterP = [[0, -0.04], [0, YS], [0.4, YS - 0.008], [0.4, -0.04]];
  const rampTop = (u, re) => (re ? Math.min(CH, 0.05 + Math.max(0, (u - 0.15) / (re - 0.15)) * (CH - 0.05)) : CH);
  const walkP = (u0, u1, re = 0) => { const top = [[u0, rampTop(u0, re)]]; if (re && re > u0 + 1e-3 && re < u1 - 1e-3) top.push([re, CH]); top.push([u1, rampTop(u1, re)]); return [...top, [u1, -0.14], [u0, -0.14]]; };
  const flatP = (W, v, step = 2) => { const p = []; const n = Math.max(1, Math.ceil(W / step)); for (let i = 0; i <= n; i++) p.push([(W * i) / n, v]); return p; };

  /* ---------- descrição das ruas ---------- */
  // cada rua: eixo, início (s0) e sentido (sd) da pavimentação, largura lateral (lat0..lat0+W)
  const ST = {
    A: { axis: 'x', s0: A.x0, s1: A.x1, sd: 1, lat: A.z0, W: A.z1 - A.z0 },
    B: { axis: 'x', s0: B.x0, s1: B.x1, sd: 1, lat: B.z0, W: B.z1 - B.z0 },
    C: { axis: 'z', s0: B.z1, s1: A.z0, sd: 1, lat: C.x0, W: C.x1 - C.x0 },
    D: { axis: 'z', s0: ZF + 0.005, s1: D.z0, sd: -1, lat: D.x0, W: D.x1 - D.x0 }
  };
  for (const k in ST) { const s = ST[k]; s.len = Math.abs(s.s1 - s.s0); s.dist = (v) => (v - s.s0) * s.sd; }
  /** peças de 0,5 m ao longo da rua (ordenadas pela distância a partir do início da pavimentação) */
  function pieces(st, a, b, o, step = 0.5) {
    const out = [], lo = Math.min(a, b), hi = Math.max(a, b), n = Math.max(1, Math.ceil((hi - lo) / step));
    for (let i = 0; i < n; i++) {
      const sa = lo + ((hi - lo) * i) / n, sb = lo + ((hi - lo) * (i + 1)) / n;
      out.push({ s: Math.min(st.dist(sa), st.dist(sb)), geo: sweep({ axis: st.axis, s0: sa, s1: sb, ds: step, H, ...o }) });
    }
    return out;
  }

  /* ---------- asfalto, fresco, brita, terra ---------- */
  const paved = {};
  // bocas de lobo: a drenagem publica shared.inletBoxK(x, S) (abertura da caixa); sem ela, limiares próprios
  const inletOpen = (x, extra, i = 0, n = 1) => (S) => (shared.inletBoxK ? shared.inletBoxK(x, S) > 0.001 : extra ? S.build.enlarge > 0.01 : S.build.inlets > i / n + 0.002);
  const HOLES = [...Lo.INLETS.map((x, i) => ({ x, open: inletOpen(x, false, i, Lo.INLETS.length) })), ...Lo.INLETS_EXTRA.map((x) => ({ x, open: inletOpen(x, true) }))];
  const HZ = [22.74, 23.47], HW = 0.52;
  for (const k in ST) {
    const st = ST[k], o = { lat: st.lat, dir: 1, closed: false, uv: 4 };
    const mk = (v, m) => { const r = new Revealer(pieces(st, st.s0, st.s1, { ...o, prof: flatP(st.W, v) }), m, { cast: false }); root.add(r.mesh); return r; };
    paved[k] = { dirt: mk(YD, dirtM), gravel: mk(YB, gravelM), asphalt: mk(YA, asphaltM), fresh: mk(YF, freshM), holes: [] };
    if (k === 'A') { // furos no asfalto sobre as grelhas das bocas de lobo (abrem quando a drenagem começa cada boca)
      root.remove(paved.A.asphalt.mesh);
      const pcs = [], xs = [A.x0, A.x1]; HOLES.forEach((h) => xs.push(h.x - HW, h.x + HW)); xs.sort((a, b) => a - b);
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i], b = xs[i + 1], m = (a + b) / 2, h = HOLES.find((q) => Math.abs(q.x - m) < HW);
        if (b - a < 1e-3) continue;
        if (!h) { pcs.push(...pieces(st, a, b, { ...o, prof: flatP(st.W, YA) })); continue; }
        pcs.push(...pieces(st, a, b, { ...o, prof: flatP(HZ[0] - A.z0, YA) }), ...pieces(st, a, b, { ...o, lat: HZ[1], prof: flatP(A.z1 - HZ[1], YA) }));
        const r = new Revealer(pieces(st, a, b, { ...o, lat: HZ[0], prof: flatP(HZ[1] - HZ[0], YA, 1) }), asphaltM, { cast: false }); root.add(r.mesh); paved.A.holes.push({ r, h });
      }
      paved.A.asphalt = new Revealer(pcs, asphaltM, { cast: false }); root.add(paved.A.asphalt.mesh);
    }
  }
  // tabuleiro da ponte (avenida D sobre o canal): laje, vigas, guarda-corpos — junto com o asfalto da avenida
  const BR = { z0: 24.3, z1: ZF + 0.005 };
  const bridge = new THREE.Group(); root.add(bridge);
  {
    const m = new Merge(), x0 = D.x0, x1 = D.x1, zc = (BR.z0 + BR.z1) / 2, dz = BR.z1 - BR.z0, y = (x) => H(x, zc);
    const deck = sweep({ axis: 'z', s0: BR.z0, s1: BR.z1, lat: x0, dir: 1, ds: 0.4, H, prof: [[0, YA - 0.002], [x1 - x0, YA - 0.002], [x1 - x0, -0.45], [0, -0.45]], caps: true });
    m.add(deck, '#bfc4c7');
    [x0 + 0.5, (x0 + x1) / 2, x1 - 0.5].forEach((x) => m.add(G.box(0.35, 0.5, dz), '#aeb3b6', TM(x, y(x) - 0.65, zc)));
    // guarda-rodas de concreto + guarda-corpo metálico dos dois lados
    [[x0 + 0.15, 1], [x1 - 0.15, -1]].forEach(([x]) => {
      m.add(G.box(0.3, 0.45, dz), '#cdd1d4', TM(x, y(x) + 0.22, zc));
      m.rail([x, y(x) + 0.45, BR.z0 + 0.05], [x, y(x) + 0.45, BR.z1 - 0.05], 0.65, '#d9dee2', 0.035, 0.6);
    });
    bridge.add(m.mesh(vmat({ roughness: 0.75, side: THREE.DoubleSide })));
    // guarda-corpo ao longo do canal na calçada da frente da rua A (x 16–18.5)
    const r = new Merge(), zr = 24.4;
    r.rail([16.0, Lo.streetY(16) + CH, zr], [D.x0 - 0.1, Lo.streetY(18.4) + CH, zr], 1.0, '#d9dee2', 0.03, 0.7);
    r.add(G.box(D.x0 - 16 - 0.1, 0.12, 0.12), '#cdd1d4', TM((16 + D.x0) / 2, Lo.streetY(17.2) + CH + 0.06, zr));
    bridge.add(r.mesh(vmat({ roughness: 0.5, metalness: 0.4 })));
  }
  L.shadows(bridge);
  // apoio da laje sobre o teto do bueiro (topo em CANAL.invert(x) + 1,95): aterro/encontro de concreto, com o canal pronto
  const fill = (() => { const m = new Merge(), n = 8, zc = (BR.z0 + BR.z1) / 2, dz = BR.z1 - BR.z0;
    for (let i = 0; i < n; i++) { const x0 = D.x0 - 0.25 + ((D.x1 - D.x0 + 0.5) * i) / n, x1 = x0 + (D.x1 - D.x0 + 0.5) / n, xm = (x0 + x1) / 2, yb = Lo.CANAL.invert(xm) + 1.95, yt = H(xm, zc) - 0.44;
      if (yt > yb) m.add(G.box(x1 - x0 + 0.002, yt - yb, dz), i % 2 ? '#b4b9bd' : '#babfc3', TM(xm, (yb + yt) / 2, zc)); }
    const f = m.mesh(vmat({ roughness: 0.9 })); root.add(f); L.shadows(f); return f; })();

  /* ---------- guias, sarjetas, calçadas ----------
     Grupos com regra de visibilidade própria (bocas de lobo, jardins, calçada permeável). */
  const groups = []; // { rev, kind, st, rule(S) -> bool }
  const add = (st, a, b, o, m, rule = null, kind = 'walk') => { const r = new Revealer(pieces(st, a, b, o), m); root.add(r.mesh); groups.push({ rev: r, st, rule, kind }); return r; };
  // jardins / calçada permeável: o módulo verde decide quando a calçada sai (shared.greenWalkHidden); senão, limiar próprio
  const greenHidden = (id, S, fb) => (shared.greenWalkHidden ? shared.greenWalkHidden(id, S) : fb);
  const gardenRule = (gi) => (S) => !greenHidden(Lo.GARDENS[gi].id, S, S.build.gardens > gi / 4 + 0.002);
  const permRule = (S) => !greenHidden('perm0', S, S.build.permeable > 0.002);
  /** divide [a,b] em trechos; zones = [{x0,x1, rule?(fn), ramp?, low?}] — cada trecho herda a 1ª regra e as marcas */
  function split(a, b, zones) {
    const cuts = [a, b]; zones.forEach((z) => { if (z.x1 > a && z.x0 < b) cuts.push(Math.max(a, z.x0), Math.min(b, z.x1)); });
    const u = [...new Set(cuts.map((v) => +v.toFixed(4)))].sort((p, q) => p - q), out = [];
    for (let i = 0; i < u.length - 1; i++) {
      const m = (u[i] + u[i + 1]) / 2, zs = zones.filter((q) => m > q.x0 && m < q.x1), f = zs.find((q) => q.rule);
      if (u[i + 1] - u[i] > 1e-3) out.push({ a: u[i], b: u[i + 1], rule: f ? f.rule : null, ramp: zs.some((q) => q.ramp), low: zs.some((q) => q.low) });
    }
    return out;
  }
  const IW = Lo.INLET.w / 2 + 0.15, CW = 0.6; // caixa (calçada) e vão da guia/sarjeta
  const inletZones = HOLES.map((h) => ({ x0: h.x - IW, x1: h.x + IW, rule: (S) => !h.open(S) }));
  const curbZones = HOLES.map((h) => ({ x0: h.x - CW, x1: h.x + CW, rule: (S) => !h.open(S) }));
  const gz = (g, gi) => ({ x0: g.x0, x1: g.x1, rule: gardenRule(gi) });
  const GD = Lo.GARDENS, PERM = Lo.PERMEABLE[1];
  // rampas de acessibilidade nas faixas de pedestre (guia rebaixada + calçada inclinada + piso tátil)
  const RW = 1.6, rz = (x) => ({ x0: x - RW / 2, x1: x + RW / 2, ramp: true });
  const XW = { A: [C.x0 - 2.2, D.x0 - 2.2], B: [C.x0 - 2.2], C: [A.z0 - 3.1, B.z1 + 1.2] };
  const tactile = []; // [x, z, eixo, lat, dir, u]
  const cp = (p) => (p.ramp || p.low ? curbLowP : curbP);
  const rule = (p) => (typeof p.rule === 'function' ? p.rule : null);

  // --- rua A (reconstruída no 1º quadro se o módulo verde publicar shared.curbCuts: aberturas na guia dos jardins)
  let aGroups = [], aBuilt = null;
  function buildA(cuts) {
    const g0 = groups.length;
    const cutZ = (front) => cuts.filter((c) => (front ? c.z > 20 : c.z < 20)).map((c) => ({ x0: c.x0, x1: c.x1, rule: (S) => !greenHidden(c.garden, S, false) }));
    const cF = cutZ(true), cB = cutZ(false);
    const st = ST.A, rA = XW.A.map(rz);
    // guia e sarjeta de trás (fundo, z = 14.5), interrompidas na rua C
    [[A.x0, C.x0 - 0.15], [C.x1 + 0.15, A.x1 - 0.15]].forEach(([a, b]) => {
      split(a, b, [...cB, ...rA]).forEach((p) => add(st, p.a, p.b, { lat: A.z0, dir: -1, prof: cp(p) }, curbM, rule(p), 'curb'));
      split(a, b, cB).forEach((p) => add(st, p.a, p.b, { lat: A.z0, dir: 1, prof: gutterP }, gutterM, rule(p), 'curb'));
    });
    // calçada de trás: faixa junto à guia, faixa dos jardins (g3, g4) e faixa junto aos lotes
    [[A.x0, C.x0], [C.x1, A.x1]].forEach(([a, b]) => {
      split(a, b, [...cB, ...rA]).forEach((p) => add(st, p.a, p.b, { lat: A.z0, dir: -1, prof: walkP(0.15, 0.6, p.ramp ? 1.2 : 0), uv: 1.5 }, walkM, rule(p)));
      split(a, b, [...rA, gz(GD[2], 2), gz(GD[3], 3)]).forEach((p) => add(st, p.a, p.b, { lat: A.z0, dir: -1, prof: walkP(0.6, 1.8, p.ramp ? 1.2 : 0), uv: 1.5 }, walkM, rule(p)));
      add(st, a, b, { lat: A.z0, dir: -1, prof: walkP(1.8, 2.0), uv: 1.5 }, walkM);
    });
    XW.A.forEach((x) => tactile.push([x, A.z0 - 1.35, 'x']));
    // frente (z = 23.5): guia, sarjeta e calçada interrompidas nas bocas de lobo; a calçada termina no corte (z = ZF)
    split(A.x0, A.x1 - 0.15, [...curbZones, ...cF, ...rA]).forEach((p) => {
      add(st, p.a, p.b, { lat: A.z1, dir: 1, prof: cp(p) }, curbM, rule(p), 'curb');
      add(st, p.a, p.b, { lat: A.z1, dir: -1, prof: gutterP }, gutterM, rule(p), 'curb');
    });
    split(A.x0, A.x1, [...inletZones, ...cF, ...rA]).forEach((p) => add(st, p.a, p.b, { lat: A.z1, dir: 1, prof: walkP(0.15, 0.4, p.ramp ? 1.2 : 0), uv: 1.5, caps: p.b > A.x1 - 0.01 }, walkM, rule(p)));
    const front = [...inletZones, gz(GD[0], 0), gz(GD[1], 1), { x0: PERM.x0, x1: PERM.x1, rule: permRule }, ...rA];
    // trechos com mais de uma regra (boca de lobo dentro de jardim): a boca de lobo manda
    split(A.x0, 16.0, front).forEach((p) => add(st, p.a, p.b, { lat: A.z1, dir: 1, prof: walkP(0.4, ZF + 0.005 - A.z1, p.ramp ? 1.2 : 0), uv: 1.5 }, walkM, rule(p)));
    split(16.0, A.x1, rA).forEach((p) => add(st, p.a, p.b, { lat: A.z1, dir: 1, prof: walkP(0.4, 0.95, p.ramp ? 0.95 : 0), uv: 1.5, caps: p.b > A.x1 - 0.01 }, walkM));
    tactile.push([XW.A[0], A.z1 + 1.35, 'x']);
    aGroups = groups.slice(g0);
  }
  buildA(shared.curbCuts || []); aBuilt = shared.curbCuts || null;
  function rebuildA() {
    aGroups.forEach((g) => { root.remove(g.rev.mesh); g.rev.mesh.geometry.dispose(); const i = groups.indexOf(g); if (i >= 0) groups.splice(i, 1); });
    buildA(shared.curbCuts); aBuilt = shared.curbCuts;
  }
  // --- rua B (com rebaixo de guia na entrada do estacionamento e da ETE)
  { const st = ST.B, drive = [[2.0, 5.0], [12.2, 14.6]].map(([a, b]) => ({ x0: a, x1: b, low: true })), rB = XW.B.map(rz), WB = B.z0 - B.walkBack[0];
    [[B.x0, C.x0 - 0.15], [C.x1 + 0.15, B.x1 - 0.15]].forEach(([a, b]) => {
      split(a, b, rB).forEach((p) => add(st, p.a, p.b, { lat: B.z1, dir: 1, prof: cp(p), caps: p.a === B.x0 }, curbM, null, 'curb'));
      add(st, a, b, { lat: B.z1, dir: -1, prof: gutterP }, gutterM, null, 'curb');
    });
    [[B.x0, C.x0], [C.x1, B.x1]].forEach(([a, b]) => split(a, b, rB).forEach((p) => add(st, p.a, p.b, { lat: B.z1, dir: 1, prof: walkP(0.15, B.walkFront[1] - B.z1, p.ramp ? 1.2 : 0), uv: 1.5, caps: p.a === B.x0 }, walkM)));
    split(B.x0, B.x1 - 0.15, [...drive, ...rB]).forEach((p) => add(st, p.a, p.b, { lat: B.z0, dir: -1, prof: cp(p), caps: p.a === B.x0 }, curbM, null, 'curb'));
    add(st, B.x0, B.x1 - 0.15, { lat: B.z0, dir: 1, prof: gutterP }, gutterM, null, 'curb');
    split(B.x0, B.x1, [...drive, ...rB]).forEach((p) => add(st, p.a, p.b, { lat: B.z0, dir: -1, prof: walkP(0.15, WB, p.low ? 0.9 : p.ramp ? 1.2 : 0), uv: 1.5, caps: p.a === B.x0 }, walkM));
    XW.B.forEach((x) => { tactile.push([x, B.z1 + 1.35, 'x'], [x, B.z0 - 1.35, 'x']); });
  }
  // --- rua C (transversal): guias e calçadas de 1 m dos dois lados
  { const st = ST.C, rC = XW.C.map(rz);
    [[C.x0, -1], [C.x1, 1]].forEach(([lat, dir]) => {
      split(B.z1, A.z0, rC).forEach((p) => add(st, p.a, p.b, { lat, dir, prof: cp(p) }, curbM, null, 'curb'));
      add(st, B.z1, A.z0, { lat, dir: -dir, prof: gutterP }, gutterM, null, 'curb');
      split(B.walkFront[1], A.walkBack[0], rC).forEach((p) => add(st, p.a, p.b, { lat, dir, prof: walkP(0.15, 1.0, p.ramp ? 1.0 : 0), uv: 1.5 }, walkM));
    });
  }
  // piso tátil de alerta no alto das rampas
  const tactM = L.mat('#f2c230', { roughness: 0.7 });
  const tact = (() => { const m = new Merge(); tactile.forEach(([x, z]) => m.add(G.box(RW - 0.2, 0.012, 0.28), '#f2c230', TM(x, H(x, z) + CH + 0.006, z))); [C.x0 - 0.55, C.x1 + 0.55].forEach((x) => XW.C.forEach((z) => m.add(G.box(0.28, 0.012, RW - 0.2), '#f2c230', TM(x, H(x, z) + CH + 0.006, z)))); return L.mesh(m.geo(), tactM, 0, 0, 0, { cast: false }); })();
  root.add(tact);
  // --- avenida D: guia do lado do parque; do lado da cidade só onde não chega rua
  { const st = ST.D;
    add(st, D.z0, BR.z0, { lat: D.x1, dir: 1, prof: curbP }, curbM, null, 'curb');
    add(st, D.z0, BR.z0, { lat: D.x1, dir: -1, prof: gutterP }, gutterM, null, 'curb');
    [[D.z0, B.z0], [B.z1, A.z0], [A.z1, BR.z0]].forEach(([a, b]) => {
      add(st, a, b, { lat: D.x0, dir: -1, prof: curbP }, curbM, null, 'curb');
      add(st, a, b, { lat: D.x0, dir: 1, prof: gutterP }, gutterM, null, 'curb');
    });
  }

  /* ---------- pintura: eixo, bordas, faixas de pedestre, linhas de retenção ---------- */
  const paint = { Y: {}, W: {} };
  {
    const P = { Y: {}, W: {} }; for (const k in ST) { P.Y[k] = []; P.W[k] = []; }
    const band = (k, col, a, b, l0, l1) => { const st = ST[k]; P[col][k].push({ s: Math.min(st.dist(a), st.dist(b)), geo: sweep({ axis: st.axis, s0: Math.min(a, b), s1: Math.max(a, b), ds: 0.5, H, lat: l0, dir: 1, closed: false, prof: [[0, YM], [l1 - l0, YM]] }) }); };
    const dashes = (k, col, a, b, l, w = 0.14, on = 2, off = 2) => { for (let s = a; s < b - 0.3; s += on + off) band(k, col, s, Math.min(b, s + on), l - w / 2, l + w / 2); };
    // A: eixo tracejado amarelo, bordas brancas, faixas de pedestre junto à rua C e à avenida
    dashes('A', 'Y', A.x0 + 1, A.x1 - 1, (A.z0 + A.z1) / 2);
    // faixas de pedestre como listras de 0,5 m espaçadas, cortando a rua (direção lateral)
    const zebraX = (k, sMid, l0, l1) => { const st = ST[k], n = Math.floor((l1 - l0 - 0.6) / 0.9); for (let i = 0; i < n; i++) { const l = l0 + 0.5 + i * 0.9; P.W[k].push({ s: st.dist(sMid), geo: sweep({ axis: st.axis, s0: sMid - 1.4, s1: sMid + 1.4, ds: 0.7, H, lat: l, dir: 1, closed: false, prof: [[0, YM], [0.45, YM]] }) }); } };
    zebraX('A', C.x0 - 2.2, A.z0 + 0.4, A.z1 - 0.4); zebraX('A', D.x0 - 2.2, A.z0 + 0.4, A.z1 - 0.4);
    zebraX('B', C.x0 - 2.2, B.z0 + 0.4, B.z1 - 0.4);
    zebraX('C', XW.C[0], C.x0 + 0.4, C.x1 - 0.4); zebraX('C', XW.C[1], C.x0 + 0.4, C.x1 - 0.4);
    band('A', 'W', A.x0 + 0.5, A.x1 - 0.5, A.z0 + 0.55, A.z0 + 0.67); { const xs = [A.x0 + 0.5, ...HOLES.flatMap((h) => [h.x - HW - 0.1, h.x + HW + 0.1]).sort((a, b) => a - b), A.x1 - 0.5]; for (let i = 0; i < xs.length - 1; i += 2) if (xs[i + 1] - xs[i] > 0.2) band('A', 'W', xs[i], xs[i + 1], A.z1 - 0.67, A.z1 - 0.55); }
    dashes('B', 'Y', B.x0 + 1, B.x1 - 1, (B.z0 + B.z1) / 2);
    band('B', 'W', B.x0 + 0.5, B.x1 - 0.5, B.z0 + 0.55, B.z0 + 0.67); band('B', 'W', B.x0 + 0.5, B.x1 - 0.5, B.z1 - 0.67, B.z1 - 0.55);
    dashes('C', 'Y', B.z1 + 4.2, A.z0 - 4.2, (C.x0 + C.x1) / 2, 0.12, 1.5, 1.5);
    band('C', 'W', XW.C[0] + 1.6, XW.C[0] + 2.0, C.x0 + 0.5, (C.x0 + C.x1) / 2 - 0.1); // linha de retenção (PARE)
    // D: eixo amarelo duplo contínuo + bordas
    const xm = (D.x0 + D.x1) / 2;
    [[D.z0 + 0.5, B.z0 - 0.3], [B.z1 + 0.3, A.z0 - 0.3], [A.z1 + 0.3, ZF - 0.3]].forEach(([a, b]) => { band('D', 'Y', a, b, xm - 0.2, xm - 0.08); band('D', 'Y', a, b, xm + 0.08, xm + 0.2); });
    band('D', 'W', D.z0 + 0.5, ZF - 0.3, D.x1 - 0.6, D.x1 - 0.48);
    for (const k in ST) { ['Y', 'W'].forEach((c) => { const r = new Revealer(P[c][k], c === 'Y' ? paintY : paintW, { cast: false }); root.add(r.mesh); paint[c][k] = r; }); }
  }

  /* ---------- mobiliário urbano: postes, placas, lixeiras ---------- */
  const furn = new THREE.Group(); root.add(furn);
  const posts = []; // { obj, d (distância na rua da calçada), st }
  {
    const lampM = vmat({ roughness: 0.5, metalness: 0.3 }), lensM = L.glow('#fff1c4', 1.1);
    const lamp = (x, z, ry, st) => { const g = new THREE.Group(); g.add(L.mesh(K.lampGeo, lampM), L.mesh(K.lampLensGeo, lensM, 1.98, 7.5 - 0.1, 0, { cast: false })); g.position.set(x, H(x, z) + CH, z); g.rotation.y = ry; L.shadows(g); furn.add(g); posts.push({ obj: g, st, d: ST[st].dist(ST[st].axis === 'x' ? x : z) }); };
    [-34, -24, -6.5, 4.5, 15.5].forEach((x) => lamp(x, A.z0 - 0.35, -Math.PI / 2, 'A'));
    [-35, -25, -15, -5, 5.6, 16.5].forEach((x) => lamp(x, A.z1 + 0.28, Math.PI / 2, 'A'));
    [-19, -4, 9].forEach((x) => lamp(x, B.z1 + 0.35, Math.PI / 2, 'B'));
    [-16, -1.5, 16].forEach((x) => lamp(x, B.z0 - 0.35, -Math.PI / 2, 'B'));
    [-18, -6, 6].forEach((z) => lamp(D.x1 + 0.3, z, Math.PI, 'D'));
    const sm = vmat({ roughness: 0.5, metalness: 0.2 });
    const sign = (kind, x, z, ry, st) => { const s = L.mesh(K.signGeo(kind), sm, x, H(x, z) + CH, z); s.rotation.y = ry; furn.add(s); posts.push({ obj: s, st, d: ST[st].dist(ST[st].axis === 'x' ? x : z) }); };
    sign('stop', C.x0 - 0.5, A.z0 - 0.3, Math.PI, 'A'); sign('name', C.x1 + 0.5, A.z0 - 0.3, 0, 'A');
    sign('stop', C.x1 + 0.5, B.z1 + 0.3, 0, 'B'); sign('park', 5.6, B.z0 - 0.3, 0, 'B'); sign('name', -21.6, B.z1 + 0.4, Math.PI / 2, 'B');
    const bm = vmat({ roughness: 0.55 });
    [[-28, A.z1 + 0.3, 'A'], [-2.2, A.z1 + 0.3, 'A'], [-29, A.z0 - 0.3, 'A'], [2, B.z1 + 0.3, 'B'], [-8.5, B.z0 - 0.3, 'B']].forEach(([x, z, st]) => { const b = L.mesh(K.binGeo, bm, x, H(x, z) + CH, z); if (z > A.z1 || (z > B.z1 && z < 2)) b.rotation.y = Math.PI; furn.add(b); posts.push({ obj: b, st, d: ST[st].dist(x) }); });
  }

  /* ---------- máquinas ---------- */
  const MC = makeMachines(ctx, K);
  const crews = {};
  for (const k in ST) {
    const st = ST[k], paver = MC.paver(st.W), nR = st.W > 6 ? 2 : 1, rollers = [];
    root.add(paver.group);
    for (let i = 0; i < nR; i++) { const r = MC.roller(); root.add(r.group); rollers.push(r); }
    crews[k] = { paver, rollers };
  }
  const _q = new THREE.Quaternion(), _e = new THREE.Euler();
  /** posiciona uma máquina na rua: d = distância ao longo da rua, l = deslocamento lateral, inclina com o chão */
  function placeOn(obj, st, d, l, scale = 1, back = false) {
    const s = st.s0 + st.sd * d, lat = st.lat + l;
    const x = st.axis === 'x' ? s : lat, z = st.axis === 'x' ? lat : s;
    const dirx = st.axis === 'x' ? st.sd : 0, dirz = st.axis === 'z' ? st.sd : 0;
    const h0 = H(x - dirx * 1.5, z - dirz * 1.5), h1 = H(x + dirx * 1.5, z + dirz * 1.5), pitch = Math.atan2(h1 - h0, 3);
    const yaw = Math.atan2(-dirz, dirx) + (back ? Math.PI : 0);
    obj.position.set(x, H(x, z) + YA, z); _e.set(0, yaw, back ? -pitch : pitch, 'YXZ'); obj.quaternion.setFromEuler(_e);
    obj.scale.setScalar(Math.max(1e-4, scale)); obj.visible = scale > 0.01;
    void _q;
  }

  const U = { A: [0, 0.96], B: [0.04, 1], C: [0.1, 0.75], D: [0, 0.92] };
  /** valor de S.build.asphalt em que o rolo passa pela posição s da rua k */
  const rollerAt = (k, s) => { const st = ST[k], d = st.dist(s); return U[k][0] + ((d + 5) / (st.len + 5)) * (U[k][1] - U[k][0]); };
  function update(t, S, cam) {
    if (shared.curbCuts && aBuilt !== shared.curbCuts) rebuildA();
    const kw = S.build.walks, ka = S.build.asphalt;
    for (const k in ST) {
      const st = ST[k], P = paved[k], len = st.len;
      // pavimentação: u por rua (todas ao mesmo tempo, com pequenas defasagens)
      const u = L.prog(ka, ...U[k]);
      const screed = u * len, roll = u * (len + 5) - 5, done = ka >= 0.999;
      const kd = L.prog(kw, 0, 0.45), kg = L.prog(kw, 0.25, 0.8);
      P.dirt.set(done || kd <= 0 ? -1 : len * kd + 0.01);
      P.gravel.set(done || kg <= 0 ? -1 : len * kg + 0.01);
      P.asphalt.set(roll > -5 ? Math.max(roll, -1) : -1);
      P.holes.forEach(({ r, h }) => { if (h.open(S)) r.set(-1); else r.set(u >= 1 ? 1e9 : roll); });
      if (u > 0 && u < 1) P.fresh.range(Math.max(0, roll), screed); else P.fresh.set(-1);
      paint.Y[k].set(roll - 1.5); paint.W[k].set(roll - 1.5);
      if (u >= 1) { paint.Y[k].set(1e9); paint.W[k].set(1e9); P.asphalt.set(1e9); }
      // máquinas
      const c = crews[k], inA = L.sstep(0, 0.04, u) * (1 - L.sstep(0.97, 1, u));
      placeOn(c.paver.group, st, Math.min(screed, len), st.W / 2, inA);
      c.paver.update(t, u);
      c.rollers.forEach((r, i) => {
        const n = c.rollers.length, l = n === 1 ? st.W / 2 : st.W * (i === 0 ? 0.3 : 0.7), osc = 1.2 * Math.sin(t * 2.2 + i * 1.7);
        const d = roll + osc - i * 1.5, vis = L.sstep(-0.5, 1.5, d) * (1 - L.sstep(0.97, 1, u)) * (u > 0 ? 1 : 0);
        placeOn(r.group, st, L.clamp01(d / len) * len, l, vis);
        r.update(t, d);
      });
    }
    // guias/sarjetas antes das calçadas; peças com regra somem quando a obra vizinha começa
    for (const g of groups) {
      const len = g.st.len, k = g.kind === 'curb' ? L.prog(kw, 0.1, 0.65) : L.prog(kw, 0.35, 1);
      if (g.rule && !g.rule(S)) { g.rev.set(-1); continue; }
      g.rev.set(k >= 1 ? 1e9 : len * k + (k > 0 ? 0.01 : -1));
    }
    tact.visible = kw > 0.95;
    // ponte e mobiliário
    const kb = L.prog(ka, 0, 0.35);
    fill.visible = S.build.canal > 0.6 && kb > 0.5;
    bridge.visible = kb > 0.001; bridge.position.y = -2.5 * (1 - L.ease.out(kb));
    for (const p of posts) { const st = ST[p.st], k = L.clamp01(L.prog(kw, 0.6, 1) * 1.6 - (p.d / st.len) * 0.6); const near = cam && Math.hypot(cam.position.x - p.obj.position.x, cam.position.z - p.obj.position.z) < 2.2 && cam.position.y < p.obj.position.y + 8.5; p.obj.visible = k > 0.001 && !near; p.obj.scale.set(1, Math.max(1e-3, L.ease.back(k)), 1); }
    K.xray(xrayMats, S.xray);
  }
  return { root, update, H, ST, xrayMats, surfaceY: YA, rollerAt };
}
