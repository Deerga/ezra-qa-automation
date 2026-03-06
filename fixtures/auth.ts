import { test as base, Page, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.TEST_USER_EMAIL ?? '';
    const password = process.env.TEST_USER_PASSWORD ?? '';

    if (!email || !password) {
      throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in your .env file');
    }

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(email, password);

    // Fail fast — confirm login succeeded before running any test
    await expect(page).not.toHaveURL(/sign-in/, { timeout: 10000 });
    await cancelInProgressBookingIfPresent(page);

    await use(page);
  },
});

async function cancelInProgressBookingIfPresent(page: Page): Promise<void> {
  try {
    // If we're stuck mid-booking flow, navigate away cleanly
    const currentUrl = page.url();
    if (currentUrl.includes('/book-scan')) {
      const cancelButton = page.getByRole('button', { name: 'Cancel' });
      await cancelButton.waitFor({ state: 'visible', timeout: 3000 });
      await cancelButton.click();
      await page.waitForLoadState('domcontentloaded');
    }
  } catch { /* not in booking flow */ }
}

export { expect } from '@playwright/test';