import { STYLES, STRATEGIES, BREATHS, FOOTWORK, OPPONENTS, normalizeLoadout } from '../content/combat.js';
import { nextRandom } from './random.js';

export const MAX_ROUNDS = 60;
function draw(battle) {
  const random = nextRandom(battle.seed);
  battle.seed = random.seed;
  return random.value;
}
function fighter(name, level, hp, loadout, attr = 0) {
  const maxHp = 100 + level * 3;
  const maxMp = 80 + level * 18;
  return { name, level, maxHp, hp: Math.max(1, Math.round(maxHp * hp / 100)), maxMp, mp: maxMp,
    attack: 10 + level * 0.75 + attr * 0.5, speed: 10 + level * 0.3,
    loadout, cooldown: 0, moveIndex: 0 };
}
export function startCombat(state, { opponent = 'student', danger = 20, place = '武馆', context = null, seed } = {}) {
  if (state.action || state.battle || !OPPONENTS[opponent]) return state;
  const loadout = normalizeLoadout(state);
  const enemy = OPPONENTS[opponent];
  const level = Math.floor(state.expTotal / 100) + 1;
  const enemyLevel = Math.max(1, Math.round(danger * enemy.scale));
  const random = { seed: state.rngState || 1 };
  draw(random);
  const battle = {
    version: 1, opponent, place, context, seed: (seed === undefined ? random.seed : seed >>> 0) || 1, round: 0,
    status: 'active', settled: false, rewardMult: state.devMult || 1,
    player: fighter(state.name, level, state.hp, loadout, state.attrAb || 0),
    enemy: fighter(enemy.name, enemyLevel, 100, { style: enemy.style, strategy: enemy.strategy, breath: enemy.breath, footwork: enemy.footwork }),
    log: [`${state.name}在${place}站定，与${enemy.name}遥遥相对。`, '双方依照武学配置自行出招，内力不济时会自动调息。'],
  };
  return { ...state, rngState: random.seed, loadout, battle, action: { type: 'combat' }, fx: null };
}
function strike(battle, actor, target, isEnemy) {
  const style = STYLES[actor.loadout.style];
  const plan = STRATEGIES[actor.loadout.strategy];
  const breath = BREATHS[actor.loadout.breath];
  const cost = Math.round(actor.maxMp * (actor.loadout.strategy === 'aggressive' ? 0.26 : 0.2));
  actor.cooldown = Math.max(0, actor.cooldown - 1);
  if (actor.mp < actor.maxMp * plan.threshold || (actor.cooldown === 0 && actor.mp < cost)) {
    const gained = Math.min(actor.maxMp - actor.mp, Math.ceil(actor.maxMp * breath.recovery));
    actor.mp += gained;
    battle.log.push(`${actor.name}收势凝神，运起「${breath.name}」，内力恢复 ${gained}。`);
    return;
  }
  const special = actor.cooldown === 0;
  const moves = isEnemy && OPPONENTS[battle.opponent].moves || style.moves;
  const move = special ? moves[actor.moveIndex++ % moves.length] : '寻隙进手';
  if (special) { actor.mp -= cost; actor.cooldown = 3; }
  const foot = FOOTWORK[target.loadout.footwork];
  const defense = STRATEGIES[target.loadout.strategy];
  const roll = draw(battle);
  const dodge = Math.min(0.3, foot.dodge + Math.max(-0.03, (target.speed - actor.speed) / 500));
  if (roll < dodge) {
    battle.log.push(`${actor.name}使出一招「${move}」，${target.name}侧身避开，招式落在空处。`);
    return;
  }
  const parried = roll < dodge + Math.max(0, STYLES[target.loadout.style].parry + defense.guard);
  const armor = Math.min(0.5, BREATHS[target.loadout.breath].armor + foot.armor);
  const damage = Math.max(1, Math.round(actor.attack * (special ? style.power * 1.5 : 0.8) * plan.damage
    * (0.85 + draw(battle) * 0.3) * (1 - armor) * (parried ? 0.45 : 1)));
  target.hp = Math.max(0, target.hp - damage);
  battle.log.push(`${actor.name}使出一招「${move}」，${parried ? `${target.name}招架卸去大半力道，仍` : `${target.name}`}${damage > target.maxHp * 0.16 ? '受了重创' : '受伤后退'}（气血 -${damage}）。`);
}
export function stepCombat(source) {
  if (!source || source.status !== 'active') return source;
  const battle = { ...source, player: { ...source.player }, enemy: { ...source.enemy }, log: [...source.log], round: source.round + 1 };
  const speed = f => f.speed + STYLES[f.loadout.style].speed + FOOTWORK[f.loadout.footwork].speed;
  const first = speed(battle.player) + draw(battle) * 8 >= speed(battle.enemy) + draw(battle) * 8 ? 'player' : 'enemy';
  for (const side of [first, first === 'player' ? 'enemy' : 'player']) {
    const other = side === 'player' ? 'enemy' : 'player';
    if (battle[side].hp > 0 && battle[other].hp > 0) strike(battle, battle[side], battle[other], side === 'enemy');
  }
  if (battle.enemy.hp <= 0) battle.status = 'won';
  else if (battle.player.hp <= 0) battle.status = 'lost';
  else if (OPPONENTS[battle.opponent].goal && battle.round >= OPPONENTS[battle.opponent].goal) battle.status = 'won';
  else if (battle.round >= MAX_ROUNDS) battle.status = 'draw';
  battle.log = battle.log.slice(-160);
  return battle;
}
export function finishCombat(state, battle, settleStory) {
  if (!battle || battle.status === 'active' || battle.settled || state.battle?.settled) return state;
  const won = battle.status === 'won';
  const retreat = battle.status === 'escaped';
  const exp = battle.context ? 0 : retreat ? 0 : (won ? 15 : 8) * battle.rewardMult;
  const label = won ? OPPONENTS[battle.opponent].goal ? '接住来招，达成交手目标' : '取胜' : retreat ? '退开脱身' : battle.status === 'draw' ? '双方收招' : '落败';
  // 切磋只造成轻伤；剧情遭遇将真实战斗伤势带回，但绝不死亡。
  const hp = battle.context ? Math.max(1, Math.round(battle.player.hp / battle.player.maxHp * 100))
    : won ? state.hp : Math.max(1, state.hp - 10);
  let next = { ...state, hp, expTotal: state.expTotal + exp, action: null,
    battle: { ...battle, settled: true, result: `${label}。${exp ? `历练 +${exp}。` : ''}${battle.context ? '这场交手的余波已记入江湖。' : won ? '教头抱拳，点到为止。' : '切磋不伤性命，歇息后仍可再来。'}` },
    fx: won ? 'quest' : 'click', log: [`在${battle.place}与${battle.enemy.name}交手，${label}${exp ? `，历练 +${exp}` : ''}。`, ...state.log].slice(0, 8) };
  if (battle.context && settleStory) next = settleStory(next, battle.context, won);
  return next;
}
export function advanceCombat(state, settleStory) {
  if (state.action?.type !== 'combat' || !state.battle) return state;
  const battle = stepCombat(state.battle);
  return battle.status === 'active' ? { ...state, battle } : finishCombat(state, battle, settleStory);
}
export function retreatCombat(state, settleStory) {
  if (state.battle?.status !== 'active') return state;
  return finishCombat(state, { ...state.battle, status: 'escaped', log: [...state.battle.log, `${state.name}虚晃一招，抽身退开。`] }, settleStory);
}
