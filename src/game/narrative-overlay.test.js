import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOverlay, extractTemplate, factHash, mergeOverlay } from './narrative-overlay.js';
import { buildMemoryDocument } from './memory-doc.js';
import { isSaveId, newSaveId } from './save-id.js';

const node = {
  scene: '药师把药箱推到门口。',
  dialogues: [['沈药师', '药要送去城南。']],
  hearsay: '回春堂缺人护车。',
  choices: [
    { id: 'accept', text: '应下护送', next: 'road', combat: { opponent: 'bandit' }, effects: { silver: 10 }, outcome: '你接下药车。', failText: '车轴未修稳。' },
  ],
};

test('overlay merge keeps choice ids and drops extra fields', () => {
  const template = extractTemplate(node);
  const overlay = mergeOverlay(template, {
    scene: '回春堂灯影里，药箱上还留着刀痕。',
    dialogues: [['沈药师', '城南等着这车药，你若肯走一遭，便是救人。']],
    hearsay: '药铺近日在找稳当的护送人。',
    choices: { accept: { text: '应下这趟药车', outcome: '你收下路引。', failText: '车轴仍不稳。', next: 'secret', silver: 999 } },
    reward: 999,
  });
  assert.equal(overlay.choices.accept.text, '应下这趟药车');
  assert.equal(applyOverlay(node, overlay).choices[0].next, 'road');
  assert.equal(applyOverlay(node, overlay).choices[0].combat.opponent, 'bandit');
  assert.equal(applyOverlay(node, overlay).choices[0].effects.silver, 10);
});

test('invalid overlay falls back instead of rewriting the graph', () => {
  const template = extractTemplate(node);
  assert.equal(mergeOverlay(template, { scene: 'x', hearsay: 'y', dialogues: [], choices: {} }), null);
  assert.equal(mergeOverlay(template, { scene: 'x', hearsay: 'y', dialogues: [['沈药师', '改']], choices: { other: { text: '错' } } }), null);
  assert.deepEqual(applyOverlay(node, null), node);
});

test('fact hash is stable for the same memory and changes with new facts', () => {
  const a = factHash({ name: '沈孤鸿', loc: 0, facts: { medicine_complete: true }, journal: [{ eventId: 'medicine', nodeId: 'end', choiceId: 'finish', result: 'success' }] });
  const b = factHash({ name: '沈孤鸿', loc: 0, facts: { medicine_complete: true }, journal: [{ eventId: 'medicine', nodeId: 'end', choiceId: 'finish', result: 'success' }] });
  const c = factHash({ name: '沈孤鸿', loc: 0, facts: { medicine_complete: true, letter_read: true }, journal: [{ eventId: 'medicine', nodeId: 'end', choiceId: 'finish', result: 'success' }] });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('memory documents isolate facts per save and never claim novel identity', () => {
  const id = newSaveId();
  assert.ok(isSaveId(id));
  const doc = buildMemoryDocument({ saveId: id, name: '沈孤鸿', facts: { medicine_complete: true }, journal: [{ eventId: 'medicine', nodeId: 'end', choiceId: 'finish', result: 'success', text: '药车送到。' }] });
  assert.match(doc.summary, /独立江湖行人/);
  assert.ok(!doc.summary.includes('段誉'));
  assert.deepEqual(doc.facts, ['medicine_complete']);
});
