import { createWorldEngine } from './game/world-engine.js';
import { saveOptions } from './game/save-schema.js';
import { ZONES } from './content/world.js';
import { QUEST_COMBATS, OPPONENTS } from './content/combat.js';
import CombatPanel, { LoadoutEditor } from './features/combat/CombatPanel.jsx';
import SavePanel from './features/saves/SavePanel.jsx';
import { startCombat, retreatCombat } from './game/combat.js';
import { SAVE_KEY, readSave, writeSave, clearAutoSave } from './game/saves.js';
import { initial } from './game/state.js';
import { SKILLS, START_SKILLS } from './content/martial.js';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { createIdleRuntime } from './game/idle-runtime.js';
import { canResolveChoice } from './game/quest-guards.js';

/* ================= 音效（复用 Audio，避免每次点击新建） ================= */
const SOUND = { click: '/audio/wood-pluck.wav', quest: '/audio/quest-complete.wav', bell: '/audio/breath-bell.wav' };
const sfxPool = {};
function play(src, mute) {
  if (mute) return;
  try {
    let a = sfxPool[src];
    if (!a) { a = new Audio(src); a.volume = 1.0; sfxPool[src] = a; }
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch (e) { /* 浏览器未解锁音频时忽略 */ }
}

/* ================= BGM：13 区主题曲（docs/gdd/05，切区交叉淡化） ================= */
const BGM = [
  '/audio/bgm/zone/T01-jiangnan-rain.mp3', '/audio/bgm/zone/T02-jingxiang-drums.mp3',
  '/audio/bgm/zone/T03-zhongyuan-meet.mp3', '/audio/bgm/zone/T04-yanyun-frost.mp3',
  '/audio/bgm/zone/T05-saibei-longsong.mp3', '/audio/bgm/zone/T06-liaodong-cavalry.mp3',
  '/audio/bgm/zone/T07-baishan-forest.mp3', '/audio/bgm/zone/T08-xixia-desert.mp3',
  '/audio/bgm/zone/T09-guanzhong-sword.mp3', '/audio/bgm/zone/T10-bashu-plankroad.mp3',
  '/audio/bgm/zone/T11-yungui-teahorse.mp3', '/audio/bgm/zone/T12-dali-chant.mp3',
  '/audio/bgm/zone/T13-donghai-waves.mp3',
];
const BGM_VOLUME = 0.5;
let bgmCur = null;   // 当前播放的 Audio
let bgmSrc = null;   // 当前曲目路径
function fadeTo(a, target, ms, done) {
  const step = 50, dv = (target - a.volume) / (ms / step);
  const t = setInterval(() => {
    a.volume = Math.max(0, Math.min(1, a.volume + dv));
    if ((dv > 0 && a.volume >= target) || (dv < 0 && a.volume <= target)) {
      clearInterval(t);
      if (done) done();
    }
  }, step);
}
function bgmSwitch(zoneIdx, mute) {
  try {
    const src = BGM[zoneIdx];
    if (mute) { if (bgmCur) bgmCur.pause(); return; }
    if (bgmSrc === src) {
      /* 同曲：首次自动播放被拦截或暂停时恢复，并补淡入（修复音量停在 0 的问题） */
      if (bgmCur) {
        if (bgmCur.paused) bgmCur.play().catch(() => {});
        if (bgmCur.volume < BGM_VOLUME) fadeTo(bgmCur, BGM_VOLUME, 800);
      }
      return;
    }
    bgmSrc = src;
    if (bgmCur) { const old = bgmCur; fadeTo(old, 0, 400, () => { old.pause(); old.src = ''; }); }
    const next = new Audio(src);
    next.loop = true;
    next.volume = 0;
    next.play().then(() => fadeTo(next, BGM_VOLUME, 1200)).catch(() => { /* 首次交互前被浏览器拦截，下次点击重试 */ });
    bgmCur = next;
  } catch (e) { /* 忽略 */ }
}

/* ================= 语音（docs/gdd/05：对白期间 BGM duck；多句按序连播） ================= */
let voiceCur = null;
let voiceGen = 0;
let voiceLineCb = null;
const VOICE_GAP = 420;
function setVoiceLine(i) { if (voiceLineCb) voiceLineCb(i); }
function haltVoice() {
  voiceGen += 1;
  if (voiceCur) {
    try { voiceCur.onended = null; voiceCur.onerror = null; voiceCur.pause(); } catch (e) { /* 忽略 */ }
    voiceCur = null;
  }
}
function stopVoice() {
  haltVoice();
  setVoiceLine(-1);
  if (bgmCur && !bgmCur.paused) fadeTo(bgmCur, BGM_VOLUME, 600);
}
function playVoiceQueue(srcs, mute, lineAt) {
  const list = (srcs || []).filter(Boolean);
  if (mute || !list.length) return;
  haltVoice();
  const gen = voiceGen;
  setVoiceLine(-1);
  if (bgmCur && !bgmCur.paused) fadeTo(bgmCur, BGM_VOLUME * 0.3, 300);
  let i = 0;
  const next = () => {
    if (gen !== voiceGen) return;
    if (i >= list.length) {
      voiceCur = null;
      setVoiceLine(-1);
      if (bgmCur && !bgmCur.paused) fadeTo(bgmCur, BGM_VOLUME, 800);
      return;
    }
    const idx = i;
    const src = list[i];
    i += 1;
    if (lineAt) setVoiceLine(lineAt[idx]);
    try {
      const a = new Audio(src);
      a.volume = 1.0;
      a.onended = () => { if (gen === voiceGen) setTimeout(next, VOICE_GAP); };
      a.onerror = () => { if (gen === voiceGen) setTimeout(next, 80); };
      a.play().catch(() => { if (gen === voiceGen) next(); });
      voiceCur = a;
    } catch (e) { next(); }
  };
  next();
}
function playVoice(src, mute) {
  playVoiceQueue(src ? [src] : [], mute);
}
function playDialogues(dialogues, mute, from = 0) {
  const seq = [];
  const at = [];
  (dialogues || []).forEach((d, i) => {
    if (d[2] && i >= from) { seq.push(d[2]); at.push(i); }
  });
  playVoiceQueue(seq, mute, at);
}
/* ================= 世界数据 ================= */


/* 道路连通关系（索引对应 ZONES） */
const LINKS = { 0: [1, 12], 1: [0, 2, 9], 2: [1, 3, 8], 3: [2, 4, 5], 4: [3], 5: [3, 6], 6: [5], 7: [8], 8: [2, 7, 9], 9: [1, 8, 10], 10: [9, 11], 11: [10], 12: [0] };

const WORLD_INTRO = '五朝并立，三大缓冲区烽烟不息，四大边疆与海外自成江湖。你是一名无门无派的行侠者，一卷《天下舆图》在身——走到哪里，哪里便是你的江湖。道路相连处皆可前往，越是深处，越是凶险。';

/* ================= 物品 / 武学 ================= */
const clamp = v => Math.max(1, Math.min(100, Math.round(v)));
const ITEMS = {
  jinchuang: { name: '金创药', text: '外敷止血，气血 +25。', apply: s => ({ hp: clamp(s.hp + 25) }) },
  jiedu: { name: '解毒丸', text: '化解百毒，气血 +10。', apply: s => ({ hp: clamp(s.hp + 10) }) },
  tianxiang: { name: '天香断续膏', text: '恒山圣药，肉白骨续断肌，气血 +45。', apply: s => ({ hp: clamp(s.hp + 45) }) },
  jiuzhuan: { name: '九转熊蛇丸', text: '大内秘炼神丸，通经活血，气血 +70。', apply: s => ({ hp: clamp(s.hp + 70) }) },
  canye: { name: '武学残页', text: '参悟片刻，历练 +20。', apply: s => ({ expTotal: s.expTotal + 20 }) },
  fantian: { name: '翻天掌要诀', text: '稀有身法秘籍残卷，参悟后历练 +40。', apply: s => ({ expTotal: s.expTotal + 40 }) },
  qingshen: { name: '清神定志散', text: '安神定魄，心境空灵，历练 +80。', apply: s => ({ expTotal: s.expTotal + 80 }) },
  wubaoniu: { name: '五宝花蜜酒', text: '五仙教珍酿，培元固本，历练 +150。', apply: s => ({ expTotal: s.expTotal + 150 }) },
  yudiao: { name: '六阳白玉骰', text: '韦小宝的贴身信物。赌场亮出它，扬州地头蛇皆给三分薄面。', lore: true },
  qingmu: { name: '青木堂暗记', text: '天地会青木堂联络信物，见记如见兄弟。', lore: true },
  wanjie: { name: '万劫铜锁', text: '钟灵所赠的入谷信物，可避开万劫谷口的陷阱与毒雾。', lore: true },
  shenhe: { name: '参合借劲残决', text: '还施水阁石壁拓下的半页心法，以彼之道、还施彼身的雏形。', lore: true },
  guangling: { name: '广陵遗韵谱', text: '黄钟公毕生心血所校的琴谱。音律浩气，长存于世。', lore: true },
  xianglong: { name: '降龙伏虎气劲', text: '萧峰所赠的掌法心法残意，运劲时隐有龙吟。', lore: true },
};


/* ================= 开局：出身 / 家传武学 ================= */
const ORIGINS = [
  { id: 'hunter', name: '猎户之子', text: '山林长大，筋骨结实。', apply: { hp: 15 }, desc: '气血 +15' },
  { id: 'trader', name: '商贾子弟', text: '算盘打得好，盘缠也足。', apply: { silver: 150 }, desc: '银两 +150' },
  { id: 'soldier', name: '行伍弃卒', text: '军中厮杀过，拳脚带杀气。', apply: { ab: 6, hp: 5 }, desc: '能力 +6 · 气血 +5' },
  { id: 'scholar', name: '落魄书生', text: '读万卷书，胸中自有江湖。', apply: { exp: 120 }, desc: '历练 +120' },
];

const ALLOC_POINTS = 5;
const ALLOC_STATS = [['hp', '根骨', '气血 +5 / 点'], ['ab', '臂力', '能力 +2 / 点'], ['exp', '悟性', '历练 +15 / 点']];

/* 旅途随机事件：(state, zone) => [日志, 状态补丁] */
const ROAD = [
  s => ['与游方道人雨夜同宿，论剑半宿，获益匪浅（历练 +12）。', { expTotal: s.expTotal + 12 }],
  s => ['救起一名受伤镖师，他日镖局必有回报（银两 +20）。', { silver: s.silver + 20 }],
  s => ['暴雨阻路，在破庙歇息一夜，气血稍复。', { hp: clamp(s.hp + 5) }],
  s => ['与西行商队同行一程，赶车人赠你盘缠（银两 +12）。', { silver: s.silver + 12 }],
];

/* 城市设施风貌（同功能、异域皮肤，见 docs/gdd/06；未列区用通用名） */
const FAC_DEFAULT = { inn: '客栈', med: '药铺', gym: '武馆' };
const FAC = {
  0: { inn: '临安水乡大客栈', med: '回春堂中药馆', gym: '城南武馆' },
  1: { inn: '襄阳军营客舍', med: '随军医药棚', gym: '军营校场' },
  3: { inn: '汉辽驿馆', med: '北地参行', gym: '边军教场' },
  4: { inn: '部族毡帐', med: '萨满帐', gym: '部族擂台' },
  7: { inn: '丝路绿洲驿站', med: '西域异药香料行', gym: '一品堂演武场' },
  9: { inn: '山城吊脚客栈', med: '青城山药庐', gym: '峨眉演武坪' },
  11: { inn: '茶马古道客栈', med: '南疆百草堂', gym: '点苍武场' },
};
/* 客栈传闻池（打听消息解锁） */
const RUMORS = [
  '京城来了位提督大人，似乎在暗查一封密信。【京城密信】',
  '太湖深处有神秘慕容氏，庄中收藏天下武功图谱。【燕子坞传闻】',
  '嘉兴醉仙楼来了几位怪客，言谈间提起十八年前的旧约。【江南七怪线索】',
  '襄阳城近来夜夜点卯，汉水渡口盘查极严，怕是有大战将至。【襄阳烽火】',
  '福州福威镖局门口的石狮子，近日被人连夜描红了眼睛。【福威镖局】',
  '西夏一品堂广发英雄帖，许以高官厚禄招揽天下好手。【一品堂】',
  '扬州丽春院的小宝跟赌场那帮光棍混在一起，骰子里灌水银，滑溜得像泥鳅。【市井小宝】',
  '无量剑派东西二宗五年一度的比剑就在这两日，山下林子里总有一股怪草药味。【无量比剑】',
  '太湖深处住着一位神仙般的世家公子，敢乱闯还施水阁的好汉，没几个活着回来。【燕子坞】',
  '孤山梅庄终年闭户，四位庄主只痴迷琴棋书画；近日有白发老者带着绝世画谱到处问门径。【梅庄四友】',
  '无锡松鹤楼的乔帮主与大理贵公子斗酒，一口气喝光三十坛花雕；城外杏子林黑压压聚了上万叫花子。【杏子林】',
];
/* 客栈打听消息的地域语音（随机轮换） */
const INN_VOICES = {
  0: ['YZ-01_inn_innkeeper.mp3', 'JX-01_inn_tea_passer.mp3', 'FZ-01_inn_tea_oldman.mp3', 'FZ-01_inn_boss_raid.mp3', 'SZ-01_inn_waiter.mp3', 'SZ-01_inn_waiter_warning.mp3', 'WX-01_inn_wuxi_innkeeper.mp3', 'HZ-01_inn_tea_farmer.mp3'],
  11: ['DL-01_inn_innkeeper.mp3', 'DL-01_inn_tea_passer.mp3', 'DL-02_inn_tea_dao.mp3'],
};

/* 各区任务对话（与 quests 顺序一致）：剧情卡片中的 NPC 台词 */
const CHATTER = {
  0: [
    ['线人老宋', '密信上的印泥是湖州贡品。用得起的，整个江南不超过五家。'],
    ['扬州盐商', '客官要的不是盐引，是消息吧？消息嘛……得看诚意。'],
    ['太湖寨主', '失镖？水里讨生活的人，谁没捡过几口箱子。'],
    ['福州镖头', '这信若误了潮信，你我的人头都得挂城楼。'],
  ],
  1: [
    ['渡口把总', '今夜开船之前，一只苍蝇也不许飞出渡口。'],
    ['伤兵', '多谢好汉……别管我了，先送弟兄们进城。'],
    ['武当道童', '掌门云游未归，施主请回吧——咦，你说山下有烽火？'],
    ['船老大', '吃水深了三分？胡说！……客官，有话好说。'],
  ],
  2: [
    ['会盟司仪', '盟帖用的松烟墨，是开封西纸马街的货色——可会盟诸派，没人用得起。'],
    ['少林知客僧', '阿弥陀佛。请帖要送上山，先答我：何为禅？'],
    ['樊楼酒客', '军镇的粮半夜出城？客官，这话我只说一遍。'],
    ['嵩山猎户', '剑痕入石三分，二十年风雨都没能磨平。使剑的，不是凡人。'],
  ],
  3: [
    ['守关老卒', '雁门关的旧案？哼，活人别问死人的事。'],
    ['边军斥候', '箭上淬了乌头……好汉，先拔箭，话我慢慢说。'],
    ['幽州士族', '我族在汉地与契丹之间活了三百年，靠的就是不把话说满。'],
    ['牧马人', '那匹马鞍上有南院的烙记，一路往北去了。'],
  ],
  4: [
    ['商队头领', '军图昨夜换了三次主人，每一次都有人掉脑袋。'],
    ['草原骑手', '弓拉满，眼放平，马比人先知道猎物在哪。'],
    ['两部长老', '冬牧场只有一片。老天爷不评理，只好你来评。'],
    ['斥候少年', '白狼旗的马不钉掌，蹄印浅得像风吹过——但我认得。'],
  ],
  5: [
    ['辽阳守将', '兵变？营里风平浪静。……你若查到什么，先来说与我听。'],
    ['武库司吏', '账册在此，一笔不少。至于库里少没少，那得问耗子。'],
    ['金国旧臣', '茶凉了可以续，话说过头，就收不回来了。'],
    ['老参把头', '进山大吉！喊山不响，人参不长——脚底下放轻些。'],
  ],
  6: [
    ['盛京细作', '密令缝在衣领里？不，缝在衣领里的，只是给官差看的。'],
    ['旧部遗老', '腰牌我认得，人也就认得了。进屋说话，外头风大。'],
    ['流放犯人', '宁古塔的冬天，连眼泪都能冻成刀子。'],
    ['雪原猎户', '在雪窝子里过夜的主儿，不是密使就是逃犯——反正都背着人命。'],
  ],
  7: [
    ['驼队掌柜', '商路断了三个月，马贼抢货不抢盐——你说怪不怪？'],
    ['采玉人', '白骆驼……白骆驼进了峡谷就没出来……别去，千万别去……'],
    ['一品堂使者', '我堂以情报易情报。阁下的命，值几条消息？'],
    ['西域商人', '香料、玉石都好说。那位客人么……他不是货，别打听。'],
  ],
  8: [
    ['潼关戍卒', '官军、义军、商会，三家堵着一条粮道，谁先动手谁就是靶子。'],
    ['华山弟子', '问剑先问己：为何拔剑？何时收剑？剑下留谁？'],
    ['终南樵夫', '活死人墓？蜂子多，碑文在。进去的活人——没见过出来的。'],
    ['风陵渡船夫', '船底是夜里被人凿的。救人要紧，仇先记下。'],
  ],
  9: [
    ['剑门栈工', '栈道是前夜塌的，塌得齐整，像被锯断的。'],
    ['峨眉女冠', '药篓背稳些。山上的猢狲抢药，比山贼还快。'],
    ['青城弟子', '剑阵无眼。破阵不靠剑快，靠看穿它护着什么。'],
    ['重庆更夫', '空船往下游放，放的是信，不是盐。'],
  ],
  10: [
    ['云南府书吏', '遗诏的墨是新墨，印泥却是旧藏。这就对不上了。'],
    ['昆明旧臣', '茶花开了，茶凉了，旧事就别再提了吧……你说门环？'],
    ['贵阳镖头', '瘴气里举镖旗，旗面得用药水泡过。跟紧了，别离队。'],
    ['采药山民', '火焰纹是明教的记认。有人描新了它，是想借旧名做新事。'],
  ],
  11: [
    ['无量弟子', '信物沉在剑湖底，东西二宗为此打了三十年。'],
    ['谷口药农', '入谷者死。可谷里的断肠草，也能救断肠人。'],
    ['大理使者', '三杯茶：第一杯敬客，第二杯探意，第三杯——送客。'],
    ['点苍猎户', '云起时别上山。已经有人困在十九峰了。'],
  ],
  12: [
    ['老船工', '群岛互不通航，可各岛的童谣里，藏着同一句谜语。'],
    ['桃花岛哑仆', '（以手比划）阵随潮汐开，走错一步，潮落你也出不来。'],
    ['侠客岛使者', '赏善罚恶，船不等人。信，今夜必须到。'],
    ['被俘水手', '海盗打的是神龙岛的暗号——劫财是假，找东西是真。'],
  ],
};

/* ================= 派生数值 ================= */
const lv = e => Math.floor(e / 100) + 1;
const grade = l => l < 20 ? '不堪一击' : l < 50 ? '初学乍练' : l < 80 ? '初出茅庐' : l < 150 ? '马马虎虎' : l < 300 ? '略有小成' : '已有大成';
const ability = s => Math.round(lv(s.expTotal) * (0.35 + s.hp / 100)) + SKILLS.filter(k => lv(s.expTotal) >= k.lv).reduce((a, k) => a + k.bonus, 0) + (s.attrAb || 0) + (s.bonusSkill?.bonus || 0);
const DANGER_TAGS = ['平和', '险恶', '凶险', '绝地'];
const dangerTag = d => d < 40 ? 0 : d < 120 ? 1 : d < 260 ? 2 : 3;
const questReward = (z, main) => main
  ? { silver: 40 + Math.round(z.danger / 4), exp: 30, hp: -10, time: 12 }
  : { silver: 16 + Math.round(z.danger / 8), exp: 15, hp: 4, time: 8 };
const treeKey = (zone, treeId) => `${zone}:${treeId}`;
/* 已完成的任务树数量 */
const treesFinished = s => Object.entries(s.treeDone || {}).filter(([k, c]) => {
  const [zi, id] = k.split(':');
  const t = (ZONES[+zi].trees || []).find(x => x.id === id);
  return t && c >= t.nodes.length;
}).length;
/* 成就：全部由存档派生，无需额外存储 */
const ACHIEVEMENTS = [
  { name: '初涉江湖', text: '等级达到 10 级', ok: s => lv(s.expTotal) >= 10 },
  { name: '初出茅庐', text: '等级达到 50 级', ok: s => lv(s.expTotal) >= 50 },
  { name: '身手不凡', text: '能力达到 100', ok: s => ability(s) >= 100 },
  { name: '富甲一方', text: '银两达到 500', ok: s => s.silver >= 500 },
  { name: '行万里路', text: '足迹踏过 5 个大区', ok: s => (s.visited || []).length >= 5 },
  { name: '博闻强识', text: '收集 8 条江湖传闻', ok: s => (s.rumors || []).length >= 8 },
  { name: '广结善缘', text: '与 5 位江湖人物结下交情', ok: s => Object.keys(s.favor || {}).length >= 5 },
  { name: '悬壶常备', text: '行囊里备有 3 份以上伤药', ok: s => ((s.items.jinchuang || 0) + (s.items.jiedu || 0)) >= 3 },
  { name: '首树告成', text: '完成一棵原著任务树', ok: s => treesFinished(s) >= 1 },
  { name: '史诗见证', text: '完成《醉仙楼十八年之约》', ok: s => (s.treeDone['0:JX-01'] || 0) >= 5 },
];
/* 江湖排行：由能力折算名次（纯展示） */
const rankOf = ab => Math.max(1, 5200 - ab * 38);
const rankTier = ab => ab >= 300 ? '天榜' : ab >= 120 ? '地榜' : '人榜';

/* ================= 存档 ================= */



function load() {
  try {
    const result = readSave(localStorage, SAVE_KEY, saveOptions);
    return { state: result?.state || null, notice: result?.recovered ? '主存档损坏，已从备用存档恢复。' : '' };
  } catch (error) { return { state: null, notice: `读取失败：${error.message}。可从存档面板导入或读取手动存档。` }; }
}

/* ================= 行动结算 ================= */
function levelUpLog(n, s) {
  if (lv(n.expTotal) > lv(s.expTotal)) {
    n.fx = 'bell';
    n.log = [`突破！等级升至 ${lv(n.expTotal)}，境界「${grade(lv(n.expTotal))}」。`, ...n.log];
  }
  return n;
}
/* 剧情效果统一结算（docs/gdd/07 判定与回响模块） */
const { tick, settleStory } = createWorldEngine({ ability, questReward, clamp, ITEMS, ROAD, FAC, FAC_DEFAULT, levelUpLog });

function App() {
  const [saved] = useState(load);
  const [s, commitState] = useState(() => saved.state || initial());
  const runtimeRef = useRef(null);
  if (!runtimeRef.current) runtimeRef.current = createIdleRuntime(levelUpLog, lv);
  const runtime = runtimeRef.current;
  const sRef = useRef(s);
  const setS = update => {
    const previous = runtime.flush(sRef.current);
    const next = typeof update === 'function' ? update(previous) : update;
    sRef.current = next;
    commitState(next);
  };
  const [combatSetup, setCombatSetup] = useState(null);
  const [savesOpen, setSavesOpen] = useState(false);
  const [saveNotice, setSaveNotice] = useState(saved.notice);
  const [tab, setTab] = useState('武学');
  const [side, setSide] = useState('江湖');
  const [story, setStory] = useState(null);   // { zone, ti, ni }
  const [outcome, setOutcome] = useState(null); // 抉择回响文本
  const [panel, setPanel] = useState(null);     // attr | ach | let | rank | set
  const [questCard, setQuestCard] = useState(null); // 普通任务的剧情卡（任务索引）
  const [speakI, setSpeakI] = useState(-1);        // 当前连播到的对白行
  const [leaf, setLeaf] = useState(0);             // 江湖纸卷页：0=本区历练，1+=任务树
  const [heroOpen, setHeroOpen] = useState(false);  // 手机：左栏「属性」打开角色浮层
  const [creating, setCreating] = useState(() => !saved.state); // 无存档则先创角
  const [cName, setCName] = useState('');
  const [origin, setOrigin] = useState('hunter');
  const [cSkill, setCSkill] = useState('taizu');
  const [alloc, setAlloc] = useState({ hp: 0, ab: 0, exp: 0 });
  const level = lv(s.expTotal), ab = ability(s), z = ZONES[s.loc];
  const inner = Math.round(80 + level * 18 + ab * 3);
  const fac = FAC[s.loc] || FAC_DEFAULT;
  const doneArr = s.done[s.loc] || [];
  const busy = !!s.action;

  useEffect(() => { voiceLineCb = setSpeakI; return () => { voiceLineCb = null; }; }, []);
  useEffect(() => {
    if (creating || savesOpen) return;
    const timer = setInterval(() => {
      const next = tick(runtime.advance(sRef.current));
      sRef.current = next;
      commitState(next);
    }, 1000);
    return () => clearInterval(timer);
  }, [creating, savesOpen, runtime]);
  useEffect(() => {
    if (creating) return;
    const persist = () => {
      try { writeSave(localStorage, runtime.snapshot(sRef.current), SAVE_KEY, saveOptions); } catch (error) { setSaveNotice(`自动存档失败：${error.message}`); }
    };
    if (s.action || s.battle || savesOpen) persist();
    const timer = setTimeout(persist, 2500);
    const onVis = () => { if (document.hidden) persist(); };
    window.addEventListener('beforeunload', persist);
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeunload', persist);
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [s, creating, savesOpen, runtime]);
  useEffect(() => { if (s.fx) play(SOUND[s.fx], s.muteSfx); }, [s.fx, s.muteSfx]);
  useEffect(() => { bgmSwitch(s.loc, s.muteBgm); }, [s.loc, s.muteBgm]);
  useEffect(() => { if (s.muteVoice) stopVoice(); }, [s.muteVoice]);
  useEffect(() => { setLeaf(0); }, [s.loc]);

  const click = () => { play(SOUND.click, s.muteSfx); bgmSwitch(s.loc, s.muteBgm); };
  const toggleAudio = key => setS(v => ({ ...v, [key]: !v[key] }));
  const go = i => {
    click();
    if (busy || i === s.loc) return;
    if (!LINKS[s.loc].includes(i)) {
      setS(v => ({ ...v, log: [`道路不通：${ZONES[v.loc].name}与${ZONES[i].name}并不相邻，需经邻区辗转。`, ...v.log].slice(0, 8) }));
      return;
    }
    setS(v => ({ ...v, action: { type: 'travel', to: i, left: 10, total: 10 }, log: [`启程前往${ZONES[i].name}……`, ...v.log].slice(0, 8) }));
  };
  const startQuest = i => {
    if (busy) return;
    const q = z.quests[i], r = questReward(z, q.kind === 'main');
    setS(v => ({ ...v, action: { type: 'quest', zone: s.loc, idx: i, left: r.time, total: r.time }, log: [`着手「${q.name}」……`, ...v.log].slice(0, 8) }));
  };
  /* 普通任务：先出剧情卡，再动身 */
  const openQuestCard = i => {
    click();
    setQuestCard(i);
  };
  const startSpar = () => {
    click();
    if (sRef.current.action || sRef.current.battle) return;
    setCombatSetup({ opponent: 'student', place: fac.gym, danger: z.danger });
  };
  const beginCombat = config => {
    setS(v => startCombat({ ...v, loadout: config.loadout }, config));
    setCombatSetup(null); setStory(null); setOutcome(null); stopVoice();
  };
  const loadCharacter = state => {
    if (!creating) writeSave(localStorage, runtime.snapshot(sRef.current), SAVE_KEY, saveOptions);
    writeSave(localStorage, state, SAVE_KEY, saveOptions);
    runtime.clear(); stopVoice(); setS(state);
    setStory(null); setOutcome(null); setQuestCard(null); setPanel(null); setCombatSetup(null);
    setCreating(false); setSavesOpen(false); setSaveNotice('存档已恢复。');
  };
  const askRumor = () => {
    click();
    if (s.silver < 2) return;
    const vp = INN_VOICES[s.loc];
    if (vp) playVoice(`/audio/voice/${vp[Math.floor(Math.random() * vp.length)]}`, s.muteVoice);
    setS(v => {
      const unk = RUMORS.filter(r => !(v.rumors || []).includes(r));
      const got = unk.length ? unk[Math.floor(Math.random() * unk.length)] : null;
      return { ...v, silver: v.silver - 2, rumors: got ? [...(v.rumors || []), got] : v.rumors, log: [got ? `${fac.inn}中听闻：${got}` : '近日并无新鲜传闻。', ...v.log].slice(0, 8) };
    });
  };
  const buyItem = (id, cost) => {
    click();
    if (s.silver < cost) return;
    setS(v => ({ ...v, silver: v.silver - cost, items: { ...v.items, [id]: (v.items[id] || 0) + 1 }, log: [`在${fac.med}购得${ITEMS[id].name} ×1（银两 -${cost}）。`, ...v.log].slice(0, 8) }));
  };
  const useItem = id => {
    if (busy || !(s.items[id] > 0)) return;
    play(SOUND.bell, s.muteSfx);
    setS(v => ({ ...v, ...ITEMS[id].apply(v), items: { ...v.items, [id]: v.items[id] - 1 }, log: [`使用了${ITEMS[id].name}。`, ...v.log].slice(0, 8) }));
  };
  const rest = () => {
    if (busy || s.silver < 5 || s.hp >= 100) return;
    play(SOUND.bell, s.muteSfx);
    setS(v => ({ ...v, silver: v.silver - 5, hp: clamp(v.hp + 30), log: ['在客栈歇息半日，气血大复（银两 -5）。', ...v.log].slice(0, 8) }));
  };
  const claimIdle = () => { click(); const m = s.devMult || 1; setS(v => ({ ...v, silver: v.silver + 5 * m, log: [`领取挂机收益：银两 +${5 * m}。`, ...v.log].slice(0, 8) })); };
  /* 剧情节点：打开场景弹窗 */
  const openStory = (ti, ni) => {
    click();
    setStory({ zone: s.loc, ti, ni });
    setOutcome(null);
    playDialogues(ZONES[s.loc].trees[ti].nodes[ni].dialogues, s.muteVoice, 0);
  };
  /* 剧情抉择：检定（能力不足走软失败，主线不断），结算回响（docs/gdd/07） */
  const choose = c => {
    stopVoice();
    if (!story || outcome) return;
    const { zone, ti, ni } = story;
    const t = ZONES[zone].trees[ti];
    if (!canResolveChoice(sRef.current, treeKey(zone, t.id), ni, c)) return;
    if (sRef.current.action || sRef.current.battle) return;
    const ci = t.nodes[ni].choices.indexOf(c);
    const ok = !c.diff || ability(sRef.current) >= c.diff;
    if (c.combat || (!ok && c.failCombat)) {
      setCombatSetup({ opponent: c.combat || c.failCombat, place: t.where, danger: c.diff || z.danger, context: { zone, ti, ni, ci, failedCheck: !c.combat } });
      return;
    }
    const eff = ok ? c.ok : c.fail;
    play(ok ? SOUND.quest : SOUND.click, s.muteSfx);
    if (eff.voice) playVoice(eff.voice, s.muteVoice);
    setS(v => levelUpLog(settleStory(v, { zone, ti, ni, ci }, ok), v));
    setOutcome(eff.text + (ni === t.nodes.length - 1 ? `\n\n${t.reward.text}` : ''));
  };

  const reset = () => {
    if (!window.confirm('重开将清空全部江湖进度，确定？')) return;
    try { clearAutoSave(localStorage); } catch (error) { setSaveNotice(`重开失败：${error.message}`); return; }
    stopVoice();
    runtime.clear();
    setCombatSetup(null); setSavesOpen(false);
    setS(initial());
    setStory(null); setOutcome(null); setQuestCard(null); setPanel(null);
    setCName(''); setOrigin('hunter'); setCSkill('taizu'); setAlloc({ hp: 0, ab: 0, exp: 0 });
    setCreating(true);
  };
  /* 开局创角：名号 + 出身 + 天赋加点 + 家传武学 */
  const finishCreate = () => {
    click();
    const o = ORIGINS.find(x => x.id === origin), sk = START_SKILLS.find(x => x.id === cSkill);
    const name = cName.trim() || '沈孤鸿';
    const base = initial();
    setS({
      ...base,
      name,
      hp: clamp(base.hp + (o.apply.hp || 0) + alloc.hp * 5 + (sk.hp || 0)),
      silver: base.silver + (o.apply.silver || 0),
      expTotal: base.expTotal + (o.apply.exp || 0) + alloc.exp * 15 + (sk.exp || 0),
      attrAb: (o.apply.ab || 0) + alloc.ab * 2,
      bonusSkill: { name: sk.name, text: sk.text, bonus: sk.bonus || 0 },
      loadout: { style: sk.name, strategy: 'balanced', breath: 'flowing', footwork: 'light' },
      rngState: crypto.getRandomValues(new Uint32Array(1))[0] || 1,
      log: [`${name}踏入江湖。出身${o.name}，家传「${sk.name}」。`, ...base.log],
    });
    setCreating(false);
  };

  const st = story ? ZONES[story.zone].trees[story.ti] : null;
  const stNode = st ? st.nodes[story.ni] : null;

  return <main className="app">
    {!creating && /失败|损坏/.test(saveNotice) && <button className="save-alert" role="status" onClick={() => setSavesOpen(true)}>{saveNotice} · 查看存档</button>}
    <header>
      <div className="brand"><small>THE LONG NIGHT OF</small><strong>江湖长夜</strong></div>
      <div className="currency"><span><i className="em em-silver" />银两 <b>{s.silver}</b></span><span className="cultivate"><i className="em em-cult" />修为 <b>{s.expTotal % 100}</b></span></div>
      <button className="hbtn dev" onClick={() => { click(); setS(v => { const nx = (v.devMult || 1) === 1 ? 2 : v.devMult === 2 ? 5 : v.devMult === 5 ? 10 : 1; return { ...v, devMult: nx, log: [`开发者：收益调整为 ×${nx}。`, ...v.log].slice(0, 8) }; }); }}>收益 ×{s.devMult || 1}</button>
      <div className="audio-toggles">
        <button className={`hbtn${s.muteBgm ? ' off' : ''}`} title="背景音乐" onClick={() => toggleAudio('muteBgm')}>{s.muteBgm ? '音乐关' : '音乐'}</button>
        <button className={`hbtn${s.muteSfx ? ' off' : ''}`} title="界面音效" onClick={() => toggleAudio('muteSfx')}>{s.muteSfx ? '音效关' : '音效'}</button>
        <button className={`hbtn${s.muteVoice ? ' off' : ''}`} title="剧情配音" onClick={() => toggleAudio('muteVoice')}>{s.muteVoice ? '配音关' : '配音'}</button>
      </div>
      <button className="hbtn reopen" onClick={reset}>重开</button>
    </header>
    <div className="layout">
      {/* 左栏：主导航；舆图在游历状态展开 */}
      <aside className="map-col">
        <nav className="primary-nav">{[['江湖','♟'],['行囊','♜'],['武学','▥'],['门派','⌂'],['游历','⌁']].map(([name,icon]) => <button key={name} className={side === name ? 'on' : ''} onClick={() => { click(); setHeroOpen(false); setSide(name); }}><i>{icon}</i><b>{name}</b></button>)}
          <button type="button" className={`nav-hero${heroOpen ? ' on' : ''}`} onClick={() => { click(); setHeroOpen(v => !v); }}><i>☯</i><b>属性</b></button>
        </nav>
        <div className="world"><h3>天下大势</h3><p>{WORLD_INTRO}</p></div>
        <div className="side-verse">风雨江湖路，且从眼前这一封密信走起。</div>
      </aside>
      {/* 中栏：当前区域与任务 */}
      <section>
        <article className="paper">
          {side === '游历' ? <>
            <div className="chapter">
              <small>江湖舆图 · 十三大区 · 道路相连处皆可前往</small>
              <h1>天下风物</h1>
              <p>{WORLD_INTRO}</p>
            </div>
            <div className="atlas">
              {ZONES.map((zn, i) => {
                const near = LINKS[s.loc].includes(i);
                const done = (s.done[i] || []).filter(Boolean).length;
                const t = dangerTag(zn.danger);
                return <button key={zn.name} disabled={busy || (i !== s.loc && !near)}
                  className={i === s.loc ? 'here' : near ? 'near' : 'far'} onClick={() => go(i)}>
                  <span>{zn.faction} · <em className={`tag t${t}`}>{DANGER_TAGS[t]}</em></span>
                  <b>{zn.name}</b>
                  <small>{zn.cities}</small>
                  <small>{i === s.loc ? '◈ 当前所在' : near ? '可前往（约十息）' : '道路不通，需经邻区辗转'} · 任务 {done}/4{(zn.trees || []).length ? ` · 剧情 ${zn.trees.length}` : ''}</small>
                </button>;
              })}
            </div>
          </> : side === '武学' ? <>
            <div className="chapter">
              <small>{s.name} · 等级 {level} · {grade(level)}</small>
              <h1>武学</h1>
              <p>武学随等级自行领悟，各加能力。当前能力 {ab}。</p>
            </div>
            <LoadoutEditor state={s} value={s.loadout} disabled={busy} onChange={loadout => setS(v => ({ ...v, loadout }))} />
            <div className="page-list">
              {s.bonusSkill && <div className="page-item on"><b>{s.bonusSkill.name}</b><em>家传{s.bonusSkill.bonus ? ` · 能力 +${s.bonusSkill.bonus}` : ''}</em><small>{s.bonusSkill.text}</small></div>}
              {SKILLS.map(k => {
                const on = level >= k.lv;
                return <div key={k.name} className={`page-item ${on ? 'on' : ''}`}>
                  <b>{k.name}</b><em>{on ? `能力 +${k.bonus}` : `${k.lv} 级可悟`}</em>
                  <small>{on ? k.text : '……'}</small>
                </div>;
              })}
            </div>
          </> : side === '行囊' ? <>
            <div className="chapter">
              <small>随身之物 · 银两 {s.silver}</small>
              <h1>行囊</h1>
            </div>
            <div className="page-list">
              {Object.entries(ITEMS).map(([id, it]) => {
                const n = s.items[id] || 0;
                return <div key={id} className={`page-item ${n ? 'on' : ''}`}>
                  <b>{it.name} <em>×{n}</em></b>
                  <small>{it.text}</small>
                  {it.apply ? <button disabled={!n} onClick={() => useItem(id)}>使用</button> : null}
                </div>;
              })}
            </div>
          </> : side === '门派' ? <>
            <div className="chapter">
              <small>无门无派 · 自在行侠</small>
              <h1>门派</h1>
              <p>你尚未拜入任何门派。江湖传闻，少林、武当、华山、峨眉皆在收徒；也有人说，无门无派之人，才走得进所有的门。</p>
              <p className="hint">门派系统尚未开放。多去客栈打听消息，机缘自会到来。</p>
            </div>
          </> : <>
          <div className="chapter">
            <small>{z.faction} · {z.cities} · 凶险度 <em className={`tag t${dangerTag(z.danger)}`}>{DANGER_TAGS[dangerTag(z.danger)]}</em>（推荐能力 {z.danger}）</small>
            <h1>{z.name}</h1>
            <p>{z.desc}</p>
            <p className="hint">本区任务需按线索顺序完成；实力不足时支线可能受挫，小主线自有高人相助，不致卡关。{(z.trees || []).length > 0 && <b className="tree-hint">本区另有原著剧情 {(z.trees || []).length} 桩，用「上一页 / 下一页」或下方地名签翻阅。</b>}</p>
          </div>
          {(() => {
            const trees = z.trees || [];
            const pages = 1 + trees.length;
            const page = Math.min(leaf, pages - 1);
            const goPage = n => { click(); setLeaf(Math.max(0, Math.min(pages - 1, n))); };
            const pager = pages > 1 ? <div className="pager">
              <button disabled={page === 0} onClick={() => goPage(page - 1)}>◀ 上一页</button>
              <div className="pager-mid">
                <b>{page === 0 ? '本区历练' : `《${trees[page - 1].name}》`}</b>
                <small>{page + 1} / {pages}</small>
              </div>
              <button disabled={page === pages - 1} onClick={() => goPage(page + 1)}>下一页 ▶</button>
            </div> : null;
            const dots = pages > 1 ? <div className="pager-dots">
              <button className={page === 0 ? 'on' : ''} onClick={() => goPage(0)}>历练</button>
              {trees.map((t, i) => <button key={t.id} className={page === i + 1 ? 'on' : ''} onClick={() => goPage(i + 1)}>{t.where || t.id}</button>)}
            </div> : null;
            if (page === 0) {
              return <>
                {pager}{dots}
                <div className="mission-list">
                  {z.quests.map((q, i) => {
                    const complete = !!doneArr[i];
                    const locked = i > 0 && !doneArr[i - 1];
                    const active = s.action?.type === 'quest' && s.action.zone === s.loc && s.action.idx === i;
                    const r = questReward(z, q.kind === 'main');
                    return <button key={q.name} className={`mission ${complete ? 'done' : ''} ${active ? 'active' : ''}`}
                      disabled={complete || locked || busy} onClick={() => openQuestCard(i)}>
                      <span>{q.kind === 'main' ? '小主线' : '支线'}</span>
                      <div className="qbody"><b>{q.name}</b><i>{q.text}</i></div>
                      <small>{complete ? '已完成' : locked ? '待前置任务' : active ? `行动中 ${s.action.left}s` : `前往　历练 +${r.exp}`}</small>
                    </button>;
                  })}
                </div>
                <div className="facilities">
                  <h3>城中去处</h3>
                  <div className="fac-grid">
                    <button disabled={busy || s.silver < 2} onClick={askRumor}><b>{fac.inn}</b><small>打听消息 · 银两 -2</small></button>
                    <button disabled={busy || s.silver < 20} onClick={() => buyItem('jinchuang', 20)}><b>{fac.med}</b><small>金创药 · 银两 -20</small></button>
                    <button disabled={busy || s.silver < 15} onClick={() => buyItem('jiedu', 15)}><b>{fac.med}</b><small>解毒丸 · 银两 -15</small></button>
                    <button disabled={busy || s.silver < 60} onClick={() => buyItem('tianxiang', 60)}><b>{fac.med}</b><small>天香断续膏 · 银两 -60</small></button>
                    <button disabled={busy || s.silver < 40} onClick={() => buyItem('canye', 40)}><b>武馆典藏</b><small>武学残页 · 银两 -40</small></button>
                    <button disabled={busy} onClick={startSpar}><b>{fac.gym}</b><small>自动交手 · 战前配招</small></button>
                  </div>
                </div>
                {pager}
              </>;
            }
            const ti = page - 1, t = trees[ti];
            const count = s.treeDone[treeKey(s.loc, t.id)] || 0;
            const finished = count >= t.nodes.length;
            return <>
              {pager}{dots}
              <div className="tree-head">
                <small>原著任务树 {t.id} · {t.where} · 线性剧情 · 软失败不断线</small>
                <h2>《{t.name}》{finished ? '（已完成）' : ''}</h2>
              </div>
              <div className="mission-list">
                {t.nodes.map((nd, ni) => {
                  const complete = ni < count;
                  const locked = ni > count;
                  return <button key={nd.name} className={`mission ${complete ? 'done' : ''}`}
                    disabled={complete || locked || busy} onClick={() => openStory(ti, ni)}>
                    <span>第{['一', '二', '三', '四', '五', '六', '七'][ni] || ni + 1}回</span>
                    <div className="qbody"><b>{nd.name}</b><i>{nd.scene.slice(0, 38)}……</i></div>
                    <small>{complete ? '已过' : locked ? '待前回' : '入戏'}</small>
                  </button>;
                })}
              </div>
              {pager}
            </>;
          })()}
          </>}
        </article>
        {s.action && <div className="actionbar">
          <b>{s.action.type === 'travel' ? `赶路 · ${ZONES[s.action.to].name}` : s.action.type === 'combat' ? `交手 · ${s.battle.enemy.name}` : s.action.type === 'spar' ? `${fac.gym} · 切磋` : `行事 · ${z.quests[s.action.idx].name}`}</b>
          <i><em style={{ width: `${s.action.type === 'combat' ? s.battle.round / 60 * 100 : ((s.action.total - s.action.left) / s.action.total) * 100}%` }} /></i>
          <span>{s.action.type === 'combat' ? `第 ${s.battle.round} 回合` : `${s.action.left}s`}</span>
        </div>}
        <div className="idle">
          <b>挂机修行</b>
          <i><em style={{ width: `${s.expTotal % 100}%` }} /></i>
          <button onClick={() => { click(); setS(v => ({ ...v, idle: !v.idle })); }}>{s.idle ? '暂停' : '继续'}</button>
          <button className="claim" onClick={claimIdle}>领取收益</button>
          <button className="rest" disabled={s.silver < 5 || s.hp >= 100} onClick={rest}>客栈歇息<br />银两 -5</button>
        </div>
      </section>
      {/* 右栏：角色 / 武学 / 行囊 / 传闻；手机由左栏「属性」浮层打开 */}
      {heroOpen && <div className="hero-mask" onClick={() => setHeroOpen(false)} />}
      <aside className={`hero${heroOpen ? ' open' : ''}`}>
        <button type="button" className="hero-close" onClick={() => { click(); setHeroOpen(false); }}>✕</button>
        <div className="portrait" />
        <h2>{s.name}</h2>
        <p>等级 {level}　·　{grade(level)}</p>
        <div className="stats"><div className="stat hp"><span>♥ 气血</span><i><em style={{ width: `${s.hp}%` }} /></i><b>{s.hp}/100</b></div><div className="stat qi"><span>☯ 内力</span><i><em style={{ width: '100%' }} /></i><b>{inner}/{inner}</b></div><div className="stat fame"><span>✥ 声望</span><i><em style={{ width: `${Math.min(100, (s.rep || 0) / 25)}%` }} /></i><b>{s.rep || 0}</b></div></div>
        <div className="ability">
          <small>侠客状态</small>
          <b>{s.hp > 70 ? '气息平稳' : s.hp > 40 ? '略有伤势' : '伤势沉重'}</b>
          <p>当前能力　<strong>{ab}</strong></p>
          <em>能力随等级、气血与武学变化</em>
        </div>
        <div className="rep">
          {Object.keys(s.favor || {}).length === 0 && <span className="dim">尚无江湖交情</span>}
          {Object.entries(s.favor || {}).map(([k, v]) => <span key={k}>{k} 好感 <b>{v}</b></span>)}
        </div>
        <button className="details" onClick={() => { click(); setPanel('attr'); }}>查看详细属性　›</button>
        <div className="htabs">
          {['武学', '行囊', '传闻'].map(x => <button key={x} className={tab === x ? 'on' : ''} onClick={() => { click(); setTab(x); }}>{x}</button>)}
        </div>
        <div className="quick-actions">{[['成就', 'ach', 'tag-achieve'], ['信件', 'let', 'tag-letter'], ['排行', 'rank', 'tag-rank'], ['设置', 'set', 'tag-setting']].map(([x, p, img]) => <button key={x} className="tag-btn" style={{ backgroundImage: `url('/art/ui/slices/${img}.webp')` }} onClick={() => { click(); setPanel(p); }}>{x}</button>)}</div>
        {tab === '武学' ? <div className="skills">
          {s.bonusSkill && <div className="skill on"><b>{s.bonusSkill.name}</b><em>家传{s.bonusSkill.bonus ? ` +${s.bonusSkill.bonus}` : ''}</em><small>{s.bonusSkill.text}</small></div>}
          {SKILLS.map(k => {
            const on = level >= k.lv;
            return <div key={k.name} className={`skill ${on ? 'on' : ''}`}>
              <b>{k.name}</b><em>{on ? `能力 +${k.bonus}` : `${k.lv} 级可悟`}</em>
              <small>{on ? k.text : '……'}</small>
            </div>;
          })}
        </div> : tab === '行囊' ? <div className="bag">
          {Object.entries(ITEMS).map(([id, it]) => {
            const n = s.items[id] || 0;
            return <div key={id} className="bag-item">
              <b>{it.name} <em>×{n}</em></b><small>{it.text}</small>
              {it.apply ? <button disabled={!n} onClick={() => useItem(id)}>使用</button> : <button disabled>信物</button>}
            </div>;
          })}
        </div> : <div className="rumors">
          {(s.rumors || []).length === 0 && <p className="empty">尚无传闻。去{fac.inn}花二两银子打听消息吧。</p>}
          {(s.rumors || []).map(r => <div key={r} className="rumor"><small>{r}</small></div>)}
        </div>}
      </aside>
    </div>
    <footer><strong>江<br />湖<br />日<br />志</strong><div className="log-lines">{s.log.slice(0, 5).map((x, i) => <span key={x}>[{['夜亥时','夜戌时','夜子时','夜丑时','夜寅时'][i]}]　{x}</span>)}</div><button onClick={() => { click(); setS(v => ({ ...v, log: ['翻阅了更早的江湖见闻。', ...v.log].slice(0, 8) })); }}>查看更多　⌃</button></footer>
    {(combatSetup || s.battle) && !savesOpen && <CombatPanel state={s} setup={combatSetup} onStart={beginCombat}
      onClose={() => { setCombatSetup(null); if (s.battle?.settled) setS(v => ({ ...v, battle: null })); }}
      onRetreat={() => setS(v => levelUpLog(retreatCombat(v, settleStory), v))} onSaves={() => setSavesOpen(true)} />}
    {savesOpen && <SavePanel snapshot={() => runtime.snapshot(sRef.current)} options={saveOptions} notice={saveNotice} onLoad={loadCharacter} onClose={() => setSavesOpen(false)} />}
    {/* 功能面板：详细属性 / 成就 / 信件 / 排行 / 设置 */}
    {panel && <div className="story-mask" onClick={() => setPanel(null)}>
      <div className="panel" onClick={e => e.stopPropagation()}>
        <button className="panel-x" onClick={() => { click(); setPanel(null); }}>✕</button>
        {panel === 'attr' && <>
          <h2>详细属性</h2>
          <div className="attr-grid">
            <div><small>等级</small><b>{level} · {grade(level)}</b></div>
            <div><small>气血</small><b>{s.hp}/100</b></div>
            <div><small>内力</small><b>{inner}</b></div>
            <div><small>银两</small><b>{s.silver}</b></div>
            <div><small>声望</small><b>{s.rep || 0}</b></div>
            <div><small>能力</small><b>{ab}（根基 {Math.round(level * (0.35 + s.hp / 100))} + 武学 {ab - Math.round(level * (0.35 + s.hp / 100))}）</b></div>
          </div>
          <h3>江湖履历</h3>
          <div className="attr-grid">
            <div><small>历练任务</small><b>{Object.values(s.done).reduce((a, arr) => a + arr.filter(Boolean).length, 0)} 件</b></div>
            <div><small>任务树</small><b>{treesFinished(s)} 棵完成</b></div>
            <div><small>传闻</small><b>{(s.rumors || []).length} 条</b></div>
            <div><small>足迹</small><b>{(s.visited || []).length}/13 区</b></div>
            <div><small>江湖交情</small><b>{Object.keys(s.favor || {}).length} 人</b></div>
          </div>
          {Object.keys(s.favor || {}).length > 0 && <>
            <h3>人物好感</h3>
            <div className="favor-list">{Object.entries(s.favor).map(([k, v]) => <span key={k}>{k} <b>{v}</b></span>)}</div>
          </>}
        </>}
        {panel === 'ach' && <>
          <h2>成就 <small>{ACHIEVEMENTS.filter(a => a.ok(s)).length}/{ACHIEVEMENTS.length}</small></h2>
          <div className="ach-list">{ACHIEVEMENTS.map(a => <div key={a.name} className={`ach ${a.ok(s) ? 'on' : ''}`}><b>{a.ok(s) ? '◆ ' : '◇ '}{a.name}</b><small>{a.text}</small></div>)}</div>
        </>}
        {panel === 'let' && <>
          <h2>信件 <small>{(s.letters || []).length} 封</small></h2>
          <div className="letter-list">{(s.letters || []).map((l, i) => <div key={i} className="letter"><b>✉ {l.from}</b><p>{l.text}</p></div>)}</div>
        </>}
        {panel === 'rank' && <>
          <h2>江湖排行</h2>
          <p className="panel-p">天榜诸雄——乔峰、郭靖、令狐冲、张三丰之流，名次固若金汤，非你今日可望。</p>
          <p className="panel-p">以你当前能力 {ab}，位列{rankTier(ab)}第 <b className="rank-no">{rankOf(ab)}</b> 位。</p>
          <p className="panel-p dim">能力愈高，名次愈前。传闻、声望与任务树的功业，江湖自会记得。</p>
        </>}
        {panel === 'set' && <>
          <h2>设置</h2>
          <div className="set-row"><span>音乐</span><button className="hbtn" onClick={() => toggleAudio('muteBgm')}>{s.muteBgm ? '关' : '开'}</button></div>
          <div className="set-row"><span>音效</span><button className="hbtn" onClick={() => toggleAudio('muteSfx')}>{s.muteSfx ? '关' : '开'}</button></div>
          <div className="set-row"><span>配音</span><button className="hbtn" onClick={() => toggleAudio('muteVoice')}>{s.muteVoice ? '关' : '开'}</button></div>
          <div className="set-row"><span>存档</span><button className="hbtn" onClick={() => { setPanel(null); setSavesOpen(true); }}>存档 / 读档</button></div>
          <div className="set-row"><span>重开</span><button className="hbtn" onClick={() => { setPanel(null); reset(); }}>清空进度重开</button></div>
        </>}
      </div>
    </div>}
    {/* 开局创角：名号 / 出身 / 天赋加点 / 家传武学 */}
    {creating && (() => {
      const left = ALLOC_POINTS - alloc.hp - alloc.ab - alloc.exp;
      return <div className="story-mask">
        <div className="story create scroll">
          <small className="st-tag">江湖长夜 · 开局</small>
          <h2>创建侠客</h2>
          <button className="save-launch" onClick={() => setSavesOpen(true)}>已有存档？读取 / 导入</button>
          {saveNotice && <p role="status">{saveNotice}</p>}
          <div className="c-row">
            <span>名号</span>
            <input value={cName} onChange={e => setCName(e.target.value)} placeholder="沈孤鸿" maxLength={8} />
          </div>
          <h3 className="c-h">出身</h3>
          <div className="c-grid">
            {ORIGINS.map(o => <button key={o.id} className={origin === o.id ? 'on' : ''} onClick={() => { click(); setOrigin(o.id); }}>
              <b>{o.name}</b><small>{o.text}</small><em>{o.desc}</em>
            </button>)}
          </div>
          <h3 className="c-h">天赋（剩余 {left} 点）</h3>
          {ALLOC_STATS.map(([key, label, per]) => <div className="c-row" key={key}>
            <span>{label}</span>
            <div className="alloc">
              <button disabled={!alloc[key]} onClick={() => { click(); setAlloc(a => ({ ...a, [key]: a[key] - 1 })); }}>−</button>
              <b>{alloc[key]}</b>
              <button disabled={!left} onClick={() => { click(); setAlloc(a => ({ ...a, [key]: a[key] + 1 })); }}>＋</button>
            </div>
            <small>{per}</small>
          </div>)}
          <h3 className="c-h">家传武学</h3>
          <div className="c-grid">
            {START_SKILLS.map(k => <button key={k.id} className={cSkill === k.id ? 'on' : ''} onClick={() => { click(); setCSkill(k.id); }}>
              <b>{k.name}</b><small>{k.text}</small><em>{k.desc}</em>
            </button>)}
          </div>
          <button className="go-on" onClick={finishCreate}>踏入江湖</button>
        </div>
      </div>;
    })()}
    {/* 普通任务剧情卡：情境 + NPC 台词 + 动身 */}
    {questCard !== null && (() => {
      const q = z.quests[questCard], r = questReward(z, q.kind === 'main');
      const [who, line] = CHATTER[s.loc][questCard];
      return <div className="story-mask" onClick={() => setQuestCard(null)}>
        <div className="story scroll" onClick={e => e.stopPropagation()}>
          {QUEST_COMBATS[q.name] && <p className="combat-warning">此行可能遭遇{OPPONENTS[QUEST_COMBATS[q.name]].name}，抵达后自动交手。可先在武学页配置招式，不敌可撤离。</p>}
          <small className="st-tag">{q.kind === 'main' ? '小主线' : '支线'} · {z.name}</small>
          <h2>{q.name}</h2>
          <p className="scene">{q.text}</p>
          <p className="dlg"><b>{who}</b>{line}</p>
          <p className="hint" style={{ color: '#6d5a3c' }}>此行约需 {r.time} 息。酬劳：银两 +{r.silver}、历练 +{r.exp}{q.item ? `、${ITEMS[q.item].name}` : ''}。{q.kind === 'main' ? '小主线纵有不济，自有高人相助。' : '实力不足时可能受挫，养足气血再来。'}</p>
          <div className="choices">
            <button onClick={() => { startQuest(questCard); setQuestCard(null); }}>动身前往</button>
            <button onClick={() => { click(); setQuestCard(null); }}>暂且离开</button>
          </div>
        </div>
      </div>;
    })()}
    {/* 剧情弹窗（情境描摹 / NPC台词 / 交互抉择 / 判定回响） */}
    {story && stNode && !combatSetup && <div className="story-mask" onClick={() => { if (outcome) { stopVoice(); setStory(null); setOutcome(null); } }}>
      <div className="story scroll" onClick={e => e.stopPropagation()}>
        <small className="st-tag">【{st.name}】第{['一', '二', '三', '四', '五', '六', '七'][story.ni] || story.ni + 1}回 · {st.where}</small>
        <h2>{stNode.name}</h2>
        <p className="scene">{stNode.scene}</p>
        {stNode.dialogues.map(([who, line, voice], di) => <p className={`dlg${speakI === di ? ' speak' : ''}`} key={who + line.slice(0, 8)}>{voice && <button className={`vbtn${speakI === di ? ' on' : ''}`} title="从此句连播" onClick={() => playDialogues(stNode.dialogues, s.muteVoice, di)}>♪</button>}<b>{who}</b>{line}</p>)}
        {outcome ? <>
          <p className="outcome">{outcome}</p>
          <button className="go-on" onClick={() => { click(); stopVoice(); setStory(null); setOutcome(null); }}>继续</button>
        </> : <div className="choices">
          {stNode.choices.map((c, ci) => {
            const noSilver = c.cost?.silver && s.silver < c.cost.silver;
            const noItem = c.cost?.item && !((s.items[c.cost.item] || 0) > 0);
            return <button key={ci} disabled={noSilver || noItem} onClick={() => choose(c)}>
              {c.text}
              {c.combat ? <small>{OPPONENTS[c.combat].realm} · 危险度 {OPPONENTS[c.combat].danger} · 自动交手 / 可脱身</small> : c.diff ? <small>需能力 {c.diff}（你 {ab}）</small> : null}
              {c.failCombat && <small>失手将触发自动交手，可撤离</small>}
              {c.cost?.silver ? <small>银两 -{c.cost.silver}</small> : null}
              {c.cost?.item ? <small>消耗 {ITEMS[c.cost.item].name} ×1{noItem ? '（没有）' : ''}</small> : null}
            </button>;
          })}
        </div>}
      </div>
    </div>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
