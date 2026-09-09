const DEFAULT_BASE = (process.env.MINIMAX_API_BASE || 'https://api.minimax.cn').replace(/\/$/, '');
const DEFAULT_MODEL = process.env.MINIMAX_CHAT_MODEL || 'MiniMax-M2.5-highspeed';

function asText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(asText).join('\n');
  if (typeof value === 'object') return asText(value.text || value.content || '');
  return String(value);
}

export function parseModelJson(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const stripped = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json\s*|```/g, '').trim();
  const start = stripped.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, escape = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(stripped.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

export function createMinimaxChat({ key, base = DEFAULT_BASE, model = DEFAULT_MODEL, fetchImpl = fetch, timeoutMs = 60000 } = {}) {
  return async function completeChat(messages) {
    if (!key) throw new Error('missing_key');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.8,
          max_completion_tokens: 8192,
          reasoning_split: true,
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || payload.base_resp?.status_msg || `minimax_${response.status}`);
      const message = payload.choices?.[0]?.message || {};
      const content = asText(message.content);
      const parsed = payload.choices?.[0]?.finish_reason === 'length' ? null : parseModelJson(content);
      if (!parsed) {
        throw new Error(`invalid_model_json:finish=${payload.choices?.[0]?.finish_reason || 'unknown'},content_chars=${content.length}`);
      }
      return { parsed, model: payload.model || model, raw: content };
    } finally {
      clearTimeout(timer);
    }
  };
}
