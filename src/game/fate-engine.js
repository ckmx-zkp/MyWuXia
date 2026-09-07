import { FATES } from '../content/fates.js';
import { applyEff } from './effects.js';

export function fateChoiceReason(state, choice) {
  const node = FATES[state.fate?.node];
  if (!node || !node.choices.includes(choice)) return '此事已过';
  if (state.action || state.battle) return '先了结当前行动';
  if (node.window && state.worldTime - state.fate.enteredAt >= node.window) return '约期已过';
  if (node.zones && !node.zones.includes(state.loc)) return '尚未抵达会面地点';
  if (state.silver < (choice.cost || 0)) return `需银两 ${choice.cost}`;
  if (Object.entries(choice.requires || {}).some(([k, v]) => state.flag[k] !== v)) return '需要账簿与在场证人';
  return '';
}
function enter(state, next, choice, text) {
  const previous = state.fate.node;
  let n = { ...state, fate: { node: next, enteredAt: state.worldTime,
    history: [...state.fate.history, { node: previous, choice, next, at: state.worldTime, text }].slice(-100) },
    log: [`【三帮命运】${text}`, ...state.log].slice(0, 8) };
  if (next === 'conflict') n = applyEff(n, {
    flag: { three_bangs: 'conflict' },
    factionRelations: { north_east: -30, north_west: -30, east_west: -20 },
    npcStates: { qiaofeng: '北丐帮帮主，与东、西两帮失和', hongqigong: '东丐帮帮主，封路自保', shihuolong: '西丐帮帮主，拒绝互认粮签' },
  });
  return n;
}
function advanceOne(state, delta) {
  const n = { ...state, worldTime: Math.min(1e12, (state.worldTime || 0) + delta) };
  if (n.fate.node === 'locked' && n.flag['0:WX-01:complete']) {
    return enter(n, 'dispute', 'opened', '杏子林事后，三帮信使携失粮案书信来寻你。');
  }
  const node = FATES[n.fate.node];
  if (node.window && n.worldTime - n.fate.enteredAt >= node.window) {
    return enter(n, node.timeout, 'timeout', '约期已过，未能及时查清粮案。三帮封路，仍可寻机补救。');
  }
  return n;
}
export function resolveFateChoice(state, nodeId, choiceId) {
  if (state.fate.node !== nodeId) return state;
  const choice = FATES[nodeId]?.choices.find(c => c.id === choiceId);
  if (!choice || fateChoiceReason(state, choice)) return state;
  let n = applyEff({ ...state, silver: state.silver - (choice.cost || 0) }, choice.effect);
  n = enter(n, choice.next, choice.id, choice.outcome);
  return n;
}

// World seconds are distinct from wall-clock activity time. Visit timeout boundaries.
export function advanceFate(state, seconds = 1) {
  if (!Number.isInteger(seconds) || seconds < 0) throw new Error('世界时间增量无效');
  let s = advanceOne(state, 0), remaining = seconds;
  while (remaining > 0) {
    const node = FATES[s.fate.node];
    const boundary = node.window ? Math.max(1, node.window - (s.worldTime - s.fate.enteredAt)) : remaining;
    const step = Math.min(boundary, remaining);
    s = advanceOne(s, step); remaining -= step;
  }
  return s;
}
