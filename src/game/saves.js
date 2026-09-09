import { initial } from './state.js';
import { STYLES, STRATEGIES, BREATHS, FOOTWORK, OPPONENTS, normalizeLoadout } from '../content/combat.js';
import { INTERNALS } from './training.js';
import { FATES } from '../content/fates.js';
import { QUEST_INDEX } from '../content/quest-index.js';
import { validateProgression } from './p0-save.js';
import { ACTIVITIES, ROOMS } from '../content/p0.js';
import { isSaveId } from './save-id.js';

export const SAVE_KEY = 'jianghu-save-v1';
export const SAVE_VERSION = 10;
export const SLOT_KEYS = [1, 2, 3].map(n => `jianghu-slot-${n}`);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const finite = (x, min = 0, max = 1e12) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const text = x => typeof x === 'string' && x.length <= 10000;
const safeKey = k => !['__proto__', 'constructor', 'prototype'].includes(k);
const record = (input, check) => object(input) ? Object.fromEntries(Object.entries(input).filter(([k, v]) => safeKey(k) && check(v, k))) : {};
function validFighter(f) {
  return object(f) && text(f.name) && ['hp', 'mp', 'attack', 'speed', 'cooldown', 'moveIndex', 'level'].every(k => finite(f[k]))
    && finite(f.maxHp, 1) && finite(f.maxMp, 1) && f.hp <= f.maxHp && f.mp <= f.maxMp
    && STYLES[f.loadout?.style] && STRATEGIES[f.loadout?.strategy] && BREATHS[f.loadout?.breath] && FOOTWORK[f.loadout?.footwork]
    && (f.loadout.internal === undefined || Object.hasOwn(INTERNALS, f.loadout.internal))
    && ['recoveryBonus', 'armorBonus'].every(k => f[k] === undefined || finite(f[k], 0, 1))
    && (f.traits===undefined || object(f.traits) && ['protection','penetration','economy','evasion'].every(k=>finite(f.traits[k],0,0.3)));
}
function validBattle(b, validateContext) {
  return object(b) && b.version === 1 && OPPONENTS[b.opponent] && validFighter(b.player) && validFighter(b.enemy)
    && finite(b.seed, 1, 4294967295) && Number.isInteger(b.seed) && finite(b.round, 0, 60) && Number.isInteger(b.round)
    && ['active', 'won', 'lost', 'draw', 'escaped'].includes(b.status) && typeof b.settled === 'boolean'
    && (b.status === 'active' ? !b.settled : b.settled) && [1, 2, 5, 10].includes(b.rewardMult)
    && text(b.place) && Array.isArray(b.log) && b.log.length <= 200 && b.log.every(text)
    && (!b.context || validateContext?.(b.context)) && (b.result === undefined || text(b.result));
}

