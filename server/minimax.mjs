const DEFAULT_BASE = (process.env.MINIMAX_API_BASE || 'https://api.minimaxi.com').replace(/\/$/, '');
const DEFAULT_MODEL = process.env.MINIMAX_CHAT_MODEL || 'MiniMax-M2.5';

export function parseModelJson(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const stripped = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json\s*|```/g, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(stripped.slice(start, end + 1)); } catch { return null; }
}

export function createMinimaxChat({ key, base = DEFAULT_BASE, model = DEFAULT_MODEL, fetchImpl = fetch, timeoutMs = 25000 } = {}) {
  return async function completeChat(messages) {
    if (!key) throw new Error('missing_key');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.65, max_tokens: 2200, reasoning_split: true, response_format: { type: 'json_object' } }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message || payload.base_resp?.status_msg || `minimax_${response.status}`);
      const message = payload.choices?.[0]?.message || {};
      const content = [message.content, message.reasoning_content].filter(Boolean).join('\n');
      const parsed = parseModelJson(content);
      if (!parsed) throw new Error('invalid_model_json');
      return { parsed, model: payload.model || model, raw: content };
    } finally {
      clearTimeout(timer);
    }
  };
}
