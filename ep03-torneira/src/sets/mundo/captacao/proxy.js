// SÓ PARA TESTE ISOLADO (?mods=...,cproxy): chão de Lo.G e lago provisórios na região da captação.
// No filme o terreno e a represa são do módulo terreno.
export function proxy(ctx, withGround) {
  const { L, THREE, Lo } = ctx;
  const g = new THREE.Group();
  if (withGround) {
    const geo = new THREE.PlaneGeometry(70, 70, 140, 140); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, cx = 10, cz = -95;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, z = p.getZ(i) + cz; p.setXYZ(i, x, Lo.G(x, z), z); }
    geo.computeVertexNormals();
    const m = L.mesh(geo, L.mat('#6f9a4c', { roughness: 0.95 }), 0, 0, 0, { cast: false }); m.receiveShadow = true; m.renderOrder = 2; g.add(m);
  }
  const lake = L.mesh(new THREE.PlaneGeometry(70, 43.4).rotateX(-Math.PI / 2), L.water(Lo.WATER.lake, 0.82), 4, Lo.LAKE.level, -120.65, { cast: false });
  g.add(lake);
  return g;
}
