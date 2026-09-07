export const INTERNALS = {
  basic: { name: '基础吐纳功', lv: 1, recovery: 0.02, armor: 0, family: 'any', text: '平和绵长，诸般招式皆可相容。' },
  luohan: { name: '罗汉伏魔功', lv: 1, recovery: 0.01, armor: 0.06, family: 'fist', text: '拳掌相合，劲力沉稳。' },
  quanzhen: { name: '全真心法', lv: 15, recovery: 0.05, armor: 0.02, family: 'blade', text: '绵绵不绝，与刀剑招式相合。' },
  chunyang: { name: '纯阳无极功', lv: 175, recovery: 0.08, armor: 0.08, family: 'fist', text: '纯阳护体，拳掌劲力相济。' },
  yijin: { name: '易筋经神髓', lv: 370, recovery: 0.1, armor: 0.1, family: 'any', text: '融会百家，气脉贯通。' },
};
export const mastery = exp => Math.min(10, 1 + Math.floor(Math.sqrt(Math.max(0, exp || 0) / 100)));
export const masteryTarget = exp => mastery(exp) >= 10 ? null : mastery(exp) ** 2 * 100;
export const availableInternals = state => Object.entries(INTERNALS).filter(([, x]) => Math.floor(state.expTotal / 100) + 1 >= x.lv);
export function internalId(state, id = state.loadout?.internal) {
  return availableInternals(state).some(([key]) => key === id) ? id : 'basic';
}
export function pairing(state, loadout = state.loadout || {}) {
  const id = internalId(state, loadout.internal), inner = INTERNALS[id];
  const style = loadout.style || '基本拳脚';
  const family = /剑|刀|棒|六脉/.test(style) ? 'blade' : 'fist';
  const compatible = inner.family === 'any' || inner.family === family;
  const styleLevel = mastery(state.training?.styles?.[style]);
  const innerLevel = mastery(state.training?.internals?.[id]);
  return { id, inner, compatible, styleLevel, innerLevel,
    damage: 1 + (styleLevel - 1) * 0.06 + (compatible ? (innerLevel - 1) * 0.03 + 0.05 : 0),
    recovery: inner.recovery + (innerLevel - 1) * 0.01,
    armor: inner.armor + (innerLevel - 1) * 0.005 };
}
export function earnTraining(state, amount, style = state.loadout?.style || '基本拳脚', inner = internalId(state)) {
  const t = state.training || { styles: {}, internals: {} };
  return { ...state, training: {
    styles: { ...t.styles, [style]: Math.min(8100, (t.styles[style] || 0) + amount) },
    internals: { ...t.internals, [inner]: Math.min(8100, (t.internals[inner] || 0) + amount) },
  } };
}
export function claimIdleRewards(state) {
  const silver = state.idleBank?.silver || 0;
  if (!silver) return state;
  return { ...state, silver: state.silver + silver, idleBank: { silver: 0 },
    log: [`领取修行盘缠：银两 +${silver}。武学与内功心得已在修行时入账。`, ...state.log].slice(0, 8) };
}
