# Question 1 – Booking Flow Test Cases

## Scope & Approach

I walked through the staging environment at `https://myezra-staging.ezra.com` to map the actual booking flow before writing a single test case. The flow consists of three steps:

- **Step 1 — Review your plan** (`/book-scan/select-plan`): Member selects a scan (MRI Scan $999, MRI Scan with Spine $1,699, MRI Scan with Skeletal and Neurological Assessment $3,999, Heart CT Scan $349) and optional add-ons (Lungs CT $399, Heart CT $349). DOB and biological sex are pre-populated. Affirm financing is offered. Continue is disabled until a scan is selected.
- **Step 2 — Schedule your scan** (`/book-scan/schedule-scan`): Member selects a location (AMRIC, Park Ave, Upper East Side, etc.) filtered by state, then picks a date and 30-minute time slot displayed in EST. Some locations display an "Available instead" badge indicating the selected scan type differs at that location. Continue is disabled until both location and time slot are chosen.
- **Step 3 — Reserve your appointment** (`/book-scan/reserve-appointment`): Member pays via Card (Stripe-embedded form: card number, MM/YY expiry, CVC, country, ZIP) or Affirm. A promo code field is available on the right alongside the order summary showing scan type, location, date/time, and total.

Test cases are ordered from most to least critical based on business impact, data integrity risk, and likelihood of real-world occurrence.

---

## Test Cases

---

### TC-01 · Successful end-to-end booking with a valid Stripe test card
**Priority:** Critical
**Type:** Happy Path / E2E
**URL:** `/book-scan/select-plan` → `/book-scan/schedule-scan` → `/book-scan/reserve-appointment`
**Test Data:** Stripe card `4242 4242 4242 4242` | Exp `12/26` | CVC `123` | ZIP `10001`

**Steps:**
1. Log in and click "Book a scan" from the home dashboard
2. On "Review your plan," select **MRI Scan – $999**, click Continue
3. On "Schedule your scan," select **AMRIC – New York, NY 10022**, choose Mar 19 2026 · 12:00 PM EST, click Continue
4. On "Reserve your appointment," confirm order summary shows: MRI Scan | AMRIC | Mar 19 · 12:00 PM EDT | Total $999
5. Select Card, enter test card details, click Continue

**Expected Result:**
- Booking confirmed; member is redirected to a confirmation screen
- Appointment appears in the home dashboard under "Appointments"
- Invoice appears under the Invoices tab with correct amount
- No duplicate charge in Stripe

---

### TC-02 · Price integrity — displayed total matches Stripe charge across all scan types
**Priority:** Critical
**Type:** Data Integrity / Payment
**URL:** `/book-scan/select-plan` → `/book-scan/reserve-appointment`

**Steps:**
1. Select **MRI Scan with Spine – $1,699**, proceed through to Step 3
2. On Reserve, verify the order summary total shows $1,699
3. Complete payment with Stripe test card `4242 4242 4242 4242`
4. Verify the Stripe charge amount matches $1,699 exactly
5. Repeat for MRI Scan ($999), Heart CT Scan ($349), and MRI Scan with Skeletal ($3,999)

**Expected Result:**
- Order summary total on the Reserve screen exactly matches the scan price selected in Step 1
- Stripe charge matches the displayed total with no rounding errors or silent fees
- Invoice under Invoices tab reflects the same amount
- Each scan type produces the correct, distinct charge amount

---

### TC-03 · Payment declined — booking not created, member can retry without restarting flow
**Priority:** Critical
**Type:** Negative / Payment Error Handling
**URL:** `/book-scan/reserve-appointment`
**Test Data:** Stripe decline card `4000 0000 0000 0002`

**Steps:**
1. Complete Steps 1 and 2 (MRI Scan, AMRIC, Mar 19 · 12:00 PM)
2. On Reserve, enter card `4000 0000 0000 0002`, click Continue

**Expected Result:**
- Payment is rejected; booking is NOT created
- Clear inline error message displayed: "Your card was declined. Please try a different payment method."
- Member remains on the Reserve screen — location and time selection from Step 2 are preserved
- No appointment appears in the dashboard
- No open or dangling payment intent in Stripe

---

### TC-04 · Valid promo code applies correct discount and Stripe is charged the reduced amount
**Priority:** Critical
**Type:** Business Logic / Payment
**URL:** `/book-scan/reserve-appointment`

**Steps:**
1. Complete Steps 1 (MRI Scan $999) and 2 (location and time)
2. On Reserve, enter a known valid promo code in the "Promo Code" field, click "Apply Code"
3. Verify order summary total updates to the discounted amount
4. Complete payment with Stripe test card `4242 4242 4242 4242`
5. Verify Stripe charge equals the discounted total, not the original $999

