import { ACTIVITIES, BASICS, ROOMS, SIDE_EVENTS, WEAPONS } from '../content/p0.js';
import { STYLES } from '../content/combat.js';
import { INTERNALS } from './training.js';

const object = x => x && typeof x === 'object' && !Array.isArray(x);
const number = (x, max = 1e12) => Number.isFinite(x) && Number.isInteger(x) && x >= 0 && x <= max;
const text = x => typeof x === 'string' && x.length <= 10000;
const knownRecord = (value, catalog, check) => object(value) && Object.entries(value).every(([k, v]) => Object.hasOwn(catalog, k) && check(v));
export function validateProgression(p) {
  const fail = () => { throw new Error('成长与支线存档损坏，无法安全恢复。'); };
  const learned = v => object(v) && number(v.cap, 8100) && text(v.source);
  if (!object(p) || !['potential', 'contribution', 'rank', 'knowledge', 'sequence'].every(k => number(p[k]))
    || p.rank > 1 || p.knowledge > 100 || !knownRecord(p.basics, BASICS, v => number(v, 8100)) || Object.keys(p.basics).length !== 5
    || !knownRecord(p.styles, { ...STYLES, '纯阳无极功': true, '易筋经神髓': true }, learned) || !p.styles['基本拳脚']
    || !knownRecord(p.internals, INTERNALS, learned) || !p.internals.basic
    || !Object.hasOwn(ROOMS, p.room) || !Array.isArray(p.discovered) || !p.discovered.every(id => Object.hasOwn(ROOMS, id))
    || !Object.hasOwn(WEAPONS, p.weapon) || !Array.isArray(p.weapons) || !p.weapons.includes(p.weapon) || !p.weapons.every(id => Object.hasOwn(WEAPONS, id))
    || !object(p.materials) || !number(p.materials.herbs) || ![null, 'wudang'].includes(p.sect)
    || !object(p.facts) || !Object.entries(p.facts).every(([k, v]) => /^[a-z_]+$/.test(k) && typeof v === 'boolean')
    || !object(p.npcs) || !Object.entries(p.npcs).every(([k, v]) => /^[a-z_]+$/.test(k) && text(v))
    || !knownRecord(p.quests, SIDE_EVENTS, q => object(q) && typeof q.done === 'boolean')
    || !Array.isArray(p.journal) || p.journal.length > 200 || !p.journal.every(j => object(j) && number(j.id, p.sequence) && number(j.at) && ['eventId', 'nodeId', 'choiceId', 'result', 'text'].every(k => text(j[k])))) fail();
  for (const [id, q] of Object.entries(p.quests)) {
    const node = SIDE_EVENTS[id].nodes[q.node];
    if (!node || q.done !== !!node.terminal || (q.pending !== null && !node.choices.some(c => c.id === q.pending && c.combat))) fail();
  }
  if (p.activity !== null) {
    const a = p.activity, definition = ACTIVITIES[a?.id];
    if (!definition || !number(a.settledAt, 1e15) || !number(a.remainder, definition.seconds * 1000 - 1) || !text(a.target)) fail();
    if (a.id === 'basic' && !Object.hasOwn(BASICS, a.target)) fail();
    if (a.id === 'style' && !Object.hasOwn(p.styles, a.target)) fail();
    if (a.id === 'internal' && !Object.hasOwn(p.internals, a.target)) fail();
  }
  if (p.report !== null && (!object(p.report) || !Object.hasOwn(ACTIVITIES, p.report.id) || !number(p.report.seconds, 28800)
    || !text(p.report.target) || typeof p.report.capped !== 'boolean' || typeof p.report.stopped !== 'boolean'
    || !object(p.report.earned) || !Object.values(p.report.earned).every(v => Number.isFinite(v) && Math.abs(v) <= 1e12))) fail();
  return structuredClone(p);
}
