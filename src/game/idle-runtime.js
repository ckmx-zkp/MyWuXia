// Each mounted game owns its pending rewards. Store earned points, not seconds,
// so changing the reward multiplier cannot reprice earlier ticks.
export function createIdleRuntime(levelUp, level) {
  let points = 0;
  let ticks = 0;
  const clear = () => { points = 0; ticks = 0; };
  const snapshot = state => ({ ...state, fx: null, expTotal: state.expTotal + points });
  const flush = state => {
    if (!points) return state;
    const next = { ...state, expTotal: state.expTotal + points };
    clear();
    return levelUp(next, state);
  };
  const advance = state => {
    if (!state.idle || state.action) return flush(state);
    points += 2 * (state.devMult || 1);
    ticks += 1;
    if (ticks < 5 && level(state.expTotal + points) === level(state.expTotal)) return state;
    return flush(state);
  };
  return { clear, snapshot, flush, advance };
}
