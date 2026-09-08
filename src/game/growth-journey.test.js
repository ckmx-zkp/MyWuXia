import test from 'node:test';
import assert from 'node:assert/strict';
import { initial } from './state.js';
import { beginProgression } from './progression.js';
import { createGameReducer } from './commands.js';
import { createWorldEngine } from './world-engine.js';
import { ability } from './ability.js';
import { ZONES } from '../content/world.js';
import { LINKS } from '../content/city-leads.js';
import { roomRoute, routeBetween } from './city-leads.js';
import { currentRoom } from './p0-engine.js';
import { encodeSave, migrateSave } from './saves.js';
import { saveOptions } from './save-schema.js';
import { growthSnapshot, trainingAdvice } from './growth-guide.js';
import { worldConsequences } from './story-director.js';
import { chooseDialogue } from './world-rules.js';
import { ROOMS } from '../content/p0.js';

const engine=createWorldEngine({ability,questReward:()=>({silver:10,exp:10,time:10,hp:0}),clamp:x=>Math.max(1,Math.min(100,x)),ITEMS:{},ROAD:[],FAC:{},FAC_DEFAULT:{gym:'武馆'},levelUpLog:n=>n});
const reducer=createGameReducer({...engine,ZONES,LINKS,ability,levelUpLog:n=>n});
// Commands use the real combat/RNG/conditions. Time is simulated one second at a time.
function journey() {
  let s=beginProgression(initial()),now=1000;
  const send=(type,fields={})=>{s=reducer(s,{type,...fields},now);return s;};
  const wait=seconds=>{for(let i=0;i<seconds;i++){now+=1000;send('HEARTBEAT');}};
  const fight=(retreat=false)=>{
    assert.ok(s.battle);s=migrateSave(encodeSave(s),saveOptions);
    if(retreat) send('RETREAT'); else for(let i=0;i<60 && s.battle.status==='active';i++) wait(1);
    const result=s.battle.status;send('CLOSE_COMBAT');return result;
  };
  const zone=to=>{for(const step of routeBetween(s.loc,to).slice(1)){send('TRAVEL',{to:step});if(s.battle) fight(true);assert.equal(s.loc,step);}};
  const room=to=>{for(const id of roomRoute(currentRoom(s),to).slice(1)){send('MOVE_ROOM',{id});assert.equal(s.p0.room,id);}assert.equal(currentRoom(s),to);};
  const event=(id,choice)=>{if(!s.p0.quests[id])send('DISCOVER_EVENT',{id});send('CHOOSE_EVENT',{id,choice});};
  const activity=(id,seconds,target)=>{send('START_ACTIVITY',{id,target});assert.equal(s.p0.activity?.id,id);wait(seconds);send('STOP_ACTIVITY');send('DISMISS_REPORT');};
  const story=(id,choiceId)=>{
    const ti=ZONES[s.loc].trees.findIndex(t=>t.id===id),tree=ZONES[s.loc].trees[ti],ni=s.treeDone[`${s.loc}:${id}`] || 0;
    const ci=tree.nodes[ni].choices.findIndex(c=>c.id===choiceId),choice=tree.nodes[ni].choices[ci],context={zone:s.loc,ti,ni,ci};
    assert.ok(choice);
    if(choice.combat) send('COMBAT',{config:{opponent:choice.combat,danger:choice.diff,context,loadout:s.loadout}});
    else send('STORY',{context});
  };
  const save=()=>{s=migrateSave(encodeSave(s),saveOptions);return s;};
  const offline=seconds=>{now+=seconds*1000;send('RESUME');};
  return {send,wait,fight,zone,room,event,activity,story,save,offline,get s(){return s;},get seconds(){return (now-1000)/1000;}};
}
function foundation(j) {
  j.room('dock');j.activity('work',600);j.room('gym');j.send('LEARN_SKILL',{id:'taizu'});
  j.activity('style',100,'太祖长拳');j.send('EQUIP_LOADOUT',{loadout:{...j.s.loadout,style:'太祖长拳'}});
  j.room('bookshop');j.activity('read',60);j.room('outskirts');j.activity('herbs',100);
  j.room('pharmacy');j.event('medicine','prepare');j.event('medicine','deliver');
  j.room('dock');j.event('medicine','reason');j.room('home');j.event('medicine','finish');
  assert.ok(j.s.p0.facts.medicine_mercy);j.room('pharmacy');j.event('medicine_return','carry');
  j.zone(1);j.room('wudang-gate');j.event('medicine_return','deliver');
  j.send('JOIN_SECT');assert.equal(j.s.p0.sect,null);j.event('wudang_entry','letter');assert.equal(j.s.p0.sect,'wudang');
  j.room('wudang-yard');j.activity('duty',1200);j.send('LEARN_SKILL',{id:'mianzhang'});j.send('LEARN_SKILL',{id:'quanzhen'});
  j.activity('style',100,'武当绵掌');j.activity('internal',100,'quanzhen');
  j.send('EQUIP_LOADOUT',{loadout:{...j.s.loadout,style:'武当绵掌',internal:'quanzhen',strategy:'cautious',breath:'guarding',footwork:'rooted'}});
  j.send('REST');j.room('wudang-hall');j.send('EXAM');assert.equal(j.fight(),'won');assert.equal(j.s.p0.rank,1);
  j.zone(0);j.room('pharmacy');j.event('medicine_return','finish');j.send('REST');
}
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
