import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface CardDetails {
  number: string;
  expiry: string;
  cvc: string;
  postalCode: string;
}

export class PaymentPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

private get stripeFrame() {
  return this.page
    .locator('iframe[title="Secure payment input frame"]')
    .first()
    .contentFrame();
}

private get cardNumberInput(): Locator {
  return this.stripeFrame.getByPlaceholder('1234 1234 1234 1234');
}

private get cardExpiryInput(): Locator {
  return this.stripeFrame.getByPlaceholder('MM / YY');
}

private get cardCvcInput(): Locator {
  return this.stripeFrame.getByPlaceholder('CVC');
}

private get postalCodeInput(): Locator {
  return this.stripeFrame.getByPlaceholder('12345');
}

private get countrySelect(): Locator {
  return this.stripeFrame.getByLabel('Country');
}

private get reserveButton(): Locator {
  return this.page.locator('[data-test="submit"]');
}

  async fillCardDetails(card: CardDetails): Promise<void> {
    await this.cardNumberInput.fill(card.number);
    await this.cardExpiryInput.fill(card.expiry);
    await this.cardCvcInput.fill(card.cvc);
    await this.postalCodeInput.fill(card.postalCode);
  }

  async selectCountry(countryValue: string): Promise<void> {
    await this.countrySelect.selectOption(countryValue);
  }

  async clickReserveAppointment(): Promise<void> {
    await this.reserveButton.click();
    await this.waitForPageReady();
  }
}