**Expected Result:**
- Discount is reflected in the order summary immediately after "Apply Code" is clicked
- Stripe charges the discounted amount — the original price is never processed
- Invoice shows original price, discount applied, and final amount charged
- Applying the same promo code a second time is rejected

**Note:** A valid test promo code should be created in staging as part of test data setup. The promo field is present in the live UI and must be covered.

---

### TC-05 · "Available instead" location — scan type and price reflect the location's actual offering
**Priority:** High
**Type:** Business Logic / Data Integrity
**URL:** `/book-scan/schedule-scan` → `/book-scan/reserve-appointment`

**Steps:**
1. Select **MRI Scan – $999** in Step 1
2. On Schedule your scan, select a location tagged **"Available instead · MRI Scan with Spine"** (e.g., Park Ave or Upper East Side)
3. Proceed to Reserve your appointment

**Expected Result:**
- The system clearly communicates that the scan type will change when this location is selected — either via a warning modal or updated messaging before the member proceeds
- The order summary on Reserve reflects the correct scan type and price for that location (MRI Scan with Spine – $1,699), not the original selection ($999)
- The member is never silently booked for a different scan than they believe they selected
- Stripe is charged the correct amount for the actual scan being booked

---

### TC-06 · Continue button is disabled until all required selections are made on each step
**Priority:** High
**Type:** UI State / Form Validation
**URL:** `/book-scan/select-plan`, `/book-scan/schedule-scan`

**Steps:**
1. Land on "Review your plan" — verify Continue is grayed out before any scan is selected
2. Select MRI Scan — verify Continue becomes active
3. Proceed to "Schedule your scan" — verify Continue is grayed out before selecting location or time
4. Select a location only — verify Continue remains grayed out
5. Select a time slot without a location — verify Continue remains grayed out
6. Select both location and time — verify Continue becomes active

**Expected Result:**
- Continue is non-interactive in all incomplete states on both steps
- Selections cannot be bypassed via direct URL navigation to the next step without a valid session state
- No way to reach the payment screen with an incomplete booking configuration

---

### TC-07 · Expired card is rejected with a specific error; booking flow state is preserved
**Priority:** High
**Type:** Negative / Payment Validation
**URL:** `/book-scan/reserve-appointment`
**Test Data:** Stripe card `4000 0000 0000 0069`

**Steps:**
1. Complete Steps 1 and 2
2. Enter Stripe test card `4000 0000 0000 0069` on the Reserve screen, click Continue

**Expected Result:**
- Payment blocked with a message specific to card expiry: "Your card has expired."
- No booking is created; no charge attempted in Stripe
- Member can re-enter a valid card without restarting from Step 1
- Location and time selection from Step 2 are preserved

---

### TC-08 · Affirm financing — booking is confirmed when Affirm is selected as payment method
**Priority:** High
**Type:** Alternative Payment / Happy Path
**URL:** `/book-scan/reserve-appointment`

**Steps:**
1. Complete Steps 1 (MRI Scan $999) and 2 (select location and time)
2. On Reserve, select **Affirm** as the payment method
3. Complete the Affirm authorization flow

**Expected Result:**
- Affirm redirects correctly and returns the member to Ezra post-authorization
- Booking is confirmed and appears in the Appointments dashboard
- Invoice tab reflects Affirm as the payment method with correct amount
- Scan type, location, and time on the confirmation match what was selected in Steps 1 and 2

---

### TC-09 · Invalid promo code shows error and does not alter the total
**Priority:** High
**Type:** Negative / Input Validation
**URL:** `/book-scan/reserve-appointment`

**Steps:**
1. Complete Steps 1 and 2
2. Enter an invalid promo code (e.g., `INVALIDXYZ`) and click "Apply Code"

**Expected Result:**
- Inline error message appears: "This promo code is not valid." or similar
- Order total remains $999 — no discount applied
- Member can proceed to pay without a promo code
- Stripe is not called with a modified amount

---

### TC-10 · Back navigation from Reserve to Schedule preserves location and time selections
**Priority:** High
**Type:** State Management / Navigation
**URL:** `/book-scan/reserve-appointment` → `/book-scan/schedule-scan`

**Steps:**
1. Complete all three steps up to the Reserve screen (do not submit payment)
2. Click "Back"
3. Verify the previously selected location and time slot are still highlighted
4. Click Continue to return to Reserve
5. Verify the order summary is unchanged

**Expected Result:**
- Location and time slot are preserved when navigating back
- Order summary on Reserve still shows the correct scan, location, time, and total
- No duplicate or orphaned booking records are created by the back-and-forth navigation

---

### TC-11 · Payment form validates empty and malformed card inputs before submission
**Priority:** Medium
**Type:** Input Validation / Negative
**URL:** `/book-scan/reserve-appointment`

**Steps:**
1. Click Continue with all card fields empty
2. Enter a card number shorter than 16 digits (e.g., `4242 4242`)
3. Enter an invalid expiry: `00/00`
4. Enter a 2-digit CVC on a card that requires 3

