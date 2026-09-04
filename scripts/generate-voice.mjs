import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_PATH = path.join(ROOT, 'Key.txt');
const OUT_DIR = path.join(ROOT, 'public', 'audio', 'voice');
const API_BASE = (process.env.MINIMAX_API_BASE ?? 'https://api.minimax.chat').replace(/\/$/, '');
const MODEL = process.env.MINIMAX_MODEL ?? 'speech-2.8-turbo';
const CONCURRENCY = Number(process.env.MINIMAX_CONCURRENCY ?? 1);
const RETRY = Number(process.env.MINIMAX_RETRY ?? 3);
const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const SAMPLE_RATE = Number(process.env.MINIMAX_SAMPLE_RATE ?? 32000);
const BITRATE = Number(process.env.MINIMAX_BITRATE ?? 128000);
const FORMAT = process.env.MINIMAX_FORMAT ?? 'mp3';

const VOICE = {
  narrator:        { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  duan_yu:         { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  zhong_ling:      { voice_id: 'female-shaonv',      speed: 1.05, pitch: 2, vol: 1.0 },
  zuo_zimu:        { voice_id: 'male-qn-jingying',   speed: 0.95, pitch: -1, vol: 1.0 },
  si_kong_xuan:    { voice_id: 'male-qn-badao',      speed: 0.9,  pitch: -3, vol: 1.1 },
  zhu_cong:        { voice_id: 'male-qn-jingying',   speed: 1.1,  pitch: 1, vol: 1.0 },
  ke_zhen_e:       { voice_id: 'male-qn-badao',      speed: 0.9,  pitch: -2, vol: 1.0 },
  qiu_chu_ji:      { voice_id: 'male-qn-jingying',   speed: 1.0,  pitch: -1, vol: 1.0 },
  wei_xiaobao:     { voice_id: 'male-qn-qingse',     speed: 1.15, pitch: 3, vol: 1.0 },
  mao_shi_ba:      { voice_id: 'male-qn-badao',      speed: 0.95, pitch: -2, vol: 1.0 },
  shi_song:        { voice_id: 'male-qn-jingying',   speed: 0.95, pitch: -2, vol: 1.0 },
  innkeeper:       { voice_id: 'male-qn-qingse',     speed: 1.0,  pitch: 0, vol: 1.0 },
  tea_passer:      { voice_id: 'male-qn-jingying',   speed: 1.0,  pitch: 0, vol: 1.0 }
};

const DIALOGUES = [
  { id: 'DL-01_Q01_duan_yu',       role: 'duan_yu',      source: 'DL-01',     text: '妙极，妙极！明明是自己重心不稳向前跌了个趔趄，偏要叫什么顺水推舟。若对手反手撩剑自下而上，他自己岂不是撞到剑尖上送死？' },
  { id: 'DL-01_Q02_zhong_ling',    role: 'zhong_ling',   source: 'DL-01',     text: '你们无量剑派的剑法本就破绽百出，这位呆哥哥实话实说，你们恼羞成怒还要杀人，真是不害臊！' },
  { id: 'DL-01_Q01_zuo_zimu',      role: 'zuo_zimu',     source: 'DL-01',     text: '哪来的狂妄小辈！本门立宗百年剑法，岂容你这手无缚鸡之力的后生在此胡言乱语？左右，给我拿下！' },
  { id: 'DL-01_Q05_si_kong_xuan',  role: 'si_kong_xuan', source: 'DL-01',     text: '抓紧调配断肠散！灵鹫宫的天山童姥给老夫下的生死符只剩半月就要发作。若夺不下剑湖宫后山的奇草续命，老夫要让这满山上下死得干干净净！' },
  { id: 'DL-01_inn_innkeeper',     role: 'innkeeper',    source: 'DL-01',     text: '客官您打听无量山？哎哟，最近可别往剑湖宫凑！那东西两宗五年一度争夺山洞的比武就在这两日。听说无量剑派的左掌门脾气大得很，连外地的行脚商在山道上多看两眼都要被轰走。' },

  { id: 'JX-01_Q01_zhu_cong',      role: 'zhu_cong',     source: 'JX-01',     text: '哎哟哟！这位小哥恕罪，小生昨夜多饮了两杯，一时失足失足！多有得罪，多有得罪！' },
  { id: 'JX-01_Q03_ke_zhen_e',     role: 'ke_zhen_e',    source: 'JX-01',     text: '丘道长好大的煞气！出家人动辄喊打喊杀，倒比绿林好汉还要威风！我江南七怪在此，你这钟酒，我们喝得下！' },
  { id: 'JX-01_Q03_qiu_chu_ji',    role: 'qiu_chu_ji',   source: 'JX-01',     text: '贫道自北方千里追凶，焦木和尚藏匿大奸大恶，贫道本欲一把火烧了法华寺！' },
  { id: 'JX-01_inn_tea_passer',    role: 'tea_passer',   source: 'JX-01',     text: '你听说没有？南湖边上那座三层的醉仙楼被人整整包了三天！楼上时不时飘出一股焦味和酒香。昨天黄昏，我亲眼看见七个怪模怪样的人扛着铜缸、扁担、秤砣进了楼。' },

  { id: 'YZ-01_Q01_wei_xiaobao',   role: 'wei_xiaobao',  source: 'YZ-01',     text: '哎哟喂！两位大爷明察秋毫！小的哪敢出千？分明是关二爷显灵！要不小的把赢的钱全孝敬您二位买酒喝？' },
  { id: 'YZ-01_Q03_shi_song',      role: 'shi_song',     source: 'YZ-01',     text: '茅十八，你逃了三千里，今日扬州便是你的葬身之地！识相的交出天地会逆贼名册，本官留你一个全尸！' },
  { id: 'YZ-01_Q02_mao_shi_ba',    role: 'mao_shi_ba',   source: 'YZ-01',     text: '老子杀的是逼良为娼的八旗鹰犬，砍的是欺压汉民的满清官差！若是贪生怕死之徒，一刀剁了我去领赏！' },
  { id: 'YZ-01_inn_innkeeper',     role: 'innkeeper',    source: 'YZ-01',     text: '客官打外地来？那可得护好您的腰包！西街丽春院那带最不消停，那院里韦春花的半大儿子叫小宝的，机灵鬼透顶，成天跟赌场那帮光棍混在一起。' }
];

async function loadKey() {
  const raw = await fs.readFile(KEY_PATH, 'utf8');
  const line = raw.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));
  if (!line) throw new Error(`Key.txt is empty.`);
  if (line.includes('=')) {
    const v = line.split('=', 2)[1].trim().replace(/^["']|["']$/g, '');
    if (!v) throw new Error(`Empty value in KEY=... line`);
    return v;
  }
  return line;
}

function buildBody(d) {
  const v = VOICE[d.role];
  return {
    model: MODEL,
    text: d.text,
    stream: false,
    output_format: 'url',
    voice_setting: {
      voice_id: v.voice_id,
      speed: v.speed,
      vol: v.vol,
      pitch: v.pitch
    },
    audio_setting: {
      sample_rate: SAMPLE_RATE,
      bitrate: BITRATE,
      format: FORMAT,
      channel: 1
    }
  };
}

async function synthesize(d, key) {
  const url = `${API_BASE}/v1/t2a_v2`;
  const body = buildBody(d);
  let lastErr;
  for (let attempt = 1; attempt <= RETRY; attempt++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      lastErr = new Error(`HTTP ${r.status} ${txt.slice(0, 250)}`);
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
      throw new Error(`unexpected response: ${JSON.stringify(data).slice(0, 250)}`);
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

async function runOne(d, key, outDir) {
  const dest = path.join(outDir, `${d.id}.${FORMAT}`);
  if (await exists(dest)) {
    console.log(`[skip] ${d.id} (exists)`);
    return { id: d.id, status: 'skip' };
  }
  process.stdout.write(`[gen ] ${d.id} (${d.role}) ... `);
  if (DRY_RUN) {
    console.log('dry-run');
    return { id: d.id, status: 'dry' };
  }
  try {
    const audio = await synthesize(d, key);
    const bytes = await writeAudio(audio, dest);
    console.log(`ok (${(bytes / 1024).toFixed(1)} KB)`);
    return { id: d.id, status: 'ok', path: dest };
  } catch (e) {
    console.log(`fail: ${e.message}`);
    return { id: d.id, status: 'fail', error: e.message };
  }
}

async function main() {
  const key = await loadKey();
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`[tts] output dir : ${path.relative(ROOT, OUT_DIR)}`);
  console.log(`[tts] api base   : ${API_BASE}`);
  console.log(`[tts] model      : ${MODEL}`);
  console.log(`[tts] audio fmt  : ${FORMAT} ${SAMPLE_RATE}Hz ${BITRATE / 1000}kbps mono`);
  console.log(`[tts] dialogues  : ${DIALOGUES.length}`);

  const queue = ONLY.length ? DIALOGUES.filter(d => ONLY.includes(d.id)) : DIALOGUES;
  if (ONLY.length) console.log(`[tts] --only      : ${ONLY.join(', ')} (${queue.length}/${DIALOGUES.length})`);

  let cursor = 0;
  const tasks = queue.map(d => () => runOne(d, key, OUT_DIR));
  const workers = Array.from({ length: DRY_RUN ? 1 : CONCURRENCY }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= tasks.length) return;
      await tasks[i]();
    }
  });
  await Promise.all(workers);
  console.log('[tts] done');
}

main().catch(e => { console.error('[tts] fatal:', e.message); process.exit(1); });