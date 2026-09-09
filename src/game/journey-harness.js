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

import { ORIGINS } from '../content/creation.js';
import { START_SKILLS } from '../content/martial.js';

const engine=createWorldEngine({ability,questReward:()=>({silver:10,exp:10,time:10,hp:0}),clamp:x=>Math.max(1,Math.min(100,x)),ITEMS:{},ROAD:[],FAC:{},FAC_DEFAULT:{gym:'武馆'},levelUpLog:n=>n});
const reducer=createGameReducer({...engine,ZONES,LINKS,ability,ORIGINS,START_SKILLS,clamp:x=>Math.max(1,Math.min(100,x)),levelUpLog:n=>n});
// Commands use the real combat/RNG/conditions. Time is simulated one second at a time.
export function journey(create) {
  let s=beginProgression(initial()),now=1000;
  const send=(type,fields={})=>{s=reducer(s,{type,...fields},now);return s;};
  if(create) send('CREATE',{name:'路线验收',origin:'hunter',skill:'luohan',alloc:{hp:0,ab:5,exp:0},seed:1,...create});
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
export function foundation(j) {
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
