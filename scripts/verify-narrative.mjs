import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { SIDE_EVENTS } from '../src/content/p0.js';
import { initial } from '../src/game/state.js';
import { beginProgression } from '../src/game/progression.js';
import { characterPayload } from '../src/services/narrative-client.js';
import { extractTemplate, applyOverlay } from '../src/game/narrative-overlay.js';

// Integration probe uses a separate synthetic character, never an existing save.
const base=process.argv[2] || 'http://127.0.0.1:8083';
const health=await (await fetch(`${base}/api/health`,{signal:AbortSignal.timeout(10000)})).json();
assert.equal(health.ok,true);assert.equal(health.llm,true,'LLM is disabled');
console.log(JSON.stringify({health}));
const state=beginProgression(initial());state.saveId=randomUUID();state.name='汉水接口验收';state.loc=1;state.fate.node='truce_end';state.p0.intent={focus:'chivalry',school:'free'};
const event=SIDE_EVENTS.hanshui_supply,node=event.nodes.invitation,template=extractTemplate(node);
const body={saveId:state.saveId,eventId:'hanshui_supply',nodeId:'invitation',eventName:event.name,character:characterPayload(state),template};
for(const expected of ['generated','cache']) {
  const started=Date.now();
  const response=await fetch(`${base}/api/narrative/node`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(65000)});
  assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.source,expected);assert.ok(data.overlay?.scene);
  assert.deepEqual(Object.keys(data.overlay.choices).sort(),template.choices.map(c=>c.id).sort());
  const merged=applyOverlay(node,data.overlay);
  for(let i=0;i<node.choices.length;i++) {
    assert.equal(merged.choices[i].next,node.choices[i].next);
    assert.deepEqual(merged.choices[i].effects,node.choices[i].effects);
    assert.deepEqual(merged.choices[i].requires,node.choices[i].requires);
  }
  if(expected==='generated') assert.notEqual(data.overlay.scene,template.scene,'fresh generation must actually change prose');
  console.log(JSON.stringify({source:data.source,milliseconds:Date.now()-started,scene:data.overlay.scene,choiceIds:Object.keys(data.overlay.choices)}));
}
