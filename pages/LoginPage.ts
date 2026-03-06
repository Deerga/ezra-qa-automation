import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get emailInput(): Locator {
    return this.page.getByLabel('Email');
  }

  private get passwordInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  private get submitButton(): Locator {
    return this.page.getByRole('button', { name: 'Submit' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/sign-in');
    await this.waitForPageReady();
  }

  async login(email: string, password: string): Promise<void> {
    await this.dismissCookieBannerIfVisible();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.waitForPageReady();
    await this.dismissTimezoneModalIfVisible();
  }
}