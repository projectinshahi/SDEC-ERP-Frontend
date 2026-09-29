import { z } from 'zod';
import type { FieldErrors } from './contentValidation';

/**
 * MK-004.2 / .3 / .4 / .5 / .6 — THE client-side validation for every Marketing
 * finance form.
 *
 * WHY Zod here and not the hand-rolled rules in `contentValidation.ts`: Zod is
 * already a dependency and these are new forms, so they get schema-first
 * validation. The existing Content forms are NOT rewritten — that would be a
 * large refactor of working code for no user-visible gain.
 *
 * The two systems interoperate through `FieldErrors`, the record shape the
 * module's `<FieldError />` component and every server response already speak,
 * so a Zod failure and a server failure render identically.
 *
 * These rules MIRROR the server validators in marketingExpense.controller.ts and
 * marketingCampaign.controller.ts. The server stays authoritative; this exists so
 * the user sees the problem next to the field instead of after a round trip.
 */

/** Flatten a Zod failure into the module's field-error record. First error per
 *  field wins, which is what the user can act on. */
export function zodFieldErrors(result: z.SafeParseReturnType<unknown, unknown>): FieldErrors {
  if (result.success) return {};
  const out: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Parse and return errors in one step — the shape every form's submit uses. */
export function validate<T extends z.ZodTypeAny>(
  schema: T, value: unknown,
): { errors: FieldErrors; data?: z.infer<T> } {
  const result = schema.safeParse(value);
  return result.success ? { errors: {}, data: result.data } : { errors: zodFieldErrors(result) };
}

/* ── Shared field rules ────────────────────────────────────────────────────── */

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A REAL calendar date, not merely the right shape.
 *
 * '2026-13-45' matches the pattern but is not a date — it reaches the server as
 * an Invalid Date. Mirrors the server's isYmd in marketingFinance.service, so a
 * value accepted here is never rejected there.
 */
export const isRealYmd = (v: string): boolean => {
  if (!YMD.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** A required 'YYYY-MM-DD' date. Text comparison is chronological for ISO dates
 *  and immune to timezone shift, which is why dates never become Date objects. */
const ymd = (label: string) =>
  z.string().trim().min(1, `${label} is required.`)
    .refine(isRealYmd, `Enter a valid ${label.toLowerCase()}.`);

/**
 * Money from a form input. The raw value is a STRING; '' means "not entered",
 * which must read as required rather than as 0. `Number('')` is 0 and
 * `Number('12abc')` is NaN, so both are rejected explicitly instead of coerced.
 */
const amount = (label: string, opts: { required?: boolean; allowZero?: boolean } = {}) =>
  z.union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? v.trim() : String(v)))
    .superRefine((v, ctx) => {
      if (v === '') {
        if (opts.required) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is required.` });
        return;
      }
      const n = Number(v);
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a number.` });
      } else if (n < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} cannot be negative.` });
      } else if (!opts.allowZero && n === 0 && opts.required) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be greater than zero.` });
      } else if (n > 1e12) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is too large.` });
      }
    })
    .transform((v) => (v === '' ? 0 : Number(v)));

/** A whole non-negative count (impressions / clicks / leads). */
const count = (label: string) =>
  z.union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? v.trim() : String(v)))
    .superRefine((v, ctx) => {
      if (v === '') return;
      const n = Number(v);
      if (!Number.isFinite(n)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a number.` });
      else if (n < 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} cannot be negative.` });
      else if (!Number.isInteger(n)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a whole number.` });
    })
    .transform((v) => (v === '' ? 0 : Number(v)));

/** A required select. '' is the placeholder option, so it must not pass. */
const choice = (label: string) => z.string().trim().min(1, `${label} is required.`);

/** A required id select, carried as a string by the <select> and coerced once. */
const idChoice = (label: string) =>
  z.union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .refine((v) => v !== '' && Number.isInteger(Number(v)) && Number(v) > 0, `${label} is required.`)
    .transform((v) => Number(v));

/** An optional id select — '' / 'none' both mean "not chosen". */
const optionalId = z.union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .transform((v) => (v === '' || v === 'none' ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v > 0), 'Choose a valid option.');

/* ── MK-004.2 Expense ──────────────────────────────────────────────────────── */

