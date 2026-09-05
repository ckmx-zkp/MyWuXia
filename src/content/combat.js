import { SKILLS, START_SKILLS } from './martial.js';

// 招名用于战斗演绎；未解锁的武学不能配入战斗。
const forms = {
  '基本拳脚': ['冲拳', '扫堂腿', 1, 0.05],
  '太祖长拳': ['冲阵长拳', '双抄封天', 1.25, 0.08],
  '罗汉拳': ['罗汉伏虎', '推窗望月', 1.05, 0.25],
  '落叶剑法': ['平沙落雁', '落叶随风', 1.12, 0.08],
  '六合刀': ['六合分光', '横刀断流', 1.3, 0.12],
  '松风剑法': ['松涛迎客', '风过长林', 1.25, 0.08],
  '武当绵掌': ['绵里藏针', '回风拂柳', 1.18, 0.25],
  '华山剑法': ['白云出岫', '有凤来仪', 1.4, 0.1],
  '打狗棒法残招': ['拨草寻蛇', '棒打双犬', 1.4, 0.16],
  '少林擒拿手': ['拈花擒腕', '分筋锁臂', 1.4, 0.22],
  '六脉残谱': ['无形剑指', '隔空点穴', 1.6, 0.1],
  '独孤九剑破式': ['破剑式', '破刀式', 1.7, 0.2],
  '太玄经影': ['十步一人', '千里留行', 1.8, 0.18],
  '无量剑法': ['顺水推舟', '双剑合围', 1.12, 0.08],
  '全真掌法': ['掌托铜钟', '隔钟催劲', 1.4, 0.2],
  '七弦无形剑': ['七弦无形剑', '急弦裂帛', 1.6, 0.1],
  '吸星大法': ['吸星牵引', '掌锁气脉', 1.4, 0.22],
  '点穴试招': ['点穴试笔', '横担拦路', 1.4, 0.22],
  '军阵枪法': ['铁甲冲阵', '长枪拒马', 1.3, 0.12],
};
export const STYLES = Object.fromEntries(Object.entries(forms).map(([name, [first, second, power, parry]]) => [name, {
  name, moves: [first, second], power, parry,
  speed: /剑|落叶/.test(name) ? 5 : 0,
}]));
export const STRATEGIES = {
  balanced: { name: '攻守兼备', text: '招式就绪即施展，内力不足时调息。', damage: 1, guard: 0.05, threshold: 0.15 },
  aggressive: { name: '抢攻压制', text: '招式威力提高两成，防守较弱，内力消耗更快。', damage: 1.2, guard: -0.06, threshold: 0.08 },
  cautious: { name: '稳守反击', text: '提高招架机会，保留内力，招式威力降低一成。', damage: 0.9, guard: 0.2, threshold: 0.35 },
};
export const BREATHS = {
  flowing: { name: '吐纳行气', text: '每次调息恢复三成内力。', recovery: 0.3, armor: 0 },
  guarding: { name: '凝气护体', text: '减伤 15%，调息恢复两成内力。', recovery: 0.2, armor: 0.15 },
};
export const FOOTWORK = {
  light: { name: '轻身游走', text: '更易闪避、先出手。', dodge: 0.12, speed: 6, armor: 0 },
  rooted: { name: '沉腰坐马', text: '站稳下盘，额外减伤 10%。', dodge: 0.03, speed: 0, armor: 0.1 },
};
export const OPPONENTS = {
  student: { name: '陪练弟子', style: '太祖长拳', strategy: 'balanced', breath: 'flowing', footwork: 'rooted', scale: 0.65, realm: '初学乍练', danger: '低', text: '长拳直进，攻守均衡，适合初试招式。' },
  swordsman: { name: '快剑师兄', style: '落叶剑法', strategy: 'aggressive', breath: 'flowing', footwork: 'light', scale: 0.85, realm: '初出茅庐', danger: '中', text: '步法轻快，抢先出剑，内力消耗较快。' },
  instructor: { name: '坐馆教头', style: '罗汉拳', strategy: 'cautious', breath: 'guarding', footwork: 'rooted', scale: 1.1, realm: '略有小成', danger: '高', text: '下盘稳固，善于招架，切磋点到为止。' },
  wuliang: { name: '东宗弟子', style: '无量剑法', strategy: 'aggressive', breath: 'flowing', footwork: 'light', scale: 0.8, realm: '初学乍练', danger: '中', text: '两名弟子一前一后逼来。挡开他们的剑势，为段誉争取退路；不敌时仍能受伤脱身。', moves: ['顺水推舟', '双剑合围'] },
};
const encounter = (name, style, moves, realm = '初出茅庐', goal = null) => ({
  name, style, moves, strategy: 'balanced', breath: 'flowing', footwork: 'light', scale: 0.8,
  realm, danger: /大成|高手|宗师/.test(realm) ? '高' : '中', goal,
  text: goal ? `不必击倒对手，撑住 ${goal} 回合便可达成交手目标；不敌时可抽身求援。` : '依照已配置的武学自动交手，不敌时可抽身脱离。',
});
Object.assign(OPPONENTS, {
  thug: encounter('赌场打手', '基本拳脚', ['横臂擒拿', '短刀逼身']),
  shisong: encounter('史松', '六合刀', ['快刀截路', '横刀追魂']),
  soldiers: encounter('追兵', '军阵枪法', ['长枪封路', '横扫千军']),
  qingcheng: encounter('青城弟子', '松风剑法', ['松涛迎客', '穿林刺剑']),
  hongrenxiong: encounter('洪人雄', '松风剑法', ['松风压顶', '青城回剑'], '江湖高手'),
  qiuchuji: encounter('丘处机', '全真掌法', ['掌托铜钟', '隔钟催劲'], '江湖高手', 3),
  guards: encounter('禁军亲卫', '军阵枪法', ['铁甲冲阵', '长枪拒马']),
  fengboe: encounter('风波恶', '六合刀', ['快刀连环', '回风断流'], '江湖高手'),
  huangzhonggong: encounter('黄钟公', '七弦无形剑', ['七弦无形剑', '急弦裂帛'], '江湖高手', 3),
  renwoxing: encounter('任我行', '吸星大法', ['吸星牵引', '掌锁气脉'], '一代宗师', 4),
  beggars: encounter('激愤帮众', '基本拳脚', ['乱棍封路', '结阵横拦']),
  shennong: encounter('神农帮刀客', '六合刀', ['毒刀斜掠', '封山断路']),
  disciples: encounter('渔樵耕读四弟子', '点穴试招', ['点穴试笔', '横担拦路', '翻掌擒腕', '运劲推山'], '江湖高手', 4),
  bandit: encounter('拦路山贼', '六合刀', ['横刀劫路', '劈山断木']),
  waterbandit: encounter('太湖水匪', '六合刀', ['分水挑刀', '浪里翻身']),
  spy: encounter('渡口探子', '基本拳脚', ['短刃突刺', '转身封喉']),
  horsebandit: encounter('河西马贼', '六合刀', ['驰马拖刀', '卷沙横斩']),
  pirate: encounter('海盗头目', '六合刀', ['踏浪分刀', '铁钩锁腕']),
});
export const QUEST_COMBATS = {
  '太湖追查失镖': 'waterbandit', '守住汉水军情': 'spy', '护送伤兵入城': 'soldiers',
  '打通河西商路': 'horsebandit', '护送西域商队': 'horsebandit',
  '青城破阵': 'qingcheng', '贵阳护商队': 'bandit', '神龙岛查海盗': 'pirate',
};
export function availableStyles(state) {
  const level = Math.floor(state.expTotal / 100) + 1;
  return [...new Set([
    ...SKILLS.filter(s => level >= s.lv && STYLES[s.name]).map(s => s.name),
    ...START_SKILLS.filter(s => s.name === state.bonusSkill?.name).map(s => s.name),
  ])];
}
export function normalizeLoadout(state, input = state.loadout || {}) {
  const available = availableStyles(state);
  return {
    style: available.includes(input.style) ? input.style : available.includes(state.bonusSkill?.name) ? state.bonusSkill.name : '基本拳脚',
    strategy: STRATEGIES[input.strategy] ? input.strategy : 'balanced',
    breath: BREATHS[input.breath] ? input.breath : 'flowing',
    footwork: FOOTWORK[input.footwork] ? input.footwork : 'light',
  };
}
