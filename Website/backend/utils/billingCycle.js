const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const cycleIndex = (year, month) => (Number(year) * 12) + Number(month) - 1;

const formatBillingCycle = (month, year) =>
  `${MONTH_NAMES[Number(month) - 1] || 'Unknown'} ${Number(year)}`;

const nextBillingCycle = (month, year) => {
  const normalizedMonth = Number(month);
  const normalizedYear = Number(year);
  return normalizedMonth === 12
    ? { month: 1, year: normalizedYear + 1 }
    : { month: normalizedMonth + 1, year: normalizedYear };
};

/**
 * Validates the normal society-wide billing flow. Manual/single-resident bills
 * intentionally do not call this helper.
 */
const validateSequentialBillingCycle = ({
  requestedMonth,
  requestedYear,
  latestCycle = null,
  existingCycle = null,
  currentDate = new Date()
}) => {
  const requestedLabel = formatBillingCycle(requestedMonth, requestedYear);
  const existingStatus = String(existingCycle?.billing_status || '').toUpperCase();

  if (existingStatus === 'GENERATED') {
    return {
      allowed: false,
      statusCode: 409,
      message: `Billing cycle for ${requestedLabel} has already been generated.`
    };
  }

  if (existingStatus === 'GENERATING') {
    return {
      allowed: false,
      statusCode: 409,
      message: `Billing cycle for ${requestedLabel} is already being generated. Please refresh in a moment.`
    };
  }

  const expected = latestCycle
    ? nextBillingCycle(latestCycle.billing_month, latestCycle.billing_year)
    : { month: currentDate.getUTCMonth() + 1, year: currentDate.getUTCFullYear() };

  const requestedIndex = cycleIndex(requestedYear, requestedMonth);
  const expectedIndex = cycleIndex(expected.year, expected.month);
  if (requestedIndex === expectedIndex) {
    return { allowed: true, expected };
  }

  const expectedLabel = formatBillingCycle(expected.month, expected.year);
  if (requestedIndex > expectedIndex) {
    return {
      allowed: false,
      statusCode: 409,
      message: `Please generate ${expectedLabel} billing cycle first.`,
      expected
    };
  }

  if (!latestCycle) {
    return {
      allowed: false,
      statusCode: 409,
      message: `The first billing cycle must be ${expectedLabel}.`,
      expected
    };
  }

  const latestLabel = formatBillingCycle(latestCycle.billing_month, latestCycle.billing_year);
  return {
    allowed: false,
    statusCode: 409,
    message: `Cannot generate ${requestedLabel}. The latest generated billing cycle is ${latestLabel}. The next billing cycle must be ${expectedLabel}.`,
    expected
  };
};

module.exports = {
  cycleIndex,
  formatBillingCycle,
  nextBillingCycle,
  validateSequentialBillingCycle
};
