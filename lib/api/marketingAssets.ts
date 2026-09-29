import { apiClient } from './api-client';

/* ── Marketing → Asset registry & booking API ─────────────────────────────────
 * Status values and their labels are SERVED by the backend (see
 * marketingAsset.service) rather than redeclared here, so the two can never
 * drift. NOTE: apiClient.get returns an AxiosResponse — read `.data`. */

export interface MarketingAsset {
  id: number;
  name: string;
  serialNumber: string;
  category: string | null;
  notes: string | null;
  active: boolean;
  /** MK-002.5 — 'operational' | 'under_maintenance'. */
  maintenanceStatus: string;
  /** MK-002.3 — derived from the open checkout, never stored on the asset. */
  checkedOut: boolean;
  checkedOutBy: number | null;
  openCheckoutId: number | null;
}

export interface AssetCheckout {
  id: number;
  assetId: number;
  assetName: string | null;
  assetSerial: string | null;
  requestId: number;
  projectId: number;
  projectName: string | null;
  takerId: number;
  takerName: string | null;
  checkedOutAt: string;
  checkedOutByName: string | null;
  returnedAt: string | null;
  returnedByName: string | null;
  notes: string | null;
  open: boolean;
}

export interface MaintenanceEntry {
  id: number;
  action: 'flagged' | 'restored' | string;
  note: string | null;
  actorName: string | null;
  overrodeActiveBooking: boolean;
  createdAt: string;
}

export interface StatusOption { key: string; label: string }

export interface AssetRegistry {
  assets: MarketingAsset[];
  statuses: StatusOption[];
  canManage: boolean;
  canRequest: boolean;
  canApprove: boolean;
}

