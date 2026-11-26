// Monta a capa a partir das placas (tools/plate.cjs) e do layout tools/capa.html.
//   node tools/capa.cjs --out ../publicacao/ep01/capa-1.jpg [--vy -90] [--ry -250]
const { chromium } = require('playwright'), http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
(async () => {
  const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/tools/capa.html`);
  await page.evaluate(({ vy, ry }) => { document.body.style.setProperty('--vy', vy + 'px'); document.body.style.setProperty('--ry', ry + 'px'); }, { vy: opt('vy', -90), ry: opt('ry', -250) });
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
  fs.writeFileSync(path.resolve(opt('out', 'out/cover/capa.jpg')), await page.screenshot({ type: 'jpeg', quality: 93 }));
  await browser.close(); server.close();
})();
