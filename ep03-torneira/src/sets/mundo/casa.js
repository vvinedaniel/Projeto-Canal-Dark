// Módulo CASA (Ep. 03): a casa em corte no lote hero — ramal, cavalete com hidrômetro em corte, canos internos com
// água, caixa-d'água com torneira de boia, cozinha com torneira em corte, copo e mão articulada.
// Lê só o estado S (state.js); t é usado apenas para movimentos contínuos. update() é função pura de (t, S).
import { makeKit } from './casa/kit.js';
import { buildHouse } from './casa/house.js';
import { buildMeter } from './casa/meter.js';
import { buildPlumbing } from './casa/plumbing.js';
import { buildTank } from './casa/tank.js';

export async function create(ctx) {
  const { L, THREE, scene } = ctx;
  const K = makeKit(L);
  const root = new THREE.Group(); root.name = 'casa'; scene.add(root);
  const house = buildHouse(ctx, K);
  root.add(house.root);
  const meter = buildMeter(ctx, K, house); root.add(meter.root);
  const pipes = buildPlumbing(ctx, K, house, meter); root.add(pipes.root);
  const tank = buildTank(ctx, K, house); root.add(tank.root);

  return {
    update(t, S, cam) {
      const near = cam.position.distanceTo(new THREE.Vector3(-1, 1.5, 17)) < 9;
      house.lamp.visible = house.fill.visible = near;
      meter.update(t, S, cam);
      pipes.update(t, S);
      const tk = tank.update(t, S);
      const conn = S.present || tk.k > 0.85; pipes.SYS.up[2].group.visible = conn; pipes.SYS.down[0].group.visible = conn;
    }
  };
}