export interface AssetRequest {
  id: number;
  assetId: number;
  assetName: string | null;
  assetSerial: string | null;
  projectId: number;
  projectName: string | null;
  requesterId: number;
  requesterName: string | null;
  startAt: string;
  endAt: string;
  notes: string | null;
  status: string;
  statusLabel: string;
  decidedBy: number | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export interface AssetBooking {
  requestId: number;
  assetId: number;
  assetName: string;
  assetSerial: string;
  projectName: string;
  requesterName: string | null;
  startAt: string;
  endAt: string;
}

export async function fetchAssets(includeInactive = false): Promise<AssetRegistry> {
  const res = await apiClient.get<{ success: boolean } & AssetRegistry>(
    `/marketing/assets${includeInactive ? '?includeInactive=true' : ''}`,
  );
  return {
    assets: res.data?.assets ?? [],
    statuses: res.data?.statuses ?? [],
    canManage: !!res.data?.canManage,
    canRequest: !!res.data?.canRequest,
    canApprove: !!res.data?.canApprove,
  };
}

export interface AssetPayload {
  name?: string;
  serialNumber?: string;
  category?: string | null;
  notes?: string | null;
}

export async function createAsset(payload: AssetPayload): Promise<MarketingAsset> {
  const res = await apiClient.post<{ success: boolean; asset: MarketingAsset }>('/marketing/assets', payload);
  return res.data.asset;
}

export async function updateAsset(id: number, payload: AssetPayload): Promise<MarketingAsset> {
  const res = await apiClient.put<{ success: boolean; asset: MarketingAsset }>(`/marketing/assets/${id}`, payload);
  return res.data.asset;
}

/** Soft: the row is retained and every historical request keeps its reference. */
export async function setAssetActive(id: number, active: boolean): Promise<boolean> {
  const res = await apiClient.patch<{ success: boolean; active: boolean }>(
    `/marketing/assets/${id}/active`, { active },
  );
  return res.data.active;
}

export async function fetchAssetRequests(params: { assetId?: number; status?: string; mine?: boolean } = {}): Promise<{
  requests: AssetRequest[]; statuses: StatusOption[]; canApprove: boolean; canRequest: boolean;
}> {
  const qs = new URLSearchParams();
  if (params.assetId) qs.set('assetId', String(params.assetId));
  if (params.status) qs.set('status', params.status);
  if (params.mine) qs.set('mine', 'true');
  const q = qs.toString();
  const res = await apiClient.get<{
    success: boolean;
    requests?: AssetRequest[];
    statuses?: StatusOption[];
    canApprove?: boolean;
    canRequest?: boolean;
  }>(`/marketing/asset-requests${q ? `?${q}` : ''}`);
  return {
    requests: res.data?.requests ?? [],
    statuses: res.data?.statuses ?? [],
    canApprove: !!res.data?.canApprove,
    canRequest: !!res.data?.canRequest,
  };
}

export interface RequestPayload {
  assetId: number;
  projectId: number;
  /** ISO instants — a booking is a moment in time, not a calendar day. */
  startAt: string;
  endAt: string;
  notes?: string | null;
}

export async function createAssetRequest(payload: RequestPayload): Promise<AssetRequest> {
  const res = await apiClient.post<{ success: boolean; request: AssetRequest }>('/marketing/asset-requests', payload);
  return res.data.request;
}

export async function decideAssetRequest(id: number, decision: 'approved' | 'rejected', note?: string): Promise<AssetRequest> {
  const res = await apiClient.patch<{ success: boolean; request: AssetRequest }>(
    `/marketing/asset-requests/${id}/decision`, { decision, note },
  );
  return res.data.request;
}

export async function cancelAssetRequest(id: number): Promise<void> {
  await apiClient.patch(`/marketing/asset-requests/${id}/cancel`, {});
}

export async function fetchAssetAvailability(from?: string, to?: string): Promise<AssetBooking[]> {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const q = qs.toString();
  const res = await apiClient.get<{ success: boolean; bookings: AssetBooking[] }>(
    `/marketing/assets/availability${q ? `?${q}` : ''}`,
  );
  return res.data?.bookings ?? [];
}


/* ── MK-002.3 physical custody ─────────────────────────────────────────────
 * The ledger is READ-ONLY: there is no update or delete call here because the
 * server exposes none. A checkout is created, then closed by a return. */

export async function checkoutAsset(requestId: number, notes?: string): Promise<AssetCheckout> {
  const res = await apiClient.post<{ success: boolean; checkout: AssetCheckout }>(
    `/marketing/asset-requests/${requestId}/checkout`, notes ? { notes } : {},
  );
  return res.data.checkout;
}

export async function returnAsset(checkoutId: number): Promise<AssetCheckout> {
  const res = await apiClient.post<{ success: boolean; checkout: AssetCheckout }>(
    `/marketing/asset-checkouts/${checkoutId}/return`, {},
  );
  return res.data.checkout;
}

export async function fetchCheckouts(params: { assetId?: number; open?: boolean } = {}): Promise<{
  checkouts: AssetCheckout[]; canCheckout: boolean;
}> {
  const qs = new URLSearchParams();
  if (params.assetId) qs.set('assetId', String(params.assetId));
  if (params.open) qs.set('open', 'true');
  const q = qs.toString();
  const res = await apiClient.get<{ success: boolean; checkouts?: AssetCheckout[]; canCheckout?: boolean }>(
    `/marketing/asset-checkouts${q ? `?${q}` : ''}`,
  );
  return { checkouts: res.data?.checkouts ?? [], canCheckout: !!res.data?.canCheckout };
}

/* ── MK-002.5 condition & maintenance ────────────────────────────────────── */

export async function setAssetMaintenance(
  assetId: number, action: 'flagged' | 'restored', note?: string,
): Promise<{ maintenanceStatus: string; overrodeActiveBooking?: boolean }> {
  const res = await apiClient.patch<{ success: boolean; maintenanceStatus: string; overrodeActiveBooking?: boolean }>(
    `/marketing/assets/${assetId}/maintenance`, { action, note },
  );
  return res.data;
}

export async function fetchMaintenanceHistory(assetId: number): Promise<{
  entries: MaintenanceEntry[]; canRestore: boolean;
}> {
  const res = await apiClient.get<{ success: boolean; entries?: MaintenanceEntry[]; canRestore?: boolean }>(
    `/marketing/assets/${assetId}/maintenance`,
  );
  return { entries: res.data?.entries ?? [], canRestore: !!res.data?.canRestore };
}
