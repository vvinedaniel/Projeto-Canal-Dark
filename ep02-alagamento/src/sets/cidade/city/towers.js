// Prédios (Lo.TOWERS) com construção animada andar por andar — tapume e fundação → pilares crescendo e laje de cada
// pavimento (núcleo de elevador sempre um andar à frente) → fechamento da fachada com faixas de janelas → cobertura
// (platibanda, casa de máquinas, caixas d'água, antena). Uma GRUA de torre (mastro treliçado, lança, contralança com
// contrapesos, cabine, carrinho, cabo e carga) atende os três prédios e é desmontada no fim.
export function buildTowers(ctx, K) {
  const { L, THREE, Lo } = ctx, { G, TM, Merge, vmat, Revealer } = K;
  const root = new THREE.Group();
  const concM = L.mat('#bcc1c5', { roughness: 0.85 }), coreM = L.mat('#aab0b5', { roughness: 0.9 });
  const facM = vmat({ roughness: 0.5, metalness: 0.15 }), roofM = vmat({ roughness: 0.7 });
  const towers = Lo.TOWERS.map((T, i) => {
    const nf = Math.round(T.h / 3), fh = T.h / nf;
    let gmax = -1e9, gmin = 1e9;
    for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) { const g = Lo.G(T.x - T.w / 2 + (T.w * a) / 4, T.z - T.d / 2 + (T.d * b) / 4); gmax = Math.max(gmax, g); gmin = Math.min(gmin, g); }
    return { ...T, i, nf, fh, y0: gmax + 0.15, gmin, a: i * 0.17 };
  });
  const DT = 0.64;

  towers.forEach((T) => {
    const g = new THREE.Group(); g.position.set(T.x, T.y0, T.z); root.add(g); T.g = g;
    const w = T.w, d = T.d, fh = T.fh;
    // tapume do canteiro (painéis com faixa da construtora)
    { const m = new Merge(), e = 1.4, pts = [[-w / 2 - e, -d / 2 - e], [w / 2 + e, -d / 2 - e], [w / 2 + e, d / 2 + e], [-w / 2 - e, d / 2 + e]];
      for (let i = 0; i < 4; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % 4], len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 2.2);
        for (let j = 0; j < n; j++) { const u = (j + 0.5) / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u, gy = Lo.G(T.x + x, T.z + z) - T.y0, ang = Math.atan2(-(bz - az), bx - ax);
          m.add(G.box(len / n - 0.04, 2.2, 0.05), j % 2 ? '#3f7a5a' : '#46876a', TM(x, gy + 1.1, z, 0, ang, 0)).add(G.box(len / n - 0.04, 0.3, 0.06), '#f2c230', TM(x, gy + 1.7, z, 0, ang, 0)); } }
      T.fence = m.mesh(vmat({ roughness: 0.8 })); g.add(T.fence); }
    // fundação / embasamento (do chão mais baixo até o térreo)
    { const hb = T.y0 - T.gmin + 0.3, geo = new THREE.BoxGeometry(w + 0.6, hb, d + 0.6); geo.translate(0, -hb / 2, 0); T.base = L.mesh(geo, concM); g.add(T.base); T.baseH = hb; }
    // estrutura: por andar, pilares (malha) e laje
    const cols = [], xs = w > 5 ? [-w / 2 + 0.3, 0, w / 2 - 0.3] : [-w / 2 + 0.3, w / 2 - 0.3], zs = [-d / 2 + 0.3, 0, d / 2 - 0.3];
    T.floors = [];
    for (let f = 0; f < T.nf; f++) {
      const fg = new THREE.Group(); fg.position.y = f * fh; g.add(fg);
      const cm = new Merge(); xs.forEach((x) => zs.forEach((z) => cm.add(G.box(0.4, fh - 0.25, 0.4), '#c7cbce', TM(x, (fh - 0.25) / 2, z))));
      const colMesh = L.mesh(cm.geo(), vmat({ roughness: 0.85 })); fg.add(colMesh);
      const slab = L.mesh(new THREE.BoxGeometry(w + 0.4, 0.25, d + 0.4), concM, 0, fh - 0.125, 0); fg.add(slab);
      // escoras e fôrmas sob a laje (aparecem enquanto o andar é concretado)
      const sm = new Merge(); for (let x = -w / 2 + 0.8; x < w / 2; x += 1.2) for (let z = -d / 2 + 0.8; z < d / 2; z += 1.4) sm.add(G.cyl(0.04, 0.04, fh - 0.3, 5), '#d99a3a', TM(x, (fh - 0.3) / 2, z));
      sm.add(G.box(w + 0.3, 0.05, d + 0.3), '#b5713a', TM(0, fh - 0.28, 0));
      const shore = L.mesh(sm.geo(), vmat({ roughness: 0.8 })); fg.add(shore);
      // fachada do andar: peitoril, faixa de janelas com montantes, viga; sacadas na frente
      const fm = new Merge(), col = T.color, glass = '#35556e', mull = '#d8dde1';
      const side = (len, place) => { // place(u, y, depthOffset) -> matriz
        fm.add(G.box(len, 1.0, 0.18), col, place(0, 0.5, 0)).add(G.box(len, fh - 2.45, 0.18), col, place(0, 2.45 + (fh - 2.45) / 2, 0));
        fm.add(G.box(len - 0.2, 1.45, 0.06), glass, place(0, 1.72, -0.02));
        const nm = Math.max(2, Math.round(len / 1.3)); for (let i = 0; i <= nm; i++) fm.add(G.box(0.07, 1.45, 0.12), mull, place(-len / 2 + 0.1 + ((len - 0.2) * i) / nm, 1.72, 0.02));
        fm.add(G.box(len, 0.06, 0.24), '#eef0f2', place(0, 1.0, 0.04));
      };
      side(w + 0.2, (u, y, o) => TM(u, y, d / 2 + 0.1 + o)); side(w + 0.2, (u, y, o) => TM(u, y, -d / 2 - 0.1 - o, 0, Math.PI, 0));
      side(d, (u, y, o) => TM(w / 2 + 0.1 + o, y, u, 0, Math.PI / 2, 0)); side(d, (u, y, o) => TM(-w / 2 - 0.1 - o, y, u, 0, -Math.PI / 2, 0));
      [-1, 1].forEach((s) => fm.add(G.box(0.35, fh, 0.35), T.color === '#cfd9e2' ? '#9fb2c3' : '#c9b79c', TM(s * (w / 2 + 0.1), fh / 2, d / 2 + 0.1)).add(G.box(0.35, fh, 0.35), '#b7aa96', TM(s * (w / 2 + 0.1), fh / 2, -d / 2 - 0.1)));
      if (T.i !== 1 && f > 0) { fm.add(G.box(w * 0.55, 0.15, 1.0), '#e9ebec', TM(-w * 0.15, 0.05, d / 2 + 0.6)); fm.add(G.box(w * 0.55, 1.0, 0.05), '#7fb2cf', TM(-w * 0.15, 0.6, d / 2 + 1.08)); fm.add(G.box(w * 0.55, 0.05, 0.08), '#c8ced3', TM(-w * 0.15, 1.12, d / 2 + 1.08)); }
      const facade = L.mesh(fm.geo(), facM); fg.add(facade);
      T.floors.push({ fg, colMesh, slab, shore, facade });
    }
    // núcleo (elevador/escada): cresce à frente da estrutura
    { const geo = new THREE.BoxGeometry(1.8, 1, 2.0); geo.translate(0, 0.5, 0); T.core = L.mesh(geo, coreM, 0, 0, -d / 2 + 1.3); g.add(T.core); }
    // cobertura
    { const m = new Merge(), y = T.nf * fh;
      [[0, d / 2 + 0.15, w + 0.5, 0.15], [0, -d / 2 - 0.15, w + 0.5, 0.15]].forEach(([x, z, a, b]) => m.add(G.box(a, 1.0, b), T.color, TM(x, y + 0.5, z)));
      [[w / 2 + 0.15, 0], [-w / 2 - 0.15, 0]].forEach(([x, z]) => m.add(G.box(0.15, 1.0, d + 0.5), T.color, TM(x, y + 0.5, z)));
      m.add(G.box(w + 0.3, 0.06, d + 0.3), '#8f969c', TM(0, y + 0.03, 0));
      m.add(G.box(2.2, 2.4, 2.4), '#dfe3e6', TM(0, y + 1.2, -d / 2 + 1.4)).add(G.box(2.4, 0.12, 2.6), '#9aa3aa', TM(0, y + 2.45, -d / 2 + 1.4));
      [-0.7, 0.7].forEach((x) => m.add(G.cyl(0.55, 0.55, 1.2, 16), '#2c7fc4', TM(x + w / 4, y + 0.7, d / 4)));
      m.add(G.cyl(0.04, 0.04, 3.5, 6), '#c8ced3', TM(-w / 2 + 0.6, y + 1.75, -d / 2 + 0.6)).add(G.box(0.6, 0.5, 0.5), '#9aa3aa', TM(w / 2 - 0.7, y + 0.35, -d / 2 + 0.7));
      T.roof = L.mesh(m.geo(), roofM); g.add(T.roof); }
    L.shadows(g);
  });

  /* ---------- grua ---------- */
  const CR = { x: -13.75, z: -22.6 }, gy = Lo.G(CR.x, CR.z) - 0.2, MAST = 30, SEC = 2, JIB = 15, CJ = 5.5, Yc = '#f2b51c';
  const crane = new THREE.Group(); crane.position.set(CR.x, gy, CR.z); root.add(crane);
  const cm = vmat({ roughness: 0.5, metalness: 0.2 });
  // base de concreto com patas
  { const m = new Merge(); m.add(G.box(3.2, 1.0, 3.2), '#b3b8bc', TM(0, 0.3, 0)); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => m.add(G.box(0.3, 0.6, 0.3), Yc, TM(a * 0.75, 1.0, b * 0.75))); crane.add(m.mesh(cm)); }
  // mastro treliçado em seções (revelado com drawRange)
  const mastPieces = [];
  for (let s = 0; s < MAST / SEC; s++) {
    const m = new Merge(), y0 = 0.8 + s * SEC, a = 0.8;
    [[-a, -a], [a, -a], [a, a], [-a, a]].forEach(([x, z]) => m.rod([x, y0, z], [x, y0 + SEC, z], 0.07, Yc, 6));
    for (let i = 0; i < 4; i++) { const c = [[-a, -a], [a, -a], [a, a], [-a, a]], [x0, z0] = c[i], [x1, z1] = c[(i + 1) % 4]; m.rod([x0, y0, z0], [x1, y0, z1], 0.045, Yc, 5).rod([x0, y0, z0], [x1, y0 + SEC, z1], 0.04, Yc, 5); }
    mastPieces.push({ s, geo: m.geo(), color: '#ffffff' });
  }
  const mast = new Revealer(mastPieces, cm); crane.add(mast.mesh);
  const top = new THREE.Group(); crane.add(top);         // sobe com o mastro
  const slew = new THREE.Group(); top.add(slew);           // gira
  { const m = new Merge();
    m.add(G.cyl(1.1, 1.1, 0.5, 20), '#3d464e', TM(0, 0.25, 0)).add(G.box(2.0, 0.6, 2.0), Yc, TM(0, 0.8, 0));
    // cabine
    m.add(G.rbox(1.4, 1.5, 1.3, 0.06), '#eef1f3', TM(0.4, 1.5, 1.4)).add(G.box(0.05, 0.9, 1.0), '#35556e', TM(1.12, 1.6, 1.4)).add(G.box(1.2, 0.9, 0.05), '#35556e', TM(0.4, 1.6, 2.06));
    // torre de topo (ápice)
    const ap = 6; [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]].forEach(([x, z]) => m.rod([x, 1.1, z], [0, 1.1 + ap, 0], 0.08, Yc, 6));
    // lança (treliça triangular) para +x
    const jb = 1.1, jh = 1.3;
    for (let x = 1; x < JIB; x += 1.5) { const x1 = Math.min(JIB, x + 1.5); m.rod([x, jb, -0.55], [x1, jb, -0.55], 0.05, Yc, 5).rod([x, jb, 0.55], [x1, jb, 0.55], 0.05, Yc, 5).rod([x, jb + jh, 0], [x1, jb + jh, 0], 0.05, Yc, 5);
      m.rod([x, jb, -0.55], [x1, jb + jh, 0], 0.035, Yc, 4).rod([x, jb, 0.55], [x1, jb + jh, 0], 0.035, Yc, 4).rod([x, jb, -0.55], [x, jb, 0.55], 0.035, Yc, 4); }
    m.rod([1, jb + jh, 0], [0.9, jb, -0.55], 0.05, Yc, 5).rod([1, jb + jh, 0], [0.9, jb, 0.55], 0.05, Yc, 5);
    // contralança com passarela, guincho e contrapesos
    m.add(G.box(CJ, 0.25, 1.2), Yc, TM(-CJ / 2 - 0.6, jb + 0.1, 0)).add(G.box(CJ, 0.04, 1.4), '#7f8a94', TM(-CJ / 2 - 0.6, jb + 0.25, 0));
    for (let i = 0; i < 4; i++) m.add(G.box(0.45, 1.7, 1.6), '#a9afb4', TM(-CJ - 0.2 + i * 0.47, jb - 0.7, 0));
    m.add(G.box(1.2, 0.8, 1.0), '#3d464e', TM(-2.2, jb + 0.65, 0)).add(G.cyl(0.35, 0.35, 0.9, 14), '#59636c', TM(-1.2, jb + 0.6, 0, Math.PI / 2));
    // tirantes do ápice
    m.rod([0, 1.1 + ap, 0], [JIB * 0.62, jb + jh, 0], 0.04, '#59636c', 4).rod([0, 1.1 + ap, 0], [-CJ - 0.4, jb + 0.2, 0], 0.04, '#59636c', 4);
    m.add(G.cyl(0.12, 0.12, 0.2, 8), '#ff3b30', TM(0, 1.25 + ap, 0));
    slew.add(m.mesh(cm)); }
  const trolley = new THREE.Group(); slew.add(trolley);
  trolley.add(L.mesh(new THREE.BoxGeometry(0.9, 0.35, 1.3), L.mat(Yc, { roughness: 0.5 }), 0, 0.9, 0));
  const cableM = L.mat('#2b3036', { roughness: 0.6 });
  const cable = new THREE.Group(); trolley.add(cable);
  [-0.2, 0.2].forEach((z) => { const c = L.mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 4), cableM, 0, 0, z, { cast: false }); c.geometry.translate(0, -0.5, 0); cable.add(c); });
  const hook = new THREE.Group(); trolley.add(hook);
  { const m = new Merge(); m.add(G.rbox(0.5, 0.6, 0.45, 0.05), Yc, TM(0, 0.3, 0)).add(G.torus(0.14, 0.04, 6, 12, Math.PI * 1.4), '#3d464e', TM(0, -0.12, 0));
    hook.add(m.mesh(cm)); }
  const load = new THREE.Group(); hook.add(load);
  { const m = new Merge(); for (let i = 0; i < 6; i++) m.add(G.box(3.2, 0.14, 0.14), '#8f969c', TM(0, -1.3 - (i % 2) * 0.15, -0.3 + (i % 3) * 0.3)); // feixe de vigas
    m.add(G.box(1.6, 0.6, 1.0), '#c4643c', TM(0, -1.6, 0.9)).add(G.box(1.7, 0.08, 1.1), '#b98a5a', TM(0, -1.93, 0.9));                          // palete de blocos
    [[-1.2, -0.2], [1.2, -0.2], [-1.2, 0.2], [1.2, 0.2]].forEach(([x, z]) => m.rod([0, -0.2, 0], [x * 0.9, -1.2, z], 0.02, '#2b3036', 4));
    load.add(m.mesh(vmat({ roughness: 0.7 }))); }
  L.shadows(crane); cable.traverse((o) => { o.castShadow = false; });
  const pick = { x: CR.x + 4.2, z: CR.z + 0.3 }, pickY = Lo.G(pick.x, pick.z) + 0.2;
  // depósito de material ao pé da grua
  { const m = new Merge(); for (let i = 0; i < 3; i++) m.add(G.box(1.6, 0.6, 1.0), '#c4643c', TM(pick.x - 1.3 + i * 0.2, pickY + 0.3 + (i % 2) * 0.6 - 0.2, pick.z - 1.5 + i * 0.1)); for (let i = 0; i < 5; i++) m.add(G.box(3.2, 0.14, 0.14), '#8f969c', TM(pick.x + 0.8, pickY - 0.1 + i * 0.15, pick.z + 1.6));
    const st = m.mesh(vmat({ roughness: 0.8 })); root.add(st); L.shadows(st); crane.userData.stock = st; }

  const mastTop = (k) => 0.8 + MAST * k;
  function crPolar(x, z) { const dx = x - CR.x, dz = z - CR.z; return { ang: Math.atan2(-dz, dx), r: Math.hypot(dx, dz) }; }
  const lerpAng = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };

  function update(t, S) {
    const kb = S.build.towers;
    // prédios
    towers.forEach((T) => {
      const k = L.prog(kb, T.a, T.a + DT), any = kb > 0.0005 || false;
      T.g.visible = k > 0.0005;
      if (!T.g.visible) return;
      const fk = L.prog(k, 0, 0.05) * (1 - L.prog(k, 0.93, 1)); T.fence.visible = fk > 0.002; T.fence.position.y = -2.4 * (1 - L.ease.out(fk));
      const bk = L.prog(k, 0.02, 0.09); T.base.visible = bk > 0.002; T.base.scale.y = Math.max(1e-3, bk);
      const ks = L.prog(k, 0.08, 0.74) * T.nf, kf = L.prog(k, 0.3, 0.94) * T.nf;
      T.floors.forEach((F, f) => {
        const c = L.clamp01((ks - f) / 0.6), s = L.clamp01((ks - f - 0.6) / 0.4), fa = L.clamp01(kf - f);
        F.colMesh.visible = c > 0.002; F.colMesh.scale.y = Math.max(1e-3, c);
        F.slab.visible = s > 0.002; F.slab.position.y = T.fh - 0.125 + 1.2 * (1 - L.ease.out(s));
        F.shore.visible = c > 0.3 && fa < 0.5;
        F.facade.visible = fa > 0.002; F.facade.scale.y = Math.max(1e-3, L.ease.out(fa));
      });
      const ch = Math.min(T.nf * T.fh + 1.0, (ks + 1.2) * T.fh) * L.clamp01(ks * 3);
      T.core.visible = ch > 0.05; T.core.scale.y = Math.max(1e-3, ch);
      const rk = L.prog(k, 0.92, 1); T.roof.visible = rk > 0.002; T.roof.position.y = 2.5 * (1 - L.ease.out(rk));
      void any;
    });
    // grua: sobe (0–0.06), trabalha, desce e some (0.94–1)
    const up = L.prog(kb, 0, 0.06) * (1 - L.prog(kb, 0.93, 1));
    crane.visible = up > 0.001; crane.userData.stock.visible = crane.visible;
    if (!crane.visible) return;
    mast.set(up * (MAST / SEC) - 0.001); top.position.y = mastTop(up) - 0.0;
    // ciclos de içamento: pega no depósito, gira até o prédio ativo, desce a carga no último andar
    const N = 9, cyc = L.prog(kb, 0.06, 0.92) * N, c = Math.min(N - 1, Math.floor(cyc)), ph = cyc - c, T = towers[[0, 2, 1][c % 3]];
    const kT = L.prog(kb, T.a, T.a + DT), topY = T.y0 + Math.min(T.nf, L.prog(kT, 0.08, 0.74) * T.nf + 0.5) * T.fh;
    const P0 = crPolar(pick.x, pick.z), P1 = crPolar(T.x + 0.5, T.z + 0.4);
    const jibY = gy + mastTop(up) + 1.1;
    let ang, r, hy, carry;
    const e = (a, b) => L.ease.io(L.prog(ph, a, b));
    if (ph < 0.22) { ang = P0.ang; r = P0.r; hy = L.lerp(jibY - 3, pickY + 2.1, e(0, 0.22)); carry = 0; }
    else if (ph < 0.55) { const k = e(0.22, 0.55); ang = lerpAng(P0.ang, P1.ang, k); r = L.lerp(P0.r, P1.r, k); hy = L.lerp(pickY + 2.1, jibY - 3.5, L.ease.out(Math.min(1, k * 2))); carry = 1; }
    else if (ph < 0.78) { ang = P1.ang; r = P1.r; hy = L.lerp(jibY - 3.5, topY + 2.3, e(0.55, 0.78)); carry = 1; }
    else { const k = e(0.78, 1); ang = lerpAng(P1.ang, P0.ang, k); r = L.lerp(P1.r, P0.r, k); hy = L.lerp(topY + 2.3, jibY - 3, L.ease.out(Math.min(1, k * 2))); carry = 0; }
    if (up < 0.999) { ang = P0.ang; r = 4; hy = jibY - 3; carry = 0; }
    slew.rotation.y = ang; trolley.position.x = Math.max(1.5, Math.min(JIB - 0.5, r));
    const drop = Math.max(0.5, jibY - hy); hook.position.y = 1.0 - drop; cable.children.forEach((cc) => { cc.position.y = 0.8; cc.scale.y = drop - 0.2; });
    load.visible = carry > 0.5;
  }
  return { root, update, towers };
}
