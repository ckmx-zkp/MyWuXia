import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

function load(path) {
  if (!existsSync(path)) return { saves: {}, memories: {}, generated: {} };
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return { saves: {}, memories: {}, generated: {} }; }
}

export function openJsonStore(path) {
  mkdirSync(dirname(path), { recursive: true });
  let data = load(path);
  const persist = () => writeFileSync(path, JSON.stringify(data));
  const now = () => Date.now();
  return {
    engine: 'json',
    touchSave(id, name) {
      const at = now();
      const prev = data.saves[id] || { created_at: at };
      data.saves[id] = { id, name: String(name || '无名行人').slice(0, 40), created_at: prev.created_at, updated_at: at };
      persist();
    },
    saveMemory(id, document) {
      data.memories[id] = { version: document.version, summary: document.summary, payload_json: JSON.stringify(document), updated_at: now() };
      persist();
    },
    loadMemory(id) {
      const row = data.memories[id];
      return row ? { version: row.version, summary: row.summary, document: JSON.parse(row.payload_json), updatedAt: row.updated_at } : null;
    },
    loadGenerated(saveId, eventId, nodeId, hash) {
      const row = data.generated[`${saveId}:${eventId}:${nodeId}:${hash}`];
      return row ? { overlay: JSON.parse(row.payload_json), model: row.model, createdAt: row.created_at } : null;
    },
    saveGenerated(saveId, eventId, nodeId, hash, overlay, model) {
      data.generated[`${saveId}:${eventId}:${nodeId}:${hash}`] = { payload_json: JSON.stringify(overlay), model, created_at: now() };
      persist();
    },
  };
}
