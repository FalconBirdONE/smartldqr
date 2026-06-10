/**
 * EMI engine for the unified checkout: lender interest tables, the
 * tenure (term) matrix, and mock lender-payload generation.
 *
 * Every computation is guarded — zero/negative/non-finite principals yield
 * empty quotes instead of NaN/Infinity, so the UI can render any basket
 * without crashing. No lending provider is wired yet; `buildLenderPayload`
 * returns a `mock: true` payload in the shape a provider integration would
 * post.
 */

export type EmiLender = {
  id: string;
  name: string;
  /** Headline APR (%) per tenure — the lender's interest table. */
  aprByTenure: Record<number, number>;
  /** Tenure the lender subvents to no-cost, if any. */
  noCostTenure?: number;
};

export type EmiQuote = {
  months: number;
  apr: number;
  perMonth: number;
  totalPayable: number;
  interest: number;
  noCost: boolean;
};

export type EmiLenderPayload = {
  mock: true;
  provider_id: string;
  provider_name: string;
  product: 'POS_EMI';
  reference: string;
  principal_inr: number;
  tenure_months: number;
  apr_pct: number;
  emi_inr: number;
  total_payable_inr: number;
  interest_inr: number;
  kfs_document: string;
  created_at: string;
  schedule: { instalment: number; due_date: string; amount_inr: number }[];
};

/** Standard POS tenures. */
export const EMI_TENURES = [3, 6, 9, 12] as const;

/** Demo lender set with per-tenure interest tables. */
export const EMI_LENDERS: EmiLender[] = [
  {
    id: 'clu',
    name: 'Credit Line on UPI',
    aprByTenure: { 3: 0, 6: 14, 9: 15, 12: 16 },
    noCostTenure: 3,
  },
  {
    id: 'hdfc',
    name: 'HDFC Bank',
    aprByTenure: { 3: 12, 6: 13, 9: 14, 12: 15 },
  },
  {
    id: 'icici',
    name: 'ICICI Bank',
    aprByTenure: { 3: 12.5, 6: 13.5, 9: 14.5, 12: 15.5 },
  },
];

/**
 * One EMI quote via the standard reducing-balance formula
 * E = P·r·(1+r)ⁿ / ((1+r)ⁿ − 1); a 0% APR splits the principal flat.
 * Returns null (never NaN/Infinity) for inputs that can't be quoted.
 */
export function quoteEmi(principal: number, months: number, apr: number): EmiQuote | null {
  if (
    !Number.isFinite(principal) ||
    principal <= 0 ||
    !Number.isInteger(months) ||
    months <= 0 ||
    !Number.isFinite(apr) ||
    apr < 0
  ) {
    return null;
  }

  let perMonth: number;
  if (apr === 0) {
    perMonth = principal / months;
  } else {
    const r = apr / 12 / 100;
    const factor = Math.pow(1 + r, months);
    perMonth = (principal * r * factor) / (factor - 1);
  }
  if (!Number.isFinite(perMonth)) {
    return null;
  }

  perMonth = Math.round(perMonth);
  const totalPayable = perMonth * months;
  return {
    months,
    apr,
    perMonth,
    totalPayable,
    interest: Math.max(0, totalPayable - Math.round(principal)),
    noCost: apr === 0,
  };
}

export type LenderMatrixRow = { lender: EmiLender; quotes: EmiQuote[] };

/** The full lender × tenure term matrix for a basket total. */
export function buildEmiMatrix(principal: number): LenderMatrixRow[] {
  return EMI_LENDERS.map((lender) => ({
    lender,
    quotes: EMI_TENURES.map((months) => {
      const apr = lender.aprByTenure[months];
      return apr === undefined ? null : quoteEmi(principal, months, apr);
    }).filter((q): q is EmiQuote => q !== null),
  }));
}

/**
 * Build the payload a lending provider would receive for this selection.
 * MOCK until a provider is wired — flagged via `mock: true`. Throws on an
 * unquotable selection; callers wrap in try/catch.
 */
export function buildLenderPayload({
  lender,
  quote,
  principal,
  reference,
}: {
  lender: EmiLender;
  quote: EmiQuote;
  principal: number;
  reference: string;
}): EmiLenderPayload {
  if (!Number.isFinite(principal) || principal <= 0 || quote.perMonth <= 0) {
    throw new Error('Cannot build an EMI payload for an empty bill.');
  }

  const schedule = Array.from({ length: quote.months }, (_, i) => {
    const due = new Date();
    due.setMonth(due.getMonth() + i + 1);
    return { instalment: i + 1, due_date: due.toISOString().slice(0, 10), amount_inr: quote.perMonth };
  });

  return {
    mock: true,
    provider_id: lender.id,
    provider_name: lender.name,
    product: 'POS_EMI',
    reference,
    principal_inr: Math.round(principal),
    tenure_months: quote.months,
    apr_pct: quote.apr,
    emi_inr: quote.perMonth,
    total_payable_inr: quote.totalPayable,
    interest_inr: quote.interest,
    kfs_document: 'RBI-KFS-MOCK-001',
    created_at: new Date().toISOString(),
    schedule,
  };
}
