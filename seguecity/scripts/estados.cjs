// Monta a folha dos estados de luz e clima (2x2) a partir de out/stills/_estados/*.png → out/entrega-v2/08-estados.png
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const ROOT = path.resolve(__dirname, '..');
const S = path.join(ROOT, 'out/stills/_estados');
const font = (f) => 'file://' + path.join(ROOT, 'public/fonts', f);
const ITEMS = [['noite', 'NOITE'], ['amanhecer', 'AMANHECER'], ['chuva', 'CHUVA'], ['neblina', 'NEBLINA']];
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Jersey;src:url(${font('jersey-10-latin-400-normal.woff2')})}
@font-face{font-family:Silk;src:url(${font('silkscreen-latin-700-normal.woff2')})}
html,body{margin:0;background:#0a0b1e;color:#fff;width:2200px}
h1{font:120px Jersey;margin:0;padding:30px 40px 0}p{font:30px Silk;color:#5af2ff;margin:0 40px 24px;letter-spacing:2px}
.g{display:grid;grid-template-columns:1060px 1060px;gap:40px 40px;padding:0 20px 40px}
.c div{font:700 34px Silk;color:#ffd84a;padding:10px 4px;letter-spacing:3px}
img{width:1060px;height:1884px;display:block;image-rendering:pixelated;border:4px solid #1b1e4a}
</style></head><body><h1>ESTADOS DE LUZ E CLIMA</h1><p>MESMA CIDADE · MESMA CÂMERA · PARÂMETROS REUTILIZÁVEIS</p><div class="g">
${ITEMS.map(([f, t]) => `<div class="c"><div>${t}</div><img src="file://${path.join(S, f + '.png')}"></div>`).join('')}
</div></body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 2200, height: 2000 }, deviceScaleFactor: 1 });
  const f = path.join(S, '_folha.html');
  fs.writeFileSync(f, html);
  await p.goto('file://' + f);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(ROOT, 'out/entrega-v2/08-estados.png'), fullPage: true });
  fs.unlinkSync(f);
  await b.close();
  console.log('ok 08-estados');
})();
