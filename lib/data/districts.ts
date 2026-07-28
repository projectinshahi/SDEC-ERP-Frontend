/**
 * Districts available on an Opportunity — the single source of truth for the
 * Create/Edit dropdowns, the Pipeline filter and the exported report.
 *
 * Maintaining the list = editing this ONE array. Values are stored verbatim on
 * `Lead.district`, so renaming an entry does NOT rewrite existing records: an
 * Opportunity keeps whatever string it was saved with (and still displays it).
 * Prefer appending; only rename when you also intend to leave old rows as-is.
 *
 * ponytail: a plain constant, not a `districts` lookup table + admin CRUD like
 * lead_stages. Promote it to DB-managed master data only when non-developers
 * need to edit the list themselves.
 */
export const DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
] as const;

/** Ready-made `SelectField` options (value === label — the stored string). */
export const DISTRICT_OPTIONS = DISTRICTS.map((d) => ({ value: d, label: d }));
