export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  companyName?: string;
  createdAt: string;
}

export type WebsiteStatus = 'HAS_WEBSITE' | 'NO_WEBSITE' | 'UNKNOWN';

export type OutreachStatus = 'New' | 'Contacted' | 'Interested' | 'Converted' | 'Not Interested';

export type PhoneType = 'mobile' | 'landline' | 'unknown' | 'none';

export type SheetsSyncStatus = 'Pending' | 'Synced' | 'Failed';

export type PhoneRequirement = 'ANY_PHONE' | 'MOBILE_ONLY';

export interface Lead {
  id: string;
  businessName: string;
  phoneNumber: string; // Normalized: e.g. "03001234567" or "021-35870000" or "Not Available"
  rawPhoneNumber: string; // Original from source: e.g. "+92 300 1234567"
  phoneType: PhoneType;
  phoneSource?: string; // e.g. "Geoapify (OSM)", "Official Website", "Directory"
  phoneSourceUrl?: string | null; // e.g. website or OSM record URL
  phoneVerificationStatus?: string; // e.g. "Format Validated (Public Directory)", "Format Validated (Official Website)"
  city: string;
  province: string;
  area: string;
  businessAddress: string;
  websiteUrl: string | null;
  websiteStatus: WebsiteStatus;
  category: string;
  subCategory: string;
  dataSource: string;
  dateCollected: string;
  campaignId: string;
  campaignName: string;
  notes: string;
  outreachStatus: OutreachStatus;
  googlePlaceId?: string;
  rating?: number;
  userRatingsTotal?: number;
  sheetsSyncStatus?: SheetsSyncStatus;
  sheetsSyncedAt?: string;
  sheetsSyncError?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus =
  | 'Draft'
  | 'Queued'
  | 'Running'
  | 'Paused'
  | 'Completed'
  | 'Partially Completed'
  | 'Failed'
  | 'Stopped'
  | 'Ended by User';

export type WebsiteFilter = 'ALL' | 'HAS_WEBSITE' | 'NO_WEBSITE';

export type DuplicateHandling = 'SKIP' | 'MERGE';

export interface CampaignLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface Campaign {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  country: 'Pakistan';
  province: string;
  city: string;
  area?: string;
  leadTarget: number;
  phoneRequirement?: PhoneRequirement; // 'ANY_PHONE' or 'MOBILE_ONLY'
  websiteFilter: WebsiteFilter;
  duplicateHandling: DuplicateHandling;
  uniqueLeadsCollected: number; // Exact count of saved phone-qualified leads
  recordsProcessed: number;
  progressPercentage: number;
  status: CampaignStatus;
  startTime: string | null;
  completionTime: string | null;
  errorDetails: string | null;
  dataSourceUsed: string;
  completionReason?: string;
  totalPoisScanned?: number; // Businesses discovered / evaluated
  phoneFoundCount?: number; // Total businesses where a phone number was detected
  noPhoneCount?: number; // Businesses skipped due to missing public phone
  invalidPhoneCount?: number; // Numbers skipped due to invalid phone formatting
  duplicatePhoneCount?: number; // Duplicates skipped
  phoneQualifiedCount?: number; // Count of qualifying phone leads
  mobileQualifiedCount?: number;
  syncedLeadsCount?: number;
  activityLogs?: CampaignLog[];
  checkpoint?: { taskIdx: number; offset: number };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  subcategories: string[];
  leadCount?: number;
  isCustom?: boolean;
}

export interface GeoapifyTestResult {
  success: boolean;
  message: string;
  latencyMs: number;
  status: 'CONNECTED' | 'UNAUTHORIZED' | 'QUOTA_EXCEEDED' | 'ERROR' | 'NOT_CONFIGURED';
  httpStatus: number;
  resultsCount: number;
  testedAt: string;
  actionableInstruction?: string;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  gid: string;
  worksheetGid?: string;
  sheetTitle: string;
  accountEmail: string;
  autoSync: boolean;
  lastSyncAt: string | null;
  lastSyncCount: number;
  lastSyncError: string | null;
}

export interface GoogleSheetsTestResult {
  success: boolean;
  message: string;
  spreadsheetTitle?: string;
  sheetTitle?: string;
  rowCount?: number;
  httpStatus: number;
  testedAt: string;
}

export interface IntegrationSettings {
  hasServerSecret: boolean;
  provider: 'geoapify';
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'UNAUTHORIZED' | 'QUOTA_EXCEEDED' | 'ERROR';
  lastTestedAt?: string;
  testMessage?: string;
  lastTestResult?: GeoapifyTestResult;
  fallbackMode: 'CURATED_OFFLINE' | 'STRICT_API';
  dailyQuotaLimit: number;
  dailyQuotaUsed: number;
  googleSheets: GoogleSheetsConfig;
  customLogoUrl?: string;
}

export interface DashboardStats {
  totalLeads: number;
  leadsToday: number;
  totalCampaigns: number;
  runningCampaigns: number;
  leadsWithPhone: number;
  verifiedMobileLeads?: number;
  campaignSuccessRate?: number;
  duplicateRecordsCount?: number;
  missingPhoneRecordsCount?: number;
  leadsWithWebsite: number;
  leadsWithoutWebsite: number;
  leadsSyncedToSheets: number;
  phonePercentage: number;
  websitePercentage: number;
  recentCampaigns: Campaign[];
  recentLeads: Lead[];
  leadProgressByDate: { date: string; count: number; cumulative: number }[];
  categoryDistribution: { category: string; count: number }[];
  cityDistribution: { city: string; count: number }[];
}

export interface PakistanLocationData {
  country: 'Pakistan';
  provinces: {
    id: string;
    name: string;
    cities: {
      id: string;
      name: string;
      popularAreas: string[];
    }[];
  }[];
}
