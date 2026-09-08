import test from 'node:test';
import assert from 'node:assert/strict';
import { initial } from './state.js';
import { beginProgression } from './progression.js';
import { createWorldEngine } from './world-engine.js';
import { createGameReducer } from './commands.js';
import { ZONES } from '../content/world.js';
import { LINKS } from '../content/city-leads.js';
import { STORY_ARCS } from '../content/story-arcs.js';
import { SIDE_EVENTS } from '../content/p0.js';
import { cityLeads } from './city-leads.js';
import { reconcileStories, worldConsequences, directionReason, actorStates } from './story-director.js';
import { storyChoiceReason } from './story-graph.js';
import { migrateSave, encodeSave } from './saves.js';
import { saveOptions } from './save-schema.js';
import { resolveFateChoice, advanceFate } from './fate-engine.js';
import { PACK_POLICY } from '../content/pack-policy.js';
import { applyEffects } from './world-rules.js';

const fresh=()=>beginProgression(initial());
const engine=createWorldEngine({ability:()=>500,questReward:()=>({silver:10,exp:10,time:10,hp:0}),clamp:x=>Math.max(1,Math.min(100,x)),ITEMS:{},ROAD:[],FAC:{},FAC_DEFAULT:{gym:'武馆'},levelUpLog:n=>n});
const reduce=createGameReducer({tick:engine.tick,settleStory:engine.settleStory,levelUpLog:n=>n,ZONES,LINKS,ability:()=>500});
const cmd=(s,type,data={})=>reduce(s,{type,...data},1000);
const restore=s=>migrateSave(encodeSave(s),saveOptions);

test('new characters see no unrelated packs; completed arcs admit only relevant unresolved aftermath',()=>{
  const s=fresh();
  assert.equal(cityLeads(s).events.filter(e=>/^(xajh|tlb|ldj|bxj)_/.test(e.id)).length,0);
  for(const [id,p] of Object.entries(PACK_POLICY)) {
    assert.ok(directionReason(s,id,SIDE_EVENTS[id]));
    const a=STORY_ARCS[p.arc],n={...s,flag:{[`${a.zone}:${p.arc}:complete`]:true}};
    assert.equal(directionReason(n,id,SIDE_EVENTS[id]),'');
    assert.ok(directionReason({...n,p0:{...n.p0,facts:{[p.world]:true}}},id,SIDE_EVENTS[id]));
  }
});

for(const [id,a] of Object.entries(STORY_ARCS)) test(`${id}: preparation changes actual main successor, ending and persistent downstream services`,()=>{
  let s=fresh();s.loc=a.zone;s.silver=500;s.treeDone[`${a.zone}:${id}`]=a.trigger;
  const tree=ZONES[a.zone].trees.find(t=>t.id===id),ti=ZONES[a.zone].trees.indexOf(tree);
  const alt=tree.nodes[a.decision].choices.find(c=>c.id==='causal');
  assert.ok(storyChoiceReason(s,alt));
  s=cmd(s,'DISCOVER_EVENT',{id:`${a.id}_preparation`});
  assert.equal(s.p0.quests[`${a.id}_preparation`].node,'request');
  s=cmd(s,'CHOOSE_EVENT',{id:`${a.id}_preparation`,choice:'investigate'});
  const before=s.silver;
  if(id==='SZ-01') s.p0.knowledge=3;
  s=cmd(s,'CHOOSE_EVENT',{id:`${a.id}_preparation`,choice:'provide'});
  assert.equal(s.silver,before-(id==='SZ-01'?0:20));
  assert.equal(s.p0.facts[`${a.id}_ready`],true);
  s=restore(s); s.treeDone[`${a.zone}:${id}`]=a.decision;
  if(id==='WX-01') {
    assert.ok(storyChoiceReason(s,alt),'one witness alone must not solve the case');
    s.p0.facts.yanzi_ready=true;
  }
  s=cmd(s,'STORY',{context:{zone:a.zone,ti,ni:a.decision,ci:tree.nodes[a.decision].choices.indexOf(alt)}});
  assert.equal(s.treeDone[`${a.zone}:${id}`],tree.nodes.length);
  assert.equal(s.p0.facts[`${a.id}_changed`],true);
  assert.ok(s.rumors.includes(a.outcome));
  const money=s.silver;
  s=cmd(s,'STORY',{context:{zone:a.zone,ti,ni:a.decision,ci:tree.nodes[a.decision].choices.indexOf(alt)}});
  assert.equal(s.silver,money,'ending pays once');
  s=restore(s);s.loc=a.destination;
  s=cmd(s,'DISCOVER_EVENT',{id:`${a.id}_aftermath`});
  s=cmd(s,'CHOOSE_EVENT',{id:`${a.id}_aftermath`,choice:'keep'});
  assert.ok(s.p0.facts[`${a.id}_returned`]);
  assert.ok(restore(s).p0.facts[a.world]);
});

