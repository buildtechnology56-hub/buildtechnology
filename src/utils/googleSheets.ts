import { Lead } from '../types';

export const REQUIRED_HEADERS = [
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
  'Source',
  'Outreach Status',
  'Date Collected'
];

export interface GoogleSheetsTestResult {
  success: boolean;
  message: string;
  spreadsheetTitle?: string;
  sheetTitle?: string;
  rowCount?: number;
  httpStatus: number;
  testedAt: string;
}

export interface SyncLeadsResult {
  success: boolean;
  appendedCount: number;
  skippedDuplicatesCount: number;
  totalProcessed: number;
  sheetTitle: string;
  error?: string;
}

export async function testSpreadsheetConnection(
  accessToken: string,
  spreadsheetId: string,
  gid?: string
): Promise<GoogleSheetsTestResult> {
  const testedAt = new Date().toISOString();
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson.error?.message || errMsg;
      } catch {
        // ignore
      }
      return {
        success: false,
        message: `Failed to connect to Google Spreadsheet (${errMsg}). Ensure you have edit access or shared with your account.`,
        httpStatus: res.status,
        testedAt
      };
    }

    const data = await res.json();
    const sheets = data.sheets || [];
    let targetSheet = sheets[0];

    if (gid) {
      const gidNum = parseInt(gid, 10);
      const match = sheets.find((s: any) => s.properties?.sheetId === gidNum);
      if (match) {
        targetSheet = match;
      }
    }

    const sheetTitle = targetSheet?.properties?.title || 'Sheet1';
    const rowCount = targetSheet?.properties?.gridProperties?.rowCount || 0;

    return {
      success: true,
      message: `Successfully connected to spreadsheet "${data.properties?.title || 'Lead Database'}". Sheet tab: "${sheetTitle}".`,
      spreadsheetTitle: data.properties?.title,
      sheetTitle,
      rowCount,
      httpStatus: 200,
      testedAt
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Network connection failed: ${message}`,
      httpStatus: 0,
      testedAt
    };
  }
}

export async function appendLeadsToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  leads: Lead[],
  gid?: string
): Promise<SyncLeadsResult> {
  if (leads.length === 0) {
    return {
      success: true,
      appendedCount: 0,
      skippedDuplicatesCount: 0,
      totalProcessed: 0,
      sheetTitle: 'Sheet1'
    };
  }

  // 1. Fetch spreadsheet structure to find sheet title
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Failed to load spreadsheet: HTTP ${metaRes.status} - ${errText}`);
  }

  const metaData = await metaRes.json();
  const sheets = metaData.sheets || [];
  let targetSheet = sheets[0];
  if (gid) {
    const gidNum = parseInt(gid, 10);
    const match = sheets.find((s: any) => s.properties?.sheetId === gidNum);
    if (match) targetSheet = match;
  }
  const sheetTitle = targetSheet?.properties?.title || 'Sheet1';

  // 2. Fetch existing rows to check headers and deduplicate
  const existingRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A:B`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  let existingPhones = new Set<string>();
  let existingNames = new Set<string>();
  let needsHeaders = true;

  if (existingRes.ok) {
    const existingData = await existingRes.json();
    const rows: string[][] = existingData.values || [];
    if (rows.length > 0) {
      needsHeaders = false;
      // Skip header row if present
      for (let i = 1; i < rows.length; i++) {
        const name = (rows[i][0] || '').toLowerCase().trim();
        const phone = (rows[i][1] || '').replace(/[^0-9]/g, '');
        if (name) existingNames.add(name);
        if (phone) existingPhones.add(phone);
      }
    }
  }

  // 3. Write headers if sheet is empty
  if (needsHeaders) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:N1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [REQUIRED_HEADERS]
        })
      }
    );
  }

  // 4. Filter duplicates and prepare rows
  const rowsToAppend: any[][] = [];
  let skippedDuplicates = 0;

  for (const lead of leads) {
    const nameNorm = (lead.businessName || '').toLowerCase().trim();
    const phoneDigits = (lead.phoneNumber || '').replace(/[^0-9]/g, '');

    if (
      (phoneDigits && existingPhones.has(phoneDigits)) ||
      (nameNorm && existingNames.has(nameNorm))
    ) {
      skippedDuplicates++;
      continue;
    }

    // Exact required column mapping:
    // 1. Business Name
    // 2. Phone Number (Format with single quote e.g. '03001234567 so Google Sheets treats it as text)
    // 3. City
    // 4. Area
    // 5. Business Address
    // 6. Website URL
    // 7. Website Status
    // 8. Category
    // 9. Subcategory
    // 10. Campaign Name
    // 11. Campaign ID
    // 12. Source
    // 13. Outreach Status
    // 14. Date Collected
    const formattedPhone = lead.phoneNumber ? `'${lead.phoneNumber}` : 'Not Available';
    const websiteStatusText = lead.websiteStatus === 'HAS_WEBSITE' ? 'Has Website' : 'No Website';
    const dateFormatted = lead.dateCollected ? lead.dateCollected.split('T')[0] : new Date().toISOString().split('T')[0];

    rowsToAppend.push([
      lead.businessName,
      formattedPhone,
      lead.city,
      lead.area || lead.city,
      lead.businessAddress || `${lead.city}, Pakistan`,
      lead.websiteUrl || 'Not Available',
      websiteStatusText,
      lead.category,
      lead.subCategory,
      lead.campaignName,
      lead.campaignId,
      lead.dataSource,
      lead.outreachStatus,
      dateFormatted
    ]);

    if (nameNorm) existingNames.add(nameNorm);
    if (phoneDigits) existingPhones.add(phoneDigits);
  }

  if (rowsToAppend.length === 0) {
    return {
      success: true,
      appendedCount: 0,
      skippedDuplicatesCount: skippedDuplicates,
      totalProcessed: leads.length,
      sheetTitle
    };
  }

  // 5. Append to Google Sheets
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A:N:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rowsToAppend
      })
    }
  );

  if (!appendRes.ok) {
    const errorText = await appendRes.text();
    throw new Error(`Google Sheets API append failed: HTTP ${appendRes.status} - ${errorText}`);
  }

  return {
    success: true,
    appendedCount: rowsToAppend.length,
    skippedDuplicatesCount: skippedDuplicates,
    totalProcessed: leads.length,
    sheetTitle
  };
}
