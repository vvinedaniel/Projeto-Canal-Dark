// Captura quadros do filme com o Chromium (WebGL por software).
//   node tools/render.cjs stills --t 1,5.5,12 [--only casa] [--scale 0.5] [--ao 0] [--out out/stills]
//   node tools/render.cjs frames --from 0 --to 3075 [--out out/frames]      (índices de quadro, 30 fps)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2), mode = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.cjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.css': 'text/css' };

(async () => {
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const scale = parseFloat(opt('scale', '1')), W = Math.round(1080 * scale), H = Math.round(1920 * scale);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: scale });
  let errors = 0;
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text()); });
  page.on('pageerror', (e) => { errors++; console.log('[pageerror]', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')); });
  const qs = ['render', 'scale=' + scale]; if (opt('only')) qs.push('only=' + opt('only')); if (opt('ao')) qs.push('ao=' + opt('ao')); if (opt('msaa')) qs.push('msaa=' + opt('msaa')); if (opt('aores')) qs.push('aores=' + opt('aores')); if (opt('cover')) qs.push('cover=' + opt('cover'));
  await page.goto(`http://127.0.0.1:${port}/index.html?${qs.join('&')}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 }).catch(() => console.log('[erro] a página não ficou pronta'));
  await page.evaluate(() => document.fonts.ready);
  const clip = { x: 0, y: 0, width: 1080, height: 1920 };
  const out = path.resolve(opt('out', mode === 'frames' ? 'out/frames' : 'out/stills'));
  fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now();
  if (mode === 'bench') {
    for (let i = 0; i < 6; i++) await page.evaluate((t) => window.__frame(t), 44 + i * 0.1);
    console.log('só render:', ((Date.now() - t0) / 6000).toFixed(2), 's/quadro');
  } else if (mode === 'stills') {
    for (const t of opt('t', '0').split(',')) {
      await page.evaluate((t) => window.__frame(t), +t);
      const file = path.join(out, `t${(+t).toFixed(2).padStart(6, '0')}.jpg`);
      const buf = await page.screenshot({ type: 'jpeg', quality: 88, clip });
      fs.writeFileSync(file, buf); console.log(file);
    }
  } else {
    const from = +opt('from', 0), to = +opt('to', 3075);
    for (let i = from; i < to; i++) {
      await page.evaluate((t) => window.__frame(t), i / 30);
      fs.writeFileSync(path.join(out, `f${String(i).padStart(5, '0')}.jpg`), await page.screenshot({ type: 'jpeg', quality: 95, clip }));
      if ((i - from) % 50 === 0) console.log(`quadro ${i} (${((Date.now() - t0) / 1000 / (i - from + 1)).toFixed(2)} s/quadro)`);
    }
  }
  console.log(`ok em ${((Date.now() - t0) / 1000).toFixed(1)} s, erros de página: ${errors}`);
  await browser.close(); server.close();
})();
