import { test, expect } from '@playwright/test';

const personal = { id: 'personal-1', name: 'מוצר אישי לבדיקה', department: 'bakery', shelf: 1, zone: 1, price: 9, qty: 2, picked: false };
const tripItem = { id: 'ti1', productId: 'p1', name: 'מוצר טיול לבדיקה', department: 'produce', shelf: 1, zone: 1, price: 7, picked: false, addedBy: 'בודק' };
const groupItem = { ...tripItem, id: 'gi1', name: 'מוצר קבוצה לבדיקה' };
const group = { id: 'g1', name: 'קבוצת בדיקה', myRole: 'admin', shoppingItems: [groupItem], favorites: [], members: [], venueId: null };

async function setup(page, { activeTrip = true, personalItems = [personal] } = {}) {
  let trip = activeTrip ? { id: 't1', items: [tripItem], venueId: 'v1', status: 'active' } : null;
  const writes = [];
  await page.addInitScript((items) => {
    sessionStorage.setItem('supernav_auth_token', 'test-token');
    sessionStorage.setItem('supernav_auth_cache_v1', JSON.stringify({ user: { id: 'u1', username: 'בודק' }, household: null }));
    localStorage.setItem('supernav_shopping_list_v2_u1', JSON.stringify(items));
  }, personalItems);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^.*\/api/, '');
    if (request.method() === 'POST') writes.push(path);
    if (path === '/trips/active') return route.fulfill({ json: { trip } });
    if (path === '/trips/t1/items/ti1/toggle') {
      trip = { ...trip, items: trip.items.map((item) => ({ ...item, picked: !item.picked })) };
      return route.fulfill({ json: { trip } });
    }
    if (path === '/trips/t1/finish') {
      trip = null;
      return route.fulfill({ json: { trip: null } });
    }
    if (path === '/groups') return route.fulfill({ json: { groups: [group] } });
    if (path === '/groups/g1/home') return route.fulfill({ json: { group } });
    if (path === '/household/members') return route.fulfill({ json: { members: [] } });
    if (path === '/products') return route.fulfill({ json: { products: [] } });
    return route.fulfill({ json: {} });
  });
  await page.goto('/');
  return writes;
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test(`trip navigation uses shared items and actions at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const writes = await setup(page);
    await expect(page.locator('.home-product-name')).toHaveText(tripItem.name);
    await page.getByRole('button', { name: 'עבור לניווט בסופר' }).click();
    await expect(page.locator('.nav-item-name')).toHaveText(tripItem.name);
    await expect(page.locator('.nav-page')).not.toContainText(personal.name);
    await page.locator('.nav-item-check input').click();
    await expect(page.locator('.nav-item-check input')).toBeChecked();
    expect(writes).toContain('/trips/t1/items/ti1/toggle');
    await page.getByRole('button', { name: 'חזרה לרשימה' }).click();
    await expect(page.locator('.trip-item-picked')).toBeChecked();
    await page.locator('.tabs').getByRole('button', { name: 'ניווט', exact: true }).click();
    await expect(page.locator('.nav-item-name')).toHaveText(tripItem.name);
    await page.getByRole('button', { name: 'עבור לקופות' }).click();
    await page.getByRole('button', { name: 'סיום קנייה' }).click();
    await expect(page.locator('.home-product-name')).toHaveText(personal.name);
    expect(writes).toContain('/trips/t1/finish');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('supernav_shopping_list_v2_u1')))).toEqual([personal]);
  });
}

test('an empty personal list does not hide the active trip route', async ({ page }) => {
  await setup(page, { personalItems: [] });
  await expect(page.locator('.home-product-name')).toHaveText(tripItem.name);
  await page.getByRole('button', { name: 'עבור לניווט בסופר' }).click();
  await expect(page.locator('.nav-item-name')).toHaveText(tripItem.name);
});

test('without a trip, navigation still uses the personal list', async ({ page }) => {
  await setup(page, { activeTrip: false });
  await expect(page.locator('.home-product-name')).toHaveText(personal.name);
  await page.getByRole('button', { name: 'עבור לניווט בסופר' }).click();
  await expect(page.locator('.nav-item-name')).toHaveText(personal.name);
});

test('a selected group takes precedence over an active trip', async ({ page }) => {
  await setup(page);
  await expect(page.locator('.home-product-name')).toHaveText(tripItem.name);
  await page.getByRole('button', { name: 'משתמש וקבוצות-קניות' }).click();
  await page.locator('.group-list-row__main').click();
  await expect(page.locator('.home-product-name')).toHaveText(groupItem.name);
  await page.getByRole('button', { name: 'עבור לניווט בסופר' }).click();
  await expect(page.locator('.nav-item-name')).toHaveText(groupItem.name);
});
