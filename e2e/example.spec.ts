import { test, expect } from '@playwright/test';

test('should redirect to login page when not authenticated', async ({ page }) => {
  await page.goto('/');

  // Expect to be redirected to the login page
  await expect(page).toHaveURL('/login');

  // Expect the login page to have a title
  await expect(page.getByRole('heading', { name: 'Zaloguj się' })).toBeVisible();
});
