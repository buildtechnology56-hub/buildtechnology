import { normalizePakistaniPhoneNumber, NormalizedPhoneResult } from '../src/utils/phoneNormalizer';

export interface PhoneDiscoveryResult {
  hasPhone: boolean;
  normalized: string;
  raw: string;
  type: 'mobile' | 'landline' | 'unknown' | 'none';
  isValid: boolean;
  source: string;
  sourceUrl?: string | null;
  verificationStatus: string;
}

export class PhoneDiscoveryEngine {
  /**
   * Extracts direct phone number candidates from all Geoapify place properties and raw OSM tags.
   * Collects all contact and phone fields to ensure mobile numbers are not overshadowed by landlines.
   */
  public static extractDirectPhone(props: any): { rawPhone?: string; sourceUrl?: string; candidates: string[] } {
    if (!props) return { candidates: [] };
    const raw = props.datasource?.raw || {};

    const rawCandidates: string[] = [];

    // Comprehensive list of phone and contact tags found in OSM Pakistan
    const potentialFields = [
      props.contact?.phone,
      props.contact?.mobile,
      raw.phone,
      raw.mobile,
      raw['contact:phone'],
      raw['contact:mobile'],
      raw['contact:whatsapp'],
      raw.telephone,
      raw['phone:mobile'],
      raw.whatsapp,
      raw['operator:phone'],
      raw.operator_phone,
      raw.phone_1,
      raw.phone_2,
      props.datasource?.raw?.['contact:whatsapp']
    ];

    for (const val of potentialFields) {
      if (val !== undefined && val !== null && String(val).trim()) {
        rawCandidates.push(String(val).trim());
      }
    }

    const sourceUrl =
      props.datasource?.url ||
      (props.place_id ? `https://www.openstreetmap.org/${props.datasource?.sourcename || 'node'}/${props.place_id}` : undefined);

    // Join candidates with pipe to allow normalizePakistaniPhoneNumber to inspect and tokenize all
    const rawPhone = rawCandidates.join(' | ');

    return { rawPhone: rawPhone || undefined, sourceUrl, candidates: rawCandidates };
  }

  /**
   * Safely crawls the official business website homepage or contact page for publicly listed phone numbers.
   * Respects timeouts (3.5s), bounds HTML size (256KB), handles errors cleanly without throwing.
   */
  public static async crawlWebsiteForPhone(websiteUrl?: string | null): Promise<{
    found: boolean;
    raw?: string;
    normalized?: string;
    type?: 'mobile' | 'landline' | 'unknown';
    sourceUrl?: string;
  }> {
    if (!websiteUrl || typeof websiteUrl !== 'string') {
      return { found: false };
    }

    const cleanUrl = websiteUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return { found: false };
    }

    // Attempt homepage probe first
    const homepageResult = await this.fetchAndExtractPhoneFromHtml(cleanUrl);
    if (homepageResult.found) {
      return homepageResult;
    }

    // If not found on homepage, attempt a probe on /contact or /contact-us
    try {
      const urlObj = new URL(cleanUrl);
      const contactUrl = `${urlObj.origin}/contact`;
      const contactResult = await this.fetchAndExtractPhoneFromHtml(contactUrl, 2500);
      if (contactResult.found) {
        return contactResult;
      }
    } catch {
      // Ignore URL parsing errors
    }

