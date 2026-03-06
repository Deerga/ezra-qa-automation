import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export type ScanType =
  | 'FB30'          // MRI Scan — $999
  | 'FB60'          // MRI Scan with Spine — $1699
  | 'BLUEPRINTNR'   // MRI Scan with Skeletal and Neurological Assessment — $3999
  | 'GATEDCAC'      // Heart CT Scan — $349
  | 'LUNG';         // Lungs CT Scan — $399

export class SelectPlanPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get dobInput(): Locator {
    return this.page.getByLabel('Date of birth (MM-DD-YYYY)');
  }

  private get sexCombobox(): Locator {
    return this.page.getByRole('combobox').first();
  }

  private get continueButton(): Locator {
    return this.page.getByTestId('select-plan-submit-btn');
  }

  private scanCard(scanType: ScanType): Locator {
    return this.page.getByTestId(`${scanType}-encounter-card`);
  }
  // Handles both new user (shows DOB/sex) and returning user (shows "Review your Scan")
async fillDateOfBirthIfPresent(dob: string): Promise<void> {
  try {
    await this.dobInput.waitFor({ state: 'visible', timeout: 3000 });
    await this.dobInput.fill(dob);
  } catch { /* returning user — DOB field not shown */ }
}

  async selectSexIfPresent(sex: 'Male' | 'Female'): Promise<void> {
  try {
    await this.sexCombobox.waitFor({ state: 'visible', timeout: 3000 });
    await this.selectFromMultiselect(this.sexCombobox, sex);
  } catch { /* returning user — sex field not shown */ }
}

 async selectScanType(scanType: ScanType): Promise<void> {
  // Deselect current scan if returning user has one pre-selected
  try {
    await this.deselectButton.waitFor({ state: 'visible', timeout: 3000 });
    await this.deselectButton.click();
  } catch { /* no scan pre-selected */ }
  // Click on the title area of the card which should have the click handler
  await this.scanCard(scanType).locator('.encounter-card__title').click();
  // Give the click time to register and update UI
  await this.page.waitForTimeout(500);
}

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
    await this.waitForPageReady();
  }

  async selectPlan(dob: string, sex: 'Male' | 'Female', scanType: ScanType): Promise<void> {
    await this.fillDateOfBirthIfPresent(dob);
    await this.selectSexIfPresent(sex);
    await this.selectScanType(scanType);
    await this.clickContinue();
  }
  private get deselectButton(): Locator {
  return this.page.getByText('Deselect');
}
}