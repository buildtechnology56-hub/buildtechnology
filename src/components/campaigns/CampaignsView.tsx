import React, { useState } from 'react';
import {
  Layers,
  Play,
  Pause,
  Square,
  RotateCw,
  Trash2,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  PlusCircle,
  FileSpreadsheet,
  Globe,
  Filter,
  Smartphone,
  Phone,
  Database,
  ExternalLink,
  ShieldAlert,
  X,
  UploadCloud,
  Check
} from 'lucide-react';
import { Campaign, CampaignStatus, Lead } from '../../types';
import { useCampaigns } from '../../context/CampaignContext';
import { api } from '../../api/client';
import { NavTab } from '../layout/Sidebar';
import { appendLeadsToSpreadsheet } from '../../utils/googleSheets';
import { signInWithGoogle, getGoogleAccessToken, getGoogleUser } from '../../utils/googleAuth';

interface CampaignsViewProps {
  onNavigate: (tab: NavTab) => void;
  onInspectLeads: (campaignId: string) => void;
}

const ALL_STATUS_TABS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All Campaigns' },
  { id: 'Running', label: 'Running' },
  { id: 'Queued', label: 'Queued' },
  { id: 'Draft', label: 'Draft' },
  { id: 'Paused', label: 'Paused' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Partially Completed', label: 'Partially Completed' },
  { id: 'Failed', label: 'Failed' },
  { id: 'Stopped', label: 'Stopped' },
  { id: 'Ended by User', label: 'Ended by User' }
];

