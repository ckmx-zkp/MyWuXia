import test from 'node:test';
import assert from 'node:assert/strict';
import { initial } from './state.js';
import { beginProgression } from './progression.js';
import { p0Command, activityReason } from './p0-engine.js';
import { growthGoal } from './growth-guide.js';
import { cityLeads } from './city-leads.js';
import { encodeSave, migrateSave } from './saves.js';
import { saveOptions } from './save-schema.js';
import { startCombat, stepCombat, advanceCombat, retreatCombat } from './combat.js';
import { combatTraits } from './tactics.js';
import { settleSideEvent } from './side-events.js';
import { worldConsequences } from './story-director.js';
import { characterPayload, requestNarrativeNode } from '../services/narrative-client.js';
import { factHash } from './narrative-overlay.js';
import { SIDE_EVENTS } from '../content/p0.js';
const fresh=()=>beginProgression(initial());
const command=(s,type,fields={})=>p0Command(s,{type,...fields},1000);

test('selected direction persists, commitments and deadlines win, closed recommendations retire',()=>{
  let s=command(fresh(),'SET_GOAL',{focus:'learning',school:'free'});s.p0.potential=200;
  assert.equal(growthGoal(s).room,'gym');
  assert.deepEqual(migrateSave(encodeSave(s),saveOptions).p0.intent,s.p0.intent);
  const old=structuredClone(s);delete old.p0.intent;
  assert.deepEqual(migrateSave({version:9,state:old},saveOptions).p0.intent,{focus:'inquiry',school:'free'});
  s.p0.room='pharmacy';s=command(s,'DISCOVER_EVENT',{id:'medicine'});
  assert.equal(growthGoal(s).eventId,'medicine');
  s.fate={node:'council',enteredAt:0,history:[]};s.worldTime=550;
  assert.equal(growthGoal(s).fate,true);assert.match(growthGoal(s).text,/余 50 息/);
  s.fate={node:'truce_end',enteredAt:550,history:[]};s.p0.quests.medicine={node:'end',pending:null,done:true};
  assert.equal(growthGoal(s).room,'gym');
  s=command(s,'SET_GOAL',{focus:'inquiry',school:'free'});assert.equal(growthGoal(s).eventId,'hanshui_supply');
  s.loc=1;s.p0.room='hanshui-wharf';s=command(s,'DISCOVER_EVENT',{id:'hanshui_supply'});s=command(s,'CHOOSE_EVENT',{id:'hanshui_supply',choice:'decline'});
  assert.notEqual(growthGoal(s).eventId,'hanshui_supply');
  assert.ok(!cityLeads(s).events.some(e=>e.id==='hanshui_supply'));
  s.p0.facts.xingzi_mediated=true;s.p0.facts.xingzi_protected=true;
  assert.ok(worldConsequences(s).notices.every(n=>!n.includes('兑现担保') && !n.includes('继续汉水查账')));
});

function chapterRoad(ending='truce_end') {
  let s=fresh();s.loc=1;s.p0.room='hanshui-wharf';s.fate={node:ending,enteredAt:0,history:[]};
  s=command(s,'DISCOVER_EVENT',{id:'hanshui_supply'});
  s=command(s,'CHOOSE_EVENT',{id:'hanshui_supply',choice:ending==='truce_end'?'truce':'alliance'});
  s=command(s,'MOVE_ROOM',{id:'hanshui-ledger'});
  s=command(s,'CHOOSE_EVENT',{id:'hanshui_supply',choice:ending==='truce_end'?'ferry':'advance'});
  return command(s,'MOVE_ROOM',{id:'hanshui-wharf'});
}
for(const outcome of ['lost','escaped']) test(`Hanshui ${outcome} repairs via civilian route without inventing intact cargo`,()=>{
  let s=chapterRoad();s.hp=1;s.mp=0;s.expTotal=0;
  s=command(s,'CHOOSE_EVENT',{id:'hanshui_supply',choice:'guard'});
  s=migrateSave(encodeSave(s),saveOptions);
  if(outcome==='escaped')s=retreatCombat(s,settleSideEvent);
  else for(let i=0;i<60 && s.battle.status==='active';i++)s=advanceCombat(s,settleSideEvent);
  assert.equal(s.battle.status,outcome);assert.equal(s.p0.quests.hanshui_supply.node,'repair');
  assert.equal(s.p0.facts.hanshui_intact,undefined);s.battle=null;
  s=command(s,'MOVE_ROOM',{id:'hanshui-clinic'});
  s=command(s,'CHOOSE_EVENT',{id:'hanshui_supply',choice:'pay'});
  const blocked=command(s,'CHOOSE_EVENT',{id:'hanshui_supply',choice:'staged'});assert.equal(blocked.p0.quests.hanshui_supply.node,'receipt');
  s=command(s,'CHOOSE_EVENT',{id:'hanshui_supply',choice:'civilian'});
  assert.ok(s.p0.facts.hanshui_relief);assert.equal(s.fate.node,'truce_end');
  assert.equal(activityReason(s,'hanshui_relief_work'),'');
  assert.ok(activityReason(s,'hanshui_joint_work'));
  const price=worldConsequences(s).medicinePrice,silver=s.silver;
  s=command(s,'BUY_MEDICINE');assert.equal(s.silver,silver-price);assert.ok(s.hp>1);
  assert.equal(migrateSave(encodeSave(s),saveOptions).p0.quests.hanshui_supply.done,true);
});
test('unverified advance and light-footwork detour cannot claim joint transport; zero funds can withdraw',()=>{
  let s=chapterRoad('alliance_end');s.p0.basics.dodge=400;
  s=command(s,'CHOOSE_EVENT',{id:'hanshui_supply',choice:'detour'});s=command(s,'MOVE_ROOM',{id:'hanshui-clinic'});
  s=command(s,'CHOOSE_EVENT',{id:'hanshui_supply',choice:'joint'});assert.equal(s.p0.quests.hanshui_supply.node,'receipt');
  s=command(s,'CHOOSE_EVENT',{id:'hanshui_supply',choice:'civilian'});assert.ok(s.p0.facts.hanshui_relief);assert.equal(s.p0.facts.hanshui_joint,undefined);
  let r=chapterRoad();r=command(r,'CHOOSE_EVENT',{id:'hanshui_supply',choice:'guard'});r=retreatCombat(r,settleSideEvent);r.battle=null;
  r=command(r,'MOVE_ROOM',{id:'hanshui-clinic'});r.silver=0;r.p0.materials.herbs=0;
  r=command(r,'CHOOSE_EVENT',{id:'hanshui_supply',choice:'withdraw'});assert.equal(r.p0.quests.hanshui_supply.node,'declined');
});

