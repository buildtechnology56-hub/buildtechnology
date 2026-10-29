/**
 * Pakistani Phone Number Normalization Utility
 * Follows PTA (Pakistan Telecommunication Authority) numbering plan.
 * Mobile codes: 0300-0349, 0355 (GB)
 * Major landline area codes: 021 (Karachi), 042 (Lahore), 051 (Islamabad/Rawalpindi),
 * 041 (Faisalabad), 061 (Multan), 091 (Peshawar), 081 (Quetta), 022 (Hyderabad),
 * 052 (Sialkot), 055 (Gujranwala), 0992 (Abbottabad), 062 (Bahawalpur), 071 (Sukkur).
 */

export interface NormalizedPhoneResult {
  normalized: string; // e.g. "03001234567" or "042-35717231" or "Not Available"
  raw: string;
  isValid: boolean;
  type: 'mobile' | 'landline' | 'unknown' | 'none';
  formattedDisplay: string; // e.g. "0300 1234567" or "042 35717231"
  whatsappLink?: string;
  allFoundPhones?: string[];
}

/**
 * Normalizes a single digit sequence according to the Pakistani numbering plan.
 */
function normalizeDigitsToken(token: string): { normalized: string; type: 'mobile' | 'landline' | 'unknown'; isValid: boolean } | null {
  // Strip common label prefixes like "Tel:", "Phone:", "Mob:", "WhatsApp:", "Cell:", "Ph:", "Office:"
  let clean = token.trim().replace(/^(?:tel|phone|mob|mobile|whatsapp|cell|ph|call|uanc|office|direct)[\s.:\-]+/i, '').trim();

  // Handle extension ranges like "04235790005-6" or "042-35790005-06" -> keep base number
  clean = clean.replace(/(\d{7,10})-\d{1,2}$/, '$1');

  // Strip all non-digit, non-plus characters
  let digits = clean.replace(/[\s\-\(\)\.]/g, '');

  // Handle +92, 0092, 92 prefixes
  if (digits.startsWith('+92')) {
    digits = '0' + digits.slice(3);
  } else if (digits.startsWith('0092')) {
    digits = '0' + digits.slice(4);
  } else if (digits.startsWith('92') && digits.length >= 11) {
    digits = '0' + digits.slice(2);
  } else if (/^3\d{9}$/.test(digits)) {
    // 10 digits starting with 3 (user or API omitted leading 0)
    digits = '0' + digits;
  }

  // 1. Pakistani Mobile: exactly 11 digits starting with 03 (PTA allocated prefixes: 0300-0349, 0355)
  if (/^03\d{9}$/.test(digits)) {
    return { normalized: digits, type: 'mobile', isValid: true };
  }

  // 2. 2-Digit Area Code Landline: Karachi (021), Lahore (042), Islamabad/Rawalpindi (051) -> 10 or 11 digits
  if (/^(021|042|051)\d{7,8}$/.test(digits)) {
    const prefix = digits.slice(0, 3);
    const rest = digits.slice(3);
    return { normalized: `${prefix}-${rest}`, type: 'landline', isValid: true };
  }

  // 3. 3-Digit Area Code Landline: Faisalabad (041), Multan (061), Peshawar (091), Quetta (081), Hyderabad (022), Sialkot (052), Gujranwala (055), Sukkur (071), Bahawalpur (062) -> 10 or 11 digits
  if (/^(041|061|091|081|022|052|055|062|071)\d{7}$/.test(digits)) {
    const prefix = digits.slice(0, 4);
    const rest = digits.slice(4);
    return { normalized: `${prefix}-${rest}`, type: 'landline', isValid: true };
  }

  // 4. Abbottabad (0992) or other 4-digit area codes
  if (/^0992\d{6,7}$/.test(digits)) {
    const prefix = digits.slice(0, 5);
    const rest = digits.slice(5);
    return { normalized: `${prefix}-${rest}`, type: 'landline', isValid: true };
  }

  // 5. General valid Pakistani number with leading 0 (e.g. UAN 111-xxx-xxx or special service)
  if (/^0\d{8,10}$/.test(digits)) {
    return { normalized: digits, type: 'unknown', isValid: true };
  }

  return null;
}

