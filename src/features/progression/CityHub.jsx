import React from 'react';
import { cityLeads, routeBetween, roomRoute } from '../../game/city-leads.js';
import { ZONES } from '../../content/world.js';
import { ROOMS } from '../../content/p0.js';
import { currentRoom } from '../../game/p0-engine.js';
import { sideChoiceReason, atEventNode } from '../../game/side-events.js';
import { chooseDialogue, testCondition } from '../../game/world-rules.js';
import './progression.css';

export default function CityHub({ state:s, dispatch, onStory, onQuest, onTravel, onLegacy, onFate, onRoutine }) {
  const { stories, events, intro, completed } = cityLeads(s), busy = !!s.action || !!s.battle;
  const room = currentRoom(s);
  const destination = (zone, targetRoom) => {
    if (zone !== s.loc) {
      const route = routeBetween(s.loc,zone);
      return <><small>路线：{route.map(i => ZONES[i].name).join(' → ')}</small><button disabled={busy || route.length < 2} onClick={() => onTravel(route[1])}>启程至{ZONES[route[1]]?.name}</button></>;
    }
    if (!targetRoom) return <small>此事就在本区，抵达后即可过问。</small>;
    const path = roomRoute(room,targetRoom);
    return <><small>去向：{path.map(id => ROOMS[id].name).join(' → ') || ROOMS[targetRoom]?.name}</small><button disabled={busy || path.length < 2} onClick={() => dispatch({type:'MOVE_ROOM',id:path[1]})}>前往{ROOMS[path[1]]?.name || ROOMS[targetRoom]?.name}</button></>;
  };
  return <section className="p0-page city-hub" aria-label="当地线索与后续">
    <h2>当地线索与后续</h2>
    <p>{completed === 4 ? '当地初识的四桩事已了，人物旧事、来往差事与后续机缘仍可继续。' : '从眼前的事结识当地人，也可随时追寻人物旧事。'} 当前位置：{ZONES[s.loc].name}{ROOMS[room] ? ` · ${ROOMS[room].name}` : ''}。</p>
    {ROOMS[room] && <div className="p0-exits">{ROOMS[room].exits.map(id => <button key={id} disabled={busy} onClick={() => dispatch({type:'MOVE_ROOM',id})}>{ROOMS[id].name}</button>)}</div>}
    {intro >= 0 && !(s.loc === 0 && intro === 0) && <div className="p0-row"><div><b>初识当地 · {ZONES[s.loc].quests[intro].name}</b><small>{ZONES[s.loc].quests[intro].text}</small></div><button disabled={busy} onClick={() => onQuest(intro)}>循线问询</button></div>}
    {events.filter(e => e.zone === s.loc || e.progress).map(({id,event,progress,node,zone}) => <section className="p0-event" key={id}>
      <h3>{event.name} · {progress ? '继续此事' : '新线索'}</h3>
      {!atEventNode({...s,p0:{...s.p0,room}},node) ? <><p>{node.hearsay}</p>{destination(zone,node.room)}</> : !progress ? <><p>{node.hearsay}</p><button disabled={busy} onClick={() => dispatch({type:'DISCOVER_EVENT',id})}>问清此事</button></> : <>
        <p>{node.scene}</p>{chooseDialogue(s,node).map(([who,text],i) => <p key={i}><b>{who}：</b>{text}</p>)}
        <div className="p0-choices">{node.choices.filter(c => testCondition(s,c.visibleWhen)).map(c => {
          const reason = sideChoiceReason({...s,p0:{...s.p0,room}},id,c.id);
          return <div key={c.id}><button disabled={!!reason} onClick={() => dispatch({type:'CHOOSE_EVENT',id,choice:c.id})}>{c.text}{c.combat && ' · 自动交手，败退可继续'}</button>{reason && <small>{reason}</small>}</div>;
        })}</div><p className="p0-hearsay">{node.hearsay}</p>
      </>}
    </section>)}
    {s.p0.journal.length > 0 && <p className="p0-echo" role="status">近事：{s.p0.journal.at(-1).text}</p>}
    <details className="city-stories"><summary>人物与江湖主线 · 本区 {stories.filter(t => t.zone === s.loc).length} 条可继续</summary>
    {stories.filter(t => t.zone === s.loc).map(t => <div className="p0-row" key={t.id}><div><b>{t.where} · {t.name}</b><small>{t.speaker}：{t.text}</small><small>{t.count ? `已走过 ${t.count}/${t.total} 段，继续后事` : '可独立介入，不必先清完四项历练'}</small></div><button disabled={busy} onClick={() => onStory(t.index,t.count)}>继续探访</button></div>)}
    </details>
    {s.fate.node !== 'locked' && <div className="p0-row"><div><b>三帮失粮案</b><small>杏子林之后的三帮关系已有变化，可查看当前局势与后继。</small></div><button onClick={onFate}>查看命运</button></div>}
    <details><summary>远方线索 · {stories.filter(t => t.zone !== s.loc).length} 条可追寻</summary>{stories.filter(t => t.zone !== s.loc).map(t => <div className="p0-event" key={t.id}><b>{ZONES[t.zone].name} · {t.name}</b><p>{t.speaker}：{t.text}</p>{destination(t.zone)}</div>)}</details>
    <h3>城中常有的差事</h3><p>谋生所得可用于学艺与修炼。护送须完成交手，抽身撤退不领酬劳。</p>
    <div className="p0-actions"><button disabled={busy} onClick={() => onRoutine('errand')}>行脚差事 · 持续挣取银两与潜能</button><button disabled={busy} onClick={() => onRoutine('escort')}>护送药车 · 护住车夫</button><button onClick={onLegacy}>区域历练与城中设施</button></div>
    {s.p0.activity && <p role="status">已在进行持续活动，可在「修炼」查看或收功。</p>}
  </section>;
}
