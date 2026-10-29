import React from 'react';
import {
  LayoutDashboard,
  Target,
  Users,
  Layers,
  Tag,
  FileSpreadsheet,
  KeyRound,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';
import { useCampaigns } from '../../context/CampaignContext';
import { useAuth } from '../../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'wizard'
  | 'leads'
  | 'campaigns'
  | 'categories'
  | 'exports'
  | 'integrations'
  | 'settings'
  | 'help';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile
}) => {
  const { activeRunningCampaigns } = useCampaigns();
  const { user, switchRole, isAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'wizard' as NavTab, label: 'Lead Hunter', icon: Target, isGoldCta: true },
    { id: 'campaigns' as NavTab, label: 'Campaigns', icon: Layers, badge: activeRunningCampaigns.length > 0 ? `${activeRunningCampaigns.length} live` : undefined },
    { id: 'leads' as NavTab, label: 'All Leads', icon: Users },
    { id: 'categories' as NavTab, label: 'Niche Verticals', icon: Tag },
    { id: 'exports' as NavTab, label: 'CSV Exports', icon: FileSpreadsheet },
    { id: 'integrations' as NavTab, label: 'Integrations & API', icon: KeyRound },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
    { id: 'help' as NavTab, label: 'Documentation', icon: HelpCircle }
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-[#080d1a]/95 backdrop-blur-xl border-r border-white/[0.08] text-slate-300 select-none shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
      {/* Brand Header with 3D Logo Presentation */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Official 3D-Styled Logo Bezel */}
          <div className="relative group w-10 h-10 rounded-xl p-[1px] bg-gradient-to-br from-[#F3D889] via-[#D4AF37] to-[#8C6808] shadow-[0_0_16px_rgba(212,175,55,0.22)] flex-shrink-0 transition-transform duration-300 hover:scale-105">
            <div className="w-full h-full rounded-[11px] overflow-hidden bg-[#070910] flex items-center justify-center">
              <img
                src="/assets/aistudio/Screenshot_2026-09-02_083355_c501a407.png"
                alt="BUILD TECHVIP Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            {/* Subtle corner specular sheen */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs tracking-wider text-white uppercase truncate">
                  BUILD TECHVIP
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-[#F3D889] border border-amber-500/30 uppercase tracking-widest">
                  VIP
                </span>
              </div>
              <p className="text-[10px] font-semibold text-amber-400/90 tracking-wide truncate">
                Lead Hunter PK
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-[#F3D889] hover:bg-white/[0.05] transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Subtitle / Live Campaign Ticker */}
      {activeRunningCampaigns.length > 0 && !collapsed && (
        <div className="mx-3 mt-3 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-[#0B1220] to-transparent border border-amber-500/30 flex items-center justify-between shadow-[0_4px_16px_rgba(212,175,55,0.08)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]" />
            </span>
            <div className="truncate">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#F3D889]">
                Live Hunting
              </div>
              <div className="text-[11px] text-slate-200 truncate font-medium">
                {activeRunningCampaigns[0].name}
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-[#F3D889] bg-[#070910] px-2 py-0.5 rounded border border-amber-500/30 shadow-inner">
            {activeRunningCampaigns[0].progressPercentage}%
          </span>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          if (item.isGoldCta) {
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer mb-2.5 ${
                  isActive
                    ? 'gold-gradient-btn'
                    : 'text-[#F3D889] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400/50 shadow-[0_4px_12px_rgba(212,175,55,0.1)]'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-slate-950' : 'text-[#F3D889]'}`} />
                {!collapsed && (
                  <span className="truncate flex-1 font-extrabold tracking-wide">{item.label}</span>
                )}
                {!collapsed && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${isActive ? 'bg-black/20 text-slate-950' : 'bg-amber-500/20 text-[#F3D889]'}`}>
                    HUNT
                  </span>
                )}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? 'border-l-2 border-[#D4AF37] text-white font-bold bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-l-2 border-transparent'
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-[#F3D889]' : 'text-slate-400 group-hover:text-slate-200'}`} />
              {!collapsed && (
                <span className="truncate flex-1">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/15 text-[#F3D889] border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User / Executive Account Profile Footer */}
      <div className="p-3 border-t border-white/[0.08] bg-[#070910]/70">
        {!collapsed ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 px-1 py-1">
              <div className="relative w-8 h-8 rounded-lg p-[1px] bg-gradient-to-br from-[#F3D889] to-[#8C6808] flex-shrink-0 shadow-md">
                <div className="w-full h-full rounded-[7px] bg-[#0B1220] text-[#F3D889] flex items-center justify-center font-bold text-xs font-mono">
                  {user?.name?.slice(0, 2).toUpperCase() || 'SH'}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{user?.name || 'Syed Haider'}</div>
                <div className="text-[10px] text-amber-400/90 truncate flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />
                  <span>{isAdmin ? 'VIP Executive Admin' : 'Lead Specialist'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => switchRole(isAdmin ? 'user' : 'admin')}
              className="w-full text-center py-1.5 px-2 rounded-lg text-[10px] font-semibold text-slate-300 hover:text-[#F3D889] bg-white/[0.04] hover:bg-white/[0.08] transition-colors border border-white/[0.06] cursor-pointer"
            >
              Switch Role ({isAdmin ? 'to Operator' : 'to Admin'})
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              className="w-8 h-8 rounded-lg p-[1px] bg-gradient-to-br from-[#F3D889] to-[#8C6808] cursor-pointer"
              title={`${user?.name} (${user?.role})`}
            >
              <div className="w-full h-full rounded-[7px] bg-[#0B1220] text-[#F3D889] flex items-center justify-center font-bold text-xs font-mono">
                {user?.name?.slice(0, 2).toUpperCase() || 'SH'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside
        className={`hidden md:block flex-shrink-0 transition-all duration-300 ease-out z-20 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
