const assert = require('assert');
const {
  nextBillingCycle,
  validateSequentialBillingCycle
} = require('../utils/billingCycle');

const latestAugust = { billing_month: 8, billing_year: 2026 };

const validate = (month, year, overrides = {}) => validateSequentialBillingCycle({
  requestedMonth: month,
  requestedYear: year,
  latestCycle: latestAugust,
  currentDate: new Date('2026-08-10T00:00:00Z'),
  ...overrides
});

assert.strictEqual(validate(9, 2026).allowed, true);
assert.strictEqual(
  validate(5, 2026).message,
  'Cannot generate May 2026. The latest generated billing cycle is August 2026. The next billing cycle must be September 2026.'
);
assert.strictEqual(
  validate(8, 2026, { existingCycle: { billing_status: 'GENERATED' } }).message,
  'Billing cycle for August 2026 has already been generated.'
);
assert.strictEqual(validate(10, 2026).message, 'Please generate September 2026 billing cycle first.');
assert.strictEqual(validate(12, 2026).message, 'Please generate September 2026 billing cycle first.');

assert.deepStrictEqual(nextBillingCycle(12, 2026), { month: 1, year: 2027 });
const januaryRequired = validateSequentialBillingCycle({
  requestedMonth: 2,
  requestedYear: 2027,
  latestCycle: { billing_month: 12, billing_year: 2026 }
});
assert.strictEqual(januaryRequired.message, 'Please generate January 2027 billing cycle first.');
assert.strictEqual(validateSequentialBillingCycle({
  requestedMonth: 1,
  requestedYear: 2027,
  latestCycle: { billing_month: 12, billing_year: 2026 }
}).allowed, true);

// Each society supplies its own latest row; no global sequence is shared.
assert.strictEqual(validateSequentialBillingCycle({
  requestedMonth: 9,
  requestedYear: 2026,
  latestCycle: { billing_month: 8, billing_year: 2026 }
}).allowed, true);
assert.strictEqual(validateSequentialBillingCycle({
  requestedMonth: 7,
  requestedYear: 2026,
  latestCycle: { billing_month: 6, billing_year: 2026 }
}).allowed, true);

console.log('Billing cycle sequence tests passed');
