const clip = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export function extractTemplate(node = {}) {
  return {
    scene: node.scene || '',
    dialogues: (node.dialogues || []).map(([who, text]) => [who, text]),
    hearsay: typeof node.hearsay === 'string' ? node.hearsay : '',
    choices: (node.choices || []).map(choice => ({
      id: choice.id,
      text: choice.text || '',
      outcome: choice.outcome || '',
      failText: choice.failText || '',
    })),
  };
}

export function mergeOverlay(template, overlay) {
  if (!template || !overlay || typeof overlay !== 'object' || Array.isArray(overlay)) return null;
  const scene = clip(overlay.scene, 800) || template.scene;
  const hearsay = clip(overlay.hearsay, 400) || template.hearsay;
  if (!scene || !hearsay) return null;
  const incoming = Array.isArray(overlay.dialogues) ? overlay.dialogues : [];
  const dialogues = template.dialogues.map((fallback, i) => {
    const row = incoming[i];
    if (!Array.isArray(row) || row.length < 2) return fallback;
    const who = clip(row[0], 24) || fallback[0] || '路人';
    const text = clip(row[1], 400);
    return text ? [who, text] : fallback;
  });
  const source = Array.isArray(overlay.choices)
    ? Object.fromEntries(overlay.choices.filter(c => c && c.id).map(c => [c.id, c]))
    : overlay.choices && typeof overlay.choices === 'object' ? overlay.choices : {};
  const choices = {};
  for (const choice of template.choices) {
    const rewritten = source[choice.id];
    const text = rewritten && typeof rewritten === 'object' ? clip(rewritten.text, 80) : '';
    choices[choice.id] = {
      text: text || choice.text,
      outcome: (rewritten && clip(rewritten.outcome, 400)) || choice.outcome,
      failText: (rewritten && clip(rewritten.failText, 400)) || choice.failText,
    };
  }
  return { scene, dialogues, hearsay, choices };
}

export function applyOverlay(node, overlay) {
  if (!node || !overlay) return node;
  return {
    ...node,
    scene: overlay.scene || node.scene,
    dialogues: overlay.dialogues || node.dialogues,
    hearsay: overlay.hearsay || node.hearsay,
    choices: (node.choices || []).map(choice => {
      const rewritten = overlay.choices?.[choice.id];
      return rewritten ? { ...choice, text: rewritten.text, outcome: rewritten.outcome || choice.outcome, failText: rewritten.failText || choice.failText } : choice;
    }),
  };
}

export function factHash({ name = '', loc = 0, facts = {}, journal = [] } = {}) {
  const known = Object.keys(facts).filter(key => facts[key]).sort().join(',');
  const recent = journal.slice(-8).map(entry => `${entry.eventId}:${entry.nodeId}:${entry.choiceId}:${entry.result}`).join('|');
  return fnv1a(`${name}|${loc}|${known}|${recent}`);
}

function fnv1a(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
