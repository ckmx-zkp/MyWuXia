import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

/* ================= 音效 ================= */
const SOUND = { click: '/audio/wood-pluck.wav', quest: '/audio/quest-complete.wav', bell: '/audio/breath-bell.wav' };
function play(src, mute) {
  if (mute) return;
  try { const a = new Audio(src); a.volume = 1.0; a.play().catch(() => {}); } catch (e) { /* 浏览器未解锁音频时忽略 */ }
}

/* ================= 世界数据 ================= */
const ZONES = [
  {
    name: '江南东南', faction: '大宋', danger: 20, cities: '临安、扬州、苏州、嘉兴、福州',
    desc: '天下最繁华之地。楼台烟雨之下，天地会、丐帮与姑苏慕容的暗流交织，一封密信足以搅动整个江南。',
    quests: [
      { name: '查清江南密信的主人', kind: 'main', text: '循着密信上的茶渍与印泥，在临安的酒楼画舫间寻访幕后之人。' },
      { name: '拜访扬州盐商', kind: 'side', text: '盐商的账房里藏着半张字条，需与精明的账房先生周旋。' },
      { name: '太湖追查失镖', kind: 'side', text: '失镖的下落，藏在太湖十二寨酒桌的闲话里。', item: 'jinchuang' },
      { name: '福州镖局送信', kind: 'side', text: '一封加急书信，要赶在潮信之前送到福州镖局。' },
    ],
  },
  {
    name: '荆襄前线', faction: '宋明争夺', danger: 60, cities: '襄阳、江陵、武昌、武当',
    desc: '汉水之畔的最大战区。守城、粮道与军情在此日夜角力，武当山门静静俯瞰烽火。',
    quests: [
      { name: '守住汉水军情', kind: 'main', text: '敌军探子已潜入渡口，必须在开船前截下那份军情。' },
      { name: '护送伤兵入城', kind: 'side', text: '抬着担架穿过箭楼与吊桥，把伤兵送进襄阳城。' },
      { name: '探访武当山道', kind: 'side', text: '沿七十二峰的石阶而上，拜访武当掌门的道童。' },
      { name: '查验渡口粮船', kind: 'side', text: '粮船的吃水线不对，舱底似乎藏着别的东西。', item: 'canye' },
    ],
  },
  {
    name: '中原腹地', faction: '天下中枢', danger: 90, cities: '洛阳、开封、嵩山、少林',
    desc: '武林的中心，也是旧案的中心。门派、世家与会盟在此交错，谁也不能独占中原。',
    quests: [
      { name: '化解洛阳会盟风波', kind: 'main', text: '会盟在即，一封伪造的盟帖却让各派剑拔弩张。' },
      { name: '送达少林请帖', kind: 'side', text: '将法会请帖送上少室山，山门前先过知客僧的考校。' },
      { name: '开封查访军镇', kind: 'side', text: '军镇与豪族暗中交易粮草，去樊楼的酒客口中套话。' },
      { name: '嵩山辨认剑痕', kind: 'side', text: '绝壁上的剑痕，是二十年前那一场夜战留下的。' },
    ],
  },
  {
    name: '河朔燕云', faction: '大辽', danger: 130, cities: '燕京、大同、幽州、雁门关',
    desc: '汉化已深的契丹强国。南院大王的旌旗下，边军、士族与牧马人各怀心事。',
    quests: [
      { name: '查明雁门关旧案', kind: 'main', text: '雁门关外的石壁字迹犹在，当年的旧事却人人讳言。' },
      { name: '救治边军斥候', kind: 'side', text: '一名中箭的斥候倒在烽燧下，先拔箭，再问话。' },
      { name: '拜访幽州士族', kind: 'side', text: '汉人世族在辽廷与江湖之间走钢丝，言辞皆是机锋。' },
      { name: '追踪草原快马', kind: 'side', text: '一匹无主的快马驮着密信，一路向北去了。' },
    ],
  },
  {
    name: '塞北草原', faction: '部族边疆', danger: 170, cities: '张家口、草原王庭、诸营',
    desc: '诸部逐水草而居，白狼旗与雄鹰旗此消彼长。商队与马贼，走着同一条路。',
    quests: [
      { name: '寻回草原军图', kind: 'main', text: '半张军图在部族易手中流转，追它的人不止你一路。' },
      { name: '学习骑射', kind: 'side', text: '弯弓、纵马、回头一箭——草原的规矩要在马背上学的。' },
      { name: '调停牧场争端', kind: 'side', text: '两部为一片冬牧场对峙，说和不成便是见血。' },
      { name: '追踪白狼旗', kind: 'side', text: '白狼旗的骑兵昨夜掠过营边，只留下一串浅蹄印。' },
    ],
  },
  {
    name: '辽东大金', faction: '女真旧国', danger: 210, cities: '上京、辽阳、沈州、长白南麓',
    desc: '老牌女真帝国，贵族仍按旧制演武。长白山的参客与军营的号角互不打扰。',
    quests: [
      { name: '阻止辽阳兵变', kind: 'main', text: '兵变的密约就缝在一名信使的衣领里，先找到他。' },
      { name: '查验军械', kind: 'side', text: '武库登记的弓弩少了三十副，账册上却天衣无缝。' },
      { name: '拜会金国旧臣', kind: 'side', text: '老臣府上的茶凉了三次，话里有话的试探才刚开始。' },
      { name: '长白南麓采药', kind: 'side', text: '老参把头的规矩：进山先祭山，抬参先喊山。', item: 'jiedu' },
    ],
  },
  {
    name: '白山黑水', faction: '满清', danger: 260, cities: '盛京、赫图阿拉、宁古塔',
    desc: '从金国体系中分裂出的新兴强权。谍报、流放与龙脉之说，在此地同样锋利。',
    quests: [
      { name: '截获宁古塔密令', kind: 'main', text: '流人北上的队伍中藏着一道密令，收信人无人知晓。' },
      { name: '盛京寻访旧部', kind: 'side', text: '旧部改换了姓氏与旗籍，要凭一枚旧腰牌相认。' },
      { name: '护送流人北行', kind: 'side', text: '风雪官道上，流人、押差与探子同行一路。' },
      { name: '长白山追踪密使', kind: 'side', text: '密使熟悉雪原，只在背风的雪窝子里过夜。' },
    ],
  },
  {
    name: '西北西夏', faction: '西域门户', danger: 240, cities: '兴庆府、河西走廊、贺兰山',
    desc: '一品堂的招揽帖发往天下，河西商路的驼铃昼夜不息，贺兰山有密道通往山后。',
    quests: [
      { name: '打通河西商路', kind: 'main', text: '商路断绝三月，各处马贼背后似乎站着同一个人。' },
      { name: '贺兰山寻人', kind: 'side', text: '进山的采玉人只回来了一个，嘴里反复念着“白骆驼”。' },
      { name: '兴庆府换情报', kind: 'side', text: '一品堂以情报易情报，先想好你能拿出什么。' },
      { name: '护送西域商队', kind: 'side', text: '驼队里有香料、玉石，还有一位不肯露面的客人。' },
    ],
  },
  {
    name: '关中秦地', faction: '天下枢纽', danger: 200, cities: '长安、华山、终南山、潼关',
    desc: '四塞之国，天下交通的咽喉。华山的剑、终南的墓、潼关的兵马，皆有来历。',
    quests: [
      { name: '平息潼关三方对峙', kind: 'main', text: '官军、义军与商会在潼关粮道对峙，谁先动手谁输。' },
      { name: '华山问剑', kind: 'side', text: '思过崖的石刻剑痕前，问剑者需先自省三问。' },
      { name: '终南山访道', kind: 'side', text: '活死人墓外只有蜂群与石碑，机缘二字急不得。' },
      { name: '风陵渡救人', kind: 'side', text: '渡船将沉，先救落水者，再查是谁凿的船。', item: 'canye' },
    ],
  },
  {
    name: '巴蜀西南', faction: '山地江湖', danger: 260, cities: '成都、重庆、峨眉、青城、剑门',
    desc: '蜀道之难养出独行的门派。峨眉的灯、青城的阵、剑门的栈道，各是一段江湖。',
    quests: [
      { name: '重开剑门古道', kind: 'main', text: '栈道塌了三处，山里却有人不愿它被修好。' },
      { name: '峨眉送药', kind: 'side', text: '金顶的师太等着这服药，山中猴群也盯着你的药篓。' },
      { name: '青城破阵', kind: 'side', text: '青城的剑阵以守为攻，破阵先破其心。', item: 'canye' },
      { name: '重庆夜查盐船', kind: 'side', text: '夜泊的盐船往下游放着空船，船去了哪里？' },
    ],
  },
  {
    name: '云贵大明', faction: '明境腹地', danger: 300, cities: '昆明、贵阳、云南府',
    desc: '西南汉人王朝的腹地，沐王府的仪仗与茶马古道的马帮走在同一条街上。',
    quests: [
      { name: '辨明云南遗诏真伪', kind: 'main', text: '一纸遗诏惊动朝野，墨迹、印泥与人心都要验。' },
      { name: '昆明探旧臣', kind: 'side', text: '旧臣在茶花深处闭门谢客，门环上的灰却新擦过。' },
      { name: '贵阳护商队', kind: 'side', text: '茶马道上瘴气与劫道一样多，镖旗比刀剑管用。' },
      { name: '查明教旧址', kind: 'side', text: '明教旧坛石壁上的火焰纹，近年被人重新描过。' },
    ],
  },
  {
    name: '大理诸国', faction: '西南异域', danger: 340, cities: '大理、无量山、万劫谷、点苍山',
    desc: '佛国与皇族共治，无量山剑湖宫的旧事未远，万劫谷中“恶贯满盈”四字犹在。',
    quests: [
      { name: '寻回无量山信物', kind: 'main', text: '剑湖宫下遗失的信物，牵扯无量剑派两宗的旧怨。' },
      { name: '万劫谷寻药', kind: 'side', text: '谷口石碑写着入谷者死，谷里的药却能活人。', item: 'jiedu' },
      { name: '大理城会使者', kind: 'side', text: '使者要在三杯茶内，分辨你的来意是江湖还是庙堂。' },
      { name: '点苍山救行客', kind: 'side', text: '山道塌方，有行客被困在十九峰的云雾里。' },
    ],
    /* DL-01《无量山风波》：线性任务树样板（软失败不断线，见 docs/gdd/04） */
    tree: {
      name: '无量山风波',
      nodes: [
        { name: '剑湖观剑', text: '剑湖宫东西二宗五年一比。你挤在人群中看热闹，须懂得何时闭嘴。', diff: 20, failHp: -20, failNote: '多嘴被驱赶出场' },
        { name: '梁上少女', text: '梁上坐着个嗑瓜子的少女，厅中段誉正与无量剑派唇枪舌剑。帮谁，是个问题。', diff: 25, failHp: -5, failNote: '两边都没讨到好' },
        { name: '闪电貂', text: '钟灵放出闪电貂，貂快如电、齿有剧毒。它冲你来了。', diff: 35, failHp: -25, failNote: '中貂毒' },
        { name: '神农围山', text: '神农帮封山拿人。守山、救伤员或随众撤离，三条路终在一处汇合。', diff: 30, failHp: -12, failNote: '撤离时挂了彩' },
        { name: '钟灵失踪', text: '钟灵被掳。采蛇胆草与七星叶配药，药理不精只能带伤硬撑。', diff: 40, failHp: -15, failNote: '采药染上轻毒' },
        { name: '夜入药圃', text: '随段誉夜潜神农帮营地。轻功不济，便只能硬闯守卫。', diff: 50, failHp: -20, failNote: '被巡夜弟子发现，硬闯而出' },
        { name: '万劫谷', text: '救人要紧。谷口石碑狰狞，但你已没有退路。', diff: 60, failHp: -20, failNote: '在谷口迷阵里绕了半宿' },
      ],
      reward: { silver: 300, exp: 200, rep: 5, favor: ['钟灵', 10], items: { jinchuang: 3, jiedu: 2 }, rumor: '万劫谷谷口立有“入谷者死”石碑，谷中药性极烈，非有万全准备不可轻入。【万劫谷】' },
    },
  },
  {
    name: '东海海外', faction: '海洋世界', danger: 400, cities: '桃花岛、侠客岛、神龙岛、灵蛇岛',
    desc: '没有朝廷的海上世界。赏善罚恶令、桃花岛奇门与神龙岛的毒，自成一方天地。',
    quests: [
      { name: '解开海外群岛之谜', kind: 'main', text: '各岛之间互不通航，却流传着同一句谜语。', item: 'canye' },
      { name: '桃花岛寻航图', kind: 'side', text: '桃花阵中的航图，走错一步便困到潮落。' },
      { name: '侠客岛送信', kind: 'side', text: '赏善罚恶使者的船不等人，送信要赶潮汐。' },
      { name: '神龙岛查海盗', kind: 'side', text: '海盗的旗语里混着神龙岛的暗号，事情不只是劫财。' },
    ],
  },
];

