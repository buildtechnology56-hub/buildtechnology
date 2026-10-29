import { Router, Request, Response, NextFunction } from 'express';
import { db } from './db';
import { campaignRunner } from './campaignRunner';
import { GeoapifyClient } from './geoapifyClient';
import { PAKISTAN_LOCATIONS } from './pakistanData';
import { User, WebsiteFilter, OutreachStatus, IntegrationSettings, SheetsSyncStatus } from '../src/types';

export const apiRouter = Router();

// Simple auth middleware
interface AuthenticatedRequest extends Request {
  user?: User;
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = db.getUserById(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Fallback to default admin user for seamless access
  const defaultUser = db.getUsers()[0];
  req.user = defaultUser;
  next();
}

function adminOnlyMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin privilege required' });
  }
  next();
}

// ================= AUTH ROUTES =================
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  let user = db.getUserByEmail(email);
  if (!user) {
    user = {
      id: `usr-${Date.now()}`,
      name: email.split('@')[0],
      email: email.toLowerCase(),
      role: 'user',
      createdAt: new Date().toISOString()
    };
    db.getUsers().push(user);
    db.save();
  }

  res.json({
    token: user.id,
    user
  });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

apiRouter.post('/auth/switch', (req: Request, res: Response) => {
  const { role } = req.body;
  const targetUser = db.getUsers().find(u => u.role === (role || 'admin')) || db.getUsers()[0];
  res.json({
    token: targetUser.id,
    user: targetUser
  });
});

// ================= DASHBOARD ROUTES =================
apiRouter.get('/dashboard/stats', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'admin';
  const stats = db.getDashboardStats(req.user?.id, isAdmin);
  res.json(stats);
});

// ================= LOCATIONS =================
apiRouter.get('/locations', (_req: Request, res: Response) => {
  res.json(PAKISTAN_LOCATIONS);
});

// ================= CATEGORIES ROUTES =================
apiRouter.get('/categories', (_req: Request, res: Response) => {
  res.json(db.getCategories());
});

apiRouter.post('/categories', authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { name, icon, description, subcategories } = req.body;
  if (!name || !subcategories || !Array.isArray(subcategories)) {
    return res.status(400).json({ error: 'Name and subcategories array are required' });
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const created = db.addCategory({
    name,
    slug,
    icon: icon || 'Folder',
    description: description || '',
    subcategories
  });
  res.status(201).json(created);
});

apiRouter.patch('/categories/:id', authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.updateCategory(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json(updated);
});

apiRouter.delete('/categories/:id', authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const ok = db.deleteCategory(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json({ success: true });
});

// ================= LEADS ROUTES =================
apiRouter.get('/leads', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const {
    campaignId,
    category,
    city,
    websiteStatus,
    outreachStatus,
    sheetsSyncStatus,
    search,
    hasPhone,
    page,
    limit,
    sortBy,
    sortOrder
  } = req.query;

  const isAdmin = req.user?.role === 'admin';
  const result = db.getLeads({
    userId: req.user?.id,
    isAdmin,
    campaignId: campaignId ? String(campaignId) : undefined,
    category: category ? String(category) : undefined,
    city: city ? String(city) : undefined,
    websiteStatus: websiteStatus ? (websiteStatus as WebsiteFilter) : undefined,
    outreachStatus: outreachStatus ? (outreachStatus as OutreachStatus) : undefined,
    sheetsSyncStatus: sheetsSyncStatus ? (sheetsSyncStatus as SheetsSyncStatus) : undefined,
    search: search ? String(search) : undefined,
    hasPhone: hasPhone === 'true',
    page: page ? parseInt(String(page), 10) : 1,
    limit: limit ? parseInt(String(limit), 10) : 25,
    sortBy: sortBy as any,
    sortOrder: sortOrder as any
  });

  res.json(result);
});

apiRouter.get('/leads/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const lead = db.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  if (req.user?.role !== 'admin' && lead.createdBy !== req.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(lead);
});

apiRouter.patch('/leads/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const lead = db.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  if (req.user?.role !== 'admin' && lead.createdBy !== req.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { notes, outreachStatus, sheetsSyncStatus } = req.body;
  const updated = db.updateLead(req.params.id, {
    notes: notes !== undefined ? notes : lead.notes,
    outreachStatus: outreachStatus || lead.outreachStatus,
    sheetsSyncStatus: sheetsSyncStatus || lead.sheetsSyncStatus
  });
  res.json(updated);
});

