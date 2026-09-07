import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ZONES } from '../src/content/world.js';
import { loadZoneQuests } from '../src/content/quest-loader.js';
import { OPPONENTS } from '../src/content/combat.js';
import { FATES } from '../src/content/fates.js';
import { routinesForZone } from '../src/content/routines.js';
import { validateP0 } from '../src/content/validate-p0.js';
import { PACK_EVENTS } from '../src/content/side-packs.js';
await Promise.all(ZONES.map((_, i) => loadZoneQuests(i)));
const ids = new Set();
for (const z of ZONES) for (const tree of z.trees || []) {
  assert.ok(!ids.has(tree.id), `Duplicate ${tree.id}`); ids.add(tree.id);
  assert.ok(tree.reward && tree.nodes.length, tree.id);
  for (const [i, n] of tree.nodes.entries()) {
    assert.ok(n.scene && n.dialogues.length && n.choices.length, `${tree.id}:${i}`);
    for (const c of n.choices) {
      assert.ok(c.text && c.ok?.text, `${tree.id}:${i} outcome`);
      for (const id of [c.combat, c.failCombat].filter(Boolean)) assert.ok(OPPONENTS[id], id);
    }
  }
}
const inspect = value => {
  if (typeof value === 'string' && value.startsWith('/audio/')) assert.ok(existsSync(new URL(`../public${value}`, import.meta.url)), value);
  else if (value && typeof value === 'object') Object.values(value).forEach(inspect);
};
inspect(ZONES);
for (const [id, node] of Object.entries(FATES)) {
  if (node.window) assert.ok(node.window > 0 && FATES[node.timeout], `${id} timeout`);
  for (const c of node.choices) assert.ok(FATES[c.next] && c.outcome && c.effect, `${id}:${c.id}`);
  if (node.choices.length) assert.ok(node.scene && node.dialogues.length && node.hearsay, id);
  for (const zone of node.zones || []) assert.ok(ZONES[zone], id);
}
for (const [zoneIndex, zone] of ZONES.entries()) {
  const routines = routinesForZone(zone);
  assert.equal(new Set(routines.map(r => r.id)).size, 3, `zone ${zoneIndex} routine ids`);
  for (const routine of routines) {
    assert.ok(routine.name && routine.text && routine.dialogue.length === 2 && routine.time > 0 && routine.training > 0, `zone ${zoneIndex}:${routine.id}`);
    if (routine.opponent) assert.ok(OPPONENTS[routine.opponent], `zone ${zoneIndex}:${routine.id} opponent`);
  }
}
assert.ok(Object.keys(PACK_EVENTS).length >= 13, 'region packs');
console.log(`Validated ${ids.size} quest trees, audio references, ${Object.keys(FATES).length} fate nodes, ${Object.keys(PACK_EVENTS).length} region packs and ${ZONES.length * 3} repeatable routines; ${validateP0()}.`);
