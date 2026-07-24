/**
 * Stage Transition config — SINGLE SOURCE OF TRUTH for every Pipeline transition.
 *
 * Each transition registers its own checklist (and, optionally, a custom label for the
 * multi-line notes box — e.g. "Hold Reason"). Config is keyed by `${fromStage}->${toStage}`
 * with a `*->${toStage}` (any-source) fallback, then nothing. The Stage Transition Dialog is
 * fully generic: it reads `getStageChecklist` + `getStageNotesLabel` and never contains
 * per-stage conditionals. To add / change a transition, edit THIS file only.
 *
 * Nothing here is enforced (all items optional; the notes box is always the same underlying
 * Description storage). The `required` flag is reserved so a future version can add mandatory
 * checks / conditional items / approvals WITHOUT touching the dialog. Funnel:
 * NQL → MQL → SQL → PQL → SAL → WON / HOLD / LOST.
 */

export interface StageChecklistItem {
  /** Stable key (unchanging) — drives selection state; the LABEL is what gets stored. */
  id: string;
  label: string;
  /** FUTURE-READY: not enforced in this version. */
  required?: boolean;
}

export interface StageTransitionConfig {
  checklist: StageChecklistItem[];
  /** Custom label for the notes field (reuses the SAME Description storage). */
  notesLabel?: string;
}

/** Default label for the multi-line notes / description field. */
export const DEFAULT_NOTES_LABEL = 'Notes / Description';

const TRANSITIONS: Record<string, StageTransitionConfig> = {
  // ── Stage 1 · NQL → MQL ──────────────────────────────────────────────────
  'NQL->MQL': {
    checklist: [
      { id: 'contact_created', label: 'Contact Created' },
      { id: 'company_added', label: 'Company Added' },
      { id: 'meaningful_conversation', label: 'Meaningful Conversation Completed' },
      { id: 'followup_scheduled', label: 'Follow-up Scheduled' },
    ],
  },
  // ── Stage 2 · MQL → SQL ──────────────────────────────────────────────────
  'MQL->SQL': {
    checklist: [
      { id: 'founder_clevel_verified', label: 'Founder / C-Level Verified' },
      { id: 'budget_verified', label: 'Budget Verified' },
      { id: 'timeline_verified', label: 'Timeline Verified' },
      { id: 'discovery_meeting', label: 'Discovery Meeting Completed' },
      { id: 'requirement_notes_uploaded', label: 'Requirement Notes Uploaded' },
      { id: 'min_budget_confirmed', label: 'Minimum Budget ₹2,00,000 Confirmed' },
    ],
  },
  // ── Stage 3 · SQL → PQL ──────────────────────────────────────────────────
  'SQL->PQL': {
    checklist: [
      { id: 'brd_prepared', label: 'BRD Prepared' },
      { id: 'estimation_completed', label: 'Estimation Completed' },
      { id: 'sow_prepared', label: 'Scope of Work (SOW) Prepared' },
      { id: 'proposal_generated', label: 'Proposal Generated' },
      { id: 'proposal_sent_email', label: 'Proposal Sent via Email' },
    ],
  },
  // ── Stage 4 · PQL → SAL ──────────────────────────────────────────────────
  'PQL->SAL': {
    checklist: [
      { id: 'client_discussion', label: 'Client Discussion Completed' },
      { id: 'proposal_revised', label: 'Proposal Revised (If Required)' },
      { id: 'final_scope_confirmed', label: 'Final Scope Confirmed' },
      { id: 'agreement_shared', label: 'Agreement Shared' },
    ],
  },
  // ── Stage 5 · SAL → WON ──────────────────────────────────────────────────
  'SAL->WON': {
    checklist: [
      { id: 'proposal_accepted', label: 'Proposal Accepted' },
      { id: 'agreement_signed', label: 'Agreement Signed / Confirmed' },
      { id: 'advance_or_po', label: 'Advance Payment Received (or PO Issued)' },
      { id: 'kickoff_approved', label: 'Project Kickoff Approved' },
    ],
  },
  // ── Stage 5 · → HOLD (any source). Notes field is relabelled "Hold Reason",
  //    but reuses the SAME Description storage — no separate field. ──────────
  '*->HOLD': {
    notesLabel: 'Hold Reason',
    checklist: [
      { id: 'client_requested_pause', label: 'Client Requested Pause' },
      { id: 'budget_delayed', label: 'Budget Delayed' },
      { id: 'decision_postponed', label: 'Decision Postponed' },
      { id: 'followup_date_scheduled', label: 'Follow-up Date Scheduled' },
    ],
  },
  // ── Stage 5 · → LOST (any source). Notes field is relabelled "Lost Reason",
  //    reusing the SAME Description storage. ─────────────────────────────────
  '*->LOST': {
    notesLabel: 'Lost Reason',
    checklist: [
      { id: 'client_rejected', label: 'Client Rejected Proposal' },
      { id: 'chose_other_vendor', label: 'Chose Another Vendor' },
      { id: 'budget_unavailable', label: 'Budget Unavailable' },
      { id: 'no_response', label: 'No Response After Multiple Follow-ups' },
      { id: 'permanently_closed', label: 'Opportunity Permanently Closed' },
    ],
  },
  // WON / HOLD / LOST as a SOURCE have no configured checklist — moving a terminal
  // opportunity again simply shows the notes box (unless a `WON->x` entry is added here).
};

const resolve = (from: string, to: string): StageTransitionConfig | undefined =>
  TRANSITIONS[`${from}->${to}`] ?? TRANSITIONS[`*->${to}`];

/** Resolve the checklist for a transition: exact `from->to`, else `*->to`, else none. */
export function getStageChecklist(fromStage: string, toStage: string): StageChecklistItem[] {
  return resolve(fromStage, toStage)?.checklist ?? [];
}

/** Resolve the notes-field label for a transition (e.g. "Hold Reason"); default otherwise. */
export function getStageNotesLabel(fromStage: string, toStage: string): string {
  return resolve(fromStage, toStage)?.notesLabel ?? DEFAULT_NOTES_LABEL;
}
