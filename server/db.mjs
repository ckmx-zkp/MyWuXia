import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function openDatabase(path = process.env.JIANGHU_DB_PATH || join(ROOT, 'data', 'jianghu.sqlite')) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS saves (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memories (
      save_id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (save_id) REFERENCES saves(id)
    );
    CREATE TABLE IF NOT EXISTS generated_nodes (
      save_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      fact_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (save_id, event_id, node_id, fact_hash),
      FOREIGN KEY (save_id) REFERENCES saves(id)
    );
  `);
  return db;
}

export function bindDatabase(db) {
  const upsertSave = db.prepare('INSERT INTO saves(id,name,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at');
  const putMemory = db.prepare('INSERT INTO memories(save_id,version,summary,payload_json,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(save_id) DO UPDATE SET version=excluded.version, summary=excluded.summary, payload_json=excluded.payload_json, updated_at=excluded.updated_at');
  const getMemory = db.prepare('SELECT version, summary, payload_json, updated_at FROM memories WHERE save_id = ?');
  const getNode = db.prepare('SELECT payload_json, model, created_at FROM generated_nodes WHERE save_id = ? AND event_id = ? AND node_id = ? AND fact_hash = ?');
  const putNode = db.prepare('INSERT INTO generated_nodes(save_id,event_id,node_id,fact_hash,payload_json,model,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(save_id,event_id,node_id,fact_hash) DO UPDATE SET payload_json=excluded.payload_json, model=excluded.model, created_at=excluded.created_at');
  const now = () => Date.now();
  return {
    db,
    touchSave(id, name) {
      const at = now();
      upsertSave.run(id, String(name || '无名行人').slice(0, 40), at, at);
    },
    saveMemory(id, document) {
      putMemory.run(id, document.version, document.summary, JSON.stringify(document), now());
    },
    loadMemory(id) {
      const row = getMemory.get(id);
      return row ? { version: row.version, summary: row.summary, document: JSON.parse(row.payload_json), updatedAt: row.updated_at } : null;
    },
    loadGenerated(saveId, eventId, nodeId, hash) {
      const row = getNode.get(saveId, eventId, nodeId, hash);
      return row ? { overlay: JSON.parse(row.payload_json), model: row.model, createdAt: row.created_at } : null;
    },
    saveGenerated(saveId, eventId, nodeId, hash, overlay, model) {
      putNode.run(saveId, eventId, nodeId, hash, JSON.stringify(overlay), model, now());
    },
  };
}
