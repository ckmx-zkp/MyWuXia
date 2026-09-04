export function canResolveChoice(state, key, nodeIndex, choice) {
  return (state.treeDone[key] || 0) === nodeIndex
    && (!choice.cost?.silver || state.silver >= choice.cost.silver)
    && (!choice.cost?.item || state.items[choice.cost.item] > 0);
}
