import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Lead,
  Campaign,
  BusinessCategory,
  IntegrationSettings,
  DashboardStats,
  WebsiteFilter,
  OutreachStatus,
  SheetsSyncStatus,
  GoogleSheetsConfig
} from '../src/types';
import { DEFAULT_CATEGORIES, VERIFIED_PAKISTAN_BUSINESS_DIRECTORY } from './pakistanData';
import { normalizePakistaniPhoneNumber } from '../src/utils/phoneNormalizer';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'lead_hunter_db.json');

export const DEFAULT_GOOGLE_SHEETS_CONFIG: GoogleSheetsConfig = {
  spreadsheetId: '1wmRyltbn0SU7UIJd8ysdCOmxgj7V2bU58CsVx9tDfzI',
  gid: '902',
  sheetTitle: 'Sheet1',
  accountEmail: 'syedhaider17302@gmail.com',
  autoSync: false,
  lastSyncAt: null,
  lastSyncCount: 0,
  lastSyncError: null
};

export interface DatabaseSchema {
  users: User[];
  categories: BusinessCategory[];
  campaigns: Campaign[];
  leads: Lead[];
  settings: IntegrationSettings;
}

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadDatabase();
  }

  private getDefaultDatabase(): DatabaseSchema {
    const adminUser: User = {
      id: 'usr-admin-01',
      name: 'Syed Haider (Admin)',
      email: 'admin@buildtech.pk',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      companyName: 'Build Technology Pakistan',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    };

    const standardUser: User = {
      id: 'usr-hunter-02',
      name: 'Bilal Khan (Growth Specialist)',
      email: 'hunter@buildtech.pk',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      companyName: 'Apex B2B Outreach',
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString()
    };

    const initialSettings: IntegrationSettings = {
      hasServerSecret: Boolean(process.env.GEOAPIFY_API_KEY),
      provider: 'geoapify',
      status: 'NOT_CONNECTED',
      fallbackMode: 'CURATED_OFFLINE',
      dailyQuotaLimit: 3000,
      dailyQuotaUsed: 0,
      googleSheets: DEFAULT_GOOGLE_SHEETS_CONFIG
    };

    // Pre-seed an initial sample completed campaign and seed leads so the user starts with real data
    const sampleCampaignId = 'cmp-sample-01';
    const sampleCampaign: Campaign = {
      id: sampleCampaignId,
      name: 'Karachi Fashion Boutiques 2026',
      category: 'Fashion and E-commerce',
      subCategory: 'Fashion boutiques',
      country: 'Pakistan',
      province: 'Sindh',
      city: 'Karachi',
      area: 'Clifton',
      leadTarget: 25,
      websiteFilter: 'ALL',
      duplicateHandling: 'SKIP',
      uniqueLeadsCollected: 8,
      recordsProcessed: 12,
      progressPercentage: 100,
      status: 'Completed',
      startTime: new Date(Date.now() - 2 * 86400000).toISOString(),
      completionTime: new Date(Date.now() - 2 * 86400000 + 45000).toISOString(),
      errorDetails: null,
      completionReason: 'Completed: Demo run reached sample target.',
      dataSourceUsed: 'Demo / Synthetic Test Records (Local Dataset)',
      createdBy: adminUser.id,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000 + 45000).toISOString()
    };

    // Seed initial real leads from verified directory matching sample
    const initialLeads: Lead[] = VERIFIED_PAKISTAN_BUSINESS_DIRECTORY.slice(0, 8).map((biz, idx) => {
      const phoneNorm = normalizePakistaniPhoneNumber(biz.phoneNumber);
      const outreachStatuses: OutreachStatus[] = ['New', 'Contacted', 'Interested', 'New', 'Contacted', 'New', 'Converted', 'New'];
      return {
        id: `lead-seed-${idx + 1}`,
        businessName: biz.name,
        phoneNumber: phoneNorm.normalized,
        rawPhoneNumber: biz.phoneNumber || 'Not Available',
        phoneType: phoneNorm.type,
        city: biz.city,
        province: biz.province,
        area: biz.area,
        businessAddress: biz.address,
        websiteUrl: biz.websiteUrl || null,
        websiteStatus: biz.websiteUrl ? 'HAS_WEBSITE' : 'NO_WEBSITE',
        category: biz.category,
        subCategory: biz.subCategory,
        dataSource: biz.source,
        dateCollected: new Date(Date.now() - 2 * 86400000 + idx * 3000).toISOString(),
        campaignId: sampleCampaignId,
        campaignName: sampleCampaign.name,
        notes: idx === 0 ? 'Premier flagship outlet. Contacted brand manager via telephone.' : '',
        outreachStatus: outreachStatuses[idx % outreachStatuses.length],
        rating: biz.rating,
        userRatingsTotal: biz.userRatingsTotal,
        createdBy: adminUser.id,
        createdAt: new Date(Date.now() - 2 * 86400000 + idx * 3000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 86400000 + idx * 3000).toISOString()
      };
    });

    return {
      users: [adminUser, standardUser],
      categories: DEFAULT_CATEGORIES,
      campaigns: [sampleCampaign],
      leads: initialLeads,
      settings: initialSettings
    };
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed.users && parsed.categories && parsed.campaigns && parsed.leads) {
          // Deduplicate categories by ID, slug, and normalized name
          const seenIds = new Set<string>();
          const seenSlugs = new Set<string>();
          const seenNames = new Set<string>();
          const uniqueCategories: BusinessCategory[] = [];

          for (const cat of parsed.categories) {
            const normName = (cat.name || '').toLowerCase().trim();
            const normSlug = (cat.slug || '').toLowerCase().trim();
            if (!seenIds.has(cat.id) && !seenNames.has(normName) && !seenSlugs.has(normSlug)) {
              seenIds.add(cat.id);
              seenNames.add(normName);
              if (normSlug) seenSlugs.add(normSlug);
              uniqueCategories.push(cat);
            }
          }

          // Merge any newly introduced default categories if missing by ID, slug, or name
          for (const defCat of DEFAULT_CATEGORIES) {
            const normName = defCat.name.toLowerCase().trim();
            const normSlug = defCat.slug.toLowerCase().trim();
            if (!seenIds.has(defCat.id) && !seenNames.has(normName) && !seenSlugs.has(normSlug)) {
              seenIds.add(defCat.id);
              seenNames.add(normName);
              seenSlugs.add(normSlug);
              uniqueCategories.push(defCat);
            }
          }

          parsed.categories = uniqueCategories;
          // Ensure settings use Geoapify
          if (!parsed.settings || parsed.settings.provider !== 'geoapify') {
            parsed.settings = {
              hasServerSecret: Boolean(process.env.GEOAPIFY_API_KEY),
              provider: 'geoapify',
              status: 'NOT_CONNECTED',
              fallbackMode: parsed.settings?.fallbackMode || 'CURATED_OFFLINE',
              dailyQuotaLimit: 3000,
              dailyQuotaUsed: 0
            };
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading database file, initializing default:', err);
    }

    const defaultDb = this.getDefaultDatabase();
    this.persistSync(defaultDb);
    return defaultDb;
  }

  private persistSync(dataToSave: DatabaseSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpPath = `${DB_FILE}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public save(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.persistSync(this.data);
    }, 100);
  }

  // --- Users & Auth ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  // --- Categories ---
  public getCategories(): BusinessCategory[] {
    // calculate lead counts dynamically
    const leadCountByCategory = new Map<string, number>();
    for (const lead of this.data.leads) {
      const count = leadCountByCategory.get(lead.category) || 0;
      leadCountByCategory.set(lead.category, count + 1);
    }

    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const uniqueList: BusinessCategory[] = [];

    for (const cat of this.data.categories) {
      const normName = (cat.name || '').toLowerCase().trim();
      if (!seenIds.has(cat.id) && !seenNames.has(normName)) {
        seenIds.add(cat.id);
        seenNames.add(normName);
        uniqueList.push({
          ...cat,
          leadCount: leadCountByCategory.get(cat.name) || 0
        });
      }
    }

    return uniqueList;
  }

  public addCategory(cat: Omit<BusinessCategory, 'id'>): BusinessCategory {
    const newCategory: BusinessCategory = {
      ...cat,
      id: `cat-${crypto.randomUUID().slice(0, 8)}`,
      isCustom: true
    };
    this.data.categories.push(newCategory);
    this.save();
    return newCategory;
  }

  public updateCategory(id: string, updates: Partial<BusinessCategory>): BusinessCategory | null {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates };
    this.save();
    return this.data.categories[idx];
  }

  public deleteCategory(id: string): boolean {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.data.categories.splice(idx, 1);
    this.save();
    return true;
  }

  // --- Campaigns ---
  public getCampaigns(userId?: string, isAdmin?: boolean): Campaign[] {
    if (isAdmin || !userId) {
      return [...this.data.campaigns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return this.data.campaigns
      .filter(c => c.createdBy === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getCampaignById(id: string): Campaign | undefined {
    return this.data.campaigns.find(c => c.id === id);
  }

  public createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'uniqueLeadsCollected' | 'recordsProcessed' | 'progressPercentage'>): Campaign {
    const newCampaign: Campaign = {
      ...campaign,
      id: `cmp-${crypto.randomUUID().slice(0, 8)}`,
      uniqueLeadsCollected: 0,
      recordsProcessed: 0,
      progressPercentage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.campaigns.unshift(newCampaign);
    this.save();
    return newCampaign;
  }

  public updateCampaign(id: string, updates: Partial<Campaign>): Campaign | null {
    const idx = this.data.campaigns.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.campaigns[idx] = {
      ...this.data.campaigns[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.campaigns[idx];
  }

  public deleteCampaign(id: string): boolean {
    const idx = this.data.campaigns.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.data.campaigns.splice(idx, 1);
    // Also remove associated leads if desired or keep
    this.data.leads = this.data.leads.filter(l => l.campaignId !== id);
    this.save();
    return true;
  }

  public addCampaignLog(
    campaignId: string,
    level: 'info' | 'success' | 'warning' | 'error',
    message: string
  ): void {
    const campaign = this.data.campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    if (!campaign.activityLogs) {
      campaign.activityLogs = [];
    }
    campaign.activityLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      message
    });
    if (campaign.activityLogs.length > 100) {
      campaign.activityLogs = campaign.activityLogs.slice(0, 100);
    }
    this.save();
  }

  // --- Leads ---
  public getLeads(filters: {
    userId?: string;
    isAdmin?: boolean;
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
    sortBy?: 'date' | 'name' | 'city' | 'status';
    sortOrder?: 'asc' | 'desc';
  }): { leads: Lead[]; total: number; page: number; totalPages: number } {
    let filtered = this.data.leads;

    // Permissions
    if (!filters.isAdmin && filters.userId) {
      filtered = filtered.filter(l => l.createdBy === filters.userId);
    }

    if (filters.campaignId) {
      filtered = filtered.filter(l => l.campaignId === filters.campaignId);
    }

    if (filters.category && filters.category !== 'All') {
      filtered = filtered.filter(l => l.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters.city && filters.city !== 'All') {
      filtered = filtered.filter(l => l.city.toLowerCase() === filters.city!.toLowerCase());
    }

    if (filters.websiteStatus && filters.websiteStatus !== 'ALL') {
      filtered = filtered.filter(l => l.websiteStatus === filters.websiteStatus);
    }

    if (filters.outreachStatus) {
      filtered = filtered.filter(l => l.outreachStatus === filters.outreachStatus);
    }

    if (filters.sheetsSyncStatus) {
      filtered = filtered.filter(l => l.sheetsSyncStatus === filters.sheetsSyncStatus);
    }

    if (filters.hasPhone === true) {
      filtered = filtered.filter(l => l.phoneNumber !== 'Not Available');
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(l =>
        l.businessName.toLowerCase().includes(q) ||
        l.phoneNumber.toLowerCase().includes(q) ||
        l.rawPhoneNumber.toLowerCase().includes(q) ||
        l.businessAddress.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.area.toLowerCase().includes(q) ||
        (l.websiteUrl && l.websiteUrl.toLowerCase().includes(q))
      );
    }

    // Sorting
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.businessName.localeCompare(b.businessName) * sortOrder;
        case 'city':
          return a.city.localeCompare(b.city) * sortOrder;
        case 'status':
          return a.outreachStatus.localeCompare(b.outreachStatus) * sortOrder;
        case 'date':
        default:
          return (new Date(b.dateCollected).getTime() - new Date(a.dateCollected).getTime()) * (filters.sortOrder === 'asc' ? -1 : 1);
      }
    });

    const total = filtered.length;
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 25);
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return { leads: paginated, total, page, totalPages };
  }

  public getAllLeadsForExport(filters: {
    userId?: string;
    isAdmin?: boolean;
    campaignId?: string;
    category?: string;
    city?: string;
    websiteStatus?: WebsiteFilter;
    leadIds?: string[];
  }): Lead[] {
    let list = this.data.leads;
    if (!filters.isAdmin && filters.userId) {
      list = list.filter(l => l.createdBy === filters.userId);
    }
    if (filters.leadIds && filters.leadIds.length > 0) {
      const idSet = new Set(filters.leadIds);
      return list.filter(l => idSet.has(l.id));
    }
    if (filters.campaignId) {
      list = list.filter(l => l.campaignId === filters.campaignId);
    }
    if (filters.category && filters.category !== 'All') {
      list = list.filter(l => l.category.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters.city && filters.city !== 'All') {
      list = list.filter(l => l.city.toLowerCase() === filters.city!.toLowerCase());
    }
    if (filters.websiteStatus && filters.websiteStatus !== 'ALL') {
      list = list.filter(l => l.websiteStatus === filters.websiteStatus);
    }
    return list;
  }

  public getLeadById(id: string): Lead | undefined {
    return this.data.leads.find(l => l.id === id);
  }

  public addLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead {
    const newLead: Lead = {
      ...lead,
      id: `lead-${crypto.randomUUID().slice(0, 10)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.leads.unshift(newLead);
    this.save();
    return newLead;
  }

  public updateLead(id: string, updates: Partial<Lead>): Lead | null {
    const idx = this.data.leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.data.leads[idx] = {
      ...this.data.leads[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.leads[idx];
  }

  public deleteLead(id: string): boolean {
    const idx = this.data.leads.findIndex(l => l.id === id);
    if (idx === -1) return false;
    this.data.leads.splice(idx, 1);
    this.save();
    return true;
  }

  public bulkDeleteLeads(ids: string[]): number {
    const idSet = new Set(ids);
    const beforeCount = this.data.leads.length;
    this.data.leads = this.data.leads.filter(l => !idSet.has(l.id));
    const deletedCount = beforeCount - this.data.leads.length;
    if (deletedCount > 0) this.save();
    return deletedCount;
  }

  public bulkUpdateLeadStatus(ids: string[], status: OutreachStatus): number {
    const idSet = new Set(ids);
    let updated = 0;
    for (const lead of this.data.leads) {
      if (idSet.has(lead.id)) {
        lead.outreachStatus = status;
        lead.updatedAt = new Date().toISOString();
        updated++;
      }
    }
    if (updated > 0) this.save();
    return updated;
  }

  public bulkUpdateLeadSyncStatus(ids: string[], status: SheetsSyncStatus, error?: string): number {
    const idSet = new Set(ids);
    let updated = 0;
    for (const lead of this.data.leads) {
      if (idSet.has(lead.id)) {
        lead.sheetsSyncStatus = status;
        if (status === 'Synced') {
          lead.sheetsSyncedAt = new Date().toISOString();
          lead.sheetsSyncError = undefined;
        } else if (status === 'Failed') {
          lead.sheetsSyncError = error || 'Sync failed';
        }
        lead.updatedAt = new Date().toISOString();
        updated++;
      }
    }
    if (updated > 0) this.save();
    return updated;
  }

  // --- Duplicate Detection ---
  public isDuplicateLead(
    businessName: string,
    phoneNumber: string,
    city: string,
    existingLeads: Lead[]
  ): boolean {
    const cleanName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCity = city.toLowerCase().trim();

    return existingLeads.some(existing => {
      // If valid phone number exists, match on phone
      if (
        phoneNumber !== 'Not Available' &&
        existing.phoneNumber !== 'Not Available' &&
        phoneNumber.replace(/\D/g, '') === existing.phoneNumber.replace(/\D/g, '')
      ) {
        return true;
      }
      // Or match on exact normalized name + same city
      const existingCleanName = existing.businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanName === existingCleanName && cleanCity === existing.city.toLowerCase().trim()) {
        return true;
      }
      return false;
    });
  }

  // --- Settings & Integrations ---
  public getSettings(): IntegrationSettings {
    const hasSecret = Boolean(process.env.GEOAPIFY_API_KEY && process.env.GEOAPIFY_API_KEY.trim().length > 0);
    const raw = this.data.settings as Record<string, any>;
    delete raw.geoapifyApiKey;
    delete raw.hasGeoapifyKey;

    const settings: IntegrationSettings = {
      hasServerSecret: hasSecret,
      provider: 'geoapify',
      status: raw.status || 'NOT_CONNECTED',
      lastTestedAt: raw.lastTestedAt,
      testMessage: raw.testMessage,
      lastTestResult: raw.lastTestResult,
      fallbackMode: raw.fallbackMode || 'CURATED_OFFLINE',
      dailyQuotaLimit: raw.dailyQuotaLimit || 3000,
      dailyQuotaUsed: raw.dailyQuotaUsed || 0,
      googleSheets: raw.googleSheets || DEFAULT_GOOGLE_SHEETS_CONFIG,
      customLogoUrl: raw.customLogoUrl
    };
    if (!hasSecret && settings.status === 'CONNECTED') {
      settings.status = 'NOT_CONNECTED';
    }
    return settings;
  }

  public updateSettings(updates: Partial<IntegrationSettings>): IntegrationSettings {
    const safeUpdates: Partial<IntegrationSettings> = {};
    if (updates.fallbackMode !== undefined) safeUpdates.fallbackMode = updates.fallbackMode;
    if (updates.dailyQuotaLimit !== undefined) safeUpdates.dailyQuotaLimit = updates.dailyQuotaLimit;
    if (updates.dailyQuotaUsed !== undefined) safeUpdates.dailyQuotaUsed = updates.dailyQuotaUsed;
    if (updates.status !== undefined) safeUpdates.status = updates.status;
    if (updates.lastTestedAt !== undefined) safeUpdates.lastTestedAt = updates.lastTestedAt;
    if (updates.testMessage !== undefined) safeUpdates.testMessage = updates.testMessage;
    if (updates.lastTestResult !== undefined) safeUpdates.lastTestResult = updates.lastTestResult;
    if (updates.googleSheets !== undefined) safeUpdates.googleSheets = updates.googleSheets;
    if (updates.customLogoUrl !== undefined) safeUpdates.customLogoUrl = updates.customLogoUrl;

    this.data.settings = { ...this.data.settings, ...safeUpdates };
    this.save();
    return this.getSettings();
  }

  // --- Dashboard Real Statistics ---
  public getDashboardStats(userId?: string, isAdmin?: boolean): DashboardStats {
    let leads = this.data.leads;
    let campaigns = this.data.campaigns;

    if (!isAdmin && userId) {
      leads = leads.filter(l => l.createdBy === userId);
      campaigns = campaigns.filter(c => c.createdBy === userId);
    }

    const totalLeads = leads.length;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const leadsToday = leads.filter(l => new Date(l.dateCollected).getTime() >= todayStart).length;
    const totalCampaigns = campaigns.length;
    const runningCampaigns = campaigns.filter(c => c.status === 'Running').length;

    const leadsWithPhone = leads.filter(l => l.phoneNumber !== 'Not Available').length;
    const verifiedMobileLeads = leads.filter(l => l.phoneType === 'mobile').length;
    const leadsWithWebsite = leads.filter(l => l.websiteStatus === 'HAS_WEBSITE').length;
    const leadsWithoutWebsite = leads.filter(l => l.websiteStatus === 'NO_WEBSITE').length;
    const leadsSyncedToSheets = leads.filter(l => l.sheetsSyncStatus === 'Synced').length;

    const phonePercentage = totalLeads > 0 ? Math.round((leadsWithPhone / totalLeads) * 100) : 0;
    const websitePercentage = totalLeads > 0 ? Math.round((leadsWithWebsite / totalLeads) * 100) : 0;

    // Actual counts from real campaign runs
    const duplicateRecordsCount = campaigns.reduce((sum, c) => sum + (c.duplicatePhoneCount || 0), 0);
    const missingPhoneRecordsCount = campaigns.reduce((sum, c) => sum + (c.noPhoneCount || 0), 0);

    const completedCampaigns = campaigns.filter(c => c.status === 'Completed').length;
    const finishedCampaigns = campaigns.filter(c => ['Completed', 'Partially Completed', 'Failed'].includes(c.status)).length;
    const campaignSuccessRate = finishedCampaigns > 0 ? Math.round((completedCampaigns / finishedCampaigns) * 100) : 100;

    // Progress chart data for last 7 days
    const leadProgressByDate: { date: string; count: number; cumulative: number }[] = [];
    let runningCumulative = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;

      const count = leads.filter(l => {
        const t = new Date(l.dateCollected).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;

      runningCumulative += count;
      leadProgressByDate.push({
        date: dateStr,
        count,
        cumulative: runningCumulative
      });
    }

    // Top categories distribution
    const catMap = new Map<string, number>();
    for (const l of leads) {
      catMap.set(l.category, (catMap.get(l.category) || 0) + 1);
    }
    const categoryDistribution = Array.from(catMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // City distribution
    const cityMap = new Map<string, number>();
    for (const l of leads) {
      cityMap.set(l.city, (cityMap.get(l.city) || 0) + 1);
    }
    const cityDistribution = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalLeads,
      leadsToday,
      totalCampaigns,
      runningCampaigns,
      leadsWithPhone,
      verifiedMobileLeads,
      campaignSuccessRate,
      duplicateRecordsCount,
      missingPhoneRecordsCount,
      leadsWithWebsite,
      leadsWithoutWebsite,
      leadsSyncedToSheets,
      phonePercentage,
      websitePercentage,
      recentCampaigns: campaigns.slice(0, 5),
      recentLeads: leads.slice(0, 6),
      leadProgressByDate,
      categoryDistribution,
      cityDistribution
    };
  }
}

export const db = new Database();
