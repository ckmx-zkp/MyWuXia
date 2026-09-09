import { mastery, masteryTarget, pairing, INTERNALS } from './training.js';
import { trainingCap, styleFamily } from './progression.js';
import { startCombat } from './combat.js';
import { cityLeads } from './city-leads.js';
import { FATES } from '../content/fates.js';
import { DEFAULT_INTENT } from '../content/goals.js';
import { ACTIVITIES } from '../content/p0.js';
import { requirementReason } from './side-events.js';

// Uses the same fighter construction as actual combat; this never commits a fight or RNG.
export function growthSnapshot(s) {
  const player=startCombat({...s,action:null,battle:null},{seed:1}).battle.player;
  return {attack:Number(player.attack.toFixed(2)),armor:Number((player.armorBonus*100).toFixed(1)),hp:player.maxHp,mp:player.maxMp};
}
export function trainingAdvice(s,kind,target) {
  const value=s.training[kind]?.[target] || 0, goal=masteryTarget(value), cap=trainingCap(s,kind,target);
  const family=kind==='styles'?styleFamily(target):'internal';
  const teacher=s.p0[kind][target]?.cap || 900;
  const blocker=goal && cap<goal ? (s.p0.basics[family]<goal?'先演练对应基本功，再继续修炼':'已达师承上限，须完成考核进修') : '';
  const next=goal && {...s,training:{...s.training,[kind]:{...s.training[kind],[target]:goal}}};
  const selected=kind==='styles'?{...s.loadout,style:target}:{...s.loadout,internal:target};
  const before=pairing(s,selected), after=next && pairing(next,selected);
  return {level:mastery(value),goal,cap,teacher,blocker,
    text:goal?`下一重还需 ${goal-value} 心得与潜能；约 ${goal-value} 秒修炼。${blocker}`:'已臻十重',
    effect:after ? kind==='styles'?`招式伤害系数 ${before.damage.toFixed(2)} → ${after.damage.toFixed(2)}`:`搭配伤害系数 ${before.damage.toFixed(2)} → ${after.damage.toFixed(2)}；调息加成 ${(before.recovery*100).toFixed(0)}% → ${(after.recovery*100).toFixed(0)}%`:'已达最高重数'};
}
function wudangGoal(s) {
  const p=s.p0;
  if(s.hp<60 || s.mp<30) return {title:'先养伤，再应约',text:'客栈五两恢复全部气血与内力；盘缠不足时可免费静养。',activity:'rest'};
  if(p.potential<100) return {title:'为下一重积攒潜能',text:'行脚每十二秒得五潜能、八两；入门后武当洒扫每二十秒得六潜能、二贡献。',activity:'errand'};
  if(!p.sect) return {title:'在山门核实引荐',text:'护药回信可引荐入门；没有回信也能请师兄试招，失手可重试。',zone:1,room:'wudang-gate'};
  if(!p.styles['武当绵掌'] || !p.internals.quanzhen) return {title:'学会掌法与内功相配',text:'在练功院洒扫，每门初传需二十潜能、十贡献；学会后在此配入主修。',zone:1,room:'wudang-yard'};
  if(!p.rank) return {title:'绵掌二重，参加外门考核',text:'修炼绵掌到一百心得，留十贡献；在静室请教习考核。失败可养伤再来。',zone:1,room:'wudang-hall'};
  if(p.rank<2) return {title:'回山进修护道之学',text:'先送回药路口信，练绵掌与全真心法到三重、基础至少四百，留三十贡献和十五交情；再赴静室考校。',zone:1,room:'wudang-hall'};
  return {title:'把新修为用于江湖行走',text:'可请教纯阳入门篇、照看药路，或追寻其他人物后续。每条选择的后果会留在城市里。',zone:1,room:'wudang-hall'};
}
export function growthGoal(s) {
  const intent=s.p0.intent || DEFAULT_INTENT;
  if(s.battle || s.action) return {title:'先了结眼前行动',text:'交手与赴约的结果落定后，再安排下一步。'};
  const {events,stories}=cityLeads(s), fate=FATES[s.fate.node];
  const eventGoal=e=>{
    const choices=e.node.choices.filter(c=>!['decline','withdraw'].includes(c.id));
    const blockers=choices.map(c=>requirementReason(s,c.requires) || requirementReason(s,c.cost));
    return {title:`${e.progress?'兑现约定':'追寻线索'} · ${e.event.name}`,text:e.node.hearsay+(blockers.length && blockers.every(Boolean)?` 当前准备不足：${[...new Set(blockers)].join('；')}。`:''),eventId:e.id,zone:e.zone,room:e.node.room};
  };
  const commitments=events.filter(e=>e.progress).sort((a,b)=>(a.progress.startedAt || 0)-(b.progress.startedAt || 0)).map(e=>({...eventGoal(e),deadline:e.event.window?(e.progress.startedAt ?? s.worldTime)+e.event.window:Infinity}));
  if(fate?.window) commitments.push({title:`赴约 · ${fate.name}`,text:fate.hearsay,fate:true,zone:fate.zones?.includes(s.loc)?s.loc:fate.zones?.[0],deadline:s.fate.enteredAt+fate.window});
  commitments.sort((a,b)=>a.deadline-b.deadline);
  if(commitments.length) { const g=commitments[0];return {...g,text:`已接约定优先，保留你的成长方向。${Number.isFinite(g.deadline)?`余 ${Math.max(0,g.deadline-s.worldTime)} 息。`:''}${g.text}`}; }
  if(s.p0.activity) return {title:`继续${ACTIVITIES[s.p0.activity.id].name}`,text:'当前活动仍在进行，可在修炼页查看成长与收功。'};
  if(s.hp<60 || s.mp<30) return {title:'养伤蓄力',text:'可免费静养恢复全部气血内力，或花五两在客栈投宿。',activity:'rest'};
  if(intent.focus==='learning') {
    if(intent.school==='wudang') return wudangGoal(s);
    if(s.p0.potential<100) return {title:'为散人修炼积攒潜能',text:'行脚每十二秒得五潜能、八两。',activity:'errand'};
    return {title:'散人学艺 · 练出自己的路',text:'城南武馆可学太祖长拳、六合刀和罗汉伏魔功。先练基本功，再修招式与内功；二重开始形成战术用途。',zone:0,room:'gym'};
  }
  if(intent.focus==='living') {
    const local=Object.entries(ACTIVITIES).filter(([,a])=>a.silver && a.rooms?.includes(s.p0.room) && !requirementReason(s,a.requires)).sort((a,b)=>b[1].silver/b[1].seconds-a[1].silver/a[1].seconds)[0];
    return {title:'谋生积蓄，备好下一程',text:'码头帮工每十五秒十二两、四潜能；行脚每十二秒八两、五潜能。已打通的粮路与诊棚还有专门差事。',activity:local?.[0] || 'errand'};
  }
  const chapter=events.find(e=>e.id==='hanshui_supply');
  if(chapter) return eventGoal(chapter);
  if(fate?.choices?.length) return {title:`了结三帮后事 · ${fate.name}`,text:fate.hearsay,fate:true,zone:fate.zones?.includes(s.loc)?s.loc:fate.zones?.[0]};
  const next=events.find(e=>intent.focus==='chivalry'?['medicine','medicine_return'].includes(e.id):e.event.role==='preparation');
  if(next) return eventGoal(next);
  const story=stories[0];
  if(story) return {title:`${intent.focus==='inquiry'?'查案访人':'行侠问事'} · ${story.name}`,text:story.text,zone:story.zone};
  return {title:'江湖仍可行走',text:'已了结的约定不会重新催促。可换一种成长方向，或继续日常修炼。'};
}
export const internalName = id => INTERNALS[id]?.name || id;
