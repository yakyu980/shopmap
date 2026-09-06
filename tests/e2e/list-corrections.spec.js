import { test, expect } from '@playwright/test';

const key = 'supernav_shopping_list_v2_u1';
const a = { id: 'a', name: 'פריט ראשון', department: 'produce', shelf: 1, zone: 1, price: 8, qty: 1, picked: false };
const b = { ...a, id: 'b', name: 'פריט שני', department: 'bakery', qty: 4, picked: true, assignee: 'member1' };
const c = { ...a, id: 'c', name: 'פריט שלישי', department: 'dairy' };

async function setup(page, items, getTrip = () => null) {
  await page.addInitScript(({ items, key }) => {
    sessionStorage.setItem('supernav_auth_token', 'test-token');
    sessionStorage.setItem('supernav_auth_cache_v1', JSON.stringify({ user: { id: 'u1', username: 'בודק' }, household: null }));
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(items));
  }, { items, key });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
    if (path === '/trips/active') return route.fulfill({ json: { trip: await getTrip() } });
    if (path === '/groups') return route.fulfill({ json: { groups: [] } });
    if (path === '/household/members') return route.fulfill({ json: { members: [] } });
    if (path === '/products') return route.fulfill({ json: { products: [] } });
    return route.fulfill({ json: {} });
  });
  await page.goto('/');
}

test('decrementing 2 to 1 to zero removes only the target and persists', async ({ page }) => {
  await setup(page, [{ ...a, qty: 2 }, b]);
  const row = page.locator('.home-product-row').filter({ hasText: a.name });
  await row.getByRole('button', { name: 'הפחת כמות' }).click();
  await expect(row.getByRole('spinbutton')).toHaveValue('1');
  await row.getByRole('button', { name: 'הפחת כמות' }).click();
  await expect(row).toHaveCount(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)).toEqual([b]);
  await page.reload();
  await expect(page.locator('.home-product-name')).toHaveText(b.name);
});

test('undo restores quantity, picked state, assignee and position', async ({ page }) => {
  await setup(page, [a, b, c]);
  await page.locator('.home-product-row').filter({ hasText: b.name }).getByRole('button', { name: 'הסר מרשימת קניות' }).click();
  await expect(page.locator('.home-product-name')).toHaveText([a.name, c.name]);
  await page.getByRole('button', { name: 'בטל', exact: true }).click();
  await expect(page.locator('.home-product-name')).toHaveText([a.name, b.name, c.name]);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)).toEqual([a, b, c]);
  await page.reload();
  await expect(page.locator('.home-product-name')).toHaveText([a.name, b.name, c.name]);
  await expect(page.getByRole('spinbutton', { name: `כמות ${b.name}` })).toHaveValue('4');
});

test('navigation renders items arriving after the screen opens', async ({ page }) => {
  let release;
  const response = new Promise((resolve) => { release = resolve; });
  await setup(page, [], () => response);
  await page.locator('.tabs').getByRole('button', { name: 'ניווט', exact: true }).click();
  await expect(page.locator('.nav-page')).toContainText('אין מוצרים');
  release({ id: 't1', items: [a] });
  await expect(page.locator('.nav-item-name')).toHaveText(a.name);
  await expect(page.locator('.route-step')).toHaveCount(1);
});

test('live list changes preserve progress and remove obsolete stops', async ({ page }) => {
  await page.clock.install();
  let trip = { id: 't1', items: [a, b] };
  await setup(page, [], () => trip);
  await expect(page.locator('.home-product-name')).toHaveCount(2);
  await page.getByRole('button', { name: 'עבור לניווט בסופר' }).click();
  await expect(page.locator('.nav-item-name')).toHaveText(a.name);
  await page.getByRole('button', { name: 'לתחנה הבאה' }).click();
  await expect(page.locator('.nav-item-name')).toHaveText(b.name);
  trip = { ...trip, items: [a, { ...b, picked: false }, c] };
  await page.clock.fastForward(8000);
  await expect(page.locator('.route-step')).toHaveCount(3);
  await expect(page.locator('.nav-item-name')).toHaveText(b.name);
  await expect(page.locator('.route-step--done')).toHaveCount(1);
  trip = { ...trip, items: [a, c] };
  await page.clock.fastForward(8000);
  await expect(page.locator('.nav-item-name')).toHaveText(c.name);
  await expect(page.locator('.route-step')).toHaveCount(2);
  trip = { ...trip, items: [] };
  await page.clock.fastForward(8000);
  await expect(page.locator('.nav-page')).toContainText('אין מוצרים');
});
