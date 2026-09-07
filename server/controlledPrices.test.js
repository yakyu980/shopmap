import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeControlledPrices } from './controlledPrices.js';

const row = (date, price, extra = {}) => ({ product: 'חלב', 'update date': date, 'consumers price includes VAT': price, ...extra });
test('keeps latest effective maximum, not a branch offer', () => {
  const result = normalizeControlledPrices([row('01/01/2025', 7), row('01/05/2026', 8), row('01/01/2027', 9)], Date.UTC(2026, 8, 7));
  assert.equal(result.length, 1);
  assert.equal(result[0].maximumPrice, 8);
  assert.equal(result[0].kind, 'controlled-maximum');
  assert.equal(result[0].eilatMaximumPrice, null);
});
test('rejects invalid dates, names and prices', () => {
  assert.deepEqual(normalizeControlledPrices([row('31/02/2026', 8), row('01/01/2026', -1), row('01/01/2026', 'NaN'), row('01/01/2026', 8, { product: 42 })]), []);
});
test('keeps Eilat separately and exact source names', () => {
  const result = normalizeControlledPrices([row('01/01/2026', 8, { 'consumer price in Eilat': '6.78' })]);
  assert.equal(result[0].eilatMaximumPrice, 6.78);
  assert.equal(result[0].name, 'חלב');
});

test('API checks license metadata before downloading data and coalesces requests', async (t) => {
  const { getControlledPrices, SOURCE } = await import('./controlledPrices.js?test-cache');
  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    urls.push(url);
    assert.equal(options.redirect, 'error');
    return { ok: true, json: async () => ({ success: true, result: url.includes('package_show')
      ? { isopen: true, license_id: 'other-open', resources: [{ id: SOURCE.resourceId, datastore_active: true }] }
      : { records: [row('01/01/2026', 8)], total: 1 } }) };
  });
  const [a, b] = await Promise.all([getControlledPrices(), getControlledPrices()]);
  assert.equal(a, b);
  assert.equal(await getControlledPrices(), a);
  assert.equal(urls.length, 2);
});

test('changed license blocks data retrieval', async (t) => {
  const { getControlledPrices } = await import('./controlledPrices.js?test-license');
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return { ok: true, json: async () => ({ success: true, result: { isopen: false } }) };
  });
  await assert.rejects(getControlledPrices(), /הייבוא מושהה/);
  assert.equal(calls, 1);
});
