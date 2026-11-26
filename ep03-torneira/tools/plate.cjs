// Placa limpa (só o 3D) para montar capas, com câmera livre opcional.
//   node tools/plate.cjs --t 19.6 [--cam '{"p":[x,y,z],"l":[x,y,z],"fov":36}'] [--only casa] --out out/cover/a.png
//   Várias de uma vez:  --batch arquivo.json  ([{t, cam?, out}], todas no mesmo cenário --only)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
(async () => {
  const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const scale = +opt('scale', 1);
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: scale });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const qs = ['render', 'plate', 'scale=' + scale]; if (opt('only')) qs.push('only=' + opt('only')); if (opt('mods')) qs.push('mods=' + opt('mods')); if (opt('ao')) qs.push('ao=' + opt('ao'));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?${qs.join('&')}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  const jobs = opt('batch') ? JSON.parse(fs.readFileSync(opt('batch'), 'utf8')) : [{ t: +opt('t', 0), cam: opt('cam') ? JSON.parse(opt('cam')) : null, out: opt('out', 'out/cover/plate.png') }];
  for (const j of jobs) {
    await page.evaluate(({ t, cam, variant }) => { window.__cam = cam || null; window.__variant = variant || null; window.__frame(t); }, j);
    fs.mkdirSync(path.dirname(path.resolve(j.out)), { recursive: true });
    fs.writeFileSync(path.resolve(j.out), await page.screenshot({ type: j.out.endsWith('.png') ? 'png' : 'jpeg', clip: { x: 0, y: 0, width: 1080, height: 1920 } }));
    console.log(j.out);
  }
  await browser.close(); server.close();
})();
