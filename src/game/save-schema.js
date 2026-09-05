import { ZONES } from '../content/world.js';
import { QUEST_COMBATS } from '../content/combat.js';
export const saveOptions = {
  validateContext: c => c.kind === 'travel' ? Number.isInteger(c.to) && !!ZONES[c.to] : c.kind === 'quest' ? Number.isInteger(c.zone) && Number.isInteger(c.idx) && !!QUEST_COMBATS[ZONES[c.zone]?.quests[c.idx]?.name] : Number.isInteger(c.zone) && Number.isInteger(c.ti) && Number.isInteger(c.ni) && Number.isInteger(c.ci)
    && !!(ZONES[c.zone]?.trees?.[c.ti]?.nodes?.[c.ni]?.choices?.[c.ci]?.combat || ZONES[c.zone]?.trees?.[c.ti]?.nodes?.[c.ni]?.choices?.[c.ci]?.failCombat),
  validateTree: (key, count) => {
    const [zone, id] = key.split(':');
    const tree = ZONES[+zone]?.trees?.find(t => t.id === id);
    return !!tree && count <= tree.nodes.length;
  },
};
