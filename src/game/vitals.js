import { ability } from './ability.js';
import { pairing } from './training.js';

const level = state => Math.floor(state.expTotal / 100) + 1;
const percent = value => Math.max(0, Math.min(100, value ?? 100));

export function vitalStats(state) {
  const currentLevel = level(state);
  const pair = pairing(state);
  const maxHp = 100 + currentLevel * 3;
  const maxMp = Math.round((80 + currentLevel * 18 + ability({ ...state, hp: 100 }) * 3) * (1 + (pair.innerLevel - 1) * 0.05));
  return {
    maxHp,
    hp: Math.round(maxHp * percent(state.hp) / 100),
    hpPercent: percent(state.hp),
    maxMp,
    mp: Math.round(maxMp * percent(state.mp) / 100),
    mpPercent: percent(state.mp),
  };
}

export const needsInnRest = state => percent(state.hp) < 100 || percent(state.mp) < 100;

export function restAtInn(state, cost = 5) {
  if (state.silver < cost || !needsInnRest(state)) return state;
  return { ...state, silver: state.silver - cost, hp: 100, mp: 100 };
}
