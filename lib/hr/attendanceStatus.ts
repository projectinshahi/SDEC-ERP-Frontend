// ─────────────────────────────────────────────────────────────────────────────
// Attendance status — PRESENTATION-LAYER helpers.
// Derives the richer status badges (morning lateness, late-after-lunch) purely
// from the times already returned by the API. The backend `status` field and
// its thresholds are the source of truth and are NOT modified here — these
// mirror the same thresholds the backend uses (check-in 10:00 AM, lunch return
// 02:00 PM) so the UI never contradicts the stored status.
// ─────────────────────────────────────────────────────────────────────────────

import { AttendanceRecord, AttendanceStatus } from './attendance.types';

const OFFICE_CHECKIN_MINUTES = 10 * 60; // 10:00 AM
const LUNCH_RETURN_MINUTES = 14 * 60;   // 02:00 PM

/** "10:11 AM" | "02:05 PM" → minutes since midnight, or null if unparseable. */
function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3].toUpperCase();
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

/** Minutes late past the 10:00 AM office check-in (0 when on-time or missing). */
export function lateCheckinMinutes(morningIn: string | null | undefined): number {
  const mins = timeToMinutes(morningIn);
  if (mins == null) return 0;
  return Math.max(0, mins - OFFICE_CHECKIN_MINUTES);
}

/** Duration-only label: "11 min" / "1h 5m" / "1h". Composed into the badge
 *  text (e.g. "Morning Late …") so a label never doubles the word "Late". */
export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Minutes late past the 02:00 PM lunch return (0 when on-time or missing). */
export function afterLunchLateMinutes(lunchIn: string | null | undefined): number {
  const mins = timeToMinutes(lunchIn);
  if (mins == null) return 0;
  return Math.max(0, mins - LUNCH_RETURN_MINUTES);
}

export interface AttendanceBadge {
  /** Drives the colour (reuses AttendanceStatusBadge's tone map). */
  status: AttendanceStatus;
  /** Display text; falls back to `status` when omitted. */
  label?: string;
}

/**
 * The badge set for one attendance row.
 *  - Full-day leave → single leave badge, no late badge.
 *  - Half-day leave → the leave-half badge ("First/Second Half Leave") plus, for
 *    the WORKING half, a late badge if applicable. The leave half's late badge is
 *    suppressed. A legacy/unknown half shows generic "Half Day Leave" and, since
 *    the session is unknown, suppresses BOTH late badges (never guesses).
 *  - Absent → the Absent badge.
 *  - Working day → morning-lateness and/or late-after-lunch (both when both apply);
 *    if neither, the Present badge.
 * Presentation-only: the underlying `record.status` (filters/sorting/summaries)
 * is untouched.
 */
export function attendanceBadges(record: AttendanceRecord): AttendanceBadge[] {
  // Full-day leave (and generic leave statuses) → single badge, never late.
  if (record.status === 'Full Day Leave' || record.status === 'On Leave') {
    return [{ status: record.status }];
  }

  // Half-day leave → suppress the leave half; evaluate the working half.
  if (record.status === 'Half Day Leave' || record.status === 'Half Day') {
    const badges: AttendanceBadge[] = [];
    if (record.leaveHalf === 'first_half') {
      // Morning is leave → suppress Morning Late; evaluate afternoon arrival.
      badges.push({ status: 'Half Day Leave', label: 'First Half Leave' });
      const afterLunchMins = afterLunchLateMinutes(record.lunchIn);
      if (afterLunchMins > 0) {
        badges.push({ status: 'Late After Lunch', label: `After Lunch Late ${formatDuration(afterLunchMins)}` });
      }
    } else if (record.leaveHalf === 'second_half') {
      // Afternoon is leave → suppress After Lunch Late; evaluate morning arrival.
      badges.push({ status: 'Half Day Leave', label: 'Second Half Leave' });
      const morningLateMins = lateCheckinMinutes(record.morningIn);
      if (morningLateMins > 0) {
        badges.push({ status: 'Late', label: `Morning Late ${formatDuration(morningLateMins)}` });
      }
    } else {
      // Legacy/unknown session → generic badge, no guessed late suppression.
      badges.push({ status: 'Half Day Leave', label: 'Half Day Leave' });
    }
    return badges;
  }

  if (record.status === 'Absent') return [{ status: 'Absent' }];

  // Normal working day.
  const badges: AttendanceBadge[] = [];
  const morningLateMins = lateCheckinMinutes(record.morningIn);
  if (morningLateMins > 0) {
    badges.push({ status: 'Late', label: `Morning Late ${formatDuration(morningLateMins)}` });
  }
  const afterLunchMins = afterLunchLateMinutes(record.lunchIn);
  if (afterLunchMins > 0) {
    badges.push({ status: 'Late After Lunch', label: `After Lunch Late ${formatDuration(afterLunchMins)}` });
  }
  if (badges.length === 0) badges.push({ status: 'Present' });
  return badges;
}

/**
 * For a half-day-leave row, whether the WORKING half has actual punch data.
 * first_half works the afternoon (lunchIn/checkOut); second_half works the
 * morning (morningIn/lunchOut); unknown-legacy counts any punch.
 */
export function hasWorkingHalfPunch(record: AttendanceRecord): boolean {
  if (record.leaveHalf === 'first_half') return !!(record.lunchIn || record.checkOut);
  if (record.leaveHalf === 'second_half') return !!(record.morningIn || record.lunchOut);
  return !!(record.morningIn || record.lunchOut || record.lunchIn || record.checkOut);
}

/**
 * Whether this row is a morning "Late Arrival" (check-in after 10:00 AM),
 * leave-aware: full-day and first-half leave are never morning-late.
 */
export function isMorningLateArrival(record: AttendanceRecord): boolean {
  if (record.status === 'Full Day Leave' || record.status === 'On Leave') return false;
  if (record.leaveHalf === 'first_half') return false;
  return lateCheckinMinutes(record.morningIn) > 0;
}
