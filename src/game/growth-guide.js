import { mastery, masteryTarget, pairing, INTERNALS } from './training.js';
import { trainingCap, styleFamily } from './progression.js';
import { startCombat } from './combat.js';

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
export function growthGoal(s) {
  const p=s.p0;
  if(s.hp<60 || s.mp<30) return {title:'先养伤，再应约',text:'客栈五两恢复全部气血与内力；盘缠不足时可免费静养。',activity:'rest'};
  if(p.potential<100) return {title:'为下一重积攒潜能',text:'行脚每十二秒得五潜能、八两；入门后武当洒扫每二十秒得六潜能、二贡献。',activity:'errand'};
  if(!p.facts.medicine_complete) return {title:'护送江南救命药',text:'回春堂接药，药车需人保护。可练功交手，也可在书肆辨药、采两份草药分药劝阻。',zone:0,room:'pharmacy'};
  if(!p.facts.medicine_wudang) return {title:'把药路回信送到武当',text:'从回春堂接回信，赴荆襄山门。送达可作为入门引荐。',zone:p.quests.medicine_return?.node==='visit'?1:0,room:p.quests.medicine_return?.node==='visit'?'wudang-gate':'pharmacy'};
  if(!p.sect) return {title:'在山门核实引荐',text:'护药回信可引荐入门；没有回信也能请师兄试招，失手可重试。',zone:1,room:'wudang-gate'};
  if(!p.styles['武当绵掌'] || !p.internals.quanzhen) return {title:'学会掌法与内功相配',text:'在练功院洒扫，每门初传需二十潜能、十贡献；学会后在此配入主修。',zone:1,room:'wudang-yard'};
  if(!p.rank) return {title:'绵掌二重，参加外门考核',text:'修炼绵掌到一百心得，留十贡献；在静室请教习考核。失败可养伤再来。',zone:1,room:'wudang-hall'};
  if(!s.flag['0:WX-01:complete']) return {title:'选择你在杏子林的立场',text:'查证须活证人与太湖渡簿；调停须药路人情与入室身份；护人须绵掌二重并真正撑过交手。三条路各有取舍。',zone:0};
  if(!['alliance_end','truce_end','conflict_end'].includes(s.fate.node)) return {title:'兑现三帮会面的后事',text:'证据可支持结盟，师门担保只求停争，护人不等于查明粮案。命运页显示会面地点与余期。',fate:true};
  if(p.rank<2) return {title:'回山进修护道之学',text:'先送回药路口信，练绵掌与全真心法到三重、基础至少四百，留三十贡献和十五交情；再赴静室考校。',zone:1,room:'wudang-hall'};
  return {title:'把新修为用于江湖行走',text:'可请教纯阳入门篇、照看药路，或追寻其他人物后续。每条选择的后果会留在城市里。',zone:1,room:'wudang-hall'};
}
export const internalName = id => INTERNALS[id]?.name || id;
