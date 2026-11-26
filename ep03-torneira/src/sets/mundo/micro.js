// Ep. 03 — módulo micro: o mundo ampliado da lente ilustrativa ("Ampliação ilustrativa").
// Cena própria + câmera própria, desenhadas por main.js (drawMicro) num canvas circular de 640 px.
// Conteúdo conforme S.micro = { mode, k (0..1 na janela), a, tau (s desde o início da janela) } — função pura de t.
// Ciência: docs/CIENCIA.md (cargas neutralizadas na coagulação; flocos sem números; clara ≠ potável; cistos ficam
// no filtro; cloro inativa as bactérias aos poucos, ao longo do tempo de contato, e sobra cloro residual).
import { Pool, buildGeos, buildMats, makeLabel, CAMPOS } from './micro/kit.js';
import { buildModes } from './micro/modes.js';

function envCube(THREE) {
  const face = (top, spots) => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, top ? '#cfeeff' : '#2a4a5a'); gr.addColorStop(1, top ? '#9fd0ea' : '#0a1418'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    for (const [x, y, r] of spots) { const s = g.createRadialGradient(x, y, 0, x, y, r); s.addColorStop(0, 'rgba(255,255,255,1)'); s.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = s; g.fillRect(0, 0, 64, 64); }
    return cv; };
  const tx = new THREE.CubeTexture([face(0, [[20, 22, 16]]), face(0, [[44, 26, 14]]), face(1, [[32, 32, 26]]), face(0, []), face(0, [[32, 20, 18]]), face(0, [[30, 18, 10]])]);
  tx.colorSpace = THREE.SRGBColorSpace; tx.needsUpdate = true; return tx;
}

