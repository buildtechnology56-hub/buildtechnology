import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  Trash2,
  Phone,
  Globe,
  ExternalLink,
  MessageSquare,
  X,
  Edit3,
  Calendar,
  Building,
  CheckSquare,
  Square,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Send,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Lead, WebsiteFilter, OutreachStatus, BusinessCategory, SheetsSyncStatus } from '../../types';
import { api } from '../../api/client';
import { normalizePakistaniPhoneNumber } from '../../utils/phoneNormalizer';
import { appendLeadsToSpreadsheet } from '../../utils/googleSheets';
import { signInWithGoogle, getGoogleAccessToken, getGoogleUser } from '../../utils/googleAuth';

interface LeadsViewProps {
  initialCampaignId?: string;
}

export const LeadsView: React.FC<LeadsViewProps> = ({ initialCampaignId }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters State
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>('ALL');
  const [outreachFilter, setOutreachFilter] = useState<string>('All');
  const [campaignFilter, setCampaignFilter] = useState<string>(initialCampaignId || '');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Categories list for dropdown
  const [categories, setCategories] = useState<BusinessCategory[]>([]);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<boolean>(false);

  // Google Sheets Sync State
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; isSuccess: boolean } | null>(null);

  // Lead Detail Drawer
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>('');
  const [statusDraft, setStatusDraft] = useState<OutreachStatus>('New');
  const [isSavingDetails, setIsSavingDetails] = useState<boolean>(false);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getLeads({
        search: search.trim() || undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        city: cityFilter !== 'All' ? cityFilter : undefined,
        websiteStatus: websiteFilter !== 'ALL' ? websiteFilter : undefined,
        outreachStatus: outreachFilter !== 'All' ? (outreachFilter as OutreachStatus) : undefined,
        campaignId: campaignFilter || undefined,
        page,
        limit,
        sortBy,
        sortOrder
      });
      setLeads(data.leads);
      setTotalLeads(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, cityFilter, websiteFilter, outreachFilter, campaignFilter, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  const handleSelectAll = () => {
    if (selectedIds.size === leads.length && leads.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.bulkDeleteLeads(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      await fetchLeads();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkStatus = async (status: OutreachStatus) => {
    if (selectedIds.size === 0) return;
    try {
      await api.bulkUpdateStatus(Array.from(selectedIds), status);
      await fetchLeads();
    } catch (err) {
      console.error('Bulk status failed:', err);
    }
  };

  const handleSyncToSheets = async (targetLeadIds?: string[]) => {
    setIsSyncingSheets(true);
    setSyncFeedback(null);
    try {
      let token = await getGoogleAccessToken();
      if (!token) {
        const authRes = await signInWithGoogle();
        token = authRes.accessToken;
      }

      const settings = await api.getIntegrationSettings();
      const spreadsheetId = settings.googleSheets?.spreadsheetId || '1wmRyltbn0SU7UIJd8ysdCOmxgj7V2bU58CsVx9tDfzI';
      const gid = settings.googleSheets?.gid || settings.googleSheets?.worksheetGid || '902';

      // Determine which leads to sync
      let leadsToSync: Lead[] = [];
      if (targetLeadIds && targetLeadIds.length > 0) {
        const idSet = new Set(targetLeadIds);
        leadsToSync = leads.filter(l => idSet.has(l.id));
      } else if (selectedIds.size > 0) {
        leadsToSync = leads.filter(l => selectedIds.has(l.id));
      } else {
        // Sync all filtered
        const allRes = await api.getLeads({
          search: search.trim() || undefined,
          category: categoryFilter !== 'All' ? categoryFilter : undefined,
          city: cityFilter !== 'All' ? cityFilter : undefined,
          websiteStatus: websiteFilter !== 'ALL' ? websiteFilter : undefined,
          campaignId: campaignFilter || undefined,
          limit: 1000
        });
        leadsToSync = allRes.leads;
      }

      if (leadsToSync.length === 0) {
        setSyncFeedback({
          message: 'No leads available to sync.',
          isSuccess: false
        });
        return;
      }

      const result = await appendLeadsToSpreadsheet(token, spreadsheetId, leadsToSync, gid);

      // Update lead sync status in database
      const syncedIds = leadsToSync.map(l => l.id);
      await api.bulkUpdateSyncStatus(syncedIds, 'Synced');

      setSyncFeedback({
        message: `Successfully synced ${result.appendedCount} leads to Google Sheets (${result.skippedDuplicatesCount} duplicates skipped).`,
        isSuccess: true
      });

      await fetchLeads();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncFeedback({
        message: `Google Sheets sync failed: ${msg}`,
        isSuccess: false
      });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const openLeadDrawer = (lead: Lead) => {
    setSelectedLead(lead);
    setNotesDraft(lead.notes || '');
    setStatusDraft(lead.outreachStatus);
  };

  const handleSaveLeadDetails = async () => {
    if (!selectedLead) return;
    setIsSavingDetails(true);
    try {
      const updated = await api.updateLead(selectedLead.id, {
        notes: notesDraft,
        outreachStatus: statusDraft
      });
      setSelectedLead(updated);
      setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)));
    } catch (err) {
      console.error('Failed to update lead:', err);
    } finally {
      setIsSavingDetails(false);
    }
  };

  const getExportUrl = () => {
    return api.getExportCsvUrl({
      campaignId: campaignFilter || undefined,
      category: categoryFilter,
      city: cityFilter,
      websiteStatus: websiteFilter,
      ids: selectedIds.size > 0 ? Array.from(selectedIds) : undefined
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>Leads Repository</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {totalLeads.toLocaleString()} leads
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified Pakistani enterprise records with PTA phone normalization, digital footprint auditing, and direct Google Sheets sync.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sync to Google Sheets Button */}
          <button
            disabled={isSyncingSheets || totalLeads === 0}
            onClick={() => handleSyncToSheets()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer disabled:opacity-40"
            title="Append leads to designated Google Sheet (1wmRyltbn0SU7UIJd8ysdCOmxgj7V2bU58CsVx9tDfzI)"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin text-emerald-600' : 'text-emerald-600'}`} />
            <span>{isSyncingSheets ? 'Syncing to Sheets...' : selectedIds.size > 0 ? `Sync Selected (${selectedIds.size})` : 'Sync to Sheets'}</span>
          </button>

          {/* Export CSV Button */}
          <a
            href={getExportUrl()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>
              {selectedIds.size > 0 ? `Export CSV (${selectedIds.size})` : 'Export CSV'}
            </span>
          </a>
        </div>
      </div>

      {syncFeedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 border ${
            syncFeedback.isSuccess
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {syncFeedback.isSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{syncFeedback.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search business name, phone, or address..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={e => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="All">All Categories</option>
              {categories.map((c, idx) => (
                <option key={`${c.id}-${c.slug || idx}`} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div>
            <select
              value={cityFilter}
              onChange={e => {
                setCityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="All">All Cities</option>
              <option value="Karachi">Karachi</option>
              <option value="Lahore">Lahore</option>
              <option value="Islamabad">Islamabad</option>
              <option value="Rawalpindi">Rawalpindi</option>
              <option value="Faisalabad">Faisalabad</option>
              <option value="Multan">Multan</option>
              <option value="Peshawar">Peshawar</option>
              <option value="Quetta">Quetta</option>
              <option value="Sialkot">Sialkot</option>
              <option value="Gujranwala">Gujranwala</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>
          </div>

          {/* Website Filter */}
          <div>
            <select
              value={websiteFilter}
              onChange={e => {
                setWebsiteFilter(e.target.value as WebsiteFilter);
                setPage(1);
              }}
              className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="ALL">All Web Status</option>
              <option value="HAS_WEBSITE">Has Website</option>
              <option value="NO_WEBSITE">No Website</option>
            </select>
          </div>

          {/* Outreach Status Filter */}
          <div>
            <select
              value={outreachFilter}
              onChange={e => {
                setOutreachFilter(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="All">All Outreach</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="Converted">Converted</option>
              <option value="Not Interested">Not Interested</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Strip */}
        {selectedIds.size > 0 && (
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs bg-blue-50/60 p-2.5 rounded-xl border border-blue-200">
            <span className="font-semibold text-blue-900">
              {selectedIds.size} of {totalLeads} leads selected
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 text-[11px]">Mark as:</span>
              {(['New', 'Contacted', 'Interested', 'Converted', 'Not Interested'] as OutreachStatus[]).map(st => (
                <button
                  key={st}
                  onClick={() => handleBulkStatus(st)}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] cursor-pointer"
                >
                  {st}
                </button>
              ))}

              <button
                onClick={() => handleSyncToSheets(Array.from(selectedIds))}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-semibold ml-2 hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Sync Selected</span>
              </button>

              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold ml-1 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Bulk Delete */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-base text-slate-900">Confirm Bulk Delete</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete <strong className="text-slate-900 font-mono">{selectedIds.size}</strong> selected business records from the database? This action cannot be reversed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isBulkDeleting}
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm cursor-pointer"
              >
                {isBulkDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 w-10 text-center">
                  <button
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Select all"
                  >
                    {selectedIds.size === leads.length && leads.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-slate-900" onClick={() => {
                  setSortBy('name');
                  setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                }}>
                  <div className="flex items-center gap-1">
                    <span>Business Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Pakistani Phone</th>
                <th className="py-3 px-4 cursor-pointer hover:text-slate-900" onClick={() => {
                  setSortBy('city');
                  setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                }}>
                  <div className="flex items-center gap-1">
                    <span>City / Area</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Website</th>
                <th className="py-3 px-4">Sheets Sync</th>
                <th className="py-3 px-4 cursor-pointer hover:text-slate-900" onClick={() => {
                  setSortBy('status');
                  setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                }}>
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Querying verified leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No business records found matching the current filters.
                  </td>
                </tr>
              ) : (
                leads.map(lead => {
                  const isSelected = selectedIds.has(lead.id);
                  const hasPhone = lead.phoneNumber !== 'Not Available';
                  const phoneNorm = normalizePakistaniPhoneNumber(lead.rawPhoneNumber);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          onClick={() => handleToggleSelect(lead.id)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Business Name */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <button
                          onClick={() => openLeadDrawer(lead)}
                          className="text-left hover:text-blue-600 transition-colors max-w-xs truncate block cursor-pointer"
                          title="Click to view details & notes"
                        >
                          {lead.businessName}
                        </button>
                        <div className="text-[10px] text-slate-400 font-normal truncate">
                          Campaign: {lead.campaignName}
                        </div>
                      </td>

                      {/* Normalized Phone & Provenance */}
                      <td className="py-3 px-4">
                        {hasPhone ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="text-slate-900 font-semibold text-xs">
                                {lead.phoneNumber}
                              </span>
                              {phoneNorm.whatsappLink && (
                                <a
                                  href={phoneNorm.whatsappLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded hover:bg-emerald-50 text-emerald-600"
                                  title="Chat on WhatsApp"
                                >
                                  <Send className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                lead.phoneType === 'mobile'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {lead.phoneType === 'mobile' ? 'Mobile' : 'Landline'}
                              </span>
                              {lead.phoneVerificationStatus && (
                                <span className="text-[9px] text-slate-400 truncate max-w-[130px]" title={`${lead.phoneVerificationStatus} | Source: ${lead.phoneSource || ''}`}>
                                  {lead.phoneSource?.includes('Website') ? 'Official Website' : 'OSM Directory'}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not Available</span>
                        )}
                      </td>

                      {/* City & Area */}
                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-medium text-slate-900">{lead.city}</span>
                        {lead.area && (
                          <span className="text-slate-400 block text-[11px] truncate">
                            {lead.area}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-600">
                        <span className="truncate block max-w-[130px]">{lead.category}</span>
                      </td>

                      {/* Website */}
                      <td className="py-3 px-4">
                        {lead.websiteUrl ? (
                          <a
                            href={lead.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline max-w-[110px] truncate"
                          >
                            <Globe className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">Website</span>
                            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 border border-purple-200">
                            No Website
                          </span>
                        )}
                      </td>

                      {/* Sheets Sync Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            lead.sheetsSyncStatus === 'Synced'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : lead.sheetsSyncStatus === 'Failed'
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {lead.sheetsSyncStatus || 'Pending'}
                        </span>
                      </td>

                      {/* Outreach Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            lead.outreachStatus === 'Converted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : lead.outreachStatus === 'Interested'
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : lead.outreachStatus === 'Contacted'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                              : lead.outreachStatus === 'Not Interested'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {lead.outreachStatus}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openLeadDrawer(lead)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
          <div>
            Showing <strong className="text-slate-800">{leads.length}</strong> of{' '}
            <strong className="text-slate-800">{totalLeads}</strong> leads
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 text-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2 text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 text-slate-700 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Attribution Bar */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <span>Data attribution: Powered by Geoapify | &copy; OpenStreetMap contributors (ODbL)</span>
          <span className="hidden sm:inline">Target Spreadsheet: 1wmRyltbn0SU7UIJd8ysdCOmxgj7V2bU58CsVx9tDfzI (GID: 902310635)</span>
        </div>
      </div>

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white border-l border-slate-200 h-full overflow-y-auto p-6 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Top */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                    Lead Intelligence Record
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-1.5">
                    {selectedLead.businessName}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contact & Phone Normalization Details */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Contact Information</span>
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Normalized Phone</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {selectedLead.phoneNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Original Raw Number</span>
                    <span className="font-mono text-slate-700">
                      {selectedLead.rawPhoneNumber}
                    </span>
                  </div>
                </div>

                {selectedLead.phoneNumber !== 'Not Available' && (
                  <div className="pt-2 flex items-center gap-2">
                    <a
                      href={`tel:${selectedLead.phoneNumber}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-center text-slate-800 border border-slate-300 flex items-center justify-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>Call Business</span>
                    </a>
                    {selectedLead.phoneType === 'mobile' && (
                      <a
                        href={`https://wa.me/92${selectedLead.phoneNumber.replace(/\D/g, '').slice(1)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-center text-emerald-700 border border-emerald-300 flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>WhatsApp Message</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Physical Location & Address */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Location & Address
                </h3>
                <div>
                  <span className="text-slate-500 block text-[11px]">Full Address</span>
                  <p className="text-slate-800 mt-0.5">{selectedLead.businessAddress}</p>
                </div>
                <div className="pt-1 flex items-center gap-3 text-slate-600">
                  <span>City: <strong className="text-slate-900">{selectedLead.city}</strong></span>
                  <span>Province: <strong className="text-slate-900">{selectedLead.province}</strong></span>
                </div>
                <div className="pt-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${selectedLead.businessName} ${selectedLead.businessAddress}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                  >
                    <span>View Location on Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Website Status & Category */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Digital Footprint
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Website URL:</span>
                  {selectedLead.websiteUrl ? (
                    <a
                      href={selectedLead.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span className="truncate max-w-[200px]">{selectedLead.websiteUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-purple-700 font-semibold">No Website Registered</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Industry:</span>
                  <span className="text-slate-900 font-medium">{selectedLead.category}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Sheets Status:</span>
                  <span className="font-semibold text-slate-800">{selectedLead.sheetsSyncStatus || 'Pending'}</span>
                </div>
              </div>

              {/* Outreach Status & Notes Editor */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Outreach Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['New', 'Contacted', 'Interested', 'Converted', 'Not Interested'] as OutreachStatus[]).map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusDraft(st)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        statusDraft === st
                          ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                    Internal CRM Notes & Log
                  </label>
                  <textarea
                    rows={4}
                    value={notesDraft}
                    onChange={e => setNotesDraft(e.target.value)}
                    placeholder="Add business context, call notes, decision-maker details..."
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                disabled={isSavingDetails}
                onClick={handleSaveLeadDetails}
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                {isSavingDetails ? 'Saving...' : 'Save Lead Notes & Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
