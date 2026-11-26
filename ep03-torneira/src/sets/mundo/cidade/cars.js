// Carros (modelo do Ep. 02, K.car): estacionados junto às guias e alguns andando devagar na rua de trás e na avenida.
// Movimento = função pura de t (posição ao longo da faixa, com volta); rodas giram com a distância percorrida.
export function buildCars(ctx) {
  const { L, THREE, Lo, K } = ctx;
  const root = new THREE.Group();
  const SC = Lo.STREETS.casa, SB = Lo.STREETS.back, AV = Lo.STREETS.avenida;
  const COLORS = ['#c8333a', '#2f6aa6', '#e8e6e0', '#3a4149', '#f2b51c', '#5a6470', '#2f9e6a', '#8a8f96', '#b5651d', '#d9d4c8'];
  const mk = (i) => { const { group, wheels } = K.car(COLORS[i % COLORS.length], i % 2 ? 'hatch' : 'sedan'); const g = new THREE.Group(); g.add(group); root.add(g); L.shadows(g); return { g, wheels }; };
  const _e = new THREE.Euler();
  const place = (c, x, z, yaw, dist) => {
    const hx = Math.cos(yaw), hz = -Math.sin(yaw);
    const y0 = Lo.G(x - hx * 1.3, z - hz * 1.3), y1 = Lo.G(x + hx * 1.3, z + hz * 1.3);
    c.g.position.set(x, (y0 + y1) / 2 + 0.035, z); _e.set(0, yaw, Math.atan2(y1 - y0, 2.6), 'YXZ'); c.g.quaternion.setFromEuler(_e);
    c.wheels.forEach((w) => { w.rotation.z = -dist / 0.33; });
  };
  // estacionados (nada entre x −11 e 11 na Rua da Casa: a câmera passa rente ao chão ali)
  const parked = [
    [-48, SC.z0 + 1.1, Math.PI], [-30, SC.z0 + 1.1, Math.PI], [36.5, SC.z0 + 1.1, Math.PI],
    [-54, SC.z1 - 1.1, 0], [-20, SC.z1 - 1.1, 0], [15.5, SC.z1 - 1.1, 0], [46, SC.z1 - 1.1, 0],
    [-40, SB.z0 + 1.1, Math.PI], [-12, SB.z0 + 1.1, Math.PI], [44, SB.z0 + 1.1, Math.PI],
    [-26, SB.z1 - 1.1, 0], [4, SB.z1 - 1.1, 0], [52, SB.z1 - 1.1, 0],
    [AV.x1 - 1.1, 12.5, -Math.PI / 2], [AV.x0 + 1.1, -9.0, Math.PI / 2]
  ];
  parked.forEach(([x, z, yaw], i) => { const c = mk(i + 3); place(c, x, z, yaw, 0); });
  // andando devagar (velocidade ~3–4 m/s), sempre no sentido da mão
  const moving = [
    { lane: 'x', z: SB.z0 + 2.6, a: SB.x0 + 2, b: SB.x1 - 2, dir: -1, v: 3.6, off: 12 },
    { lane: 'x', z: SB.z1 - 2.6, a: SB.x0 + 2, b: SB.x1 - 2, dir: 1, v: 3.2, off: 70 },
    { lane: 'z', x: AV.x0 + 2.6, a: -15.5, b: SC.z0 - 1, dir: -1, v: 3.0, off: 8 },
    { lane: 'z', x: AV.x1 - 2.6, a: -15.5, b: SC.z0 - 1, dir: 1, v: 2.6, off: 30 },
    { lane: 'x', z: SC.z1 - 2.7, a: 30, b: SC.x1 - 1, dir: 1, v: 3.0, off: 0 }
  ].map((m, i) => ({ ...m, c: mk(i) }));
  function update(t) {
    for (const m of moving) {
      const len = m.b - m.a, d = t * m.v + m.off, u = ((d % len) + len) % len, s = m.dir > 0 ? m.a + u : m.b - u;
      const edge = Math.min(u, len - u), sc = L.clamp01(edge / 2.5);
      m.c.g.visible = sc > 0.02; m.c.g.scale.setScalar(Math.max(0.02, sc));
      if (m.lane === 'x') place(m.c, s, m.z, m.dir > 0 ? 0 : Math.PI, d);
      else place(m.c, m.x, s, m.dir > 0 ? -Math.PI / 2 : Math.PI / 2, d);
    }
  }
  return { root, update };
}
