import test from 'node:test';
import assert from 'node:assert/strict';
import { bindDatabase, openDatabase } from './db.mjs';
import { openJsonStore } from './json-store.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNarrativeService } from './narrative.mjs';
import { parseModelJson } from './minimax.mjs';
import { newSaveId } from '../src/game/save-id.js';

const template = {
  scene: '执事翻开名册。',
  dialogues: [['执事', '差事做得稳，还须看收放。']],
  hearsay: '武当外门可参加考核。',
  choices: [{ id: 'test', text: '请教习考校', outcome: '考核通过。', failText: '回院再试。' }],
};

test('generated copy is cached per save and fact hash, and model cannot add choices', async () => {
  const store = bindDatabase(openDatabase(':memory:'));
  let calls = 0;
  const completeChat = async () => {
    calls += 1;
    return { parsed: {
      scene: '静室香灰未动，执事点了点你的名页。',
      dialogues: [['执事', '你既来了，便走一遭绵掌。']],
      hearsay: '外门考核仍按旧例。',
      choices: { test: { text: '行礼请考', outcome: '晋为入室弟子。', failText: '教习指出运劲未稳。' }, extra: { text: '偷学秘籍' } },
    }, model: 'fake' };
  };
  const api = createNarrativeService({ store, completeChat, model: 'fake' });
  const saveId = newSaveId();
  const first = await api.personalize({ saveId, eventId: 'wudang_exam', nodeId: 'test', eventName: '武当外门考核', character: { name: '沈孤鸿', loc: 1, facts: {}, journal: [] }, template });
  const second = await api.personalize({ saveId, eventId: 'wudang_exam', nodeId: 'test', eventName: '武当外门考核', character: { name: '沈孤鸿', loc: 1, facts: {}, journal: [] }, template });
  assert.equal(first.source, 'generated');
  assert.equal(second.source, 'cache');
  assert.equal(calls, 1);
  assert.equal(first.overlay.choices.test.text, '行礼请考');
  assert.equal(first.overlay.choices.extra, undefined);
  const other = newSaveId();
  await api.personalize({ saveId: other, eventId: 'wudang_exam', nodeId: 'test', eventName: '武当外门考核', character: { name: '别号', loc: 1, facts: {}, journal: [] }, template });
  assert.equal(calls, 2);
  assert.equal(api.memory(saveId).document.name, '沈孤鸿');
  assert.equal(api.memory(other).document.name, '别号');
});

test('broken model output falls back to the static template', async () => {
  const store = bindDatabase(openDatabase(':memory:'));
  const api = createNarrativeService({ store, completeChat: async () => ({ parsed: { scene: '只改了场景' }, model: 'fake' }) });
  const result = await api.personalize({ saveId: newSaveId(), eventId: 'wudang_exam', nodeId: 'test', character: { name: '沈孤鸿' }, template });
  assert.equal(result.source, 'template');
  assert.equal(result.overlay, null);
});

test('json store isolates generated copy by save id', async () => {
  const store = openJsonStore(join(mkdtempSync(join(tmpdir(), 'jh-')), 'mem.json'));
  const api = createNarrativeService({ store, completeChat: async () => ({ parsed: {
    scene: '改写后的场景。', dialogues: [['执事', '走一遭。']], hearsay: '考核仍开。',
    choices: { test: { text: '请考', outcome: '通过。', failText: '再试。' } },
  }, model: 'fake' }) });
  const saveId = newSaveId();
  const first = await api.personalize({ saveId, eventId: 'wudang_exam', nodeId: 'test', character: { name: '沈孤鸿' }, template });
  assert.equal(first.source, 'generated');
  assert.equal((await api.personalize({ saveId, eventId: 'wudang_exam', nodeId: 'test', character: { name: '沈孤鸿' }, template })).source, 'cache');
});
test('model json parser accepts fenced objects', () => {
  assert.equal(parseModelJson('```json\n{"scene":"a"}\n```').scene, 'a');
  assert.equal(parseModelJson('<think>plan</think>{"scene":"a"}').scene, 'a');
  assert.equal(parseModelJson('```json\n{"scene":"a"}\n```\nchoices: {"accept":{}}').scene, 'a');
  assert.equal(parseModelJson('not json'), null);
});
