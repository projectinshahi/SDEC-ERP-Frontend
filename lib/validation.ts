/**
 * Shared validation & sanitization utilities for form fields.
 *
 * Used by CreateLeadModal, DealFormModal and any other form that needs
 * consistent text validation. All helpers are pure functions — no side effects.
 */

// ── Sanitization ─────────────────────────────────────────────────────────────

/** Trim leading/trailing whitespace and collapse multiple consecutive spaces. */
export function sanitizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

// ── Predicate Helpers ────────────────────────────────────────────────────────

/** True when the string is empty or contains only whitespace / tabs / newlines. */
export function isWhitespaceOnly(value: string): boolean {
  return /^\s*$/.test(value);
}

/** True when the string contains ONLY digits (no letters at all). */
export function isNumbersOnly(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

/** True when the string contains NO alphabetic character at all. */
export function hasNoAlpha(value: string): boolean {
  return !/[a-zA-Z]/.test(value);
}

// ── Field Validators ─────────────────────────────────────────────────────────
// Each returns an error message string or `undefined` when valid.

/**
 * Validate a "name" field (Lead Name, Deal Name, Contact Name, Company, etc.).
 * Rules:
 *  - Required (non-empty after trim)
 *  - Cannot be whitespace-only
 *  - Must contain at least one alphabetic character
 *  - Cannot be numbers-only or symbols-only
 *  - Max length
 */
export function validateName(
  value: string,
  fieldLabel: string,
  opts: { required?: boolean; maxLength?: number } = {},
): string | undefined {
  const { required = true, maxLength = 200 } = opts;
  const trimmed = sanitizeText(value);

  if (!trimmed) {
    return required ? `${fieldLabel} is required.` : undefined;
  }
  if (isWhitespaceOnly(value)) {
    return `${fieldLabel} cannot contain only spaces.`;
  }
  if (isNumbersOnly(trimmed)) {
    return `${fieldLabel} cannot contain only numbers.`;
  }
  if (hasNoAlpha(trimmed)) {
    return `${fieldLabel} must contain at least one letter.`;
  }
  if (trimmed.length > maxLength) {
    return `${fieldLabel} must be ${maxLength} characters or fewer.`;
  }
  return undefined;
}

/**
 * Validate a generic optional text field (industry, address, website, etc.).
 * Only checked when a value is provided.
 */
export function validateTextField(
  value: string,
  fieldLabel: string,
  opts: { maxLength?: number } = {},
): string | undefined {
  const { maxLength = 500 } = opts;
  const trimmed = value.trim();

  if (!trimmed) return undefined; // optional — empty is fine
  if (isWhitespaceOnly(value)) {
    return `${fieldLabel} cannot contain only spaces.`;
  }
  if (trimmed.length > maxLength) {
    return `${fieldLabel} must be ${maxLength} characters or fewer.`;
  }
  return undefined;
}

/**
 * Validate a notes / description textarea.
 * Allows normal sentences, rejects whitespace-only, enforces max length.
 */
export function validateLongText(
  value: string,
  fieldLabel: string,
  opts: { maxLength?: number } = {},
): string | undefined {
  const { maxLength = 5000 } = opts;
  const trimmed = value.trim();

  if (!trimmed) return undefined; // optional
  if (isWhitespaceOnly(value)) {
    return `${fieldLabel} cannot contain only spaces.`;
  }
  if (trimmed.length > maxLength) {
    return `${fieldLabel} must be ${maxLength} characters or fewer.`;
  }
  return undefined;
}

/** Validate an email address. */
export function validateEmail(
  value: string,
  fieldLabel = 'Email',
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined; // optional unless checked elsewhere
  // Reject obvious bad patterns: double @, leading/trailing dots, no TLD
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return `Please enter a valid ${fieldLabel.toLowerCase()} address.`;
  }
  if (trimmed.includes('..') || trimmed.includes('@@')) {
    return `Please enter a valid ${fieldLabel.toLowerCase()} address.`;
  }
  return undefined;
}

/** Validate a phone number. Digits with optional +, spaces, dashes, parens. */
export function validatePhone(
  value: string,
  fieldLabel = 'Phone number',
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined; // optional unless checked elsewhere
  if (!/^[+\d][\d\s().-]*$/.test(trimmed)) {
    return `${fieldLabel} is invalid.`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return `${fieldLabel} must have between 7 and 15 digits.`;
  }
  return undefined;
}

/**
 * Validate a numeric amount field (Deal Value, Lead Value).
 * Returns an error if the value is non-numeric or negative.
 */
export function validateAmount(
  value: string,
  fieldLabel: string,
  opts: { allowZero?: boolean } = {},
): string | undefined {
  const { allowZero = true } = opts;
  const trimmed = value.trim();
  if (!trimmed) return undefined; // optional unless checked elsewhere

  const num = Number(trimmed);
  if (isNaN(num)) {
    return `${fieldLabel} must be a valid number.`;
  }
  if (num < 0) {
    return `${fieldLabel} cannot be negative.`;
  }
  if (!allowZero && num === 0) {
    return `${fieldLabel} must be greater than 0.`;
  }
  return undefined;
}

/**
 * Scroll to + focus the first field the form just marked invalid.
 *
 * Reads the DOM rather than taking an error-key→element-id map: the shared
 * InputField / SelectField / TextareaField already set `aria-invalid` from their
 * `error` prop, so any field added later is covered with no extra wiring.
 *
 * Call it right after `setErrors(...)` when validation fails — the rAF waits for
 * React to paint the error state before querying.
 *
 * `container` scopes the search to one form, so a modal never steals focus from
 * an invalid field on the page behind it.
 */
export function focusFirstInvalid(container?: HTMLElement | null): void {
  requestAnimationFrame(() => {
    const root: ParentNode = container ?? document;
    const el = root.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!el) return;
    // Centre it, then focus without letting the browser re-scroll (jumpy on iOS).
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  });
}
