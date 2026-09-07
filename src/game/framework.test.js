import test from 'node:test';
import assert from 'node:assert/strict';
import { initial } from './state.js';
import { beginProgression } from './progression.js';
import { testCondition, transact, readWorld, chooseDialogue } from './world-rules.js';
import { p0Command, settleP0Combat } from './p0-engine.js';
import { createWorldEngine } from './world-engine.js';
import { createGameReducer } from './commands.js';
import { migrateSave, encodeSave } from './saves.js';
import { saveOptions } from './save-schema.js';
import { cityLeads, routeBetween, roomRoute } from './city-leads.js';
import { ROOMS, SIDE_EVENTS } from '../content/p0.js';
import { ZONES } from '../content/world.js';
import { LINKS } from '../content/city-leads.js';
import { validateP0 } from '../content/validate-p0.js';
import { advanceFate } from './fate-engine.js';
import { advanceCombat, retreatCombat, startCombat } from './combat.js';
import { createAudioManager } from '../services/audio-manager.js';
import { settleSideEvent, sideChoiceReason } from './side-events.js';

const fresh = () => beginProgression(initial());
const at = (s,room) => ({...s,loc:ROOMS[room].zone,visited:[...new Set([...s.visited,ROOMS[room].zone])],p0:{...s.p0,room}});
const cmd = (s,type,fields = {},now = 1000) => p0Command(s,{type,...fields},now);
const restore = s => migrateSave(encodeSave(s),saveOptions);
const reward = (_z,main) => ({time:main ? 12 : 8,silver:20,exp:30,hp:0});
const engine = createWorldEngine({ability:()=>100,questReward:reward,clamp:x=>Math.max(1,Math.min(100,x)),ITEMS:{jinchuang:{name:'药'},canye:{name:'残页'}},ROAD:[],FAC:{},FAC_DEFAULT:{gym:'武馆'},levelUpLog:n=>n});
const reduce = createGameReducer({tick:engine.tick,settleStory:engine.settleStory,levelUpLog:n=>n,ZONES,LINKS,questReward:reward,ability:()=>100});

