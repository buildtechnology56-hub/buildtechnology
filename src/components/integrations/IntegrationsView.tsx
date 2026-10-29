import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Info,
  Database,
  Lock,
  FileSpreadsheet,
  Server,
  Clock,
  Activity,
  Hash
} from 'lucide-react';
import { IntegrationSettings, GeoapifyTestResult } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const IntegrationsView: React.FC = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [fallbackMode, setFallbackMode] = useState<'CURATED_OFFLINE' | 'STRICT_API'>('CURATED_OFFLINE');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<GeoapifyTestResult | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getIntegrationSettings();
      setSettings(data);
      setFallbackMode(data.fallbackMode || 'CURATED_OFFLINE');
      if (data.lastTestResult) {
        setTestResult(data.lastTestResult);
      }
    } catch (err) {
      console.error('Failed to load integration settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      const updated = await api.updateIntegrationSettings({
        fallbackMode
      });
      setSettings(updated);
      setFeedbackMsg({
        type: 'success',
        text: 'Geoapify configuration successfully saved.'
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({
        type: 'error',
        text: message || 'Failed to update integration settings'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setFeedbackMsg(null);
    try {
      const res = await api.testGeoapifyApi();
      setTestResult(res);
      // Refresh settings to sync connection status
      const data = await api.getIntegrationSettings();
      setSettings(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setTestResult({
        success: false,
        message: message || 'Connection probe failed to reach backend',
        latencyMs: 0,
        status: 'ERROR',
        httpStatus: 0,
        resultsCount: 0,
        testedAt: new Date().toISOString(),
        actionableInstruction: 'Check server logs and ensure backend dev server is running.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading Geoapify integration status...
      </div>
    );
  }

  const isConnected = settings?.status === 'CONNECTED';
  const hasSecret = Boolean(settings?.hasServerSecret);

  // Status badge label and styles
  let statusBadgeText = 'API Not Connected (Offline Testing Data)';
  let statusBadgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  if (isConnected) {
    statusBadgeText = 'API Connected (Live Geoapify)';
    statusBadgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  } else if (!hasSecret) {
    statusBadgeText = 'API Not Connected (Missing Server Secret)';
    statusBadgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  } else if (settings?.status === 'UNAUTHORIZED') {
    statusBadgeText = 'API Not Connected (Invalid Key / 401)';
    statusBadgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  } else if (settings?.status === 'QUOTA_EXCEEDED') {
    statusBadgeText = 'API Not Connected (Quota Exceeded / 429)';
    statusBadgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-amber-400" />
          <span>Geoapify Places API Integration</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Server-side Geoapify integration for commercial points of interest, category search, and location queries across Pakistan.
        </p>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isConnected
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
              }`}
            >
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">Geoapify Places API (v2)</h2>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusBadgeStyle}`}>
                  {statusBadgeText}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                POI search and geocoding powered by Geoapify &amp; OpenStreetMap data
              </p>
            </div>
          </div>

          <button
            disabled={isTesting}
            onClick={handleTestConnection}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isTesting ? 'Testing Probe...' : 'Test Geoapify Connection'}</span>
          </button>
        </div>

        {/* Dedicated Test Result Display */}
        {testResult && (
          <div
            className={`p-4 rounded-xl text-xs space-y-3 border ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className={`font-semibold ${testResult.success ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {testResult.message}
                  </div>
                  {testResult.actionableInstruction && (
                    <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      <strong className="text-amber-300">Action: </strong>
                      {testResult.actionableInstruction}
                    </div>
                  )}
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                  testResult.httpStatus === 200
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : testResult.httpStatus === 401
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : testResult.httpStatus === 429
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                HTTP {testResult.httpStatus > 0 ? testResult.httpStatus : 'N/A'}
              </span>
            </div>

            {/* Test Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {testResult.testedAt
                    ? new Date(testResult.testedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : 'Just now'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                <span>Latency: <strong className="text-white font-mono">{testResult.latencyMs}ms</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Hash className="w-3.5 h-3.5 text-slate-500" />
                <span>Results: <strong className="text-white font-mono">{testResult.resultsCount} POI</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>Probe: <strong className="text-amber-400">Lahore Commercial</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Current Mode Description */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Database className="w-4 h-4 text-amber-400" />
            <span>Active Data Source:</span>
            <span className="text-amber-300">
              {isConnected
                ? 'Live Geoapify Places API v2'
                : 'Demo / Synthetic Test Records (Local Dataset)'}
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            {isConnected
              ? 'Real queries are dispatched to api.geoapify.com/v2/places with category filters and geographic bounding circles across Pakistan.'
              : 'GEOAPIFY_API_KEY is not configured or inactive. Campaigns run using locally seeded test records clearly labeled as "Demo / Synthetic Test Records (Local Dataset)". No records are falsely claimed as live verified businesses.'}
          </p>
        </div>
      </div>

      {/* Field Availability Disclosure Card */}
      <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-4 shadow-sm text-xs">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400" />
          <span>Geoapify Places API Field Availability Audit</span>
        </h2>
        <p className="text-slate-300 leading-relaxed">
          Geoapify Places API is built on OpenStreetMap (OSM) data. Understanding field availability in developing regions like Pakistan is essential for lead generation:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Reliably Available Fields</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li><strong>Business Name</strong> (primary &amp; multilingual)</li>
              <li><strong>Formatted Address</strong> &amp; street hierarchy</li>
              <li><strong>City &amp; Administrative State</strong></li>
              <li><strong>Category &amp; Taxonomy Tagging</strong></li>
              <li><strong>Geographic Coordinates</strong> (latitude / longitude)</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Frequently Missing in Pakistan OSM</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li><strong>Phone Numbers:</strong> Often not mapped on OSM POIs in Pakistan. The platform strictly marks missing numbers as <em>Not Available</em> and never invents dummy numbers.</li>
              <li><strong>Website URLs:</strong> Small local stores frequently have no public website URL registered. Marked as <em>No Website</em>.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Server Secret & Non-Secret Settings Configuration Form */}
      <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Server-Side Secret &amp; Environment Configuration</span>
          </h2>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Client Key Exposure</span>
          </span>
        </div>

        {/* Server Secret Status Banner */}
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
            hasSecret
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          {hasSecret ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-bold text-white">
              {hasSecret
                ? 'GEOAPIFY_API_KEY Configured in Server Secrets'
                : 'Missing GEOAPIFY_API_KEY in Server Secrets'}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {hasSecret
                ? 'The backend server detected GEOAPIFY_API_KEY in its environment variables. API requests are dispatched server-side; keys are never transmitted to client browsers or stored in frontend state.'
                : 'To activate live searches, configure the GEOAPIFY_API_KEY secret in your hosting environment (AI Studio Secrets panel or Cloud Run environment variables). For security, client input fields for API keys have been disabled.'}
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Fallback Strategy When Key Quota is Exceeded / Inactive
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFallbackMode('CURATED_OFFLINE')}
                className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                  fallbackMode === 'CURATED_OFFLINE'
                    ? 'bg-amber-500/15 border-amber-400 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs text-white">Curated Offline Test Dataset (Recommended)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Fallback smoothly to local test records labeled as synthetic demo data without failing user campaigns.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFallbackMode('STRICT_API')}
                className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                  fallbackMode === 'STRICT_API'
                    ? 'bg-amber-500/15 border-amber-400 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs text-white">Strict API Only</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Halt immediately and raise error if Geoapify API returns 401 unauthorized or 429 quota exhaustion.
                </div>
              </button>
            </div>
          </div>

          {isAdmin && (
            <div className="pt-2 flex justify-end">
              <button
                disabled={isSaving}
                onClick={handleSaveSettings}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Geoapify Settings'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Geoapify Terms & Storage Compliance Section */}
      <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-4 shadow-sm text-xs text-slate-300">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          <span>Geoapify Terms of Service &amp; Data Storage Compliance</span>
        </h2>
        <div className="space-y-2.5 text-slate-400 leading-relaxed">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Permissive Caching &amp; Storage:</strong> Unlike Google Places API which strictly prohibits storing places or exporting records, Geoapify <strong>explicitly permits caching, persistent database storage, and CSV exporting</strong> of retrieved POI records.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Attribution Requirement:</strong> Under Geoapify&rsquo;s Terms of Service and the Open Database License (ODbL), exported or displayed data must include proper attribution: <em>&ldquo;Powered by Geoapify | &copy; OpenStreetMap contributors&rdquo;</em>. This is automatically attached to all exports.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>API Rate Limits:</strong> The Geoapify Free tier allows up to 3,000 requests/day at up to 5 requests/second. The campaign runner automatically applies safe pacing delays between queries.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