/* 道路连通关系（索引对应 ZONES） */
const LINKS = { 0: [1, 12], 1: [0, 2, 9], 2: [1, 3, 8], 3: [2, 4, 5], 4: [3], 5: [3, 6], 6: [5], 7: [8], 8: [2, 7, 9], 9: [1, 8, 10], 10: [9, 11], 11: [10], 12: [0] };

const WORLD_INTRO = '五朝并立，三大缓冲区烽烟不息，四大边疆与海外自成江湖。你是沈孤鸿，一名无门无派的行侠者，一卷《天下舆图》在身——走到哪里，哪里便是你的江湖。道路相连处皆可前往，越是深处，越是凶险。';

/* ================= 物品 / 武学 ================= */
const clamp = v => Math.max(1, Math.min(100, Math.round(v)));
const ITEMS = {
  jinchuang: { name: '金创药', text: '外敷止血，气血 +25。', apply: s => ({ hp: clamp(s.hp + 25) }) },
  jiedu: { name: '解毒丸', text: '化解百毒，气血 +10。', apply: s => ({ hp: clamp(s.hp + 10) }) },
  canye: { name: '武学残页', text: '参悟片刻，历练 +20。', apply: s => ({ expTotal: s.expTotal + 20 }) },
};
const SKILLS = [
  { name: '基本拳脚', lv: 1, bonus: 0, text: '江湖人的立身之本，拳脚即道理。' },
  { name: '太祖长拳', lv: 15, bonus: 5, text: '大开大阖，拳风所向披靡。' },
  { name: '六合刀', lv: 30, bonus: 10, text: '刀走六合，攻守兼备。' },
  { name: '武当绵掌', lv: 55, bonus: 18, text: '绵里藏针，后发先至。' },
  { name: '华山剑法', lv: 85, bonus: 30, text: '奇正相生，剑出如虹。' },
  { name: '少林擒拿手', lv: 120, bonus: 45, text: '分筋错骨，近身无敌。' },
  { name: '六脉残谱', lv: 180, bonus: 70, text: '剑气无形，隔空伤敌。' },
  { name: '太玄经影', lv: 260, bonus: 110, text: '石壁蝌蚪文，悟者自成宗师。' },
];

