import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Building,
  Info,
  Check
} from 'lucide-react';
import { Campaign, BusinessCategory, WebsiteFilter } from '../../types';
import { api } from '../../api/client';

export const ExportsView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);

  // Filter criteria before export
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedWebsiteStatus, setSelectedWebsiteStatus] = useState<WebsiteFilter>('ALL');

  const [matchingCount, setMatchingCount] = useState<number>(0);
  const [isCounting, setIsCounting] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([api.getCampaigns(), api.getCategories()])
      .then(([cList, catList]) => {
        setCampaigns(cList);
        setCategories(catList);
      })
      .catch(console.error);
  }, []);

  // Update preview count whenever filters change
  useEffect(() => {
    let isCancelled = false;
    setIsCounting(true);
    api
      .getLeads({
        campaignId: selectedCampaignId || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        city: selectedCity !== 'All' ? selectedCity : undefined,
        websiteStatus: selectedWebsiteStatus !== 'ALL' ? selectedWebsiteStatus : undefined,
        limit: 1
      })
      .then(res => {
        if (!isCancelled) setMatchingCount(res.total);
      })
      .catch(console.error)
      .finally(() => {
        if (!isCancelled) setIsCounting(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCampaignId, selectedCategory, selectedCity, selectedWebsiteStatus]);

  const exportUrl = api.getExportCsvUrl({
    campaignId: selectedCampaignId || undefined,
    category: selectedCategory,
    city: selectedCity,
    websiteStatus: selectedWebsiteStatus
  });

  const columnsList = [
    { label: 'Business Name', desc: 'Trading name of the Pakistani enterprise' },
    { label: 'Phone Number', desc: 'Normalized PTA contact number (mobile / landline)' },
    { label: 'City', desc: 'Metropolitan hub (Karachi, Lahore, Islamabad, etc.)' },
    { label: 'Area', desc: 'Commercial district or sector (Clifton, Gulberg, etc.)' },
    { label: 'Business Address', desc: 'Public physical storefront / head office address' },
    { label: 'Website URL', desc: 'Live digital URL when registered' },
    { label: 'Website Status', desc: 'Has Website or No Website classification' },
    { label: 'Category', desc: 'Primary industry classification' },
    { label: 'Subcategory', desc: 'Specific market niche' },
    { label: 'Campaign Name', desc: 'Originating lead hunter campaign' },
    { label: 'Data Source', desc: 'Google Places API / Verified Directory' },
    { label: 'Outreach Status', desc: 'New, Contacted, Interested, etc.' },
    { label: 'Date Collected', desc: 'ISO timestamp of record collection' }
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-amber-400" />
          <span>CSV & Excel Export Center</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Generate clean, RFC 4180 UTF-8 encoded datasets with Excel BOM header for instant opening.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filter Configuration Card */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-5 shadow-sm">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-400" />
            <span>1. Configure Export Criteria</span>
          </h2>

          <div className="space-y-4 text-xs">
            {/* Filter by Campaign */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Target Campaign
              </label>
              <select
                value={selectedCampaignId}
                onChange={e => setSelectedCampaignId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">All Campaigns (Entire Lead Database)</option>
                {campaigns.map(camp => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name} ({camp.uniqueLeadsCollected} leads)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Category */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="All">All Categories</option>
                  {categories.map((c, idx) => (
                    <option key={`${c.id}-${c.slug || idx}`} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  City
                </label>
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="All">All Cities</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Lahore">Lahore</option>
                  <option value="Islamabad">Islamabad</option>
                  <option value="Rawalpindi">Rawalpindi</option>
                  <option value="Faisalabad">Faisalabad</option>
                  <option value="Multan">Multan</option>
                  <option value="Peshawar">Peshawar</option>
                  <option value="Quetta">Quetta</option>
                  <option value="Sialkot">Sialkot</option>
                  <option value="Gujranwala">Gujranwala</option>
                  <option value="Hyderabad">Hyderabad</option>
                </select>
              </div>

              {/* Website Status */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Website Status
                </label>
                <select
                  value={selectedWebsiteStatus}
                  onChange={e => setSelectedWebsiteStatus(e.target.value as WebsiteFilter)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">All Businesses</option>
                  <option value="HAS_WEBSITE">Has Website Only</option>
                  <option value="NO_WEBSITE">No Website Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Export Action Card */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400">Records Matching Filter:</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                {isCounting ? 'Counting...' : `${matchingCount.toLocaleString()} Leads`}
              </div>
            </div>

            <a
              href={exportUrl}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-950/40 transition-all ${
                matchingCount === 0 ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Download CSV File</span>
            </a>
          </div>
        </div>

        {/* Specifications & Excel Compatibility Info */}
        <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Standard Compliance</span>
            </h2>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>UTF-8 Byte Order Mark (BOM):</strong> Automatically included so Microsoft Excel opens Urdu / English text without garbled characters.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>No Fabricated Information:</strong> Missing items are explicitly flagged as <em>Not Available</em>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Deduplicated Output:</strong> Filters out identical business entries before creating rows.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Geoapify Terms Compliant:</strong> Geoapify explicitly permits persistent storage and CSV export of POIs. Sourced from OpenStreetMap contributors.
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
            Powered by Geoapify | &copy; OpenStreetMap contributors. Complies with ODbL data reuse standards.
          </div>
        </div>
      </div>

      {/* Columns Schema Display */}
      <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-white">Exported Columns Schema (13 Data Points)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {columnsList.map((col, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-1"
            >
              <span className="font-semibold text-amber-300 font-mono block">
                {i + 1}. {col.label}
              </span>
              <p className="text-[11px] text-slate-400">{col.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
