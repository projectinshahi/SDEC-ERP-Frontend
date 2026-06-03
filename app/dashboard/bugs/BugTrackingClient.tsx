'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { BugTable } from '@/components/bugs/BugTable';
import { BugFilters, type ActiveFilters } from '@/components/bugs/BugFilters';
import { BugModal } from '@/components/bugs/BugModal';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { Modal } from '@/components/Modal';
import { Plus, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Bug as BugType, BugQueryParams, BugPagination } from '@/lib/api/bugs';
import { getBugs, createBug, updateBug, deleteBug } from '@/lib/api/bugs';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import { useToast } from '@/lib/hooks/useToast';

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_FILTERS: ActiveFilters = {
  search:    '',
  status:    '',
  priority:  '',
  severity:  '',
  assignee:  '',
  startDate: '',
  endDate:   '',
  sortBy:    'createdAt',
  sortOrder: 'desc',
};

const PAGE_LIMIT = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────
function filtersFromSearchParams(sp: URLSearchParams): ActiveFilters {
  return {
    search:    sp.get('search')    ?? '',
    status:    sp.get('status')    ?? '',
    priority:  sp.get('priority')  ?? '',
    severity:  sp.get('severity')  ?? '',
    assignee:  sp.get('assignee')  ?? '',
    startDate: sp.get('startDate') ?? '',
    endDate:   sp.get('endDate')   ?? '',
    sortBy:    (sp.get('sortBy')   as BugQueryParams['sortBy'])    ?? 'createdAt',
    sortOrder: (sp.get('sortOrder') as BugQueryParams['sortOrder']) ?? 'desc',
  };
}

function filtersToQueryParams(filters: ActiveFilters, page: number): Record<string, string> {
  const out: Record<string, string> = {};
  (Object.entries(filters) as [keyof ActiveFilters, string][]).forEach(([k, v]) => {
    if (v) out[k] = v;
  });
  if (page > 1) out.page = String(page);
  return out;
}