apiRouter.delete('/leads/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const lead = db.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  if (req.user?.role !== 'admin' && lead.createdBy !== req.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.deleteLead(req.params.id);
  res.json({ success: true });
});

apiRouter.post('/leads/bulk-delete', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Valid array of lead IDs is required' });
  }
  const count = db.bulkDeleteLeads(ids);
  res.json({ success: true, count });
});

apiRouter.post('/leads/bulk-status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || !status) {
    return res.status(400).json({ error: 'Valid IDs and outreach status required' });
  }
  const count = db.bulkUpdateLeadStatus(ids, status);
  res.json({ success: true, count });
});

apiRouter.post('/leads/sync-sheets-status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { ids, status, error } = req.body;
  if (!Array.isArray(ids) || !status) {
    return res.status(400).json({ error: 'Valid IDs and sync status required' });
  }
  const count = db.bulkUpdateLeadSyncStatus(ids, status, error);

  // Update integration settings sync counters
  const settings = db.getSettings();
  if (status === 'Synced') {
    db.updateSettings({
      googleSheets: {
        ...settings.googleSheets,
        lastSyncAt: new Date().toISOString(),
        lastSyncCount: (settings.googleSheets?.lastSyncCount || 0) + count,
        lastSyncError: null
      }
    });
  }

  res.json({ success: true, count });
});

