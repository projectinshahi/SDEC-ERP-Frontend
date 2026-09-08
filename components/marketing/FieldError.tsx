'use client';

/**
 * M11 #51 — the single inline field-error renderer for the Content module.
 *
 * Uses the module's existing rose error tone and `text-xs font-medium` sizing,
 * so it matches the errors the Create Content modal already showed. Renders
 * nothing when there is no message, and carries `role="alert"` so the error is
 * announced rather than communicated by colour alone.
 */
export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-rose-600">
      {message}
    </p>
  );
}
