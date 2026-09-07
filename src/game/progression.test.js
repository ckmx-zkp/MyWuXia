import test from 'node:test';
import assert from 'node:assert/strict';
import { initial } from './state.js';
import { createIdleRuntime } from './idle-runtime.js';
import { claimIdleRewards, mastery, pairing, earnTraining, trainingAbility } from './training.js';
import { startCombat, advanceCombat, retreatCombat } from './combat.js';
import { encodeSave, migrateSave } from './saves.js';
import { ability, abilityParts } from './ability.js';

test('idle rewards train the selected pair and silver can only be claimed once', () => {
  const r = createIdleRuntime(s => s, exp => Math.floor(exp / 100));
  let s = initial();
  for (let i = 0; i < 5; i++) s = r.advance(s);
  assert.equal(s.training.styles['基本拳脚'], 5);
  assert.equal(s.training.internals.basic, 5);
  assert.ok(trainingAbility(s).total > trainingAbility(initial()).total);
  assert.ok(ability(s) > ability(initial()));
  assert.equal(ability(s), Object.values(abilityParts(s)).reduce((sum, value) => sum + value, 0));
  assert.equal(s.idleBank.silver, 5);
  const claimed = claimIdleRewards(s);
  assert.equal(claimed.silver, s.silver + 5);
  assert.equal(claimIdleRewards(claimed), claimed);
  assert.deepEqual(migrateSave(encodeSave(claimed)), { ...claimed, fx: null });
});
test('pending mastery keeps its original style and multiplier through save and switching', () => {
  const r = createIdleRuntime(s => s, exp => Math.floor(exp / 100));
  const s = initial(); r.advance(s);
  const other = { ...s, devMult: 10, loadout: { ...s.loadout, style: '罗汉拳', internal: 'luohan' } };
  r.advance(other);
  const snapshot = r.snapshot(other);
  assert.equal(snapshot.training.styles['基本拳脚'], 1);
  assert.equal(snapshot.training.styles['罗汉拳'], 10);
  assert.equal(snapshot.training.internals.luohan, 10);
  assert.equal(snapshot.idleBank.silver, 11);
  assert.deepEqual(r.snapshot(other), snapshot);
});
test('mastery and compatible internal skills change actual combat and survive an exact resume', () => {
  const s = { ...initial(), expTotal: 2000, loadout: { ...initial().loadout, internal: 'luohan' } };
  const trained = earnTraining(s, 900);
  assert.equal(mastery(900), 4);
  assert.equal(mastery(99999), 10);
  assert.ok(pairing(trained).compatible);
  assert.ok(!pairing({ ...trained, loadout: { ...trained.loadout, style: '落叶剑法' } }).compatible);
  const low = startCombat(s), high = startCombat(trained);
  assert.ok(high.battle.player.attack > low.battle.player.attack);
  assert.ok(high.battle.player.maxMp > low.battle.player.maxMp);
  assert.deepEqual(advanceCombat(high), advanceCombat(migrateSave(encodeSave(high))));
  assert.deepEqual(retreatCombat(high).training, trained.training);
});
test('version 2 migration preserves progress and initializes new growth fields', () => {
  const old = { ...initial(), expTotal: 600, silver: 90 };
  delete old.training; delete old.fate; delete old.worldTime; delete old.idleBank;
  const restored = migrateSave({ version: 2, state: old });
  assert.equal(restored.expTotal, 600); assert.equal(restored.silver, 90);
  assert.deepEqual(restored.training, { styles: {}, internals: {} });
  assert.equal(restored.fate.node, 'locked');
  assert.throws(() => migrateSave({ ...initial(), fate: { node: 'missing' } }), /命运/);
});
