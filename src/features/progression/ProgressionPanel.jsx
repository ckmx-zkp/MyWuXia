import { chooseDialogue, lessonRequirements, readWorld } from '../../game/world-rules.js';
import React from 'react';
import { ACTIVITIES, BASICS, LESSONS, ROOMS, SIDE_EVENTS, WEAPONS } from '../../content/p0.js';
import { currentRoom, activityReason } from '../../game/p0-engine.js';
import { sideChoiceReason, requirementReason } from '../../game/side-events.js';
import { trainingCap } from '../../game/progression.js';
import { INTERNALS } from '../../game/training.js';
import { STYLES } from '../../content/combat.js';
import './progression.css';
import { worldConsequences } from '../../game/story-director.js';
import { trainingAdvice } from '../../game/growth-guide.js';
import { SECT_RANKS } from '../../content/wudang.js';
import { availableStyles } from '../../content/combat.js';

const rewardNames = { silver: '银两', potential: '潜能', herbs: '青叶草', contribution: '贡献', knowledge: '草木学识', hp: '气血', mp: '内力', training: '修炼心得' };
export function OfflineReport({ state, dispatch }) {
  const report = state.p0?.report;
  if (!report) return null;
  return <div className="story-mask"><section className="p0-report" role="dialog" aria-modal="true" aria-labelledby="return-title">
    <h2 id="return-title">归来记事</h2><p>{ACTIVITIES[report.id].name} · {report.target && (INTERNALS[report.target]?.name || BASICS[report.target] || report.target)} · {report.seconds} 秒</p>
    {Object.entries(report.earned).map(([k, v]) => <p key={k}>{rewardNames[k]} {v >= 0 ? '+' : ''}{v}</p>)}
    {report.capped && <p>本次按八小时结算。</p>}{report.stopped && <p>{report.reason || '本次修行已止，待重新安排。'}</p>}
    {report.before && report.after && <p>交手攻击 {report.before.attack} → {report.after.attack}；气血上限 {report.before.hp} → {report.after.hp}；内力上限 {report.before.mp} → {report.after.mp}</p>}
    <button onClick={() => dispatch({ type: 'DISMISS_REPORT' })}>收起记事</button>
  </section></div>;
}
export default function ProgressionPanel({ state: s, dispatch, mode = '江湖', onLegacy, onSpar, onTown }) {
  const p = s.p0, roomId = currentRoom(s), room = ROOMS[roomId];
  const busy = !!s.action || !!s.battle;
  const consequences=worldConsequences(s);
  const act = (id, target) => dispatch({ type: 'START_ACTIVITY', id, target });
  const activityButton = (id, target, label) => {
    const reason = activityReason(s, id, target);
    return <span className="p0-activity-choice"><button disabled={!!reason} title={reason || ACTIVITIES[id].name} onClick={() => act(id, target)}>{label || ACTIVITIES[id].name}</button>{reason && <small>{reason}</small>}</span>;
  };
  const lessons = Object.entries(LESSONS).filter(([, l]) => l.room === roomId).map(([id,l])=>[id,{...l,silver:Math.max(0,l.silver-consequences.teachingDiscount)}]);
  return <div className="p0-page">
    <div className="chapter"><small>{mode === '门派' ? p.sect ? `武当 · ${SECT_RANKS[p.rank]}` : '散人 · 自在行侠' : '临安与武当'}<span> · 潜能 {p.potential} · 贡献 {p.contribution}</span></small><h1>{mode === '江湖' ? room?.name || '江湖行路' : mode}</h1></div>
    {p.activity && <div className="p0-activity" role="status"><span>{ACTIVITIES[p.activity.id].name} · {BASICS[p.activity.target] || INTERNALS[p.activity.target]?.name || p.activity.target}</span><button disabled={busy} onClick={() => dispatch({ type: 'STOP_ACTIVITY' })}>收功</button></div>}
    {mode === '修炼' ? <>
      <p>气血 {s.hp}% · 内力 {s.mp}% · 草木学识 {p.knowledge} · 青叶草 {p.materials.herbs}</p>
      {activityButton('rest')}
      <h2>基本功</h2><div className="p0-list">{Object.entries(BASICS).map(([id, name]) => <div className="p0-row" key={id}><div><b>{name}</b><small>心得 {p.basics[id]} / 8100 · 每五息耗潜能五点</small></div>{activityButton('basic', id, '演练')}</div>)}</div>
      <h2>所学武学</h2><div className="p0-list">{Object.entries(p.styles).filter(([id]) => STYLES[id]).map(([id, skill]) => <div className="p0-row" key={id}><div><b>{id}</b><small>{skill.source} · 心得 {s.training.styles[id] || 0} / {trainingCap(s, 'styles', id)} · 教学上限 {skill.cap}</small></div>{activityButton('style', id, '练招')}</div>)}</div>
      <h2>所学内功</h2><div className="p0-list">{Object.entries(p.internals).map(([id, skill]) => <div className="p0-row" key={id}><div><b>{INTERNALS[id]?.name || id}</b><small>{skill.source} · 心得 {s.training.internals[id] || 0} / {trainingCap(s, 'internals', id)} · 教学上限 {skill.cap}</small></div>{activityButton('internal', id, '行功')}</div>)}</div>
      <h2>随身兵器</h2><label>兵器<select value={p.weapon} disabled={busy} onChange={e => dispatch({ type: 'EQUIP_WEAPON', id: e.target.value })}>{p.weapons.map(id => <option key={id} value={id}>{WEAPONS[id].name} · 攻击 +{WEAPONS[id].attack}</option>)}</select></label>
      <h2>主修搭配与下一重</h2>
      <label>主修武功<select value={s.loadout.style} disabled={busy} onChange={e=>dispatch({type:'EQUIP_LOADOUT',loadout:{...s.loadout,style:e.target.value}})}>{availableStyles(s).map(id=><option key={id}>{id}</option>)}</select></label>
      <label>主修内功<select value={s.loadout.internal} disabled={busy} onChange={e=>dispatch({type:'EQUIP_LOADOUT',loadout:{...s.loadout,internal:e.target.value}})}>{Object.keys(p.internals).map(id=><option key={id} value={id}>{INTERNALS[id].name}</option>)}</select></label>
      {[['styles',s.loadout.style],['internals',s.loadout.internal]].map(([kind,id])=>{const a=trainingAdvice(s,kind,id);return <p key={kind}><b>{INTERNALS[id]?.name || id} · {a.level}重</b><br/>{a.text}<br/>{a.effect}</p>;})}
      <h2>江湖经历</h2>{p.journal.slice(-8).reverse().map(j => <p key={j.id}>{j.text}</p>)}
    </> : <>
      {room && <><p className="p0-scene">{room.scene}</p>{chooseDialogue(s,room).map(([name, text]) => <p key={name}><b>{name}：</b>{text}</p>)}

        <div className="p0-exits">{room.exits.map(id => <button disabled={busy} key={id} onClick={() => dispatch({ type: 'MOVE_ROOM', id })}>{ROOMS[id].name}</button>)}</div></>}
      {mode === '门派' && <button onClick={onTown}>查看当地事件与考核</button>}
      {mode === '门派' && !p.sect && <p>武当山门设在荆襄。城南武馆也向无门无派之人传授拳脚与刀法。</p>}
      {roomId === 'wudang-gate' && !p.sect && <button disabled={busy} onClick={() => {dispatch({ type: 'JOIN_SECT' }); onTown();}}>询问山门引荐与试招</button>}
      {mode==='门派' && p.sect && <p>与武当教习交情 {s.favor['武当教习'] || 0}。外门考核：绵掌一百、贡献十；护道考校：掌法与全真心法各四百、贡献三十、交情十五，并送回药路口信。入室可担保调停，护道可请教纯阳入门篇。</p>}

      <div className="p0-actions">{Object.entries(ACTIVITIES).filter(([, a]) => a.rooms?.includes(roomId)).map(([id, a]) => <div key={id}>{activityButton(id)}<small>{Object.entries(a).filter(([k, v]) => rewardNames[k] && typeof v === 'number').map(([k, v]) => `${rewardNames[k]} +${v}`).join(' · ')} / {a.seconds} 秒</small></div>)}</div>
      {roomId === 'inn' && <button disabled={busy || s.silver < 5 || s.hp===100 && s.mp===100} onClick={() => dispatch({ type: 'INN_REST' })}>投宿 · 五两</button>}
      {roomId === 'pharmacy' && <div className="p0-actions"><button disabled={busy || s.silver < consequences.medicinePrice} onClick={() => dispatch({ type: 'BUY_MEDICINE' })}>药师疗伤 · {consequences.medicinePrice}两</button><button disabled={busy || !p.materials.herbs} onClick={() => dispatch({ type: 'SELL_HERBS' })}>售出一份青叶草 · {consequences.herbPrice}两</button></div>}
      {roomId === 'smith' && Object.entries(WEAPONS).filter(([id]) => id !== 'hands').map(([id, w]) => <div className="p0-row" key={id}><span>{w.name} · 攻击 +{w.attack}</span><button disabled={busy || p.weapons.includes(id) || s.silver < w.price} onClick={() => dispatch({ type: 'BUY_WEAPON', id })}>{p.weapons.includes(id) ? '已购得' : `购买 · ${w.price}两`}</button></div>)}
      {lessons.length > 0 && <><h2>请教学艺</h2>{lessons.map(([id, l]) => {
        const learned = p[l.kind === 'style' ? 'styles' : 'internals'][l.target];
        const reason = requirementReason(s, lessonRequirements(l));
        return <div className="p0-row" key={id}><div><b>{l.name}</b><small>银两 {l.silver} · 潜能 {l.potential}{l.contribution ? ` · 贡献 ${l.contribution}` : ''}{reason ? ` · ${reason}` : ''}</small></div><button title={reason} disabled={busy || !!learned || !!reason} onClick={() => dispatch({ type: 'LEARN_SKILL', id })}>{learned ? '已传授' : '请教'}</button></div>;
      })}</>}
      {roomId === 'gym' && <button disabled={busy} onClick={onSpar}>请教习陪练</button>}
      <div className="p0-actions"><button onClick={onLegacy}>查阅区域旧闻</button>{activityButton('rest')}</div>
    </>}
  </div>;
}
