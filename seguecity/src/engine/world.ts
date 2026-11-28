// Monta a cidade: chão, prédios (de data/buildings.json) e decoração procedural determinística.
import { buildings } from '../data';
import { buildGround, FOUNTAIN, roadDir, type Lot } from './ground';
import { N, OX, OY, WORLD_H, sx, sy } from './iso';
import { tileAt, isRoad } from './map';
import { hash2, mulberry32 } from './rng';
import { apartment, house, shop } from './sprites/buildings';
import { prefeitura, escola, hospital, mercado, delegacia, oficina, terminal, obra } from './sprites/civic';
import { tree, lamp, bench, fountain, bridge, trafficLight, busStop, newsstand, popcorn, lotSign, flagpole, type TreeKind } from './sprites/props';
import type { Obj } from './types';

export interface World {
  OX: number; OY: number;
  ground: ReturnType<typeof buildGround>;
  water: Int32Array; waterRows: Int32Array; fall: Int32Array;
  objects: Obj[];
  byId: Map<string, Obj>;
  fountainJet: { x: number; y: number };
  signals: { x: number; y: number; phase: number; i: number; j: number }[];
  flags: { x: number; y: number; big: boolean; i: number; j: number }[];
  craneTop: { x: number; y: number };
  craneMast: { i: number; j: number };
  buildTimeMs: number;
}

function lotKind(tipo: string): Lot['kind'] {
  if (tipo === 'casa') return 'yard';
  if (tipo === 'obra') return 'dirt';
  if (tipo === 'prefeitura') return 'paver';
  return 'concrete';
}

