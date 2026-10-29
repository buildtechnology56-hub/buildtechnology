import React from 'react';
import { Menu, PlusCircle, Download, Database, ShieldCheck, Zap } from 'lucide-react';
import { NavTab } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useCampaigns } from '../../context/CampaignContext';

interface HeaderProps {
  currentTab: NavTab;
  onOpenMobile: () => void;
  onNavigate: (tab: NavTab) => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string; categoryTag?: string }> = {
  dashboard: { title: 'Executive Intelligence Overview', subtitle: 'Real-time verified B2B lead acquisition & contact telemetry across Pakistan', categoryTag: 'Overview' },
  wizard: { title: 'Targeted Lead Hunter Engine', subtitle: 'Launch automated targeted lead hunting campaigns with precision filters', categoryTag: 'Campaign Engine' },
  leads: { title: 'Verified Lead Database', subtitle: 'Filter, inspect, qualify, and manage collected Pakistani business records', categoryTag: 'Data Repository' },
  campaigns: { title: 'Campaign Command Center', subtitle: 'Monitor active jobs, pause, resume, and review hunting performance', categoryTag: 'Job Control' },
  categories: { title: 'Niche Verticals Library', subtitle: 'Specialized Pakistani industry categories, subcategories, and market sectors', categoryTag: 'Taxonomy' },
  exports: { title: 'Enterprise Export Center', subtitle: 'Export deduplicated, Excel-compatible business records with custom filters', categoryTag: 'Exports' },
  integrations: { title: 'Integrations & Google Sheets', subtitle: 'Live synchronization to Google Sheets, Geoapify credentials & quota monitoring', categoryTag: 'Pipelines' },
  settings: { title: 'Platform Governance & Settings', subtitle: 'System deduplication rules, organization profile, and access permissions', categoryTag: 'Administration' },
  help: { title: 'Documentation & PTA Standards', subtitle: 'Standard Operating Procedures, Pakistani phone formats, and technical guides', categoryTag: 'Documentation' }
};

export const Header: React.FC<HeaderProps> = ({ currentTab, onOpenMobile, onNavigate }) => {
  const { user, isAdmin } = useAuth();
  const { activeRunningCampaigns } = useCampaigns();
  const info = TAB_TITLES[currentTab] || { title: 'Lead Hunter PK', subtitle: '', categoryTag: 'SaaS' };

  return (
    <header className="sticky top-0 z-30 bg-[#070910]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 md:px-8 py-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu + Page Header */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobile}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-[#F3D889] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider text-amber-400/90 font-mono">
                {info.categoryTag}
              </span>
              <span className="hidden sm:inline-block text-slate-600 font-mono text-[10px]">/</span>
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight truncate flex items-center gap-2">
                <span>{info.title}</span>
                {activeRunningCampaigns.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-[#F3D889] border border-amber-500/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]" />
                    </span>
                    <span>{activeRunningCampaigns.length} Active Job{activeRunningCampaigns.length > 1 ? 's' : ''}</span>
                  </span>
                )}
              </h2>
            </div>
            <p className="hidden md:block text-xs text-slate-400 truncate mt-0.5 font-normal">
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons & Status Badge */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={() => onNavigate('exports')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] hover:text-[#F3D889] border border-white/[0.08] hover:border-amber-500/30 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => onNavigate('wizard')}
            className="gold-gradient-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all transform hover:-translate-y-0.5 cursor-pointer shadow-md"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>Launch Hunter</span>
          </button>

          {/* User Badge */}
          <div className="hidden lg:flex items-center gap-2.5 pl-3 border-l border-white/[0.08]">
            <div className="text-right">
              <div className="text-xs font-bold text-white truncate max-w-[140px]">
                {user?.name || 'Syed Haider'}
              </div>
              <div className="text-[10px] text-amber-400/90 font-mono font-medium flex items-center justify-end gap-1">
                <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />
                <span>{isAdmin ? 'ADMINISTRATOR' : 'OPERATOR'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