/* 旅途随机事件：(state, zone) => [日志, 状态补丁] */
const ROAD = [
  (s, z) => ability(s) >= z.danger
    ? ['路遇山贼拦路，你三招两式将其击退，匪首丢下十五两银子逃了。', { silver: s.silver + 15 }]
    : ['路遇山贼拦路，寡不敌众，被劫去十两银子，挂彩而归。', { silver: Math.max(0, s.silver - 10), hp: clamp(s.hp - 12) }],
  s => ['与游方道人雨夜同宿，论剑半宿，获益匪浅（历练 +12）。', { expTotal: s.expTotal + 12 }],
  s => ['救起一名受伤镖师，他日镖局必有回报（银两 +20）。', { silver: s.silver + 20 }],
  s => ['暴雨阻路，在破庙歇息一夜，气血稍复。', { hp: clamp(s.hp + 5) }],
  s => ['与西行商队同行一程，赶车人赠你盘缠（银两 +12）。', { silver: s.silver + 12 }],
];

/* 城市设施风貌（同功能、异域皮肤，见 docs/gdd/06 第四节；未列区用通用名） */
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
/* 客栈传闻池（打听消息解锁，见 docs/gdd/06 客栈机制） */
const RUMORS = [
  '京城来了位提督大人，似乎在暗查一封密信。【京城密信】',
  '太湖深处有神秘慕容氏，庄中收藏天下武功图谱。【燕子坞传闻】',
  '嘉兴醉仙楼来了几位怪客，言谈间提起十八年前的旧约。【江南七怪线索】',
  '襄阳城近来夜夜点卯，汉水渡口盘查极严，怕是有大战将至。【襄阳烽火】',
  '福州福威镖局门口的石狮子，近日被人连夜描红了眼睛。【福威镖局】',
  '西夏一品堂广发英雄帖，许以高官厚禄招揽天下好手。【一品堂】',
];

