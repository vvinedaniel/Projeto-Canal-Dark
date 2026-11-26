// Benchmark comparável do custo por quadro: mesmos instantes (um por cenário), mesma máquina.
//   node tools/bench3.cjs [--ao 0] [--msaa 0] [--aores 0.5] [--mods a,b] [--times 1,30] [--label x]
// Mede separadamente: render (window.__frame) e captura (screenshot JPEG) — média de 3 quadros por cenário.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.css': 'text/css' };
const TL = (opt('times', '1,9.6,30,36,55,76,83,88,102,113')).split(',').map(Number);
const TIMES = Object.fromEntries(TL.map((t) => ['t' + t, t]));

(async () => {
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const qs = ['render', 'scale=1']; for (const k of ['ao', 'msaa', 'aores', 'shadow', 'noshadow', 'mods']) if (opt(k)) qs.push(k + '=' + opt(k));
  const tl = Date.now();
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?${qs.join('&')}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  const load = (Date.now() - tl) / 1000;
  const clip = { x: 0, y: 0, width: 1080, height: 1920 };
  const row = { label: opt('label', qs.slice(2).join(',') || 'base'), load: +load.toFixed(1) };
  let R = 0, C = 0, n = 0;
  for (const [id, t] of Object.entries(TIMES)) {
    await page.evaluate((t) => window.__frame(t), t - 0.1); // aquece (shaders/troca de cenário)
    let r = 0, c = 0;
    for (let k = 0; k < 3; k++) {
      let a = Date.now(); await page.evaluate((t) => window.__frame(t), t + k / 30); r += Date.now() - a;
      a = Date.now(); await page.screenshot({ type: 'jpeg', quality: 95, clip }); c += Date.now() - a;
    }
    const inf = await page.evaluate(() => window.__info && window.__info());
    row[id] = +((r + c) / 3000).toFixed(2); if (inf) row[id + '_info'] = inf.calls + 'dc/' + Math.round(inf.triangles / 1000) + 'kt'; R += r; C += c; n += 3;
  }
  row.render = +(R / n / 1000).toFixed(2); row.captura = +(C / n / 1000).toFixed(2); row.total = +((R + C) / n / 1000).toFixed(2);
  console.log(JSON.stringify(row));
  fs.appendFileSync(path.join(ROOT, 'out/bench3.jsonl'), JSON.stringify(row) + '\n');
  await browser.close(); server.close();
})();
