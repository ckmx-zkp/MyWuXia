import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_PATH = path.join(ROOT, 'Key.txt');
const OUT_DIR = path.join(ROOT, 'public', 'audio', 'bgm', 'zone');
const API_BASE = (process.env.MINIMAX_API_BASE ?? 'https://api.minimax.io').replace(/\/$/, '');
const MODEL = process.env.MINIMAX_MODEL ?? 'music-3.0-free';
const CONCURRENCY = Number(process.env.MINIMAX_CONCURRENCY ?? (MODEL.endsWith('-free') ? 1 : 4));
const RETRY = Number(process.env.MINIMAX_RETRY ?? 3);
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const SAMPLE_RATE = Number(process.env.MINIMAX_SAMPLE_RATE ?? 44100);
const BITRATE = Number(process.env.MINIMAX_BITRATE ?? 256000);
const FORMAT = process.env.MINIMAX_FORMAT ?? 'mp3';

const REGIONS = [
  { id: 'T01', slug: 'jiangnan-rain', title: '江南烟雨', mode: 'A yu', bpm: 64, prompt: 'Ancient Chinese Jiangnan, rainy night over Suzhou gardens. Guqin arpeggio with xiao flute counter-melody, pipa arpeggios, soft erhu sustain, distant water sounds, A yu pentatonic, 64 BPM, melancholic and restrained, no percussion, instrumental loopable, loop length 90 seconds, leave 20% center silence for narration.' },
  { id: 'T02', slug: 'jingxiang-drum', title: '荆襄鼓角', mode: 'G zhi to A yu', bpm: 92, prompt: 'Ancient Chinese war, Xiangyang siege atmosphere. Chinese war suona fanfare intro then drops to marching rhythm with tanggu drum and bangu clapper, mixed with mournful xiao, G zhi shifting to A yu, 92 BPM, tense and heroic, instrumental, 90 seconds, leave 20% center silence.' },
  { id: 'T03', slug: 'zhongyuan-huimeng', title: '中原会盟', mode: 'D shang', bpm: 70, prompt: 'Ancient Chinese central plains, Luoyang martial arts gathering. Solo guzheng melody with pipa tremolo, D shang pentatonic, grand but measured, light wooden fish pulse, 70 BPM, instrumental, 90 seconds, leave 20% center silence.' },
  { id: 'T04', slug: 'yan-yun-shuangfeng', title: '燕云霜风', mode: 'E jiao', bpm: 66, prompt: 'Ancient northern China frontier, Yan Yun Sixteen States winter. Low octave erhu with morin khuur-like bowed strings, cold wind ambience, distant horse hooves, E jiao mode, 66 BPM, melancholic and proud, no drums, instrumental, 90 seconds, leave 20% center silence.' },
  { id: 'T05', slug: 'saibei-changdiao', title: '塞北长调', mode: 'B zhi', bpm: 72, prompt: 'Ancient Mongolian steppe, vast grassland. Morin khuur solo melody with overtone flute throat singing imitation, horse bells in distance, B zhi mode, 72 BPM, heroic wandering mood, no percussion, instrumental, 90 seconds, leave 20% center silence.' },
  { id: 'T06', slug: 'liaodong-tieqi', title: '辽东铁骑', mode: 'G gong', bpm: 88, prompt: 'Ancient Jin dynasty cavalry, Liaodong frozen plains march. Heavy Chinese war drums intro, suona blasts, G gong mode, harsh winter march, 88 BPM, dark and powerful, instrumental, 90 seconds, ends with single drum hit, leave 20% center silence.' },
  { id: 'T07', slug: 'baishan-milin', title: '白山密林', mode: 'A yu', bpm: 60, prompt: 'Ancient Manchurian forest, spy sneaking through dark pines. Low xiao with shamanic frame drum and wooden clapper, eerie atonal slides, A yu mode, 60 BPM, sparse percussion, instrumental, 90 seconds, leave 20% center silence.' },
  { id: 'T08', slug: 'xixia-shahai', title: '西夏沙海', mode: 'E jiao raised4', bpm: 78, prompt: 'Ancient Silk Road, Western Xia desert oasis. Middle eastern pipa imitation with rawap-like lute, exotic xiao counter melody, distant camel caravan bells, E jiao mode with raised 4th, 78 BPM, mysterious Silk Road mood, instrumental, 90 seconds, leave 20% center silence.' },
  { id: 'T09', slug: 'guanzhong-jianqi', title: '关中剑气', mode: 'D shang', bpm: 68, prompt: 'Ancient Huashan sword test, Guanzhong archaic mood. Solo guqin with qinqiang-style high male voice ahh vowel imitation by erhu harmonics, D shang mode, 68 BPM, archaic and sharp, instrumental, 90 seconds, leave 20% center silence.' },
  { id: 'T10', slug: 'bashu-zhandao', title: '巴蜀栈道', mode: 'B zhi', bpm: 72, prompt: 'Ancient Sichuan mountain plank road, misty cloud forest. Bamboo dizi with lusheng imitation, mountain wind ambience, B zhi mode, 72 BPM, light and ethereal, instrumental, 90 seconds, leave 20% center silence.' },
  { id: 'T11', slug: 'yungui-chama', title: '云贵茶马', mode: 'D shang', bpm: 76, prompt: 'Ancient Yunnan-Guizhou tea horse caravan, humid misty hills. Hulusi and lusheng duet, mid-rhythm pipa accompaniment, D shang mode, 76 BPM, warm and humid, no heavy drums, instrumental, 90 seconds, leave 20% center silence.' },
  { id: 'T12', slug: 'dali-fanyin', title: '大理梵音', mode: 'A yu', bpm: 52, prompt: 'Ancient Dali Buddhist temple, peaceful and transcendent. Temple bronze bell loop with xiao flute and soft male buddhist chant imitation, A yu mode, 52 BPM, very spacious, instrumental, 90 seconds, leave 20% center silence.' },
  { id: 'T13', slug: 'donghai-cangbo', title: '东海沧波', mode: 'G gong to A yu', bpm: 64, prompt: 'Ancient East China Sea, lonely island with waves. Dizi melody over recorded ocean waves, guqin harmonics, G gong to A yu modulation, 64 BPM, no drums, instrumental, 90 seconds, leave 20% center silence.' }
];

