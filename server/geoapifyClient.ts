import { VerifiedPakistanBusiness } from './pakistanData';
import { PhoneDiscoveryEngine } from './phoneDiscovery';

export interface GeoapifyCoordinates {
  lat: number;
  lon: number;
  radiusMeters: number;
  label?: string;
}

// Canonical geographic centroid coordinates for major Pakistani cities
export const PAKISTAN_CITY_COORDINATES: Record<string, GeoapifyCoordinates> = {
  lahore: { lat: 31.5204, lon: 74.3587, radiusMeters: 20000 },
  karachi: { lat: 24.8607, lon: 67.0011, radiusMeters: 25000 },
  islamabad: { lat: 33.6844, lon: 73.0479, radiusMeters: 15000 },
  rawalpindi: { lat: 33.5973, lon: 73.0714, radiusMeters: 15000 },
  faisalabad: { lat: 31.4187, lon: 73.0791, radiusMeters: 15000 },
  multan: { lat: 30.1575, lon: 71.4753, radiusMeters: 15000 },
  peshawar: { lat: 34.0151, lon: 71.5249, radiusMeters: 15000 },
  quetta: { lat: 30.1798, lon: 66.9750, radiusMeters: 15000 },
  gujranwala: { lat: 32.1877, lon: 74.1945, radiusMeters: 12000 },
  sialkot: { lat: 32.4945, lon: 74.5229, radiusMeters: 12000 },
  hyderabad: { lat: 25.3960, lon: 68.3578, radiusMeters: 15000 },
  abbottabad: { lat: 34.1688, lon: 73.2215, radiusMeters: 10000 },
  bahawalpur: { lat: 29.3956, lon: 71.6836, radiusMeters: 12000 },
  sukkur: { lat: 27.7052, lon: 68.8574, radiusMeters: 10000 },
  larkana: { lat: 27.5590, lon: 68.2120, radiusMeters: 10000 },
  gujrat: { lat: 32.5742, lon: 74.0754, radiusMeters: 10000 },
  jhelum: { lat: 32.9328, lon: 73.7272, radiusMeters: 10000 },
  sargodha: { lat: 32.0836, lon: 72.6711, radiusMeters: 12000 },
  'mirpur (ajk)': { lat: 33.1478, lon: 73.7511, radiusMeters: 10000 },
  muzaffarabad: { lat: 34.3700, lon: 73.4708, radiusMeters: 10000 },
  gwadar: { lat: 25.1264, lon: 62.3254, radiusMeters: 10000 }
};

