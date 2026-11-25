// A cava do piscinão: "bloco de solo" que preenche o buraco do terreno no retângulo da praça (topo na cota do chão)
// e é escavado por camadas (patamares) conforme a obra avança. Superfície = malha de alturas; faces do buraco =
// cortes de solo em camadas com pedras. Função pura de (ex = progresso da escavação, bf = reaterro das bordas).
export function makePit(L, K, Lo, o) {
  const { THREE } = L;
  const P = Lo.PLAZA, OUT = o.OUT, yE = o.yE, SU = o.SU, zB = o.zB;
  const top = (x, z) => Lo.G(x, z) - 0.03;
  const ss = L.sstep;
  /** nível escavado no ponto (x, z) */
  function level(x, z, ex, bf) {
    const t0 = top(x, z);
    let f = 0;
    if (z >= zB) {
      for (let k = 0; k < 4; k++) {
        const q = L.clamp01((ex - 0.2 * k) / 0.2); if (q <= 0) break;
        const zf = L.lerp(11.8, zB - 1.2, q) + 0.45 * Math.sin(1.1 * x + 2.3 * k) * Math.sin(Math.PI * q);
        f += ss(zf - 0.3, zf + 0.3, z) / 4;
      }
    } else {
      const q = L.clamp01((ex - 0.8) / 0.18), zs = L.lerp(zB + 0.5, 0.4, q) + 0.3 * Math.sin(1.3 * x) * Math.sin(Math.PI * q);
      f = q > 0 ? ss(zs - 0.3, zs + 0.3, z) : 0;
    }
    let y = t0 - (t0 - yE) * f;
    if (x > SU.x0 && x < SU.x1 && z > SU.z0 && z < SU.z1) { const s = ss(0.9, 1, ex) * Math.min(1, Math.min(x - SU.x0, SU.x1 - x, z - SU.z0, SU.z1 - z) / 0.35); y = Math.min(y, L.lerp(y, o.ySump, s)); }
    const inMargin = x < OUT.x0 || x > OUT.x1 || z < OUT.z0;
    if (inMargin && bf > 0) y = Math.max(y, L.lerp(yE, t0 - 0.02, bf));
    return y;
  }
  // estratos do solo calculados por pixel (cor pela cota do mundo): cortes nítidos em qualquer face escavada
  const grain = K.canvasTex(256, 256, (g, w, h) => { const r = L.rng(17); g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 150 + r() * 105 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2, r() * 3, 0, L.TAU); g.fill(); } });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  const U = { uC0: { value: new THREE.Color('#6b5848') }, uC1: { value: new THREE.Color('#b0835a') }, uC2: { value: new THREE.Color('#8c6446') }, uC3: { value: new THREE.Color('#563b2b') }, uSurf: { value: new THREE.Color('#7d5c3f') } };
  function strata(m) {
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float topY; varying float vTop; varying vec3 vWP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTop = topY; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTop; varying vec3 vWP; uniform vec3 uC0, uC1, uC2, uC3, uSurf;')
        .replace('#include <color_fragment>', `#include <color_fragment>
{ float b0 = -0.9 + 0.22 * sin(0.8 * vWP.x + 0.5 * vWP.z), b1 = 1.25 + 0.25 * sin(0.55 * vWP.x - 0.7 * vWP.z + 1.0), b2 = vTop - 0.62 + 0.08 * sin(1.7 * vWP.x + vWP.z);
  vec3 c = vWP.y < b0 ? uC0 : vWP.y < b1 ? uC1 : vWP.y < b2 ? uC2 : uC3;
  if (vTop - vWP.y < 0.07) c = uSurf;
  float e = min(min(abs(vWP.y - b0), abs(vWP.y - b1)), abs(vWP.y - b2)); c *= 0.8 + 0.2 * smoothstep(0.0, 0.035, e);
  c *= 0.9 + 0.1 * sin(vWP.x * 7.3 + vWP.y * 5.1) * sin(vWP.z * 6.1 - vWP.y * 3.7);
  diffuseColor.rgb *= c; }`);
    };
    m.customProgramCacheKey = () => 'strata-v1';
    return m;
  }
  const soilM = strata(L.mat(0xffffff, { map: grain, roughness: 0.97 }));
  const faceM = strata(L.mat(0xffffff, { map: grain, roughness: 0.97, side: THREE.DoubleSide }));

  /* ---- malha de alturas ---- */
  const NX = 49, NZ = 39, dx = (P.x1 - P.x0) / (NX - 1), dz = (P.z1 - P.z0) / (NZ - 1);
  const hg = new THREE.PlaneGeometry(1, 1, NX - 1, NZ - 1); // índices prontos; reescrevemos as posições
  const hp = hg.attributes.position, huv = hg.attributes.uv, htop = new THREE.Float32BufferAttribute(new Float32Array(hp.count), 1);
  hg.setAttribute('topY', htop);
  // PlaneGeometry: linha i (de cima p/ baixo em y) × coluna j; mapeamos y→z invertido para a face olhar para +y
  const gx = [], gz = [];
  for (let i = 0; i < NZ; i++) for (let j = 0; j < NX; j++) { const k = i * NX + j; gx[k] = P.x0 + j * dx; gz[k] = P.z0 + i * dz; htop.setX(k, Lo.G(gx[k], gz[k])); }
  const hm = L.mesh(hg, soilM); hm.castShadow = true; hm.receiveShadow = true; hm.frustumCulled = false;
  /* ---- faces do buraco (perímetro da praça) ---- */
  const per = [];
  const side = (ax, az, bx, bz, nx, nz) => { const n = Math.round(Math.hypot(bx - ax, bz - az) / 0.25); for (let i = 0; i < n; i++) per.push({ x: L.lerp(ax, bx, i / n), z: L.lerp(az, bz, i / n), nx, nz }); };
  // percorre no sentido que deixa a face olhando para dentro
  side(P.x0, P.z0, P.x1, P.z0, 0, 1); side(P.x1, P.z0, P.x1, P.z1, -1, 0); side(P.x1, P.z1, P.x0, P.z1, 0, -1); side(P.x0, P.z1, P.x0, P.z0, 1, 0);
  const NP = per.length, ROWS = 8, fg = new THREE.BufferGeometry();
  const fpos = new Float32Array(NP * ROWS * 3), fcol = new Float32Array(NP * ROWS), fuv = new Float32Array(NP * ROWS * 2), fidx = [];
  let u = 0; per.forEach((p, i) => { if (i) u += Math.hypot(p.x - per[i - 1].x, p.z - per[i - 1].z); p.u = u; });
  for (let i = 0; i < NP; i++) {
    const i1 = (i + 1) % NP;
    for (let r = 0; r < ROWS - 1; r++) { const a = i * ROWS + r, b = i * ROWS + r + 1, c = i1 * ROWS + r, d = i1 * ROWS + r + 1; fidx.push(a, c, b, b, c, d); }
  }
  fg.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); fg.setAttribute('topY', new THREE.BufferAttribute(fcol, 1)); fg.setAttribute('uv', new THREE.BufferAttribute(fuv, 2)); fg.setIndex(fidx);
  const fm = L.mesh(fg, faceM, 0, 0, 0, { cast: false }); fm.frustumCulled = false;
  /* ---- pedras nas faces e no fundo ---- */
  const rd = L.rng(31), NR = 150, rocks = [];
  for (let i = 0; i < NR; i++) { const p = per[Math.floor(rd() * NP)]; rocks.push({ x: p.x + p.nx * 0.03, z: p.z + p.nz * 0.03, y: L.lerp(-3.3, 4.4, rd()), s: 0.08 + rd() * 0.16, r: [rd() * 6, rd() * 6, rd() * 6], face: true }); }
  for (let i = 0; i < 70; i++) rocks.push({ x: L.lerp(P.x0 + 0.4, P.x1 - 0.4, rd()), z: L.lerp(P.z0 + 0.4, P.z1 - 0.4, rd()), s: 0.06 + rd() * 0.12, r: [rd() * 6, rd() * 6, rd() * 6], face: false });
  const rockIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), L.mat('#8d9199', { roughness: 0.9, flatShading: true }), rocks.length);
  rockIM.castShadow = true; rockIM.receiveShadow = true; rockIM.frustumCulled = false;
  rocks.forEach((q, i) => rockIM.setColorAt(i, new THREE.Color('#8d9199').offsetHSL(0.02 * (rd() - 0.5), 0, (rd() - 0.5) * 0.2)));
  const group = new THREE.Group(); group.add(hm, fm, rockIM);
  const _o = new THREE.Object3D();
  let key = '';
  function update(ex, bf) {
    const k = ex.toFixed(4) + '|' + bf.toFixed(4); if (k === key) return; key = k;
    for (let i = 0; i < hp.count; i++) {
      const x = gx[i], z = gz[i], y = level(x, z, ex, bf), t0 = top(x, z);
      hp.setXYZ(i, x, y, z); huv.setXY(i, (x + 0.7 * y) * 0.45, (z + y) * 0.45); void t0;
    }
    hp.needsUpdate = true; huv.needsUpdate = true; hg.computeVertexNormals();
    if (hg.attributes.normal.getY(0) < 0) { const ix = hg.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } hg.index.needsUpdate = true; hg.computeVertexNormals(); }
    hg.computeBoundingSphere();
    for (let i = 0; i < NP; i++) {
      const p = per[i], t1 = Lo.G(p.x, p.z) + 0.005, yb = Math.min(t1, level(p.x + p.nx * 0.001, p.z + p.nz * 0.001, ex, bf));
      for (let r = 0; r < ROWS; r++) {
        const j = (i * ROWS + r) * 3, y = L.lerp(yb, t1, r / (ROWS - 1)); fpos[j] = p.x; fpos[j + 1] = y; fpos[j + 2] = p.z; fcol[i * ROWS + r] = t1 - 0.005;
        fuv[(i * ROWS + r) * 2] = p.u * 0.45; fuv[(i * ROWS + r) * 2 + 1] = y * 0.45;
      }
    }
    fg.attributes.position.needsUpdate = true; fg.attributes.topY.needsUpdate = true; fg.attributes.uv.needsUpdate = true; fg.computeVertexNormals(); fg.computeBoundingSphere();
    rocks.forEach((q, i) => {
      let s = q.s, y = q.y;
      if (q.face) { const t1 = Lo.G(q.x, q.z); if (!(y > Math.min(t1, level(q.x, q.z, ex, bf)) + 0.12 && y < t1 - 0.35)) s = 0; }
      else { const t0 = top(q.x, q.z); y = level(q.x, q.z, ex, bf) + q.s * 0.3; if (t0 - y < 0.4) s = 0; }
      _o.position.set(q.x, y, q.z); _o.rotation.set(...q.r); _o.scale.set(s, s * 0.7, s); _o.updateMatrix(); rockIM.setMatrixAt(i, _o.matrix);
    });
    rockIM.instanceMatrix.needsUpdate = true;
  }
  update(0, 0);
  return { group, update, level, top, mats: [soilM, faceM] };
}
