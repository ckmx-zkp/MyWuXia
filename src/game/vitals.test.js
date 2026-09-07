import test from 'node:test';
import assert from 'node:assert/strict';
import { initial } from './state.js';
import { restAtInn, vitalStats } from './vitals.js';

test('level growth raises both health and inner-force capacity', () => {
  const low = { ...initial(), expTotal: 0, hp: 50, mp: 50 };
  const high = { ...low, expTotal: 500 };
  const before = vitalStats(low);
  const after = vitalStats(high);
  assert.ok(after.maxHp > before.maxHp);
  assert.ok(after.maxMp > before.maxMp);
  assert.ok(after.hp > before.hp);
  assert.ok(after.mp > before.mp);
  assert.equal(vitalStats({ ...high, hp: 10 }).maxMp, after.maxMp);
});

test('inn rest restores all health and inner force once', () => {
  const tired = { ...initial(), hp: 27, mp: 14, silver: 10 };
  const rested = restAtInn(tired);
  assert.equal(rested.hp, 100);
  assert.equal(rested.mp, 100);
  assert.equal(rested.silver, 5);
  assert.equal(restAtInn(rested), rested);
});
