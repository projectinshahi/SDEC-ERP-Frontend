/**
 * The ONE place the Pipeline's working context is retained (CR-11/12/13).
 *
 * Split of responsibilities — deliberately not a second state store:
 *  • The FILTERS live in the URL query string (owner, stage, search, view, …),
 *    written by the Pipeline page's sync effect. That is what survives a browser
 *    refresh, a bookmark and a shared link, and it stays the single source of
 *    truth for what is filtered.
 *  • This module only remembers, per tab, what a URL cannot carry across a
 *    navigation *away* from the list: the query string to come back to, the
 *    on-screen lead order (for Details' Previous/Next), and the scroll offset.
 *
 * So "return from Details", "refresh", "after save/edit" and "back to the module"
 * are all served by the same mechanism rather than four separate ones.
 *
 * sessionStorage: per tab, survives reloads, gone when the tab closes.
 *
 * ponytail: a plain snapshot, not a cached dataset. If leads change while the
 * user is away the order can go stale until the list refetches — fine for a
 * navigation aid, and the list always refetches on return.
 */
const KEY = 'pipeline:state';

export interface PipelineState {
  /** Ids in on-screen order — powers Previous/Next on Lead Details. */
  ids: number[];
  /** The list's query string, e.g. "?view=table&owner=7". Includes the leading "?". */
  search: string;
  /** Vertical scroll offset of the list when the user navigated away. */
  scrollY: number;
  /** Lead the user was actually looking at (top-most visible row/card), and how
   *  far below the container's top edge it sat. Restoring by CONTENT beats
   *  restoring by pixels: it survives rows changing height after an edit, and it
   *  still lands sensibly if the lead moved position under the current sort. */
  anchorId: number | null;
  anchorOffset: number;
}

const EMPTY: PipelineState = { ids: [], search: '', scrollY: 0, anchorId: null, anchorOffset: 0 };

export function readPipelineState(): PipelineState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PipelineState>;
    return {
      // `n > 0` matters: a stray '' would Number() to 0 and become a bogus lead id.
      ids: Array.isArray(parsed.ids) ? parsed.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [],
      search: typeof parsed.search === 'string' ? parsed.search : '',
      scrollY: Number.isFinite(parsed.scrollY) ? Number(parsed.scrollY) : 0,
      anchorId: Number.isInteger(parsed.anchorId) && Number(parsed.anchorId) > 0 ? Number(parsed.anchorId) : null,
      anchorOffset: Number.isFinite(parsed.anchorOffset) ? Number(parsed.anchorOffset) : 0,
    };
  } catch {
    return EMPTY;
  }
}

/** Merges, so the order/query and the scroll offset can be written independently. */
export function savePipelineState(patch: Partial<PipelineState>): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...readPipelineState(), ...patch }));
  } catch {
    // Private mode / quota — retention is a convenience, never break the page.
  }
}

/** Where the Pipeline list should be re-entered, filters and view included. */
export function pipelineListHref(): string {
  return `/dashboard/sales/pipeline${readPipelineState().search}`;
}

/**
 * The element that ACTUALLY scrolls the page content.
 *
 * The dashboard shell is `h-screen` with an `overflow-hidden` column and a single
 * `<main className="flex-1 overflow-y-auto">` — so the document/body never scroll.
 * `window.scrollY` is permanently 0 there and `window.scrollTo()` is a no-op, which
 * is why reading/writing window scroll silently did nothing and the list always
 * came back at the top.
 *
 * Walks up from `el` to the nearest genuinely scrollable ancestor instead of
 * hard-coding `<main>`, so this keeps working if the shell (or a different mobile
 * shell) changes. Returns null when the window really is the scroller.
 */
export function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  if (typeof window === 'undefined') return null;
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node && node !== document.body && node !== document.documentElement) {
    const oy = window.getComputedStyle(node).overflowY;
    // Match on the OVERFLOW STYLE ALONE. An earlier version also required
    // `scrollHeight > clientHeight`, i.e. that the element was ALREADY scrollable.
    // This resolver runs as soon as the page mounts — before the leads fetch
    // resolves — when <main> still holds only the header/filters and therefore
    // does NOT overflow. The check failed, this returned null, the caller fell
    // back to `window`, and every subsequent scroll of <main> went unrecorded
    // (window never scrolls in this shell), so a 0 offset was saved and the list
    // always reopened at the top. Overflow style is stable from first paint.
    if (oy === 'auto' || oy === 'scroll') return node;
    node = node.parentElement;
  }
  return null; // window / documentElement scrolls
}

