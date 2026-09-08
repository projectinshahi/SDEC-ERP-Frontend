/**
 * M11 #51 — THE shared client-side validation for the Content module.
 *
 * These rules MIRROR the backend validators (contentCard / contentProduction /
 * contentPublishing / contentPerformance / contentReview). The server stays
 * authoritative — this exists so the user sees the problem next to the field
 * instead of after a round trip, and so every Content form applies the same
 * rule rather than each re-inventing it.
 */

export type FieldErrors = Record<string, string>;

/** `errors: [{ field, message }]` is the shape every Content endpoint returns. */
export interface ApiFieldError { field: string; message: string }

/**
 * Map a rejected API response onto field-level errors so a server-side failure
 * lands next to the offending input rather than only in a toast.
 * Returns `{}` when the response carries no field detail, letting the caller
 * fall back to its generic error message.
 */
export function fieldErrorsFromApi(err: unknown): FieldErrors {
  const details = (err as { details?: { errors?: ApiFieldError[] } } | null)?.details;
  const list = Array.isArray(details?.errors) ? details!.errors : [];
  const out: FieldErrors = {};
  for (const e of list) {
    if (e && typeof e.field === 'string' && typeof e.message === 'string' && !out[e.field]) {
      out[e.field] = e.message;
    }
  }
  return out;
}

/* ── field rules ───────────────────────────────────────────────────────────── */

export const requiredText = (value: string | null | undefined, label: string): string | undefined =>
  value && value.trim() ? undefined : `${label} is required`;

export const requiredChoice = (value: string | null | undefined, label: string): string | undefined =>
  value ? undefined : `${label} is required`;

export const requiredList = (value: unknown[] | null | undefined, label: string): string | undefined =>
  value && value.length ? undefined : `${label} is required`;

/**
 * http(s) URL check — the SAME rule `isValidUrl` applies on the server, so a
 * value accepted here is never rejected there for format.
 */
export function validUrl(value: string | null | undefined, label = 'URL'): string | undefined {
  const v = (value ?? '').trim();
  if (!v) return undefined;                    // emptiness is a separate rule
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return `${label} must start with http:// or https://`;
    }
    return undefined;
  } catch {
    return `Enter a valid ${label.toLowerCase()} (for example https://example.com/post)`;
  }
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function validDate(value: string | null | undefined, label: string): string | undefined {
  const v = (value ?? '').trim();
  if (!v) return undefined;
  return YMD.test(v) ? undefined : `${label} must be a valid date`;
}

/**
 * End-of-range must not precede the start. Both are 'YYYY-MM-DD' strings and are
 * compared as text — chronological for ISO dates, and immune to timezone shift.
 */
export function dateOrder(
  start: string | null | undefined,
  end: string | null | undefined,
  startLabel: string,
  endLabel: string,
): string | undefined {
  const a = (start ?? '').trim();
  const b = (end ?? '').trim();
  if (!YMD.test(a) || !YMD.test(b)) return undefined;   // only when BOTH are set
  return b < a ? `${endLabel} cannot be earlier than the ${startLabel}` : undefined;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validTime(value: string | null | undefined, label: string): string | undefined {
  const v = (value ?? '').trim();
  if (!v) return undefined;
  return HHMM.test(v) ? undefined : `${label} must be a valid time`;
}

/** Non-negative number. '' is "not entered", which is always allowed. */
export function nonNegativeNumber(value: unknown, label: string): string | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return `${label} must be a number`;
  if (n < 0) return `${label} cannot be negative`;
  return undefined;
}

/** Drop the `undefined` results so the caller gets only real errors. */
export function collect(entries: Record<string, string | undefined>): FieldErrors {
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(entries)) if (v) out[k] = v;
  return out;
}

export const hasErrors = (errors: FieldErrors): boolean => Object.keys(errors).length > 0;

/** Shared input classes for the invalid state — the module's existing rose tone. */
export const invalidInputCls = 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30';
