'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { HrDocument, HrDocumentType } from './documents.types';
import {
  fetchDocuments,
  createDocument,
  updateDocumentStatus,
  deleteDocument,
  ApiHrDocument,
  SaveDocumentPayload,
} from '../api/hr-documents';
import { fetchEmployees, ApiEmployee } from '../api/hr';

export function adaptDocumentRecord(d: ApiHrDocument): HrDocument {
  const isExpired = d.expiry_date ? new Date(d.expiry_date) < new Date() : false;
  const status: HrDocument['status'] = isExpired ? 'Expired' : (d.status as HrDocument['rawStatus']);

  return {
    id: String(d.id),
    employeeId: d.employee_id,
    employeeCode: d.employee_code ?? '',
    employeeName: d.employee_name ?? '',
    designation: d.designation ?? '',
    documentType: d.document_type as HrDocumentType,
    fileUrl: d.file_url,
    fileName: d.file_name,
    expiryDate: d.expiry_date,
    status,
    rawStatus: d.status as HrDocument['rawStatus'],
    notes: d.notes,
    verifiedBy: d.verified_by,
    verifiedByName: d.verified_by_name,
    verifiedAt: d.verified_at,
    createdAt: d.created_at,
  };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<ApiHrDocument[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modals visibility
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [docsData, employeesData] = await Promise.all([
        fetchDocuments(),
        fetchEmployees(),
      ]);
      setDocuments(docsData);
      setEmployees(employeesData);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'Failed to load documents data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived adapted documents
  const records = useMemo(() => {
    return documents.map(adaptDocumentRecord);
  }, [documents]);

  // Filtered documents list
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch =
        r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        r.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        r.designation.toLowerCase().includes(search.toLowerCase()) ||
        r.fileName.toLowerCase().includes(search.toLowerCase());

      const matchesType = filterType === 'All' || r.documentType === filterType;
      const matchesStatus = filterStatus === 'All' || r.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [records, search, filterType, filterStatus]);

  // Compute live high-fidelity analytics stats
  const stats = useMemo(() => {
    const totalCount = records.length;
    const pendingCount = records.filter(r => r.rawStatus === 'Pending' && r.status !== 'Expired').length;
    const verifiedCount = records.filter(r => r.rawStatus === 'Verified' && r.status !== 'Expired').length;

    // Expiring Soon: status is Verified or Pending, and expiryDate is within 30 days from today (and not already expired)
    const today = new Date();
    const thirtyDaysFromToday = new Date();
    thirtyDaysFromToday.setDate(today.getDate() + 30);

    const expiringSoonCount = records.filter(r => {
      if (r.status === 'Expired' || !r.expiryDate) return false;
      const expiry = new Date(r.expiryDate);
      return expiry >= today && expiry <= thirtyDaysFromToday;
    }).length;

    return {
      totalCount,
      pendingCount,
      verifiedCount,
      expiringSoonCount,
    };
  }, [records]);

  // Create document
  const handleSaveDocument = async (payload: SaveDocumentPayload) => {
    try {
      await createDocument(payload);
      setIsUploadOpen(false);
      await loadData();
    } catch (err: any) {
      throw new Error(err?.response?.data?.message ?? err?.message ?? 'Failed to upload document');
    }
  };

  // Verify / Reject Status directly
  const handleStatusChange = async (recordId: string, status: 'Verified' | 'Rejected') => {
    try {
      const id = Number(recordId);
      if (isNaN(id)) return;
      await updateDocumentStatus(id, status);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? err?.message ?? 'Failed to update document status');
    }
  };

  // Delete document record
  const handleDeleteDocument = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this document record?')) return;
    try {
      const id = Number(recordId);
      if (isNaN(id)) return;
      await deleteDocument(id);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? err?.message ?? 'Failed to delete document record');
    }
  };

  const handleOpenUpload = () => {
    setIsUploadOpen(true);
  };

  const handleCloseUpload = () => {
    setIsUploadOpen(false);
  };

  return {
    records,
    filteredRecords,
    employees,
    stats,
    isLoading,
    error,
    search,
    setSearch,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    isUploadOpen,
    handleSaveDocument,
    handleStatusChange,
    handleDeleteDocument,
    handleOpenUpload,
    handleCloseUpload,
    refresh: loadData,
  };
}