/** Current offset of whichever element scrolls. */
export function getScrollTop(sc: HTMLElement | null): number {
  return sc ? sc.scrollTop : (typeof window === 'undefined' ? 0 : window.scrollY);
}

/** Max scrollable offset of whichever element scrolls. */
export function getMaxScroll(sc: HTMLElement | null): number {
  if (sc) return Math.max(0, sc.scrollHeight - sc.clientHeight);
  if (typeof window === 'undefined') return 0;
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

/** Jump (never smooth) to `top` on whichever element scrolls. */
export function setScrollTop(sc: HTMLElement | null, top: number): void {
  if (sc) sc.scrollTop = top;
  else if (typeof window !== 'undefined') window.scrollTo(0, top);
}

/** Every rendered lead row/card tags itself with this so the anchor can be found. */
export const LEAD_ANCHOR_ATTR = 'data-lead-id';

/**
 * The lead currently sitting at the top of the visible area, plus its offset from
 * the container's top edge. Read from the DOM (not from React state) so it always
 * reflects what the user can actually see.
 */
export function readAnchor(sc: HTMLElement | null): { anchorId: number | null; anchorOffset: number } {
  if (typeof document === 'undefined') return { anchorId: null, anchorOffset: 0 };
  const containerTop = sc ? sc.getBoundingClientRect().top : 0;
  const nodes = document.querySelectorAll<HTMLElement>(`[${LEAD_ANCHOR_ATTR}]`);
  let best: { id: number; delta: number } | null = null;
  for (const node of nodes) {
    const id = Number(node.getAttribute(LEAD_ANCHOR_ATTR));
    if (!Number.isInteger(id) || id <= 0) continue;
    const delta = node.getBoundingClientRect().top - containerTop;
    // The first row at/below the top edge wins; if everything is above it (scrolled
    // past the end) keep the closest one, so an anchor is always recorded.
    if (delta >= 0) { if (!best || delta < best.delta || best.delta < 0) best = { id, delta }; }
    else if (!best) best = { id, delta };
  }
  return best ? { anchorId: best.id, anchorOffset: best.delta } : { anchorId: null, anchorOffset: 0 };
}

/**
 * Scroll so `anchorId` sits `anchorOffset` below the container's top edge again.
 * Returns false when that lead is not on screen (deleted, or filtered out after an
 * edit) so the caller can fall back to the pixel offset instead of doing nothing.
 */
export function restoreToAnchor(sc: HTMLElement | null, anchorId: number, anchorOffset: number): boolean {
  if (typeof document === 'undefined') return false;
  const node = document.querySelector<HTMLElement>(`[${LEAD_ANCHOR_ATTR}="${anchorId}"]`);
  if (!node) return false;
  const containerTop = sc ? sc.getBoundingClientRect().top : 0;
  const current = node.getBoundingClientRect().top - containerTop;
  const target = getScrollTop(sc) + (current - anchorOffset);
  setScrollTop(sc, Math.max(0, Math.min(target, getMaxScroll(sc))));
  return true;
}

/**
 * Do two query strings describe the SAME filtered view? Compared as parameter
 * sets, not raw text, so a re-ordered/re-serialised query ("?owner=7&view=table"
 * vs "?view=table&owner=7") still counts as the same view. A raw !== compare made
 * scroll restoration silently skip whenever the list's URL-sync effect rewrote the
 * parameters in a different order than they were saved in.
 */
export function sameQuery(a: string, b: string): boolean {
  const norm = (s: string) =>
    [...new URLSearchParams(s.startsWith('?') ? s.slice(1) : s).entries()]
      .sort(([k1, v1], [k2, v2]) => k1.localeCompare(k2) || v1.localeCompare(v2))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
  return norm(a) === norm(b);
}

/**
 * Neighbours of `id` within the remembered order. Both null when the id isn't in
 * the list (opened directly, or filtered out since), so the caller hides the controls.
 */
export function pipelineNeighbours(order: number[], id: number) {
  const i = order.indexOf(id);
  if (i === -1) return { prev: null, next: null, position: 0, total: order.length };
  return {
    prev: i > 0 ? order[i - 1] : null,
    next: i < order.length - 1 ? order[i + 1] : null,
    position: i + 1,
    total: order.length,
  };
}