export const expenseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(255, 'Title must be 255 characters or fewer.'),
  category: choice('Category'),
  clientId: idChoice('Client'),
  projectId: optionalId,
  amount: amount('Amount', { required: true }),
  date: ymd('Date'),
  vendor: z.string().trim().max(255, 'Vendor must be 255 characters or fewer.').optional().default(''),
  notes: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.').optional().default(''),
});
export type ExpenseFormValues = z.input<typeof expenseSchema>;

/* ── MK-004.4 Ad campaign ──────────────────────────────────────────────────── */

export const campaignSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required.').max(255, 'Campaign name must be 255 characters or fewer.'),
  clientId: idChoice('Client'),
  projectId: optionalId,
  platform: choice('Platform'),
  budget: amount('Budget'),
  spend: amount('Spend'),
  revenue: amount('Revenue'),
  startDate: ymd('Start date'),
  endDate: ymd('End date'),
  impressions: count('Impressions'),
  clicks: count('Clicks'),
  leads: count('Leads'),
  conversions: count('Conversions'),
  notes: z.string().trim().max(2000, 'Notes must be 2000 characters or fewer.').optional().default(''),
})
  // Cross-field rules are attached to the field the user must fix, so the
  // message lands on that input rather than at the top of the form.
  .refine((v) => !(isRealYmd(v.startDate) && isRealYmd(v.endDate)) || v.endDate >= v.startDate, {
    message: 'The end date cannot be earlier than the start date.', path: ['endDate'],
  })
  .refine((v) => !(v.impressions > 0) || v.clicks <= v.impressions, {
    message: 'Clicks cannot exceed impressions.', path: ['clicks'],
  })
  .refine((v) => !(v.clicks > 0) || v.leads <= v.clicks, {
    message: 'Leads cannot exceed clicks.', path: ['leads'],
  });
export type CampaignFormValues = z.input<typeof campaignSchema>;

/* ── MK-004.5 Influencer ───────────────────────────────────────────────────── */

export const influencerSchema = z.object({
  name: z.string().trim().min(1, 'Influencer name is required.').max(255, 'Influencer name must be 255 characters or fewer.'),
  handle: z.string().trim().max(255, 'Handle must be 255 characters or fewer.').optional().default(''),
  clientId: idChoice('Client'),
  projectId: optionalId,
  platform: choice('Platform'),
  fee: amount('Agreed fee', { required: true, allowZero: true }),
  deliverables: z.string().trim().min(1, 'Deliverables are required.').max(2000, 'Deliverables must be 2000 characters or fewer.'),
  startDate: ymd('Start date'),
  endDate: ymd('End date'),
  notes: z.string().trim().max(2000, 'Notes must be 2000 characters or fewer.').optional().default(''),
}).refine((v) => !(isRealYmd(v.startDate) && isRealYmd(v.endDate)) || v.endDate >= v.startDate, {
  message: 'The end date cannot be earlier than the start date.', path: ['endDate'],
});
export type InfluencerFormValues = z.input<typeof influencerSchema>;

/* ── MK-004.6 Export filters ───────────────────────────────────────────────── */

/** Dates are OPTIONAL here — no range means "all dates", which is a valid
 *  report, not a missing field. Only an out-of-order pair is an error. */
export const exportFilterSchema = z.object({
  clientId: idChoice('Client'),
  from: z.string().trim().refine((v) => v === '' || isRealYmd(v), 'Enter a valid start date.').optional().default(''),
  to: z.string().trim().refine((v) => v === '' || isRealYmd(v), 'Enter a valid end date.').optional().default(''),
}).refine((v) => !(v.from && v.to) || v.to >= v.from, {
  message: 'The end date cannot be earlier than the start date.', path: ['to'],
});
export type ExportFilterValues = z.input<typeof exportFilterSchema>;

/* ── MK-004.3 Decision ─────────────────────────────────────────────────────── */

export const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(1000, 'Reason must be 1000 characters or fewer.').optional().default(''),
}).refine((v) => v.decision !== 'rejected' || !!v.note, {
  // A rejection has to tell the submitter what to fix.
  message: 'A reason is required when rejecting.', path: ['note'],
});

/** Admin thresholds. Zero is allowed: it means "every expense needs approval". */
export const thresholdSchema = z.object({
  approvalThreshold: amount('Approval threshold', { allowZero: true }),
  largeExpenseThreshold: amount('Large expense threshold', { allowZero: true }),
});
