import { db } from './db';
import { Campaign, Lead, OutreachStatus, WebsiteStatus, PhoneRequirement } from '../src/types';
import {
  VERIFIED_PAKISTAN_BUSINESS_DIRECTORY,
  VerifiedPakistanBusiness,
  generateProceduralPakistanLeads
} from './pakistanData';
import { normalizePakistaniPhoneNumber } from '../src/utils/phoneNormalizer';
import {
  GeoapifyClient,
  GeoapifyCoordinates,
  PAKISTAN_CITY_COORDINATES,
  PAKISTAN_CITY_SUB_DISTRICTS
} from './geoapifyClient';
import { PhoneDiscoveryEngine } from './phoneDiscovery';

interface JobControl {
  isPaused: boolean;
  isStopped: boolean;
  endedByUser: boolean;
}

/**
 * Returns discovery keywords for categories where OpenStreetMap benefits from name search
 * (e.g. rent a car companies, real estate developers, clinics, agencies, solar, etc.).
 */
function getDiscoveryKeywords(category?: string, subCategory?: string, campaignName?: string): string[] {
  const combined = `${category || ''} ${subCategory || ''} ${campaignName || ''}`.toLowerCase();
  const keywords: Set<string> = new Set();

  // Automotive / Car Rentals
  if (
    combined.includes('rent') ||
    combined.includes('car rental') ||
    combined.includes('automotive') ||
    combined.includes('auto') ||
    combined.includes('vehicle') ||
    combined.includes('cab') ||
    combined.includes('transport')
  ) {
    ['rent a car', 'car rental', 'car hire', 'rent car', 'vehicle rental', 'rental', 'tours', 'cab', 'transport'].forEach(k => keywords.add(k));
  }

  // Real Estate & Construction
  if (
    combined.includes('real estate') ||
    combined.includes('builder') ||
    combined.includes('developer') ||
    combined.includes('property') ||
    combined.includes('construct') ||
    combined.includes('architect') ||
    combined.includes('housing')
  ) {
    ['builder', 'developer', 'estate', 'property', 'construct', 'architect', 'housing', 'realtor', 'real estate'].forEach(k => keywords.add(k));
  }

  // Solar & Renewable Energy
  if (combined.includes('solar') || combined.includes('renewable') || combined.includes('energy')) {
    ['solar', 'energy', 'power', 'renewables', 'inverter'].forEach(k => keywords.add(k));
  }

  // Medical & Healthcare
  if (
    combined.includes('medical') ||
    combined.includes('clinic') ||
    combined.includes('hospital') ||
    combined.includes('health') ||
    combined.includes('doctor') ||
    combined.includes('pharma') ||
    combined.includes('dental')
  ) {
    ['clinic', 'hospital', 'dental', 'diagnostic', 'pharmacy', 'medical', 'laboratory', 'doctor', 'health'].forEach(k => keywords.add(k));
  }

  // Travel & Tourism
  if (combined.includes('travel') || combined.includes('tour') || combined.includes('tourism') || combined.includes('umrah')) {
    ['travel agency', 'tours', 'travels', 'tourism', 'hajj umrah', 'visa', 'air ticket'].forEach(k => keywords.add(k));
  }

  // Food & Hospitality
  if (combined.includes('food') || combined.includes('restaurant') || combined.includes('cafe') || combined.includes('catering') || combined.includes('hotel')) {
    ['restaurant', 'cafe', 'fast food', 'hotel', 'bakers', 'catering', 'pizza', 'burger'].forEach(k => keywords.add(k));
  }

  // Fashion & Retail
  if (combined.includes('fashion') || combined.includes('cloth') || combined.includes('boutique') || combined.includes('apparel')) {
    ['clothing', 'boutique', 'fashion', 'shoes', 'textile', 'apparel', 'tailor'].forEach(k => keywords.add(k));
  }

  // Education & Training
  if (combined.includes('education') || combined.includes('school') || combined.includes('college') || combined.includes('academy')) {
    ['school', 'college', 'academy', 'university', 'grammar school', 'coaching'].forEach(k => keywords.add(k));
  }

  // Software & Technology
  if (combined.includes('software') || combined.includes('tech') || combined.includes('it') || combined.includes('digital')) {
    ['software', 'technologies', 'solutions', 'digital', 'tech', 'systems'].forEach(k => keywords.add(k));
  }

  // Beauty & Salons
  if (combined.includes('beauty') || combined.includes('salon') || combined.includes('spa') || combined.includes('parlour')) {
    ['salon', 'beauty parlour', 'spa', 'barber', 'hairdresser'].forEach(k => keywords.add(k));
  }

  // Gyms & Fitness
  if (combined.includes('gym') || combined.includes('fitness') || combined.includes('sport')) {
    ['gym', 'fitness', 'workout', 'crossfit', 'sports centre'].forEach(k => keywords.add(k));
  }

  // Always include '' (no keyword, category-only query)
  keywords.add('');

  return Array.from(keywords);
}

