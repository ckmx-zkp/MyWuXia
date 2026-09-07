import { SIDE_EVENTS, ROOMS } from '../content/p0.js';

export function requirementReason(s, req = {}) {
  const p = s.p0;
  if (req.knowledge && p.knowledge < req.knowledge) return `需草木学识 ${req.knowledge}`;
  if (req.flag && !p.facts[req.flag]) return '尚缺引荐或经历';
  if (req.sect && p.sect !== 'wudang') return '需拜入武当';
  for (const key of ['silver', 'potential', 'contribution', 'herbs']) {
    const current = key === 'silver' ? s.silver : key === 'herbs' ? p.materials.herbs : p[key];
    if (req[key] && current < req[key]) return `尚缺${{ silver: '银两', potential: '潜能', contribution: '贡献', herbs: '青叶草' }[key]} ${req[key] - current}`;
  }
  return '';
}
export function applyWorldEffects(state, effect = {}) {
  const p = state.p0;
  return { ...state, silver: Math.max(0, state.silver + (effect.silver || 0)), expTotal: state.expTotal + (effect.exp || 0),
    p0: { ...p, potential: Math.max(0, p.potential + (effect.potential || 0)), contribution: Math.max(0, p.contribution + (effect.contribution || 0)),
      materials: { ...p.materials, herbs: Math.max(0, p.materials.herbs + (effect.herbs || 0)) },
      facts: { ...p.facts, ...effect.flag }, npcs: { ...p.npcs, ...effect.npc } } };
}
export function spend(state, cost = {}) {
  return applyWorldEffects(state, Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, -v])));
}
export function recordExperience(s, eventId, nodeId, choiceId, result, text) {
  const seq = s.p0.sequence + 1;
  return { ...s, log: [text, ...s.log].slice(0, 8), p0: { ...s.p0, sequence: seq,
    journal: [...s.p0.journal, { id: seq, eventId, nodeId, choiceId, result, text, at: s.worldTime }].slice(-200) } };
}
export function sideChoiceReason(s, eventId, choiceId) {
  const event = SIDE_EVENTS[eventId], progress = s.p0?.quests[eventId];
  const node = event?.nodes[progress?.node], choice = node?.choices.find(c => c.id === choiceId);
  if (!choice || progress.pending) return '此事已过或正在交手';
  if (s.action || s.battle) return '先了结当前行动';
  if (s.loc !== ROOMS[node.room]?.zone || s.p0.room !== node.room) return '尚未抵达会面地点';
  return requirementReason(s, choice.requires) || requirementReason(s, choice.cost);
}
export function settleSideEvent(s, context, success) {
  const { eventId, nodeId, choiceId } = context;
  const progress = s.p0?.quests[eventId], node = SIDE_EVENTS[eventId]?.nodes[nodeId];
  const choice = node?.choices.find(c => c.id === choiceId);
  if (!choice || progress?.node !== nodeId || (choice.combat && progress.pending !== choiceId)) return s;
  const nextId = success ? choice.next : choice.failNext;
  if (!nextId) return s;
  const next = applyWorldEffects(s, success ? choice.effects : {});
  const text = success ? choice.outcome : choice.failText;
  const done = !!SIDE_EVENTS[eventId].nodes[nextId].terminal;
  next.p0 = { ...next.p0, quests: { ...next.p0.quests, [eventId]: { node: nextId, pending: null, done } } };
  const recorded = recordExperience(next, eventId, nodeId, choiceId, success ? 'success' : s.battle?.status || 'failure', text);
  return recorded.battle ? { ...recorded, battle: { ...recorded.battle, result: `${recorded.battle.result}\n\n${text}` } } : recorded;
}
