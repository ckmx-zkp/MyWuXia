import { initial } from './state.js';
import { STYLES, STRATEGIES, BREATHS, FOOTWORK, OPPONENTS, normalizeLoadout } from '../content/combat.js';

export const SAVE_KEY = 'jianghu-save-v1';
export const SAVE_VERSION = 2;
export const SLOT_KEYS = [1, 2, 3].map(n => `jianghu-slot-${n}`);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const finite = (x, min = 0, max = 1e12) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const text = x => typeof x === 'string' && x.length <= 10000;
const safeKey = k => !['__proto__', 'constructor', 'prototype'].includes(k);
const record = (input, check) => object(input) ? Object.fromEntries(Object.entries(input).filter(([k, v]) => safeKey(k) && check(v, k))) : {};
function validFighter(f) {
  return object(f) && text(f.name) && ['hp', 'mp', 'attack', 'speed', 'cooldown', 'moveIndex', 'level'].every(k => finite(f[k]))
    && finite(f.maxHp, 1) && finite(f.maxMp, 1) && f.hp <= f.maxHp && f.mp <= f.maxMp
    && STYLES[f.loadout?.style] && STRATEGIES[f.loadout?.strategy] && BREATHS[f.loadout?.breath] && FOOTWORK[f.loadout?.footwork];
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
  if (parsed.version !== undefined && parsed.version !== SAVE_VERSION && parsed.version !== 1) throw new Error('存档版本不受支持，请使用相应版本的游戏。');
  const input = parsed.version !== undefined ? parsed.state : parsed;
  if (!object(input) || !finite(input.expTotal) || !finite(input.hp, 0, 100) || !finite(input.loc, 0, 12) || !Number.isInteger(input.loc)) throw new Error('存档缺少有效的角色与区域数据。');
  const state = initial();
  for (const k of ['expTotal', 'hp', 'silver', 'attrAb']) if (finite(input[k])) state[k] = input[k];
  if (finite(input.rep, -1e12)) state.rep = input.rep;
  state.loc = input.loc;
  if (text(input.name) && input.name.trim()) state.name = input.name.slice(0, 40);
  if ([1, 2, 5, 10].includes(input.devMult)) state.devMult = input.devMult;
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
  for (const k of ['rumors', 'log']) if (Array.isArray(input[k])) state[k] = input[k].filter(text).slice(0, k === 'log' ? 8 : 500);
  if (Array.isArray(input.letters)) state.letters = input.letters.filter(v => object(v) && text(v.from) && text(v.text)).slice(0, 500);
  if (Array.isArray(input.visited)) state.visited = [...new Set(input.visited.filter(v => Number.isInteger(v) && v >= 0 && v < 13))];
  if (!state.visited.includes(state.loc)) state.visited.push(state.loc);
  if (finite(input.rngState, 1, 4294967295) && Number.isInteger(input.rngState)) state.rngState = input.rngState;
  state.loadout = normalizeLoadout(state, input.loadout || {});
  if (input.battle) {
    if (!validBattle(input.battle, validateContext)) throw new Error('战斗存档损坏，无法安全恢复。');
    state.battle = structuredClone(input.battle);
  }
  const a = input.action;
  if (state.battle?.status === 'active') state.action = { type: 'combat' };
  else if (a?.type === 'combat') throw new Error('战斗记录缺失，无法安全恢复。');
  else if (object(a) && ['travel', 'quest', 'spar'].includes(a.type)) {
    if (!Number.isInteger(a.total) || !Number.isInteger(a.left) || !finite(a.total, 1, 86400) || !finite(a.left, 1, a.total)) throw new Error('行动计时损坏。');
    if (a.type === 'travel' && Number.isInteger(a.to) && finite(a.to, 0, 12)) state.action = { type: a.type, to: a.to, left: a.left, total: a.total };
    else if (Number.isInteger(a.zone) && finite(a.zone, 0, 12) && (a.type === 'spar' || Number.isInteger(a.idx) && finite(a.idx, 0, 3))) state.action = { type: a.type, zone: a.zone, idx: a.idx, left: a.left, total: a.total };
    else throw new Error('行动目标损坏。');
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