// CSV Export route with OpenStreetMap / Geoapify attribution compliance
apiRouter.get('/leads/export/csv', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { campaignId, category, city, websiteStatus, ids } = req.query;
  const isAdmin = req.user?.role === 'admin';

  let leadIds: string[] | undefined;
  if (ids && typeof ids === 'string') {
    leadIds = ids.split(',').filter(Boolean);
  }

  const leads = db.getAllLeadsForExport({
    userId: req.user?.id,
    isAdmin,
    campaignId: campaignId ? String(campaignId) : undefined,
    category: category ? String(category) : undefined,
    city: city ? String(city) : undefined,
    websiteStatus: websiteStatus ? (websiteStatus as WebsiteFilter) : undefined,
    leadIds
  });

  const headers = [
    'Business Name',
    'Phone Number',
    'City',
    'Area',
    'Business Address',
    'Website URL',
    'Website Status',
    'Category',
    'Subcategory',
    'Campaign Name',
    'Campaign ID',
    'Data Source',
    'Outreach Status',
    'Date Collected'
  ];

  const escapeCsv = (val?: string | number | null) => {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = leads.map(l => [
    escapeCsv(l.businessName),
    escapeCsv(l.phoneNumber),
    escapeCsv(l.city),
    escapeCsv(l.area),
    escapeCsv(l.businessAddress),
    escapeCsv(l.websiteUrl || 'Not Available'),
    escapeCsv(l.websiteStatus === 'HAS_WEBSITE' ? 'Has Website' : 'No Website'),
    escapeCsv(l.category),
    escapeCsv(l.subCategory),
    escapeCsv(l.campaignName),
    escapeCsv(l.campaignId),
    escapeCsv(l.dataSource),
    escapeCsv(l.outreachStatus),
    escapeCsv(new Date(l.dateCollected).toISOString().split('T')[0])
  ].join(','));

  const attributionNote = '# Attribution: Powered by Geoapify | © OpenStreetMap contributors';
  const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows, attributionNote].join('\r\n');

  const filename = `buildtech_leads_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
});

// ================= CAMPAIGNS ROUTES =================
apiRouter.get('/campaigns', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const isAdmin = req.user?.role === 'admin';
  const campaigns = db.getCampaigns(req.user?.id, isAdmin);
  res.json(campaigns);
});

apiRouter.get('/campaigns/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const campaign = db.getCampaignById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json(campaign);
});

apiRouter.post('/campaigns', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    category,
    subCategory,
    province,
    city,
    area,
    leadTarget,
    phoneRequirement,
    websiteFilter,
    duplicateHandling,
    startImmediately
  } = req.body;

  if (!name || !category || !city || !leadTarget) {
    return res.status(400).json({ error: 'Missing required campaign parameters' });
  }

  const newCampaign = db.createCampaign({
    name,
    category,
    subCategory: subCategory || category,
    country: 'Pakistan',
    province: province || 'Punjab',
    city,
    area: area || undefined,
    leadTarget: Number(leadTarget),
    phoneRequirement: phoneRequirement || 'ANY_PHONE',
    websiteFilter: websiteFilter || 'ALL',
    duplicateHandling: duplicateHandling || 'SKIP',
    status: startImmediately ? 'Running' : 'Draft',
    startTime: startImmediately ? new Date().toISOString() : null,
    completionTime: null,
    errorDetails: null,
    dataSourceUsed: 'Pending selection',
    phoneFoundCount: 0,
    noPhoneCount: 0,
    invalidPhoneCount: 0,
    duplicatePhoneCount: 0,
    phoneQualifiedCount: 0,
    createdBy: req.user!.id
  });

  if (startImmediately) {
    await campaignRunner.startOrResume(newCampaign.id);
    const updated = db.getCampaignById(newCampaign.id);
    return res.status(201).json(updated);
  }

  res.status(201).json(newCampaign);
});

apiRouter.post('/campaigns/:id/start', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await campaignRunner.startOrResume(req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  const campaign = db.getCampaignById(req.params.id);
  res.json({ success: true, campaign });
});

apiRouter.post('/campaigns/:id/resume', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await campaignRunner.startOrResume(req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  const campaign = db.getCampaignById(req.params.id);
  res.json({ success: true, campaign });
});

apiRouter.post('/campaigns/:id/pause', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const result = campaignRunner.pauseCampaign(req.params.id);
  const campaign = db.getCampaignById(req.params.id);
  res.json({ ...result, campaign });
});

apiRouter.post('/campaigns/:id/stop', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const result = campaignRunner.stopCampaign(req.params.id, false);
  const campaign = db.getCampaignById(req.params.id);
  res.json({ ...result, campaign });
});

apiRouter.post('/campaigns/:id/end', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const result = campaignRunner.stopCampaign(req.params.id, true);
  const campaign = db.getCampaignById(req.params.id);
  res.json({ ...result, campaign });
});

apiRouter.post('/campaigns/:id/retry', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await campaignRunner.retryCampaign(req.params.id);
  const campaign = db.getCampaignById(req.params.id);
  res.json({ ...result, campaign });
});

apiRouter.delete('/campaigns/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const campaign = db.getCampaignById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  if (req.user?.role !== 'admin' && campaign.createdBy !== req.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  campaignRunner.stopCampaign(req.params.id);
  db.deleteCampaign(req.params.id);
  res.json({ success: true });
});

// Update campaign sync count
apiRouter.post('/campaigns/:id/sync-sheets-status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { syncedCount } = req.body;
  const campaign = db.getCampaignById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  const updated = db.updateCampaign(req.params.id, {
    syncedLeadsCount: (campaign.syncedLeadsCount || 0) + (syncedCount || 0)
  });
  db.addCampaignLog(req.params.id, 'success', `Synced ${syncedCount} leads directly to Google Sheets.`);
  res.json({ success: true, campaign: updated });
});

// ================= INTEGRATIONS ROUTES =================
apiRouter.get('/integrations/settings', authMiddleware, (_req: AuthenticatedRequest, res: Response) => {
  const settings = db.getSettings();
  res.json(settings);
});

apiRouter.post('/integrations/settings', authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { fallbackMode, dailyQuotaLimit, googleSheets, customLogoUrl } = req.body;
  const updates: Partial<IntegrationSettings> = {};

  if (fallbackMode && (fallbackMode === 'CURATED_OFFLINE' || fallbackMode === 'STRICT_API')) {
    updates.fallbackMode = fallbackMode;
  }

  if (typeof dailyQuotaLimit === 'number' && dailyQuotaLimit > 0) {
    updates.dailyQuotaLimit = dailyQuotaLimit;
  }

  if (googleSheets && typeof googleSheets === 'object') {
    updates.googleSheets = {
      ...db.getSettings().googleSheets,
      ...googleSheets
    };
  }

  if (customLogoUrl && typeof customLogoUrl === 'string') {
    updates.customLogoUrl = customLogoUrl;
  }

  const saved = db.updateSettings(updates);
  res.json(saved);
});

apiRouter.post('/integrations/test-geoapify', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  const result = await GeoapifyClient.testConnection();

  db.updateSettings({
    lastTestedAt: result.testedAt,
    testMessage: result.message,
    lastTestResult: result,
    status: result.status === 'CONNECTED' ? 'CONNECTED' : result.status === 'QUOTA_EXCEEDED' ? 'QUOTA_EXCEEDED' : 'NOT_CONNECTED'
  });

  res.json(result);
});
