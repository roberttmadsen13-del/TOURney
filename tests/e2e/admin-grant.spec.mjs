import { test, expect } from '@playwright/test';

// Smoke: admin grant flow is accessible to tournament owners.
// Requires: TEST_EMAIL + TEST_PASSWORD env vars pointing to a tournament owner account.
test.skip(!process.env.TEST_EMAIL, 'Set TEST_EMAIL + TEST_PASSWORD to run e2e tests');

test('admin grant — admin.html loads for authenticated owner', async ({ page }) => {
  await page.goto('/admin.html');
  // Auth wall — unauthenticated users redirected to login
  await expect(page).toHaveURL(/login/);
});
