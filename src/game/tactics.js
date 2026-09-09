import { pairing } from './training.js';
import { styleFamily } from './progression.js';

// Snapshot at fight start. Missing traits in historical battles mean zero effect.
export function combatTraits(state,loadout=state.loadout) {
  const p=pairing(state,loadout), trained=p.styleLevel>=2 && p.innerLevel>=2;
  return {
    protection:trained && styleFamily(loadout.style)==='fist' && ['luohan','chunyang','yijin'].includes(p.id)?0.12:0,
    penetration:trained && styleFamily(loadout.style)==='blade' && p.compatible?0.18:0,
    economy:p.innerLevel>=2 && ['basic','quanzhen'].includes(p.id)?0.15:0,
    evasion:state.p0?.basics.dodge>=400 && loadout.footwork==='light'?0.06:0,
  };
}
export function tacticalAdvice(state,loadout=state.loadout) {
  const t=combatTraits(state,loadout);
  return [t.protection?'护人：拳掌与护体内功均二重，受强招伤害减少12%。':'护人：拳掌配罗汉等护体内功，双方二重后减轻强招伤害。',
    t.penetration?'破甲：强招忽略18个百分点护甲，额外消耗5%内力上限。':'破甲：兵器与相合内功均二重后，强招穿甲但更耗内力。',
    t.economy?'续航：基础吐纳或全真二重，强招基础耗气减少15%。':'续航：基础吐纳或全真练至二重，减少强招耗气。',
    t.evasion?'撤离：游走多6个百分点闪避；轻功四百可在汉水探路绕行。':'撤离：基本轻功四百配游走增加闪避，并开放汉水绕行。'];
}
