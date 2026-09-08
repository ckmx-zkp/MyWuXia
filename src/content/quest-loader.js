import { ZONES } from './world.js';
import { compileStory } from '../game/story-graph.js';
const loaders = {
  'YZ-01': () => import('./quests/YZ-01.js'), 'FZ-01': () => import('./quests/FZ-01.js'),
  'JX-01': () => import('./quests/JX-01.js'), 'SZ-01': () => import('./quests/SZ-01.js'),
  'HZ-01': () => import('./quests/HZ-01.js'), 'WX-01': () => import('./quests/WX-01.js'),
  'DL-01': () => import('./quests/DL-01.js'), 'DL-02': () => import('./quests/DL-02.js'),
};
const pending = new Map();
export function loadZoneQuests(zone) {
  if (!ZONES[zone]) return Promise.reject(new Error('区域不存在。'));
  if (!pending.has(zone)) pending.set(zone, Promise.all((ZONES[zone].trees || []).map(t => loaders[t.id]()))
    .then(trees => { ZONES[zone].trees = trees.map(t => compileStory(t.default)); })
    .catch(error => { pending.delete(zone); throw error; }));
  return pending.get(zone);
}
export async function prepareCharacter(state) {
  await Promise.all([...new Set([state.loc, state.action?.to, state.battle?.context?.zone])]
    .filter(Number.isInteger).map(loadZoneQuests));
  return state;
}
