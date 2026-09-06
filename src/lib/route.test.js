import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRoute, reconcileRoute } from './route.js';

const a = { id: 'a', department: 'produce', shelf: 1, zone: 1 };
const b = { id: 'b', department: 'bakery', shelf: 1, zone: 1 };
const c = { id: 'c', department: 'dairy', shelf: 1, zone: 1 };
const route = (items) => computeRoute(items).stops;
const start = { x: 0, y: 2 };

test('late-loaded items populate an initially empty route', () => {
  const next = reconcileRoute([], 0, route([a]), start);
  assert.equal(next.stops[0].items[0].id, 'a');
  assert.equal(next.stopIndex, 0);
});

test('picked and quantity updates preserve progress and manual ordering', () => {
  const old = route([a, b, c]);
  const reordered = [old[0], old[2], old[1]];
  const next = reconcileRoute(reordered, 1, route([a, { ...b, qty: 3 }, { ...c, picked: true }]), start);
  assert.deepEqual(next.stops.map((s) => s.department.id), reordered.map((s) => s.department.id));
  assert.equal(next.stopIndex, 1);
  assert.equal(next.stops[1].items[0].picked, true);
  assert.equal(next.stops[2].items[0].qty, 3);
});

test('adding a department retains completed and current stops', () => {
  const next = reconcileRoute(route([a, b]), 1, route([a, b, c]), start);
  assert.equal(next.stopIndex, 1);
  assert.deepEqual(next.stops.map((s) => s.department.id), ['produce', 'bakery', 'dairy']);
});

test('removing the current stop advances to a valid remaining stop', () => {
  const next = reconcileRoute(route([a, b, c]), 1, route([a, c]), start);
  assert.equal(next.stopIndex, 1);
  assert.equal(next.stops[next.stopIndex].department.id, 'dairy');
  assert.deepEqual(reconcileRoute(next.stops, 1, [], start), { stops: [], stopIndex: 0 });
});

test('a new item in a completed department schedules a return visit', () => {
  const next = reconcileRoute(route([a, b]), 1, route([a, b, { ...a, id: 'new' }]), start);
  assert.equal(next.stopIndex, 0);
  assert.deepEqual(next.stops.map((s) => s.department.id), ['bakery', 'produce']);
});

test('items added after checkout reopen the route', () => {
  const next = reconcileRoute(route([a]), 1, route([a, b]), start);
  assert.equal(next.stopIndex, 1);
  assert.equal(next.stops[1].department.id, 'bakery');
});