// Strategic commercial sub-district hubs for multi-stage geographic expansion
export const PAKISTAN_CITY_SUB_DISTRICTS: Record<string, GeoapifyCoordinates[]> = {
  karachi: [
    { lat: 24.8607, lon: 67.0011, radiusMeters: 25000, label: 'Greater Karachi Centroid' },
    { lat: 24.8138, lon: 67.0300, radiusMeters: 10000, label: 'Clifton & DHA' },
    { lat: 24.9180, lon: 67.0971, radiusMeters: 10000, label: 'Gulshan-e-Iqbal & University Road' },
    { lat: 24.8719, lon: 67.0620, radiusMeters: 8000, label: 'PECHS, Tariq Road & Bahadurabad' },
    { lat: 24.9333, lon: 67.0333, radiusMeters: 10000, label: 'North Nazimabad & Buffer Zone' },
    { lat: 24.8560, lon: 67.0100, radiusMeters: 8000, label: 'Saddar, I.I. Chundrigar & M.A. Jinnah' },
    { lat: 24.8387, lon: 67.1208, radiusMeters: 10000, label: 'Korangi Industrial & Malir' },
    { lat: 25.0000, lon: 67.3300, radiusMeters: 15000, label: 'Bahria Town & Scheme 33' },
    { lat: 24.9200, lon: 67.1400, radiusMeters: 8000, label: 'Gulistan-e-Johar & Safoora' },
    { lat: 24.9800, lon: 67.0600, radiusMeters: 8000, label: 'Federal B Area & North Karachi' }
  ],
  lahore: [
    { lat: 31.5204, lon: 74.3587, radiusMeters: 20000, label: 'Greater Lahore Centroid' },
    { lat: 31.5074, lon: 74.3486, radiusMeters: 8000, label: 'Gulberg, MM Alam & Liberty' },
    { lat: 31.4697, lon: 74.4100, radiusMeters: 10000, label: 'DHA Phase 1-6' },
    { lat: 31.4697, lon: 74.2728, radiusMeters: 10000, label: 'Johar Town & Wapda Town' },
    { lat: 31.5794, lon: 74.3128, radiusMeters: 8000, label: 'Mall Road & Anarkali' },
    { lat: 31.4900, lon: 74.3200, radiusMeters: 8000, label: 'Model Town & Garden Town' },
    { lat: 31.5350, lon: 74.3850, radiusMeters: 8000, label: 'Cantonment & Cavalry Ground' },
    { lat: 31.5100, lon: 74.2900, radiusMeters: 8000, label: 'Allama Iqbal Town & Wahdat Road' },
    { lat: 31.4500, lon: 74.3100, radiusMeters: 8000, label: 'Faisal Town & Township' },
    { lat: 31.3650, lon: 74.1800, radiusMeters: 12000, label: 'Bahria Town Lahore & Raiwind Road' },
    { lat: 31.4600, lon: 74.2400, radiusMeters: 9000, label: 'Thokar Niaz Baig & Multan Road' },
    { lat: 31.6200, lon: 74.2900, radiusMeters: 9000, label: 'Shahdara & Badami Bagh' },
    { lat: 31.5300, lon: 74.3200, radiusMeters: 7000, label: 'Shadman, Jail Road & Mozang' }
  ],
  islamabad: [
    { lat: 33.6844, lon: 73.0479, radiusMeters: 15000, label: 'Greater Islamabad Centroid' },
    { lat: 33.7150, lon: 73.0560, radiusMeters: 7000, label: 'Blue Area, F-6 & F-7' },
    { lat: 33.6900, lon: 73.0100, radiusMeters: 7000, label: 'F-10, F-11 & E-11' },
    { lat: 33.6650, lon: 73.0700, radiusMeters: 7000, label: 'G-9, G-10 & G-11' },
    { lat: 33.6400, lon: 73.0700, radiusMeters: 8000, label: 'I-8, I-9 & I-10 Industrial Area' },
    { lat: 33.5300, lon: 73.1200, radiusMeters: 12000, label: 'DHA Islamabad & Bahria Town Phase 1-8' }
  ],
  rawalpindi: [
    { lat: 33.5973, lon: 73.0714, radiusMeters: 15000, label: 'Greater Rawalpindi Centroid' },
    { lat: 33.5950, lon: 73.0550, radiusMeters: 7000, label: 'Saddar, Cantt & Bank Road' },
    { lat: 33.6400, lon: 73.0600, radiusMeters: 7000, label: 'Satellite Town & Commercial Market' },
    { lat: 33.5350, lon: 73.1200, radiusMeters: 10000, label: 'Bahria Town & Chaklala' }
  ]
};

