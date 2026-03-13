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

    await use(page);
  },
});

export { expect } from '@playwright/test';