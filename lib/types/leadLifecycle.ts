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
  currency?: string | null;
  status: string;
  stage: string;
  probability?: number | null;
  expectedCloseDate?: string | null;
  orderIndex: number;
  source?: string | null;
  notes?: string | null;
  description?: string | null;
  leadId?: number | null;
  customerId: number;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  owner?: DealOwner | null;
  customer?: { id: number; name: string; company?: string | null } | null;
  lead?: { id: number; title: string } | null;
  linkedProject?: { id: string; name: string; status: string } | null;
}

// ── Deal Details (360° view) ────────────────────────────────────────────────

export interface DealActivityLog {
  id: number;
  type: string;
  description: string;
  created_at: string;
  actor?: { id: number; name: string } | null;
}

export interface DealLinkedLead {
  id: number;
  title: string;
  status?: string | null;
  stage?: string | null;
  customer?: { id: number; name: string; company?: string | null; email?: string | null; phone?: string | null } | null;
}

export interface DealNote {
  id: number;
  content: string;
  authorId?: number;
  author?: { id: number; name: string; email?: string } | null;
  createdAt: string;
  updatedAt: string;
}

/** Full deal payload from GET /sales/deals/:id (getDealById). */
export interface DealDetail extends Deal {
  industry?: string | null;
  lead?: DealLinkedLead | null;
  customer?: {
    id: number; name: string; company?: string | null; email?: string | null;
    phone?: string | null; website?: string | null; address?: string | null; industry?: string | null;
  } | null;
  activityLogs?: DealActivityLog[];
  linkedProject?: { id: string; name: string; status: string } | null;
  weightedRevenue?: number;
}

export type ImportValidity = 'valid' | 'invalid' | 'duplicate';

export interface ImportPreviewRow {
  rowNumber: number;
  title: string;
  name?: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  salesperson?: string;
  expectedRevenue?: string;
  stage?: string;
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
  | 'title' | 'name' | 'company' | 'email' | 'phone' | 'website' | 'description' | 'source' | 'status' | 'priority'
  // CRM import template fields ('temperature' = the "Lead Status" column):
  | 'salesperson' | 'expectedRevenue' | 'stage' | 'temperature';

export type ImportMapping = Partial<Record<ImportFieldKey, string>>;
