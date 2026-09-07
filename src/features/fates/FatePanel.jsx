import React from 'react';
import { FATES, FATE_NPCS } from '../../content/fates.js';
import { ZONES } from '../../content/world.js';
import { fateChoiceReason } from '../../game/fate-engine.js';
import './fates.css';

export default function FatePanel({ state, onChoose }) {
  const node = FATES[state.fate.node];
  const left = node.window ? Math.max(0, node.window - (state.worldTime - state.fate.enteredAt)) : null;
  return <section className="fate-section">
    <div className="chapter"><small>三帮命运 · 江湖第 {Math.floor(state.worldTime / 300) + 1} 日</small><h2>{node.name}</h2><p>{node.scene}</p></div>
    {state.fate.node === 'locked' ? <p>前缘：无锡《杏子林变局与身世惊雷》未了。</p> : <>
      {left !== null && <p role="timer">约期余 {Math.floor(left / 60)} 分 {left % 60} 息</p>}
      {node.zones && <p>会面地点：{node.zones.map(i => ZONES[i].name).join(' / ')}</p>}
      {(node.dialogues || []).map(([who, text]) => <p key={who} className="dlg"><b>{who}</b>{text}</p>)}
      <div className="choices">{node.choices.map(c => { const reason = fateChoiceReason(state, c); return <button key={c.id} disabled={!!reason} onClick={() => onChoose(state.fate.node, c.id)}>{c.text}{c.cost ? <small>银两 -{c.cost}</small> : null}{reason && <small>{reason}</small>}</button>; })}</div>
      {node.hearsay && <p className="hint">江湖传闻：{node.hearsay}</p>}
    </>}
    <div className="page-list">{Object.entries(FATE_NPCS).map(([id, name]) => <div className="page-item" key={id}><b>{name}</b><small>{state.npcStates[id] || '独立掌帮，尚未议盟'}</small></div>)}</div>
    {Object.keys(state.factionRelations).length > 0 && <p>北东关系 {state.factionRelations.north_east || 0} · 北西关系 {state.factionRelations.north_west || 0} · 东西关系 {state.factionRelations.east_west || 0}</p>}
    {state.fate.history.length > 0 && <details><summary>江湖回响（{state.fate.history.length}）</summary>{state.fate.history.slice().reverse().map((h, i) => <p key={i}>第 {Math.floor(h.at / 300) + 1} 日 · {h.text}</p>)}</details>}
  </section>;
}
