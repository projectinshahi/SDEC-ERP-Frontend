/** Shared payroll formatting helpers — the single home for money/day formatting. */

/**
 * The ONE centralized money-rounding rule (mirrors backend payroll.service.roundMoney):
 * round UP to the next whole rupee (20.01 → 21, 20.99 → 21). All payroll money is
 * displayed through this, so new records (stored already-rounded) and legacy records
 * (stored with decimals) render consistently as whole rupees. Data is never mutated.
 */
export const roundMoney = (v: number) => Math.ceil(Number.isFinite(v) ? v : 0);

const grouped = (v: number) =>
  roundMoney(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });

/** Money with the ₹ symbol, whole rupees (UI). */
export const money = (v: number) => `₹${grouped(v)}`;

/** Bare amount, whole rupees — for PDF/CSV/Excel where the symbol is added separately. */
export const amount = (v: number) => grouped(v);

/** Day counts: integer as-is, halves as one decimal (e.g. 26, 0.5). */
export const dayFmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** Round a money value for numeric export cells (whole rupees, same rule as display). */
export const round2 = (v: number) => roundMoney(v);
