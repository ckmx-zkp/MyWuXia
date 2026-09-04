import test from 'node:test';
import assert from 'node:assert/strict';
import { canResolveChoice } from './quest-guards.js';

test('completed and future nodes cannot be rewarded', () => {
  const state = { treeDone: {}, silver: 20, items: {} };
  assert.equal(canResolveChoice(state, '0:YZ-01', 0, {}), true);
  state.treeDone['0:YZ-01'] = 1;
  assert.equal(canResolveChoice(state, '0:YZ-01', 0, {}), false);
  assert.equal(canResolveChoice(state, '0:YZ-01', 2, {}), false);
});

test('cost checks use current funds and inventory', () => {
  const state = { treeDone: {}, silver: 5, items: { token: 1 } };
  assert.equal(canResolveChoice(state, 'q', 0, { cost: { silver: 6 } }), false);
  assert.equal(canResolveChoice(state, 'q', 0, { cost: { item: 'missing' } }), false);
  assert.equal(canResolveChoice(state, 'q', 0, { cost: { silver: 5, item: 'token' } }), true);
});
