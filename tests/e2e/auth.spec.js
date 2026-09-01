import { test, expect } from '@playwright/test';

test.describe('AuthGate — דף הבית', () => {
  test('מציג התחברות ושחזור סיסמה', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'SuperNav AI' })).toBeVisible();
    await expect(page.getByPlaceholder('שם-משתמש')).toBeVisible();
    await expect(page.getByPlaceholder('סיסמה')).toBeVisible();
    await expect(page.getByRole('button', { name: 'התחבר', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'שכחתי סיסמה' }).click();
    await expect(page.getByText('שחזור סיסמה לפי שאלת-האבטחה שקבעת בהרשמה.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'המשך' })).toBeVisible();
  });
});
