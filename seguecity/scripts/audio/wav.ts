// Leitura e escrita de WAV PCM 16 bits estéreo (cabeçalho fixo, sem metadados: saída byte a byte idêntica).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { SR, Stereo } from './dsp';

export function encodeWav16(s: Stereo): Buffer {
  const ch = 2;
  const bytes = s.n * ch * 2;
  const b = Buffer.alloc(44 + bytes);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(36 + bytes, 4);
  b.write('WAVE', 8, 'ascii');
  b.write('fmt ', 12, 'ascii');
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(ch, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * ch * 2, 28);
  b.writeUInt16LE(ch * 2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36, 'ascii');
  b.writeUInt32LE(bytes, 40);
  let o = 44;
  let clipped = 0;
  for (let i = 0; i < s.n; i++) {
    for (const x of [s.L[i], s.R[i]]) {
      let v = Math.round(x * 32767);
      if (v > 32767) {
        v = 32767;
        clipped++;
      } else if (v < -32768) {
        v = -32768;
        clipped++;
      }
      b.writeInt16LE(v, o);
      o += 2;
    }
  }
  if (clipped > 0) console.warn(`  ! ${clipped} amostras saturadas na conversão para 16 bits`);
  return b;
}

export function writeWav16(path: string, s: Stereo): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodeWav16(s));
}

/** lê WAV PCM 16 bits (mono ou estéreo) para Stereo em [-1, 1) */
export function readWav16(path: string): { s: Stereo; sr: number; ch: number } {
  const b = readFileSync(path);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${path}: não é WAV`);
  let o = 12;
  let ch = 2;
  let sr = SR;
  let bits = 16;
  let dataOff = -1;
  let dataLen = 0;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4);
    const len = b.readUInt32LE(o + 4);
    if (id === 'fmt ') {
      ch = b.readUInt16LE(o + 10);
      sr = b.readUInt32LE(o + 12);
      bits = b.readUInt16LE(o + 22);
    } else if (id === 'data') {
      dataOff = o + 8;
      dataLen = len;
      break;
    }
    o += 8 + len + (len & 1);
  }
  if (bits !== 16 || dataOff < 0) throw new Error(`${path}: esperado PCM 16 bits`);
  const n = Math.floor(dataLen / (2 * ch));
  const s = new Stereo(n);
  for (let i = 0; i < n; i++) {
    const l = b.readInt16LE(dataOff + (i * ch) * 2) / 32768;
    const r = ch > 1 ? b.readInt16LE(dataOff + (i * ch + 1) * 2) / 32768 : l;
    s.L[i] = l;
    s.R[i] = r;
  }
  return { s, sr, ch };
}
