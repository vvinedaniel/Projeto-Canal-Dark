// Compara métodos de captura do mesmo quadro (t=77, eteB).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
(async () => {
  const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?render&scale=1`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  const cdp = await page.context().newCDPSession(page);
  const clip = { x: 0, y: 0, width: 1080, height: 1920 };
  const T = (s) => s; let t = 77;
  const time = async (name, fn) => { let s = 0; for (let k = 0; k < 4; k++) { t += 1 / 30; const a = Date.now(); await fn(); s += Date.now() - a; } console.log(name.padEnd(46), (s / 4000).toFixed(2), 's'); };
  await page.evaluate((t) => window.__frame(t), t);
  await time('render + gl.finish (readPixels 1px)', () => page.evaluate((t) => { window.__frame(t); const c = document.getElementById('gl'); const gl = c.getContext('webgl2'); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }, t));
  await time('screenshot jpeg q95 (sem render)', () => page.screenshot({ type: 'jpeg', quality: 95, clip }));
  await time('render + screenshot jpeg q95 (atual)', async () => { await page.evaluate((t) => window.__frame(t), t); await page.screenshot({ type: 'jpeg', quality: 95, clip }); });
  await time('render + CDP capture optimizeForSpeed', async () => { await page.evaluate((t) => window.__frame(t), t); await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true, captureBeyondViewport: false }); });
  await time('render + CDP capture png optimizeForSpeed', async () => { await page.evaluate((t) => window.__frame(t), t); await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true }); });
  await browser.close(); server.close();
})();
