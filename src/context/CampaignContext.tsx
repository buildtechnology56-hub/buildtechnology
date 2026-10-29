import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Campaign, WebsiteFilter, PhoneRequirement } from '../types';
import { api } from '../api/client';

interface CreateCampaignInput {
  name: string;
  category: string;
  subCategory?: string;
  province?: string;
  city: string;
  area?: string;
  leadTarget: number;
  phoneRequirement?: PhoneRequirement;
  websiteFilter: WebsiteFilter;
  duplicateHandling: 'SKIP' | 'MERGE';
  startImmediately?: boolean;
}

interface CampaignContextType {
  campaigns: Campaign[];
  activeRunningCampaigns: Campaign[];
  isLoading: boolean;
  refreshCampaigns: () => Promise<Campaign[]>;
  createCampaign: (data: CreateCampaignInput) => Promise<Campaign>;
  startCampaign: (id: string) => Promise<void>;
  resumeCampaign: (id: string) => Promise<void>;
  pauseCampaign: (id: string) => Promise<void>;
  stopCampaign: (id: string) => Promise<void>;
  endCampaign: (id: string) => Promise<void>;
  retryCampaign: (id: string) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshCampaigns = useCallback(async (): Promise<Campaign[]> => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
      return data;
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCampaigns();
  }, [refreshCampaigns]);

  // Polling loop when any campaign is running or queued
  const hasRunning = campaigns.some(c => c.status === 'Running' || c.status === 'Queued');
  useEffect(() => {
    if (!hasRunning) return;

    const interval = setInterval(() => {
      refreshCampaigns();
    }, 1200);

    return () => clearInterval(interval);
  }, [hasRunning, refreshCampaigns]);

  const createCampaign = async (data: CreateCampaignInput): Promise<Campaign> => {
    const created = await api.createCampaign(data);
    await refreshCampaigns();
    return created;
  };

  const startCampaign = async (id: string) => {
    await api.startCampaign(id);
    await refreshCampaigns();
  };

  const resumeCampaign = async (id: string) => {
    await api.resumeCampaign(id);
    await refreshCampaigns();
  };

  const pauseCampaign = async (id: string) => {
    await api.pauseCampaign(id);
    await refreshCampaigns();
  };

  const stopCampaign = async (id: string) => {
    await api.stopCampaign(id);
    await refreshCampaigns();
  };

  const endCampaign = async (id: string) => {
    await api.endCampaign(id);
    await refreshCampaigns();
  };

  const retryCampaign = async (id: string) => {
    await api.retryCampaign(id);
    await refreshCampaigns();
  };

  const deleteCampaign = async (id: string) => {
    await api.deleteCampaign(id);
    await refreshCampaigns();
  };

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        activeRunningCampaigns: campaigns.filter(c => c.status === 'Running'),
        isLoading,
        refreshCampaigns,
        createCampaign,
        startCampaign,
        resumeCampaign,
        pauseCampaign,
        stopCampaign,
        endCampaign,
        retryCampaign,
        deleteCampaign
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaigns = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaigns must be used within a CampaignProvider');
  }
  return context;
};
