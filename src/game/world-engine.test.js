import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldEngine } from './world-engine.js';
import { initial } from './state.js';
import { nextRandom } from './random.js';
import { ZONES } from '../content/world.js';
import { retreatCombat } from './combat.js';
import { encodeSave, migrateSave } from './saves.js';
import { saveOptions } from './save-schema.js';
const engine = createWorldEngine({
  ability: s => Math.floor(s.expTotal / 100),
  questReward: (_z, main) => ({ silver: 20, exp: main ? 30 : 15, hp: main ? -10 : 4 }),
  clamp: n => Math.max(1, Math.min(100, n)),
  ITEMS: { jinchuang: { name: '金创药' }, canye: { name: '残页' } },
  ROAD: Array.from({ length: 4 }, () => () => ['平安路过。', {}]), FAC: {}, FAC_DEFAULT: { gym: '武馆' }, levelUpLog: n => n,
});
test('timed combat quest hands off to a fight; victory completes the task only once', () => {
  const base = { ...initial(), idle: false, expTotal: 60000, action: { type: 'quest', zone: 0, idx: 2, left: 1, total: 8 } };
  let s = engine.tick(base);
  assert.equal(s.action.type, 'combat');
  assert.equal(s.battle.opponent, 'waterbandit');
  s = migrateSave(encodeSave(s), saveOptions);
  for (let i = 0; s.action && i < 61; i++) s = engine.tick(s);
  assert.equal(s.done[0][2], true);
  assert.equal(s.expTotal - base.expTotal, 15);
  assert.equal(s.silver - base.silver, 20);
  assert.equal(s.items.jinchuang, 2);
  assert.equal(engine.tick(s).expTotal, s.expTotal);
});
test('retreating a side quest leaves it retryable, main quests continue with assistance', () => {
  for (const [zone, idx, main] of [[0, 2, false], [1, 0, true]]) {
    const s = engine.tick({ ...initial(), loc: zone, action: { type: 'quest', zone, idx, left: 1, total: 8 } });
    const end = retreatCombat(s, engine.settleStory);
    assert.equal(!!end.done[zone][idx], main);
    assert.equal(end.action, null);
    assert.ok(end.hp > 0);
    assert.equal(end.expTotal - s.expTotal, main ? 30 : 5);
  }
});
test('travel ambush delays arrival, restores during combat, then arrives on retreat', () => {
  let seed = 1;
  while (!(nextRandom(seed).value < 0.45 && Math.floor(nextRandom(seed).value * 1000) % 5 === 0)) seed++;
  const base = { ...initial(), rngState: seed, action: { type: 'travel', to: 1, left: 1, total: 10 } };
  const s = engine.tick(base);
  assert.equal(s.loc, 0);
  assert.equal(s.battle.opponent, 'bandit');
  const end = retreatCombat(migrateSave(encodeSave(s), saveOptions), engine.settleStory);
  assert.equal(end.loc, 1);
  assert.ok(end.visited.includes(1));
  assert.equal(end.silver, base.silver - 10);
  assert.equal(end.action, null);
  assert.match(end.battle.result, new RegExp(ZONES[1].name));
});
test('noncombat quest remains a deterministic timed check and legacy spar enters combat', () => {
  const s = { ...initial(), action: { type: 'quest', zone: 0, idx: 0, left: 1, total: 12 } };
  assert.deepEqual(engine.tick(s), engine.tick(migrateSave(encodeSave(s), saveOptions)));
  assert.equal(engine.tick(s).battle, null);
  assert.equal(engine.tick({ ...initial(), action: { type: 'spar', zone: 0, left: 3, total: 8 } }).action.type, 'combat');
});
test('repeatable practice grants normal levels and mastery independently of the combat test multiplier', () => {
  const base = { ...initial(), idle: false, devMult: 10, action: { type: 'routine', zone: 0, id: 'practice', left: 1, total: 10 } };
  const first = engine.tick(base);
  assert.equal(first.routineDone['0:practice'], 1);
  assert.ok(first.expTotal > base.expTotal);
  assert.equal(first.training.styles['基本拳脚'], 30);
  assert.equal(first.training.internals.basic, 30);
  const second = engine.tick({ ...first, action: { ...base.action } });
  assert.equal(second.routineDone['0:practice'], 2);
  assert.equal(second.training.styles['基本拳脚'], 60);
});
test('routine timers are deterministic and escort retreat cannot farm rewards', () => {
  const errand = { ...initial(), idle: false, action: { type: 'routine', zone: 2, id: 'errand', left: 1, total: 12 } };
  assert.deepEqual(engine.tick(errand), engine.tick(migrateSave(encodeSave(errand), saveOptions)));
  const escort = { ...initial(), idle: false, action: { type: 'routine', zone: 0, id: 'escort', left: 1, total: 15 } };
  const fight = engine.tick(escort);
  assert.equal(fight.battle.context.kind, 'routine');
  const restored = migrateSave(encodeSave(fight), saveOptions);
  const end = retreatCombat(restored, engine.settleStory);
  assert.equal(end.expTotal, escort.expTotal);
  assert.deepEqual(end.training, escort.training);
  assert.equal(end.routineDone['0:escort'], undefined);
});
