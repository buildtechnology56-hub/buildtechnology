import React, { useEffect, useState } from 'react';
import {
  Users,
  Target,
  Phone,
  Globe,
  Globe2,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Zap,
  Smartphone,
  ShieldCheck,
  Copy,
  ExternalLink,
  Flame,
  Check
} from 'lucide-react';
import { DashboardStats, Campaign, Lead } from '../../types';
import { api } from '../../api/client';
import { NavTab } from '../layout/Sidebar';
import { useCampaigns } from '../../context/CampaignContext';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onSelectCampaign?: (campaignId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onSelectCampaign }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { campaigns } = useCampaigns();

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [campaigns]);

  const handleCopyPhone = (id: string, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading && !stats) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* VIP Skeleton Loading Screen */}
        <div className="h-44 rounded-2xl bg-[#0B1220]/60 border border-white/[0.06] animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#0B1220]/60 border border-white/[0.06] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-2xl bg-[#0B1220]/60 border border-white/[0.06] animate-pulse" />
          <div className="h-72 rounded-2xl bg-[#0B1220]/60 border border-white/[0.06] animate-pulse" />
        </div>
      </div>
    );
  }

  const s = stats || {
    totalLeads: 0,
    leadsToday: 0,
    totalCampaigns: 0,
    runningCampaigns: 0,
    leadsWithPhone: 0,
    verifiedMobileLeads: 0,
    campaignSuccessRate: 100,
    duplicateRecordsCount: 0,
    missingPhoneRecordsCount: 0,
    leadsWithWebsite: 0,
    leadsWithoutWebsite: 0,
    leadsSyncedToSheets: 0,
    phonePercentage: 0,
    websitePercentage: 0,
    recentCampaigns: [],
    recentLeads: [],
    leadProgressByDate: [],
    categoryDistribution: [],
    cityDistribution: []
  };

  const verifiedMobileCount = s.verifiedMobileLeads ?? s.leadsWithPhone;
  const duplicateCount = s.duplicateRecordsCount ?? 0;
  const missingPhoneCount = s.missingPhoneRecordsCount ?? 0;
  const successRate = s.campaignSuccessRate ?? 100;
  const maxDayCount = Math.max(...s.leadProgressByDate.map(d => d.count), 5);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. VIP Executive Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl vip-card p-6 md:p-8 vip-radial-glow border-amber-500/20 shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
        {/* Subtle decorative gold sheen line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F3D889] to-transparent opacity-60" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[#F3D889] text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>BUILD TECHVIP — Enterprise Lead Intelligence</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              <span className="gold-gradient-text">Lead Hunter PK</span>{' '}
              <span className="text-slate-200">Intelligence Console</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
              Autonomous B2B business discovery pipeline across Pakistan. Real-time OpenStreetMap geographic triangulation,
              official website crawling, PTA Pakistani mobile normalization (<span className="text-[#F3D889] font-mono">03xx</span>),
              and direct Google Sheets synchronization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('wizard')}
              className="gold-gradient-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all transform hover:-translate-y-0.5 cursor-pointer shadow-lg"
            >
              <Target className="w-4 h-4 text-slate-950" />
              <span>Launch Lead Hunter</span>
            </button>
            <button
              onClick={() => onNavigate('leads')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] hover:text-[#F3D889] border border-white/[0.1] hover:border-amber-500/40 transition-all cursor-pointer shadow-sm"
            >
              <Users className="w-4 h-4 text-[#D4AF37]" />
              <span>All Leads ({s.totalLeads})</span>
            </button>
            <button
              onClick={() => onNavigate('exports')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] hover:text-[#F3D889] border border-white/[0.1] hover:border-amber-500/40 transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. High-End Dashboard Overview Metric Cards (Exact 6 User-Requested Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1: Total Leads */}
        <div className="vip-card vip-card-interactive rounded-2xl p-4 flex flex-col justify-between border-white/[0.08] hover:border-amber-500/35">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Leads
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#D4AF37]">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-bold text-white font-mono tracking-tight">
            {s.totalLeads.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-bold">+{s.leadsToday}</span>
            <span>today</span>
          </div>
        </div>

        {/* Metric 2: Verified Mobile Leads */}
        <div className="vip-card vip-card-interactive rounded-2xl p-4 flex flex-col justify-between border-white/[0.08] hover:border-amber-500/35">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mobile Leads
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-bold text-emerald-400 font-mono tracking-tight">
            {verifiedMobileCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1 font-medium">
            <span className="text-emerald-400">03xx</span>
            <span>PTA validated</span>
          </div>
        </div>

        {/* Metric 3: Active Campaigns */}
        <div className="vip-card vip-card-interactive rounded-2xl p-4 flex flex-col justify-between border-white/[0.08] hover:border-amber-500/35">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active Jobs
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#D4AF37]">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-bold text-[#F3D889] font-mono tracking-tight">
            {s.runningCampaigns}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {s.runningCampaigns > 0 ? 'Live hunting active' : 'All jobs finished'}
          </div>
        </div>

        {/* Metric 4: Campaign Success Rate */}
        <div className="vip-card vip-card-interactive rounded-2xl p-4 flex flex-col justify-between border-white/[0.08] hover:border-amber-500/35">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Success Rate
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-bold text-white font-mono tracking-tight flex items-baseline gap-1">
            <span>{successRate}</span>
            <span className="text-xs text-slate-400 font-normal">%</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {s.totalCampaigns} total campaigns
          </div>
        </div>

        {/* Metric 5: Duplicate Records */}
        <div className="vip-card vip-card-interactive rounded-2xl p-4 flex flex-col justify-between border-white/[0.08] hover:border-amber-500/35">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Duplicates
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-bold text-purple-300 font-mono tracking-tight">
            {duplicateCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Deduplicated & merged
          </div>
        </div>

        {/* Metric 6: Public Phone Missing */}
        <div className="vip-card vip-card-interactive rounded-2xl p-4 flex flex-col justify-between border-white/[0.08] hover:border-amber-500/35">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              No Phone
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-bold text-rose-300 font-mono tracking-tight">
            {missingPhoneCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Skipped (Strict rule)
          </div>
        </div>
      </div>

      {/* 3. Acquisition Progress Timeline & Data Quality Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Lead Ingestion Progress Chart */}
        <div className="lg:col-span-2 rounded-2xl vip-card p-6 flex flex-col justify-between shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>7-Day Verified Lead Ingestion</span>
                  <span className="text-[11px] font-mono text-[#F3D889] font-normal">
                    (Pakistan Telecom Validated)
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological distribution of phone-qualified business leads discovered
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-[#F3D889] font-bold px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30">
                  {s.totalLeads} Records
                </span>
              </div>
            </div>

            {/* Bar Chart Visualization with Gold Accents */}
            <div className="h-52 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-white/[0.08]">
              {s.leadProgressByDate.map((item, idx) => {
                const heightPercent = Math.max(8, Math.round((item.count / maxDayCount) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-mono font-bold text-[#F3D889] opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.count}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 shadow-sm ${
                        item.count > 0
                          ? 'bg-gradient-to-t from-[#B8860B] to-[#F3D889] group-hover:from-[#D4AF37] group-hover:to-white'
                          : 'bg-white/[0.04] group-hover:bg-white/[0.08]'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 group-hover:text-white truncate mt-1 font-mono">
                      {item.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-[#D4AF37] to-[#F3D889]" />
              <span>Verifiable Pakistani Enterprise Leads</span>
            </span>
            <span className="font-mono text-slate-500 text-[11px]">Source: Verified Catalog + Places API</span>
          </div>
        </div>

        {/* Data Quality & Market Footprint */}
        <div className="rounded-2xl vip-card p-6 flex flex-col justify-between shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <div>
            <h2 className="text-sm font-bold text-white mb-0.5 flex items-center gap-2">
              <span>Quality & Contact Footprint</span>
            </h2>
            <p className="text-xs text-slate-400 mb-5">PTA compliance & digital online footprint</p>

            <div className="space-y-4">
              {/* Phone Quality */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Valid Public Phone</span>
                  <span className="text-[#F3D889] font-mono font-bold">{s.phonePercentage}%</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/[0.06]">
                  <div
                    style={{ width: `${s.phonePercentage}%` }}
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F3D889] rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                  <span>{s.leadsWithPhone} with numbers</span>
                  <span>{verifiedMobileCount} verified mobile</span>
                </div>
              </div>

              {/* Website Status Breakdown */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Official Website Listed</span>
                  <span className="text-cyan-400 font-mono font-bold">{s.websitePercentage}%</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/[0.06]">
                  <div
                    style={{ width: `${s.websitePercentage}%` }}
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                  <span>{s.leadsWithWebsite} online sites</span>
                  <span>{s.leadsWithoutWebsite} web agency targets</span>
                </div>
              </div>

              {/* Top Cities */}
              <div className="pt-3 border-t border-white/[0.08]">
                <span className="text-xs font-semibold text-slate-300 block mb-2">
                  Top Geographic Hubs
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {s.cityDistribution.length > 0 ? (
                    s.cityDistribution.map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-300 flex items-center gap-1.5"
                      >
                        <span>{c.city}</span>
                        <span className="text-[#F3D889] font-mono font-bold">({c.count})</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No geographic records</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.08]">
            <button
              onClick={() => onNavigate('wizard')}
              className="gold-gradient-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Launch Precision Campaign</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Dual Executive Tables: Recent Campaigns & Recent Verified Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns Panel */}
        <div className="rounded-2xl vip-card p-6 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Recent Campaigns</span>
                <span className="text-[10px] font-mono text-slate-400">({s.recentCampaigns.length})</span>
              </h2>
              <p className="text-xs text-slate-400">Active and recent lead acquisition pipelines</p>
            </div>
            <button
              onClick={() => onNavigate('campaigns')}
              className="text-xs font-bold text-[#F3D889] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Command Center</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {s.recentCampaigns.length > 0 ? (
              s.recentCampaigns.map(camp => {
                const progressPct = camp.progressPercentage || Math.min(100, Math.round(((camp.uniqueLeadsCollected || 0) / (camp.leadTarget || 1)) * 100));
                const isRunning = camp.status === 'Running';
                const isCompleted = camp.status === 'Completed';

                return (
                  <div
                    key={camp.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.07] hover:border-amber-500/30 transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-2">
                          <span>{camp.name}</span>
                          {isRunning && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{camp.category}</span>
                          <span>•</span>
                          <span>{camp.city}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isRunning
                              ? 'bg-amber-500/15 text-[#F3D889] border border-amber-500/30'
                              : isCompleted
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-white/[0.04] text-slate-400 border border-white/[0.08]'
                          }`}
                        >
                          {camp.status}
                        </span>
                        <button
                          onClick={() => onSelectCampaign?.(camp.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-[#F3D889] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>
                          <strong className="text-white">{camp.uniqueLeadsCollected || 0}</strong> / {camp.leadTarget} leads
                        </span>
                        <span className="text-[#F3D889] font-bold">{progressPct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/[0.06]">
                        <div
                          style={{ width: `${progressPct}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted
                              ? 'bg-emerald-400'
                              : 'bg-gradient-to-r from-[#D4AF37] to-[#F3D889]'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No active or historical campaigns recorded
              </div>
            )}
          </div>
        </div>

        {/* Recent Verified Leads Ticker */}
        <div className="rounded-2xl vip-card p-6 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Recent Verified Leads</span>
                <span className="text-[10px] font-mono text-[#F3D889]">PTA Validated</span>
              </h2>
              <p className="text-xs text-slate-400">Latest normalized business contacts added to database</p>
            </div>
            <button
              onClick={() => onNavigate('leads')}
              className="text-xs font-bold text-[#F3D889] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Full Repository</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {s.recentLeads.length > 0 ? (
              s.recentLeads.map(lead => (
                <div
                  key={lead.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.07] hover:border-amber-500/30 transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-white truncate flex items-center gap-2">
                      <span>{lead.businessName}</span>
                      {lead.phoneType === 'mobile' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          MOBILE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate flex items-center gap-2">
                      <span>{lead.city}</span>
                      <span>•</span>
                      <span className="truncate">{lead.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleCopyPhone(lead.id, lead.phoneNumber)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-white/[0.04] hover:bg-white/[0.08] text-[#F3D889] border border-amber-500/20 hover:border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition-all"
                      title="Copy verified phone number"
                    >
                      {copiedId === lead.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>{lead.phoneNumber}</span>
                        </>
                      )}
                    </button>

                    {lead.websiteUrl && (
                      <a
                        href={lead.websiteUrl.startsWith('http') ? lead.websiteUrl : `https://${lead.websiteUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 bg-white/[0.04] border border-white/[0.08]"
                        title="Open official website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No leads recorded yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
