import { ZONES } from '../content/world.js';
import { LINKS, STORY_LEADS } from '../content/city-leads.js';
import { ROOMS, SIDE_EVENTS } from '../content/p0.js';
import { eventReason, nodeZone } from './side-events.js';
import { directionReason } from './story-director.js';
export function routeBetween(from,to,links = LINKS) {
  const queue = [[from]], seen = new Set([from]);
  for (const path of queue) {
    const last = path.at(-1); if (last === to) return path;
    for (const next of links[last] || []) if (!seen.has(next)) { seen.add(next); queue.push([...path,next]); }
  }
  return [];
}
export function cityLeads(s) {
  const stories = ZONES.flatMap((zone,zoneId) => (zone.trees || []).map((tree,index) => ({
    id:tree.id, name:tree.name, where:tree.where, zone:zoneId, index, count:s.treeDone[`${zoneId}:${tree.id}`] || 0,
    total:tree.nodes.length, route:routeBetween(s.loc,zoneId), ...STORY_LEADS[tree.id],
  }))).filter(t => t.count < t.total).sort((a,b) => a.route.length - b.route.length || Number(b.count > 0) - Number(a.count > 0));
  const events = Object.entries(SIDE_EVENTS).filter(([id,e]) => !directionReason(s,id,e) && (s.p0.quests[id] ? !s.p0.quests[id].done : !eventReason(s,e))).map(([id,event]) => {
    const progress = s.p0.quests[id], node = event.nodes[progress?.node || event.start];
    return { id,event,progress,node,zone:nodeZone(node) };
  }).sort((a,b)=>Number(!!b.progress)-Number(!!a.progress) || (b.event.priority||0)-(a.event.priority||0) || a.id.localeCompare(b.id));
  return { stories, events, intro: ZONES[s.loc].quests.findIndex((_,i) => !s.done[s.loc]?.[i]), completed:(s.done[s.loc] || []).filter(Boolean).length };
}
export const roomRoute = (from,to) => routeBetween(from,to,Object.fromEntries(Object.entries(ROOMS).map(([id,r]) => [id,r.exits])));
