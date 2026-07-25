/** Shared payroll formatting helpers — the single home for money/day formatting. */

const to2 = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Money with the ₹ symbol, 2 decimals (UI). */
export const money = (v: number) => `₹${to2(v)}`;

/** Bare amount, 2 decimals — for PDF/CSV/Excel where the symbol is added separately. */
export const amount = (v: number) => to2(v);

/** Day counts: integer as-is, halves as one decimal (e.g. 26, 0.5). */
export const dayFmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** Round to 2 decimals (for numeric export cells). */
export const round2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