/* ================= 派生数值 ================= */
const lv = e => Math.floor(e / 100) + 1;
const grade = l => l < 20 ? '不堪一击' : l < 50 ? '初学乍练' : l < 80 ? '初出茅庐' : l < 150 ? '马马虎虎' : l < 300 ? '略有小成' : '已有大成';
const ability = s => Math.round(lv(s.expTotal) * (0.35 + s.hp / 100)) + SKILLS.filter(k => lv(s.expTotal) >= k.lv).reduce((a, k) => a + k.bonus, 0);
const DANGER_TAGS = ['平和', '险恶', '凶险', '绝地'];
const dangerTag = d => d < 40 ? 0 : d < 120 ? 1 : d < 260 ? 2 : 3;
const questReward = (z, main) => main
  ? { silver: 40 + Math.round(z.danger / 4), exp: 30, hp: -10, time: 12 }
  : { silver: 16 + Math.round(z.danger / 8), exp: 15, hp: 4, time: 8 };

/* ================= 存档 ================= */
const SAVE_KEY = 'jianghu-save-v1';
const initial = () => ({
  expTotal: 1251, hp: 79, silver: 168, loc: 0, idle: true, mute: false,
  done: {}, items: { jinchuang: 1 }, action: null, fx: null,
  rep: 0, favor: {}, rumors: [], treeDone: {},
  log: ['江南密信已现端倪，下一步需寻访扬州盐商。'],
});
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return { ...initial(), ...JSON.parse(raw), fx: null, action: null };
  } catch (e) { return null; }
}