// Maps high-level application categories to strictly valid Geoapify Places API v2 category slugs.
// Every slug in this map is verified against api.geoapify.com to prevent HTTP 400 Bad Request errors.
export const CATEGORY_TO_GEOAPIFY_MAP: Record<string, string> = {
  // Gyms & Fitness - sport.fitness and sport.sports_centre are valid; sport.gym was INVALID
  'gyms and fitness centres': 'sport.fitness,sport.sports_centre,sport',
  'fitness': 'sport.fitness,sport.sports_centre,sport',
  'gym': 'sport.fitness,sport.sports_centre,sport',
  'sport': 'sport.fitness,sport.sports_centre,sport',

  // Fashion & E-commerce
  'fashion and e-commerce': 'commercial.clothing,commercial.clothing.clothes,commercial.clothing.shoes,commercial.jewelry,commercial.shopping_mall,commercial',
  'fashion': 'commercial.clothing,commercial.clothing.clothes,commercial.clothing.shoes,commercial.jewelry,commercial.shopping_mall,commercial',

  // Automotive & Car Rentals
  'automotive': 'service.vehicle,commercial.vehicle,rental.car',
  'auto': 'service.vehicle,commercial.vehicle,rental.car',
  'rent-a-car companies': 'rental.car,rental',
  'car rental': 'rental.car,rental',
  'rent a car': 'rental.car,rental',
  'car dealerships': 'commercial.vehicle,commercial.vehicle.car',
  'auto repair workshops': 'service.vehicle.repair',
  'car detailing businesses': 'service.vehicle.car_wash',

  // Beauty & Grooming
  'beauty': 'service.beauty,service.beauty.hairdresser,service.beauty.spa,commercial.health_and_beauty,leisure.spa',
  'beauty salons': 'service.beauty,service.beauty.hairdresser,service.beauty.spa',

  // Medical & Healthcare
  'medical': 'healthcare.hospital,healthcare.clinic_or_praxis,healthcare.dentist,healthcare.pharmacy',

  // Real Estate & Construction - office.company,office is valid and avoids 0-result service.estate_agent
  'real estate': 'office.company,office',
  'real estate developers': 'office.company,office',
  'property dealers': 'office.company,office',
  'builders': 'office.company,office',
  'construction companies': 'office.company,office',
  'architects': 'office.architect,office',
  'housing projects': 'office.company,office',

  // Food and Hospitality
  'food and hospitality': 'catering.restaurant,catering.fast_food,catering.cafe,accommodation.hotel,commercial.food_and_drink',

  // Software & Technology
  'software and technology': 'office.it,office.company,office',

  // Digital Marketing & Media
  'digital marketing and media': 'office.advertising_agency,office.company,office.it',

  // Education & Training
  'education and training': 'education.school,education.college,education.university',

  // Solar & Renewable Energy
  'solar and renewable energy': 'commercial,service,office.company',

  // Furniture & Home Decor
  'furniture and home decor': 'commercial.furniture_and_interior,commercial.houseware_and_hardware,commercial',

  // Electronics & Appliances
  'electronics and appliances': 'commercial.shopping_mall,commercial.supermarket,commercial',

  // Travel & Tourism
  'travel and tourism': 'service.travel_agency,tourism,accommodation.hotel',

  // Logistics & Courier
  'logistics and courier': 'service.post,service,commercial',

  // Factories & Wholesalers
  'factories and wholesalers': 'production,commercial,office.company',

  // Interior Designers
  'interior designers': 'office.architect,commercial.furniture_and_interior,office.company',

  // Event Management
  'event management': 'service,entertainment,commercial',

  // Printing & Packaging
  'printing and packaging': 'production,commercial,office.company',

  // Generic / Additional Services
  'additional services': 'commercial,service,office',
  'other local businesses': 'commercial,service,office'
};

export interface GeoapifySearchResult {
  success: boolean;
  businesses: VerifiedPakistanBusiness[];
  totalResultsFound?: number;
  rawFeatureCount?: number;
  httpStatus?: number;
  offset?: number;
  limit?: number;
  error?: string;
  isQuotaExceeded?: boolean;
  status?: string;
  attribution?: string;
  requestUrlSanitized?: string;
}

import { GeoapifyTestResult } from '../src/types';