    return { found: false };
  }

  private static async fetchAndExtractPhoneFromHtml(
    targetUrl: string,
    timeoutMs: number = 3500
  ): Promise<{
    found: boolean;
    raw?: string;
    normalized?: string;
    type?: 'mobile' | 'landline' | 'unknown';
    sourceUrl?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BuildTechVIP-LeadHunter/1.0; +https://buildtechvip.pk)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en,ur;q=0.9'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { found: false };
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        return { found: false };
      }

      // Limit response body reading to 256KB to avoid memory bloat
      const html = (await response.text()).slice(0, 262144);

      // 1. Search href="tel:..."
      const telMatches = [...html.matchAll(/href=["']tel:([^"'\s>]+)["']/gi)].map(m => m[1]);

      // 2. Search WhatsApp links (wa.me/... or api.whatsapp.com/send?phone=...)
      const waMatches = [...html.matchAll(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)(\+?\d+)/gi)].map(m => m[1]);

      // 3. Search Pakistani phone patterns in HTML text
      const textMatches = [
        ...html.matchAll(/(?:(?:\+92|0092|92|0)?\s*3\d{2}[-\s.]?\d{7})|(?:(?:\+92|0092|92|0)?\s*(?:21|42|51)[-\s.]?\d{7,8})/g)
      ].map(m => m[0]);

      const candidates = [...telMatches, ...waMatches, ...textMatches];

      // Prioritize mobile numbers from website
      let firstLandline: NormalizedPhoneResult | null = null;
      for (const candidate of candidates) {
        const norm = normalizePakistaniPhoneNumber(candidate);
        if (norm.isValid && norm.type === 'mobile') {
          return {
            found: true,
            raw: candidate.trim(),
            normalized: norm.normalized,
            type: 'mobile',
            sourceUrl: targetUrl
          };
        }
        if (norm.isValid && norm.type === 'landline' && !firstLandline) {
          firstLandline = norm;
        }
      }

      if (firstLandline) {
        return {
          found: true,
          raw: firstLandline.raw,
          normalized: firstLandline.normalized,
          type: 'landline',
          sourceUrl: targetUrl
        };
      }

      return { found: false };
    } catch {
      return { found: false };
    }
  }

  /**
   * Multi-stage business phone resolution pipeline.
   * Stage 1: Inspects authoritative provider fields (Geoapify Places API / OSM tags).
   * Stage 2: Crawls official business website if available (especially if direct phone is missing or landline).
   * Validates formatting, normalizes PTA mobile/landline numbers, and assigns strict provenance.
   */
  public static async resolvePhone(
    props: any,
    options: {
      existingPhone?: string;
      websiteUrl?: string | null;
      crawlWebsiteIfMissing?: boolean;
    }
  ): Promise<PhoneDiscoveryResult> {
    const { rawPhone, sourceUrl: osmSourceUrl } = this.extractDirectPhone(props);
    const candidateRaw = (rawPhone || options.existingPhone || '').trim();

    let directResult: NormalizedPhoneResult | null = null;

    if (candidateRaw && candidateRaw.toLowerCase() !== 'not available' && candidateRaw.toLowerCase() !== 'n/a') {
      directResult = normalizePakistaniPhoneNumber(candidateRaw);
      // If direct phone already has a valid mobile number, we have the ideal result
      if (directResult.isValid && directResult.type === 'mobile') {
        return {
          hasPhone: true,
          normalized: directResult.normalized,
          raw: directResult.raw,
          type: 'mobile',
          isValid: true,
          source: 'Geoapify Places API (Public OSM POI)',
          sourceUrl: osmSourceUrl || null,
          verificationStatus: 'Format Validated (Public Directory)'
        };
      }
    }

    // Stage 2: Official Website Contact Crawl
    // If direct phone is missing, OR if direct phone was only a landline, check official website for a mobile number
    const effectiveWebsite = options.websiteUrl || props?.contact?.website || props?.datasource?.raw?.website;
    if (options.crawlWebsiteIfMissing !== false && effectiveWebsite) {
      const siteResult = await this.crawlWebsiteForPhone(effectiveWebsite);
      if (siteResult.found && siteResult.normalized) {
        // If site found a mobile number, return it
        if (siteResult.type === 'mobile' || !directResult?.isValid) {
          return {
            hasPhone: true,
            normalized: siteResult.normalized,
            raw: siteResult.raw || siteResult.normalized,
            type: siteResult.type || 'unknown',
            isValid: true,
            source: 'Official Business Website',
            sourceUrl: siteResult.sourceUrl || effectiveWebsite,
            verificationStatus: 'Format Validated (Official Website)'
          };
        }
      }
    }

    // If direct phone had a valid landline and website crawl didn't find mobile, return the landline
    if (directResult && directResult.isValid) {
      return {
        hasPhone: true,
        normalized: directResult.normalized,
        raw: directResult.raw,
        type: directResult.type,
        isValid: true,
        source: 'Geoapify Places API (Public OSM POI)',
        sourceUrl: osmSourceUrl || null,
        verificationStatus: 'Format Validated (Public Directory)'
      };
    }

    // No valid publicly published phone found
    return {
      hasPhone: false,
      normalized: 'Not Available',
      raw: candidateRaw || 'Not Available',
      type: 'none',
      isValid: false,
      source: 'Not Available',
      sourceUrl: null,
      verificationStatus: 'Unverified'
    };
  }
}
