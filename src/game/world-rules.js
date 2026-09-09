// Versioned content reads use explicit namespaces; old saves remain the authority.
const resources = { silver: ['silver'], exp: ['expTotal'], rep: ['rep'], hp: ['hp'], mp: ['mp'], potential: ['p0', 'potential'], contribution: ['p0', 'contribution'], herbs: ['p0', 'materials', 'herbs'], knowledge: ['p0', 'knowledge'] };
const safe = key => typeof key === 'string' && key.length > 0 && !['__proto__', 'prototype', 'constructor'].includes(key);
function pathFor(ref) {
  if (typeof ref !== 'string') throw new Error('条件缺少查询字段');
  const [kind, ...parts] = ref.split(':'); const key = parts.join(':');
  if (kind === 'resource' && resources[key]) return resources[key];
  if (kind === 'quest' && /^\d+:[0-3]$/.test(key)) return ['done',parts[0],parts[1]];
  const maps = { fact: ['p0', 'facts'], world: ['flag'], npc: ['p0', 'npcs'], character: ['npcStates'], relation: ['favor'], faction: ['factionRelations'], style: ['training', 'styles'], internal: ['training', 'internals'], basic: ['p0', 'basics'], item: ['items'], tree: ['treeDone'] };
  if (maps[kind] && safe(key)) return [...maps[kind], key];
  const fields = { fate:['fate','node'], sect: ['p0', 'sect'], rank: ['p0', 'rank'], zone: ['loc'], room: ['p0', 'room'] };
  if (fields[ref]) return fields[ref];
  throw new Error(`未知世界查询：${ref}`);
}
export function readWorld(s, ref) { return pathFor(ref).reduce((v, k) => v?.[k], s); }
const comparisons = { eq: (a,b) => a === b, ne: (a,b) => a !== b, gte: (a,b) => (a ?? 0) >= b, gt: (a,b) => (a ?? 0) > b, lte: (a,b) => (a ?? 0) <= b, lt: (a,b) => (a ?? 0) < b };
export function validateCondition(c) {
  if (c == null) return;
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new Error('条件必须是对象');
  const group = ['all', 'any', 'not'].filter(k => Object.hasOwn(c, k));
  if (group.length) {
    if (group.length !== 1 || Object.keys(c).some(k => ![group[0], 'reason'].includes(k))) throw new Error('组合条件字段错误');
    const k = group[0];
    if (k === 'not') { if (!c.not) throw new Error('not 条件为空'); validateCondition(c.not); }
    else { if (!Array.isArray(c[k]) || !c[k].length) throw new Error('组合条件不能为空'); c[k].forEach(validateCondition); }
  } else {
    pathFor(c.ref);
    if (!Object.hasOwn(comparisons, c.op) || !Object.hasOwn(c, 'value') || Object.keys(c).some(k => !['ref','op','value','reason'].includes(k))) throw new Error('未知条件操作');
    if (!['eq','ne'].includes(c.op) && !Number.isFinite(c.value)) throw new Error('数值比较条件无效');
    if (!['string','number','boolean'].includes(typeof c.value) && c.value !== null) throw new Error('条件值无效');
  }
}
function matches(s, c) {
  if (!c) return true;
  if (c.all) return c.all.every(x => matches(s,x));
  if (c.any) return c.any.some(x => matches(s,x));
  if (c.not) return !matches(s,c.not);
  return comparisons[c.op](readWorld(s,c.ref), c.value);
}
export function conditionReason(s,c) {
  validateCondition(c);
  if (matches(s,c)) return '';
  if (c.reason) return c.reason;
  if (c.all) return c.all.map(x => conditionReason(s,x)).find(Boolean);
  return c.ref ? `尚需满足：${c.ref} ${c.op} ${c.value}` : '尚缺所需经历或身份';
}
export const testCondition = (s,c) => !conditionReason(s,c);
export function chooseDialogue(s, definition) {
  return [...(definition.variants || [])].sort((a,b) => (b.priority || 0) - (a.priority || 0)).find(v => testCondition(s,v.when))?.dialogues || definition.dialogues || definition.npcs || [];
}
export function legacyRequirements(req = {}) {
  const list = [];
  for (const [k,v] of Object.entries(req)) {
    if (v === undefined) continue;
    if (k === 'flag') list.push({ ref: `fact:${v}`, op: 'eq', value: true, reason: '尚缺引荐或经历' });
    else if (k === 'sect') list.push({ ref: 'sect', op: 'eq', value: v === true ? 'wudang' : v, reason: '需拜入相应门派' });
    else if (k === 'rank') list.push({ref:'rank',op:'gte',value:v,reason:'需先通过护道考校'});
    else if (resources[k]) list.push({ ref: `resource:${k}`, op: 'gte', value: v, reason: `需${({silver:'银两',potential:'潜能',contribution:'贡献',herbs:'青叶草',knowledge:'草木学识'})[k] || k} ${v}` });
    else throw new Error(`未知条件：${k}`);
  }
  return list.length ? { all: list } : null;
}
export const lessonRequirements = lesson => Object.fromEntries(['silver','potential','contribution','sect','flag','rank'].filter(k => lesson[k] !== undefined).map(k => [k,lesson[k]]));
export function normalizeEffects(effect = {}) {
  if (Array.isArray(effect)) return effect;
  return Object.entries(effect).flatMap(([k,v]) => {
    if (v === undefined) return [];
    if (resources[k]) return [{ op: 'add', ref: `resource:${k}`, value: v }];
    const maps = { flag: 'fact', npc: 'npc' };
    if (maps[k]) return Object.entries(v).map(([id,value]) => ({ op:'set', ref:`${maps[k]}:${id}`, value }));
    throw new Error(`未知效果：${k}`);
  });
}
export function validateEffects(effect) {
  for (const e of normalizeEffects(effect)) {
    if (Object.keys(e).some(k => !['op','ref','value'].includes(k))) throw new Error('未知效果字段');
    if (e.op === 'teaching') {
      if (!safe(e.ref) || !Number.isInteger(e.value) || e.value < 1 || e.value > 8100) throw new Error('教学效果无效');
      continue;
    }
    if (e.op === 'completeQuest') {
      if (!/^\d+:[0-3]$/.test(e.ref) || +e.ref.split(':')[0] > 12 || e.value !== true) throw new Error('任务效果无效');
      continue;
    }
    pathFor(e.ref);
    const settable = /^(fact:|world:|npc:|character:)/.test(e.ref) || ['rank','sect'].includes(e.ref);
    const addable = /^(resource:|relation:|faction:)/.test(e.ref);
    if ((e.op === 'set' && !settable) || (e.op === 'add' && (!addable || !Number.isFinite(e.value))) || !['set','add'].includes(e.op)) throw new Error('未知或不允许的效果操作');
    if (e.op === 'set' && !(typeof e.value === 'boolean' || typeof e.value === 'string' || Number.isFinite(e.value))) throw new Error('效果值无效');
    if (e.ref.startsWith('fact:') && typeof e.value !== 'boolean') throw new Error('事实必须为布尔值');
    if (e.ref === 'rank' && ![0,1,2].includes(e.value)) throw new Error('门派阶段无效');
    if (e.ref === 'sect' && e.value !== 'wudang') throw new Error('门派无效');
  }
}
function setPath(s, path, value) {
  const [key,...rest] = path;
  return { ...s, [key]: rest.length ? setPath(s?.[key] || {},rest,value) : value };
}
export function applyEffects(state, effect = {}) {
  validateEffects(effect);
  let s = { ...state };
  for (const e of normalizeEffects(effect)) {
    if (e.op === 'teaching') {
      if (!s.p0.styles[e.ref]) throw new Error('无法提升尚未学习的武学');
      s = setPath(s,['p0','styles',e.ref,'cap'], Math.max(s.p0.styles[e.ref].cap,e.value)); continue;
    }
    if (e.op === 'completeQuest') {
      const [zone,index] = e.ref.split(':'); const done = [...(s.done[zone] || [false,false,false,false])]; done[+index] = true;
      s = setPath(s,['done',zone],done); continue;
    }
    let value = e.op === 'add' ? (readWorld(s,e.ref) || 0) + e.value : e.value;
    if (e.op === 'add') {
      if (!Number.isFinite(value)) throw new Error('结算数值无效');
      if (e.ref !== 'resource:rep' && e.ref.startsWith('resource:') && value < 0) throw new Error('资源不足，结算未执行');
      if (['resource:hp','resource:mp','resource:knowledge'].includes(e.ref)) value = Math.min(100,value);
      if (e.ref.startsWith('faction:')) value = Math.max(-100,Math.min(100,value));
    }
    s = setPath(s,pathFor(e.ref),value);
  }
  return s;
}
export function transact(s, { requires, cost = {}, effects = {} }) {
  validateEffects(effects);
  const condition = requires?.ref || requires?.all || requires?.any || requires?.not ? requires : legacyRequirements(requires);
  const reason = conditionReason(s,condition) || conditionReason(s,legacyRequirements(cost));
  if (reason) return { state:s, reason };
  for (const [key,value] of Object.entries(cost)) if (!resources[key] || !Number.isInteger(value) || value < 0) throw new Error('成本无效');
  const debits = Object.entries(cost).map(([k,v]) => ({ op:'add',ref:`resource:${k}`,value:-v }));
  return { state:applyEffects(s,[...debits,...normalizeEffects(effects)]), reason:'' };
}