let cached: World | null = null;
export function getWorld(): World {
  if (cached) return cached;
  const t0 = performance.now();
  const lots: Lot[] = buildings
    .filter((b) => b.status !== 'planejado')
    .map((b) => ({ i0: b.posicao.i, j0: b.posicao.j, i1: b.posicao.i + b.tamanho.w, j1: b.posicao.j + b.tamanho.d, kind: lotKind(b.tipo) }));
  const ground = buildGround(lots);
  const water = ground.water;
  const waterRows = new Int32Array(WORLD_H + 2);
  let k = 0;
  for (let y = 0; y <= WORLD_H + 1; y++) {
    while (k < water.length && water[k + 1] < y) k += 5;
    waterRows[y] = k;
  }

  const objects: Obj[] = [];
  let craneTop = { x: 0, y: 0 };
  let craneMast = { i: 29.25, j: 4.75 };
  // prédios principais foram desenhados numa posição de referência; se o JSON mudar a posição, o sprite é deslocado
  const DESIGN: Record<string, [number, number]> = { prefeitura: [10, 5], escola: [4, 4], hospital: [16, 4], delegacia: [4, 18], oficina: [7, 18], terminal: [10, 21], obra: [16, 18] };
  const place = (o: Obj, tipo: string, b: { posicao: { i: number; j: number } }) => {
    const d = DESIGN[tipo];
    if (d) shift(o, b.posicao.i - d[0], b.posicao.j - d[1]);
    return o;
  };
  for (const b of buildings) {
    switch (b.tipo) {
      case 'casa': objects.push(house(b)); break;
      case 'loja': objects.push(shop(b)); break;
      case 'escritorio': objects.push(apartment(b, true)); break;
      case 'prefeitura': objects.push(place(prefeitura(b), b.tipo, b)); break;
      case 'escola': objects.push(place(escola(b), b.tipo, b)); break;
      case 'hospital': objects.push(place(hospital(b), b.tipo, b)); break;
      case 'mercado': objects.push(mercado(b)); break;
      case 'delegacia': objects.push(place(delegacia(b), b.tipo, b)); break;
      case 'oficina': objects.push(place(oficina(b), b.tipo, b)); break;
      case 'terminal': objects.push(place(terminal(b), b.tipo, b)); break;
      case 'obra': {
        const { site, crane } = obra(b);
        objects.push(place(site, 'obra', b), place(crane, 'obra', b));
        const di = b.posicao.i - 16, dj = b.posicao.j - 18;
        craneMast = { i: 19.25 + di, j: 18.75 + dj };
        craneTop = { x: sx(craneMast.i, craneMast.j), y: sy(craneMast.i, craneMast.j, 172) };
        break;
      }
      default: objects.push(apartment(b)); break;
    }
  }
  // lotes planejados começam escondidos (aparecem como planta/obra nas cenas de crescimento)
  for (const o of objects) if (o.planned) o.hidden = true;
  for (const b of buildings.filter((x) => x.status === 'planejado')) objects.push(lotSign(b.posicao.i + 1, b.posicao.j + b.tamanho.d - 0.5));

  const rnd = mulberry32(2026);
  const occupied = (i: number, j: number) => buildings.some((b) => b.status !== 'planejado' && i >= b.posicao.i && i < b.posicao.i + b.tamanho.w && j >= b.posicao.j && j < b.posicao.j + b.tamanho.d);

  // postes ao longo das ruas (lado de trás, braço sobre a rua) e árvores entre eles
  const signals: World['signals'] = [];
  for (let tj = 0; tj < N; tj++)
    for (let ti = 0; ti < N; ti++) {
      if (tileAt(ti, tj) !== 'road') continue;
      const d = roadDir(ti, tj);
      if (d === 'i' && !isRoad(ti, tj - 1) && tileAt(ti, tj - 1) !== 'river') {
        const back = tileAt(ti, tj - 1);
        if (ti % 2 === 0 && back !== 'forest') objects.push(lamp(ti + 0.5, tj - 0.07, 'street', 'j'));
        else if (back !== 'forest' && back !== 'promenade' && hash2(ti, tj, 5) > 0.35) objects.push(tree(pickTree(ti, tj), ti + 0.5, tj - 0.07, ti * 97 + tj));
      }
      if (d === 'j' && !isRoad(ti - 1, tj) && tileAt(ti - 1, tj) !== 'river') {
        const back = tileAt(ti - 1, tj);
        if (tj % 2 === 1 && back !== 'forest') objects.push(lamp(ti - 0.07, tj + 0.5, 'street', 'i'));
        else if (back !== 'forest' && back !== 'promenade' && hash2(ti, tj, 6) > 0.4) objects.push(tree(pickTree(ti, tj), ti - 0.07, tj + 0.5, ti * 31 + tj * 7));
      }
      // árvores na calçada da frente (lado +j / +i), entre os lotes
      if (d === 'i' && !isRoad(ti, tj + 1) && tileAt(ti, tj + 1) !== 'river' && ti % 3 === 1 && hash2(ti, tj, 9) > 0.45 && !occupiedFront(ti, tj + 1)) objects.push(tree('round', ti + 0.5, tj + 1.07, ti * 13 + tj));
    }
  function occupiedFront(i: number, j: number) { return occupied(i, j) && tileAt(i, j) !== 'grass'; }

  // mata nas bordas
  for (let tj = 0; tj < N; tj++)
    for (let ti = 0; ti < N; ti++) {
      if (tileAt(ti, tj) !== 'forest') continue;
      const front = tj === N - 1 || ti === N - 1;
      const n = front ? 1 : 2;
      for (let q = 0; q < n; q++) {
        if (hash2(ti, tj, 40 + q) < (front ? 0.45 : 0.2)) continue;
        const i = ti + 0.2 + hash2(ti, tj, 50 + q) * 0.6, j = tj + 0.2 + hash2(ti, tj, 60 + q) * 0.6;
        const r = hash2(ti, tj, 70 + q);
        const kind: TreeKind = front ? (r < 0.6 ? 'bush' : 'round') : r < 0.35 ? 'round' : r < 0.6 ? 'tall' : r < 0.8 ? 'pine' : r < 0.9 ? 'ipeY' : 'ipeP';
        objects.push(tree(kind, i, j, ti * 1000 + tj * 10 + q));
      }
    }
  // calçadão: palmeiras e ipês alternados
  for (let tj = 0; tj < N; tj++) {
    if (tileAt(25, tj) !== 'promenade' || tj === 10 || tj === 24) continue;
    if (tj % 3 === 0) objects.push(tree('palm', 25.5, tj + 0.5, 500 + tj));
    else if (tj % 3 === 2) objects.push(tree(tj % 2 ? 'ipeY' : 'ipeP', 25.62, tj + 0.5, 600 + tj));
    if (tj % 3 === 1) objects.push(lamp(25.15, tj + 0.5, 'plaza'));
  }
  // praça central: fonte, bancos, ipês, postes ornamentais, pipoqueiro e banca
  const f = fountain(FOUNTAIN.i, FOUNTAIN.j);
  objects.push(f.obj);
  for (const [di, dj, al] of [[0, -1.7, 'i'], [0, 1.7, 'i'], [-1.7, 0, 'j'], [1.7, 0, 'j']] as const) objects.push(bench(FOUNTAIN.i + di, FOUNTAIN.j + dj, al));
  for (const [ci, cj, kd] of [[10.6, 11.6, 'ipeY'], [14.4, 11.6, 'ipeP'], [10.6, 16.4, 'ipeP'], [14.4, 16.4, 'ipeY']] as const) objects.push(tree(kd, ci, cj, Math.round(ci * 100 + cj)));
  for (const [ci, cj] of [[11.3, 12.3], [13.7, 12.3], [11.3, 14.7], [13.7, 14.7], [12.5, 11.45], [12.5, 15.6]]) objects.push(lamp(ci, cj, 'plaza'));
  objects.push(popcorn(14.1, 15.3));
  objects.push(newsstand(10.7, 15.35));
  // jardins da prefeitura
  for (const ci of [10.5, 11.2, 13.8, 14.5]) objects.push(tree('bush', ci, 9.45, Math.round(ci * 10)));
  objects.push(flagpole(10.85, 9.05, 44), flagpole(14.15, 9.05, 44));
  // pontes
  objects.push(...bridge(10), ...bridge(24));
  // semáforos
  for (const [ti, tj] of [[9, 10], [15, 10], [9, 17], [15, 17], [20, 10], [20, 24]]) {
    const s = trafficLight(ti - 0.12, tj - 0.12);
    objects.push(s.obj);
    signals.push({ ...s.head, phase: (ti + tj) % 2, i: ti - 0.12, j: tj - 0.12 });
  }
  // pontos de ônibus
  objects.push(busStop(10.1, 12.6, 'j'), busStop(12.5, 16.9, 'i'));
  // árvores nos quintais
  for (const b of buildings.filter((x) => x.tipo === 'casa')) {
    if (hash2(b.posicao.i, b.posicao.j, 3) < 0.5) continue;
    const i = b.posicao.i + (b.frente === 'i+' ? 0.35 : 1.62), j = b.posicao.j + (b.frente === 'j+' ? 0.35 : 0.4);
    objects.push(tree(rnd() < 0.3 ? 'ipeY' : rnd() < 0.5 ? 'round' : 'tall', i, j, b.posicao.i * 77 + b.posicao.j));
  }

  const byId = new Map(objects.map((o) => [o.id, o]));
  const flags = [
    { x: sx(12.5, 6.87), y: sy(12.5, 6.87, 40 + 34 + 30), big: true, i: 12.5, j: 6.87 },
    { x: sx(10.85, 9.05), y: sy(10.85, 9.05, 44), big: false, i: 10.85, j: 9.05 },
    { x: sx(14.15, 9.05), y: sy(14.15, 9.05, 44), big: false, i: 14.15, j: 9.05 },
  ];
  cached = { OX, OY, ground, water, waterRows, fall: ground.fall, objects, byId, fountainJet: f.jetBase, signals, flags, craneTop, craneMast, buildTimeMs: performance.now() - t0 };
  return cached;
}

function shift(o: Obj, di: number, dj: number) {
  if (!di && !dj) return;
  const dx = (di - dj) * 16, dy = (di + dj) * 8;
  o.sprite = { ...o.sprite, ox: o.sprite.ox + dx, oy: o.sprite.oy + dy };
  o.fp = [o.fp[0] + di, o.fp[1] + dj, o.fp[2] + di, o.fp[3] + dj];
  o.lights = o.lights.map((L) => ({ ...L, x: L.x + dx, y: L.y + dy }));
  if (o.anchor) o.anchor = { x: o.anchor.x + dx, y: o.anchor.y + dy };
}

function pickTree(ti: number, tj: number): TreeKind {
  const r = hash2(ti, tj, 17);
  return r < 0.55 ? 'round' : r < 0.75 ? 'ipeY' : r < 0.9 ? 'ipeP' : 'tall';
}
