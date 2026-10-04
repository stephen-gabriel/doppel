import { readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
await copyFile(path.join(root, 'node_modules/gsap/dist/gsap.min.js'), path.join(root, 'assets/gsap.min.js'));
const rules = JSON.parse(await readFile(path.join(root, 'assets/font-rules.json'), 'utf8'));
for (const [name, family] of [['bricolage','Bricolage Grotesque'], ['mono','JetBrains Mono']]) {
  const rule = rules.find(r => r.includes(`"${family}"`) && r.includes('U+0-FF'));
  const file = /url\(["']?([^\)"']+)/.exec(rule)?.[1].split('/').pop();
  const response = await fetch(`http://localhost:3000/_next/static/media/${file}`);
  if (!response.ok) throw new Error(`Font unavailable: ${file}`);
  await writeFile(path.join(root, `assets/${name}.woff2`), Buffer.from(await response.arrayBuffer()));
}
await copyFile(path.join(root,'narration.wav'),path.join(root,'assets/narration.wav'));
// Original 24-second ambient cue: four sustained chord voicings + restrained 80bpm plucks.
const sr=44100, duration=24, n=sr*duration;
const wav=Buffer.alloc(44+n*4);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);
wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(sr,24);wav.writeUInt32LE(sr*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*4,40);
const chords=[[130.8128,195.9977,246.9417,293.6648],[110,164.8138,220,261.6256],[87.3071,130.8128,174.6141,220],[97.9989,146.8324,195.9977,246.9417]];
for(let i=0;i<n;i++){
  const t=i/sr;let left=0,right=0;
  for(let c=0;c<4;c++){
    const local=t-c*6;if(local<0||local>7)continue;
    const env=Math.min(1,local/1.3)*Math.min(1,(7-local)/1.5)*0.032;
    chords[c].forEach((f,k)=>{left+=env*Math.sin(2*Math.PI*f*t+k*.4);right+=env*Math.sin(2*Math.PI*(f+.12)*t+k*.4);});
  }
  const beat=Math.floor(t/.75),phase=t-beat*.75;
  const f=chords[Math.min(3,Math.floor(t/6))][beat%4]*2;
  const pluck=.025*Math.exp(-phase*8)*Math.sin(2*Math.PI*f*phase);
  const fade=Math.min(1,t/1.5)*Math.min(1,(duration-t)/2.5);
  wav.writeInt16LE(Math.round(Math.tanh((left+pluck)*fade)*32767),44+i*4);
  wav.writeInt16LE(Math.round(Math.tanh((right+pluck*.8)*fade)*32767),46+i*4);
}
await writeFile(path.join(root,'assets/music-original.wav'),wav);
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
const metadata={};
for(const file of ['home.png','payment-form.png','twin-mismatch.png','result-mismatch.png','blocked-button.png']){
  const buffer=await readFile(path.join(root,'assets',file));
  metadata[file]=await page.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();return {width:img.naturalWidth,height:img.naturalHeight};},`data:image/png;base64,${buffer.toString('base64')}`);
}
await browser.close();await writeFile(path.join(root,'assets/dimensions.json'),JSON.stringify(metadata,null,2));
console.log(JSON.stringify(metadata,null,2));
