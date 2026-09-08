export const MEMORY_VERSION = 1;

export function buildMemoryDocument({ saveId, name, loc, worldTime = 0, facts = {}, npcs = {}, journal = [] } = {}) {
  const factList = Object.entries(facts).filter(([, value]) => value).map(([key]) => key).sort();
  const recent = journal.slice(-12).map(entry => ({
    eventId: entry.eventId,
    nodeId: entry.nodeId,
    choiceId: entry.choiceId,
    result: entry.result,
    text: String(entry.text || '').slice(0, 200),
    at: entry.at,
  }));
  const npcLine = Object.entries(npcs).filter(([, value]) => value).map(([id, value]) => `${id}：${String(value).slice(0, 80)}`).join('；');
  const summary = [
    `名号${name || '无名行人'}，独立江湖行人，并非原著主角替身。`,
    factList.length ? `已知事实：${factList.map(key=>facts[key]===true?key:`${key}=${JSON.stringify(facts[key])}`).join('、')}。` : '尚无长久事实。',
    npcLine ? `人物印象：${npcLine}。` : '',
    recent.length ? `近事：${recent.map(entry => entry.text).join(' / ')}` : '尚未留下经历。',
  ].filter(Boolean).join('');
  return { saveId, version: MEMORY_VERSION, name, loc, worldTime, facts: factList, npcs, recent, summary };
}
