import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

// Per-line narration so scene cuts land on exact measured boundaries instead of estimates.
const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'assets', 'vo');
await mkdir(dir, { recursive: true });

// ffprobe only measures the wavs this script generates. Resolve it from $FFPROBE, then a
// local ffprobe-static / @ffprobe-installer install, then PATH - so the build never depends
// on one machine's temp directories.
const require = createRequire(import.meta.url);
const ffprobeCandidates = [];
if (process.env.FFPROBE) ffprobeCandidates.push(process.env.FFPROBE);
for (const spec of ['ffprobe-static', '@ffprobe-installer/ffprobe']) {
  try {
    const mod = require(spec);
    const bin = typeof mod === 'string' ? mod : mod?.path ?? mod?.default?.path;
    if (bin) ffprobeCandidates.push(bin);
  } catch {
    // not installed here; fall through to the next candidate
  }
}
ffprobeCandidates.push(process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');

const FFPROBE = (() => {
  for (const bin of ffprobeCandidates) {
    try {
      execFileSync(bin, ['-version'], { stdio: 'ignore' });
      return bin;
    } catch {
      // unusable; try the next candidate
    }
  }
  throw new Error(
    `ffprobe not found. Install it (npm i -D ffprobe-static) or set FFPROBE to its full path. Tried: ${ffprobeCandidates.join(', ')}`
  );
})();

const lines = [
  ['01', 'Anyone can put an address into your wallet history.'],
  ['02', "An attacker grinds a vanity address matching the first and last characters of someone you've paid. Then sends worthless dust, so the fake appears in your history, right next to the real one."],
  ['03', 'Now it just has to wait for you to copy it.'],
  ['04', 'Vanity address generation used to be theoretical. Grinding services made it a commodity. And copying from history became how most people send a repeat payment. Solana base58 addresses are case-sensitive and unchecksummed. Easy to miss one character.'],
  ['05', "Here's what I noticed. Wallet history is attacker-writable. Anyone can send you dust and place an address there. So transaction history isn't proof of anything."],
  ['06', "Verification has to come from somewhere the attacker can't write to."],
  ['07', 'Doppel keeps an address book of recipients you independently confirmed. When you enter an address to pay, it compares against that book and shows you exactly which characters match and which differ, before your wallet is asked to sign.'],
  ['08', 'Unresolved history? The payment is blocked.'],
  ['09', 'Mainnet is strictly read-only. No funds, no signing, no risk. The only write path is a devnet demo.'],
  ['10', "It ships three ways. A reference web app. An SDK and widget you can drop into your own product. And a monitor that watches your saved recipients for new activity."],
  ['11', 'I built this solo. I found it by paying attention to something most wallets treat as trustworthy. I designed the threat model, the verification model, and every safety boundary.'],
  ['12', "It's early. Zero users, zero revenue. But every repeat payment makes this risk real for someone. And the check costs nothing to run."],
];

const results = [];
for (const [id, text] of lines) {
  const txt = path.join(dir, `line-${id}.txt`);
  const wav = path.join(dir, `line-${id}.wav`);
  await writeFile(txt, text + '\n');
  execFileSync('npx', ['hyperframes', 'tts', '--text-file', txt, '--voice', 'af_heart', '--speed', '0.9', '--output', wav, '--json'], {
    cwd: root, stdio: 'pipe', shell: true,
  });
  const probe = execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], { encoding: 'utf8' });
  const duration = Number(probe.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`bad duration for line ${id}`);
  results.push({ id, text, duration: Number(duration.toFixed(3)) });
  console.log(`line-${id}  ${duration.toFixed(3)}s`);
}

// Lay lines end to end. Scene 05 gets a longer breath before it: that is the turn of the
// video, and the pause is the point.
const GAP = 0.45;
const LEAD = 0.9;
const PRE_TURN_BREATH = 1.1;
let cursor = LEAD;
const timeline = results.map((line, i) => {
  const entry = { ...line, start: Number(cursor.toFixed(3)) };
  cursor += line.duration + (i === 3 ? PRE_TURN_BREATH : GAP);
  return entry;
});

const voiceEnd = Number((cursor - GAP).toFixed(3));
const CAP = 116, MAX_VOICE = 113;
if (voiceEnd > MAX_VOICE) {
  throw new Error(`narration runs to ${voiceEnd}s, too close to the ${CAP}s cap — trim copy before rendering`);
}
await writeFile(path.join(dir, 'timeline.json'), JSON.stringify({ gap: GAP, lead: LEAD, voiceEnd, lines: timeline }, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, voiceEnd, lines: timeline.length, headroom: CAP - voiceEnd }));