test('trained tactics change actual damage, mana and dodges across identical seeds',()=>{
  const s=fresh();s.p0.styles['六合刀']={cap:900,source:'test'};s.p0.internals.luohan={cap:900,source:'test'};
  s.training={styles:{'基本拳脚':100,'六合刀':100},internals:{basic:100,luohan:100}};s.p0.basics.dodge=400;s.hp=100;
  for(const trait of ['protection','penetration','economy','evasion']) {
    let improved=0;
    for(let seed=1;seed<=64;seed++) {
      s.loadout={...s.loadout,style:trait==='penetration'?'六合刀':'基本拳脚',internal:trait==='protection'?'luohan':'basic'};
      s.p0.weapon=trait==='penetration'?'practice':'hands';
      const b=startCombat(s,{opponent:'instructor',danger:35,seed}).battle;
      assert.ok(b.player.traits[trait]);
      const plain=structuredClone(b);plain.player.traits[trait]=0;
      const a=stepCombat(b),c=stepCombat(plain);
      if(trait==='economy')improved+=a.player.mp-c.player.mp;
      else if(trait==='penetration')improved+=c.enemy.hp-a.enemy.hp;
      else improved+=a.player.hp-c.player.hp;
      assert.deepEqual(stepCombat(migrateSave(encodeSave({...s,battle:b,action:{type:'combat'}}),saveOptions).battle),a);
    }
    assert.ok(improved>0,`${trait} must have a real benefit`);
  }
  s.training.styles['基本拳脚']=0;s.training.internals.luohan=0;s.loadout.style='基本拳脚';s.loadout.internal='luohan';
  assert.equal(combatTraits(s).protection,0);
});
test('historical active battle keeps old rule snapshot and rejects corrupted new traits',()=>{
  const s=startCombat(fresh(),{seed:42});delete s.battle.player.traits;
  const restored=migrateSave({version:9,state:s},saveOptions);
  assert.equal(restored.battle.player.traits,undefined);assert.deepEqual(stepCombat(restored.battle),stepCombat(s.battle));
  s.battle.player.traits={protection:NaN,penetration:0,economy:0,evasion:0};
  assert.throws(()=>migrateSave({version:10,state:s},saveOptions),/战斗/);
});
test('LLM context includes intent, membership and mastery but stable heartbeat does not invalidate cache',()=>{
  const s=fresh(),base=factHash(characterPayload(s));
  s.worldTime+=30;assert.equal(factHash(characterPayload(s)),base);
  s.p0.intent.focus='learning';assert.notEqual(factHash(characterPayload(s)),base);
  s.p0.sect='wudang';s.p0.rank=1;s.training.styles['基本拳脚']=100;
  const payload=characterPayload(s);assert.equal(payload.facts['identity:sect'],'wudang');assert.equal(payload.facts['identity:rank'],1);assert.equal(payload.facts['training:styleLevel'],2);
});
test('narrative failure falls back and generated overlay never changes chapter rules',async t=>{
  const s=fresh();s.saveId='12345678-1234-4234-8234-123456789012';const node=SIDE_EVENTS.hanshui_supply.nodes.road;
  t.mock.method(globalThis,'fetch',async()=>({ok:false}));
  assert.equal((await requestNarrativeNode(s,'hanshui_supply','road',node,'汉水')).source,'template');
  globalThis.fetch=async()=>({ok:true,json:async()=>({source:'generated',overlay:{scene:'船在风中等候。',hearsay:'今日有人护药。',choices:{guard:{text:'护住跳板',effects:{silver:99999},next:'joint_end'},cheat:{text:'领奖'}}}})});
  const result=await requestNarrativeNode(s,'hanshui_supply','road',node,'汉水');
  assert.equal(result.source,'generated');assert.equal(result.node.choices.length,node.choices.length);
  assert.deepEqual(result.node.choices.find(c=>c.id==='guard').effects,node.choices.find(c=>c.id==='guard').effects);
  assert.equal(result.node.choices.find(c=>c.id==='guard').next,'receipt');
});