export class GeoapifyClient {
  /**
   * Tests actual Geoapify Places API connectivity using a server-side probe.
   * Never logs, exposes, or leaks the API key.
   */
  public static async testConnection(overrideKey?: string): Promise<GeoapifyTestResult> {
    const key = (overrideKey || process.env.GEOAPIFY_API_KEY || '').trim();
    const testedAt = new Date().toISOString();

    if (!key) {
      return {
        success: false,
        message: 'GEOAPIFY_API_KEY is not configured in the server environment secrets.',
        latencyMs: 0,
        status: 'NOT_CONFIGURED',
        httpStatus: 0,
        resultsCount: 0,
        testedAt,
        actionableInstruction: 'Set GEOAPIFY_API_KEY in the AI Studio Secrets panel or Cloud Run environment variables.'
      };
    }

    const startTime = Date.now();
    try {
      // Test endpoint: query up to 1 commercial place in Lahore centroid
      const testUrl = `https://api.geoapify.com/v2/places?categories=commercial&filter=circle:74.3587,31.5204,5000&limit=1&apiKey=${encodeURIComponent(key)}`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const latencyMs = Date.now() - startTime;

      if (response.status === 200) {
        const data = await response.json();
        const featureCount = data.features?.length || 0;
        return {
          success: true,
          message: `Connected successfully to Geoapify Places API v2. Real probe returned ${featureCount} POI in ${latencyMs}ms.`,
          latencyMs,
          status: 'CONNECTED',
          httpStatus: 200,
          resultsCount: featureCount,
          testedAt,
          actionableInstruction: 'Geoapify is active and ready for live Pakistani business lead hunting.'
        };
      }

      if (response.status === 401) {
        return {
          success: false,
          message: 'Geoapify returned HTTP 401 Unauthorized: The provided GEOAPIFY_API_KEY was rejected by Geoapify as invalid or inactive.',
          latencyMs,
          status: 'UNAUTHORIZED',
          httpStatus: 401,
          resultsCount: 0,
          testedAt,
          actionableInstruction: 'Verify your API key at https://myprojects.geoapify.com and ensure the key is copied accurately into the server secret.'
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          message: 'Geoapify returned HTTP 429 Too Many Requests: Request quota limit reached.',
          latencyMs,
          status: 'QUOTA_EXCEEDED',
          httpStatus: 429,
          resultsCount: 0,
          testedAt,
          actionableInstruction: 'Your Geoapify daily quota (3,000 requests/day on Free tier) or per-second rate limit has been exceeded.'
        };
      }

      const errText = await response.text();
      return {
        success: false,
        message: `Geoapify Places API returned HTTP ${response.status}: ${errText.slice(0, 200)}`,
        latencyMs,
        status: 'ERROR',
        httpStatus: response.status,
        resultsCount: 0,
        testedAt,
        actionableInstruction: 'Check Geoapify service status or review your project restrictions.'
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Network failure connecting to api.geoapify.com: ${message}`,
        latencyMs,
        status: 'ERROR',
        httpStatus: 0,
        resultsCount: 0,
        testedAt,
        actionableInstruction: 'Ensure the server has outgoing HTTPS connectivity to api.geoapify.com.'
      };
    }
  }

  /**
   * Resolves application category and subcategory to verified Geoapify category slugs.
   * Prioritizes subcategory keywords (e.g. gym, fitness, car, salon) then category mappings.
   */
  public static resolveGeoapifyCategory(category?: string, subCategory?: string): string {
    const rawSub = (subCategory || '').toLowerCase().trim();
    const rawCat = (category || '').toLowerCase().trim();
    const combined = `${rawSub} ${rawCat}`;

    // 1. Check exact key matches first
    if (rawSub && CATEGORY_TO_GEOAPIFY_MAP[rawSub]) {
      return CATEGORY_TO_GEOAPIFY_MAP[rawSub];
    }
    if (rawCat && CATEGORY_TO_GEOAPIFY_MAP[rawCat]) {
      return CATEGORY_TO_GEOAPIFY_MAP[rawCat];
    }

    // 2. Keyword-based heuristic matching against verified Geoapify categories
    if (combined.includes('gym') || combined.includes('fitness') || combined.includes('workout') || combined.includes('sports club')) {
      return 'sport.fitness,sport.sports_centre,sport';
    }
    if (combined.includes('rent') || combined.includes('rental') || combined.includes('car hire') || combined.includes('cab service')) {
      return 'rental.car,rental';
    }
    if (combined.includes('wash') || combined.includes('detailing')) {
      return 'service.vehicle.car_wash';
    }
    if (combined.includes('repair') || combined.includes('mechanic') || combined.includes('workshop')) {
      return 'service.vehicle.repair';
    }
    if (combined.includes('dealer') || combined.includes('showroom')) {
      return 'commercial.vehicle,commercial.vehicle.car';
    }
    if (combined.includes('car') || combined.includes('auto') || combined.includes('vehicle')) {
      return 'service.vehicle,commercial.vehicle,rental.car';
    }
    if (combined.includes('salon') || combined.includes('spa') || combined.includes('barber') || combined.includes('beauty') || combined.includes('makeup')) {
      return 'service.beauty,service.beauty.hairdresser,service.beauty.spa,commercial.health_and_beauty,leisure.spa';
    }
    if (combined.includes('doctor') || combined.includes('clinic') || combined.includes('hospital') || combined.includes('dental') || combined.includes('orthodont') || combined.includes('pharmacy') || combined.includes('diagnostic') || combined.includes('medic')) {
      return 'healthcare.hospital,healthcare.clinic_or_praxis,healthcare.dentist,healthcare.pharmacy';
    }
    if (combined.includes('restaurant') || combined.includes('cafe') || combined.includes('food') || combined.includes('bakery') || combined.includes('catering') || combined.includes('hotel') || combined.includes('dining')) {
      return 'catering.restaurant,catering.fast_food,catering.cafe,accommodation.hotel,commercial.food_and_drink';
    }
    if (combined.includes('software') || combined.includes('developer') || combined.includes('tech') || combined.includes('it ') || combined.endsWith(' it')) {
      return 'office.it,office.company,office';
    }
    if (combined.includes('marketing') || combined.includes('advertising') || combined.includes('media agency')) {
      return 'office.advertising_agency,office.company,office.it';
    }
    if (combined.includes('school') || combined.includes('college') || combined.includes('university') || combined.includes('academy') || combined.includes('education')) {
      return 'education.school,education.college,education.university';
    }
    if (combined.includes('property') || combined.includes('estate') || combined.includes('builder') || combined.includes('architect') || combined.includes('construction') || combined.includes('housing')) {
      if (combined.includes('architect')) {
        return 'office.architect,office';
      }
      return 'office.company,office';
    }
    if (combined.includes('furniture') || combined.includes('interior') || combined.includes('decor')) {
      return 'commercial.furniture_and_interior,commercial.houseware_and_hardware,commercial';
    }
    if (combined.includes('electronic') || combined.includes('appliance') || combined.includes('computer')) {
      return 'commercial.shopping_mall,commercial.supermarket,commercial';
    }
    if (combined.includes('travel') || combined.includes('tour') || combined.includes('tourism')) {
      return 'service.travel_agency,tourism,accommodation.hotel';
    }
    if (combined.includes('courier') || combined.includes('logistics') || combined.includes('transport') || combined.includes('shipping') || combined.includes('cargo')) {
      return 'service.post,service,commercial';
    }
    if (combined.includes('cloth') || combined.includes('apparel') || combined.includes('boutique') || combined.includes('shoe') || combined.includes('footwear') || combined.includes('jewel') || combined.includes('fashion')) {
      return 'commercial.clothing,commercial.clothing.clothes,commercial.clothing.shoes,commercial.jewelry,commercial.shopping_mall,commercial';
    }
    if (combined.includes('solar') || combined.includes('energy') || combined.includes('power')) {
      return 'commercial,service,office.company';
    }
    if (combined.includes('factor') || combined.includes('wholesale') || combined.includes('manufactur') || combined.includes('industry')) {
      return 'production,commercial,office.company';
    }
    if (combined.includes('event') || combined.includes('wedding')) {
      return 'service,entertainment,commercial';
    }
    if (combined.includes('print') || combined.includes('packag')) {
      return 'production,commercial,office.company';
    }

    return 'commercial,service,office';
  }

  /**
   * Searches live businesses via Geoapify Places API v2.
   * Note on field availability: OpenStreetMap POI data in Pakistan reliably provides
   * place names, addresses, and geographic coordinates, but phone numbers and websites
   * are frequently missing. When missing, they are kept as 'Not Available'.
   */
  public static async searchPlaces(
    apiKey: string,
    options: {
      category: string;
      subCategory?: string;
      city: string;
      province?: string;
      area?: string;
      limit?: number;
      offset?: number;
      coordinatesOverride?: GeoapifyCoordinates;
      crawlWebsites?: boolean;
      name?: string;
    }
  ): Promise<GeoapifySearchResult> {
    const key = (apiKey || process.env.GEOAPIFY_API_KEY || '').trim();
    if (!key) {
      return {
        success: false,
        businesses: [],
        error: 'GEOAPIFY_API_KEY is not configured in server environment secrets.',
        status: 'NOT_CONFIGURED',
        httpStatus: 0,
        rawFeatureCount: 0
      };
    }

    const cityKey = (options.city || 'lahore').toLowerCase().trim();
    const coords = options.coordinatesOverride || PAKISTAN_CITY_COORDINATES[cityKey] || PAKISTAN_CITY_COORDINATES['lahore'];
    const geoCategory = this.resolveGeoapifyCategory(options.category, options.subCategory);

    const limit = Math.min(Math.max(1, options.limit || 20), 500);
    const offset = Math.max(0, options.offset || 0);

    // Geoapify Places v2 URL with circle filter and category filter
    const url = new URL('https://api.geoapify.com/v2/places');
    url.searchParams.set('categories', geoCategory);
    if (options.name && options.name.trim() !== '') {
      url.searchParams.set('name', options.name.trim());
    }
    url.searchParams.set('filter', `circle:${coords.lon},${coords.lat},${coords.radiusMeters}`);
    url.searchParams.set('bias', `proximity:${coords.lon},${coords.lat}`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('apiKey', key);

    const nameParamSanitized = options.name ? `&name=${encodeURIComponent(options.name)}` : '';
    const sanitizedUrl = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(geoCategory)}${nameParamSanitized}&filter=circle:${coords.lon},${coords.lat},${coords.radiusMeters}&limit=${limit}&offset=${offset}&apiKey=REDACTED`;

    try {
      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' }
      });

      if (response.status === 401) {
        return {
          success: false,
          businesses: [],
          error: 'Unauthorized: Invalid GEOAPIFY_API_KEY. Please verify your API key in Settings > Integrations.',
          status: 'UNAUTHORIZED',
          httpStatus: 401,
          rawFeatureCount: 0,
          requestUrlSanitized: sanitizedUrl
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          businesses: [],
          error: 'Geoapify daily request limit or rate limit exceeded (HTTP 429).',
          isQuotaExceeded: true,
          status: 'QUOTA_EXCEEDED',
          httpStatus: 429,
          rawFeatureCount: 0,
          requestUrlSanitized: sanitizedUrl
        };
      }

      if (response.status === 400) {
        const text = await response.text();
        return {
          success: false,
          businesses: [],
          error: `Geoapify rejected query parameters (HTTP 400 Bad Request): ${text.slice(0, 200)}`,
          status: 'BAD_REQUEST',
          httpStatus: 400,
          rawFeatureCount: 0,
          requestUrlSanitized: sanitizedUrl
        };
      }

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          businesses: [],
          error: `Geoapify Places API returned HTTP ${response.status}: ${text.slice(0, 150)}`,
          status: 'ERROR',
          httpStatus: response.status,
          rawFeatureCount: 0,
          requestUrlSanitized: sanitizedUrl
        };
      }