export function BugTrackingClient() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // ── State ──────────────────────────────────────────────────────────────────
  const [bugs, setBugs]         = useState<BugType[]>([]);
  const [users, setUsers]       = useState<UserDbResponse[]>([]);
  const [pagination, setPagination] = useState<BugPagination>({
    total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 1,
  });
  const [filters, setFilters]   = useState<ActiveFilters>(() => filtersFromSearchParams(searchParams));
  const [page, setPage]         = useState(() => parseInt(searchParams.get('page') ?? '1', 10));
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingBug, setEditingBug]     = useState<BugType | null>(null);
  const [bugToDelete, setBugToDelete]   = useState<BugType | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // ── Sync URL → state when URL changes externally (back/forward) ────────────
  useEffect(() => {
    setFilters(filtersFromSearchParams(searchParams));
    setPage(parseInt(searchParams.get('page') ?? '1', 10));
  }, [searchParams]);

  // ── Push filter changes to URL ─────────────────────────────────────────────
  const pushToUrl = useCallback((nextFilters: ActiveFilters, nextPage: number) => {
    const params = new URLSearchParams(filtersToQueryParams(nextFilters, nextPage));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [router, pathname]);

  // ── Fetch bugs from API ────────────────────────────────────────────────────
  // const loadBugs = useCallback(async (f: ActiveFilters, p: number) => {
  //   setIsLoading(true);
  //   try {
  //     const params: BugQueryParams = {
  //       search:    f.search    || undefined,
  //       status:    f.status    || undefined,
  //       priority:  f.priority  || undefined,
  //       severity:  f.severity  || undefined,
  //       assignee:  f.assignee  || undefined,
  //       startDate: f.startDate || undefined,
  //       endDate:   f.endDate   || undefined,
  //       sortBy:    f.sortBy,
  //       sortOrder: f.sortOrder,
  //       page:      p,
  //       limit:     PAGE_LIMIT,
  //     };
  //     const result = await getBugs(params);
  //     setBugs(result?.bugs ?? []);
  //     setPagination(result?.pagination ?? { total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 1 });
  //   } catch (err: any) {
  //     console.error('Failed to load bugs:', err);
  //     toast('Failed to load bugs from database', 'error');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [toast]);
const loadBugs = useCallback(async (f: ActiveFilters, p: number) => {
  setIsLoading(true);

  try {
    const params: BugQueryParams = {
      search: f.search || undefined,
      status: f.status || undefined,
      priority: f.priority || undefined,
      severity: f.severity || undefined,
      assignee: f.assignee || undefined,
      startDate: f.startDate || undefined,
      endDate: f.endDate || undefined,
      sortBy: f.sortBy,
      sortOrder: f.sortOrder,
      page: p,
      limit: PAGE_LIMIT,
    };

    console.log('========== BUG FILTER DEBUG ==========');
    console.log('Filters State:', f);
    console.log('API Params:', params);

    const result = await getBugs(params);

    console.log('API Response:', result);
    console.log('Returned Bugs:', result?.bugs);
    console.log('Returned Count:', result?.bugs?.length);

    setBugs(result?.bugs ?? []);
    setPagination(
      result?.pagination ?? {
        total: 0,
        page: 1,
        limit: PAGE_LIMIT,
        totalPages: 1,
      }
    );
  } catch (err: any) {
    console.error('Failed to load bugs:', err);
    toast('Failed to load bugs from database', 'error');
  } finally {
    setIsLoading(false);
  }
}, [toast]);
  // Run whenever filters or page change
  useEffect(() => {
    loadBugs(filters, page);
  }, [filters, page, loadBugs]);

  // Load users once
  useEffect(() => {
    fetchUsers().then(setUsers).catch(console.error);
  }, []);

  // ── Filter Handlers ────────────────────────────────────────────────────────
  const handleFiltersChange = useCallback((updated: Partial<ActiveFilters>) => {
    const next = { ...filters, ...updated };
    setFilters(next);
    setPage(1);
    pushToUrl(next, 1);
  }, [filters, pushToUrl]);

  const handleClearAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    pushToUrl(DEFAULT_FILTERS, 1);
  }, [pushToUrl]);

  // ── Sort handler (column header clicks) ────────────────────────────────────
  const handleSort = useCallback((field: BugQueryParams['sortBy']) => {
    const nextOrder = filters.sortBy === field && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    handleFiltersChange({ sortBy: field, sortOrder: nextOrder });
  }, [filters, handleFiltersChange]);

  // ── Pagination handlers ────────────────────────────────────────────────────
  const goToPage = (p: number) => {
    setPage(p);
    pushToUrl(filters, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── CRUD Handlers ──────────────────────────────────────────────────────────
  const handleAddBug = async (data: Partial<BugType>) => {
    setIsSubmitting(true);
    try {
      await createBug(data);
      toast(`Bug "${data.title}" successfully reported!`, 'success');
      setIsModalOpen(false);
      loadBugs(filters, page);
    } catch (err: any) {
      console.error('Error creating bug:', err);
      toast('Failed to create bug', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBug = async (data: Partial<BugType>) => {
    if (!editingBug) return;
    setIsSubmitting(true);
    try {
      await updateBug(editingBug.id, data);
      toast(`Bug "${data.title}" successfully updated!`, 'success');
      setIsModalOpen(false);
      setEditingBug(null);
      loadBugs(filters, page);
    } catch (err: any) {
      console.error('Error updating bug:', err);
      toast('Failed to update bug', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBug  = (bug: BugType) => { setEditingBug(bug); setIsModalOpen(true); };
  const handleDeleteBug = (bugId: number) => {
    const bug = bugs.find((b) => b.id === bugId);
    if (bug) setBugToDelete(bug);
  };

  const handleConfirmDelete = async () => {
    if (!bugToDelete) return;
    setIsDeleting(true);
    try {
      await deleteBug(bugToDelete.id);
      toast(`Bug "${bugToDelete.title}" has been deleted.`, 'info');
      setBugToDelete(null);
      loadBugs(filters, page);
    } catch (err: any) {
      console.error('Error deleting bug:', err);
      toast('Failed to delete bug', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const hasActiveFilters = Object.entries(filters).some(([k, v]) =>
    k !== 'sortBy' && k !== 'sortOrder' && v !== '' && v !== undefined
  );

  const safePage       = pagination?.page       ?? 1;
  const safeLimit      = pagination?.limit      ?? PAGE_LIMIT;
  const safeTotal      = pagination?.total      ?? 0;
  const safeTotalPages = pagination?.totalPages ?? 1;
  const pageStart = (safePage - 1) * safeLimit + 1;
  const pageEnd   = Math.min(safePage * safeLimit, safeTotal);

  return (
    <PermissionPageGuard module="bugs">
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Bug Tracking' }]} />
      </div>

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Bug Tracking</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage and track system issues, bugs, and feature requests.
          </p>
        </div>
        <PermissionGuard require="bugs.create">
          <Button
            variant="primary"
            size="lg"
            onClick={() => { setEditingBug(null); setIsModalOpen(true); }}
          >
            <Plus size={18} />
            Report Bug
          </Button>
        </PermissionGuard>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <BugFilters
        filters={filters}
        users={users}
        totalResults={safeTotal}
        filteredResults={safeTotal}
        onChange={handleFiltersChange}
        onClearAll={handleClearAll}
      />

      {/* ── Results Counter ─────────────────────────────────────────────────── */}
      {!isLoading && safeTotal > 0 && (
        <div className="mb-3 flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing <span className="font-semibold text-gray-700">{pageStart}–{pageEnd}</span> of{' '}
            <span className="font-semibold text-gray-700">{safeTotal}</span> bug{safeTotal !== 1 ? 's' : ''}
          </span>
          {safeTotalPages > 1 && (
            <span className="text-xs text-gray-400">
              Page {safePage} of {safeTotalPages}
            </span>
          )}
        </div>
      )}

      {/* ── Bug Table ──────────────────────────────────────────────────────── */}
      <Card variant="outlined" className="overflow-hidden">
        <BugTable
          bugs={bugs}
          isLoading={isLoading || isPending}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={handleSort}
          onEdit={handleEditBug}
          onDelete={handleDeleteBug}
          onResetFilters={handleClearAll}
          hasActiveFilters={hasActiveFilters}
        />
      </Card>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {!isLoading && safeTotalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            id="pagination-prev"
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} /> Prev
          </button>

          {/* Page number buttons */}
          <div className="flex items-center gap-1">
            {Array.from({ length: safeTotalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === safeTotalPages || Math.abs(p - page) <= 2)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '…' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToPage(p as number)}
                    className={`w-9 h-9 rounded-lg border text-sm font-semibold transition-colors ${
                      page === p
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )
            }
          </div>

          <button
            id="pagination-next"
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= safeTotalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      <BugModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingBug(null); }}
        onSubmit={editingBug ? handleUpdateBug : handleAddBug}
        editBug={editingBug}
        isSubmitting={isSubmitting}
        users={users}
      />

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={!!bugToDelete}
        onClose={() => !isDeleting && setBugToDelete(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm animate-pulse">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-2">Delete Bug Report?</h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Are you sure you want to permanently delete bug{' '}
            <span className="font-semibold text-gray-800">"{bugToDelete?.title}"</span>?
            This action cannot be undone.
          </p>
          <div className="flex items-center gap-3 w-full">
            <Button
              variant="secondary"
              className="flex-1 font-semibold"
              onClick={() => setBugToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1 font-semibold"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Bug'}
            </Button>
          </div>
        </div>
      </Modal>
    </PermissionPageGuard>
  );
}
