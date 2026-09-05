import React, { useEffect, useRef, useState } from 'react';
import { availableStyles, normalizeLoadout, STYLES, OPPONENTS, STRATEGIES, BREATHS, FOOTWORK } from '../../content/combat.js';
import './combat.css';

export function LoadoutEditor({ state, value, onChange, disabled = false }) {
  const config = normalizeLoadout(state, value);
  const change = (key, val) => onChange({ ...config, [key]: val });
  return <div className="loadout-editor">
    <label>主修武学<select disabled={disabled} value={config.style} onChange={e => change('style', e.target.value)}>
      {availableStyles(state).map(name => <option key={name}>{name}</option>)}
    </select><small>{STYLES[config.style].moves.join(' · ')}；强招每隔两次行动自动施展。</small></label>
    {[[STRATEGIES, 'strategy', '出招策略'], [BREATHS, 'breath', '运功方式'], [FOOTWORK, 'footwork', '身法']].map(([list, key, title]) => <label key={key}>{title}
      <select disabled={disabled} value={config[key]} onChange={e => change(key, e.target.value)}>{Object.entries(list).map(([id, item]) => <option value={id} key={id}>{item.name}</option>)}</select>
      <small>{list[config[key]].text}</small>
    </label>)}
  </div>;
}
function Vitals({ fighter, label }) {
  return <div className="combat-fighter"><small>{label} · {fighter.loadout.style}</small><h3>{fighter.name}</h3>
    <label>气血 <span>{fighter.hp} / {fighter.maxHp}</span></label>
    <meter min="0" max={fighter.maxHp} value={fighter.hp} aria-label={`${fighter.name}气血`} />
    <label>本场内力 <span>{fighter.mp} / {fighter.maxMp}</span></label>
    <meter className="mp" min="0" max={fighter.maxMp} value={fighter.mp} aria-label={`${fighter.name}内力`} />
    <small>{STRATEGIES[fighter.loadout.strategy].name} · {fighter.cooldown ? `强招尚需 ${fighter.cooldown} 次行动` : '强招就绪'}</small>
  </div>;
}
export default function CombatPanel({ state, setup, onStart, onClose, onRetreat, onSaves }) {
  const [opponent, setOpponent] = useState(setup?.opponent || 'student');
  const [loadout, setLoadout] = useState(() => normalizeLoadout(state));
  const logs = useRef(null);
  const follow = useRef(true);
  const heading = useRef(null);
  const battle = state.battle;
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { if (logs.current && follow.current) logs.current.scrollTop = logs.current.scrollHeight; }, [battle?.round, battle?.status]);
  const enemy = OPPONENTS[battle?.opponent || opponent];
  return <div className="story-mask combat-mask">
    <section className="combat-panel" role="dialog" aria-modal="true" aria-labelledby="combat-title">
      <div className="combat-heading"><div><small>{battle?.place || setup?.place} · {battle ? '交手实录' : '战前准备'}</small><h2 id="combat-title" tabIndex={-1} ref={heading}>{battle ? `${battle.player.name} · ${battle.enemy.name}` : '以武会友'}</h2></div>
        {(!battle || battle.settled) && <button onClick={onClose} aria-label="关闭战斗">✕</button>}</div>
      {!battle ? <>
        {!setup?.context && <div className="combat-opponents">{['student', 'swordsman', 'instructor'].map(id => <button key={id} aria-pressed={opponent === id} className={opponent === id ? 'selected' : ''} onClick={() => setOpponent(id)}><b>{OPPONENTS[id].name}</b><small>{OPPONENTS[id].realm} · {OPPONENTS[id].danger}难度</small></button>)}</div>}
        <p className="combat-warning">{enemy.name} · {enemy.realm} · 危险度：{enemy.danger}。{enemy.text}</p>
        <LoadoutEditor state={state} value={loadout} onChange={setLoadout} />
        <p className="combat-note">气血按当前伤势入场（{state.hp}/100），内力在每场交手前调匀。{setup?.context ? '胜负与脱身都会留下剧情后果，主线仍可继续。' : '胜得 15 历练，败或平手得 8；主动收招无奖励，切磋最多轻伤。'}收益按开战时倍率计算。</p>
        <div className="combat-actions"><button onClick={onClose}>暂不交手</button><button className="primary" onClick={() => onStart({ ...setup, opponent, loadout })}>开始自动交手</button></div>
      </> : <>
        {battle.context && <p className="combat-warning">{enemy.name} · {enemy.realm} · 危险度：{enemy.danger}。{enemy.text}</p>}
        <div className="combat-vitals"><Vitals fighter={battle.player} label="我方" /><Vitals fighter={battle.enemy} label="对手" /></div>
        <div className="combat-round"><b>第 {battle.round} 回合</b><span>{battle.status === 'active' ? '自动交手中 · 每息一回合' : '交手已结束'} · {enemy.realm}</span></div>
        <div className="combat-log" ref={logs} role="log" aria-label="交手战报" aria-live="polite" onScroll={() => { const el = logs.current; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}>
          {battle.log.map((line, i) => <p key={i}>{line}</p>)}
        </div>
        {battle.settled && <p className="combat-result" role="status">{battle.result}</p>}
        <div className="combat-actions"><button onClick={onSaves}>存档 / 读档</button>{battle.status === 'active' ? <button onClick={onRetreat}>{battle.context ? '抽身脱离（剧情继续）' : '抱拳收招（无奖励）'}</button> : <button className="primary" onClick={onClose}>收起战报</button>}</div>
      </>}
    </section>
  </div>;
}
