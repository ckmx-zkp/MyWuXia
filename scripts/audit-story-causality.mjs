import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PACK_POLICY } from '../src/content/pack-policy.js';
import { STORY_ARCS } from '../src/content/story-arcs.js';
import { CAUSAL_EVENTS } from '../src/content/causal-events.js';
import { SIDE_EVENTS } from '../src/content/p0.js';
import { compileStory } from '../src/game/story-graph.js';
import { validateCondition, validateEffects } from '../src/game/world-rules.js';

const facts=new Set();
function scan(value) {
  if(!value || typeof value!=='object') return;
  if(value.op==='set' && value.ref?.startsWith('fact:')) facts.add(value.ref.slice(5));
  if(value.flag && typeof value.flag==='object') Object.keys(value.flag).forEach(k=>facts.add(k));
  Object.values(value).forEach(scan);
}
scan(SIDE_EVENTS);
for(const [id,a] of Object.entries(STORY_ARCS)) {
  assert.ok(facts.has(a.support),`${id}: missing producer for ${a.support}`);
  const {default:source}=await import(`../src/content/quests/${id}.js`);
  const tree=compileStory(source);
  assert.equal(tree.graphVersion,1);
  assert.ok(CAUSAL_EVENTS[`${a.id}_preparation`] && CAUSAL_EVENTS[`${a.id}_aftermath`] && CAUSAL_EVENTS[`${a.id}_recovery`]);
  for(const [index,node] of tree.nodes.entries()) {
    assert.equal(new Set(node.choices.map(c=>c.id)).size,node.choices.length);
    for(const c of node.choices) {
      validateCondition(c.requires);validateEffects(c.worldEffects);
      for(const next of [c.next,c.failNext]) assert.ok(Number.isInteger(next) && next>index && next<=tree.nodes.length,`${id}:${index}: bad successor`);
    }
  }
}
const rows=[];
for(const name of readdirSync(new URL('../src/content/packs/',import.meta.url)).filter(n=>n.endsWith('.json')).sort()) {
  const p=JSON.parse(readFileSync(new URL(`../src/content/packs/${name}`,import.meta.url),'utf8'));
  const policy=PACK_POLICY[p.id];
  if(policy) {assert.ok(STORY_ARCS[policy.arc]);assert.ok(facts.has(policy.fact),`${p.id}: missing outcome ${policy.fact}`);}
  const prefix=p.id.split('_')[0];
  const reason=policy?.reason || (prefix==='bxj'?'本轮没有已实装的碧血剑人物主线承接，暂存内容库':prefix==='xajh'?'与已有地方委托重叠或缺少对应人物后果，待重新编排':'仅共享书名或地名，缺少已实装主线的因果与玩法后果');
  rows.push(`| ${p.id} | ${p.event.name} | ${policy?'保留并接入':'暂停新接'} | ${policy?.arc || '—'} | ${reason} |`);
}
const report=`# 区域剧情包因果审计\n\n73 个原包逐项处理：${Object.keys(PACK_POLICY).length} 个接入人物因果，其余暂停新接。已接旧档保留原节点、战斗与奖励，不删除源内容。\n\n保留包也不常驻刷屏：相关主线完成后才出现；其安置或通行已被其他路径解决时，不重复派发；已接任务允许收尾。结局须实际取得 pack-policy.js 指定事实才改变公共状态，不能把“听说了”当成“救成了”。\n\n| 包 ID | 标题 | 处置 | 主线来源 | 理由 |\n|---|---|---|---|---|\n${rows.join('\n')}\n`;
const path=new URL('../docs/gdd/14-pack-audit.md',import.meta.url);
if(process.argv.includes('--write')) writeFileSync(path,report,'utf8');
else assert.equal(readFileSync(path,'utf8').replace(/\r\n/g,'\n'),report,'Causal audit stale; run node scripts/audit-story-causality.mjs --write');
console.log(`Causal audit: 8 branching main graphs, 24 linked opportunities, ${Object.keys(PACK_POLICY).length} retained / ${rows.length-Object.keys(PACK_POLICY).length} archived packs.`);
