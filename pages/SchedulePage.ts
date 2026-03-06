import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class SchedulePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get recommendedLocationCard(): Locator {
    return this.page.getByText("Recommended").first();
  }

  private get firstAvailableDay(): Locator {
    return this.page
      .locator(
        ".vuecal__cell:not(.vuecal__cell--disabled):not(.vuecal__cell--out-of-scope) .vc-day-content",
      )
      .first();
  }

  private get firstAvailableTimeSlot(): Locator {
    return this.page.locator(".appointments__individual-appointment").first();
  }

  private get continueButton(): Locator {
  return this.page.locator('[data-test="submit"]');
}

  private calendarDay(month: number, day: number): Locator {
    return this.page.getByTestId(`${month}-${day}-cal-day-content`);
  }

  private timeSlot(timeLabel: string): Locator {
    return this.page.getByLabel(timeLabel);
  }

  private locationCard(locationName: string): Locator {
    return this.page.getByText(locationName, { exact: true });
  }

  async selectLocation(locationName: string): Promise<void> {
    await this.locationCard(locationName).click();
    await this.waitForPageReady();
  }

  async selectFirstAvailableLocation(): Promise<void> {
    await this.recommendedLocationCard.click();
    await this.waitForPageReady();
  }

  async selectCalendarDate(month: number, day: number): Promise<void> {
  await this.calendarDay(month, day).click();
  await this.page
    .locator('.appointments__individual-appointment')
    .first()
    .waitFor({ state: 'visible' });
}

  async selectFirstAvailableDate(): Promise<void> {
    await this.firstAvailableDay.click();
    await this.page
      .locator(".appointments__individual-appointment")
      .first()
      .waitFor({ state: "visible" });
  }

  async selectTimeSlot(timeLabel: string): Promise<void> {
    await this.timeSlot(timeLabel).click();
  }

  async selectFirstAvailableTimeSlot(): Promise<void> {
    await this.firstAvailableTimeSlot.click();
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
    await this.waitForPageReady();
  }
}
