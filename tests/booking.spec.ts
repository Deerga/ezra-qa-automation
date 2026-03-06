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
    // PREREQUISITE: This test requires a second staging member account.
    // See README.md "Test 3: Cross-Member Data Isolation" for setup instructions.
    const MEMBER_B_ID = process.env.TEST_MEMBER_B_ID;
    if (!MEMBER_B_ID) {
      test.skip(
        true,
        "Prerequisite not met: TEST_MEMBER_B_ID environment variable not set. " +
          "Create a second staging account and set TEST_MEMBER_B_ID in .env to enable this security test. " +
          "See README.md for detailed setup instructions."
      );
      return;
    }

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

    await test.step("Verify Member A token cannot access Member B data", async () => {
      if (!membersApiUrl) {
        throw new Error(
          "Could not capture members API URL from network. " +
            "Verify the /reports page loads and makes API calls to /individuals/api/members."
        );
      }

      // Construct attack URL: attempt to access Member B's endpoint using Member A's token
      const attackUrl = membersApiUrl.replace(/\/members\/[^/]+/, `/members/${MEMBER_B_ID}`);

      const response = await page.request.get(attackUrl, {
        headers: { Authorization: memberAToken },
      });

      // Security assertion: Should be 403 Forbidden, never 200 OK
      expect(response.status()).toBe(403);

      // Verify no sensitive data is leaked in the error response
      const body = await response.text();
      expect(body).not.toContain(MEMBER_B_ID);
      expect(body).not.toContain("questionnaire");
      expect(body).not.toContain("results");
    });

    await test.step("Verify Member A data was not modified by the access attempt", async () => {
      // Re-fetch Member A's own data to confirm it was not altered
      const verifyResponse = await page.request.get(membersApiUrl, {
        headers: { Authorization: memberAToken },
      });

      expect(verifyResponse.status()).toBe(200);
      const body = await verifyResponse.json();

      // Data integrity check: Member A's ID is unchanged
      expect(body.mnemonicId).toBe(memberAMnemonicId);
    });
  });
});
