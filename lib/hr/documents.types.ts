export type HrDocumentType =
  | 'Identity Proof'
  | 'Address Proof'
  | 'Employment Contract'
  | 'Degree Certificate'
  | 'Tax Form'
  | 'Other';

export const HR_DOCUMENT_TYPES: HrDocumentType[] = [
  'Identity Proof',
  'Address Proof',
  'Employment Contract',
  'Degree Certificate',
  'Tax Form',
  'Other',
];

export interface HrDocument {
  id: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  designation: string;
  documentType: HrDocumentType;
  fileUrl: string;
  fileName: string;
  expiryDate: string | null;
  status: 'Pending' | 'Verified' | 'Rejected' | 'Expired'; // Expired is calculated in memory
  rawStatus: 'Pending' | 'Verified' | 'Rejected'; // actual database status
  notes: string | null;
  verifiedBy: number | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  createdAt: string;
}
