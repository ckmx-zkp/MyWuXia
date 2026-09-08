import { SIDE_EVENTS, ROOMS } from '../content/p0.js';
import { directionReason, CURATED_PACKS } from './story-director.js';
import { STORY_ARCS } from '../content/story-arcs.js';
import { PACK_POLICY } from '../content/pack-policy.js';

import { conditionReason, legacyRequirements, applyEffects, transact } from './world-rules.js';
export function requirementReason(s, req = {}) {
  return conditionReason(s, req.ref || req.all || req.any || req.not ? req : legacyRequirements(req));
}
export const applyWorldEffects = applyEffects;
export function spend(s, cost = {}) { return transact(s, { cost }).state; }
export const nodeZone = node => node.room ? ROOMS[node.room]?.zone : node.zone;
export const atEventNode = (s, node) => s.loc === nodeZone(node) && (!node.room || s.p0.room === node.room);
export function eventReason(s, event) { return requirementReason(s, event.requires); }
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
  const direction = directionReason(s,eventId,event);
  if(direction) return direction;
  if (!atEventNode(s, node)) return '尚未抵达会面地点';
  return requirementReason(s, choice.visibleWhen) || requirementReason(s, choice.requires) || requirementReason(s, choice.cost);
}
export function settleSideEvent(s, context, success) {
  const { eventId, nodeId, choiceId } = context;
  const progress = s.p0?.quests[eventId], node = SIDE_EVENTS[eventId]?.nodes[nodeId];
  const choice = node?.choices.find(c => c.id === choiceId);
  if (!choice || progress?.node !== nodeId || (choice.combat && progress.pending !== choiceId)) return s;
  const nextId = success ? choice.next : s.battle?.status === 'escaped' ? choice.retreatNext || choice.failNext : choice.failNext;
  if (!nextId) return s;
  const receipt = `${nodeId}:${choiceId}:${success ? 'success' : 'failure'}`;
  const next = applyWorldEffects(s, progress.receipts?.includes(receipt) ? {} : success ? choice.effects : choice.failEffects || {});
  const text = success ? choice.outcome : choice.failText;
  const done = !!SIDE_EVENTS[eventId].nodes[nextId].terminal;
  next.p0 = { ...next.p0, quests: { ...next.p0.quests, [eventId]: { ...progress, receipts: [...new Set([...(progress.receipts || []),receipt])], version: SIDE_EVENTS[eventId].version || 1, node: nextId, pending: null, done, choices: { ...progress.choices, [nodeId]: { choiceId, result: success ? 'success' : s.battle?.status || 'failure' } } } } };
  if(done && nextId==='expired' && SIDE_EVENTS[eventId].arcId) next.p0={...next.p0,facts:{...next.p0.facts,[`${STORY_ARCS[SIDE_EVENTS[eventId].arcId].id}_expired`]:true}};
  if(done && CURATED_PACKS[eventId]) {
    const policy=PACK_POLICY[eventId];
    if(next.p0.facts[policy.fact]) next.p0={...next.p0,facts:{...next.p0.facts,[policy.world]:true}};
  }
  const recorded = recordExperience(next, eventId, nodeId, choiceId, success ? 'success' : s.battle?.status || 'failure', text);
  return recorded.battle ? { ...recorded, battle: { ...recorded.battle, result: `${recorded.battle.result}\n\n${text}` } } : recorded;
}
