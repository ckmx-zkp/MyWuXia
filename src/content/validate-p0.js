import { validateCondition, validateEffects, legacyRequirements, lessonRequirements } from '../game/world-rules.js';
import assert from 'node:assert/strict';
import { ACTIVITIES, BASICS, LESSONS, ROOMS, SIDE_EVENTS, WEAPONS } from './p0.js';
import { STYLES, OPPONENTS } from './combat.js';
import { INTERNALS } from '../game/training.js';

export function validateP0(events = SIDE_EVENTS) {
  const condition = c => validateCondition(c && (c.ref || c.all || c.any || c.not) ? c : legacyRequirements(c));
  const variants = d => { for (const v of d.variants || []) { condition(v.when); assert.ok(v.dialogues?.length, 'variant dialogue'); } };
  for (const [id, r] of Object.entries(ROOMS)) {
    variants(r);
    assert.ok(r.name && r.scene && r.npcs.length, `${id}: room text`);
    for (const exit of r.exits) assert.ok(ROOMS[exit]?.exits.includes(id) && ROOMS[exit].zone === r.zone, `${id}:${exit} exit`);
  }
  for (const [id, lesson] of Object.entries(LESSONS)) {
    condition(lessonRequirements(lesson));
    assert.ok(ROOMS[lesson.room] && BASICS[lesson.basic], `${id}: teacher`);
    assert.ok((lesson.kind === 'style' ? STYLES : INTERNALS)[lesson.target], `${id}: skill`);
    assert.ok(lesson.cap > 0 && lesson.cap <= 8100 && lesson.silver >= 0 && lesson.potential > 0, `${id}: cost/cap`);
  }
  for (const [id, a] of Object.entries(ACTIVITIES)) {
    assert.ok(a.seconds > 0 && a.text && a.name, `${id}: activity`);
    for (const room of a.rooms || []) assert.ok(ROOMS[room], `${id}: room`);
  }
  for (const [id, w] of Object.entries(WEAPONS)) assert.ok(w.name && w.price >= 0 && w.attack >= 0 && ['fist', 'blade'].includes(w.type), id);
  for (const [id, event] of Object.entries(events)) {
    condition(event.requires);
    condition(event.expiresWhen);
    if(event.window) assert.ok(Number.isInteger(event.window) && event.window>0 && event.nodes[event.timeout]?.terminal,`${id}: invalid opportunity window`);
    assert.ok(event.nodes[event.start], `${id}: entry`);
    const seen = new Set(), visit = nodeId => {
      if (seen.has(nodeId)) return;
      const n = event.nodes[nodeId]; assert.ok(n, `${id}:${nodeId} missing successor`); seen.add(nodeId);
      assert.ok(n.scene && n.hearsay && Array.isArray(n.dialogues) && Array.isArray(n.choices), `${id}:${nodeId} five modules`);
      variants(n);
      if (n.terminal) { assert.equal(n.choices.length, 0); return; }
      assert.ok((ROOMS[n.room] || Number.isInteger(n.zone) && n.zone >= 0 && n.zone < 13) && n.dialogues.length && n.choices.length, `${id}:${nodeId} scene`);
      assert.equal(new Set(n.choices.map(c => c.id)).size, n.choices.length, `${id}:${nodeId} duplicate choices`);
      for (const c of n.choices) {
        condition(c.requires); condition(c.visibleWhen); validateEffects(c.effects); validateEffects(c.failEffects);
        assert.ok(c.id && c.text && c.outcome && c.effects, `${id}:${nodeId} outcome`);
        for (const [k, v] of Object.entries(c.cost || {})) assert.ok(['silver', 'potential', 'contribution', 'herbs'].includes(k) && Number.isInteger(v) && v >= 0, `${id}:${nodeId} cost`);
        if (c.combat) assert.ok(OPPONENTS[c.combat.opponent] && c.combat.danger > 0 && c.failNext && c.failText, `${id}:${nodeId} battle continuation`);
        visit(c.next); if (c.failNext) visit(c.failNext); if (c.retreatNext) visit(c.retreatNext);
      }
    };
    visit(event.start);
    assert.equal(seen.size, Object.keys(event.nodes).length, `${id}: unreachable node`);
    const exits = new Set(Object.keys(event.nodes).filter(k => event.nodes[k].terminal));
    let changed = true;
    while (changed) {
      changed = false;
      for (const [key, n] of Object.entries(event.nodes)) if (!exits.has(key) && n.choices.some(c => exits.has(c.next) || exits.has(c.failNext))) { exits.add(key); changed = true; }
    }
    assert.equal(exits.size, seen.size, `${id}: no route to ending`);
  }
  return `${Object.keys(ROOMS).length} rooms, ${Object.keys(LESSONS).length} lessons, ${Object.keys(ACTIVITIES).length} activities, ${Object.keys(events).length} fixed event graph`;
}