async function loadKey() {
  const raw = await fs.readFile(KEY_PATH, 'utf8');
  const line = raw.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));
  if (!line) throw new Error(`Key.txt is empty. Put MINIMAX_API_KEY=... or the raw key on one line.`);
  if (line.includes('=')) {
    const v = line.split('=', 2)[1].trim().replace(/^["']|["']$/g, '');
    if (!v) throw new Error(`Empty value in KEY=... line of Key.txt`);
    return v;
  }
  return line;
}

function buildBody(track) {
  return {
    model: MODEL,
    prompt: track.prompt,
    is_instrumental: true,
    output_format: 'url',
    stream: false,
    audio_setting: {
      sample_rate: SAMPLE_RATE,
      bitrate: BITRATE,
      format: FORMAT
    }
  };
}

async function generate(track, key) {
  const url = `${API_BASE}/v1/music_generation`;
  const body = buildBody(track);
  let lastErr;
  for (let attempt = 1; attempt <= RETRY; attempt++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      lastErr = new Error(`HTTP ${r.status} ${txt.slice(0, 300)}`);
      if (r.status === 429 || r.status >= 500) {
        await new Promise(res => setTimeout(res, 2000 * attempt));
        continue;
      }
      throw lastErr;
    }
    const data = await r.json();
    const br = data?.base_resp;
    if (br && br.status_code !== 0) {
      if (br.status_code === 1002) {
        await new Promise(res => setTimeout(res, 3000 * attempt));
        lastErr = new Error(`rate-limited ${br.status_code}: ${br.status_msg}`);
        continue;
      }
      throw new Error(`api ${br.status_code}: ${br.status_msg}`);
    }
    if (data?.data?.status !== 2 || !data?.data?.audio) {
      throw new Error(`unexpected response: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return data.data.audio;
  }
  throw lastErr ?? new Error('retry exhausted');
}

async function writeAudio(audio, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  if (audio.startsWith('http://') || audio.startsWith('https://')) {
    const r = await fetch(audio);
    if (!r.ok) throw new Error(`download ${audio} HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    await fs.writeFile(dest, buf);
    return buf.length;
  }
  const buf = Buffer.from(audio, 'hex');
  await fs.writeFile(dest, buf);
  return buf.length;
}

async function exists(p) {
  try { const s = await fs.stat(p); return s.size > 0; } catch { return false; }
}

async function runOne(track, key, outDir) {
  const dest = path.join(outDir, `${track.id}-${track.slug}.${FORMAT}`);
  if (await exists(dest)) {
    console.log(`[skip] ${track.id} ${track.title} (exists)`);
    return { track, status: 'skip' };
  }
  process.stdout.write(`[gen ] ${track.id} ${track.title} ... `);
  if (DRY_RUN) {
    console.log('dry-run');
    return { track, status: 'dry' };
  }
  try {
    const audio = await generate(track, key);
    const bytes = await writeAudio(audio, dest);
    console.log(`ok (${(bytes / 1024).toFixed(1)} KB)`);
    return { track, status: 'ok', path: dest };
  } catch (e) {
    console.log(`fail: ${e.message}`);
    return { track, status: 'fail', error: e.message };
  }
}

async function main() {
  const key = await loadKey();
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`[bgm] output dir : ${path.relative(ROOT, OUT_DIR)}`);
  console.log(`[bgm] api base   : ${API_BASE}`);
  console.log(`[bgm] model      : ${MODEL}`);
  console.log(`[bgm] audio fmt  : ${FORMAT} ${SAMPLE_RATE}Hz ${BITRATE / 1000}kbps`);
  console.log(`[bgm] tracks     : ${REGIONS.length}`);
  console.log(`[bgm] concurrency: ${CONCURRENCY}`);
  console.log(`[bgm] mode       : ${DRY_RUN ? 'dry-run' : 'live'}`);

  const queue = ONLY.length ? REGIONS.filter(t => ONLY.includes(t.id)) : REGIONS;
  if (ONLY.length) console.log(`[bgm] --only      : ${ONLY.join(', ')} (${queue.length}/${REGIONS.length})`);

  let cursor = 0;
  const tasks = queue.map(t => () => runOne(t, key, OUT_DIR));
  const workerCount = DRY_RUN ? 1 : CONCURRENCY;
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= tasks.length) return;
      await tasks[i]();
    }
  });
  await Promise.all(workers);

  console.log('[bgm] done');
}

main().catch(e => { console.error('[bgm] fatal:', e.message); process.exit(1); });