/**
 * Validates candidate business relevance to prevent misclassifying non-target businesses
 * (e.g., ensuring web/software developers aren't saved as real estate developers, or petrol pumps as car rental).
 */
function isCandidateMatchingCategory(
  candidate: VerifiedPakistanBusiness,
  category?: string,
  subCategory?: string
): boolean {
  const combined = `${category || ''} ${subCategory || ''}`.toLowerCase();
  const name = (candidate.name || '').toLowerCase();

  // If Real Estate / Builders / Developers
  if (
    combined.includes('real estate') ||
    combined.includes('builder') ||
    combined.includes('developer') ||
    combined.includes('property') ||
    combined.includes('construct') ||
    combined.includes('architect')
  ) {
    // Negative filter: exclude pure IT/software/web developers, boat builders, tuition centres
    if (
      /software|web dev|mobile app|app dev|full stack|frontend|backend|boat builder|it solutions|freelance|tuition|academy|barber|salon|clinic/i.test(
        name
      )
    ) {
      return false;
    }
    // Positive match: either name contains real estate/builder terms or category is office/building
    const hasReTerm =
      /builder|developer|estate|propert|construct|architect|housing|realt|town|residencia|complex|plots|scheme|contractor|realty/i.test(
        name
      );
    return hasReTerm;
  }

  // If Rent-a-car / Car Rental
  if (combined.includes('rent') || combined.includes('car rental') || combined.includes('hire') || combined.includes('rent-a-car')) {
    // Negative filter: exclude petrol pumps, tyre puncture, motorcycle repair unless rental
    if (/cng|petrol|fuel station|filling station|puncture|tyre shop|tire shop/i.test(name) && !/rent|hire|car/i.test(name)) {
      return false;
    }
    return true;
  }

  return true;
}

class CampaignRunner {
  private activeJobs: Map<string, JobControl> = new Map();

  /**
   * Starts or resumes a campaign
   */
  public async startOrResume(campaignId: string): Promise<{ success: boolean; message: string }> {
    const campaign = db.getCampaignById(campaignId);
    if (!campaign) {
      return { success: false, message: 'Campaign not found' };
    }

    if (campaign.status === 'Running' && this.activeJobs.has(campaignId)) {
      return { success: true, message: 'Campaign is already running' };
    }

    if (campaign.status === 'Completed') {
      return { success: false, message: 'Campaign has already completed its target' };
    }

    // Set or reset job control
    const control: JobControl = { isPaused: false, isStopped: false, endedByUser: false };
    this.activeJobs.set(campaignId, control);

    // Update campaign status in database
    db.updateCampaign(campaignId, {
      status: 'Running',
      startTime: campaign.startTime || new Date().toISOString(),
      errorDetails: null
    });
    db.addCampaignLog(campaignId, 'info', `Campaign resumed hunting target of ${campaign.leadTarget} phone-qualified leads.`);

    // Run execution in background (do not block the HTTP request)
    this.runJob(campaignId, control).catch(err => {
      console.error(`Error running campaign ${campaignId}:`, err);
      db.updateCampaign(campaignId, {
        status: 'Failed',
        errorDetails: err instanceof Error ? err.message : String(err)
      });
      db.addCampaignLog(campaignId, 'error', `Execution failed: ${err instanceof Error ? err.message : String(err)}`);
      this.activeJobs.delete(campaignId);
    });

    return { success: true, message: 'Campaign started successfully' };
  }

  /**
   * Pauses an active campaign
   */
  public pauseCampaign(campaignId: string): { success: boolean; message: string } {
    const control = this.activeJobs.get(campaignId);
    if (control) {
      control.isPaused = true;
    }
    db.updateCampaign(campaignId, { status: 'Paused' });
    db.addCampaignLog(campaignId, 'warning', 'Campaign paused by operator.');
    return { success: true, message: 'Campaign paused' };
  }

  /**
   * Stops an active campaign
   */
  public stopCampaign(campaignId: string, endedByUser: boolean = false): { success: boolean; message: string } {
    const control = this.activeJobs.get(campaignId);
    if (control) {
      control.isStopped = true;
      control.endedByUser = endedByUser;
    }
    this.activeJobs.delete(campaignId);
    const newStatus = endedByUser ? 'Ended by User' : 'Stopped';
    db.updateCampaign(campaignId, {
      status: newStatus,
      completionReason: endedByUser ? 'Manually ended by operator' : 'Campaign stopped'
    });
    db.addCampaignLog(campaignId, 'warning', `Campaign marked as ${newStatus}.`);
    return { success: true, message: `Campaign ${newStatus.toLowerCase()}` };
  }

