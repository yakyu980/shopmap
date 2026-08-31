import test from 'node:test';
import assert from 'node:assert/strict';
import { groupChainPrices } from './chainPriceBlocks.js';

test('one block per chain uses cheapest visible branch, preserves tied winners', () => {
  const rows = [
    { chainName: 'A', venueName: 'A · 1', price: 12 },
    { chainName: 'A', venueName: 'A · 2', price: 9 },
    { chainName: 'B', venueName: 'B · 1', price: 9 },
    { chainName: 'C', venueName: 'C · 1', price: 1 },
  ];
  const blocks = groupChainPrices(rows, ['A · 1', 'A · 2', 'B · 1']);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].price, 9);
  assert.equal(blocks[1].price, 9);
  assert.equal(blocks[0].venueName, 'A · 2');
});

test('legacy names supported; missing or invalid prices never become zero', () => {
  const blocks = groupChainPrices([
    { venueName: 'A · 1', price: 10 },
    { venueName: 'B · 1', price: null },
    { venueName: 'C · 1', price: 0 },
  ], ['A · 1', 'B · 1', 'C · 1']);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].chainName, 'A');
  assert.deepEqual(groupChainPrices([], []), []);
});
