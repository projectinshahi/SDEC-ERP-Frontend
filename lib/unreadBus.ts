/**
 * Client-side event bus for the sidebar unread indicators.
 *
 * The "disappear immediately on read" requirement is same-session: when the user opens a
 * task or notice, the read wrapper marks it read AND dispatches this event, so the shared
 * UnreadIndicators context re-fetches its counts at once — no polling and no extra backend
 * signal. New/unread activity from OTHER users still arrives via the existing Socket.IO
 * events (mytask_changed / notice_changed). Debounced on the listener side.
 */
export const UNREAD_REFRESH_EVENT = 'unread:refresh';

export function notifyUnreadRefresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(UNREAD_REFRESH_EVENT));
  }
}
