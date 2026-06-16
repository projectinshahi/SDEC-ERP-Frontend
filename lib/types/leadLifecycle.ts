/**
 * Lead Lifecycle domain types (frontend): history, disqualification, conversion,
 * aging, deals and deal stages, and import preview.
 */

export interface HistoryEntry {
  kind: 'interaction' | 'note' | 'follow_up' | 'reminder_completed';
  type: string; // Call | Email | Meeting | Note | Follow-up Task | Reminder Completed
  author: string | null;
  timestamp: string;
  notes: string | null;
}

export type AgingFlag = 'Needs Attention' | 'At Risk' | 'No Activity';

export interface AgingLead {
  id: number;
  title: string;
  company: string | null;
  owner: string;
  ownerId: number;
  stage: string;
  lastActivityAt: string;
  daysSinceLastActivity: number;
  flag: AgingFlag;
}

export interface AgingReport {
  thresholdDays: number;
  count: number;
  leads: AgingLead[];
}

export interface DealStage {
  id: number;
  name: string;
  orderIndex: number;
  isDefault: boolean;
}

export interface DealOwner {
  id: number;
  name: string;
  email: string;
}

export interface Deal {
  id: number;
  title: string;
  amount: number;
  status: string;
  stage: string;
  orderIndex: number;
  source?: string | null;
  notes?: string | null;
  leadId?: number | null;
  customerId: number;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  owner?: DealOwner | null;
  customer?: { id: number; name: string; company?: string | null } | null;
  lead?: { id: number; title: string } | null;
}

export type ImportValidity = 'valid' | 'invalid' | 'duplicate';

export interface ImportPreviewRow {
  rowNumber: number;
  title: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  validity: ImportValidity;
  error: string | null;
}

export interface ImportPreview {
  headers: string[];
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  rows: ImportPreviewRow[];
}

export interface ImportResult {
  total: number;
  imported: number;
  created: number;
  failed: number;
  skipped: number;
  duplicates: number;
  flagged: number;
  errors: { row: number; error: string }[];
}

/** Target lead fields that import columns can be mapped to. */
export type ImportFieldKey =
  | 'title' | 'name' | 'company' | 'email' | 'phone' | 'website' | 'description' | 'source' | 'status' | 'priority';

export type ImportMapping = Partial<Record<ImportFieldKey, string>>;