/* ================= 行动结算 ================= */
function levelUpLog(n, s) {
  if (lv(n.expTotal) > lv(s.expTotal)) {
    n.fx = 'bell';
    n.log = [`突破！等级升至 ${lv(n.expTotal)}，境界「${grade(lv(n.expTotal))}」。`, ...n.log];
  }
  return n;
}
function resolveQuest(s) {
  const { zone, idx } = s.action;
  const z = ZONES[zone], q = z.quests[idx], main = q.kind === 'main';
  const r = questReward(z, main);
  const arr = (s.done[zone] || [false, false, false, false]).slice();
  const n = { ...s, action: null, fx: null, done: { ...s.done, [zone]: arr } };
  const ab = ability(s);
  const p = main ? 1 : Math.max(0.25, Math.min(0.95, 0.45 + (ab / z.danger) * 0.55));
  if (Math.random() < p) {
    arr[idx] = true;
    n.silver += r.silver;
    n.expTotal += r.exp;
    n.hp = clamp(n.hp + r.hp);
    let gain = `银两 +${r.silver}、历练 +${r.exp}`;
    if (q.item) {
      n.items = { ...n.items, [q.item]: (n.items[q.item] || 0) + 1 };
      gain += `、${ITEMS[q.item].name} ×1`;
    }
    let msg = `完成${main ? '小主线' : '支线'}「${q.name}」，${gain}。`;
    if (main && ab < z.danger) msg = '有高人暗中相助，' + msg;
    n.fx = 'quest';
    n.log = [msg, ...s.log];
  } else {
    n.hp = clamp(n.hp - 12);
    n.expTotal += 5;
    n.fx = 'click';
    n.log = [`「${q.name}」行事受挫，带伤而返，仅得历练 5。养足气血或提升实力再来。`, ...s.log];
  }
  n.log = n.log.slice(0, 8);
  return levelUpLog(n, s);
}
function resolveTravel(s) {
  const to = s.action.to;
  const n = { ...s, action: null, fx: 'bell', loc: to, log: [`抵达${ZONES[to].name}。`, ...s.log] };
  const roll = Math.random();
  if (roll < 0.45) {
    const [text, patch] = ROAD[Math.floor(roll * 1000) % ROAD.length](n, ZONES[to]);
    Object.assign(n, patch);
    n.hp = clamp(n.hp);
    n.log = [text, ...n.log];
  }
  n.log = n.log.slice(0, 8);
  return levelUpLog(n, s);
}
/* 任务树节点：线性推进、软失败不断线（docs/gdd/02、04） */
function resolveTree(s) {
  const { zone, idx } = s.action;
  const t = ZONES[zone].tree, node = t.nodes[idx];
  const n = { ...s, action: null, fx: null, treeDone: { ...s.treeDone, [zone]: (s.treeDone[zone] || 0) + 1 } };
  const ok = ability(s) >= node.diff;
  if (ok) {
    n.expTotal += 20;
    n.fx = 'quest';
    n.log = [`【${t.name}】${node.name}：顺利过关，阅历 +20。`, ...s.log];
  } else {
    n.hp = clamp(n.hp + (node.failHp || -15));
    n.expTotal += 8;
    n.fx = 'click';
    n.log = [`【${t.name}】${node.name}：${node.failNote || '行事受挫'}，带伤而过（软失败，主线不断），阅历 +8。`, ...s.log];
  }
  if (idx === t.nodes.length - 1) {
    const r = t.reward;
    n.silver += r.silver;
    n.expTotal += r.exp;
    n.rep = (n.rep || 0) + r.rep;
    n.favor = { ...n.favor, [r.favor[0]]: (n.favor?.[r.favor[0]] || 0) + r.favor[1] };
    n.items = { ...n.items };
    for (const [k, v] of Object.entries(r.items)) n.items[k] = (n.items[k] || 0) + v;
    n.rumors = [...(n.rumors || []), r.rumor];
    n.fx = 'quest';
    n.log = [`任务树《${t.name}》完成！银两 +${r.silver}、阅历 +${r.exp}、声望 +${r.rep}、${r.favor[0]}好感 +${r.favor[1]}，另获药品与新的传闻。`, ...n.log];
  }
  n.log = n.log.slice(0, 8);
  return levelUpLog(n, s);
}
/* 武馆切磋：无死亡惩罚，低等级升级保险机制（docs/gdd/06 武馆） */
function resolveSpar(s) {
  const fac = FAC[s.action.zone] || FAC_DEFAULT;
  const n = { ...s, action: null, fx: null };
  if (ability(s) >= ZONES[s.action.zone].danger * 0.6 + Math.random() * 20) {
    n.expTotal += 15;
    n.fx = 'quest';
    n.log = [`在${fac.gym}切磋获胜，历练 +15。`, ...s.log];
  } else {
    n.hp = Math.max(1, clamp(n.hp - 10));
    n.expTotal += 8;
    n.fx = 'click';
    n.log = [`在${fac.gym}切磋落败，只受了些皮肉伤（切磋不致重伤），历练 +8。`, ...s.log];
  }
  n.log = n.log.slice(0, 8);
  return levelUpLog(n, s);
}
function tick(s) {
  if (s.action) {
    const a = { ...s.action, left: s.action.left - 1 };
    const n = { ...s, action: a };
    if (a.left <= 0) return a.type === 'quest' ? resolveQuest(n) : a.type === 'travel' ? resolveTravel(n) : a.type === 'tree' ? resolveTree(n) : resolveSpar(n);
    return n;
  }
  if (!s.idle) return s.fx ? { ...s, fx: null } : s;
  const n = { ...s, fx: null, expTotal: s.expTotal + 2 };
  if (lv(n.expTotal) > lv(s.expTotal)) {
    n.fx = 'bell';
    n.log = [`突破！等级升至 ${lv(n.expTotal)}，境界「${grade(lv(n.expTotal))}」。`, ...s.log].slice(0, 8);
  }
  return n;
}

