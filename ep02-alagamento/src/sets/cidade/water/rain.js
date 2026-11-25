// CHUVA: estrias instanciadas caindo de verdade (posição = função de t), num volume preso ao mundo que acompanha a
// câmera (3 camadas: perto, meio, longe); coroas de respingo e anéis na água; véu de chuva ao longe na tempestade.
// Tudo é calculado no shader a partir de uniforms (t, câmera, intensidade) — nada de estado entre quadros.
// As malhas usam posição "falsa" em y = −2000 (o shader recalcula), assim a passagem de normais da oclusão ambiente
// (que troca o material) não desenha nada na cena.
import { HM_GLSL, hmUniforms } from './hmap.js';

export function makeRain(ctx, hm) {
  const { L, THREE, scene, Lo } = ctx;
  const root = new THREE.Group(); root.name = 'water.rain'; scene.add(root);
  const rd = L.rng(4242);
  const col = (c) => new THREE.Color(c);
  const fr = (x) => x - Math.floor(x);
  // números aleatórios por instância, ordenados pelo "seletor" de densidade: com chuva fraca só as primeiras
  // instâncias são desenhadas (instanceCount), as outras nem passam pelo shader
  function randAttr(n) {
    const rows = []; for (let i = 0; i < n; i++) rows.push([rd(), rd(), rd(), rd()]);
    rows.sort((a, b) => fr(a[3] * 7.31 + a[0] * 3.17) - fr(b[3] * 7.31 + b[0] * 3.17));
    return new THREE.InstancedBufferAttribute(new Float32Array(rows.flat()), 4);
  }
  const setCount = (me, d) => { me.geometry.instanceCount = Math.min(me.userData.n, Math.ceil(me.userData.n * Math.min(1, d + 0.06))); };
  const FOOT = new THREE.Vector4(Lo.X0 - 1, Lo.X1 + 1, Lo.Z0 - 1, Lo.ZF + 9);

  /* ---------- estrias ---------- */
  const DROP_VS = `
attribute vec2 corner; attribute vec4 aR;
uniform float uTime, uDensity, uLen, uWidth, uAlpha, uSpeed, uPix, uUrban, uRoofOn, uNear;
uniform vec3 uC, uB, uWind, uCam; uniform vec4 uFoot;
varying float vA; varying vec2 vUV;
${HM_GLSL}
void main() {
  vec3 dir = normalize(vec3(uWind.x, -1.0, uWind.z));
  vec3 p0 = aR.xyz * uB + dir * uSpeed * uTime;
  vec3 p = uC + mod(p0 - uC + 0.5 * uB, uB) - 0.5 * uB;
  vec3 q = abs(p - uC) / (0.5 * uB);
  float edge = 1.0 - smoothstep(0.7, 1.0, max(q.x, max(q.y, q.z)));
  float sel = fract(aR.w * 7.31 + aR.x * 3.17);
  float on = 1.0 - smoothstep(uDensity - 0.04, uDensity, sel);
  float inHM = step(${Lo.X0.toFixed(1)}, p.x) * step(p.x, ${Lo.X1.toFixed(1)}) * step(${Lo.Z0.toFixed(1)}, p.z) * step(p.z, ${Lo.ZF.toFixed(1)});
  vec4 h = hmAt(p.xz);
  float g = mix(h.r, max(h.g, h.b * uRoofOn), uUrban);
  g = mix(${Lo.YB.toFixed(1)}, g, inHM);
  float foot = step(uFoot.x, p.x) * step(p.x, uFoot.y) * step(uFoot.z, p.z) * step(p.z, uFoot.w);
  float above = smoothstep(g - 0.05, g + 0.25, p.y);
  float len = uLen * (0.7 + 0.6 * fract(aR.w * 13.7));
  vec3 toCam = uCam - p; float dist = length(toCam);
  float w = max(uWidth, dist * uPix * 1.35);
  float wa = uWidth / w;
  float nearFade = smoothstep(uNear, uNear * 2.5, dist);
  vec3 side = normalize(cross(dir, toCam));
  vec3 pos = p - dir * len * corner.y + side * w * corner.x;
  vA = on * edge * foot * above * nearFade * uAlpha * mix(1.0, wa, 0.6);
  vUV = corner;
  if (vA < 0.002) pos = vec3(0.0, -2000.0, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}`;
  const DROP_FS = `
uniform vec3 uColor; varying float vA; varying vec2 vUV;
void main() {
  float across = 1.0 - pow(abs(vUV.x) * 2.0, 2.0);
  float along = pow(1.0 - vUV.y, 0.8) * smoothstep(0.0, 0.06, vUV.y + 0.02);
  float a = vA * across * along;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}`;
  function dropLayer(n, B, o) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, -2000, 0, 0, -2000, 0, 0, -2000, 0, 0, -2000, 0], 3));
    g.setAttribute('corner', new THREE.Float32BufferAttribute([-0.5, 0, 0.5, 0, -0.5, 1, 0.5, 1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    g.setAttribute('aR', randAttr(n)); g.instanceCount = n;
    const m = new THREE.ShaderMaterial({
      vertexShader: DROP_VS, fragmentShader: DROP_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { ...hmUniforms(hm), uTime: { value: 0 }, uDensity: { value: 0 }, uLen: { value: o.len }, uWidth: { value: o.w }, uAlpha: { value: o.alpha }, uSpeed: { value: o.speed },
        uPix: { value: 0.001 }, uUrban: { value: 1 }, uRoofOn: { value: 1 }, uNear: { value: o.near ?? 0.6 }, uC: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3(...B) },
        uWind: { value: new THREE.Vector3(0.2, 0, 0.08) }, uCam: { value: new THREE.Vector3() }, uFoot: { value: FOOT }, uColor: { value: col(o.color ?? '#d4e6f5') } }
    });
    const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = 40; me.castShadow = me.receiveShadow = false;
    me.userData.o = o; me.userData.n = n; root.add(me);
    return me;
  }
  // perto (estrias finas ao redor da câmera), meio, longe (cobre a maquete inteira em vista geral)
  const layers = [
    dropLayer(2600, [12, 12, 12], { len: 0.42, w: 0.006, alpha: 0.5, speed: 10.5, ahead: 5, near: 0.7 }),
    dropLayer(5200, [34, 26, 34], { len: 0.95, w: 0.016, alpha: 0.42, speed: 11, ahead: 17, near: 2 }),
    dropLayer(9000, [96, 54, 96], { len: 2.3, w: 0.045, alpha: 0.36, speed: 12.5, ahead: 'look', near: 6 })
  ];

  /* ---------- respingos (coroas) e anéis ---------- */
  const SPL_VS = `
attribute vec4 aR; attribute float part;
uniform float uTime, uDensity, uSize, uRef, uMaxS, uUrban, uRoofOn, uFlood, uRiver, uMode, uPeriod, uRes; uniform vec4 uResRect;
uniform vec3 uC, uB, uCam; uniform float uMinD, uMaxD;
varying float vA; varying float vH;
${HM_GLSL}
void main() {
  float P = uPeriod * (0.8 + 0.4 * fract(aR.w * 5.31));
  float ph = uTime / P + aR.z; float cyc = floor(ph); float age = fract(ph);
  vec2 hp = hash22(aR.xy * 97.13 + cyc * vec2(0.1373, 0.5311));
  vec2 xz0 = hp * uB.xz;
  vec2 xz = uC.xz + mod(xz0 - uC.xz + 0.5 * uB.xz, uB.xz) - 0.5 * uB.xz;
  vec4 h = hmAt(xz);
  float gU = max(h.g, h.b * uRoofOn);
  float g = mix(h.r, gU, uUrban);
  float inHM = step(${Lo.X0.toFixed(1)} + 0.3, xz.x) * step(xz.x, ${Lo.X1.toFixed(1)} - 0.3) * step(${Lo.Z0.toFixed(1)} + 0.3, xz.y) * step(xz.y, ${Lo.ZF.toFixed(1)} - 0.05);
  // superfície de água: lâmina da rua (onde a máscara deixa e o nível passa o chão), rio
  float inRes = uRes * step(uResRect.x, xz.x) * step(xz.x, uResRect.y) * step(uResRect.z, xz.y) * step(xz.y, uResRect.w);
  float fl = step(0.5, h.a) * step(g + 0.015, uFlood) * step(h.b * uRoofOn, -50.0) * (1.0 - inRes);
  float rv = step(${(Lo.RIVER.x0 + 0.4).toFixed(2)}, xz.x) * step(xz.x, ${(Lo.RIVER.x1 - 0.4).toFixed(2)}) * step(h.r, uRiver);
  float wet = max(fl, rv);
  float y = mix(g, mix(uRiver, uFlood, fl), wet);
  float sel = fract(aR.w * 7.31 + aR.x * 3.17);
  float on = (1.0 - smoothstep(uDensity - 0.04, uDensity, sel)) * inHM;
  vec3 c = vec3(xz.x, y, xz.y);
  float dist = length(uCam - c);
  on *= smoothstep(uMinD * 0.8, uMinD, dist) * (1.0 - smoothstep(uMaxD * 0.85, uMaxD, dist));
  float s = uSize * clamp(dist / uRef, 0.6, uMaxS) * (0.75 + 0.5 * fract(aR.w * 3.7));
  vec3 lp = position;
  if (uMode < 0.5) { // coroa: cresce e cai; gotículas saltam em parábola
    float k = clamp(age / 0.55, 0.0, 1.0);
    on *= step(age, 0.55) * mix(1.0, 0.55, wet);
    float r = 0.35 + 0.9 * sqrt(k);
    if (part < 0.5) { lp.xz *= r; lp.y *= sin(3.1416 * pow(k, 0.6)) * 1.1; }
    else { lp.xz *= r * 1.25; lp.y = lp.y * 0.4 + (3.2 * k - 3.0 * k * k) * 0.9; lp *= 1.0; }
    vA = on * (1.0 - k * k);
    vH = position.y;
  } else { // anel na água
    on *= wet;
    float k = age; lp.xz *= 0.15 + 1.6 * sqrt(k); vA = on * pow(1.0 - k, 1.6);
    vH = 0.0;
  }
  vec3 pos = c + lp * s + vec3(0.0, 0.012, 0.0);
  if (vA < 0.003) pos = vec3(0.0, -2000.0, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}`;
  const SPL_FS = `
uniform vec3 uColor; uniform float uAlpha; varying float vA; varying float vH;
void main() { float a = vA * uAlpha * (0.55 + 0.45 * clamp(vH * 2.0, 0.0, 1.0)); if (a < 0.003) discard; gl_FragColor = vec4(uColor * (0.8 + 0.4 * vH), a); }`;
  // geometria da coroa: parede fina em revolução com borda recortada + 8 gotículas
  function crownGeo() {
    const pos = [], part = [], idx = [], N = 10;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), spike = i % 2 ? 1.0 : 0.62;
      pos.push(c * 0.55, 0, s * 0.55, c * 0.82, 0.55 * spike, s * 0.82); part.push(0, 0);
      if (i < N) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const tet = [[0, 0.09, 0], [0.07, -0.05, 0.04], [-0.07, -0.05, 0.04], [0, -0.05, -0.08]];
    for (let d = 0; d < 5; d++) {
      const a = (d / 5) * Math.PI * 2 + 0.2, off = pos.length / 3;
      tet.forEach((v) => { pos.push(Math.cos(a) * 0.8 + v[0], 0.5 + v[1], Math.sin(a) * 0.8 + v[2]); part.push(1); });
      idx.push(off, off + 1, off + 2, off, off + 2, off + 3, off, off + 3, off + 1, off + 1, off + 3, off + 2);
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('part', new THREE.Float32BufferAttribute(part, 1)); g.setIndex(idx);
    return g;
  }
  function ringGeo() {
    const r = new THREE.RingGeometry(0.82, 1, 16, 1); r.rotateX(-Math.PI / 2);
    const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', r.attributes.position); g.setIndex(r.index);
    g.setAttribute('part', new THREE.Float32BufferAttribute(new Float32Array(r.attributes.position.count), 1));
    return g;
  }
  const RES = Lo.RESERVOIR, resRect = new THREE.Vector4(RES.x0 - RES.wall, RES.x1 + RES.wall, RES.z0 - RES.wall, RES.z1 + RES.wall);
  function splashLayer(geo, n, B, o) {
    geo.setAttribute('aR', randAttr(n)); geo.instanceCount = n;
    const m = new THREE.ShaderMaterial({
      vertexShader: SPL_VS, fragmentShader: SPL_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { ...hmUniforms(hm), uTime: { value: 0 }, uDensity: { value: 0 }, uSize: { value: o.size }, uRef: { value: o.ref }, uMaxS: { value: o.maxS }, uUrban: { value: 1 }, uRoofOn: { value: 1 },
        uFlood: { value: 0 }, uRiver: { value: -9 }, uMode: { value: o.mode }, uPeriod: { value: o.period }, uRes: { value: 0 }, uResRect: { value: resRect },
        uC: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3(B, 1, B) }, uCam: { value: new THREE.Vector3() }, uMinD: { value: o.minD }, uMaxD: { value: o.maxD },
        uColor: { value: col(o.color ?? '#e6f1fa') }, uAlpha: { value: o.alpha } }
    });
    const me = new THREE.Mesh(geo, m); me.frustumCulled = false; me.renderOrder = 41; me.castShadow = me.receiveShadow = false; me.userData.n = n; root.add(me);
    return me;
  }
  const splashes = [
    splashLayer(crownGeo(), 900, 18, { mode: 0, size: 0.09, ref: 9, maxS: 2.2, period: 0.55, minD: 0, maxD: 22, alpha: 0.75 }),
    splashLayer(crownGeo(), 2200, 90, { mode: 0, size: 0.1, ref: 9, maxS: 4.5, period: 0.6, minD: 16, maxD: 400, alpha: 0.5 }),
    splashLayer(ringGeo(), 600, 18, { mode: 1, size: 0.13, ref: 9, maxS: 2, period: 0.7, minD: 0, maxD: 22, alpha: 0.45 }),
    splashLayer(ringGeo(), 1400, 90, { mode: 1, size: 0.12, ref: 9, maxS: 3.2, period: 0.8, minD: 16, maxD: 400, alpha: 0.3 })
  ];

  /* ---------- véu de chuva (tempestade, planos distantes) ---------- */
  const VEIL_VS = `
attribute vec2 corner; uniform vec3 uP, uR; uniform vec2 uSz; varying vec2 vUV; varying vec3 vW;
void main() { vec3 p = uP + uR * corner.x * uSz.x + vec3(0.0, 1.0, 0.0) * corner.y * uSz.y; vUV = corner; vW = p; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`;
  const VEIL_FS = `
uniform float uTime, uA; uniform vec3 uColor; varying vec2 vUV; varying vec3 vW;
${HM_GLSL.replace(/uniform sampler2D[^\n]*\n/, '').replace(/vec4 hmAt[^\n]*\n/, '')}
void main() {
  float x = vUV.x * 60.0 + vUV.y * 6.0;
  float streak = vnoise(vec2(x, vUV.y * 2.5 + uTime * 2.6)) * 0.6 + vnoise(vec2(x * 2.3 + 5.0, vUV.y * 4.0 + uTime * 3.4)) * 0.4;
  float sheet = 0.55 + 0.45 * vnoise(vec2(vUV.x * 3.0 - uTime * 0.25, vUV.y * 1.2 + uTime * 0.6));
  float a = uA * (0.55 + 0.8 * streak) * sheet;
  a *= smoothstep(0.5, 0.32, abs(vUV.x)) * smoothstep(-0.5, -0.3, vUV.y) * smoothstep(0.5, 0.2, vUV.y);
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor, a);
}`;
  const veils = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, -2000, 0, 0, -2000, 0, 0, -2000, 0, 0, -2000, 0], 3));
    g.setAttribute('corner', new THREE.Float32BufferAttribute([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5], 2)); g.setIndex([0, 2, 1, 1, 2, 3]);
    const m = new THREE.ShaderMaterial({ vertexShader: VEIL_VS, fragmentShader: VEIL_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uP: { value: new THREE.Vector3() }, uR: { value: new THREE.Vector3(1, 0, 0) }, uSz: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uA: { value: 0 }, uColor: { value: col('#9fb4c6') } } });
    const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = 5; root.add(me); veils.push(me);
  }

  /* ---------- atualização: estado (t, S) agora; posições ligadas à câmera na hora de desenhar ---------- */
  const st = { t: 0, rain: 0, look: new THREE.Vector3(), S: null };
  const _f = new THREE.Vector3(), _c = new THREE.Vector3(), _r = new THREE.Vector3();
  function camInfo(camera) {
    camera.getWorldDirection(_f);
    const pix = 2 * Math.tan((camera.fov * Math.PI) / 360) / 1920;
    return pix;
  }
  // ponto observado: interseção do eixo da câmera com o plano do chão (y ≈ 3)
  function lookPoint(camera, out) {
    camera.getWorldDirection(_f); const p = camera.position;
    const k = _f.y < -0.05 ? (p.y - 3) / -_f.y : 40;
    return out.copy(p).addScaledVector(_f, Math.min(160, Math.max(4, k)));
  }
  layers.forEach((me) => {
    me.onBeforeRender = (r, s, camera) => {
      const u = me.material.uniforms, o = me.userData.o;
      u.uPix.value = camInfo(camera); u.uCam.value.copy(camera.position);
      if (o.ahead === 'look') { lookPoint(camera, _c); _c.y += 8; u.uC.value.copy(_c); }
      else u.uC.value.copy(camera.position).addScaledVector(_f, o.ahead);
    };
  });
  splashes.forEach((me, i) => {
    me.onBeforeRender = (r, s, camera) => {
      const u = me.material.uniforms; u.uCam.value.copy(camera.position);
      lookPoint(camera, _c);
      if (i % 2 === 0) { // perto: entre a câmera e o ponto observado, o mais perto que interessa
        const d = camera.position.distanceTo(_c); if (d > 14) _c.lerpVectors(camera.position, _c, 10 / d);
      }
      u.uC.value.copy(_c);
    };
  });
  veils.forEach((me, i) => {
    me.onBeforeRender = (r, s, camera) => {
      const u = me.material.uniforms; lookPoint(camera, _c);
      camera.getWorldDirection(_f); _f.y = 0; _f.normalize(); _r.set(-_f.z, 0, _f.x);
      const d = camera.position.distanceTo(_c), off = (i - 1) * 0.35 * d + 0.15 * d;
      u.uP.value.copy(_c).addScaledVector(_f, off); u.uP.value.y = 3 + 0.35 * d * 0.5;
      u.uR.value.copy(_r); u.uSz.value.set(d * 2.4, d * 1.2);
    };
  });

  function update(t, S) {
    const r = S.rain, on = r > 0.01;
    root.visible = on;
    if (!on) return;
    const urban = S.build.walks > 0.5 ? 1 : 0, roofOn = S.build.houses > 0.9 ? 1 : 0;
    const wind = new THREE.Vector3(0.1 + 0.22 * r, 0, 0.05 + 0.08 * r);
    layers.forEach((me) => {
      const u = me.material.uniforms, o = me.userData.o;
      u.uTime.value = t; u.uDensity.value = Math.min(1, r * 1.0); u.uUrban.value = urban; u.uRoofOn.value = roofOn;
      u.uLen.value = o.len * (0.75 + 0.35 * r); u.uWidth.value = o.w * (0.8 + 0.4 * r); u.uAlpha.value = o.alpha * (0.75 + 0.35 * r);
      u.uWind.value.copy(wind); setCount(me, r);
    });
    splashes.forEach((me) => {
      const u = me.material.uniforms;
      u.uTime.value = t; u.uDensity.value = Math.min(1, r); u.uUrban.value = urban; u.uRoofOn.value = roofOn;
      u.uFlood.value = S.flood; u.uRiver.value = S.river; u.uRes.value = S.build.reservoir > 0.02 ? 1 : 0; setCount(me, r);
    });
    const va = 0.085 * L.sstep(0.55, 1, r);
    veils.forEach((me, i) => { me.visible = va > 0.002; me.material.uniforms.uA.value = va * (i === 0 ? 0.6 : 1); me.material.uniforms.uTime.value = t + i * 3.7; });
  }
  return { update, root };
}
