// POÇOS DE VISITA: drenagem (tampa "PLUVIAL" na calçada da frente, chaminé até o teto da galeria) e esgoto
// (tampa "ESGOTO" na rua, chaminé + interligação até o coletor). Chaminés enterradas: aparecem no raio-x.
export function buildManholes(ctx, K, gal) {
  const { L, THREE, Lo, scene } = ctx, { C, ZF } = K;
  const root = L.group(scene), ZP = 25.3, ZE = 21.9;
  const shaftM = L.mat('#b3b9be', { roughness: 0.88 });
  const PLU = [-33, -25, -15, -5.2, 5.5, 12.6], ESG = [-27, -16.5, -5.8, 4.6, 12.0];
  const pv = PLU.map((x) => {
    const top = Lo.streetY(x) + Lo.STREET_A.curbH, g = L.group(root, x, 0, ZP);
    const lid = K.lid('PLUVIAL', '#3b4650'); lid.position.y = top + 0.006; g.add(lid);
    const sh = L.mesh(new THREE.CylinderGeometry(0.46, 0.46, 1, 18, 1, true).translate(0, 0.5, 0), shaftM, 0, 0, 0); sh.material.side = THREE.DoubleSide; g.add(sh);
    const cone = L.mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.35, 18, 1, true).translate(0, -0.175, 0), shaftM, 0, top - 0.04, 0); g.add(cone);
    L.shadows(g); return { x, g, sh, top };
  });
  const ev = ESG.map((x) => {
    const top = Lo.streetY(x) + 0.006, ys = Lo.SEWER.y(x), g = L.group(root, x, 0, ZE);
    const lid = K.lid('ESGOTO', '#4a3d33'); lid.position.y = top; g.add(lid);
    const h = top - 0.05 - (ys - 0.35);
    g.add(L.mesh(new THREE.CylinderGeometry(0.44, 0.44, h, 18, 1, true), L.mat('#b9a79a', { roughness: 0.88, side: THREE.DoubleSide }), 0, ys - 0.35 + h / 2, 0));
    g.add(L.cyl(0.5, 0.5, 0.15, shaftM, 0, ys - 0.42, 0, 18));
    const stub = L.mesh(new THREE.CylinderGeometry(0.15, 0.15, ZF - 0.3 - ZE, 12), C.pvcTube, 0, ys, (ZF - 0.3 - ZE) / 2); stub.rotation.x = Math.PI / 2; g.add(stub);
    L.shadows(g); return { x, g };
  });
  return {
    update(t, S) {
      const gb = S.build.gallery, sb = S.build.sewer;
      pv.forEach((p, i) => {
        const e = K.sub(gb, 0.84 + 0.02 * i, 0.9 + 0.02 * i); p.g.visible = e > 0;
        p.g.position.y = 0.8 * (1 - L.ease.out(e));
        const y0 = gal.roofOut(p.x); p.sh.position.y = y0; p.sh.scale.y = Math.max(0.01, p.top - 0.38 - y0);
      });
      ev.forEach((p, i) => { const e = K.sub(sb, 0.6 + 0.05 * i, 0.68 + 0.05 * i); p.g.visible = e > 0; p.g.position.y = 0.8 * (1 - L.ease.out(e)); });
    }
  };
}
