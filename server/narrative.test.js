import test from 'node:test';
import assert from 'node:assert/strict';
import { bindDatabase, openDatabase } from './db.mjs';
import { openJsonStore } from './json-store.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNarrativeService } from './narrative.mjs';
import { parseModelJson, createMinimaxChat } from './minimax.mjs';
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

test('main state values and canonical text changes invalidate narrative cache', async () => {
  const store = bindDatabase(openDatabase(':memory:'));
  let calls = 0;
  const api = createNarrativeService({ store, completeChat: async () => {
    calls++; return { parsed: { scene: '静室之中，旧事有了新的说法。' }, model: 'fake' };
  } });
  const request = { saveId: newSaveId(), eventId: 'test_event', nodeId: 'visit', template,
    character: { name: '行人', facts: { 'npc:乔峰': '查证' } } };
  const first = await api.personalize(request);
  assert.equal((await api.personalize(request)).source, 'cache');
  const changed = await api.personalize({ ...request, character: { ...request.character, facts: { 'npc:乔峰': '会审' } } });
  assert.notEqual(first.hash, changed.hash);
  const revised = await api.personalize({ ...request, template: { ...template, scene: '新编的会审场景。' } });
  assert.notEqual(first.hash, revised.hash);
  assert.equal(calls, 3);
});

test('partial model copy keeps template choice ids', async () => {
  const store = bindDatabase(openDatabase(':memory:'));
  const api = createNarrativeService({ store, completeChat: async () => ({ parsed: { scene: '只改了场景' }, model: 'fake' }) });
  const result = await api.personalize({ saveId: newSaveId(), eventId: 'wudang_exam', nodeId: 'test', character: { name: '沈孤鸿' }, template });
  assert.equal(result.source, 'generated');
  assert.equal(result.overlay.scene, '只改了场景');
  assert.equal(result.overlay.choices.test.text, '请教习考校');
});
test('unusable model output falls back to the static template', async () => {
  const store = bindDatabase(openDatabase(':memory:'));
  const api = createNarrativeService({ store, completeChat: async () => ({ parsed: null, model: 'fake' }) });
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
  assert.equal(parseModelJson('prefix {"scene":"b","hearsay":"c"} trailing {').scene, 'b');
  assert.equal(parseModelJson('not json'), null);
});

test('model adapter budgets reasoning and accepts final content only', async () => {
  let request;
  const chat=createMinimaxChat({key:'test-only',fetchImpl:async(url,options)=>{
    request=JSON.parse(options.body);
    return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'{"scene":"最终正文"}',reasoning_details:[{text:'{"scene":"思考草稿"}'}]}}]})};
  }});
  assert.equal((await chat([])).parsed.scene,'最终正文');
  assert.equal(request.max_completion_tokens,8192);
  for(const [finish,content] of [['length','{"scene":"截断之前的草稿"}'],['stop','']]) {
    const invalid=createMinimaxChat({key:'test-only',fetchImpl:async()=>({ok:true,json:async()=>({choices:[{finish_reason:finish,message:{content,reasoning_details:[{text:'{"scene":"不能上屏的思考"}'}]}}]})})});
    await assert.rejects(invalid([]),/invalid_model_json/);
  }
});
