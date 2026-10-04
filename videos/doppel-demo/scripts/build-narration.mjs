import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// Per-line narration so scene cuts land on exact measured boundaries instead of estimates.
const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'assets', 'vo');
await mkdir(dir, { recursive: true });

const FFPROBE = 'C:\\Users\\ZERO\\AppData\\Local\\Temp\\opencode\\doppel-video-tools\\node_modules\\ffprobe-static\\bin\\win32\\x64\\ffprobe.exe';

const lines = [
  ['01', 'These two Solana addresses are not the same.'],
  ['02', 'Same first four characters. Same last one. Everything a wallet shows you, matching.'],
  ['03', 'That is address poisoning. An attacker sends you a worthless dust transfer from a lookalike address, so it lands in your history. Later, you copy from that history, and pay the attacker.'],
  ['04', 'Doppel checks the recipient before you sign.'],
  ['05', 'Paste the address you are about to pay. Doppel reads real mainnet history over public RPC. No wallet connection, no funds, no signature.'],
  ['06', 'When you have paid someone before, Doppel compares that saved recipient against the address in front of you right now.'],
  ['07', 'Here, the first four and last one characters match, and everything between them does not. Doppel shows the difference, explains the evidence, and blocks the request.'],
  ['08', 'The signing button stays disabled. The wallet is never asked.'],
  ['09', 'Replace it with the address you actually confirmed, and the check clears. On devnet, the payment goes through normally.'],
  ['10', 'Doppel also monitors saved recipients. This is real captured mainnet history, labelled as historical, never shown as live activity. For this wallet it reports zero findings, which is the honest result.'],
  ['11', 'Doppel is open source, and it runs on free public RPC with no API key.'],
  ['12', 'Check the recipient before you sign.'],
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

// Lay lines end to end with a deliberate breath gap so narration never clips a cut.
const GAP = 0.45;
let cursor = 1.0;
const timeline = results.map((line) => {
  const entry = { ...line, start: Number(cursor.toFixed(3)) };
  cursor += line.duration + GAP;
  return entry;
});

const total = Number((cursor - GAP).toFixed(3));
await writeFile(path.join(root, 'assets', 'vo', 'timeline.json'), JSON.stringify({ gap: GAP, voiceEnd: total, lines: timeline }, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, voiceEnd: total, lines: timeline.length }));
