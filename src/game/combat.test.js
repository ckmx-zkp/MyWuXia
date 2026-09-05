import test from 'node:test';
import assert from 'node:assert/strict';
import { initial } from './state.js';
import { startCombat, stepCombat, advanceCombat, retreatCombat, finishCombat } from './combat.js';
import { availableStyles, normalizeLoadout } from '../content/combat.js';
import { encodeSave, migrateSave } from './saves.js';

function finish(state, callback) {
  for (let i = 0; i < 61 && state.action; i++) state = advanceCombat(state, callback);
  return state;
}
test('combat is immutable, deterministic and resumes the exact next move', () => {
  const state = startCombat(initial(), { seed: 9321 });
  const snapshot = JSON.stringify(state);
  const next = advanceCombat(state);
  assert.equal(JSON.stringify(state), snapshot);
  assert.deepEqual(advanceCombat(state), next);
  assert.deepEqual(advanceCombat(migrateSave(encodeSave(next))), advanceCombat(next));
  assert.deepEqual(finish(migrateSave(encodeSave(next))), finish(next));
});
test('battle resolves once; wins award scaled experience and losses never kill', () => {
  const strong = startCombat({ ...initial(), devMult: 5, expTotal: 60000 }, { danger: 1 });
  const won = finish(strong);
  assert.equal(won.battle.status, 'won');
  assert.equal(won.expTotal - strong.expTotal, 75);
  assert.equal(advanceCombat(won), won);
  assert.equal(finishCombat(won, won.battle), won);
  assert.equal(migrateSave(encodeSave(won)).battle.settled, true);
  const weak = startCombat({ ...initial(), hp: 1, expTotal: 0 }, { opponent: 'instructor', danger: 100 });
  const lost = finish(weak);
  assert.equal(lost.battle.status, 'lost');
  assert.equal(lost.hp, 1);
  assert.equal(lost.expTotal, 8);
});
test('retreat settles once without farming spar rewards', () => {
  const state = startCombat(initial());
  const next = retreatCombat(state);
  assert.equal(next.expTotal, state.expTotal);
  assert.equal(next.action, null);
  assert.equal(next.battle.status, 'escaped');
  assert.equal(retreatCombat(next), next);
});
test('story victory, defeat and retreat invoke the continuation exactly once', () => {
  for (const mode of ['win', 'lose', 'retreat']) {
    let calls = 0;
    const settle = (s, c, won) => { calls++; return { ...s, flag: { result: won, node: c.ni } }; };
    const state = startCombat({ ...initial(), hp: mode === 'lose' ? 1 : 100, expTotal: mode === 'win' ? 60000 : 0 }, { opponent: 'wuliang', context: { zone: 11, ti: 0, ni: 0, ci: 0 } });
    const result = mode === 'retreat' ? retreatCombat(state, settle) : finish(state, settle);
    advanceCombat(result, settle); retreatCombat(result, settle);
    assert.equal(calls, 1);
    assert.equal(result.flag.result, mode === 'win');
  }
});
test('family martial arts, tactics and loadouts affect actual exchanges', () => {
  const family = name => ({ ...initial(), bonusSkill: { name, text: '', bonus: 0 }, loadout: { style: name } });
  for (const name of ['太祖长拳', '罗汉拳', '落叶剑法']) assert.ok(availableStyles(family(name)).includes(name));
  assert.equal(normalizeLoadout(initial(), { style: '独孤九剑破式' }).style, '基本拳脚');
  const light = stepCombat(startCombat(family('落叶剑法'), { seed: 9 }).battle);
  const fist = stepCombat(startCombat(family('罗汉拳'), { seed: 9 }).battle);
  assert.notDeepEqual(light.log, fist.log);
  const aggressive = startCombat({ ...family('太祖长拳'), loadout: { style: '太祖长拳', strategy: 'aggressive' } }, { seed: 77 });
  const cautious = startCombat({ ...family('太祖长拳'), loadout: { style: '太祖长拳', strategy: 'cautious' } }, { seed: 77 });
  assert.notDeepEqual(finish(aggressive).battle.log, finish(cautious).battle.log);
});
test('automatic breathing restores mana and every encounter has a finite ending', () => {
  const b = startCombat(initial()).battle;
  b.player.mp = 0;
  const next = stepCombat(b);
  assert.ok(next.player.mp > 0);
  assert.ok(next.log.some(line => line.includes('吐纳行气')));
  for (let seed = 1; seed <= 80; seed++) {
    const end = finish(startCombat(initial(), { seed }));
    assert.notEqual(end.battle.status, 'active');
    assert.ok(end.battle.round <= 60);
    assert.ok(end.battle.player.mp >= 0 && end.battle.enemy.mp >= 0);
  }
});
test('busy game rejects a second fight; multiplier is frozen at entry', () => {
  const s = startCombat({ ...initial(), expTotal: 60000, devMult: 2 });
  assert.equal(startCombat(s), s);
  assert.equal(finish({ ...s, devMult: 10 }).expTotal - s.expTotal, 30);
});
