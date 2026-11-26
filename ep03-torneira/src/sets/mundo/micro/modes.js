// Ep. 03 — módulo micro: os 7 "modos" da lente. Cada modo é (k, tau, t) → escreve nas pools; função pura.
// Dados (posições, tempos de chegada, estruturas de floco, caminhos no filtro) são gerados UMA vez, com L.rng.
import { makeBrown, smoothNoise, CAMPOS } from './kit.js';

export function buildModes({ L, THREE, P, M, extra, LB, dur }) {
  const { lerp, clamp01, sstep, prog, ease, pulse } = L;
  const C = (h) => new THREE.Color(h), V = () => ({ x: 0, y: 0, z: 0 });
  const tmp = V(), tmp2 = V(), cTmp = new THREE.Color();
  const COL = {
    clay: ['#9a6236', '#b07842', '#7d4f2c', '#a8703a', '#8c5a30'].map(C), silt: ['#c2a06a', '#8f7a55', '#a88a5c', '#b59a70'].map(C),
    org: ['#5d5a2a', '#6b4a2a', '#4f5526'].map(C), bact: C('#ff6fae'), bact2: C('#ff86c0'), dead: C('#7b8087'),
    shell: C('#ffc25a'), shell2: C('#ffd58a'), nuc: C('#c06a1e'), anth: ['#1b1c21', '#24252c', '#151619'].map(C),
    sand: ['#dcc69c', '#cdb284', '#e4d2a8', '#c9ad7d'].map(C), ion: C('#ffd24a'), white: C('#ffffff'),
    tickOn: C('#ffd23a'), tickOff: C('#2f4b58'), red: C('#ff6b5e'), dart: C('#bff0ff'), gold: C('#ffcf50')
  };
  const pick = (R, arr) => arr[Math.floor(R() * arr.length) % arr.length];
  /** ponto aleatório num disco (lente circular) */
  const inDisc = (R, r, z0, z1) => { const a = R() * Math.PI * 2, rr = r * Math.sqrt(R()); return { x: Math.cos(a) * rr, y: Math.sin(a) * rr, z: lerp(z0, z1, R()) }; };

  /* ---------- peças compostas ---------- */
  const BACT = { rod: P.rod, rodFlag: P.rodFlag, diplo: P.diplo, chain: P.chain };
  /** bactéria: kind, posição, ângulo no plano (z), inclinação, escala, cor, achatamento (inativação) */
  function bact(kind, p, ang, tilt, s, col, squash = 0) {
    s *= 1.5; BACT[kind].add(p, [tilt, tilt * 0.6, ang], [s * (1 - 0.1 * squash), s * (1 - 0.3 * squash), s * (1 - 0.25 * squash)], col);
  }
  /** cisto de protozoário (oval, 4 núcleos) ou oocisto (redondo, menor, 3 corpos internos) */
  function cyst(p, ang, s, oval, a = 1) {
    s *= 1.3;
    const sx = oval ? s * 1.32 : s, sy = s, sz = s * 0.9;
    P.shell.add(p, [0.2, 0.1, ang], [sx * a, sy * a, sz * a], oval ? COL.shell : COL.shell2);
    const ca = Math.cos(ang), sa = Math.sin(ang), n = oval ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const lx = oval ? (i < 2 ? -0.32 : 0.3) * sx : Math.cos(i * 2.1) * 0.38 * s, ly = oval ? (i % 2 ? 0.26 : -0.22) * sy : Math.sin(i * 2.1) * 0.38 * s;
      tmp2.x = p.x + (lx * ca - ly * sa) * a; tmp2.y = p.y + (lx * sa + ly * ca) * a; tmp2.z = p.z;
      P.nuc.add(tmp2, null, (oval ? 0.17 : 0.2) * s * a, COL.nuc);
    }
  }
  const SOLID = { clayA: P.clayA, clayB: P.clayB, silt: P.silt, org: P.org, fiber: P.fiber };
  function bokeh(p, size, col, k = 1) { cTmp.copy(col).multiplyScalar(k); P.bokeh.add(p, null, [size, size, 1], cTmp); }

  /* ---------- cena "suspensão" (água bruta e água clarificada): coisas soltas se movendo ---------- */
  function suspension(seed, spec) {
    const R = L.rng(seed), items = [];
    const add = (kind, n, s0, s1, r, z0, z1, extraF) => { for (let i = 0; i < n; i++) { const it = { kind, b: inDisc(R, r, z0, z1), s: lerp(s0, s1, R()), r0: [R() * 6, R() * 6, R() * 6], rs: [(R() - 0.5) * 0.5, (R() - 0.5) * 0.5, (R() - 0.5) * 0.4], br: makeBrown(R), ang: R() * Math.PI * 2, ph: R() * 6, col: null }; if (extraF) extraF(it, R); items.push(it); } };
    for (const [kind, n, s0, s1, r, z0, z1] of spec.items) add(kind, n, s0, s1, r, z0, z1, (it, R) => {
      it.col = kind.startsWith('clay') ? pick(R, COL.clay) : kind === 'silt' ? pick(R, COL.silt) : kind === 'org' || kind === 'fiber' ? pick(R, COL.org) : R() < 0.5 ? COL.bact : COL.bact2;
    });
    // fixos (para os rótulos apontarem)
    for (const f of spec.fixed || []) items.push({ ...f, fixed: true, r0: [0.15, 0.1, f.ang || 0], rs: [0.04, 0.06, 0.05], br: makeBrown(R), ph: R() * 6, col: f.col || (f.kind.startsWith('clay') ? COL.clay[1] : f.kind === 'cyst' || f.kind === 'oocyst' ? null : COL.bact) });
    const bok = []; for (let i = 0; i < (spec.bokeh || 40); i++) bok.push({ p: inDisc(R, 7, -10, -4), s: 0.4 + R() * 1.1, c: pick(R, spec.bokehCols), br: makeBrown(R) });
    for (let i = 0; i < 5; i++) bok.push({ p: { ...inDisc(R, 3.2, 3.6, 5.6) }, s: 1.0 + R() * 1.2, c: pick(R, spec.bokehCols), br: makeBrown(R), near: true });
    const pos = (it, t, tau) => {
      it.br(t + it.ph, it.kind === 'silt' ? 0.07 : 0.045, tmp);
      let x = it.b.x + tmp.x, y = it.b.y + tmp.y, z = it.b.z + tmp.z;
      if (BACT[it.kind]) { const hd = it.ang + 0.35 * Math.sin(0.6 * t + it.ph); x += Math.cos(hd) * 0.12 * (tau + 0.4); y += Math.sin(hd) * 0.12 * (tau + 0.4); }
      return { x, y, z };
    };
    const draw = (k, tau, t, aDim = 1) => {
      for (const it of items) {
        const p = pos(it, t, tau); it.cur = p;
        if (BACT[it.kind]) { const hd = it.ang + 0.35 * Math.sin(0.6 * t + it.ph); bact(it.kind, p, hd + 0.25 * Math.sin(5 * t + it.ph), 0.3 * Math.sin(0.7 * t + it.ph), it.s, it.col); }
        else if (it.kind === 'cyst' || it.kind === 'oocyst') cyst(p, it.ang + 0.2 * Math.sin(0.3 * t + it.ph), it.s, it.kind === 'cyst');
        else { const tt = it.fixed ? tau : t; SOLID[it.kind].add(p, [it.r0[0] + it.rs[0] * tt, it.r0[1] + it.rs[1] * tt, it.r0[2] + it.rs[2] * tt], it.s * 1.45, it.col); }
      }
      for (const b of bok) { b.br(t, b.near ? 0.12 : 0.25, tmp); tmp2.x = b.p.x + tmp.x; tmp2.y = b.p.y + tmp.y; tmp2.z = b.p.z; bokeh(tmp2, b.s, b.c, (b.near ? 0.22 : 0.5) * aDim); }
    };
    return { items, draw };
  }

  /* ================= RAW — água bruta ================= */
  const raw = suspension(101, {
    items: [['clayA', 8, 0.2, 0.4, 3.1, -2.6, 0.9], ['clayB', 8, 0.18, 0.36, 3.1, -2.6, 0.9], ['silt', 28, 0.05, 0.12, 3.3, -3, 1.4],
      ['org', 5, 0.18, 0.3, 2.8, -2, 0.6], ['fiber', 3, 0.35, 0.5, 2.8, -2, 0.4],
      ['rod', 4, 0.95, 1.2, 2.7, -1.6, 0.8], ['rodFlag', 4, 1.0, 1.2, 2.7, -1.6, 0.8], ['diplo', 3, 1, 1.15, 2.7, -1.6, 0.8], ['chain', 2, 1, 1.1, 2.7, -1.5, 0.6],
      ['oocyst', 1, 0.2, 0.22, 2.5, -1.4, 0.2]],
    fixed: [{ kind: 'clayA', b: { x: -0.95, y: 0.75, z: 0.55 }, s: 0.36, ang: 0.4, id: 'clay' },
      { kind: 'cyst', b: { x: 0.95, y: -0.72, z: 0.5 }, s: 0.33, ang: 0.5, id: 'cyst' },
      { kind: 'rodFlag', b: { x: 0.35, y: -1.05, z: 0.75 }, s: 1.25, ang: 2.6, id: 'bac', col: COL.bact },
      { kind: 'cyst', b: { x: -1.9, y: -1.3, z: -1.2 }, s: 0.3, ang: 2.0 }, { kind: 'oocyst', b: { x: 1.8, y: 1.4, z: -0.6 }, s: 0.21, ang: 0 }],
    bokehCols: [C('#6a4a26'), C('#4e4a2a'), C('#3c4b3a')], bokeh: 46
  });
  const rawClay = raw.items.find((i) => i.id === 'clay'), rawCyst = raw.items.find((i) => i.id === 'cyst');
  function modeRaw(k, tau, t) {
    raw.draw(k, tau, t);
    LB.clay.set(pulse(k, 0.0, 0.52, 0.08, 0.08), { x: -0.2, y: 1.75 }, rawClay.cur);
    LB.micro.set(pulse(k, 0.46, 1.0, 0.08, 0.06), { x: 0.2, y: -1.75 }, rawCyst.cur);
  }

  /* ================= COAG — cargas negativas, coagulante neutraliza, partículas grudam ================= */
  const coag = (() => {
    const R = L.rng(202), parts = [];
    const base = [[-1.2, 0.95], [0.1, 1.3], [1.45, 0.6], [1.7, -0.6], [-1.85, -0.35], [-0.6, -0.1], [0.6, -0.55], [-0.5, -1.55], [1.0, -1.75]];
    const kinds = ['clayA', 'clayB', 'clayA', 'silt', 'clayB', 'silt', 'clayA', 'clayB', 'silt'];
    base.forEach(([x, y], i) => parts.push({ kind: kinds[i], b: { x: x + (R() - 0.5) * 0.15, y: y + (R() - 0.5) * 0.15, z: (R() - 0.5) * 0.7 }, s: kinds[i] === 'silt' ? 0.36 + R() * 0.05 : 0.42 + R() * 0.08,
      r0: [(R() - 0.5) * 0.5, (R() - 0.5) * 0.5, R() * 6], rs: [(R() - 0.5) * 0.2, (R() - 0.5) * 0.2, (R() - 0.5) * 0.3], br: makeBrown(R), ph: R() * 6, col: kinds[i] === 'silt' ? pick(R, COL.silt) : pick(R, COL.clay), a0: R() * 6, ions: [] }));
    // pares que se repelem (aproximam e são empurrados de volta)
    const pairs = [[0, 1, 0.0], [2, 3, 0.45], [5, 6, 0.75]];
    // íons do coagulante: 3 por partícula (um para cada selo "−")
    const ions = []; const order = []; for (let i = 0; i < parts.length * 3; i++) order.push(i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    order.forEach((idx, rank) => {
      const p = Math.floor(idx / 3), b = idx % 3, a = 2.3 + (R() - 0.5) * 1.3;
      const ion = { p, b, ka: 0.3 + 0.3 * rank / (order.length - 1) + (R() - 0.5) * 0.02, st: { x: Math.cos(a) * 3.9, y: Math.sin(a) * 3.9, z: 0.4 + R() * 0.4 }, wob: R() * 6, br: makeBrown(R) };
      ions.push(ion); parts[p].ions.push(ion);
    });
    // íons em excesso que passam (o coagulante chega numa corrente)
    for (let i = 0; i < 6; i++) { const a = 2.3 + (R() - 0.5) * 1.4; ions.push({ p: -1, ka: 0.3 + R() * 0.35, st: { x: Math.cos(a) * 3.9, y: Math.sin(a) * 3.9, z: 0.3 + R() * 0.5 }, en: inDisc(R, 2.6, -0.6, 0.6), wob: R() * 6, br: makeBrown(R) }); }
    for (const pt of parts) pt.kn = Math.max(...pt.ions.map((i) => i.ka));   // neutralizada por completo
    // grupos que grudam (posições de contato calculadas uma vez)
    const groups = [[0, 1, 5], [2, 3, 6], [4, 7, 8]];
    for (const g of groups) {
      const cx = g.reduce((s, i) => s + parts[i].b.x, 0) / g.length, cy = g.reduce((s, i) => s + parts[i].b.y, 0) / g.length, cz = g.reduce((s, i) => s + parts[i].b.z, 0) / g.length;
      const ks = Math.max(...g.map((i) => parts[i].kn)) + 0.02;
      g.forEach((i, j) => {
        const pt = parts[i]; let fx = cx, fy = cy;
        if (j > 0) { const prev = parts[g[0]]; const ang = Math.atan2(pt.b.y - cy, pt.b.x - cx); const d = (prev.s + pt.s) * 0.68; fx = cx + Math.cos(ang) * d; fy = cy + Math.sin(ang) * d; }
        pt.fin = { x: fx, y: fy, z: cz }; pt.ks = Math.max(ks, pt.kn + 0.03) + j * 0.05;
      });
      // o primeiro fica no centro do grupo
    }
    const bok = []; for (let i = 0; i < 44; i++) bok.push({ p: inDisc(R, 7, -10, -4), s: 0.4 + R() * 1.1, c: pick(R, [C('#6a4a26'), C('#4e4a2a')]), br: makeBrown(R) });
    return { parts, pairs, ions, groups, bok };
  })();
  const badgePos = (pt, b, pos, t, out) => { const a = pt.a0 + b * 2.094 + 0.15 * Math.sin(0.5 * t); const r = pt.s * 1.05 + 0.1; out.x = pos.x + Math.cos(a) * r; out.y = pos.y + Math.sin(a) * r * 0.9; out.z = pos.z + 0.32; return out; };
  function modeCoag(k, tau, t) {
    const { parts, pairs, ions } = coag, repel = 1 - sstep(0.26, 0.4, k);
    // posições das partículas
    for (const pt of parts) { pt.br(t + pt.ph, 0.05, tmp); pt.cur = { x: pt.b.x + tmp.x, y: pt.b.y + tmp.y, z: pt.b.z + tmp.z }; }
    for (const [a, b, ph] of pairs) {
      const u = L.fract(tau / 1.25 + ph), ap = (u < 0.72 ? ease.io(u / 0.72) : 1 - ease.out((u - 0.72) / 0.28)) * repel;
      const A = parts[a].cur, B = parts[b].cur, dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
      const m = 0.3 * ap; A.x += dx / d * m; A.y += dy / d * m; B.x -= dx / d * m; B.y -= dy / d * m;
      // sinal de repulsão (setas vermelhas para fora) no rebote
      const fl = sstep(0.68, 0.76, u) * (1 - sstep(0.9, 1, u)) * repel;
      if (fl > 0.02) {
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, ang = Math.atan2(dy, dx);
        for (const sgn of [-1, 1]) { tmp2.x = mx + sgn * Math.cos(ang) * 0.24; tmp2.y = my + sgn * Math.sin(ang) * 0.24; tmp2.z = (A.z + B.z) / 2 + 0.5; P.dart.add(tmp2, [0, 0, ang + (sgn < 0 ? Math.PI : 0)], 0.32 * fl, COL.red); }
      }
    }
    for (const pt of parts) if (pt.fin) { const u = ease.io(prog(k, pt.ks, pt.ks + 0.2)); pt.br(t * 0.6 + pt.ph, 0.02, tmp); pt.cur.x = lerp(pt.cur.x, pt.fin.x + tmp.x, u); pt.cur.y = lerp(pt.cur.y, pt.fin.y + tmp.y, u); pt.cur.z = lerp(pt.cur.z, pt.fin.z, u); }
    for (const pt of parts) {
      SOLID[pt.kind].add(pt.cur, [pt.r0[0] + pt.rs[0] * tau, pt.r0[1] + pt.rs[1] * tau, pt.r0[2] + pt.rs[2] * tau], pt.s, pt.col);
      for (let b = 0; b < 3; b++) { const ion = pt.ions.find((i) => i.b === b), sc = 0.32 * (1 - sstep(ion.ka - 0.005, ion.ka + 0.03, k)) * (0.92 + 0.08 * Math.sin(6 * t + b)); if (sc > 0.01) P.minus.add(badgePos(pt, b, pt.cur, t, tmp2), null, [sc, sc, 1]); }
    }
    for (const ion of ions) {
      const u = prog(k, ion.ka - 0.17, ion.ka); if (u <= 0) continue;
      let x, y, z;
      if (ion.p >= 0) {
        const pt = parts[ion.p], bp = badgePos(pt, ion.b, pt.cur, t, tmp2);
        const e = ease.io(u), w = Math.sin(u * Math.PI) * 0.35;
        x = lerp(ion.st.x, bp.x, e) + Math.sin(ion.wob + u * 5) * w; y = lerp(ion.st.y, bp.y, e) + Math.cos(ion.wob + u * 4) * w; z = lerp(ion.st.z, bp.z - 0.12, e);
        const arrived = u >= 1;
        P.ion.add({ x, y, z }, null, arrived ? 0.075 : 0.095, COL.ion);
        if (!arrived) { tmp.x = x + 0.13; tmp.y = y + 0.13; tmp.z = z + 0.1; P.plus.add(tmp, null, [0.24, 0.24, 1]); }
        const f = prog(k, ion.ka, ion.ka + 0.05);
        if (f > 0 && f < 1) { tmp.x = bp.x; tmp.y = bp.y; tmp.z = bp.z; const s = lerp(0.12, 0.6, ease.out(f)); cTmp.copy(COL.gold).multiplyScalar(1 - f); P.ring.add(tmp, null, [s, s, 1], cTmp); }
      } else {
        const e = ease.out(u); ion.br(t, 0.12, tmp);
        x = lerp(ion.st.x, ion.en.x, e) + tmp.x; y = lerp(ion.st.y, ion.en.y, e) + tmp.y; z = lerp(ion.st.z, ion.en.z, e);
        P.ion.add({ x, y, z }, null, 0.09, COL.ion); tmp.x = x + 0.13; tmp.y = y + 0.13; tmp.z = z + 0.1; P.plus.add(tmp, null, [0.22, 0.22, 1]);
      }
    }
    for (const b of coag.bok) { b.br(t, 0.25, tmp); tmp2.x = b.p.x + tmp.x; tmp2.y = b.p.y + tmp.y; tmp2.z = b.p.z; bokeh(tmp2, b.s, b.c, 0.5); }
    // rótulos
    const A = parts[0].cur, B = parts[1].cur;
    LB.repel.set(pulse(k, 0.0, 0.33, 0.06, 0.06), { x: 0.1, y: 1.85 }, { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 + 0.25, z: A.z });
    const nIon = coag.ions.filter((i) => i.p === 7)[0], pt7 = parts[7];
    LB.neut.set(pulse(k, 0.31, 0.64, 0.06, 0.06), { x: 0.2, y: -1.85 }, k < nIon.ka ? pt7.cur : badgePos(pt7, nIon.b, pt7.cur, t, V()));
    const g0 = coag.groups[1].map((i) => parts[i].cur), gc = { x: g0.reduce((s, p) => s + p.x, 0) / 3, y: g0.reduce((s, p) => s + p.y, 0) / 3 + 0.3, z: g0[0].z };
    LB.stick.set(pulse(k, 0.66, 1.0, 0.06, 0.04), { x: 0.05, y: 1.45 }, gc);
  }

  /* ---------- flocos: microflocos (mini-agregados) e flocos porosos (agregado de microflocos) ---------- */
  function aggregate(R, n, rr, glue = 0.9) {
    const out = [{ x: 0, y: 0, z: 0, r: rr(R) }];
    for (let i = 1; i < n; i++) {
      for (let tries = 0; tries < 20; tries++) {
        const e = out[Math.floor(R() * out.length)], r = rr(R), u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        const d = (e.r + r) * glue, q = { x: e.x + Math.cos(a) * s * d, y: e.y + Math.sin(a) * s * d, z: e.z + u * d * 0.8, r };
        if (out.every((o) => Math.hypot(o.x - q.x, o.y - q.y, o.z - q.z) > (o.r + q.r) * 0.75)) { out.push(q); break; }
      }
    }
    // recentraliza
    const cx = out.reduce((s, o) => s + o.x, 0) / out.length, cy = out.reduce((s, o) => s + o.y, 0) / out.length, cz = out.reduce((s, o) => s + o.z, 0) / out.length;
    for (const o of out) { o.x -= cx; o.y -= cy; o.z -= cz; }
    const rad = Math.max(...out.map((o) => Math.hypot(o.x, o.y, o.z) + o.r));
    return { parts: out, rad };
  }
  function makeMicrofloc(R, scale = 1) {
    const ag = aggregate(R, 4 + Math.floor(R() * 4), (R) => (0.075 + R() * 0.045) * scale, 0.95);
    for (const o of ag.parts) { const u = R(); o.kind = u < 0.55 ? 'silt' : u < 0.84 ? (R() < 0.5 ? 'clayA' : 'clayB') : u < 0.95 ? 'org' : 'rod'; o.col = o.kind === 'silt' ? pick(R, COL.silt) : o.kind === 'org' ? pick(R, COL.org) : o.kind === 'rod' ? COL.bact : pick(R, COL.clay); o.rot = [R() * 6, R() * 6, R() * 6]; }
    return ag;
  }
  function makeFloc(R, nMicro, scale = 1) {
    const mics = []; for (let i = 0; i < nMicro; i++) mics.push(makeMicrofloc(R, scale));
    const ag = aggregate(R, nMicro, () => 0, 1); // só para a ordem; posições reais abaixo
    // monta: cada microfloco gruda num já presente (porosidade = contatos pontuais)
    const placed = [{ x: 0, y: 0, z: 0, m: mics[0] }];
    for (let i = 1; i < nMicro; i++) {
      const m = mics[i];
      for (let tries = 0; tries < 30; tries++) {
        const e = placed[Math.floor(R() * placed.length)], u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = (e.m.rad + m.rad) * 0.82;
        const q = { x: e.x + Math.cos(a) * s * d, y: e.y + Math.sin(a) * s * d, z: e.z + u * d * 0.7, m };
        if (placed.every((o) => Math.hypot(o.x - q.x, o.y - q.y, o.z - q.z) > (o.m.rad + m.rad) * 0.7)) { placed.push(q); break; }
        if (tries === 29) placed.push(q);
      }
    }
    void ag;
    const cx = placed.reduce((s, o) => s + o.x, 0) / placed.length, cy = placed.reduce((s, o) => s + o.y, 0) / placed.length, cz = placed.reduce((s, o) => s + o.z, 0) / placed.length;
    for (const o of placed) { o.x -= cx; o.y -= cy; o.z -= cz; o.d = Math.hypot(o.x, o.y, o.z); }
    const rad = Math.max(...placed.map((o) => o.d + o.m.rad));
    return { mics: placed, rad };
  }
  const rotY = (p, a, b, out) => { const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b); const x = p.x * ca + p.z * sa, z = -p.x * sa + p.z * ca; out.x = x * cb - p.y * sb; out.y = x * sb + p.y * cb; out.z = z; return out; };
  /** desenha um microfloco em (c) com rotação (a, b) e escala s */
  function drawMicrofloc(mf, c, a, b, s, alpha = 1) {
    for (const o of mf.parts) {
      rotY(o, a, b, tmp2); tmp2.x = c.x + tmp2.x * s; tmp2.y = c.y + tmp2.y * s; tmp2.z = c.z + tmp2.z * s;
      if (o.kind === 'rod') bact('rod', tmp2, o.rot[2] + a, o.rot[0], o.r * 3.6 * s * alpha, o.col);
      else SOLID[o.kind].add(tmp2, [o.rot[0] + a, o.rot[1], o.rot[2] + b], o.r * s * alpha * (o.kind === 'org' ? 0.8 : o.kind === 'silt' ? 1.05 : 1.15), o.col);
    }
  }

  /* ================= FLOC — microflocos se agregam em flocos maiores, porosos ================= */
  const flocM = (() => {
    const R = L.rng(303), flocs = [];
    const centers = [[-1.3, 1.1, -0.3], [1.35, 1.15, -0.7], [-1.15, -0.75, 0.1], [1.3, -0.7, -0.2], [0.1, 0.2, -2.6]];
    centers.forEach(([x, y, z], fi) => {
      const fl = makeFloc(R, fi === 4 ? 6 : 7 + Math.floor(R() * 2)); fl.c = { x, y, z }; fl.ph = R() * 6; fl.br = makeBrown(R);
      const ord = fl.mics.map((m, i) => i).sort((a, b) => fl.mics[a].d - fl.mics[b].d);
      ord.forEach((mi, rank) => {
        const m = fl.mics[mi]; m.ka = rank === 0 ? -1 : 0.08 + 0.78 * rank / (ord.length - 1) + (R() - 0.5) * 0.04;
        const a = R() * Math.PI * 2, d = 1.0 + R() * 1.5; m.init = { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, z: z + (R() - 0.5) * 1.2 };
        const rr = Math.hypot(m.init.x, m.init.y); if (rr > 3.0) { m.init.x *= 3.0 / rr; m.init.y *= 3.0 / rr; }
        m.br = makeBrown(R); m.ra = R() * 6; m.rb = R() * 6;
      });
      flocs.push(fl);
    });
    const fines = []; for (let i = 0; i < 30; i++) fines.push({ p: inDisc(R, 3.1, -2.5, 1), s: 0.04 + R() * 0.05, col: pick(R, COL.silt), br: makeBrown(R), kc: 0.2 + R() * 0.7, rot: [R() * 6, R() * 6, R() * 6] });
    const bok = []; for (let i = 0; i < 40; i++) bok.push({ p: inDisc(R, 7, -10, -4), s: 0.5 + R() * 1.3, c: pick(R, [C('#6a5030'), C('#4e4a2a')]), br: makeBrown(R) });
    return { flocs, fines, bok };
  })();
  const flocPos = (fl, m, k, t, out) => {
    const A = 0.22 * t + fl.ph, B = 0.12 * Math.sin(0.3 * t + fl.ph);
    fl.br(t + fl.ph, 0.04, tmp); const cx = fl.c.x + tmp.x, cy = fl.c.y + tmp.y, cz = fl.c.z + tmp.z;
    rotY(m, A, B, out); out.x += cx; out.y += cy; out.z += cz;
    const u = ease.io(prog(k, m.ka - 0.26, m.ka));
    if (u < 1) { m.br(t + m.ra, 0.08, tmp); out.x = lerp(m.init.x + tmp.x, out.x, u); out.y = lerp(m.init.y + tmp.y, out.y, u); out.z = lerp(m.init.z + tmp.z, out.z, u); }
    return { A: lerp(m.ra + 0.3 * t, A, u), B: lerp(m.rb, B, u) };
  };
  function modeFloc(k, tau, t) {
    for (const fl of flocM.flocs) {
      let grown = 0;
      for (const m of fl.mics) { const p = V(), r = flocPos(fl, m, k, t, p); m.cur = p; drawMicrofloc(m.m, p, r.A, r.B, 1); if (k >= m.ka) grown++; }
      // halo de "algodão" cresce com o floco
      const g = grown / fl.mics.length, s = (fl.rad * 2.1) * (0.35 + 0.65 * g);
      cTmp.set('#c9ab7c'); fl.br(t + fl.ph, 0.04, tmp); tmp2.x = fl.c.x + tmp.x; tmp2.y = fl.c.y + tmp.y; tmp2.z = fl.c.z - 0.1;
      P.halo.add(tmp2, null, [s, s, 1], cTmp.multiplyScalar(0.22 + 0.3 * g));
    }
    for (const f of flocM.fines) { const a = 1 - sstep(f.kc - 0.1, f.kc, k); if (a < 0.02) continue; f.br(t, 0.09, tmp); tmp2.x = f.p.x + tmp.x; tmp2.y = f.p.y + tmp.y; tmp2.z = f.p.z + tmp.z; P.silt.add(tmp2, f.rot, f.s * a, f.col); }
    for (const b of flocM.bok) { b.br(t, 0.25, tmp); tmp2.x = b.p.x + tmp.x; tmp2.y = b.p.y + tmp.y; tmp2.z = b.p.z; bokeh(tmp2, b.s, b.c, 0.45); }
    const fl1 = flocM.flocs[1], late = fl1.mics.reduce((a, b) => (b.ka > a.ka ? b : a));
    LB.micfloc.set(pulse(k, 0.0, 0.42, 0.06, 0.06), { x: 0.3, y: 1.95 }, late.cur || fl1.c);
    const f2 = flocM.flocs[2]; LB.floc.set(pulse(k, 0.58, 1.0, 0.06, 0.04), { x: 0.3, y: -1.8 }, { x: f2.c.x + 0.45, y: f2.c.y - 0.2, z: f2.c.z + 0.5 });
  }

  /* ================= SETTLE — vista lateral: flocos descem e viram lodo no fundo ================= */
  const settleM = (() => {
    const R = L.rng(404), flocs = [], BED0 = -2.75;
    const xs = [-1.55, -0.45, 0.65, 1.8, -1.0, 0.1, 1.2, 2.3, -1.7, 0.75];
    xs.forEach((x, i) => {
      const fl = makeFloc(R, 4 + Math.floor(R() * 3), 0.95);
      fl.x = x + (R() - 0.5) * 0.3; fl.y0 = 0.1 + (i % 3) * 0.85 + R() * 0.5 + (i > 7 ? 0.6 : 0); fl.z = -1.0 + R() * 1.4;
      fl.kl = 0.32 + 0.6 * (fl.y0 - 0.1) / 2.9 + (R() - 0.5) * 0.08; fl.yl = BED0 + 0.28 + 0.12 * (i % 3) + fl.rad * 0.5 + 0.3 * fl.kl;
      fl.ph = R() * 6; fl.br = makeBrown(R); fl.mics.forEach((m) => { m.ka = -1; });
      flocs.push(fl);
    });
    const haze = []; for (let i = 0; i < 70; i++) haze.push({ p: { x: (R() - 0.5) * 7, y: -2 + R() * 5, z: -2.6 + R() * 3.4 }, s: 0.03 + R() * 0.05, v: 0.4 + R() * 0.9, col: pick(R, COL.silt), br: makeBrown(R), rot: [R() * 6, R() * 6, R() * 6] });
    const crust = []; for (let i = 0; i < 70; i++) crust.push({ x: (R() - 0.5) * 7.5, z: -2.2 + R() * 3.2, s: 0.06 + R() * 0.08, kind: R() < 0.6 ? 'silt' : R() < 0.5 ? 'clayA' : 'clayB', col: R() < 0.5 ? pick(R, COL.clay) : pick(R, COL.silt), kk: R(), rot: [R() * 6, R() * 6, R() * 6] });
    const bok = []; for (let i = 0; i < 30; i++) bok.push({ p: inDisc(R, 7, -10, -4), s: 0.4 + R() * 1.1, c: pick(R, [C('#5a4a30'), C('#3c4b48')]), br: makeBrown(R) });
    return { flocs, haze, crust, bok, BED0 };
  })();
  function modeSettle(k, tau, t) {
    const { flocs, haze, crust, BED0 } = settleM, bedTop = BED0 + 0.18 + 0.32 * ease.out(k);
    extra.bed.visible = true; extra.bed.position.set(0, (bedTop + (BED0 - 1.6)) / 2, -0.6); extra.bed.scale.set(11, bedTop - (BED0 - 1.6), 4.2);
    for (const fl of flocs) {
      const u = clamp01(k / fl.kl), f = 1 - Math.pow(1 - u, 1.5), y = lerp(fl.y0, fl.yl, f), land = sstep(0.9, 1, u);
      fl.br(t + fl.ph, 0.035 * (1 - land), tmp);
      const c = { x: fl.x + tmp.x, y: y + tmp.y, z: fl.z + tmp.z }; fl.cur = c;
      const A = fl.ph + 0.25 * t * (1 - land) + 0.25 * fl.kl * land, B = 0.15 * Math.sin(fl.ph);
      for (const m of fl.mics) { rotY(m, A, B, tmp2); const p = { x: c.x + tmp2.x, y: c.y + tmp2.y * (1 - 0.25 * land), z: c.z + tmp2.z }; drawMicrofloc(m.m, p, A + m.d, B, 1); }
      // seta curta de queda sob os flocos que ainda descem
      const fa = (1 - land) * sstep(0.0, 0.08, k) * (fl.y0 > 1.2 ? 1 : 0);
      if (fa > 0.05) { tmp2.x = c.x; tmp2.y = c.y - fl.rad - 0.25; tmp2.z = c.z + 0.6; P.dart.add(tmp2, [0, 0, -Math.PI / 2], 0.2 * fa, COL.gold); }
    }
    for (const h of haze) { const a = 1 - 0.85 * sstep(0.1, 1, k) * (h.p.y > -0.5 ? 1 : 0.4); const y = Math.max(BED0 + 0.3, h.p.y - h.v * k * 1.2); h.br(t, 0.05, tmp); tmp2.x = h.p.x + tmp.x; tmp2.y = y + tmp.y; tmp2.z = h.p.z; P.silt.add(tmp2, h.rot, h.s * a, h.col); }
    for (const c of crust) { const a = sstep(c.kk * 0.8, c.kk * 0.8 + 0.15, k); if (a < 0.02) continue; tmp2.x = c.x; tmp2.y = bedTop + c.s * 0.3; tmp2.z = c.z; SOLID[c.kind].add(tmp2, c.rot, c.s * a, c.col); }
    for (const b of settleM.bok) { b.br(t, 0.25, tmp); tmp2.x = b.p.x + tmp.x; tmp2.y = b.p.y + tmp.y; tmp2.z = b.p.z; bokeh(tmp2, b.s, b.c, 0.35 * (b.p.y > 0 ? 1 - 0.6 * k : 1)); }
    // seta da gravidade (lado esquerdo), com pulsação descendo
    const ga = pulse(k, 0.0, 0.72, 0.06, 0.12); extra.grav.visible = ga > 0.02; extra.grav.material.opacity = ga;
    extra.grav.position.set(-2.45, 1.35 - 0.18 * L.fract(tau * 0.8), 0.8);
    LB.grav.set(pulse(k, 0.0, 0.48, 0.06, 0.06), { x: -0.75, y: 1.8 }, { x: -2.45, y: 0.9, z: 0.8 });
    LB.sludge.set(pulse(k, 0.55, 1.0, 0.06, 0.04), { x: 0.75, y: -0.35 }, { x: 0.7, y: bedTop, z: 0.9 });
    LB.clearer.set(pulse(k, 0.62, 1.0, 0.06, 0.04), { x: 0.1, y: 1.5 }, null);
  }

  /* ================= CLEAR — água bem mais limpa, mas ainda com microrganismos ================= */
  const clear = suspension(505, {
    items: [['silt', 10, 0.03, 0.07, 3.2, -2.5, 1.0], ['rod', 2, 1.0, 1.2, 2.5, -1.5, 0.6], ['rodFlag', 2, 1.05, 1.2, 2.5, -1.5, 0.6], ['diplo', 2, 1, 1.1, 2.5, -1.4, 0.6], ['chain', 1, 1, 1, 2.3, -1.2, 0.4]],
    fixed: [{ kind: 'cyst', b: { x: 0.85, y: -0.55, z: 0.5 }, s: 0.32, ang: 0.4, id: 'cyst' }, { kind: 'oocyst', b: { x: -1.2, y: -0.2, z: 0.2 }, s: 0.21, ang: 0 },
      { kind: 'rodFlag', b: { x: -0.35, y: 0.55, z: 0.6 }, s: 1.25, ang: -0.6, col: COL.bact }],
    bokehCols: [C('#2a6a86'), C('#1f5a70'), C('#3d7c8e')], bokeh: 30
  });
  const clearCyst = clear.items.find((i) => i.id === 'cyst');
  function modeClear(k, tau, t) {
    clear.draw(k, tau, t, 0.7);
    LB.notready.set(pulse(k, 0.0, 1.0, 0.06, 0.04), { x: 0.1, y: 1.65 }, null);
    LB.micro.set(pulse(k, 0.14, 0.94, 0.08, 0.06), { x: 0.2, y: -1.75 }, clearCyst.cur);
  }

  /* ================= FILTER — antracito sobre areia; poros retêm partículas e cistos ================= */
  const filt = (() => {
    const R = L.rng(606), grains = [], back = [];
    const yI = (x) => -0.3 + 0.22 * Math.sin(1.3 * x + 0.5);
    const place = (list, n, x0, x1, y0, y1, r0, r1, gap, kind, z, cond) => {
      for (let i = 0, tries = 0; i < n && tries < 6000; tries++) {
        const r = lerp(r0, r1, R()), x = lerp(x0, x1, R()), y = lerp(y0, y1, R());
        if (cond && !cond(x, y, r)) continue;
        if (list.some((g) => Math.hypot(g.x - x, g.y - y) < g.r + r + gap)) continue;
        list.push({ x, y, z: z + (R() - 0.5) * 0.3, r, kind, rot: [R() * 6, R() * 6, R() * 6], col: kind === 'anth' ? pick(R, COL.anth) : pick(R, COL.sand), sq: 0.85 + R() * 0.25 }); i++;
      }
    };
    place(grains, 60, -4.8, 4.8, -0.6, 4.9, 0.56, 0.82, 0.12, 'anth', 0, (x, y, r) => y - r * 0.4 > yI(x));
    place(grains, 140, -4.8, 4.8, -4.9, 0.4, 0.28, 0.4, 0.085, 'sand', 0, (x, y, r) => y + r * 0.4 < yI(x));
    place(back, 40, -6, 6, -0.5, 6, 0.6, 0.9, 0.05, 'anth', -1.9, (x, y) => y > yI(x) + 0.3);
    place(back, 110, -6, 6, -6, 0.5, 0.3, 0.44, 0.03, 'sand', -1.9, (x, y) => y < yI(x) - 0.2);
    // caminhos da água pelos poros (descendo, contornando os grãos)
    const paths = [], M_ = 0.065;
    for (let i = 0; i < 20; i++) {
      let x = -3.6 + 7.2 * (i + 0.5) / 20 + (R() - 0.5) * 0.2, y = 5.0; const pts = [{ x, y }]; let stuck = 0, lastY = y;
      for (let s = 0; s < 1400 && y > -5.0; s++) {
        y -= 0.03; x += (R() - 0.5) * 0.006;
        for (let pass = 0; pass < 3; pass++) for (const g of grains) { const dx = x - g.x, dy = y - g.y, d = Math.hypot(dx, dy), m = g.r + M_; if (d < m) { if (d < 1e-4) { x += 0.01; continue; } x = g.x + dx / d * m; y = g.y + dy / d * m; } }
        if (y > lastY - 0.004) { stuck++; if (stuck > 20) { x += (x > 0 ? -1 : 1) * 0.03 * (1 + stuck / 40); } } else { stuck = 0; lastY = y; }
        const lp = pts[pts.length - 1]; if (Math.hypot(lp.x - x, lp.y - y) > 0.06) pts.push({ x, y });
      }
      const cum = [0]; for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y));
      // largura do poro em cada ponto: folga até os dois grãos mais próximos
      const gapAt = pts.map((p) => { const ds = grains.map((g) => Math.hypot(p.x - g.x, p.y - g.y) - g.r).sort((a, b) => a - b); return ds[0] + ds[1]; });
      paths.push({ pts, cum, len: cum[cum.length - 1], gapAt, z: 0.05, sp: 0.85 + R() * 0.3, ph: R() });
    }
    const at = (pa, s, out) => { s = Math.max(0, Math.min(pa.len, s)); let j = 1; while (j < pa.cum.length - 1 && pa.cum[j] < s) j++; const a = pa.pts[j - 1], b = pa.pts[j], u = (s - pa.cum[j - 1]) / Math.max(1e-6, pa.cum[j] - pa.cum[j - 1]); out.x = lerp(a.x, b.x, u); out.y = lerp(a.y, b.y, u); out.ang = Math.atan2(b.y - a.y, b.x - a.x); return out; };
    // partículas carregadas pela água: cistos, oocistos, argila, fragmentos de floco, bactérias; uma passa
    const spec = [['cyst', 0.17], ['cyst', 0.17], ['cyst', 0.16], ['oocyst', 0.12], ['oocyst', 0.12], ['oocyst', 0.11], ['clayA', 0.11], ['clayB', 0.12], ['clayA', 0.1], ['silt', 0.1],
      ['floc', 0.13], ['floc', 0.12], ['rod', 0.75], ['rod', 0.75], ['silt', 0.05, 'pass'], ['cyst', 0.16], ['oocyst', 0.12]];
    const carried = [], used = new Set();
    spec.forEach(([kind, s, pass], i) => {
      const pi = 3 + ((i * 5) % (paths.length - 6));   // caminhos espalhados na largura da lente
      const pa = paths[pi], size = kind === 'floc' ? s * 1.6 : kind === 'rod' ? 0.1 : s;
      let sCap = pa.len;
      // retenção: no primeiro estreitamento abaixo de uma cota sorteada (cistos e grãos maiores mais no antracito)
      const yS = kind.includes('cyst') || kind === 'floc' ? lerp(2.0, -1.4, ((i * 0.618) % 1)) : lerp(1.6, -2.0, ((i * 0.382 + 0.2) % 1));
      if (!pass) { const thr = 2 * size + (kind.includes('cyst') ? 0.16 : 0.08); for (let j = 0; j < pa.pts.length; j++) if (pa.pts[j].y < yS && pa.gapAt[j] < thr) { sCap = pa.cum[j]; break; } if (sCap === pa.len) { let j = pa.pts.findIndex((q) => q.y < yS - 0.3); sCap = pa.cum[Math.max(0, j)]; } }
      const v = 1.5 + R() * 0.4, tc = pass ? 0 : -0.6 + 3.9 * i / spec.length + (R() - 0.5) * 0.3;
      const c = { kind, s: kind === 'rod' ? s : s * 1.25, pi, sCap, pass: !!pass, t0: pass ? 1.2 - (pa.len * 0.5) / v : tc - sCap / v, v, rot: [R() * 6, R() * 6, R() * 6], col: kind === 'silt' ? pick(R, COL.silt) : pick(R, COL.clay), ang: R() * 6, mf: kind === 'floc' ? makeMicrofloc(R, 0.55) : null };
      // ponto de retenção encostado no grão mais próximo
      const p = at(pa, sCap, V()); let best = null, bd = 1e9; for (const g of grains) { const d = Math.hypot(p.x - g.x, p.y - g.y) - g.r; if (d < bd) { bd = d; best = g; } }
      if (best && !pass) { const dx = p.x - best.x, dy = p.y - best.y, d = Math.hypot(dx, dy) || 1, rr = best.r + size * 0.85; c.cap = { x: best.x + dx / d * rr, y: best.y + dy / d * rr }; } else c.cap = { x: p.x, y: p.y };
      c.tCap = c.t0 + sCap / c.v;
      carried.push(c);
    });
    const near = (list, x, y) => list.reduce((a, g) => (Math.hypot(g.x - x, g.y - y) < Math.hypot(a.x - x, a.y - y) ? g : a));
    const lab = { anth: near(grains.filter((g) => g.kind === 'anth'), -0.9, 1.0), sand: near(grains.filter((g) => g.kind === 'sand'), 0.9, -1.55) };
    const trappedCysts = carried.filter((c) => c.kind === 'cyst' && !c.pass && c.tCap < 2.5 && Math.hypot(c.cap.x, c.cap.y) < 2.2);
    lab.cyst = trappedCysts.sort((a, b) => Math.hypot(a.cap.x - 0.5, a.cap.y - 0.9) - Math.hypot(b.cap.x - 0.5, b.cap.y - 0.9))[0] || carried[0];
    return { grains, back, paths, carried, at, lab };
  })();
  function modeFilter(k, tau, t) {
    for (const g of filt.grains) { tmp2.x = g.x; tmp2.y = g.y; tmp2.z = g.z; (g.kind === 'anth' ? P.anth : P.sand).add(tmp2, g.rot, [g.r, g.r * g.sq, g.r], g.col); }
    for (const g of filt.back) { tmp2.x = g.x; tmp2.y = g.y; tmp2.z = g.z; cTmp.copy(g.col).multiplyScalar(0.55); (g.kind === 'anth' ? P.anth : P.sand).add(tmp2, g.rot, g.r, cTmp); }
    // setas finas da água pelos poros
    const o = { x: 0, y: 0, ang: 0 };
    for (const pa of filt.paths) for (let j = 0; j < 4; j++) {
      const s = L.fract(t * 0.16 * pa.sp + pa.ph + j / 4) * pa.len; filt.at(pa, s, o);
      const edge = sstep(0, 0.6, s) * (1 - sstep(pa.len - 0.6, pa.len, s));
      tmp2.x = o.x; tmp2.y = o.y; tmp2.z = 0.75; P.dart.add(tmp2, [0, 0, o.ang], [0.17 * edge, 0.11 * edge, 1], COL.dart);
    }
    for (const c of filt.carried) {
      const pa = filt.paths[c.pi], s = c.v * (tau - c.t0); if (s < 0) continue;
      const caught = !c.pass && s >= c.sCap; let p;
      if (caught) { const j = 0.012 * Math.sin(9 * t + c.ang) * (1 - sstep(0, 0.4, tau - c.tCap)); p = { x: c.cap.x + j, y: c.cap.y, z: 0.7 }; }
      else { filt.at(pa, Math.min(s, c.sCap), o); const blend = c.pass ? 0 : sstep(c.sCap - 0.25, c.sCap, s); p = { x: lerp(o.x, c.cap.x, blend), y: lerp(o.y, c.cap.y, blend), z: 0.7 }; if (s > pa.len) continue; }
      c.cur = p; const spin = caught ? c.tCap * 0.8 : t * 0.8;
      if (c.kind === 'cyst' || c.kind === 'oocyst') cyst(p, c.ang + spin * 0.3, c.s, c.kind === 'cyst');
      else if (c.kind === 'rod') bact('rod', p, c.ang + spin, 0.3, c.s, COL.bact);
      else if (c.kind === 'floc') drawMicrofloc(c.mf, p, c.ang + spin, 0.2, 1);
      else SOLID[c.kind].add(p, [c.rot[0] + spin, c.rot[1], c.rot[2]], c.s, c.col);
    }
    const g = filt.lab;
    LB.anth.set(pulse(k, 0.0, 0.46, 0.06, 0.06), { x: 0.15, y: 1.55 }, { x: g.anth.x, y: g.anth.y, z: g.anth.z + g.anth.r });
    LB.sand.set(pulse(k, 0.3, 0.68, 0.06, 0.06), { x: 1.05, y: -1.75 }, { x: g.sand.x, y: g.sand.y, z: g.sand.z + g.sand.r });
    LB.trapped.set(pulse(k, 0.66, 1.0, 0.06, 0.04), { x: 0.0, y: 1.5 }, g.cyst.cur ? { x: g.cyst.cap.x, y: g.cyst.cap.y, z: 0.7 } : null);
  }

  /* ================= CHLORINE — inativação gradual ao longo do tempo de contato; sobra residual ================= */
  const chl = (() => {
    const R = L.rng(707), bacs = [], mols = [];
    const kinds = ['rodFlag', 'rod', 'diplo', 'rod', 'rodFlag', 'chain', 'rod', 'diplo', 'rodFlag', 'rod', 'diplo'];
    const spots = [[-1.45, 0.75], [0.0, 0.45], [1.45, 0.7], [-0.85, -0.35], [0.75, -0.25], [1.9, -0.6], [-1.95, -0.6], [-0.3, -1.25], [1.0, -1.35], [-1.25, -1.75], [0.25, 1.35]];
    const ord = spots.map((s, i) => i); for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    spots.forEach(([x, y], i) => bacs.push({ kind: kinds[i], b: { x: x + (R() - 0.5) * 0.2, y: y + (R() - 0.5) * 0.2, z: (R() - 0.5) * 0.9 }, s: 1.1 + R() * 0.2, ang: R() * 6, ph: R() * 6, br: makeBrown(R), kb: 0.2 + 0.62 * ord.indexOf(i) / (spots.length - 1) + (R() - 0.5) * 0.03 }));
    for (let i = 0; i < 42; i++) {
      const a = R() * Math.PI * 2, st = { x: Math.cos(a) * 3.9, y: Math.sin(a) * 3.9, z: (R() - 0.5) * 1.6 };
      mols.push({ st, en: inDisc(R, 2.9, -1.4, 1.0), ke: -0.12 + R() * 0.45, br: makeBrown(R), rot: [R() * 6, R() * 6, R() * 6], rs: [(R() - 0.5) * 2, (R() - 0.5) * 2, (R() - 0.5) * 2], hocl: R() < 0.6, tgt: -1 });
    }
    // dois "atacantes" por bactéria (consumidos na reação); o resto fica livre = cloro residual
    bacs.forEach((b, bi) => { for (let j = 0; j < 2; j++) { const m = mols[bi * 2 + j]; m.tgt = bi; m.side = j ? 1 : -1; } });
    const free = mols.filter((m) => m.tgt < 0);
    const resid = free.reduce((a, m) => (Math.hypot(m.en.x - 0.9, m.en.y + 1.0) < Math.hypot(a.en.x - 0.9, a.en.y + 1.0) ? m : a));
    const early = free.reduce((a, m) => (m.ke < a.ke && Math.hypot(m.en.x, m.en.y + 1.2) < 1.6 ? m : a), free[0]);
    const bok = []; for (let i = 0; i < 34; i++) bok.push({ p: inDisc(R, 7, -10, -4), s: 0.4 + R() * 1.1, c: pick(R, [C('#2a6a86'), C('#1f5a70'), C('#2f7a5e')]), br: makeBrown(R) });
    return { bacs, mols, resid, early, bok };
  })();
  function modeChlorine(k, tau, t) {
    const D = dur.chlorine;
    for (const b of chl.bacs) {
      const dead = sstep(b.kb, b.kb + 0.07, k), tb = Math.min(tau, b.kb * D);   // ao ser inativada, para de nadar
      b.br(t + b.ph, 0.045 * (1 - 0.6 * dead), tmp);
      const hd = b.ang + 0.3 * Math.sin(0.6 * Math.min(t, t - tau + tb) + b.ph);
      const p = { x: b.b.x + tmp.x + Math.cos(hd) * 0.1 * (tb + 0.4), y: b.b.y + tmp.y + Math.sin(hd) * 0.1 * (tb + 0.4), z: b.b.z + tmp.z }; b.cur = p;
      cTmp.copy(COL.bact).lerp(COL.dead, dead);
      bact(b.kind, p, hd + 0.25 * Math.sin(5 * t + b.ph) * (1 - dead) + 0.4 * dead, 0.3 * Math.sin(0.7 * t + b.ph) * (1 - dead) + 0.5 * dead, b.s, cTmp, dead);
    }
    for (const m of chl.mols) {
      const u = prog(k, m.ke, m.ke + 0.32); if (u <= 0) continue;
      m.br(t + m.rot[0], 0.14, tmp);
      let x = lerp(m.st.x, m.en.x, ease.out(u)) + tmp.x * u, y = lerp(m.st.y, m.en.y, ease.out(u)) + tmp.y * u, z = lerp(m.st.z, m.en.z, ease.out(u)) + tmp.z * u, s = 1;
      if (m.tgt >= 0) {
        const b = chl.bacs[m.tgt], w = ease.io(prog(k, b.kb - 0.14, b.kb)), bp = b.cur;
        x = lerp(x, bp.x + m.side * 0.2, w); y = lerp(y, bp.y + 0.12 * m.side, w); z = lerp(z, bp.z + 0.15, w);
        s = 1 - sstep(b.kb + 0.01, b.kb + 0.07, k);  // consumido na reação
        if (s < 0.02) continue;
      }
      m.cur = { x, y, z };
      (m.hocl ? P.hocl : P.ocl).add(m.cur, [m.rot[0] + m.rs[0] * t, m.rot[1] + m.rs[1] * t, m.rot[2] + m.rs[2] * t], 1.05 * s);
    }
    for (const b of chl.bok) { b.br(t, 0.25, tmp); tmp2.x = b.p.x + tmp.x; tmp2.y = b.p.y + tmp.y; tmp2.z = b.p.z; bokeh(tmp2, b.s, b.c, 0.45); }
    // relógio do tempo de contato (sem número): anel de tiques que acende com k + ponteiro
    const ck = { x: CAMPOS.x, y: CAMPOS.y + 2.0, z: CAMPOS.z - 7 }, R0 = 0.34, NT = 36, ca = sstep(0, 0.04, k);
    extra.clockBack.visible = true; extra.clockBack.position.set(ck.x, ck.y, ck.z - 0.01); extra.clockBack.scale.set(0.46 * ca, 0.46 * ca, 1);
    for (let i = 0; i < NT; i++) {
      const a = Math.PI / 2 - (i / NT) * Math.PI * 2, on = i / NT < k;
      tmp2.x = ck.x + Math.cos(a) * R0 * ca; tmp2.y = ck.y + Math.sin(a) * R0 * ca; tmp2.z = ck.z;
      P.tick.add(tmp2, [0, 0, a], [0.11 * ca, 0.034 * ca, 1], on ? COL.tickOn : COL.tickOff);
    }
    const ha = Math.PI / 2 - k * Math.PI * 2; tmp2.x = ck.x + Math.cos(ha) * 0.13 * ca; tmp2.y = ck.y + Math.sin(ha) * 0.13 * ca; tmp2.z = ck.z + 0.01;
    P.tick.add(tmp2, [0, 0, ha], [0.26 * ca, 0.04 * ca, 1], COL.white);
    tmp2.x = ck.x; tmp2.y = ck.y; P.tick.add(tmp2, [0, 0, 0.785], [0.07 * ca, 0.07 * ca, 1], COL.white);
    LB.contact.set(pulse(k, 0.03, 0.6, 0.06, 0.06), { x: 0, y: 1.3 }, null);
    LB.chlor.set(pulse(k, 0.0, 0.3, 0.06, 0.05), { x: 0.2, y: -1.9 }, chl.early.cur);
    const dead1 = chl.bacs.filter((b) => b.kb < 0.42).sort((a, b) => a.b.y - b.b.y)[0] || chl.bacs[0];
    LB.inact.set(pulse(k, 0.36, 0.7, 0.06, 0.06), { x: 0.15, y: -1.85 }, dead1.cur);
    LB.resid.set(pulse(k, 0.72, 1.0, 0.06, 0.04), { x: 0.2, y: -1.85 }, chl.resid.cur);
  }

  /* ---------- fundo/névoa por modo (cor conta a história: barrenta → mais clara → azul) ---------- */
  const BG = {
    raw: { c: '#5a5a36', e: '#0f130c', fog: '#1d2114' },
    coag: { c: '#535a38', e: '#0e120c', fog: '#1b2013' },
    floc: { c: '#4f5a3a', e: '#0e120c', fog: '#1a2014' },
    settle: { c: '#355058', e: '#0a1210', fog: '#16211e', v: true, top: '#2f5664', bot: '#2a2416', fn: (k, U) => { U.uTop.value.set('#3a5a4a').lerp(new THREE.Color('#2f6c82'), sstep(0.15, 1, k)); } },
    clear: { c: '#2a6c86', e: '#07161e', fog: '#0f2a36' },
    filter: { c: '#1f4c5c', e: '#050d12', fog: '#0b1c24' },
    chlorine: { c: '#256a88', e: '#06141c', fog: '#0e2834' }
  };
  void smoothNoise;
  return { raw: modeRaw, coag: modeCoag, floc: modeFloc, settle: modeSettle, clear: modeClear, filter: modeFilter, chlorine: modeChlorine, BG };
}
