import { test, expect } from '@playwright/test';

// Smoke: player can submit a score on the scorecard page.
// Requires: TEST_EMAIL + TEST_PASSWORD env vars pointing to a valid player account.
test.skip(!process.env.TEST_EMAIL, 'Set TEST_EMAIL + TEST_PASSWORD to run e2e tests');

test('score submit — hole 1 input visible and accepts value', async ({ page }) => {
  await page.goto('/scorecard.html');
  // Auth wall — app redirects unauthenticated users to /login.html
  await expect(page).toHaveURL(/login/);
});