export async function create(ctx) {
  const { L, THREE, St, shared } = ctx;
  try { await document.fonts.load('800 64px Montserrat'); } catch (e) { /* sem fonte web: cai em Inter */ }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 60);
  camera.position.set(0, 0, 9);

  // fundo: plano com shader (degradê radial de campo escuro ou vertical na vista lateral) — cor por modo
  const bgU = { uC: { value: new THREE.Color() }, uE: { value: new THREE.Color() }, uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uV: { value: 0 }, uT: { value: 0 } };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: bgU, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform vec3 uC, uE, uTop, uBot; uniform float uV, uT;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 p = vUv - 0.5; float d = length(p - vec2(-0.06, 0.08));
        vec3 rad = mix(uC, uE, smoothstep(0.02, 0.62, d));
        vec3 ver = mix(uBot, uTop, smoothstep(0.12, 0.92, vUv.y)) * (1.0 - 0.55 * smoothstep(0.25, 0.7, length(p)));
        vec3 c = mix(rad, ver, uV);
        // feixes suaves de luz espalhada (campo escuro), lentos
        float ray = 0.5 + 0.5 * sin((p.x * 0.8 + p.y) * 9.0 + uT * 0.25) * sin((p.x - p.y * 0.6) * 5.0 - uT * 0.17);
        c *= 0.92 + 0.12 * ray;
        c += (h(floor(vUv * 900.0)) - 0.5) * 0.012;
        gl_FragColor = vec4(c, 1.0);
      }`
  }));
  bg.scale.set(40, 40, 1); bg.position.set(0, 0, -14); bg.renderOrder = -10; scene.add(bg);

  // luz de microscópio de campo escuro: chave suave + dois contraluzes laterais que acendem as bordas
  const hemi = new THREE.HemisphereLight('#a8dcff', '#2a2010', 0.9); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff4e6', 2.3); key.position.set(3, 5, 7); scene.add(key);
  const rimA = new THREE.DirectionalLight('#9fe6ff', 2.4); rimA.position.set(-7, 3, -5); scene.add(rimA);
  const rimB = new THREE.DirectionalLight('#ffd9a8', 1.5); rimB.position.set(7, -4, -4); scene.add(rimB);
  const fill = new THREE.PointLight('#cfefff', 6, 14, 1.6); fill.position.set(0, 0, 5); scene.add(fill);
  scene.fog = new THREE.Fog('#0a1c24', 9.5, 19);
  // ambiente de reflexo (cubo de canvas: "caixas de luz" suaves) — o renderizador da lente faz o PMREM sozinho
  scene.environment = envCube(THREE); scene.environmentIntensity = 0.55;

  const G = buildGeos(L), M = buildMats(L), world = new THREE.Group(); scene.add(world);
  const pool = (geo, mat, n, o) => new Pool(THREE, world, geo, mat, n, o);
  const P = {
    clayA: pool(G.clayA, M.clay, 60), clayB: pool(G.clayB, M.clay, 60), silt: pool(G.silt, M.silt, 420),
    org: pool(G.org, M.org, 16), fiber: pool(G.fiber, M.org, 10),
    rod: pool(G.rod, M.bact, 60), rodFlag: pool(G.rodFlag, M.bact, 30), diplo: pool(G.diplo, M.bact, 30), chain: pool(G.chain, M.bact, 12),
    shell: pool(G.shell, M.shell, 24, { order: 3 }), nuc: pool(G.nucleus, M.nucleus, 100),
    anth: pool(G.anth, M.anth, 160), sand: pool(G.sand, M.sand, 420),
    ion: pool(G.ball, M.ion, 60), hocl: pool(G.hocl, M.chlor, 60), ocl: pool(G.ocl, M.chlor, 40),
    bokeh: pool(G.plane, M.bokeh, 90, { order: 1 }), halo: pool(G.plane, M.halo, 16, { order: 2 }), ring: pool(G.plane, M.ring, 40, { order: 4 }),
    minus: pool(G.plane, M.minus, 40, { order: 6 }), plus: pool(G.plane, M.plus, 40, { order: 6 }),
    dart: pool(G.dart, M.dart, 90, { order: 7 }), tick: pool(G.tick, M.tick, 48, { order: 26 })
  };
  const pools = Object.values(P);

  // peças avulsas: leito de lodo (decantação), seta da gravidade, disco do relógio do tempo de contato
  const extra = {};
  extra.bed = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#4b3522', roughness: 0.95 }));
  extra.bed.scale.set(11, 1, 4); world.add(extra.bed);
  extra.grav = L.arrow(1.7, { color: '#ffd23a', width: 0.2 }); extra.grav.rotation.z = -Math.PI / 2; extra.grav.renderOrder = 8; world.add(extra.grav);
  extra.clockBack = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: '#04121a', transparent: true, opacity: 0.86, depthTest: false, depthWrite: false, toneMapped: false }));
  extra.clockBack.renderOrder = 25; world.add(extra.clockBack);

  // rótulos (sprites dentro da lente) — no máximo 2 ao mesmo tempo (janelas em modes.js)
  const TEXTS = {
    clay: 'Terra (argila)', micro: 'Microrganismos',
    repel: 'Cargas negativas\nse repelem', neut: 'Coagulante (+)\nneutraliza', stick: 'Começam a grudar',
    micfloc: 'Microflocos', floc: 'Flocos maiores',
    grav: 'Gravidade', sludge: 'Lodo no fundo', clearer: 'Água mais clara',
    notready: 'Clara ≠ pronta\npara beber',
    anth: 'Antracito\n(carvão mineral)', sand: 'Areia', trapped: 'Cistos ficam\npresos nos poros',
    chlor: 'Cloro\n(HOCl / OCl⁻)', contact: 'Tempo de contato', inact: 'Bactérias inativadas\naos poucos', resid: 'Cloro residual\nprotege a rede'
  };
  const LB = {}; for (const [id, tx] of Object.entries(TEXTS)) LB[id] = makeLabel(L, world, tx, { size: 0.32 });
  const labels = Object.values(LB);

  const dur = {}; for (const m of St.MICRO) dur[m.mode] = m.b - m.a;
  const modes = buildModes({ L, THREE, P, M, extra, LB, dur });
  const BG = modes.BG;

  shared.micro = { scene, camera };

  return {
    update(t, S) {
      const m = S.micro || { mode: null };
      const fn = m.mode && modes[m.mode];
      world.visible = bg.visible = !!fn;
      if (!fn) return;
      for (const p of pools) p.begin();
      for (const lb of labels) lb.set(0);
      extra.bed.visible = extra.grav.visible = extra.clockBack.visible = false;
      // câmera sempre em movimento: deriva lenta + aproximação suave ao longo da janela
      const tau = m.tau;
      camera.position.set(0.22 * Math.sin(0.21 * t + 0.4), 0.15 * Math.sin(0.17 * t + 1.1), 9 - 0.45 * L.clamp01((tau + 0.4) / 6));
      camera.lookAt(0.05 * Math.sin(0.13 * t), 0, -0.6);
      camera.updateMatrixWorld(true);
      CAMPOS.x = camera.position.x; CAMPOS.y = camera.position.y; CAMPOS.z = camera.position.z;
      // fundo e névoa do modo
      const b = BG[m.mode];
      bgU.uC.value.set(b.c); bgU.uE.value.set(b.e); bgU.uTop.value.set(b.top || b.c); bgU.uBot.value.set(b.bot || b.e); bgU.uV.value = b.v ? 1 : 0; bgU.uT.value = t;
      if (b.fn) b.fn(m.k, bgU);
      scene.fog.color.set(b.fog);
      fn(m.k, tau, t);
      for (const p of pools) p.end();
    }
  };
}
