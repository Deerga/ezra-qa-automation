/**
 * Non-sensitive test data.
 * Credentials and personal data live in .env — not here.
 *
 * Stripe test card numbers: https://stripe.com/docs/testing
 */
export const STRIPE_CARDS = {
  success: {
    number: '4242 4242 4242 4242',
    expiry: '12/28',
    cvc: '123',
  },
  declined: {
    number: '4000 0000 0000 0002',
    expiry: '12/28',
    cvc: '123',
  },
  insufficientFunds: {
    number: '4000 0000 0000 9995',
    expiry: '12/28',
    cvc: '123',
  },
};

export const SCAN_TYPES = {
  mriScan: 'FB30' as const,
  mriScanWithSpine: 'FB60' as const,
  heartCT: 'GATEDCAC' as const,
  lungsCT: 'LUNG' as const,
  blueprint: 'BLUEPRINTNR' as const,
};