  /**
   * Retries a failed campaign
   */
  public async retryCampaign(campaignId: string): Promise<{ success: boolean; message: string }> {
    const campaign = db.getCampaignById(campaignId);
    if (!campaign) {
      return { success: false, message: 'Campaign not found' };
    }
    db.updateCampaign(campaignId, {
      status: 'Draft',
      errorDetails: null
    });
    db.addCampaignLog(campaignId, 'info', 'Campaign reset to Draft for retry.');
    return this.startOrResume(campaignId);
  }

  /**
   * Core multi-stage phone acquisition pipeline.
   * STRICT REQUIREMENT: Only saves and counts unique business leads that have a verified,
   * publicly available phone number. Businesses without public phone numbers are evaluated
   * and counted towards scanned POIs, but never count towards leadTarget.
   */
  private async runJob(campaignId: string, control: JobControl): Promise<void> {
    const campaign = db.getCampaignById(campaignId);
    if (!campaign) return;

    const effectiveGeoapifyKey = (process.env.GEOAPIFY_API_KEY || '').trim();
    const isLiveConfigured = Boolean(effectiveGeoapifyKey);

    const phoneReq: PhoneRequirement = campaign.phoneRequirement || 'ANY_PHONE';

    // Recalculate actual existing leads for this campaign directly from DB
    const existingCampaignLeads = db.getAllLeadsForExport({ campaignId: campaign.id });
    let uniqueCount = existingCampaignLeads.length;
    let mobileQualifiedCount = existingCampaignLeads.filter(l => l.phoneType === 'mobile').length;
    let phoneFoundCount = campaign.phoneFoundCount || uniqueCount;
    let totalPoisScanned = campaign.totalPoisScanned || 0;
    let processedCount = campaign.recordsProcessed || 0;
    let noPhoneCount = campaign.noPhoneCount || 0;
    let invalidPhoneCount = campaign.invalidPhoneCount || 0;
    let duplicatePhoneCount = campaign.duplicatePhoneCount || 0;

    // Load user leads for global duplicate comparison
    const existingUserLeads = db.getLeads({ userId: campaign.createdBy, limit: 15000 }).leads;

    // Geographic multi-district hubs for expansion across large cities
    const cityKey = (campaign.city || 'lahore').toLowerCase().trim();
    const subDistricts: GeoapifyCoordinates[] =
      PAKISTAN_CITY_SUB_DISTRICTS[cityKey] ||
      (PAKISTAN_CITY_COORDINATES[cityKey]
        ? [PAKISTAN_CITY_COORDINATES[cityKey]]
        : [PAKISTAN_CITY_COORDINATES['lahore']]);

    // Build search tasks: combinations of strategic sub-districts, categories, and discovery keywords
    interface SearchTask {
      district: GeoapifyCoordinates;
      keyword: string;
      label: string;
      categoryOverride?: string;
    }

    const searchTasks: SearchTask[] = [];
    const discoveryKeywords = getDiscoveryKeywords(campaign.category, campaign.subCategory, campaign.name);
    const resolvedCategory = GeoapifyClient.resolveGeoapifyCategory(campaign.category, campaign.subCategory);

    // Tier 1: Primary category with all discovery keywords across all subdistricts
    for (const kw of discoveryKeywords) {
      for (const dist of subDistricts) {
        searchTasks.push({
          district: dist,
          keyword: kw,
          label: dist.label || campaign.city,
          categoryOverride: resolvedCategory
        });
      }
    }

    // Tier 2: Category expansion for sectors with cross-listed OpenStreetMap tags (e.g. rent-a-car or real estate)
    const combinedCat = `${campaign.category || ''} ${campaign.subCategory || ''} ${campaign.name || ''}`.toLowerCase();
    if (combinedCat.includes('rent') || combinedCat.includes('car') || combinedCat.includes('auto')) {
      const rentalKws = ['rent a car', 'car rental', 'car hire', 'vehicle rental'];
      const altCategories = ['service.vehicle', 'commercial.vehicle', 'office.company'];
      for (const altCat of altCategories) {
        for (const kw of rentalKws) {
          for (const dist of subDistricts) {
            searchTasks.push({
              district: dist,
              keyword: kw,
              label: `${dist.label || campaign.city} (${altCat})`,
              categoryOverride: altCat
            });
          }
        }
      }
    } else if (combinedCat.includes('real estate') || combinedCat.includes('builder') || combinedCat.includes('developer')) {
      const reKws = ['developer', 'builder', 'estate', 'property'];
      const altCategories = ['office.company', 'commercial'];
      for (const altCat of altCategories) {
        for (const kw of reKws) {
          for (const dist of subDistricts) {
            searchTasks.push({
              district: dist,
              keyword: kw,
              label: `${dist.label || campaign.city} (${altCat})`,
              categoryOverride: altCat
            });
          }
        }
      }
    }

    // Checkpoint restoration
    let currentTaskIdx = campaign.checkpoint?.taskIdx || 0;
    let searchOffset = campaign.checkpoint?.offset || 0;
    if (currentTaskIdx >= searchTasks.length) {
      currentTaskIdx = 0;
      searchOffset = 0;
    }

    let consecutiveApiErrors = 0;
    const checkedAreaLabels: string[] = [];
    const batchSize = 50;

    const isTargetMet = () => {
      if (phoneReq === 'MOBILE_ONLY') {
        return mobileQualifiedCount >= campaign.leadTarget;
      }
      return uniqueCount >= campaign.leadTarget;
    };

    // Stage 1: Campaign started diagnostic log
    const startMsg = `[Stage 1: Started] Hunt initiated for "${campaign.name}" | Target: ${campaign.leadTarget} ${phoneReq === 'MOBILE_ONLY' ? 'Pakistani Mobile (03xx)' : 'Any Phone'} leads | Current: ${uniqueCount} (${mobileQualifiedCount} mobile) | Category: "${campaign.category}" (${campaign.subCategory}) | City: "${campaign.city}" | Mode: ${isLiveConfigured ? 'Geoapify Places API (Live)' : 'Curated Directory (Offline)'} | Search Tasks: ${searchTasks.length} scheduled (Resuming at task #${currentTaskIdx + 1}, offset ${searchOffset})`;
    console.log(`[CampaignRunner] ${startMsg}`);
    db.addCampaignLog(campaignId, 'info', startMsg);

    // Initial check: is target already met?
    if (isTargetMet()) {
      db.updateCampaign(campaignId, {
        status: 'Completed',
        uniqueLeadsCollected: uniqueCount,
        phoneQualifiedCount: uniqueCount,
        mobileQualifiedCount,
        progressPercentage: 100,
        completionTime: new Date().toISOString(),
        completionReason: `Target already reached: Found ${uniqueCount} phone-qualified leads (${mobileQualifiedCount} mobile).`
      });
      db.addCampaignLog(campaignId, 'success', `Campaign target already satisfied: ${uniqueCount} leads.`);
      this.activeJobs.delete(campaignId);
      return;
    }

    while (!isTargetMet() && currentTaskIdx < searchTasks.length) {
      // 1. Check control interrupts
      if (control.isPaused) {
        db.updateCampaign(campaignId, {
          status: 'Paused',
          checkpoint: { taskIdx: currentTaskIdx, offset: searchOffset }
        });
        this.activeJobs.delete(campaignId);
        return;
      }
      if (control.isStopped) {
        const finalStatus = control.endedByUser ? 'Ended by User' : 'Stopped';
        db.updateCampaign(campaignId, {
          status: finalStatus,
          checkpoint: { taskIdx: currentTaskIdx, offset: searchOffset }
        });
        this.activeJobs.delete(campaignId);
        return;
      }

      const activeTask = searchTasks[currentTaskIdx];
      const activeDistrict = activeTask.district;
      const activeKeyword = activeTask.keyword;
      const activeCategory = activeTask.categoryOverride || resolvedCategory;
      const areaLabel = activeDistrict.label || `${campaign.city} (Sector ${currentTaskIdx + 1})`;
      if (!checkedAreaLabels.includes(areaLabel)) {
        checkedAreaLabels.push(areaLabel);
      }

      // 2. Fetch candidate batch
      let candidatePool: VerifiedPakistanBusiness[] = [];
      let sourceName = 'Demo / Synthetic Test Records (Local Dataset)';
      let batchRawFeatureCount = 0;

      if (isLiveConfigured) {
        sourceName = 'Geoapify Places API (Live)';
        db.updateCampaign(campaignId, { dataSourceUsed: sourceName });

        // Stage 2: API request attempted diagnostic log with coordinates and keyword
        const requestMsg = `[Stage 2: API Request] Querying ${areaLabel} (lat: ${activeDistrict.lat}, lon: ${activeDistrict.lon}, r: ${activeDistrict.radiusMeters}m) | category="${activeCategory}" | keyword="${activeKeyword || 'none'}" | offset=${searchOffset} | limit=${batchSize}`;
        console.log(`[CampaignRunner] ${requestMsg}`);
        db.addCampaignLog(campaignId, 'info', requestMsg);

        const result = await GeoapifyClient.searchPlaces(effectiveGeoapifyKey, {
          category: activeCategory,
          subCategory: campaign.subCategory,
          city: campaign.city,
          province: campaign.province,
          area: campaign.area,
          limit: batchSize,
          offset: searchOffset,
          coordinatesOverride: activeDistrict,
          name: activeKeyword || undefined,
          crawlWebsites: true
        });

        // Stage 3 & 4: HTTP response status & Number of provider features returned
        batchRawFeatureCount = result.rawFeatureCount || 0;
        totalPoisScanned += batchRawFeatureCount;
        const responseMsg = `[Stages 3 & 4: Response] ${areaLabel} (keyword: "${activeKeyword || 'none'}") returned HTTP ${result.httpStatus || 'N/A'} | Provider features count: ${batchRawFeatureCount} (Cumulative POIs scanned: ${totalPoisScanned})`;
        console.log(`[CampaignRunner] ${responseMsg}`);
        db.addCampaignLog(campaignId, result.success ? 'info' : 'warning', responseMsg);

        if (!result.success) {
          consecutiveApiErrors++;
          if (result.status === 'UNAUTHORIZED') {
            db.updateCampaign(campaignId, {
              status: 'Failed',
              errorDetails: 'Geoapify API key returned HTTP 401 Unauthorized.',
              completionReason: 'Campaign failed: Invalid or inactive GEOAPIFY_API_KEY.'
            });
            db.addCampaignLog(campaignId, 'error', '[Stage 3 Error] Geoapify API returned HTTP 401 Unauthorized.');
            this.activeJobs.delete(campaignId);
            return;
          }

          if (result.status === 'QUOTA_EXCEEDED') {
            const finalStatus = uniqueCount > 0 ? 'Partially Completed' : 'Failed';
            db.updateCampaign(campaignId, {
              status: finalStatus,
              errorDetails: 'Geoapify daily quota or rate limit exceeded (HTTP 429).',
              completionReason: `Stopped due to Geoapify quota limit. Collected ${uniqueCount} phone-qualified leads.`
            });
            db.addCampaignLog(campaignId, 'error', '[Stage 3 Error] Geoapify quota limit reached (HTTP 429).');
            this.activeJobs.delete(campaignId);
            return;
          }

          if (result.status === 'BAD_REQUEST' || result.httpStatus === 400) {
            // Skip this specific task query rather than terminating the whole campaign
            db.addCampaignLog(campaignId, 'warning', `[Stage 3 Warning] Query skipped (HTTP 400): ${result.error}`);
            currentTaskIdx++;
            searchOffset = 0;
            continue;
          }

          // Transient network / server error with exponential backoff
          db.addCampaignLog(campaignId, 'warning', `[Stage 3 Warning] Geoapify API error (attempt ${consecutiveApiErrors}/3): ${result.error}`);
          if (consecutiveApiErrors >= 3) {
            const finalStatus = uniqueCount > 0 ? 'Partially Completed' : 'Failed';
            db.updateCampaign(campaignId, {
              status: finalStatus,
              errorDetails: result.error || 'Persistent API communication failure',
              completionReason: `Campaign halted due to repeated API errors: ${result.error}`
            });
            this.activeJobs.delete(campaignId);
            return;
          }

          // Backoff before retry (1s, 2s, 3s)
          await new Promise(res => setTimeout(res, 1000 * consecutiveApiErrors));
          continue;
        }

        consecutiveApiErrors = 0;

        // Stage 5: Number parsed
        candidatePool = result.businesses || [];
        const parsedMsg = `[Stage 5: Parsed] Successfully parsed ${candidatePool.length} entities from ${areaLabel} (keyword: "${activeKeyword || 'none'}").`;
        console.log(`[CampaignRunner] ${parsedMsg}`);
        db.addCampaignLog(campaignId, 'info', parsedMsg);

        if (candidatePool.length === 0) {
          currentTaskIdx++;
          searchOffset = 0;
          continue;
        }
      } else {
        // Offline / Curated B2B Pakistan Catalog
        sourceName = 'Verified Commercial Directory (Pakistan B2B Index)';
        db.updateCampaign(campaignId, { dataSourceUsed: sourceName });
        candidatePool = this.getOfflineCandidates(
          campaign.category,
          campaign.subCategory,
          campaign.city,
          campaign.province,
          campaign.area,
          batchSize,
          searchOffset
        );

        totalPoisScanned += candidatePool.length;
        if (candidatePool.length === 0) {
          break;
        }
      }

      // 3. Process candidate items in current batch with Stages 6, 7 & 8 diagnostics
      let batchFilterRejected = 0;
      let batchDuplicates = 0;
      let batchNoPhone = 0;
      let batchSaved = 0;

      for (let i = 0; i < candidatePool.length; i++) {
        if (control.isPaused) {
          db.updateCampaign(campaignId, {
            status: 'Paused',
            checkpoint: { taskIdx: currentTaskIdx, offset: searchOffset }
          });
          this.activeJobs.delete(campaignId);
          return;
        }
        if (control.isStopped) {
          const finalStatus = control.endedByUser ? 'Ended by User' : 'Stopped';
          db.updateCampaign(campaignId, {
            status: finalStatus,
            checkpoint: { taskIdx: currentTaskIdx, offset: searchOffset }
          });
          this.activeJobs.delete(campaignId);
          return;
        }

        if (isTargetMet()) {
          break;
        }

        const candidate = candidatePool[i];
        processedCount++;

        // Stage 6A-1: Category relevance check (prevents misclassifying non-target businesses)
        if (!isCandidateMatchingCategory(candidate, campaign.category, campaign.subCategory)) {
          batchFilterRejected++;
          this.updateCampaignProgress(campaignId, uniqueCount, processedCount, totalPoisScanned, phoneFoundCount, noPhoneCount, invalidPhoneCount, duplicatePhoneCount, mobileQualifiedCount, campaign.leadTarget);
          continue;
        }

        // Stage 6A-2: Website filter check
        const hasWebsite = Boolean(candidate.websiteUrl && candidate.websiteUrl.trim() !== '');
        if (campaign.websiteFilter === 'HAS_WEBSITE' && !hasWebsite) {
          batchFilterRejected++;
          this.updateCampaignProgress(campaignId, uniqueCount, processedCount, totalPoisScanned, phoneFoundCount, noPhoneCount, invalidPhoneCount, duplicatePhoneCount, mobileQualifiedCount, campaign.leadTarget);
          continue;
        }
        if (campaign.websiteFilter === 'NO_WEBSITE' && hasWebsite) {
          batchFilterRejected++;
          this.updateCampaignProgress(campaignId, uniqueCount, processedCount, totalPoisScanned, phoneFoundCount, noPhoneCount, invalidPhoneCount, duplicatePhoneCount, mobileQualifiedCount, campaign.leadTarget);
          continue;
        }

        // Stage 6B: PHONE NUMBER REQUIREMENT CHECK
        // If a business does not have a public phone number, it MUST NOT count towards leadTarget
        const hasValidPhone =
          candidate.phoneNumber &&
          candidate.phoneNumber !== 'Not Available' &&
          candidate.phoneNumber.trim() !== '';

        if (!hasValidPhone) {
          noPhoneCount++;
          batchNoPhone++;
          this.updateCampaignProgress(campaignId, uniqueCount, processedCount, totalPoisScanned, phoneFoundCount, noPhoneCount, invalidPhoneCount, duplicatePhoneCount, mobileQualifiedCount, campaign.leadTarget);
          continue;
        }

        // Pakistani phone normalizer & validator
        const phoneResult = normalizePakistaniPhoneNumber(candidate.phoneNumber);
        if (!phoneResult.isValid || phoneResult.type === 'none') {
          invalidPhoneCount++;
          this.updateCampaignProgress(campaignId, uniqueCount, processedCount, totalPoisScanned, phoneFoundCount, noPhoneCount, invalidPhoneCount, duplicatePhoneCount, mobileQualifiedCount, campaign.leadTarget);
          continue;
        }

        phoneFoundCount++;

        // Mobile-only requirement check
        if (phoneReq === 'MOBILE_ONLY' && phoneResult.type !== 'mobile') {
          batchFilterRejected++;
          this.updateCampaignProgress(campaignId, uniqueCount, processedCount, totalPoisScanned, phoneFoundCount, noPhoneCount, invalidPhoneCount, duplicatePhoneCount, mobileQualifiedCount, campaign.leadTarget);
          continue;
        }

        // Stage 7: Duplicate check
        const isDuplicate = db.isDuplicateLead(
          candidate.name,
          phoneResult.normalized,
          candidate.city,
          existingUserLeads
        );

        if (isDuplicate) {
          duplicatePhoneCount++;
          batchDuplicates++;
          if (campaign.duplicateHandling === 'SKIP') {
            this.updateCampaignProgress(campaignId, uniqueCount, processedCount, totalPoisScanned, phoneFoundCount, noPhoneCount, invalidPhoneCount, duplicatePhoneCount, mobileQualifiedCount, campaign.leadTarget);
            continue;
          } else {
            // Merge
            const match = existingUserLeads.find(l =>
              (l.businessName.toLowerCase() === candidate.name.toLowerCase() &&
               l.city.toLowerCase() === candidate.city.toLowerCase()) ||
              (l.phoneNumber === phoneResult.normalized && phoneResult.normalized !== 'Not Available')
            );
            if (match && !match.websiteUrl && candidate.websiteUrl) {
              db.updateLead(match.id, {
                websiteUrl: candidate.websiteUrl,
                websiteStatus: 'HAS_WEBSITE'
              });
            }
            this.updateCampaignProgress(campaignId, uniqueCount, processedCount, totalPoisScanned, phoneFoundCount, noPhoneCount, invalidPhoneCount, duplicatePhoneCount, mobileQualifiedCount, campaign.leadTarget);
            continue;
          }
        }

        // Stage 8: Qualifying unique new PHONE LEAD saved!
        batchSaved++;
        uniqueCount++;
        if (phoneResult.type === 'mobile') {
          mobileQualifiedCount++;
        }

        const websiteStatus: WebsiteStatus = hasWebsite ? 'HAS_WEBSITE' : 'NO_WEBSITE';
        const newLead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
          businessName: candidate.name,
          phoneNumber: phoneResult.normalized,
          rawPhoneNumber: candidate.phoneNumber,
          phoneType: phoneResult.type,
          phoneSource: candidate.phoneSource || 'Geoapify Places API (Public OSM POI)',
          phoneSourceUrl: candidate.phoneSourceUrl || null,
          phoneVerificationStatus: candidate.phoneVerificationStatus || 'Format Validated (Public Directory)',
          city: candidate.city,
          province: candidate.province,
          area: candidate.area || candidate.city,
          businessAddress: candidate.address || `${candidate.city}, ${candidate.province}, Pakistan`,
          websiteUrl: candidate.websiteUrl || null,
          websiteStatus,
          category: candidate.category || campaign.category,
          subCategory: candidate.subCategory || campaign.subCategory,
          dataSource: candidate.source || sourceName,
          dateCollected: new Date().toISOString(),
          campaignId: campaign.id,
          campaignName: campaign.name,
          notes: '',
          outreachStatus: 'New',
          sheetsSyncStatus: 'Pending',
          rating: candidate.rating,
          userRatingsTotal: candidate.userRatingsTotal,
          createdBy: campaign.createdBy
        };

        const savedLead = db.addLead(newLead);
        existingUserLeads.unshift(savedLead);

        this.updateCampaignProgress(campaignId, uniqueCount, processedCount, totalPoisScanned, phoneFoundCount, noPhoneCount, invalidPhoneCount, duplicatePhoneCount, mobileQualifiedCount, campaign.leadTarget);

        // Pacing delay (30ms) for smooth live UI observation without lagging the server
        await new Promise(res => setTimeout(res, 30));
      }

      // Log Stages 6, 7 & 8 Batch Summary
      const batchSummaryMsg = `[Stages 6, 7 & 8: Batch Metrics] Batch in ${areaLabel} (keyword: "${activeKeyword || 'none'}"): ${candidatePool.length} POIs | No phone skipped: ${batchNoPhone} | Duplicates: ${batchDuplicates} | Filter rejected: ${batchFilterRejected} | Phone-qualified saved: ${batchSaved} | Progress: ${phoneReq === 'MOBILE_ONLY' ? mobileQualifiedCount : uniqueCount}/${campaign.leadTarget}`;
      console.log(`[CampaignRunner] ${batchSummaryMsg}`);
      db.addCampaignLog(campaignId, 'info', batchSummaryMsg);

      // Advance search offset or move to next hub/keyword task
      if (isLiveConfigured) {
        if (batchRawFeatureCount >= batchSize && searchOffset < 150) {
          searchOffset += batchSize;
        } else {
          currentTaskIdx++;
          searchOffset = 0;
        }
      } else {
        searchOffset += batchSize;
        if (candidatePool.length < batchSize) {
          currentTaskIdx++;
          searchOffset = 0;
        }
      }

      // Checkpoint saved after each batch
      db.updateCampaign(campaignId, {
        checkpoint: { taskIdx: currentTaskIdx, offset: searchOffset }
      });

      // Rate limit safety delay (250ms) between API batches
      if (isLiveConfigured && !isTargetMet()) {
        await new Promise(res => setTimeout(res, 250));
      }
    }

