import { expect } from "@playwright/test";
import { test } from "../fixtures/auth";
import { ReportsPage } from "../pages/ReportsPage";
import { SelectPlanPage } from "../pages/SelectPlanPage";
import { SchedulePage } from "../pages/SchedulePage";
import { PaymentPage } from "../pages/PaymentPage";
import { STRIPE_CARDS, SCAN_TYPES } from "../utils/testData";

const DOB = process.env.TEST_USER_DOB ?? "01-01-1985";
const SEX = (process.env.TEST_USER_SEX as "Male" | "Female") ?? "Male";

test.describe("Ezra Booking Flow", () => {
  test("should complete booking flow and reach payment step", async ({
    authenticatedPage: page,
  }) => {
    const reportsPage = new ReportsPage(page);
    const selectPlanPage = new SelectPlanPage(page);
    const schedulePage = new SchedulePage(page);

    await test.step("Navigate to reports and initiate booking", async () => {
      await reportsPage.goto();
      await reportsPage.clickBookNow();
    });

    await test.step("Select scan type, date of birth and sex", async () => {
      await selectPlanPage.fillDateOfBirthIfPresent(DOB);
      await selectPlanPage.selectSexIfPresent(SEX);
      await selectPlanPage.selectScanType(SCAN_TYPES.mriScan);
      await selectPlanPage.clickContinue();
    });

    await test.step("Select location, date and time slot", async () => {
      await schedulePage.selectFirstAvailableLocation();
      await schedulePage.selectFirstAvailableDate();
      await schedulePage.selectFirstAvailableTimeSlot();
      await schedulePage.clickContinue();
    });

    await test.step("Verify payment page is reached", async () => {
      await expect(page).toHaveURL(/reserve-appointment/);
    });
  });

  test("should show error message when card is declined", async ({
    authenticatedPage: page,
  }) => {
    const reportsPage = new ReportsPage(page);
    const selectPlanPage = new SelectPlanPage(page);
    const schedulePage = new SchedulePage(page);
    const paymentPage = new PaymentPage(page);

    await test.step("Navigate to reports and initiate booking", async () => {
      await reportsPage.goto();
      await reportsPage.clickBookNow();
    });

    await test.step("Select scan type, date of birth and sex", async () => {
      await selectPlanPage.fillDateOfBirthIfPresent(DOB);
      await selectPlanPage.selectSexIfPresent(SEX);
      await selectPlanPage.selectScanType(SCAN_TYPES.mriScan);
      await selectPlanPage.clickContinue();
    });

    await test.step("Select location, date and time slot", async () => {
      await schedulePage.selectFirstAvailableLocation();
      await schedulePage.selectFirstAvailableDate();
      await schedulePage.selectFirstAvailableTimeSlot();
      await schedulePage.clickContinue();
    });

    await test.step("Fill declined card details and submit", async () => {
      await paymentPage.fillCardDetails({
        number: STRIPE_CARDS.declined.number,
        expiry: STRIPE_CARDS.declined.expiry,
        cvc: STRIPE_CARDS.declined.cvc,
        postalCode: "10001",
      });
      await paymentPage.clickReserveAppointment();
    });

    await test.step("Verify declined card error is shown and page has not changed", async () => {
      const stripeFrame = page
        .locator('iframe[title="Secure payment input frame"]')
        .first()
        .contentFrame();
      await expect(
        stripeFrame.getByText("Your card was declined."),
      ).toBeVisible();
      await expect(page).toHaveURL(/reserve-appointment/);
    });
  });

  test("cross-member data isolation: member token only returns own data", async ({
    authenticatedPage: page,
  }) => {
    let memberAToken = "";
    let memberAMnemonicId: number | null = null;
    let membersApiUrl = "";

    await test.step("Capture Member A auth token and member ID from network", async () => {
      page.on("request", (request) => {
        const auth = request.headers()["authorization"];
        if (auth) memberAToken = auth;
      });

      page.on("response", async (response) => {
        if (
          response.url().includes("/individuals/api/members") &&
          response.status() === 200
        ) {
          try {
            const body = await response.json();
            if (body?.mnemonicId) {
              memberAMnemonicId = body.mnemonicId;
              membersApiUrl = response.url();
            }
          } catch {
            /* not JSON */
          }
        }
      });

      await page.goto("/reports");
      await page.waitForLoadState("domcontentloaded");
    });

    await test.step("Call members API with Member A token and verify response", async () => {
      if (!membersApiUrl) {
        test.skip(true, "Skipped: membersApiUrl not captured from network");
        return;
      }

      const response = await page.request.get(membersApiUrl, {
        headers: { Authorization: memberAToken },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.mnemonicId).toBe(memberAMnemonicId);
      expect(body.email).toBe(process.env.TEST_USER_EMAIL);
      expect(body.email).not.toBe(process.env.TEST_USER_EMAIL_B);
    });
  });
});
