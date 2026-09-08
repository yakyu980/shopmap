import { test, expect } from '@playwright/test';

async function setup(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('supernav_auth_token', 'test-token');
    sessionStorage.setItem('supernav_auth_cache_v1', JSON.stringify({ user: { id: 'u1', username: 'בודק' }, household: null }));
    window.motionRequests = 0;
    window.DeviceMotionEvent = { requestPermission() {
      window.motionRequests++;
      window.motionHadActivation = navigator.userActivation.isActive;
      return Promise.resolve('granted');
    } };
  });
  await page.route('**/api/**', (route) => route.fulfill({ json: { trip: null, groups: [], members: [], products: [] } }));
  await page.goto('/');
  await page.locator('.tabs').getByRole('button', { name: 'מפת חנות', exact: true }).click();
  await expect(page.getByRole('region', { name: 'מוכנות המכשיר למיפוי' })).toBeVisible();
}

for (const width of [390, 1280]) {
  test(`motion permission and truthful partial readings at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    expect(await page.evaluate(() => window.motionRequests)).toBe(0);
    await page.getByRole('button', { name: 'בדוק תאוצה וסיבוב' }).click();
    expect(await page.evaluate(() => window.motionHadActivation)).toBe(true);
    await page.evaluate(() => {
      const event = new Event('devicemotion');
      event.acceleration = { x: 0, y: 0, z: 0 };
      event.rotationRate = { alpha: null, beta: null, gamma: null };
      window.dispatchEvent(event);
    });
    await expect(page.locator('.mapping-readiness')).toContainText('נתונים חלקיים');
    await expect(page.locator('.mapping-readiness')).toContainText('סיבוב: ללא נתונים');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`mapping-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'בדוק תאוצה וסיבוב' }).click();
    await page.evaluate(() => {
      const event = new Event('devicemotion');
      event.acceleration = { x: 0, y: 0, z: 0 };
      event.rotationRate = { alpha: 0, beta: 0, gamma: 0 };
      window.dispatchEvent(event);
    });
    await expect(page.locator('.mapping-readiness')).toContainText('התקבלו נתונים');
  });
}

test('leaving a pending motion check removes its listener', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.motionListeners = 0;
    window.addEventListener = (type, ...args) => { if (type === 'devicemotion') window.motionListeners++; add(type, ...args); };
    window.removeEventListener = (type, ...args) => { if (type === 'devicemotion') window.motionListeners--; remove(type, ...args); };
  });
  await page.getByRole('button', { name: 'בדוק תאוצה וסיבוב' }).click();
  expect(await page.evaluate(() => window.motionListeners)).toBe(1);
  await page.locator('.tabs').getByRole('button', { name: 'דף בית' }).click();
  expect(await page.evaluate(() => window.motionListeners)).toBe(0);
});