export function migrateSave(raw, { validateContext, validateTree } = {}) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!object(parsed)) throw new Error('存档内容不是有效对象。');
  if (parsed.version !== undefined && ![1, 2, 3, 4, 5, 6, 7, 8, 9, SAVE_VERSION].includes(parsed.version)) throw new Error('存档版本不受支持，请使用相应版本的游戏。');
  const input = parsed.version !== undefined ? parsed.state : parsed;
  if (!object(input) || !finite(input.expTotal) || !finite(input.hp, 0, 100) || !finite(input.loc, 0, 12) || !Number.isInteger(input.loc)) throw new Error('存档缺少有效的角色与区域数据。');
  const state = initial();
  for (const k of ['expTotal', 'hp', 'silver', 'attrAb']) if (finite(input[k])) state[k] = input[k];
  if (finite(input.mp, 0, 100)) state.mp = input.mp;
  if (finite(input.rep, -1e12)) state.rep = input.rep;
  state.loc = input.loc;
  if (text(input.name) && input.name.trim()) state.name = input.name.slice(0, 40);
  if (input.devMult === 10) state.devMult = 10;
  for (const k of ['idle', 'muteBgm', 'muteSfx', 'muteVoice']) {
    if (typeof input[k] === 'boolean') state[k] = input[k];
    else if (k.startsWith('mute') && typeof input.mute === 'boolean') state[k] = input.mute;
  }
  if (object(input.bonusSkill) && text(input.bonusSkill.name) && text(input.bonusSkill.text) && finite(input.bonusSkill.bonus)) state.bonusSkill = { name: input.bonusSkill.name, text: input.bonusSkill.text, bonus: input.bonusSkill.bonus };
  state.items = input.items === undefined ? state.items : record(input.items, v => Number.isInteger(v) && finite(v));
  state.favor = record(input.favor, v => finite(v, -1e12));
  state.done = record(input.done, (v, k) => /^\d+$/.test(k) && +k < 13 && Array.isArray(v) && v.length <= 4 && v.every(x => typeof x === 'boolean'));
  state.treeDone = record(input.treeDone, (v, k) => /^\d+:[\w-]+$/.test(k) && +k.split(':')[0] < 13 && Number.isInteger(v) && finite(v, 0, 100) && (!validateTree || validateTree(k, v)));
  state.flag = record(input.flag, v => typeof v === 'boolean' || text(v) || finite(v, -1e12));
  state.npcStates = record(input.npcStates, text);
  state.questChoices = record(input.questChoices, v => object(v) && Object.values(v).every(x => object(x) && Number.isInteger(x.choice) && x.choice >= 0 && typeof x.success === 'boolean'));
  state.training = {
    styles: record(input.training?.styles, (v, k) => Object.hasOwn(STYLES, k) && Number.isInteger(v) && finite(v, 0, 8100)),
    internals: record(input.training?.internals, (v, k) => Object.hasOwn(INTERNALS, k) && Number.isInteger(v) && finite(v, 0, 8100)),
  };
  state.idleBank = { silver: finite(input.idleBank?.silver, 0, 1e9) ? Math.floor(input.idleBank.silver) : 0 };
  state.routineDone = record(input.routineDone, (v, k) => /^\d+:(practice|errand|escort)$/.test(k) && +k.split(':')[0] < 13 && Number.isInteger(v) && finite(v, 0, 1e9));
  state.worldTime = finite(input.worldTime) && Number.isInteger(input.worldTime) ? input.worldTime : 0;
  state.factionRelations = record(input.factionRelations, (v, k) => ['north_east', 'north_west', 'east_west'].includes(k) && finite(v, -100, 100));
  if (input.fate !== undefined) {
    const f = input.fate;
    if (!object(f) || !Object.hasOwn(FATES, f.node) || !finite(f.enteredAt, 0, state.worldTime) || !Number.isInteger(f.enteredAt)
      || !Array.isArray(f.history) || f.history.length > 100 || !f.history.every(h => object(h) && Object.hasOwn(FATES, h.node)
        && Object.hasOwn(FATES, h.next) && text(h.choice) && text(h.text) && finite(h.at, 0, state.worldTime))) throw new Error('命运记录损坏。');
    state.fate = structuredClone(f);
  }
  if ((state.treeDone['0:WX-01'] || 0) >= QUEST_INDEX['WX-01'].nodes.length) state.flag['0:WX-01:complete'] = true;
  for(const [key,count] of Object.entries(state.treeDone)) {
    const tree=QUEST_INDEX[key.split(':')[1]];
    if(tree && count===tree.nodes.length) state.flag[`${key}:complete`]=true;
  }
  for (const k of ['rumors', 'log']) if (Array.isArray(input[k])) state[k] = input[k].filter(text).slice(0, k === 'log' ? 8 : 500);
  if (Array.isArray(input.letters)) state.letters = input.letters.filter(v => object(v) && text(v.from) && text(v.text)).slice(0, 500);
  if (Array.isArray(input.visited)) state.visited = [...new Set(input.visited.filter(v => Number.isInteger(v) && v >= 0 && v < 13))];
  if (!state.visited.includes(state.loc)) state.visited.push(state.loc);
  if (finite(input.rngState, 1, 4294967295) && Number.isInteger(input.rngState)) state.rngState = input.rngState;
  if (isSaveId(input.saveId)) state.saveId = input.saveId;
  if (input.p0 !== undefined) state.p0 = validateProgression(input.p0);
  // Previously earned membership/exam/returned letters retain their mentor credit.
  if((parsed.version || 1)<9 && state.p0?.sect==='wudang' && !Object.hasOwn(state.favor,'武当教习')) {
    state.favor['武当教习']=10+(state.p0.rank>=1?10:0)+(state.p0.facts.medicine_returned?5:0);
  }
  state.loadout = normalizeLoadout(state, input.loadout || {});
  if (input.battle) {
    if (!validBattle(input.battle, validateContext)) throw new Error('战斗存档损坏，无法安全恢复。');
    state.battle = structuredClone(input.battle);
  }
  const a = input.action;
  if (state.battle?.status === 'active') state.action = { type: 'combat' };
  else if (a?.type === 'combat') throw new Error('战斗记录缺失，无法安全恢复。');
  else if (object(a) && ['travel', 'quest', 'routine', 'spar'].includes(a.type)) {
    if (!Number.isInteger(a.total) || !Number.isInteger(a.left) || !finite(a.total, 1, 86400) || !finite(a.left, 1, a.total)) throw new Error('行动计时损坏。');
    if (a.type === 'travel' && Number.isInteger(a.to) && finite(a.to, 0, 12)) state.action = { type: a.type, to: a.to, left: a.left, total: a.total };
    else if (Number.isInteger(a.zone) && finite(a.zone, 0, 12) && a.type === 'routine' && ['practice', 'errand', 'escort'].includes(a.id)) state.action = { type: a.type, zone: a.zone, id: a.id, left: a.left, total: a.total };
    else if (Number.isInteger(a.zone) && finite(a.zone, 0, 12) && (a.type === 'spar' || Number.isInteger(a.idx) && finite(a.idx, 0, 3))) state.action = { type: a.type, zone: a.zone, idx: a.idx, left: a.left, total: a.total };
    else throw new Error('行动目标损坏。');
  }
  if (state.p0) {
    const pending = Object.entries(state.p0.quests).filter(([, q]) => q.pending);
    for (const [id, q] of pending) if (state.battle?.status !== 'active' || state.battle.context?.eventId !== id || state.battle.context?.choiceId !== q.pending || state.battle.context?.nodeId !== q.node) throw new Error('支线战斗记录缺失。');
    if (state.battle?.status === 'active' && state.battle.context?.kind === 'side' && pending.length !== 1) throw new Error('支线待结算记录缺失。');
    if (state.p0.activity && (state.action || state.battle)) throw new Error('活动与战斗不能同时进行。');
    if (state.p0.activity) {
      const a = ACTIVITIES[state.p0.activity.id];
      if ((a.rooms && (!a.rooms.includes(state.p0.room) || ROOMS[state.p0.room].zone !== state.loc)) || (a.sect && state.p0.sect !== 'wudang')) throw new Error('活动地点或身份损坏。');
    }
    state.idle = false;
  }
  return state;
}
export function encodeSave(state, now = Date.now()) {
  return JSON.stringify({ version: SAVE_VERSION, savedAt: now, state: { ...state, fx: null } });
}
export function readSave(storage, key = SAVE_KEY, options) {
  let failure = null;
  for (const candidate of [key, `${key}-backup`]) {
    try {
      const raw = storage.getItem(candidate);
      if (!raw) continue;
      return { state: migrateSave(raw, options), recovered: candidate !== key, savedAt: JSON.parse(raw).savedAt || null };
    } catch (error) { failure = error; }
  }
  if (failure) throw failure;
  return null;
}
export function writeSave(storage, state, key = SAVE_KEY, options) {
  const raw = encodeSave(state);
  migrateSave(raw, options);
  const old = storage.getItem(key);
  if (old) {
    let valid = false;
    try { migrateSave(old, options); valid = true; } catch { /* Preserve the existing good backup. */ }
    if (valid) storage.setItem(`${key}-backup`, old);
  }
  storage.setItem(key, raw);
}
export function clearAutoSave(storage) {
  storage.removeItem(SAVE_KEY);
  storage.removeItem(`${SAVE_KEY}-backup`);
}
