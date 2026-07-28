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
}

const EMPTY: PipelineState = { ids: [], search: '', scrollY: 0 };

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
