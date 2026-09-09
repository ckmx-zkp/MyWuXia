import test from 'node:test';
import assert from 'node:assert/strict';
import { initial } from './state.js';
import { beginProgression } from './progression.js';
import { encodeSave, migrateSave } from './saves.js';
import { saveOptions } from './save-schema.js';
import { growthSnapshot, trainingAdvice } from './growth-guide.js';
import { worldConsequences } from './story-director.js';
import { chooseDialogue } from './world-rules.js';
import { ROOMS } from '../content/p0.js';

import { journey, foundation } from './journey-harness.js';

for(const route of ['evidence','mediation','protection']) test(`normal-rate legal growth journey: ${route}`,t=>{
  const j=journey();foundation(j);
  const before=growthSnapshot(j.s);
  assert.ok(before.attack>20);assert.ok(j.s.p0.styles['武当绵掌']);
  if(route==='evidence') {
    j.story('SZ-01','c1');j.event('yanzi_preparation','investigate');j.event('yanzi_preparation','provide');
    assert.ok(j.s.p0.facts.yanzi_ready);
  }
  j.story('WX-01','c1');
  if(route==='evidence'){j.event('xingzi_preparation','investigate');j.event('xingzi_preparation','support');}
  else {j.event('xingzi_preparation','decline');assert.ok(j.s.p0.facts.xingzi_declined);}
  j.story('WX-01','c0');
  const contribution=j.s.p0.contribution;
  j.story('WX-01',route==='evidence'?'causal':route==='mediation'?'mediate':'protect');
  if(route==='protection') assert.equal(j.fight(),'won');
  assert.equal(j.s.treeDone['0:WX-01'],4);j.wait(1);assert.equal(j.s.fate.node,'dispute');
  if(route==='evidence') {
    j.send('FATE',{node:'dispute',choice:'shelter'});j.zone(2);j.send('FATE',{node:'council',choice:'alliance'});j.send('FATE',{node:'alliance',choice:'escort'});
    assert.equal(j.s.fate.node,'alliance_end');assert.equal(worldConsequences(j.s).escortDanger,15);
    j.zone(0);j.room('dock');const silver=j.s.silver;j.activity('grain_work',12);assert.equal(j.s.silver,silver+10);
    assert.match(chooseDialogue(j.s,ROOMS.dock)[0][1],/联运/);
  } else if(route==='mediation') {
    assert.equal(j.s.p0.contribution,contribution-20);j.send('FATE',{node:'dispute',choice:'sect_truce'});j.send('FATE',{node:'truce',choice:'relief'});
    assert.equal(j.s.fate.node,'truce_end');assert.equal(j.s.flag.grain_evidence,undefined);assert.equal(worldConsequences(j.s).travelToll,0);
  } else {
    j.send('FATE',{node:'dispute',choice:'guard_relief'});assert.equal(j.s.fate.node,'conflict_end');
    assert.equal(j.s.flag.grain_evidence,undefined);assert.equal(worldConsequences(j.s).medicinePrice,15);
    j.room('dock');const potential=j.s.p0.potential;j.activity('relief_work',20);assert.equal(j.s.p0.potential,potential+10);
  }
  assert.equal(j.save().devMult,1);assert.ok(j.seconds<7200,`route took ${j.seconds}s`);
  t.diagnostic(JSON.stringify({route,seconds:j.seconds,silver:j.s.silver,potential:j.s.p0.potential,ending:j.s.fate.node}));
});

test('v8 earned mentor credit migrates once and preserves old completed exams',()=>{
  const s=beginProgression(initial());s.p0.sect='wudang';s.p0.rank=1;s.p0.facts.medicine_returned=true;
  const migrated=migrateSave({version:8,state:s},saveOptions);
  assert.equal(migrated.favor['武当教习'],25);
  assert.equal(migrateSave(encodeSave(migrated),saveOptions).favor['武当教习'],25);
  assert.equal(migrated.silver,s.silver);
});

test('online exhaustion reports the whole training session, including after reload',()=>{
  const j=journey();j.send('START_ACTIVITY',{id:'basic',target:'fist'});j.wait(20);j.save();j.wait(20);
  assert.equal(j.s.p0.report.earned.training,40);assert.equal(j.s.p0.report.seconds,40);
  assert.equal(j.s.p0.potential,0);assert.ok(j.s.p0.report.after.attack>j.s.p0.report.before.attack);
});

test('advanced Wudang teaching requires real training, returned promise and mentor trial',()=>{
  const j=journey();foundation(j);j.zone(1);j.room('wudang-hall');j.send('LEARN_SKILL',{id:'chunyang'});
  assert.equal(j.s.p0.internals.chunyang,undefined);
  j.room('wudang-yard');j.activity('duty',3000);j.activity('basic',300,'fist');j.activity('basic',300,'internal');
  j.activity('style',300,'武当绵掌');j.activity('internal',300,'quanzhen');j.send('REST');j.room('wudang-hall');
  j.event('wudang_master','trial');assert.equal(j.fight(),'won');assert.equal(j.s.p0.rank,2);
  j.room('wudang-yard');j.activity('duty',300);j.room('wudang-hall');
  j.send('LEARN_SKILL',{id:'chunyang'});assert.equal(j.s.p0.internals.chunyang.cap,3600);
  const contribution=j.s.p0.contribution;j.event('wudang_master','trial');j.send('LEARN_SKILL',{id:'chunyang'});assert.equal(j.s.p0.contribution,contribution);
  assert.equal(j.save().p0.rank,2);
});

test('new route defeat, expired preparation and offline reports never invent evidence',()=>{
  const j=journey();foundation(j);j.story('WX-01','c1');j.event('xingzi_preparation','investigate');j.wait(901);
  assert.equal(j.s.p0.quests.xingzi_preparation.node,'expired');j.event('xingzi_recovery','repair');assert.equal(j.s.p0.facts.xingzi_ready,undefined);
  j.story('WX-01','c0');j.story('WX-01','protect');assert.equal(j.fight(true),'escaped');
  assert.equal(j.s.treeDone['0:WX-01'],3);assert.equal(j.s.p0.facts.xingzi_protected,undefined);assert.equal(j.s.flag.grain_evidence,undefined);
  const s=j.save();assert.ok(trainingAdvice(s,'styles','武当绵掌').blocker);
  j.send('START_ACTIVITY',{id:'style',target:'武当绵掌'});assert.equal(j.s.p0.activity,null);
  const k=journey();k.room('dock');k.activity('work',300);
  k.send('START_ACTIVITY',{id:'basic',target:'fist'});const time=k.s.worldTime;
  k.offline(120);assert.equal(k.s.worldTime,time);assert.match(k.s.p0.report.reason,/潜能不足/);
  assert.ok(k.s.p0.report.after.attack>k.s.p0.report.before.attack);
  const potential=k.s.p0.potential;k.save();k.offline(0);assert.equal(k.s.p0.potential,potential);
});
