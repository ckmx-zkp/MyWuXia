import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_PATH = path.join(ROOT, 'Key.txt');
const raw = await fs.readFile(KEY_PATH, 'utf8');
const key = raw.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));

const bases = [
  'https://openspeech.bytedance.com',
  'https://openspeech.bytedance.com/api/v3',
  'https://audio-api.bytedance.com',
  'https://audio-gen.bytedance.com',
  'https://api.volcengine.com'
];

const paths = [
  '/api/v1/audio/generation',
  '/api/v1/audio_gen/generation',
  '/api/v3/audio/generation',
  '/api/v1/audio',
  '/api/v3/audio',
  '/api/v1/audio/submit',
  '/api/v1/doubao/audio/generation',
  '/api/v1/voice/audio_generation'
];

async function probe(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer; ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const txt = await r.text();
    return `HTTP ${r.status} ${txt.slice(0, 200)}`;
  } catch (e) {
    return `NET ${e.message}`;
  }
}

const body = { app: { appid: '000000', token: key, cluster: 'volcano_audio' }, user: { uid: 'x' }, request: { reqid: 'r1', prompt: 'test' } };

for (const base of bases) {
  for (const p of paths) {
    const url = base + p;
    const r = await probe(url, body);
    if (!r.includes('404')) {
      console.log(`!!! ${url} -> ${r}`);
    }
  }
}
console.log('done (only non-404 shown)');