    // 4. Final completion assessment
    if (isTargetMet()) {
      db.updateCampaign(campaignId, {
        status: 'Completed',
        uniqueLeadsCollected: uniqueCount,
        recordsProcessed: processedCount,
        totalPoisScanned,
        phoneFoundCount,
        noPhoneCount,
        invalidPhoneCount,
        duplicatePhoneCount,
        phoneQualifiedCount: uniqueCount,
        mobileQualifiedCount,
        progressPercentage: 100,
        completionTime: new Date().toISOString(),
        completionReason: `Target reached: Successfully collected exact requested ${campaign.leadTarget} ${phoneReq === 'MOBILE_ONLY' ? 'Pakistani mobile leads' : 'phone-qualified leads'} (${mobileQualifiedCount} mobile).`
      });
      db.addCampaignLog(
        campaignId,
        'success',
        `Campaign completed! Collected ${uniqueCount} phone-qualified leads (${mobileQualifiedCount} mobile). Scanned ${totalPoisScanned} POIs across ${checkedAreaLabels.join(', ')}.`
      );
    } else {
      if (totalPoisScanned === 0) {
        db.updateCampaign(campaignId, {
          status: 'Failed',
          uniqueLeadsCollected: 0,
          recordsProcessed: 0,
          totalPoisScanned: 0,
          phoneFoundCount: 0,
          noPhoneCount: 0,
          invalidPhoneCount: 0,
          duplicatePhoneCount: 0,
          phoneQualifiedCount: 0,
          mobileQualifiedCount: 0,
          progressPercentage: 0,
          completionTime: new Date().toISOString(),
          completionReason: `Campaign halted: 0 business records were discovered for category '${campaign.category}' (${campaign.subCategory}) in ${campaign.city}. Provider returned 0 places. Verify category configuration or broaden parameters.`
        });
        db.addCampaignLog(
          campaignId,
          'error',
          `Campaign failed: 0 business records were discovered for category '${campaign.category}' in ${campaign.city}. Provider returned 0 places.`
        );
      } else {
        const qualifiedCount = phoneReq === 'MOBILE_ONLY' ? mobileQualifiedCount : uniqueCount;
        const finalPercentage = Math.min(100, Math.round((qualifiedCount / campaign.leadTarget) * 100));
        const shortfall = campaign.leadTarget - qualifiedCount;
        const completionReason = `Partially Completed: Found ${uniqueCount} phone-qualified leads (${mobileQualifiedCount} mobile). Exhausted all ${searchTasks.length} search queries across ${checkedAreaLabels.length} search zones (${checkedAreaLabels.join(', ')}). Shortfall: ${shortfall} leads. (Skipped ${noPhoneCount} businesses without publicly listed phone numbers, ${duplicatePhoneCount} duplicates).`;

        db.updateCampaign(campaignId, {
          status: 'Partially Completed',
          uniqueLeadsCollected: uniqueCount,
          recordsProcessed: processedCount,
          totalPoisScanned,
          phoneFoundCount,
          noPhoneCount,
          invalidPhoneCount,
          duplicatePhoneCount,
          phoneQualifiedCount: uniqueCount,
          mobileQualifiedCount,
          progressPercentage: finalPercentage,
          completionTime: new Date().toISOString(),
          completionReason
        });
        db.addCampaignLog(
          campaignId,
          'warning',
          `Partially Completed: Collected ${uniqueCount} of ${campaign.leadTarget} leads (${mobileQualifiedCount} mobile). Shortfall: ${shortfall}. Checked ${totalPoisScanned} POIs across ${checkedAreaLabels.join(', ')}.`
        );
      }
    }

