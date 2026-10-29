import {
  User,
  Lead,
  Campaign,
  BusinessCategory,
  IntegrationSettings,
  GeoapifyTestResult,
  DashboardStats,
  PakistanLocationData,
  WebsiteFilter,
  OutreachStatus,
  SheetsSyncStatus
} from '../types';

const TOKEN_KEY = 'buildtech_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string) => request<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),
  getMe: () => request<{ user: User }>('/api/auth/me'),
  switchUserRole: (role: 'admin' | 'user') => request<{ token: string; user: User }>('/api/auth/switch', {
    method: 'POST',
    body: JSON.stringify({ role })
  }),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/api/dashboard/stats'),

  // Locations
  getLocations: () => request<PakistanLocationData>('/api/locations'),

  // Categories
  getCategories: () => request<BusinessCategory[]>('/api/categories'),
  createCategory: (cat: Partial<BusinessCategory>) => request<BusinessCategory>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(cat)
  }),
  updateCategory: (id: string, updates: Partial<BusinessCategory>) => request<BusinessCategory>(`/api/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  }),
  deleteCategory: (id: string) => request<{ success: boolean }>(`/api/categories/${id}`, {
    method: 'DELETE'
  }),

  // Leads
  getLeads: (params: {
    campaignId?: string;
    category?: string;
    city?: string;
    websiteStatus?: WebsiteFilter;
    outreachStatus?: OutreachStatus;
    sheetsSyncStatus?: SheetsSyncStatus;
    search?: string;
    hasPhone?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        q.append(key, String(val));
      }
    });
    return request<{ leads: Lead[]; total: number; page: number; totalPages: number }>(`/api/leads?${q.toString()}`);
  },
  getLead: (id: string) => request<Lead>(`/api/leads/${id}`),
  updateLead: (id: string, updates: { notes?: string; outreachStatus?: OutreachStatus; sheetsSyncStatus?: SheetsSyncStatus }) => request<Lead>(`/api/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  }),
  deleteLead: (id: string) => request<{ success: boolean }>(`/api/leads/${id}`, {
    method: 'DELETE'
  }),
  bulkDeleteLeads: (ids: string[]) => request<{ success: boolean; count: number }>('/api/leads/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids })
  }),
  bulkUpdateStatus: (ids: string[], status: OutreachStatus) => request<{ success: boolean; count: number }>('/api/leads/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status })
  }),
  bulkUpdateSyncStatus: (ids: string[], status: SheetsSyncStatus, error?: string) => request<{ success: boolean; count: number }>('/api/leads/sync-sheets-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status, error })
  }),
  getExportCsvUrl: (filters: {
    campaignId?: string;
    category?: string;
    city?: string;
    websiteStatus?: WebsiteFilter;
    ids?: string[];
  }) => {
    const q = new URLSearchParams();
    if (filters.campaignId) q.append('campaignId', filters.campaignId);
    if (filters.category && filters.category !== 'All') q.append('category', filters.category);
    if (filters.city && filters.city !== 'All') q.append('city', filters.city);
    if (filters.websiteStatus && filters.websiteStatus !== 'ALL') q.append('websiteStatus', filters.websiteStatus);
    if (filters.ids && filters.ids.length > 0) q.append('ids', filters.ids.join(','));
    return `/api/leads/export/csv?${q.toString()}`;
  },

  // Campaigns
  getCampaigns: () => request<Campaign[]>('/api/campaigns'),
  getCampaign: (id: string) => request<Campaign>(`/api/campaigns/${id}`),
  createCampaign: (data: {
    name: string;
    category: string;
    subCategory?: string;
    province?: string;
    city: string;
    area?: string;
    leadTarget: number;
    websiteFilter: WebsiteFilter;
    duplicateHandling: 'SKIP' | 'MERGE';
    startImmediately?: boolean;
  }) => request<Campaign>('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  startCampaign: (id: string) => request<{ success: boolean; campaign: Campaign }>(`/api/campaigns/${id}/start`, {
    method: 'POST'
  }),
  resumeCampaign: (id: string) => request<{ success: boolean; campaign: Campaign }>(`/api/campaigns/${id}/resume`, {
    method: 'POST'
  }),
  pauseCampaign: (id: string) => request<{ success: boolean; campaign: Campaign }>(`/api/campaigns/${id}/pause`, {
    method: 'POST'
  }),
  stopCampaign: (id: string) => request<{ success: boolean; campaign: Campaign }>(`/api/campaigns/${id}/stop`, {
    method: 'POST'
  }),
  endCampaign: (id: string) => request<{ success: boolean; campaign: Campaign }>(`/api/campaigns/${id}/end`, {
    method: 'POST'
  }),
  retryCampaign: (id: string) => request<{ success: boolean; campaign: Campaign }>(`/api/campaigns/${id}/retry`, {
    method: 'POST'
  }),
  deleteCampaign: (id: string) => request<{ success: boolean }>(`/api/campaigns/${id}`, {
    method: 'DELETE'
  }),
  updateCampaignSyncCount: (id: string, syncedCount: number) => request<{ success: boolean; campaign: Campaign }>(`/api/campaigns/${id}/sync-sheets-status`, {
    method: 'POST',
    body: JSON.stringify({ syncedCount })
  }),
  updateCampaignSyncStatus: (id: string, syncedCount: number) => request<{ success: boolean; campaign: Campaign }>(`/api/campaigns/${id}/sync-sheets-status`, {
    method: 'POST',
    body: JSON.stringify({ syncedCount })
  }),

  // Integrations & Settings
  getSettings: () => request<IntegrationSettings>('/api/integrations/settings'),
  getIntegrationSettings: () => request<IntegrationSettings>('/api/integrations/settings'),
  saveSettings: (settings: Partial<IntegrationSettings>) => request<IntegrationSettings>('/api/integrations/settings', {
    method: 'POST',
    body: JSON.stringify(settings)
  }),
  updateIntegrationSettings: (settings: Partial<IntegrationSettings>) => request<IntegrationSettings>('/api/integrations/settings', {
    method: 'POST',
    body: JSON.stringify(settings)
  }),
  testGeoapify: () => request<GeoapifyTestResult>('/api/integrations/test-geoapify', {
    method: 'POST'
  }),
  testGeoapifyApi: () => request<GeoapifyTestResult>('/api/integrations/test-geoapify', {
    method: 'POST'
  })
};
