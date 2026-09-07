import { BASICS, WEAPONS } from '../content/p0.js';
import { SKILLS } from '../content/martial.js';

export const styleFamily = name => /剑|刀|棒|六脉/.test(name) ? 'blade' : 'fist';
export const ownsStyle = (s, name) => !s.p0 ? SKILLS.some(k => k.name === name && Math.floor(s.expTotal / 100) + 1 >= k.lv) || s.bonusSkill?.name === name
  : Object.hasOwn(s.p0.styles, name) || s.bonusSkill?.name === name;
export const trainingCap = (s, kind, target) => !s.p0 ? 8100 : Math.max(s.training[kind]?.[target] || 0,
  Math.min((kind === 'styles' ? s.p0.styles : s.p0.internals)[target]?.cap || (s.bonusSkill?.name === target ? 900 : 100),
    s.p0.basics[kind === 'styles' ? styleFamily(target) : 'internal'] || 100));
export function beginProgression(s, legacy = false) {
  if (s.p0) return s;
  const learned = (cap, source) => ({ cap, source });
  const styles = { '基本拳脚': learned(900, '立身基本功') };
  if (s.bonusSkill) styles[s.bonusSkill.name] = learned(900, '家传');
  if (legacy) for (const k of SKILLS.filter(k => Math.floor(s.expTotal / 100) + 1 >= k.lv)) styles[k.name] = learned(8100, '旧日领悟');
  const internals = { basic: learned(900, '基础吐纳') };
  if (legacy) for (const [id, lv] of [['luohan', 1], ['quanzhen', 15], ['chunyang', 175], ['yijin', 370]]) {
    if (Math.floor(s.expTotal / 100) + 1 >= lv) internals[id] = learned(8100, '旧日领悟');
  }
  return { ...s, idle: false, p0: { potential: 40, basics: Object.fromEntries(Object.keys(BASICS).map(k => [k, legacy ? 8100 : 100])), styles, internals,
    room: s.loc === 1 ? 'wudang-gate' : 'gate', discovered: ['gate'], materials: { herbs: 0 }, knowledge: 0,
    weapon: legacy || s.bonusSkill?.name === '落叶剑法' ? 'practice' : 'hands', weapons: ['hands', 'practice'], sect: null, contribution: 0, rank: 0,
    activity: null, report: null, quests: {}, facts: {}, npcs: {}, journal: [], sequence: 0 } };
}
export const equippedWeapon = s => WEAPONS[s.p0?.weapon] || WEAPONS.hands;
