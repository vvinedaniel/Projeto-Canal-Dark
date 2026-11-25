// SÓ PARA TESTE do módulo água sem os outros módulos (?mods=water): chão, ruas, casas e carros grosseiros.
// Não é carregado no filme (water.js só usa quando 'terrain' não está na lista ?mods).
export function makeProxy(ctx, want = { ground: true, city: true }) {
  const { L, THREE, scene, Lo } = ctx;
  const root = new THREE.Group(); scene.add(root);
  function ground(fn, colorFn) {
    const d = 0.5, nx = Math.round((Lo.X1 - Lo.X0) / d), nz = Math.round((Lo.ZF - Lo.Z0) / d), pos = [], col = [], idx = [], c = new THREE.Color();
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = Lo.X0 + i * d, z = Lo.Z0 + j * d; pos.push(x, fn(x, z), z); c.set(colorFn(x, z)); col.push(c.r, c.g, c.b); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, cc = a + nx + 1, e = cc + 1; idx.push(a, cc, b, b, cc, e); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = L.mesh(g, L.mat(0xffffff, { vertexColors: true, roughness: 0.9 })); root.add(m); return m;
  }
  const A = Lo.STREET_A, B = Lo.STREET_B, C = Lo.STREET_C;
  const inS = (x, z) => (x >= A.x0 && x <= A.x1 && z >= A.z0 && z <= A.z1) || (x >= B.x0 && x <= B.x1 && z >= B.z0 && z <= B.z1) || (x >= C.x0 && x <= C.x1 && z >= C.z0 && z <= C.z1);
  const walk = (x, z) => (x >= A.x0 && x <= A.x1 && ((z >= A.walkFront[0]) || (z >= A.walkBack[0] && z <= A.walkBack[1]))) || (x >= B.x0 && x <= B.x1 && ((z >= B.walkFront[0] && z <= B.walkFront[1]) || (z >= B.walkBack[0] && z <= B.walkBack[1])));
  const urbanY = (x, z) => Lo.G(x, z) + (walk(x, z) ? 0.15 : 0) + (x > Lo.RIVER.x0 && x < Lo.RIVER.x1 ? 0 : 0);
  const urb = ground(urbanY, (x, z) => (inS(x, z) ? '#3a4049' : walk(x, z) ? '#d9d3c7' : x > 26 && x < 39.5 ? '#6b5a44' : '#7aa05a'));
  const nat = ground((x, z) => Lo.Gnat(x, z), (x, z) => (Lo.creekCut(x, z) > 0.05 ? '#7a6a52' : x > 26 && x < 39.5 ? '#6b5a44' : '#5f9a44'));
  const houses = L.group(root);
  Lo.HOUSES.forEach((h) => {
    const y = Lo.G(h.x, (h.z0 + h.z1) / 2), H = 0.3 + h.floors * 2.9, d = h.z1 - h.z0;
    if (h.cutaway) {
      // casa em corte: piso + 3 paredes (a da frente aberta) para testar a água dentro
      houses.add(L.box(h.w, 0.3, d, L.mat('#c9c0b0'), h.x, y + 0.15, (h.z0 + h.z1) / 2));
      houses.add(L.box(h.w, H, 0.2, L.mat(h.wall), h.x, y + H / 2, h.z0 + 0.1));
      houses.add(L.box(0.2, H, d, L.mat(h.wall), h.x - h.w / 2 + 0.1, y + H / 2, (h.z0 + h.z1) / 2));
      houses.add(L.box(0.2, H, d, L.mat(h.wall), h.x + h.w / 2 - 0.1, y + H / 2, (h.z0 + h.z1) / 2));
      houses.add(L.box(h.w * 0.4, H, 0.2, L.mat(h.wall), h.x - h.w * 0.3, y + H / 2, h.z1 - 0.1));
    } else houses.add(L.box(h.w, H, d, L.mat(h.wall), h.x, y + H / 2, (h.z0 + h.z1) / 2));
    const r = L.box(h.w + 0.4, 1.0, d + 0.4, L.mat(h.roof), h.x, y + H + 0.5, (h.z0 + h.z1) / 2); houses.add(r);
  });
  Lo.TOWERS.forEach((t) => houses.add(L.box(t.w, t.h, t.d, L.mat(t.color), t.x, Lo.G(t.x, t.z) + t.h / 2, t.z)));
  const cars = L.group(root);
  Lo.CARS.forEach((c) => {
    const y = Lo.G(c.x, c.z), g = L.group(cars, c.x, y, c.z); g.rotation.y = c.rot;
    g.add(L.rbox(4.2, 0.8, 1.75, 0.15, L.glossy(c.color), 0, 0.65, 0), L.rbox(2.2, 0.6, 1.6, 0.15, L.glass('#203040', 0.9), -0.2, 1.3, 0));
    for (const [wx, wz] of [[-1.35, 0.8], [1.35, 0.8], [-1.35, -0.8], [1.35, -0.8]]) { const w = L.cyl(0.33, 0.33, 0.22, L.mat('#111'), wx, 0.33, wz); w.rotation.x = Math.PI / 2; g.add(w); }
  });
  // face de corte da frente (solo)
  const fpts = []; for (let x = Lo.X0; x <= Lo.X1; x += 0.5) fpts.push([x, urbanY(x, Lo.ZF - 0.01)]);
  const face = L.extrude([[Lo.X0, Lo.YB], ...fpts, [Lo.X1, Lo.YB]], 0.1, L.mat('#8f6846', { roughness: 1 })); face.position.z = Lo.ZF - 0.1; root.add(face);
  return {
    update(t, S) { const u = S.build.walks > 0.5; urb.visible = want.ground && u; nat.visible = want.ground && !u; face.visible = want.ground; houses.visible = want.city && S.build.houses > 0.5; cars.visible = want.city && S.build.asphalt > 0.9; }
  };
}
