import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private get cookieAcceptButton(): Locator {
    return this.page.getByRole('button', { name: 'Accept' });
  }

  private get timezoneConfirmButton(): Locator {
    return this.page.getByRole('button', { name: 'Confirm' });
  }

  async dismissCookieBannerIfVisible(): Promise<void> {
    try {
      await this.cookieAcceptButton.waitFor({ state: 'visible', timeout: 4000 });
      await this.cookieAcceptButton.click();
    } catch {
      // Banner not present — continue
    }
  }

  async dismissTimezoneModalIfVisible(): Promise<void> {
    try {
      await this.timezoneConfirmButton.waitFor({ state: 'visible', timeout: 3000 });
      await this.timezoneConfirmButton.click();
    } catch {
      // Modal not present — continue
    }
  }

  async selectFromMultiselect(combobox: Locator, optionText: string): Promise<void> {
  await combobox.click();
  await this.page
    .getByRole('option')
    .filter({ hasText: new RegExp(`^${optionText}$`) })
    .click();
}

  async waitForPageReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }
}