test('world conditions compose and unknown fields cannot silently permit a choice', () => {
  const s = fresh();
  assert.ok(testCondition(s,{all:[{any:[{ref:'resource:silver',op:'gte',value:100},{ref:'sect',op:'eq',value:'wudang'}]},{not:{ref:'fact:medicine_complete',op:'eq',value:true}}]}));
  assert.throws(()=>testCondition(s,{ref:'resource:silvr',op:'gte',value:0}),/未知/);
  const bad = structuredClone(SIDE_EVENTS); bad.medicine.nodes.request.choices[0].requires = {knowlege:2};
  assert.throws(()=>validateP0(bad),/未知条件/);
  bad.medicine.nodes.request.choices[0].requires = {}; bad.medicine.nodes.request.choices[0].effects = {silvr:10};
  assert.throws(()=>validateP0(bad),/未知效果/);
});
test('cost, multiple effects and failures are atomic, with explicit fact namespaces', () => {
  const s = fresh(), copy = structuredClone(s);
  assert.equal(transact(s,{cost:{silver:9999},effects:{potential:5}}).state,s);
  assert.throws(()=>transact(s,{cost:{silver:10},effects:[{op:'add',ref:'resource:potential',value:5},{op:'teaching',ref:'未学武学',value:100}]}));
  assert.deepEqual(s,copy);
  const n = transact(s,{cost:{silver:10},effects:{potential:5,flag:{test:true}}}).state;
  assert.equal(n.silver,s.silver-10); assert.equal(n.p0.potential,s.p0.potential+5);
  assert.equal(readWorld(n,'fact:test'),true); assert.equal(readWorld(n,'world:test'),undefined);
});
test('fixed variants prioritize facts and fall back to original dialogue', () => {
  const s = fresh(); assert.deepEqual(chooseDialogue(s,ROOMS.pharmacy),ROOMS.pharmacy.npcs);
  s.p0.facts.medicine_complete = true; assert.match(chooseDialogue(s,ROOMS.pharmacy)[0][1],/五两/);
  s.p0.facts.medicine_returned = true; assert.match(chooseDialogue(s,ROOMS.pharmacy)[0][1],/汉水的回话/);
});
test('empty effects remain immutable and a revisited choice cannot repay its effects', () => {
  let s=cmd(at(fresh(),'pharmacy'),'DISCOVER_EVENT',{id:'medicine'});
  const copy=structuredClone(s);
  const next=cmd(s,'CHOOSE_EVENT',{id:'medicine',choice:'accept'});
  assert.deepEqual(s,copy); assert.equal(next.p0.quests.medicine.node,'road');
  s=at(fresh(),'home'); s.p0.quests.medicine={node:'delivered',pending:null,done:false};
  const finished=settleSideEvent(s,{eventId:'medicine',nodeId:'delivered',choiceId:'finish'},true);
  const revisited={...finished,p0:{...finished.p0,quests:{...finished.p0.quests,medicine:{...finished.p0.quests.medicine,node:'delivered',done:false}}}};
  assert.equal(settleSideEvent(revisited,{eventId:'medicine',nodeId:'delivered',choiceId:'finish'},true).silver,finished.silver);
});
test('hidden choices are rejected by commands as well as the presentation layer', () => {
  const choice=SIDE_EVENTS.medicine.nodes.request.choices[0];
  try {
    choice.visibleWhen={ref:'fact:medicine_prepared',op:'eq',value:true};
    const s=cmd(at(fresh(),'pharmacy'),'DISCOVER_EVENT',{id:'medicine'});
    assert.ok(sideChoiceReason(s,'medicine','accept'));
    assert.equal(cmd(s,'CHOOSE_EVENT',{id:'medicine',choice:'accept'}).p0.quests.medicine.node,'request');
  } finally { delete choice.visibleWhen; }
});
test('four completed introductory tasks still lead to playable stories and cross-region routes', () => {
  const s = fresh(); s.done[0] = [true,true,true,true];
  assert.equal(cityLeads(s).intro,-1); assert.equal(cityLeads(s).stories.filter(t=>t.zone===0).length,6);
  s.treeDone['0:YZ-01'] = ZONES[0].trees[0].nodes.length;
  assert.ok(!cityLeads(s).stories.some(t=>t.id==='YZ-01'));
  for(let zone=0;zone<13;zone++) {
    const leads = cityLeads({...s,loc:zone}); assert.ok(leads.stories.length);
    for(const t of leads.stories) for(let i=1;i<t.route.length;i++) assert.ok(LINKS[t.route[i-1]].includes(t.route[i]));
  }
  assert.deepEqual(roomRoute('pharmacy','gym'),['pharmacy','market','street','gym']);
});
test('medicine follow-up crosses regions and returns home, preserving one-time rewards', () => {
  let s=at(fresh(),'pharmacy');
  assert.equal(cmd(s,'DISCOVER_EVENT',{id:'medicine_return'}).p0.quests.medicine_return,undefined);
  s.p0.facts.medicine_complete=true;
  s=cmd(s,'DISCOVER_EVENT',{id:'medicine_return'}); s=cmd(s,'CHOOSE_EVENT',{id:'medicine_return',choice:'carry'});
  assert.equal(cmd(s,'CHOOSE_EVENT',{id:'medicine_return',choice:'deliver'}).p0.quests.medicine_return.node,'visit');
  s=at(restore(s),'wudang-gate'); s=cmd(s,'CHOOSE_EVENT',{id:'medicine_return',choice:'deliver'});
  s=at(restore(s),'pharmacy'); s=cmd(s,'CHOOSE_EVENT',{id:'medicine_return',choice:'finish'});
  assert.ok(s.p0.facts.medicine_returned); assert.equal(s.p0.materials.herbs,3);
  assert.equal(cmd(s,'CHOOSE_EVENT',{id:'medicine_return',choice:'finish'}).p0.materials.herbs,3);
  assert.equal(restore(s).p0.quests.medicine_return.choices.visit.choiceId,'deliver');
});
test('representative legacy quest uses event choices and preserves completed old progress', () => {
  let s = reduce(fresh(),{type:'QUEST',index:0},1000);
  assert.equal(s.action,null); assert.equal(s.p0.quests.jiangnan_letter.node,'inquiry');
  s = reduce(s,{type:'CHOOSE_EVENT',id:'jiangnan_letter',choice:'ask'},1000);
  assert.ok(s.done[0][0]); assert.equal(s.worldTime,2);
  assert.equal(reduce(s,{type:'QUEST',index:0},1000).silver,s.silver);
  const old=fresh(); old.done[0]=[true,true,false,false];
  assert.ok(!cityLeads(restore(old)).events.some(e=>e.id==='jiangnan_letter'));
});
test('instant travel/quests and v6 pending actions continue once; battle resumes exact RNG', () => {
  let s=fresh(); s.rngState=100000;
  const next=reduce(s,{type:'TRAVEL',to:1},1000);
  assert.equal(next.worldTime,10); assert.ok(!next.action || next.action.type==='combat');
  assert.equal(reduce(s,{type:'TRAVEL',to:11},1000).loc,0);
  for(const action of [{type:'travel',to:1,left:7,total:10},{type:'quest',zone:0,idx:1,left:5,total:8},{type:'routine',zone:0,id:'errand',left:4,total:12},{type:'spar',zone:0,left:3,total:8}]) {
    const old=migrateSave({version:6,state:{...s,action}},saveOptions);
    const resumed=reduce(old,{type:'LOAD',state:old},1000);
    assert.ok(!resumed.action || resumed.action.type==='combat'); assert.equal(resumed.worldTime,action.left);
    const again=reduce(restore(resumed),{type:'LOAD',state:restore(resumed)},1000);
    assert.equal(again.silver,resumed.silver); assert.equal(again.worldTime,resumed.worldTime);
    assert.deepEqual(again.battle,resumed.battle);
  }
});
test('repeated labor clicks never pay immediately; escort retreat cannot farm', () => {
  let s=fresh(), silver=s.silver;
  for(let i=0;i<25;i++) s=reduce(s,{type:'ROUTINE',id:'errand'},1000);
  assert.equal(s.silver,silver); assert.equal(s.p0.activity.id,'errand');
  s=reduce(s,{type:'HEARTBEAT'},13000); assert.equal(s.silver,silver+8);
  s=reduce(s,{type:'ROUTINE',id:'escort'},13000); assert.equal(s.p0.activity,null); assert.equal(s.battle.context.kind,'routine');
  const escaped=retreatCombat(restore(s),engine.settleStory);
  assert.equal(escaped.silver,s.silver); assert.equal(escaped.expTotal,s.expTotal);
});
test('world-time jumps visit deadlines and do not depend on offline activity duration', () => {
  const s=fresh(); s.flag['0:WX-01:complete']=true;
  const jumped=advanceFate(s,1000); let stepped=s;
  for(let i=0;i<1000;i++) stepped=advanceFate(stepped);
  assert.deepEqual(jumped,stepped);
});
test('new and legacy examination battles resolve through the event contract once', () => {
  let s=at(fresh(),'wudang-hall'); s.p0.sect='wudang'; s.p0.contribution=10;
  s.p0.styles['武当绵掌']={cap:1600,source:'武当'}; s.training.styles['武当绵掌']=100;
  s=cmd(s,'EXAM'); assert.equal(s.battle.context.eventId,'wudang_exam');
  assert.deepEqual(advanceCombat(s,settleP0Combat),advanceCombat(restore(s),settleP0Combat));
  const escape=retreatCombat(restore(s),settleP0Combat); assert.equal(escape.p0.quests.wudang_exam.node,'retry');
  const old=at(fresh(),'wudang-hall'); old.p0.styles['武当绵掌']={cap:1600,source:'武当'};
  const legacy=startCombat(old,{opponent:'student',context:{kind:'exam'}});
  const won=settleP0Combat({...legacy,battle:{...legacy.battle,status:'won',settled:true},action:null},{kind:'exam'},true);
  assert.equal(won.p0.rank,1); assert.equal(won.p0.styles['武当绵掌'].cap,3600);
  assert.equal(settleP0Combat(won,{kind:'exam'},true).p0.potential,won.p0.potential);
});
test('audio instances cancel all fades, queued speech and tracks when reset', async () => {
  let id=0; const intervals=new Map(),timeouts=new Map(), tracks=[];
  const platform={create(src){const a={src,paused:true,volume:1,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}}; tracks.push(a);return a;},interval(fn){intervals.set(++id,fn);return id;},clearInterval(i){intervals.delete(i);},timeout(fn){timeouts.set(++id,fn);return id;},clearTimeout(i){timeouts.delete(i);}};
  const a=createAudioManager(platform); a.bgmSwitch(0,false); await Promise.resolve();
  a.playDialogues([['人','话','a.mp3'],['人','话','b.mp3']],false); tracks.at(-1).onended();
  assert.ok(timeouts.size); a.dispose(); await Promise.resolve();
  assert.equal(intervals.size,0); assert.equal(timeouts.size,0); assert.ok(tracks.every(t=>t.paused));
  a.bgmSwitch(1,false); await Promise.resolve(); assert.equal(tracks.at(-1).paused,false); a.dispose();
});
