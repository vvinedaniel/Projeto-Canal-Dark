// Mapa de alturas da maquete para a água (CPU + textura para os shaders).
// Canais: R = chão natural (Gnat), G = superfície urbana (chão + guias/calçadas), B = topo dos telhados/prédios
// (−99 sem telhado), A = máscara de alagamento (1 = a lâmina pode existir aqui, 0 = não: rio, canal, fundo da maquete).
import { THREE } from '../../../lib.js';

export const HM = { x0: -40, x1: 44, z0: -24, z1: 26, step: 0.2 };

const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/** calçadas (topo da guia) das ruas: devolve a altura extra sobre o chão no ponto, 0 fora */
export function curbAt(Lo, x, z) {
  const A = Lo.STREET_A, B = Lo.STREET_B, C = Lo.STREET_C;
  const inX = (s) => x >= s.x0 && x <= s.x1;
  const inW = (w) => z >= w[0] && z <= w[1];
  if (inX(A) && (inW(A.walkFront) || inW(A.walkBack))) return A.curbH;
  if (inX(B) && (inW(B.walkFront) || inW(B.walkBack))) return B.curbH;
  // rua C (transversal) tem calçadas de 1,5 m de cada lado, entre B e A
  if (z > B.z1 + 2 && z < A.walkBack[0] && ((x >= C.x0 - 1.5 && x < C.x0) || (x > C.x1 && x <= C.x1 + 1.5))) return 0.15;
  return 0;
}
/** está dentro do leito de alguma rua? */
export function onStreet(Lo, x, z) {
  const A = Lo.STREET_A, B = Lo.STREET_B, C = Lo.STREET_C;
  return (x >= A.x0 && x <= A.x1 && z >= A.z0 && z <= A.z1) || (x >= B.x0 && x <= B.x1 && z >= B.z0 && z <= B.z1) || (x >= C.x0 && x <= C.x1 && z >= C.z0 && z <= C.z1);
}

export function buildHM(Lo, shared) {
  const { x0, x1, z0, z1, step } = HM, nx = Math.round((x1 - x0) / step) + 1, nz = Math.round((z1 - z0) / step) + 1;
  const R = new Float32Array(nx * nz), Gc = new Float32Array(nx * nz), Bc = new Float32Array(nx * nz), Ac = new Float32Array(nx * nz);
  const gy = shared.groundY || Lo.G;
  // telhados: do módulo cidade, se houver; senão estimados a partir do layout
  let roofs = shared.roofs;
  if (!roofs || !roofs.length) {
    roofs = Lo.HOUSES.map((h) => ({ x0: h.x - h.w / 2, x1: h.x + h.w / 2, z0: h.z0, z1: h.z1, y: Lo.G(h.x, (h.z0 + h.z1) / 2) + 0.3 + h.floors * 2.9 + 1.0 }))
      .concat(Lo.TOWERS.map((t) => ({ x0: t.x - t.w / 2, x1: t.x + t.w / 2, z0: t.z - t.d / 2, z1: t.z + t.d / 2, y: Lo.G(t.x, t.z) + t.h })));
  }
  for (let j = 0; j < nz; j++) {
    const z = z0 + j * step;
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * step, k = j * nx + i;
      R[k] = Lo.Gnat(x, z);
      Gc[k] = gy(x, z) + curbAt(Lo, x, z);
      let rb = -99; for (const r of roofs) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) rb = Math.max(rb, r.y);
      Bc[k] = rb;
      // máscara: vale urbano; fora do rio/dique (x > 21.6), do canal junto ao corte (x > 16) e do fundo da maquete (z < −11.6)
      let m = (1 - ss(20.6, 21.6, x)) * ss(-12.2, -11.4, z);
      if (x > 15.6 && z > Lo.ZF - Lo.CANAL.half - 0.6) m *= 1 - ss(15.6, 16.0, x);
      Ac[k] = m;
    }
  }
  const half = new Uint16Array(nx * nz * 4), H16 = THREE.DataUtils.toHalfFloat;
  for (let k = 0; k < nx * nz; k++) { half[k * 4] = H16(R[k]); half[k * 4 + 1] = H16(Gc[k]); half[k * 4 + 2] = H16(Bc[k]); half[k * 4 + 3] = H16(Ac[k]); }
  const tex = new THREE.DataTexture(half, nx, nz, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
  const W = x1 - x0, D = z1 - z0;
  // amostragem bilinear na CPU
  const sample = (arr, x, z) => {
    const fx = Math.min(nx - 1.001, Math.max(0, (x - x0) / step)), fz = Math.min(nz - 1.001, Math.max(0, (z - z0) / step));
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * nx + i;
    return (arr[k] * (1 - u) + arr[k + 1] * u) * (1 - v) + (arr[k + nx] * (1 - u) + arr[k + nx + 1] * u) * v;
  };
  return {
    tex, roofs, nx, nz,
    // uniforms: caixa (x0, z0, 1/W, 1/D) — uv = (xz − x0z0) / WD, com meio texel de correção
    box: new THREE.Vector4(x0 - step / 2 * 0, z0, 1 / (W + step), 1 / (D + step)),
    nat: (x, z) => sample(R, x, z), urb: (x, z) => sample(Gc, x, z), roof: (x, z) => sample(Bc, x, z), mask: (x, z) => sample(Ac, x, z)
  };
}

// GLSL comum: leitura do mapa (uv no centro do texel)
export const HM_GLSL = `
uniform sampler2D uHM; uniform vec4 uHMBox; uniform vec2 uHMRes;
vec4 hmAt(vec2 xz) { vec2 uv = (xz - uHMBox.xy) / vec2(${(HM.x1 - HM.x0).toFixed(3)}, ${(HM.z1 - HM.z0).toFixed(3)}); uv = (uv * (uHMRes - 1.0) + 0.5) / uHMRes; return texture2D(uHM, uv); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { return vnoise(p) * 0.55 + vnoise(p * 2.03 + 7.1) * 0.3 + vnoise(p * 4.1 + 3.3) * 0.15; }
`;
export function hmUniforms(hm) {
  return { uHM: { value: hm.tex }, uHMBox: { value: new THREE.Vector4(HM.x0, HM.z0, 0, 0) }, uHMRes: { value: new THREE.Vector2(hm.nx, hm.nz) } };
}

/** reduz o reflexo do ambiente (estúdio claro) num material padrão já "waterizado": água turva reflete pouco */
export function tameEnv(sh, k = 0.4) {
  sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
#if defined( RE_IndirectSpecular )
  radiance *= ${k.toFixed(3)};
#endif
  iblIrradiance *= ${k.toFixed(3)};`);
}