/**
 * Normalizes publicly listed Pakistani phone numbers with support for:
 * - String or numeric inputs from JSON
 * - Multi-number strings with delimiters (|, /, ,, ;, \n, " or ", " and ")
 * - Text prefixes ("Tel: 0300 1234567")
 * - International formats (+92, 0092, 92)
 * - Prioritizes valid Pakistani mobile numbers (03xx) over landlines when multiple exist
 */
export function normalizePakistaniPhoneNumber(rawInput?: string | number | null): NormalizedPhoneResult {
  if (rawInput === undefined || rawInput === null) {
    return {
      normalized: 'Not Available',
      raw: 'Not Available',
      isValid: false,
      type: 'none',
      formattedDisplay: 'Not Available'
    };
  }

  const rawStr = String(rawInput).trim();
  if (!rawStr || rawStr.toLowerCase() === 'not available' || rawStr.toLowerCase() === 'n/a') {
    return {
      normalized: 'Not Available',
      raw: 'Not Available',
      isValid: false,
      type: 'none',
      formattedDisplay: 'Not Available'
    };
  }

  // Split on common multi-phone delimiters
  const tokens = rawStr.split(/[\|,\/;\n\r]|(?:\s+or\s+)|\s+and\s+/i);
  const foundMobiles: string[] = [];
  const foundLandlines: string[] = [];
  const foundUnknowns: string[] = [];

  for (const token of tokens) {
    if (!token.trim()) continue;
    const res = normalizeDigitsToken(token);
    if (res && res.isValid) {
      if (res.type === 'mobile' && !foundMobiles.includes(res.normalized)) {
        foundMobiles.push(res.normalized);
      } else if (res.type === 'landline' && !foundLandlines.includes(res.normalized)) {
        foundLandlines.push(res.normalized);
      } else if (res.type === 'unknown' && !foundUnknowns.includes(res.normalized)) {
        foundUnknowns.push(res.normalized);
      }
    }
  }

  // Embedded regex search fallback if delimiters did not capture
  if (foundMobiles.length === 0) {
    const embeddedMobiles = [...rawStr.matchAll(/(?:\+92|0092|92|0)?\s*3\d{2}[-\s.]?\d{7}/g)];
    for (const m of embeddedMobiles) {
      const res = normalizeDigitsToken(m[0]);
      if (res && res.type === 'mobile' && !foundMobiles.includes(res.normalized)) {
        foundMobiles.push(res.normalized);
      }
    }
  }

  if (foundLandlines.length === 0) {
    const embeddedLandlines = [...rawStr.matchAll(/(?:\+92|0092|92|0)?\s*(?:21|42|51)[-\s.]?\d{7,8}/g)];
    for (const m of embeddedLandlines) {
      const res = normalizeDigitsToken(m[0]);
      if (res && res.type === 'landline' && !foundLandlines.includes(res.normalized)) {
        foundLandlines.push(res.normalized);
      }
    }
  }

  const allFound = [...foundMobiles, ...foundLandlines, ...foundUnknowns];

  // Prioritize Mobile numbers (core purpose of the Lead Hunter engine)
  if (foundMobiles.length > 0) {
    const primaryMobile = foundMobiles[0];
    const formatted = `${primaryMobile.slice(0, 4)} ${primaryMobile.slice(4)}`;
    return {
      normalized: primaryMobile,
      raw: rawStr,
      isValid: true,
      type: 'mobile',
      formattedDisplay: formatted,
      whatsappLink: `https://wa.me/92${primaryMobile.slice(1)}`,
      allFoundPhones: allFound
    };
  }

  // If no mobile, return valid landline
  if (foundLandlines.length > 0) {
    const primaryLandline = foundLandlines[0];
    const display = primaryLandline.replace('-', ' ');
    return {
      normalized: primaryLandline,
      raw: rawStr,
      isValid: true,
      type: 'landline',
      formattedDisplay: display,
      allFoundPhones: allFound
    };
  }

  // If unknown valid Pakistani number
  if (foundUnknowns.length > 0) {
    return {
      normalized: foundUnknowns[0],
      raw: rawStr,
      isValid: true,
      type: 'unknown',
      formattedDisplay: foundUnknowns[0],
      allFoundPhones: allFound
    };
  }

  // Not a valid Pakistani phone format
  return {
    normalized: rawStr,
    raw: rawStr,
    isValid: false,
    type: 'unknown',
    formattedDisplay: rawStr,
    allFoundPhones: []
  };
}