**Expected Result:**
- Each invalid input triggers a field-level inline error — not a single generic page error
- Stripe's embedded form handles validation client-side without a full page reload
- Continue cannot be submitted in any invalid card state
- Error messages are descriptive enough for the member to self-correct

---

### TC-12 · Unauthenticated user is redirected to login when accessing booking URLs directly
**Priority:** Medium
**Type:** Authentication / Access Control

**Steps:**
1. Log out of the portal
2. Directly navigate to `https://myezra-staging.ezra.com/book-scan/select-plan`
3. Attempt to access `/book-scan/schedule-scan` and `/book-scan/reserve-appointment` directly via URL

**Expected Result:**
- All three booking URLs redirect to the login screen when accessed without an active session
- After logging in, member is returned to the start of the booking flow
- No booking configuration or pricing data from a prior session is exposed

---

### TC-13 · Affirm monthly estimate updates dynamically when switching scan types
**Priority:** Medium
**Type:** UI Accuracy / Business Logic
**URL:** `/book-scan/select-plan`

**Steps:**
1. Note the Affirm estimate displayed under MRI Scan ($999 → "as low as $63/month")
2. Select MRI Scan with Spine ($1,699) — note the updated estimate ("as low as $106/month")
3. Select MRI Scan with Skeletal and Neurological Assessment ($3,999) — note estimate ("as low as $139/month")
4. Select Heart CT Scan ($349) — verify estimate updates accordingly

**Expected Result:**
- Affirm monthly estimates update in real time as the member switches between scan types
- Estimates are mathematically consistent with each scan's listed price
- "See if you qualify" link is functional and routes correctly

---

### TC-14 · Insufficient funds card is handled gracefully with a clear recovery path
**Priority:** Medium
**Type:** Negative / Payment Error Handling
**Test Data:** Stripe card `4000 0000 0000 9995`

**Steps:**
1. Complete Steps 1 and 2
2. Enter Stripe test card `4000 0000 0000 9995` on the Reserve screen, click Continue

**Expected Result:**
- Payment fails with message: "Insufficient funds. Please use a different card."
- No booking created; no charge recorded in Stripe
- Member can re-enter payment details without restarting the booking flow

---

### TC-15 · Page transition loader resolves completely before interactive elements are accessible
**Priority:** Low
**Type:** Performance / UX
**URL:** All three booking steps

**Steps:**
1. Navigate between each of the three booking steps
2. Observe the yellow horizontal loading bar at the top of each page transition
3. Attempt to click location cards, time slots, and form fields while the loader is still active

**Expected Result:**
- The yellow loader completes before interactive elements accept input
- No user interactions are processed while the page is mid-load (prevents partial or corrupt state)
- The loader does not hang indefinitely on any step under normal network conditions
- Slow network simulation (e.g., throttled 3G) does not leave the member on a blank or broken screen

---

## Part 2 – Why These Are My Top 3

---

### TC-01 — End-to-end successful booking

This is Ezra's core transaction — revenue is generated and a member's access to cancer screening is secured only when this flow completes. It is also the broadest integration test in the suite, touching the member portal, the booking service, Stripe, dashboard sync, and invoice generation in a single pass. If this breaks, nothing else matters.

What makes it more critical than in a typical e-commerce context is the healthcare dimension. A member who believes they've booked a cancer screening, but whose booking was silently dropped, may not follow up for weeks. In a cancer detection product, that delay has real clinical consequences. This test runs on every deployment, every environment, before any release is signed off — no exceptions.

---

### TC-02 — Price integrity

Billing discrepancies in healthcare carry more weight than in retail. Ezra's scans range from $349 to $3,999 — significant out-of-pocket purchases. A mismatch between the displayed price and what hits a member's card is not just a UX bug; it is a trust-destroying event and a potential legal exposure.

This test is non-trivial because the total is calculated from multiple variables: base scan price, optional add-ons, and promo discounts. Any of those calculation paths can introduce rounding errors or a race condition where the UI total and the Stripe payment intent amount diverge. I have seen this exact class of bug reach production in financial services — the UI shows one number, the backend processes another. Catching it before it hits a member's credit card statement is essential.

---

### TC-03 — Card declined, booking not created

Stripe declines will happen every day in production. What matters is not just whether the decline is caught — Stripe handles that — but what the system does next. Specifically: is a booking record created before payment confirmation is received?

If the booking service creates the appointment optimistically before confirming the Stripe result, a decline leaves an orphaned record in the system. The time slot may be held, the imaging center may receive a notification, and the member's dashboard may show a pending appointment that was never actually paid for. Beyond the data integrity problem, the UX of a decline matters in a health context — a confusing or alarming error message when someone is trying to book cancer screening adds real anxiety. The error must be specific, calm, and recovery must be frictionless without forcing the member to re-enter their location and time.