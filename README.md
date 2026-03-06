# Ezra Playwright Test Suite

End-to-end tests for the myEzra booking flow.

## Setup

### 1. Install dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Configure credentials
```bash
cp .env.example .env
```
Then open `.env` and fill in real values. This file is gitignored and must never be committed.

Required variables:
| Variable | Description |
|---|---|
| `BASE_URL` | Staging site URL |
| `TEST_USER_EMAIL` | Test account email |
| `TEST_USER_PASSWORD` | Test account password |
| `TEST_USER_DOB` | Date of birth in MM-DD-YYYY format |
| `TEST_USER_SEX` | `Male` or `Female` |
| `TEST_MEMBER_B_ID` | Second member ID for cross-access test (optional) |

### 3. Run tests
```bash
# All tests, headless
npm test

# All tests, with browser visible
npm run test:headed

# Interactive UI mode
npm run test:ui
```

### 4. Run in CI/CD

Tests are designed to run in CI with automatic retries:
```bash
npm test  # In CI, runs with 2 retries per failed test
```

**Artifacts:**
- HTML report: `playwright-report/index.html`
- Screenshots: `test-results/` (on failure only)
- Videos: `test-results/` (on retry)
- Traces: `test-results/` (on first failure)

**Expected Runtime:** Full suite completes in ~2 minutes under normal network conditions.

---

## Structure

```
ezra-playwright/
├── .env.example          # Template — commit this
├── .env                  # Real secrets — NEVER commit
├── playwright.config.ts  # Reads config from process.env
├── fixtures/
│   └── auth.ts           # Provides authenticated page to all tests
├── pages/
│   ├── BasePage.ts       # Shared helpers (multiselect, modal dismiss)
│   ├── LoginPage.ts      # /sign-in
│   ├── ReportsPage.ts    # /reports — landing page after login
│   ├── SelectPlanPage.ts # /book-scan/select-plan
│   ├── SchedulePage.ts   # Location + calendar + time slot
│   └── PaymentPage.ts    # Stripe payment form
├── tests/
│   └── booking.spec.ts   # 3 test cases
└── utils/
    └── testData.ts       # Stripe test card numbers, scan type constants
```

---

## Tests

### Test 1 — Happy path booking
Logs in, navigates to Reports, clicks Book Now, selects MRI Scan, fills DOB and sex,
picks the first available location/date/time, and verifies the payment page is reached.

### Test 2 — Declined card
Runs the same flow to the payment step, enters Stripe's test declined card
(`4000 0000 0000 0002`), submits, and asserts an error message appears.

### Test 3 — Cross-member data isolation (Security test)
**Status:** Requires second staging account to run.

This test verifies that Member A's authentication token cannot be used to access Member B's
private medical data (questionnaire responses, scan results). It attempts a token-substitution
attack and expects a 403 Forbidden response.

**To enable Test 3:**
1. Create a second test member account in staging (or request one from the team)
2. Get that account's member ID (usually an integer like `12345`)
3. Add to your `.env` file:
   ```
   TEST_MEMBER_B_ID=<member-id>
   ```
4. Run tests again: `npm test`

Test 3 will then run and verify that cross-member access is blocked. If you don't provide
`TEST_MEMBER_B_ID`, the test will skip gracefully with a helpful message.

**Security test coverage:**
- ✓ Member A cannot read Member B's data using their own token
- ✓ No sensitive data (questionnaire IDs, results) leaks in error responses
- ✓ Member A's data remains unmodified after access attempts
- ✓ Backend returns proper 403 status code (not 500, 401, or 200)

---

## Locator strategy

Locators prioritize Playwright's recommended approach: `getByRole` and `getByLabel` where available, falling back to `getByTestId` for components that lack semantic HTML.

---

## Future improvements

### Test Architecture
1. **Shift tests to API level** — Move validation tests (e.g., data isolation, payment processing) from UI to direct API calls for faster feedback and reduced flakiness
2. **UI tests for critical journeys only** — Keep Playwright for booking flow and payment submission; validate edge cases and error states via API

### Productivity & Observability
3. **Pass/fail rate dashboard** — Track test stability over time to identify regressions early and prioritize fixes
4. **Flaky test detection** — Automatically flag tests that fail intermittently to prevent false negatives masking real issues
5. **Execution time analytics** — Report test duration trends to catch performance regressions and optimize slow tests
6. **Test coverage metrics** — Measure which features are covered and highlight untested areas for prioritization

### Quality Improvements
7. **Parameterized test data** — Enable data-driven testing across multiple booking scenarios (different scan types, locations, payment methods)
8. **Visual regression testing** — Screenshot key pages to catch unintended UI changes in checkout flow
9. **Multi-browser validation** — Run critical paths on Firefox and WebKit in addition to Chromium