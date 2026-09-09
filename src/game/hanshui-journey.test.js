import test from 'node:test';
import assert from 'node:assert/strict';
import { journey, foundation } from './journey-harness.js';
import { ORIGINS } from '../content/creation.js';
import { worldConsequences } from './story-director.js';
import { growthGoal } from './growth-guide.js';

function unaffiliated(j) {
  j.activity('errand',1200);j.room('gym');j.send('LEARN_SKILL',{id:'luohan'});
  j.activity('style',100,j.s.loadout.style);j.activity('internal',100,'luohan');
  j.send('EQUIP_LOADOUT',{loadout:{...j.s.loadout,internal:'luohan',strategy:'cautious',breath:'guarding',footwork:'rooted'}});
  j.room('bookshop');j.activity('read',60);j.room('outskirts');j.activity('herbs',100);
  j.room('pharmacy');j.event('medicine','prepare');j.event('medicine','deliver');j.room('dock');j.event('medicine','reason');j.room('home');j.event('medicine','finish');
  j.room('pharmacy');j.event('medicine_return','carry');j.zone(1);j.event('medicine_return','deliver');j.zone(0);j.room('pharmacy');j.event('medicine_return','finish');j.send('REST');
  assert.equal(j.s.p0.sect,null);
}
function firstChapter(j,route,school) {
  if(route==='alliance') {j.story('SZ-01','c1');j.event('yanzi_preparation','investigate');j.event('yanzi_preparation','provide');}
  j.story('WX-01','c1');
  if(route==='alliance'){j.event('xingzi_preparation','investigate');j.event('xingzi_preparation','support');}
  else j.event('xingzi_preparation','decline');
  j.story('WX-01','c0');
  if(route==='alliance') j.story('WX-01','causal');
  else if(school==='wudang') {j.story('WX-01',route==='truce'?'mediate':'protect');if(j.s.battle)assert.equal(j.fight(),'won');}
  else {j.story('WX-01','c1');if(j.s.battle)j.fight(true);j.story('WX-01','c1');}
  j.wait(1);assert.equal(j.s.fate.node,'dispute');
  if(route==='alliance'){j.send('FATE',{node:'dispute',choice:'shelter'});j.zone(2);j.send('FATE',{node:'council',choice:'alliance'});j.send('FATE',{node:'alliance',choice:'escort'});}
  else if(route==='truce'){j.send('FATE',{node:'dispute',choice:'mediate'});j.zone(2);j.send('FATE',{node:'council',choice:'truce'});j.send('FATE',{node:'truce',choice:'relief'});}
  else {j.send('FATE',{node:'dispute',choice:'north'});j.send('FATE',{node:'conflict',choice:'neutral'});}
  assert.equal(j.s.fate.node,`${route}_end`);
}
for(const origin of ORIGINS) for(const seed of [1,42,20260909]) for(const school of ['free','wudang']) for(const route of ['alliance','truce','conflict']) {
  test(`created normal-rate ${origin.id}/${seed}/${school}/${route} reaches Hanshui`,t=>{
    const j=journey({origin:origin.id,seed});
    j.send('SET_GOAL',{focus:'inquiry',school});
    if(school==='wudang')foundation(j);else unaffiliated(j);
    firstChapter(j,route,school);
    j.zone(1);j.room('hanshui-wharf');
    const factions=structuredClone(j.s.factionRelations);
    j.event('hanshui_supply',route==='conflict'?'civilian':route);
    if(route==='alliance'){j.room('hanshui-ledger');j.event('hanshui_supply','compare');}
    else if(route==='truce'){j.room('hanshui-ledger');j.event('hanshui_supply','ferry');}
    else {j.room('hanshui-clinic');j.event('hanshui_supply','herbs');}
    j.room('hanshui-wharf');j.send('REST');
    if(route==='alliance')j.event('hanshui_supply','evidence');
    else {j.event('hanshui_supply','guard');assert.equal(j.fight(),'won');}
    j.room('hanshui-clinic');j.event('hanshui_supply',route==='alliance'?'joint':route==='truce'?'staged':'civilian');
    const fact=route==='alliance'?'joint':route==='truce'?'staged':'relief';
    assert.equal(j.s.p0.facts[`hanshui_${fact}`],true);
    assert.equal(['joint','staged','relief'].filter(f=>j.s.p0.facts[`hanshui_${f}`]).length,1);
    assert.deepEqual(j.s.factionRelations,factions);
    assert.equal(worldConsequences(j.s).medicinePrice,{joint:6,staged:8,relief:9}[fact]);
    const silver=j.s.silver,potential=j.s.p0.potential;
    j.event('hanshui_supply','civilian');assert.equal(j.s.silver,silver);assert.equal(j.s.p0.potential,potential);
    if(fact!=='relief')j.room('hanshui-wharf');j.activity(`hanshui_${fact}_work`,60);
    assert.ok(j.s.p0.potential>potential);assert.ok(j.s.silver>silver);
    assert.equal(j.save().p0.intent.school,school);assert.equal(j.s.devMult,1);
    assert.notEqual(growthGoal(j.s).eventId,'hanshui_supply');assert.ok(j.seconds<7200);
    t.diagnostic(JSON.stringify({origin:origin.id,seed,school,route,seconds:j.seconds,silver:j.s.silver,potential:j.s.p0.potential}));
  });
}
