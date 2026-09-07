import { createServer } from 'node:http';
import { bindDatabase, openDatabase } from './db.mjs';
import { loadMinimaxKey } from './keys.mjs';
import { createMinimaxChat } from './minimax.mjs';
import { createNarrativeService } from './narrative.mjs';

const PORT = Number(process.env.JIANGHU_API_PORT || 8083);
const key = loadMinimaxKey();
const opened = openDatabase();
const store = bindDatabase(opened);
const engine = opened?.engine === 'json' ? 'json' : 'sqlite';
const completeChat = key && process.env.JIANGHU_LLM !== '0' ? createMinimaxChat({ key }) : null;
const narrative = createNarrativeService({ store, completeChat });
const hits = new Map();

function limited(saveId) {
  const now = Date.now();
  const window = hits.get(saveId)?.filter(at => now - at < 60_000) || [];
  if (window.length >= 40) return true;
  window.push(now);
  hits.set(saveId, window);
  return false;
}

function readBody(req, limit = 65536) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('payload_too_large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('invalid_json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(json);
}

function fail(res, error) {
  const status = error.status || (error.message === 'invalid_save' || error.message === 'invalid_event' || error.message === 'invalid_template' ? 400 : 500);
  send(res, status, { ok: false, error: error.message || 'error' });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return send(res, 200, { ok: true, llm: !!completeChat, store: engine, model: process.env.MINIMAX_CHAT_MODEL || 'MiniMax-M2.5' });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/memory/')) {
      const saveId = url.pathname.slice('/api/memory/'.length);
      const row = narrative.memory(saveId);
      return send(res, 200, { ok: true, memory: row });
    }
    if (req.method === 'POST' && url.pathname === '/api/memory') {
      const body = await readBody(req);
      if (limited(body.saveId || '')) return send(res, 429, { ok: false, error: 'rate_limited' });
      const document = narrative.remember(body.saveId, body.character || {});
      return send(res, 200, { ok: true, memory: document });
    }
    if (req.method === 'POST' && url.pathname === '/api/narrative/node') {
      const body = await readBody(req);
      if (limited(body.saveId || '')) return send(res, 429, { ok: false, error: 'rate_limited' });
      try {
        const result = await narrative.personalize(body);
        return send(res, 200, { ok: true, ...result });
      } catch (error) {
        console.error('narrative fallback', error.message);
        return send(res, 200, { ok: true, source: 'template', overlay: null, error: error.message });
      }
    }
    send(res, 404, { ok: false, error: 'not_found' });
  } catch (error) {
    fail(res, error);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`jianghu api http://127.0.0.1:${PORT} llm=${completeChat ? 'on' : 'off'} store=${engine}`);
});
