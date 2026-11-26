// Furos EXTRAS na face de corte da frente (z = Lo.ZF), além dos três furos das redes (Lo.NET), para o módulo terreno:
// câmaras ("balões") dos poços de visita de esgoto, que aparecem em corte. Polígonos [[x, y], ...] no plano da face.
// Cada câmara CONTÉM o furo do coletor de esgoto no mesmo trecho (o terreno deve unir os furos sobrepostos).
// Puro: só depende do layout, pode ser importado por qualquer módulo.
import { NET } from '../layout.js';
export const SEWER_PV_X = [-40, -18, 16, 44];       // poços de visita de esgoto (câmara em corte na face)
export const DRAIN_PV_X = [-50, -28, 30, 52];       // poços de visita da galeria (nicho atrás da galeria, sem furo extra)
export const PV = { half: 0.8, y0: NET.sewer.y - NET.sewer.r - 0.33, y1: NET.water.y - NET.water.r - 0.13 };  // câmara: y −3,45 … −1,65
export const FACE_HOLES = SEWER_PV_X.map((x) => [[x - PV.half, PV.y0], [x + PV.half, PV.y0], [x + PV.half, PV.y1], [x - PV.half, PV.y1]]);
