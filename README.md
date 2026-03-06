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

### Test 3 — Cross-member data isolation
Captures Member A's auth token from network traffic, then makes a direct API call
to Member B's endpoint using Member A's token. Expects a 403 response.

> **Note:** Test 3 requires `TEST_MEMBER_B_ID` in your `.env`. Contact the team
> for a second staging account. Without it, the test is skipped automatically.

---

## Locator decisions

All locators come from direct DOM inspection of the staging site — no guesses.

| Element | Strategy | Reason |
|---|---|---|
| Email / Password | `getByLabel` | Native `<label for="...">` |
| Submit (login) | `getByRole('button', { name: 'Submit' })` | Accessible role + text |
| Sex dropdown | `getByRole('combobox')` + `getByRole('option')` | Custom Vue multiselect |
| Scan card | `getByTestId('FB30-encounter-card')` | `data-testid` on each card |
| Continue (plan) | `getByTestId('select-plan-submit-btn')` | `data-testid` confirmed |
| Continue (schedule) | `locator('[data-test="submit"]')` | `data-test` attribute |
| Calendar day | `getByTestId('3-17-cal-day-content')` | `data-testid` on each day |
| Payment inputs | `#payment-numberInput` etc. | Direct `id` attributes |