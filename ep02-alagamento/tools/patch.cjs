// Re-render parcial: só os quadros que mudaram, direto em out/frames, e re-encode do MP4.
//
//   node tools/patch.cjs status                  # quais cenários mudaram desde o último render completo/patch
//   node tools/patch.cjs auto  [--jobs 2]        # re-renderiza só os cenários alterados (+ margem de 0,6 s nas trocas)
//   node tools/patch.cjs range 26.0 31.5         # re-renderiza um trecho em segundos (correção pontual)
//   node tools/patch.cjs mark                    # grava o manifesto atual sem renderizar (depois de um render completo)
//
// Como decide: guarda em out/frames/.manifest.json um hash dos arquivos de cada cenário
// (src/sets/<id>.js + src/sets/<id>/*). Arquivos comuns (main.js, lib.js, timeline.js, words.js,
// index.html) afetam o filme todo: se mudarem, "auto" avisa e pede um "range" explícito ou render completo.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawn, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), FR = path.join(ROOT, 'out/frames'), MAN = path.join(FR, '.manifest.json');
const args = process.argv.slice(2), cmd = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const FPS = 30, MARGIN = 0.6;

const files = (p) => fs.existsSync(p) ? (fs.statSync(p).isDirectory() ? fs.readdirSync(p).sort().flatMap((f) => files(path.join(p, f))) : [p]) : [];
const hash = (list) => { const h = crypto.createHash('sha1'); for (const f of list) h.update(path.relative(ROOT, f)).update(fs.readFileSync(f)); return h.digest('hex').slice(0, 12); };
function sets() {
  const src = fs.readFileSync(path.join(ROOT, 'src/timeline.js'), 'utf8');
  const durM = src.match(/DUR = ([\d.]+)/); const DUR = +durM[1];
  return [...src.matchAll(/\{ id: '(\w+)', t0: ([\d.]+), t1: ([\w.]+)/g)].map((m) => ({ id: m[1], t0: +m[2], t1: m[3] === 'DUR' ? DUR : +m[3] }));
}
function current() {
  const m = { common: hash(['src/main.js', 'src/lib.js', 'src/timeline.js', 'src/words.js', 'index.html'].map((f) => path.join(ROOT, f))) };
  for (const s of sets()) m[s.id] = hash([...files(path.join(ROOT, 'src/sets', s.id + '.js')), ...files(path.join(ROOT, 'src/sets', s.id))]);
  return m;
}
const saved = () => fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : null;
const nFrames = () => Math.round(Math.max(...sets().map((s) => s.t1)) * FPS);

function renderRange(a, b, jobs) { // quadros [a, b)
  const n = b - a, step = Math.ceil(n / jobs), procs = [];
  for (let j = 0; j < jobs; j++) {
    const f = a + j * step, t = Math.min(b, f + step); if (f >= t) continue;
    procs.push(new Promise((ok, ko) => {
      const p = spawn('node', ['tools/render.cjs', 'frames', '--from', f, '--to', t, '--out', 'out/frames'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
      p.stdout.on('data', (d) => { const s = d.toString(); if (/pageerror|erro|ok em/.test(s)) process.stdout.write(`[${f}-${t}] ` + s); });
      p.on('exit', (c) => (c === 0 ? ok() : ko(new Error('render saiu com ' + c))));
    }));
  }
  return Promise.all(procs);
}
async function patch(ranges) {
  const jobs = +opt('jobs', 2), t0 = Date.now(), N = nFrames();
  ranges = ranges.map(([a, b]) => [Math.max(0, Math.floor(a * FPS)), Math.min(N, Math.ceil(b * FPS))]).filter(([a, b]) => b > a);
  const total = ranges.reduce((s, [a, b]) => s + b - a, 0);
  console.log(`re-renderizando ${total} de ${N} quadros (${(100 * total / N).toFixed(0)}%) em ${ranges.map(([a, b]) => `${(a / FPS).toFixed(1)}–${(b / FPS).toFixed(1)} s`).join(', ')}`);
  for (const [a, b] of ranges) await renderRange(a, b, jobs);
  const tr = (Date.now() - t0) / 1000;
  execFileSync(path.join(ROOT, 'tools/encode.sh'), [opt('mp4', 'out/mundo-por-dentro-ep02.mp4')], { cwd: ROOT, stdio: 'inherit' });
  fs.writeFileSync(MAN, JSON.stringify(current(), null, 1));
  console.log(`pronto: render ${(tr / 60).toFixed(1)} min + encode ${((Date.now() - t0) / 1000 / 60 - tr / 60).toFixed(1)} min`);
}

(async () => {
  const cur = current(), old = saved();
  if (cmd === 'mark') { fs.mkdirSync(FR, { recursive: true }); fs.writeFileSync(MAN, JSON.stringify(cur, null, 1)); return console.log('manifesto gravado', cur); }
  if (cmd === 'range') return patch([[+args[1], +args[2]]]);
  if (!old) return console.log('sem manifesto em out/frames: rode um render completo e depois "node tools/patch.cjs mark"');
  const changed = sets().filter((s) => cur[s.id] !== old[s.id]);
  if (cmd === 'status' || cur.common !== old.common) {
    console.log('cenários alterados:', changed.map((s) => `${s.id} (${s.t0}–${s.t1} s)`).join(', ') || 'nenhum');
    if (cur.common !== old.common) console.log('ATENÇÃO: arquivos comuns mudaram (main/lib/timeline/words/index) — podem afetar o filme todo. Use "range" no trecho que você sabe que mudou, ou faça o render completo.');
    return;
  }
  if (!changed.length) return console.log('nada mudou desde o último render.');
  await patch(changed.map((s) => [s.t0 - MARGIN, s.t1 + MARGIN]));
})().catch((e) => { console.error(e.message); process.exit(1); });
