import test from 'node:test';
import assert from 'node:assert/strict';
import { initial } from './state.js';
import { advanceFate, resolveFateChoice } from './fate-engine.js';
import { encodeSave, migrateSave } from './saves.js';
const open = () => advanceFate({ ...initial(), flag: { '0:WX-01:complete': true } });
const choose = (s, choice, loc = s.loc) => resolveFateChoice({ ...s, loc }, s.fate.node, choice);
test('evidence and a living witness create an alliance with a distinct cross-region follow-up', () => {
  let s = open();
  s = choose(s, 'trace'); s = choose(s, 'protect', 1);
  s = choose(s, 'alliance', 2);
  assert.equal(s.fate.node, 'alliance');
  assert.equal(s.flag.three_bangs, 'alliance');
  assert.equal(s.factionRelations.north_east, 60);
  assert.match(s.npcStates.hongqigong, /联运/);
  const before = s.silver; s = choose(s, 'escort', 8);
  assert.equal(s.fate.node, 'alliance_end'); assert.equal(s.silver, before + 60);
  assert.equal(resolveFateChoice(s, 'alliance', 'escort'), s);
  assert.deepEqual(migrateSave(encodeSave(s)).fate, s.fate);
});
test('missing witness prevents alliance but leaves a truce and civilian relief route', () => {
  let s = choose(open(), 'trace'); s = choose(s, 'copy', 1);
  s = { ...s, loc: 2 };
  assert.equal(resolveFateChoice(s, 'council', 'alliance'), s);
  s = choose(s, 'truce'); s = choose(s, 'relief');
  assert.equal(s.fate.node, 'truce_end'); assert.equal(s.flag.three_bangs, 'truce');
});
test('world time advances without intervention; timeout survives saves and can be repaired', () => {
  let s = open(); s = { ...s, worldTime: s.fate.enteredAt + 899 };
  s = advanceFate(migrateSave(encodeSave(s)));
  assert.equal(s.fate.node, 'conflict'); assert.equal(s.fate.history.at(-1).choice, 'timeout');
  assert.equal(s.factionRelations.north_west, -30);
  const repaired = choose(s, 'repair'); assert.equal(repaired.fate.node, 'evidence');
  const split = choose(s, 'neutral'); assert.equal(split.fate.node, 'conflict_end');
});
test('fate rejects stale, busy, wrong-region and unaffordable choices without changing state', () => {
  for (const patch of [{ loc: 12 }, { silver: 0 }, { action: { type: 'travel' } }]) {
    const s = { ...open(), ...patch };
    assert.equal(resolveFateChoice(s, 'dispute', 'trace'), s);
  }
  const s = open(); assert.equal(resolveFateChoice(s, 'council', 'truce'), s);
});