export const CampaignsView: React.FC<CampaignsViewProps> = ({ onNavigate, onInspectLeads }) => {
  const {
    campaigns,
    isLoading,
    startCampaign,
    resumeCampaign,
    pauseCampaign,
    stopCampaign,
    endCampaign,
    retryCampaign,
    deleteCampaign,
    refreshCampaigns
  } = useCampaigns();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // End Campaign confirmation modal state
  const [campaignToEnd, setCampaignToEnd] = useState<Campaign | null>(null);

  // Google Sheets Direct Sync State
  const [syncingCampaignId, setSyncingCampaignId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ campaignId: string; message: string; isSuccess: boolean } | null>(null);

  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  const handleAction = async (id: string, actionFn: (id: string) => Promise<void>) => {
    setActionLoadingId(id);
    try {
      await actionFn(id);
    } catch (err) {
      console.error('Campaign action failed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmEndCampaign = async () => {
    if (!campaignToEnd) return;
    const id = campaignToEnd.id;
    setActionLoadingId(id);
    try {
      await endCampaign(id);
      setCampaignToEnd(null);
    } catch (err) {
      console.error('End campaign failed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setActionLoadingId(id);
    try {
      await deleteCampaign(id);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSyncToSheets = async (camp: Campaign) => {
    setSyncingCampaignId(camp.id);
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

      // Fetch all leads for this campaign
      const leadsRes = await api.getLeads({ campaignId: camp.id, limit: 10000 });
      if (leadsRes.leads.length === 0) {
        setSyncFeedback({
          campaignId: camp.id,
          message: 'No leads collected in this campaign yet to sync.',
          isSuccess: false
        });
        return;
      }

      const result = await appendLeadsToSpreadsheet(token, spreadsheetId, leadsRes.leads, gid);

      // Update lead sync status in DB
      const leadIds = leadsRes.leads.map(l => l.id);
      await api.bulkUpdateSyncStatus(leadIds, 'Synced');

      // Update campaign synced leads count
      await api.updateCampaignSyncStatus(camp.id, result.appendedCount);
      await refreshCampaigns();

      setSyncFeedback({
        campaignId: camp.id,
        message: `Successfully synced ${result.appendedCount} leads to Google Sheets (${result.skippedDuplicatesCount} duplicates skipped).`,
        isSuccess: true
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncFeedback({
        campaignId: camp.id,
        message: `Google Sheets sync failed: ${msg}`,
        isSuccess: false
      });
    } finally {
      setSyncingCampaignId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-1">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Real Backend Campaign Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Campaign Management & History</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time lead hunting progress, control execution states, and sync verified records directly to Google Sheets.
          </p>
        </div>

        <button
          onClick={() => onNavigate('wizard')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Launch New Campaign</span>
        </button>
      </div>

      {/* Filter Tabs for all 10 states */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
        {ALL_STATUS_TABS.map(tab => {
          const isSelected = statusFilter === tab.id;
          const count = tab.id === 'ALL'
            ? campaigns.length
            : campaigns.filter(c => c.status === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 text-sm">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading campaigns from database...
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-300 text-slate-500 space-y-3">
          <Layers className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-medium text-slate-700">No campaigns found for status &ldquo;{statusFilter}&rdquo;</p>
          <p className="text-xs text-slate-400">Launch a new search to begin collecting authentic Pakistani leads.</p>
          <button
            onClick={() => onNavigate('wizard')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-sm"
          >
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map(camp => {
            const isProcessing = actionLoadingId === camp.id;
            const isSyncing = syncingCampaignId === camp.id;
            const progress = camp.progressPercentage || Math.min(100, Math.round(((camp.uniqueLeadsCollected || 0) / (camp.leadTarget || 1)) * 100));

            // Status Badge Formatting
            const statusBadgeClasses: Record<CampaignStatus, string> = {
              'Running': 'bg-blue-50 text-blue-700 border-blue-300 animate-pulse',
              'Queued': 'bg-amber-50 text-amber-700 border-amber-300',
              'Draft': 'bg-slate-100 text-slate-700 border-slate-300',
              'Paused': 'bg-amber-50 text-amber-700 border-amber-300',
              'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-300',
              'Partially Completed': 'bg-cyan-50 text-cyan-700 border-cyan-300',
              'Failed': 'bg-rose-50 text-rose-700 border-rose-300',
              'Stopped': 'bg-slate-100 text-slate-600 border-slate-300',
              'Ended by User': 'bg-indigo-50 text-indigo-700 border-indigo-300'
            };

            return (
              <div
                key={camp.id}
                className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-4 shadow-sm"
              >
                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {camp.name}
                      </h3>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          statusBadgeClasses[camp.status] || 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {camp.status}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {camp.dataSourceUsed}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2.5 pt-0.5">
                      <span className="font-semibold text-blue-600">{camp.category}</span>
                      <span>•</span>
                      <span className="text-slate-700">{camp.subCategory}</span>
                      <span>•</span>
                      <span>{camp.city}{camp.area ? ` (${camp.area})` : ''}</span>
                      <span>•</span>
                      <span className="text-slate-400">Created: {new Date(camp.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Primary Action Controls */}
                  <div className="flex items-center gap-1.5 flex-wrap self-end md:self-auto">
                    {/* View Leads Button */}
                    <button
                      onClick={() => onInspectLeads(camp.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                      title="Inspect collected leads in table"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>View Leads ({camp.uniqueLeadsCollected || 0})</span>
                    </button>

                    {/* Export Campaign CSV */}
                    <a
                      href={api.getExportCsvUrl({ campaignId: camp.id })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                      title="Export this campaign's leads to CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Export CSV</span>
                    </a>

                    {/* Sync to Google Sheets Button */}
                    <button
                      disabled={isSyncing || (camp.uniqueLeadsCollected || 0) === 0}
                      onClick={() => handleSyncToSheets(camp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer disabled:opacity-40"
                      title="Append unique leads directly to designated Google Sheet"
                    >
                      <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : 'text-emerald-600'}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync to Sheets'}</span>
                    </button>

                    {/* Running -> Pause, Stop, End */}
                    {camp.status === 'Running' && (
                      <>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleAction(camp.id, pauseCampaign)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer"
                          title="Pause campaign hunting"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleAction(camp.id, stopCampaign)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                          title="Stop campaign"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => setCampaignToEnd(camp)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 transition-colors cursor-pointer"
                          title="End campaign permanently and mark as completed"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>End</span>
                        </button>
                      </>
                    )}

                    {/* Paused, Draft, Stopped, Queued -> Resume / Start */}
                    {(camp.status === 'Paused' || camp.status === 'Draft' || camp.status === 'Stopped' || camp.status === 'Queued') && (
                      <>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleAction(camp.id, resumeCampaign)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                          title="Resume hunting"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Resume</span>
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => setCampaignToEnd(camp)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                          title="End campaign"
                        >
                          <span>End</span>
                        </button>
                      </>
                    )}

                    {/* Failed -> Retry */}
                    {camp.status === 'Failed' && (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleAction(camp.id, retryCampaign)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-colors cursor-pointer"
                        title="Retry failed campaign"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    )}

                    {/* Delete Campaign */}
                    <button
                      disabled={isProcessing}
                      onClick={() => handleDelete(camp.id)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        confirmDeleteId === camp.id
                          ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                          : 'bg-slate-50 text-slate-400 hover:text-rose-600 border-slate-200'
                      }`}
                      title={confirmDeleteId === camp.id ? 'Click again to confirm delete' : 'Delete campaign'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Phone Leads
                    </span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {camp.uniqueLeadsCollected || 0} / <span className="text-blue-600">{camp.leadTarget}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {camp.phoneRequirement === 'MOBILE_ONLY' ? 'Mobile (03xx)' : 'Any Phone'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-emerald-500" />
                      <span>Mobile</span>
                    </span>
                    <span className="font-bold text-emerald-600 font-mono text-sm">
                      {camp.mobileQualifiedCount || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">WhatsApp ready</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      POIs Scanned
                    </span>
                    <span className="font-bold text-slate-700 font-mono text-sm">
                      {camp.totalPoisScanned || camp.recordsProcessed || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Evaluated</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      No Phone
                    </span>
                    <span className="font-bold text-slate-500 font-mono text-sm">
                      {camp.noPhoneCount || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Skipped</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Duplicates
                    </span>
                    <span className="font-bold text-slate-500 font-mono text-sm">
                      {camp.duplicatePhoneCount || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Filtered out</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                      <FileSpreadsheet className="w-3 h-3 text-emerald-500" />
                      <span>Sheets Sync</span>
                    </span>
                    <span className="font-bold text-slate-800 font-mono text-sm">
                      {camp.syncedLeadsCount || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Exported</span>
                  </div>
                </div>

                {/* Progress Bar & Status Text */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-mono">
                      Acquisition Progress: <strong className="text-slate-800">{camp.uniqueLeadsCollected || 0}</strong> of <strong className="text-blue-600">{camp.leadTarget}</strong> leads collected
                    </span>
                    <span className="font-mono font-bold text-blue-600">
                      {progress}%
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      style={{ width: `${progress}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        camp.status === 'Completed'
                          ? 'bg-emerald-500'
                          : camp.status === 'Failed'
                          ? 'bg-rose-500'
                          : 'bg-blue-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Status messages / completion notes */}
                {camp.completionReason && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{camp.completionReason}</span>
                  </div>
                )}

                {camp.errorDetails && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Error: {camp.errorDetails}</span>
                  </div>
                )}

                {/* Sync feedback notification */}
                {syncFeedback && syncFeedback.campaignId === camp.id && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
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
              </div>
            );
          })}
        </div>
      )}

      {/* End Campaign Confirmation Modal */}
      {campaignToEnd && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-700">
                <Check className="w-5 h-5 flex-shrink-0" />
                <h3 className="font-bold text-base text-slate-900">End Campaign Execution</h3>
              </div>
              <button
                onClick={() => setCampaignToEnd(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to end <strong className="text-slate-900">&ldquo;{campaignToEnd.name}&rdquo;</strong>?
              This will stop further hunting cycles and finalize its state as <strong className="text-indigo-700">&ldquo;Ended by User&rdquo;</strong>.
              All <strong className="text-slate-900">{campaignToEnd.uniqueLeadsCollected || 0} unique leads</strong> collected remain safely stored in your database.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setCampaignToEnd(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={actionLoadingId === campaignToEnd.id}
                onClick={handleConfirmEndCampaign}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-sm"
              >
                {actionLoadingId === campaignToEnd.id ? 'Finalizing...' : 'Yes, End Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