test('main advances past opportunity, timeout and reload lead to recovery without rewriting history',()=>{
  let s=fresh();s.treeDone['0:FZ-01']=1;
  s=cmd(s,'DISCOVER_EVENT',{id:'fuwei_preparation'});
  s=restore(s);s.worldTime+=900;
  s=cmd(s,'RESUME');
  assert.equal(s.p0.quests.fuwei_preparation.node,'expired');
  assert.ok(cityLeads(s).events.some(e=>e.id==='fuwei_recovery'));
  s=cmd(s,'DISCOVER_EVENT',{id:'fuwei_recovery'});
  s=cmd(s,'CHOOSE_EVENT',{id:'fuwei_recovery',choice:'repair'});
  assert.ok(s.p0.facts.fuwei_refuge);
  assert.equal(s.p0.facts.fuwei_ready,undefined);
  assert.equal(s.treeDone['0:FZ-01'],1);
  let n=fresh();n.treeDone['0:HZ-01']=1;n=cmd(n,'DISCOVER_EVENT',{id:'meizhuang_preparation'});
  n.treeDone['0:HZ-01']=3;n=reconcileStories(n,SIDE_EVENTS);
  assert.equal(n.p0.quests.meizhuang_preparation.node,'expired');
});

test('two side paths join the three-bang council and alter real travel and escort difficulty',()=>{
  let s=fresh();s.flag['0:WX-01:complete']=true;s=advanceFate(s,0);
  assert.equal(resolveFateChoice(s,'dispute','shelter'),s);
  s.p0.facts.witness_sheltered=true;s.p0.facts.medicine_wudang=true;
  assert.equal(resolveFateChoice(s,'dispute','shelter'),s,'shelter alone does not produce documentary evidence');
  s.p0.facts.yanzi_ready=true;
  s=resolveFateChoice(s,'dispute','shelter');assert.equal(s.fate.node,'council');
  s.loc=2;s=resolveFateChoice(s,'council','alliance');
  const calm=worldConsequences(s);
  const hostile={...fresh(),fate:{node:'conflict',enteredAt:0,history:[]}};
  assert.ok(calm.escortDanger<worldConsequences(hostile).escortDanger);
  const before=hostile.silver,travel=cmd(hostile,'TRAVEL',{to:1});
  assert.equal(travel.silver,before-5);
  const battle=cmd(hostile,'ROUTINE',{id:'escort'});
  const peaceful=cmd({...s,loc:0},'ROUTINE',{id:'escort'});
  assert.ok(battle.battle.enemy.level>peaceful.battle.enemy.level);
});

test('causal outcomes change actual pharmacy and teacher transactions',()=>{
  let s=fresh();s.p0.room='pharmacy';s.p0.materials.herbs=2;
  const before=s.silver;
  s=applyEffects(s,[{op:'set',ref:'fact:shennong_truce',value:true}]);
  s=cmd(s,'BUY_MEDICINE');assert.equal(s.silver,before-7);
  s=cmd(s,'SELL_HERBS');assert.equal(s.silver,before);
  s.p0.room='gym';s.p0.facts.fuwei_refuge=true;
  s=cmd(s,'LEARN_SKILL',{id:'taizu'});assert.equal(s.silver,before-2);
});

test('archived accepted packs survive v7 migration and keep their real choices',()=>{
  let s=fresh();const id='xajh_z02_songshan_post';s.loc=2;
  s=cmd(s,'DISCOVER_EVENT',{id});assert.equal(s.p0.quests[id],undefined);
  s.p0.quests[id]={node:'n0',pending:null,done:false};
  s=migrateSave({version:7,state:s},saveOptions);
  assert.equal(directionReason(s,id,SIDE_EVENTS[id]),'');
  s.p0.knowledge=5;s.p0.potential=20;
  s=cmd(s,'CHOOSE_EVENT',{id,choice:'xajh_z02_post_compared'});
  assert.ok(s.p0.facts.xajh_z02_post_compared);
});

test('Meizhuang relief after the original ending cannot resurrect the four friends',()=>{
  let s=fresh();s.treeDone['0:HZ-01']=4;s.flag['0:HZ-01:complete']=true;s.loc=12;
  s=cmd(s,'DISCOVER_EVENT',{id:'meizhuang_aftermath'});
  s=cmd(s,'CHOOSE_EVENT',{id:'meizhuang_aftermath',choice:'repair'});
  assert.equal(s.p0.facts.meizhuang_survivors,undefined);
  assert.equal(s.p0.facts.meizhuang_refuge,true);
  assert.equal(worldConsequences(s).safeSea,true);
  assert.equal(worldConsequences(s).teachingDiscount,0);
  assert.equal(actorStates(s)[0].zone,0);
  assert.match(actorStates(s)[0].stage,/殉职/);
});

test('completed old trees unlock aftermath without awarding their ending again',()=>{
  let s=fresh();s.treeDone['0:FZ-01']=ZONES[0].trees.find(t=>t.id==='FZ-01').nodes.length;
  const before=s.silver;s=restore(s);
  assert.equal(s.silver,before);assert.equal(s.flag['0:FZ-01:complete'],true);
  assert.ok(cityLeads(s).events.some(e=>e.id==='fuwei_aftermath'));
});
