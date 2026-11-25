// Carros estacionados (Lo.CARS + vagas do estacionamento + um na rua B). Cada um chega dirigindo à sua vaga logo
// depois que o rolo compactador passa por ali (derivado de S.build.asphalt); rodas giram com a distância.
// Exporta shared.cars = [{ id, x, z, rot, obj }].
export function buildCars(ctx, K) {
  const { L, THREE, Lo, shared, streets, H } = ctx;
  const root = new THREE.Group();
  const PK = Lo.PARKING;
  const list = [
    ...Lo.CARS.map((c, i) => ({ ...c, type: i % 2 ? 'hatch' : 'sedan', st: c.z > 12 ? 'A' : 'B' })),
    { id: 'c5', x: 12.0, z: -2.3, rot: Math.PI, color: '#5a6470', type: 'hatch', st: 'B' },
    { id: 'p1', x: PK.x0 + 2.4, z: PK.z0 + 0.4 + 3.75, rot: 0, color: '#2f9e6a', type: 'hatch', park: true },
    { id: 'p2', x: PK.x0 + 2.4, z: PK.z0 + 0.4 + 6.25, rot: 0, color: '#8a8f96', type: 'sedan', park: true },
    { id: 'p3', x: PK.x0 + 2.4, z: PK.z0 + 0.4 + 8.75, rot: 0, color: '#c9c2b0', type: 'hatch', park: true }
  ];
  const cars = list.map((c) => {
    const { group, wheels } = K.car(c.color, c.type), g = new THREE.Group(); g.add(group); root.add(g); L.shadows(g);
    // janela de chegada: logo após o rolo passar (ruas) ou no fim da pavimentação (estacionamento)
    let a = c.park ? 0.82 : streets.rollerAt(c.st, c.x) + 0.02; a = Math.min(a, 0.9);
    return { ...c, g, wheels, a, b: Math.min(1, a + 0.1), hx: Math.cos(c.rot), hz: -Math.sin(c.rot) };
  });
  const live = cars.map((c) => ({ id: c.id, x: c.x, z: c.z, rot: c.rot, obj: c.g, visible: true })); shared.cars = live;
  const _e = new THREE.Euler();
  function update(t, S) {
    const ka = S.build.asphalt;
    cars.forEach((c) => {
      const k = L.prog(ka, c.a, c.b); c.g.visible = k > 0.001; live[cars.indexOf(c)].visible = c.g.visible;
      if (!c.g.visible) return;
      // ruas: vem de trás no sentido da marcha; estacionamento: entra de ré a partir do corredor (+x)
      const back = c.park ? -1 : 1; let rem = 9 * (1 - L.ease.out(k)), lift = 0;
      // estacionamento: os carros saem (para o corredor) quando começa o pavimento permeável e voltam no fim, 0,1 m mais altos
      const kp = S.build.permeable;
      if (c.park && kp > 0) { const ko = L.prog(kp, 0, 0.06), kb = L.prog(kp, 0.92, 1); rem = 9 * (kb > 0 ? 1 - L.ease.out(kb) : L.ease.in(ko)); lift = kb > 0 ? 0.1 : 0; if (rem > 8.95) { c.g.visible = false; live[cars.indexOf(c)].visible = false; return; } }
      const x = c.x - back * c.hx * rem, z = c.z - back * c.hz * rem;
      const y0 = H(x - c.hx * 1.3, z - c.hz * 1.3), y1 = H(x + c.hx * 1.3, z + c.hz * 1.3);
      c.g.position.set(x, (y0 + y1) / 2 + 0.035 + lift, z); const sc = live[cars.indexOf(c)]; sc.x = x; sc.z = z; sc.rot = c.rot; sc.visible = true; _e.set(0, c.rot, Math.atan2(y1 - y0, 2.6), 'YXZ'); c.g.quaternion.setFromEuler(_e);
      c.wheels.forEach((w) => { w.rotation.z = (back * rem) / 0.33; });
    });
  }
  return { root, update };
}
