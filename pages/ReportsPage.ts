import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ReportsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get bookNowButton(): Locator {
    return this.page.getByRole('button', { name: 'Book Now' }).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/reports');
    await this.waitForPageReady();
  }

  async clickBookNow(): Promise<void> {
    await this.bookNowButton.click();
    await this.waitForPageReady();
  }
}