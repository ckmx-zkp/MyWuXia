import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdleRuntime } from './idle-runtime.js';

const initial = () => ({ expTotal: 0, idle: true, devMult: 1, action: null });
const runtime = () => createIdleRuntime(n => n, exp => Math.floor(exp / 100));

test('five idle ticks commit once and snapshots do not consume or duplicate rewards', () => {
  const r = runtime();
  const s = initial();
  for (let i = 0; i < 4; i++) assert.equal(r.advance(s), s);
  assert.equal(r.snapshot(s).expTotal, 8);
  assert.equal(r.snapshot(s).expTotal, 8);
  const next = r.advance(s);
  assert.equal(next.expTotal, 10);
  assert.equal(r.flush(next), next);
  assert.equal(r.snapshot(next).expTotal, 10);
});

test('reset and independent games never inherit pending experience', () => {
  const r = runtime();
  r.advance(initial());
  assert.equal(runtime().snapshot(initial()).expTotal, 0);
  r.clear();
  assert.equal(r.snapshot(initial()).expTotal, 0);
});

test('earned experience retains its original multiplier', () => {
  const r = runtime();
  const s = initial();
  r.advance(s);
  r.advance({ ...s, devMult: 10 });
  assert.equal(r.flush(s).expTotal, 22);
});

test('pause and timed actions settle pending rewards without earning more', () => {
  for (const patch of [{ idle: false }, { action: { type: 'travel' } }]) {
    const r = runtime();
    r.advance(initial());
    const next = r.advance({ ...initial(), ...patch });
    assert.equal(next.expTotal, 2);
    assert.equal(r.advance(next), next);
  }
});

test('level threshold commits before the five tick batch', () => {
  const r = runtime();
  assert.equal(r.advance({ ...initial(), expTotal: 98 }).expTotal, 100);
});
