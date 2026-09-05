import { test, expect } from '@playwright/test';

const user = { id: 'u1', username: 'בודק/ת', emoji: '🙂', photo: null };
const group = {
  id: 'g1', name: 'קניות משפחה', photo: null, myRole: 'admin', venueId: null,
  shoppingItems: [], favorites: [],
  members: [{ userId: 'u1', username: 'בודק/ת', emoji: '🙂', photo: null, role: 'admin', restriction: null }, { userId: 'u2', username: 'חבר/ה בקבוצה', emoji: '🛒', photo: null, role: 'member', restriction: null }],
};

async function seedLoggedIn(page) {
  await page.addInitScript((data) => {
    sessionStorage.setItem('supernav_auth_token', 'test-token');
    sessionStorage.setItem('supernav_auth_cache_v1', JSON.stringify({ user: data, household: null }));
  }, user);
  await page.route('**/api/groups', async (route) => route.fulfill({ json: { groups: [group] } }));
}

test('קבוצה מציגה חברים רק בתוך מסך ההגדרות', async ({ page }) => {
  await seedLoggedIn(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'משתמש וקבוצות-קניות' }).click();
  await expect(page.getByText('קניות משפחה')).toBeVisible();
  await expect(page.getByText('חבר/ה בקבוצה')).not.toBeVisible();
  await page.getByRole('button', { name: 'הגדרות קניות משפחה' }).first().click();
  await expect(page.getByText('חבר/ה בקבוצה')).toBeVisible();
});

test('session התחברות מופרד בין שתי לשוניות', async ({ context }) => {
  const first = await context.newPage();
  await seedLoggedIn(first);
  await first.goto('/');
  await expect(first.getByRole('button', { name: 'משתמש וקבוצות-קניות' })).toBeVisible();

  const second = await context.newPage();
  await second.goto('/');
  await expect(second.getByPlaceholder('שם-משתמש')).toBeVisible();
});
