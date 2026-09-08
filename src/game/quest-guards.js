import { storyChoiceReason } from './story-graph.js';
export function canResolveChoice(state, key, nodeIndex, choice) {
  return (state.treeDone[key] || 0) === nodeIndex
    && !storyChoiceReason(state, choice)
    && (!choice.cost?.silver || state.silver >= choice.cost.silver)
    && (!choice.cost?.item || state.items[choice.cost.item] > 0);
}