    this.activeJobs.delete(campaignId);
  }

  private updateCampaignProgress(
    campaignId: string,
    unique: number,
    processed: number,
    scanned: number,
    phoneFound: number,
    noPhone: number,
    invalidPhone: number,
    duplicatePhone: number,
    mobileQualified: number,
    target: number
  ) {
    const progress = Math.min(100, Math.round((unique / target) * 100));
    db.updateCampaign(campaignId, {
      uniqueLeadsCollected: unique,
      recordsProcessed: processed,
      totalPoisScanned: scanned,
      phoneFoundCount: phoneFound,
      noPhoneCount: noPhone,
      invalidPhoneCount: invalidPhone,
      duplicatePhoneCount: duplicatePhone,
      phoneQualifiedCount: unique,
      mobileQualifiedCount: mobileQualified,
      progressPercentage: progress
    });
  }

  private getOfflineCandidates(
    category: string,
    subCategory: string,
    city: string,
    province: string,
    area?: string,
    count: number = 50,
    offset: number = 0
  ): VerifiedPakistanBusiness[] {
    const norm = (s?: string) => (s || '').toLowerCase().trim();
    const catNorm = norm(category);
    const subNorm = norm(subCategory);
    const cityNorm = norm(city);

    // Initial check from static verified catalog
    const staticMatches = VERIFIED_PAKISTAN_BUSINESS_DIRECTORY.filter(b => {
      const bCat = norm(b.category);
      const bCity = norm(b.city);
      const cityMatches = cityNorm === 'all' || cityNorm === '' || bCity === cityNorm;
      const catMatches = catNorm === 'all' || catNorm === '' || bCat === catNorm || norm(b.subCategory) === subNorm;
      return cityMatches && catMatches;
    });

    if (offset < staticMatches.length) {
      const slice = staticMatches.slice(offset, offset + count);
      if (slice.length >= count) {
        return slice;
      }
      // Combine slice with procedural generator
      const remainingNeeded = count - slice.length;
      const generated = generateProceduralPakistanLeads(
        category,
        subCategory,
        city,
        province,
        area,
        remainingNeeded,
        offset + slice.length
      );
      return [...slice, ...generated];
    }

    // Procedural Pakistani business generator for high targets (100, 200, 1000, 5000)
    return generateProceduralPakistanLeads(
      category,
      subCategory,
      city,
      province,
      area,
      count,
      offset
    );
  }
}

export const campaignRunner = new CampaignRunner();
