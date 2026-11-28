// Monta as imagens "antes × depois" (out/comparativo/antes vs depois) lado a lado, com as fontes do canal.
// Uso: node scripts/comparativo.cjs   (Chromium/Playwright pré-instalados)
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const ROOT = path.resolve(__dirname, '..');
const C = path.join(ROOT, 'out/comparativo');
const font = (f) => 'file://' + path.join(ROOT, 'public/fonts', f);
const NAMES = [
  ['ilha', 'ILHA COMPLETA'], ['praca', 'PRAÇA CENTRAL'], ['bairro', 'BAIRRO RESIDENCIAL'],
  ['comercio', 'REGIÃO COMERCIAL'], ['personagem', 'PERSONAGEM DE EXEMPLO'],
];
const page = (title, a, b) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Jersey;src:url(${font('jersey-10-latin-400-normal.woff2')})}
@font-face{font-family:Silk;src:url(${font('silkscreen-latin-400-normal.woff2')})}
html,body{margin:0;background:#0a0b1e;color:#fff;width:2200px}
h1{font:120px Jersey;margin:0;padding:34px 40px 10px;letter-spacing:2px}
.row{display:flex;gap:40px;padding:0 20px 30px 20px}
.col{width:1060px}.lab{font:700 34px Silk;padding:14px 4px;letter-spacing:3px}
.a .lab{color:#a9b0d8}.b .lab{color:#ffd84a}
img{width:1060px;height:1884px;display:block;image-rendering:pixelated;border:4px solid #1b1e4a}
.b img{border-color:#ffd84a}
</style></head><body><h1>${title}</h1><div class="row">
<div class="col a"><div class="lab">ANTES · V1</div><img src="file://${a}"></div>
<div class="col b"><div class="lab">DEPOIS · V2 PREMIUM</div><img src="file://${b}"></div></div></body></html>`;
(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 2200, height: 2160 }, deviceScaleFactor: 1 });
  for (const [n, title] of NAMES) {
    const a = path.join(C, 'antes', n + '.png'), b = path.join(C, 'depois', n + '.png');
    if (!fs.existsSync(a) || !fs.existsSync(b)) { console.log('faltando', n); continue; }
    const html = path.join(C, '_' + n + '.html');
    fs.writeFileSync(html, page(title, a, b));
    await p.goto('file://' + html);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(C, `comparativo-${n}.png`), fullPage: true });
    fs.unlinkSync(html);
    console.log('ok comparativo-' + n);
  }
  await browser.close();
})();