/* ================= 界面 ================= */
function App() {
  const [s, setS] = useState(() => load() || initial());
  const [tab, setTab] = useState('武学');
  const [side, setSide] = useState('江湖');
  const level = lv(s.expTotal), ab = ability(s), z = ZONES[s.loc];
  const fac = FAC[s.loc] || FAC_DEFAULT;
  const doneArr = s.done[s.loc] || [];
  const treeCount = s.treeDone[s.loc] || 0;
  const busy = !!s.action;

  useEffect(() => { const t = setInterval(() => setS(tick), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, fx: null })); } catch (e) { /* 忽略 */ } }, [s]);
  useEffect(() => { if (s.fx) play(SOUND[s.fx], s.mute); }, [s.fx, s.mute]);

  const click = () => play(SOUND.click, s.mute);
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
    click();
    if (busy) return;
    const q = z.quests[i], r = questReward(z, q.kind === 'main');
    setS(v => ({ ...v, action: { type: 'quest', zone: s.loc, idx: i, left: r.time, total: r.time }, log: [`着手「${q.name}」……`, ...v.log].slice(0, 8) }));
  };
  const startTree = i => {
    click();
    if (busy || !z.tree) return;
    setS(v => ({ ...v, action: { type: 'tree', zone: s.loc, idx: i, left: 11, total: 11 }, log: [`【${z.tree.name}】前往「${z.tree.nodes[i].name}」……`, ...v.log].slice(0, 8) }));
  };
  const startSpar = () => {
    click();
    if (busy) return;
    setS(v => ({ ...v, action: { type: 'spar', zone: s.loc, left: 8, total: 8 }, log: [`在${fac.gym}摆开架势，与教头切磋……`, ...v.log].slice(0, 8) }));
  };
  const askRumor = () => {
    click();
    if (s.silver < 2) return;
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
    if (!(s.items[id] > 0)) return;
    play(SOUND.bell, s.mute);
    setS(v => ({ ...v, ...ITEMS[id].apply(v), items: { ...v.items, [id]: v.items[id] - 1 }, log: [`使用了${ITEMS[id].name}。`, ...v.log].slice(0, 8) }));
  };
  const rest = () => {
    if (s.silver < 5 || s.hp >= 100) return;
    play(SOUND.bell, s.mute);
    setS(v => ({ ...v, silver: v.silver - 5, hp: clamp(v.hp + 30), log: ['在客栈歇息半日，气血大复（银两 -5）。', ...v.log].slice(0, 8) }));
  };
  const reset = () => {
    if (!window.confirm('重开将清空全部江湖进度，确定？')) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
    setS(initial());
  };

  return <main className="app">
    <header>
      <div className="brand"><small>THE LONG NIGHT OF</small><strong>江湖长夜</strong></div>
      <div className="currency">银两 <b>{s.silver}</b>　历练 <b>{s.expTotal % 100}/100</b>　等级 <b>{level}</b></div>
      <button className="hbtn" onClick={() => { setS(v => ({ ...v, mute: !v.mute })); }}>{s.mute ? '音效：关' : '音效：开'}</button>
      <button className="hbtn" onClick={reset}>重开</button>
    </header>
    <div className="layout">
      {/* 左栏：原型式主导航；世界舆图收进「游历」二级层 */}
      <aside className="map-col">
        <nav className="primary-nav" aria-label="江湖主导航">
          {[['江湖', '♟'], ['行囊', '♜'], ['武学', '▥'], ['门派', '⌂'], ['游历', '⌁']].map(([name, icon]) =>
            <button key={name} className={side === name ? 'on' : ''} onClick={() => {
              click(); setSide(name);
              if (name === '行囊' || name === '武学') setTab(name);
            }}><i>{icon}</i><b>{name}</b></button>
          )}
        </nav>
        {side === '游历' ? <div className="travel-panel">
          <div className="world"><h3>天下大势</h3><p>{WORLD_INTRO}</p></div>
          <div className="map">
            {ZONES.map((zn, i) => {
              const near = LINKS[s.loc].includes(i);
              const done = (s.done[i] || []).filter(Boolean).length;
              const t = dangerTag(zn.danger);
              return <button key={zn.name} disabled={busy || (i !== s.loc && !near)}
                className={i === s.loc ? 'here' : near ? 'near' : 'far'} onClick={() => go(i)}>
                <span>{zn.faction} · <em className={`tag t${t}`}>{DANGER_TAGS[t]}</em></span>
                <b>{zn.name}</b>
                <small>{i === s.loc ? '◈ 当前所在' : near ? '可前往（约十息）' : '道路不通'} · 任务 {done}/4</small>
              </button>;
            })}
          </div>
        </div> : <div className="side-verse">{side === '江湖' ? '风雨江湖路，且从眼前这一封密信走起。' : side === '门派' ? '门派尚未寻得。行走江湖，自有师门相召。' : `${side}所载，皆待你在江湖中慢慢拾得。`}</div>}
      </aside>
      {/* 中栏：当前区域与任务 */}
      <section>
        <article className="paper">
          <div className="chapter">
            <small>{z.faction} · {z.cities} · 凶险度 <em className={`tag t${dangerTag(z.danger)}`}>{DANGER_TAGS[dangerTag(z.danger)]}</em>（推荐能力 {z.danger}）</small>
            <h1>{z.name}</h1>
            <p>{z.desc}</p>
            <p className="hint">本区任务需按线索顺序完成；实力不足时支线可能受挫，小主线自有高人相助，不致卡关。</p>
          </div>
          {z.tree && <>
            <div className="tree-head">
              <small>区域任务树 · 线性主线 · 软失败不断线</small>
              <h2>《{z.tree.name}》</h2>
            </div>
            <div className="mission-list">
              {z.tree.nodes.map((nd, i) => {
                const complete = i < treeCount;
                const locked = i > treeCount;
                const active = s.action?.type === 'tree' && s.action.idx === i;
                return <button key={nd.name} className={`mission ${complete ? 'done' : ''} ${active ? 'active' : ''}`}
                  disabled={complete || locked || busy} onClick={() => startTree(i)}>
                  <span>第{['一', '二', '三', '四', '五', '六', '七'][i] || i + 1}回</span>
                  <div className="qbody"><b>{nd.name}</b><i>{nd.text}</i></div>
                  <small>{complete ? '已过' : locked ? '待前回' : active ? `行动中 ${s.action.left}s` : `前往　难度 ${nd.diff}`}</small>
                </button>;
              })}
            </div>
          </>}
          <div className="mission-list">
            {z.quests.map((q, i) => {
              const complete = !!doneArr[i];
              const locked = i > 0 && !doneArr[i - 1];
              const active = s.action?.type === 'quest' && s.action.zone === s.loc && s.action.idx === i;
              const r = questReward(z, q.kind === 'main');
              return <button key={q.name} className={`mission ${complete ? 'done' : ''} ${active ? 'active' : ''}`}
                disabled={complete || locked || busy} onClick={() => startQuest(i)}>
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
              <button disabled={busy} onClick={startSpar}><b>{fac.gym}</b><small>切磋 · 胜 +15 / 负 +8 历练</small></button>
            </div>
          </div>
        </article>
        {s.action && <div className="actionbar">
          <b>{s.action.type === 'travel' ? `赶路 · ${ZONES[s.action.to].name}` : s.action.type === 'tree' ? `${z.tree.name} · ${z.tree.nodes[s.action.idx].name}` : s.action.type === 'spar' ? `${fac.gym} · 切磋` : `行事 · ${z.quests[s.action.idx].name}`}</b>
          <i><em style={{ width: `${((s.action.total - s.action.left) / s.action.total) * 100}%` }} /></i>
          <span>{s.action.left}s</span>
        </div>}
        <div className="idle">
          <b>挂机修行</b>
          <i><em style={{ width: `${s.expTotal % 100}%` }} /></i>
          <button onClick={() => { click(); setS(v => ({ ...v, idle: !v.idle })); }}>{s.idle ? '暂停' : '继续'}</button>
          <button className="rest" disabled={s.silver < 5 || s.hp >= 100} onClick={rest}>客栈歇息<br />银两 -5</button>
        </div>
      </section>
      {/* 右栏：角色 / 武学 / 行囊 */}
      <aside className="hero">
        <div className="portrait" />
        <h2>沈孤鸿</h2>
        <p>等级 {level}　·　{grade(level)}</p>
        <div className="stat"><span>气血 {s.hp}/100</span><i><em style={{ width: `${s.hp}%` }} /></i></div>
        <div className="ability">
          <small>侠客状态</small>
          <b>{s.hp > 70 ? '气息平稳' : s.hp > 40 ? '略有伤势' : '伤势沉重'}</b>
          <p>当前能力　<strong>{ab}</strong></p>
          <em>能力随等级、气血与武学变化</em>
        </div>
        <div className="rep">
          <span>声望 <b>{s.rep || 0}</b></span>
          {Object.entries(s.favor || {}).map(([k, v]) => <span key={k}>{k} 好感 <b>{v}</b></span>)}
        </div>
        <div className="htabs">
          {['武学', '行囊', '传闻'].map(x => <button key={x} className={tab === x ? 'on' : ''} onClick={() => { click(); setTab(x); }}>{x}</button>)}
        </div>
        {tab === '武学' ? <div className="skills">
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
              <button disabled={!n} onClick={() => useItem(id)}>使用</button>
            </div>;
          })}
        </div> : <div className="rumors">
          {(s.rumors || []).length === 0 && <p className="empty">尚无传闻。去{fac.inn}花二两银子打听消息吧。</p>}
          {(s.rumors || []).map(r => <div key={r} className="rumor"><small>{r}</small></div>)}
        </div>}
      </aside>
    </div>
    <footer>{s.log.slice(0, 4).map(x => <span key={x}>· {x}</span>)}</footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
