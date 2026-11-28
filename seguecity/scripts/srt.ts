// Gera as legendas .srt de um episódio a partir de words.json (mesmos tempos das legendas na tela).
// Uso: npx tsx scripts/srt.ts [src/scenes/ep01/words.json] [out/seguecity-ep01-final.srt]
// Regras: no máx. 2 linhas de 42 caracteres e ~5,5 s por legenda; partes equilibradas, de preferência na vírgula; frase nunca
// se mistura com a seguinte; a legenda some 0,25 s depois da última palavra (ou quando a próxima começa).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/env';

const [inArg = 'src/scenes/ep01/words.json', outArg = 'out/seguecity-ep01-final.srt'] = process.argv.slice(2);
const data = JSON.parse(readFileSync(path.resolve(ROOT, inArg), 'utf8')) as { frases: { id: string }[]; palavras: { w: string; a: number; b: number; phrase: string }[] };
const MAXL = 42, MAXC = 2 * MAXL;

type W = { w: string; a: number; b: number };
const cues: { a: number; b: number; text: string }[] = [];
const txt = (ws: W[]) => ws.map((x) => x.w).join(' ');
for (const f of data.frases) {
  const ws: W[] = data.palavras.filter((p) => p.phrase === f.id);
  const dur = ws[ws.length - 1].b - ws[0].a, len = txt(ws).length;
  // frase inteira se couber; senão, N partes equilibradas por caracteres, cortando de preferência em vírgula
  const n = len <= MAXC && dur <= 6.5 ? 1 : Math.max(Math.ceil(len / MAXC), Math.ceil(dur / 5.5));
  const cuts: number[] = [];
  for (let k = 1; k < n; k++) {
    const target = (len * k) / n;
    let best = -1, score = Infinity, acc = 0;
    for (let i = 0; i < ws.length - 1; i++) {
      acc += ws[i].w.length + 1;
      const sc = Math.abs(acc - target) - (/,$/.test(ws[i].w) ? 10 : 0);
      if (sc < score && i + 1 > (cuts[cuts.length - 1] ?? 0)) { score = sc; best = i + 1; }
    }
    cuts.push(best);
  }
  [0, ...cuts].forEach((c0, k) => { const part = ws.slice(c0, cuts[k] ?? ws.length); cues.push({ a: part[0].a, b: part[part.length - 1].b, text: lines(txt(part)) }); });
}
for (let k = 0; k < cues.length; k++) cues[k].b = Math.min(cues[k].b + 0.25, cues[k + 1]?.a ?? Infinity);

function lines(s: string): string {
  if (s.length <= MAXL) return s;
  const words = s.split(' ');
  let best = 1, score = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const sc = Math.abs(a.length - b.length) + (a.length > MAXL || b.length > MAXL ? 100 : 0) - (/,$/.test(words[i - 1]) ? 6 : 0);
    if (sc < score) { score = sc; best = i; }
  }
  return words.slice(0, best).join(' ') + '\n' + words.slice(best).join(' ');
}
const ts = (t: number) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
const srt = cues.map((c, k) => `${k + 1}\n${ts(c.a)} --> ${ts(c.b)}\n${c.text}\n`).join('\n');
writeFileSync(path.resolve(ROOT, outArg), srt);
console.log(`${cues.length} legendas → ${outArg}`);
