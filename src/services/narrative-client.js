import { applyOverlay, extractTemplate, factHash, mergeOverlay } from '../game/narrative-overlay.js';

function timed(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function postJson(path, body, ms = 28000) {
  const wait = timed(ms);
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: wait.signal,
    });
    wait.done();
    if (!response.ok) return null;
    return await response.json();
  } catch {
    wait.done();
    return null;
  }
}

export function characterPayload(state) {
  return {
    name: state.name,
    loc: state.loc,
    worldTime: state.worldTime,
    facts: { ...(state.p0?.facts || {}),...Object.fromEntries(Object.entries(state.flag || {}).map(([key,value])=>[`world:${key}`,value])),...Object.fromEntries(Object.entries(state.npcStates || {}).map(([key,value])=>[`character:${key}`,value])) },
    npcs: { ...state.npcStates,...state.p0?.npcs },
    journal: (state.p0?.journal || []).slice(-12),
  };
}

const pending = new Map();

export async function requestNarrativeNode(state, eventId, nodeId, node, eventName) {
  if (!state.saveId || !node || node.terminal) return { source: 'template', overlay: null, node };
  const character=characterPayload(state);
  const hash = factHash(character);
  const key = `${state.saveId}:${eventId}:${nodeId}:${hash}`;
  if (pending.has(key)) return pending.get(key);
  const work = postJson('/api/narrative/node', {
    saveId: state.saveId,
    eventId,
    nodeId,
    eventName,
    hash,
    character,
    template: extractTemplate(node),
  }).then(data => {
    const overlay = mergeOverlay(extractTemplate(node),data?.overlay);
    return { source: data?.source || 'template', overlay, node: applyOverlay(node, overlay) };
  }).finally(() => pending.delete(key));
  pending.set(key, work);
  return work;
}

export function syncMemory(state) {
  if (!state.saveId || !state.p0) return;
  postJson('/api/memory', {
    saveId: state.saveId,
    character: characterPayload(state),
  }, 8000);
}
