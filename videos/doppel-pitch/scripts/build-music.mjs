import { writeFile } from 'node:fs/promises';
import path from 'node:path';

// Original 116-second ambient bed: slow sustained chord voicings plus a restrained pluck.
// Same harmonic language as the demo cue, extended to fill the pitch video's full runtime.
const root = path.resolve(import.meta.dirname, '..');
const sr = 44100, duration = 116, n = sr * duration;

const wav = Buffer.alloc(44 + n * 4);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
wav.write('fmt ', 12); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(sr, 24);
wav.writeUInt32LE(sr * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(n * 4, 40);

// Cm - Ab - Fm - Gm voicings, cycled; 7.5s per chord with 1.5s overlap keeps motion without seams.
const chords = [
  [130.8128, 195.9977, 246.9417, 293.6648],
  [110.0000, 164.8138, 220.0000, 261.6256],
  [87.3071, 130.8128, 174.6141, 220.0000],
  [97.9989, 146.8324, 195.9977, 246.9417],
];
const CHORD_LEN = 7.5, CHORD_HOLD = 9.0;
const slots = Math.ceil(duration / CHORD_LEN) + 1;

for (let i = 0; i < n; i++) {
  const t = i / sr;
  let left = 0, right = 0;
  for (let s = 0; s < slots; s++) {
    const local = t - s * CHORD_LEN;
    if (local < 0 || local > CHORD_HOLD) continue;
    const env = Math.min(1, local / 1.6) * Math.min(1, (CHORD_HOLD - local) / 1.8) * 0.030;
    const voicing = chords[s % 4];
    for (let k = 0; k < voicing.length; k++) {
      const f = voicing[k];
      left += env * Math.sin(2 * Math.PI * f * t + k * 0.4);
      right += env * Math.sin(2 * Math.PI * (f + 0.12) * t + k * 0.4);
    }
  }
  const beat = Math.floor(t / 0.75), phase = t - beat * 0.75;
  const voicing = chords[Math.floor(t / CHORD_LEN) % 4];
  const f = voicing[beat % 4] * 2;
  // Thin the pluck out once the argument starts so narration-heavy scenes stay clear.
  const pluckGain = t > 50 ? 0.015 : 0.022;
  const pluck = pluckGain * Math.exp(-phase * 8) * Math.sin(2 * Math.PI * f * phase);
  const fade = Math.min(1, t / 2.0) * Math.min(1, (duration - t) / 4.0);
  wav.writeInt16LE(Math.round(Math.tanh((left + pluck) * fade) * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(Math.tanh((right + pluck * 0.8) * fade) * 32767), 46 + i * 4);
}

await writeFile(path.join(root, 'assets/music-original.wav'), wav);
console.log(JSON.stringify({ ok: true, seconds: duration, bytes: wav.length }));
