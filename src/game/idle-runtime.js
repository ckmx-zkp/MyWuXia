// Each mounted game owns its pending rewards. Store earned points, not seconds,
// so changing the reward multiplier cannot reprice earlier ticks.
import { earnTraining, internalId } from './training.js';
export function createIdleRuntime(levelUp, level) {
  let points = 0;
  let ticks = 0;
  let earned = [];
  const clear = () => { points = 0; ticks = 0; earned = []; };
  const snapshot = state => {
    let next = { ...state, fx: null, expTotal: state.expTotal + points };
    for (const gain of earned) next = earnTraining(next, gain.amount, gain.style, gain.inner);
    return { ...next, idleBank: { silver: Math.min(1e9, (state.idleBank?.silver || 0) + points / 2) } };
  };
  const flush = state => {
    if (!points) return state;
    const next = snapshot(state);
    clear();
    return levelUp(next, state);
  };
  const advance = state => {
    if (!state.idle || state.action) return flush(state);
    points += 2 * (state.devMult || 1);
    earned.push({ amount: state.devMult || 1, style: state.loadout?.style || '基本拳脚', inner: internalId(state) });
    ticks += 1;
    if (ticks < 5 && level(state.expTotal + points) === level(state.expTotal)) return state;
    return flush(state);
  };
  return { clear, snapshot, flush, advance };
}
