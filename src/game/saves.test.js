import test from 'node:test';
import assert from 'node:assert/strict';
import { initial } from './state.js';
import { startCombat } from './combat.js';
import { SAVE_KEY, SLOT_KEYS, encodeSave, migrateSave, writeSave, readSave, clearAutoSave } from './saves.js';
const memory = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }; };

test('legacy saves migrate nested defaults and independent mute switches', () => {
  const legacy = { ...initial(), mute: true, muteBgm: false, items: null, flag: undefined, loadout: undefined };
  delete legacy.muteVoice; delete legacy.muteSfx;
  const next = migrateSave(JSON.stringify(legacy));
  assert.equal(next.muteBgm, false);
  assert.equal(next.muteVoice, true);
  assert.equal(next.muteSfx, true);
  assert.deepEqual(next.items, {});
  assert.deepEqual(next.flag, {});
  assert.deepEqual(next.npcStates, {});
  assert.deepEqual(next.questChoices, {});
  assert.ok(next.loadout.style);
});
test('travel and quest timers survive refreshing, without offline catch-up', () => {
  for (const action of [{ type: 'travel', to: 1, left: 4, total: 10 }, { type: 'quest', zone: 0, idx: 2, left: 3, total: 8 }]) {
    assert.deepEqual(migrateSave(encodeSave({ ...initial(), action })).action, action);
  }
});
test('corrupt primary recovers last good backup, without destroying it on next write', () => {
  const storage = memory();
  writeSave(storage, initial());
  writeSave(storage, { ...initial(), silver: 200 });
  storage.setItem(SAVE_KEY, '{broken');
  const recovered = readSave(storage);
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.state.silver, initial().silver);
  writeSave(storage, recovered.state);
  assert.ok(storage.getItem(`${SAVE_KEY}-backup`));
});
test('manual slots survive restart and import/export preserves battle and choices', () => {
  const storage = memory();
  const s = startCombat({ ...initial(), questChoices: { '0:YZ-01': { 0: { choice: 1, success: true } } }, npcStates: { qiaofeng: '北丐帮帮主' } });
  writeSave(storage, s, SLOT_KEYS[0]); writeSave(storage, s); clearAutoSave(storage);
  assert.equal(readSave(storage), null);
  assert.deepEqual(readSave(storage, SLOT_KEYS[0]).state.battle, s.battle);
  assert.deepEqual(migrateSave(encodeSave(s)).questChoices, s.questChoices);
});
test('reject invalid versions, broken battles and invalid timer targets', () => {
  assert.throws(() => migrateSave('null'));
  assert.throws(() => migrateSave({ version: 999, state: initial() }));
  assert.throws(() => migrateSave({ ...initial(), loc: 13 }));
  const s = startCombat(initial());
  s.battle.player.loadout.style = 'unknown';
  assert.throws(() => migrateSave(encodeSave(s)));
  assert.throws(() => migrateSave({ ...initial(), action: { type: 'quest', zone: 50, idx: 0, left: 1, total: 8 } }));
});
test('storage failures surface to callers instead of falsely reporting success', () => {
  const storage = memory();
  storage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => writeSave(storage, initial()), /quota/);
});
