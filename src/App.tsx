/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CampaignProvider } from './context/CampaignContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { CampaignWizard } from './components/campaigns/CampaignWizard';
import { CampaignsView } from './components/campaigns/CampaignsView';
import { LeadsView } from './components/leads/LeadsView';
import { CategoriesView } from './components/categories/CategoriesView';
import { ExportsView } from './components/exports/ExportsView';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { SettingsView } from './components/settings/SettingsView';
import { HelpView } from './components/help/HelpView';
import { IntelligenceNetworkCanvas } from './components/common/IntelligenceNetworkCanvas';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [collapsedSidebar, setCollapsedSidebar] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [focusedCampaignId, setFocusedCampaignId] = useState<string | undefined>(undefined);

  const handleInspectLeads = (campaignId: string) => {
    setFocusedCampaignId(campaignId);
    setCurrentTab('leads');
  };

  const handleCampaignCreated = (campaignId: string) => {
    setFocusedCampaignId(campaignId);
    setCurrentTab('campaigns');
  };

  return (
    <AuthProvider>
      <CampaignProvider>
        <div className="relative min-h-screen bg-[#070910] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-amber-500/30 selection:text-[#F3D889]">
          {/* Animated 3D Business Intelligence Network */}
          <IntelligenceNetworkCanvas />

          {/* VIP Sidebar */}
          <Sidebar
            currentTab={currentTab}
            onSelectTab={tab => {
              if (tab !== 'leads') setFocusedCampaignId(undefined);
              setCurrentTab(tab);
            }}
            collapsed={collapsedSidebar}
            onToggleCollapse={() => setCollapsedSidebar(prev => !prev)}
            isMobileOpen={isMobileOpen}
            onCloseMobile={() => setIsMobileOpen(false)}
          />

          {/* Main Content Area */}
          <div className="relative z-10 flex-1 flex flex-col min-w-0 min-h-screen bg-transparent">
            {/* Top Navigation Bar */}
            <Header
              currentTab={currentTab}
              onOpenMobile={() => setIsMobileOpen(true)}
              onNavigate={tab => {
                if (tab !== 'leads') setFocusedCampaignId(undefined);
                setCurrentTab(tab);
              }}
            />

            {/* Dynamic View Content */}
            <main className="flex-1 pb-12">
              {currentTab === 'dashboard' && (
                <DashboardView
                  onNavigate={tab => setCurrentTab(tab)}
                  onSelectCampaign={handleInspectLeads}
                />
              )}

              {currentTab === 'wizard' && (
                <CampaignWizard
                  onNavigate={tab => setCurrentTab(tab)}
                  onCampaignCreated={handleCampaignCreated}
                />
              )}

              {currentTab === 'leads' && (
                <LeadsView initialCampaignId={focusedCampaignId} />
              )}

              {currentTab === 'campaigns' && (
                <CampaignsView
                  onNavigate={tab => setCurrentTab(tab)}
                  onInspectLeads={handleInspectLeads}
                />
              )}

              {currentTab === 'categories' && (
                <CategoriesView onNavigate={tab => setCurrentTab(tab)} />
              )}

              {currentTab === 'exports' && <ExportsView />}

              {currentTab === 'integrations' && <IntegrationsView />}

              {currentTab === 'settings' && <SettingsView />}

              {currentTab === 'help' && <HelpView />}
            </main>
          </div>
        </div>
      </CampaignProvider>
    </AuthProvider>
  );
}