      const geoJson = await response.json();
      const features = geoJson.features || [];

      // Multi-stage phone extraction on returned features
      const businesses: VerifiedPakistanBusiness[] = await Promise.all(
        features.map(async (f: any) => {
          const props = f.properties || {};
          const raw = props.datasource?.raw || {};

          // Extract Name
          const name = props.name || props.name_en || raw.name || 'Unnamed Pakistani Business';

          // Extract Website
          const website =
            props.contact?.website ||
            raw.website ||
            raw['contact:website'] ||
            raw.url ||
            undefined;

          // Address resolution
          const address =
            props.formatted ||
            [props.street, props.suburb || props.district, props.city || options.city, 'Pakistan']
              .filter(Boolean)
              .join(', ');

          const city = props.city || options.city;
          const province = props.state || options.province || 'Pakistan';
          const area = props.suburb || props.district || options.area || city;

          // Multi-stage phone resolution (OSM direct tags + website phone crawler)
          const phoneRes = await PhoneDiscoveryEngine.resolvePhone(props, {
            websiteUrl: website,
            crawlWebsiteIfMissing: options.crawlWebsites !== false
          });

          return {
            name,
            category: options.category,
            subCategory: options.subCategory || options.category,
            city,
            province,
            area,
            address,
            phoneNumber: phoneRes.hasPhone ? phoneRes.normalized : 'Not Available',
            phoneType: phoneRes.type,
            phoneSource: phoneRes.source,
            phoneSourceUrl: phoneRes.sourceUrl,
            phoneVerificationStatus: phoneRes.verificationStatus,
            websiteUrl: website,
            source: 'Geoapify Places API (Live)'
          };
        })
      );

      return {
        success: true,
        businesses,
        totalResultsFound: features.length,
        rawFeatureCount: features.length,
        httpStatus: 200,
        offset,
        limit,
        attribution: 'Powered by Geoapify | © OpenStreetMap contributors',
        requestUrlSanitized: sanitizedUrl
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        businesses: [],
        error: `Geoapify request exception: ${message}`,
        status: 'ERROR',
        httpStatus: 0,
        rawFeatureCount: 0,
        requestUrlSanitized: sanitizedUrl
      };
    }
  }
}
