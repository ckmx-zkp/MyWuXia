import React from 'react';
import { growthGoal, growthSnapshot } from '../../game/growth-guide.js';
import { SECT_RANKS } from '../../content/wudang.js';
import { routeBetween, roomRoute } from '../../game/city-leads.js';
import { ZONES } from '../../content/world.js';
import { ROOMS, ACTIVITIES } from '../../content/p0.js';
import { currentRoom } from '../../game/p0-engine.js';
import { GOAL_FOCUS, LEARNING_PATH, DEFAULT_INTENT } from '../../content/goals.js';

export default function GrowthGuide({state:s,dispatch,onTravel,onFate}) {
  const goal=growthGoal(s), profile=growthSnapshot(s), room=currentRoom(s),busy=!!s.action || !!s.battle;
  const intent=s.p0.intent || DEFAULT_INTENT;
  const zonePath=goal.zone!==undefined && goal.zone!==s.loc?routeBetween(s.loc,goal.zone):[];
  const rooms=goal.room && !zonePath.length?roomRoute(room,goal.room):[];
  return <section className="p0-event" aria-label="下一步成长">
    <div className="p0-actions"><label>成长方向 <select disabled={busy} value={intent.focus} onChange={e=>dispatch({type:'SET_GOAL',...intent,focus:e.target.value})}>{Object.entries(GOAL_FOCUS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
    {intent.focus==='learning' && <label>学艺道路 <select disabled={busy} value={intent.school} onChange={e=>dispatch({type:'SET_GOAL',...intent,school:e.target.value})}>{Object.entries(LEARNING_PATH).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}</div>
    <h3>{goal.title}</h3><p>{goal.text}</p>
    <small>当前交手攻击 {profile.attack} · 气血上限 {profile.hp} · 内力上限 {profile.mp}（按主修配置计算）</small>
    {s.p0.sect && <p>武当 · {SECT_RANKS[s.p0.rank]} · 与教习交情 {s.favor['武当教习'] || 0}。入室可作师门调停担保；护道弟子可学纯阳入门篇。</p>}
    {goal.activity && <button disabled={busy} onClick={()=>dispatch({type:'START_ACTIVITY',id:goal.activity})}>{ACTIVITIES[goal.activity].name}</button>}
    {zonePath.length>1 && <button disabled={busy} onClick={()=>onTravel(zonePath[1])}>启程至{ZONES[zonePath[1]].name}</button>}
    {rooms.length>1 && <button disabled={busy} onClick={()=>dispatch({type:'MOVE_ROOM',id:rooms[1]})}>前往{ROOMS[rooms[1]].name}</button>}
    {goal.fate && <button onClick={onFate}>查看三帮命运</button>}
    {goal.eventId && !s.p0.quests[goal.eventId] && goal.zone===s.loc && (!goal.room || goal.room===room) && <button disabled={busy} onClick={()=>dispatch({type:'DISCOVER_EVENT',id:goal.eventId})}>问清此事</button>}
  </section>;
}
