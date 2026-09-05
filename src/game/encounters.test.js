import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ZONES } from '../content/world.js';
import { OPPONENTS, QUEST_COMBATS } from '../content/combat.js';
import { createEncounterSettlement } from './encounter-settlement.js';
import { applyEff } from './effects.js';
import { initial } from './state.js';
import { startCombat, advanceCombat, retreatCombat } from './combat.js';
import { migrateSave, encodeSave } from './saves.js';
import { saveOptions } from './save-schema.js';

const treeKey = (zone, id) => `${zone}:${id}`;
const settle = createEncounterSettlement({ ZONES, treeKey, applyEff });
const choices = ZONES.flatMap((z, zone) => (z.trees || []).flatMap((tree, ti) => tree.nodes.flatMap((node, ni) => node.choices.flatMap((choice, ci) => choice.combat || choice.failCombat ? [{ zone, ti, ni, ci, tree, node, choice }] : []))));

test('every explicit story fight references an enemy and a supported saved continuation', () => {
  assert.equal(choices.length, 19);
  for (const c of choices) {
    assert.ok(OPPONENTS[c.choice.combat || c.choice.failCombat], `${c.tree.id}:${c.ni}`);
    assert.ok(c.choice.ok.text && c.choice.fail.text);
    assert.ok(saveOptions.validateContext(c));
  }
  const quests = ZONES.flatMap(z => z.quests.map(q => q.name));
  for (const [name, id] of Object.entries(QUEST_COMBATS)) {
    assert.ok(quests.includes(name), name); assert.ok(OPPONENTS[id], id);
  }
});
test('all story battles preserve exact continuation through saves and settle a node once', () => {
  for (const c of choices) {
    const key = treeKey(c.zone, c.tree.id);
    const context = { zone: c.zone, ti: c.ti, ni: c.ni, ci: c.ci, failedCheck: !c.choice.combat };
    const before = { ...initial(), loc: c.zone, treeDone: { [key]: c.ni }, idle: false };
    let state = startCombat(before, { opponent: c.choice.combat || c.choice.failCombat, danger: c.choice.diff, context });
    state = migrateSave(encodeSave(state), saveOptions);
    state = retreatCombat(state, settle);
    assert.equal(state.treeDone[key], c.ni + 1, `${key}:${c.ni}`);
    assert.equal(state.questChoices[key][c.ni].success, false);
    assert.equal(state.questChoices[key][c.ni].choice, c.ci);
    assert.ok(state.hp > 0);
    assert.equal(retreatCombat(state, settle), state);
    assert.deepEqual(migrateSave(encodeSave(state), saveOptions).battle, state.battle);
  }
});
test('winning a failed-check pursuit does not retroactively turn stealth into success', () => {
  const c = choices.find(c => c.choice.failCombat === 'shennong');
  const key = treeKey(c.zone, c.tree.id);
  let s = startCombat({ ...initial(), expTotal: 60000, treeDone: { [key]: c.ni } }, {
    opponent: 'shennong', context: { zone: c.zone, ti: c.ti, ni: c.ni, ci: c.ci, failedCheck: true }, danger: 1,
  });
  while (s.action) s = advanceCombat(s, settle);
  assert.equal(s.battle.status, 'won');
  assert.equal(s.questChoices[key][c.ni].success, false);
});
test('surviving a master encounter satisfies the objective without defeating them', () => {
  let s = startCombat({ ...initial(), hp: 100, expTotal: 5000 }, { opponent: 'qiuchuji', danger: 50 });
  s.battle.player.attack = 0;
  s.battle.enemy.attack = 0;
  for (let i = 0; i < 3; i++) s = advanceCombat(s);
  assert.equal(s.battle.status, 'won');
  assert.ok(s.battle.enemy.hp > 0);
  assert.match(s.battle.result, /达成交手目标/);
});
test('travel and quest encounters restore valid target references', () => {
  for (const context of [{ kind: 'travel', to: 1 }, { kind: 'quest', zone: 0, idx: 2 }]) {
    const s = startCombat(initial(), { opponent: 'bandit', context });
    assert.deepEqual(migrateSave(encodeSave(s), saveOptions).battle.context, context);
  }
  assert.equal(saveOptions.validateContext({ kind: 'quest', zone: 99, idx: 0 }), false);
});
test('all declared story audio files exist after the content extraction', () => {
  const inspect = value => {
    if (typeof value === 'string' && value.startsWith('/audio/')) assert.ok(existsSync(`public${value}`), value);
    else if (value && typeof value === 'object') Object.values(value).forEach(inspect);
  };
  inspect(ZONES);
});
