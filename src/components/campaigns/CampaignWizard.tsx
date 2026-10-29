import React, { useState, useEffect } from 'react';
import {
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  MapPin,
  Filter,
  Layers,
  Sparkles,
  Zap,
  Copy,
  Info,
  Search,
  Globe,
  Globe2,
  ShieldAlert,
  Database,
  Radio,
  Phone,
  Smartphone
} from 'lucide-react';
import {
  BusinessCategory,
  PakistanLocationData,
  WebsiteFilter,
  DuplicateHandling,
  PhoneRequirement
} from '../../types';
import { api } from '../../api/client';
import { useCampaigns } from '../../context/CampaignContext';
import { NavTab } from '../layout/Sidebar';

interface CampaignWizardProps {
  onNavigate: (tab: NavTab) => void;
  onCampaignCreated?: (campaignId: string) => void;
}

const PRESET_TARGETS = [25, 50, 100, 200, 500, 1000];

export const CampaignWizard: React.FC<CampaignWizardProps> = ({ onNavigate, onCampaignCreated }) => {
  const { createCampaign } = useCampaigns();
  const [step, setStep] = useState<number>(1);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [locationData, setLocationData] = useState<PakistanLocationData | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState<boolean>(true);

  // Form State
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');

  const [selectedProvince, setSelectedProvince] = useState<string>('Punjab');
  const [selectedCity, setSelectedCity] = useState<string>('Lahore');
  const [selectedArea, setSelectedArea] = useState<string>('All Areas');

  const [leadTarget, setLeadTarget] = useState<number>(100);
  const [customTargetInput, setCustomTargetInput] = useState<string>('');
  const [isCustomTarget, setIsCustomTarget] = useState<boolean>(false);
  const [phoneRequirement, setPhoneRequirement] = useState<PhoneRequirement>('ANY_PHONE');

  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>('ALL');
  const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>('SKIP');
  const [campaignName, setCampaignName] = useState<string>('');

  // Explicit Source Selection
  const [dataSourceChoice, setDataSourceChoice] = useState<'AUTO' | 'LIVE_GEOAPIFY' | 'PAKISTAN_B2B'>('AUTO');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Categories & Pakistan Locations
  useEffect(() => {
    const load = async () => {
      try {
        const [cats, locs] = await Promise.all([api.getCategories(), api.getLocations()]);
        setCategories(cats);
        setLocationData(locs);
        if (cats.length > 0) {
          setSelectedCategory(cats[0].name);
          setSelectedSubCategory(cats[0].subcategories[0] || cats[0].name);
        }
      } catch (err) {
        console.error('Failed to load wizard metadata:', err);
      } finally {
        setIsLoadingMeta(false);
      }
    };
    load();
  }, []);

  // Update automatic smart campaign name on parameter changes
  useEffect(() => {
    if (!campaignName || campaignName.startsWith('PK-') || campaignName.includes('Leads')) {
      const cityLabel = selectedCity || 'Pakistan';
      const catLabel = selectedSubCategory || selectedCategory || 'Businesses';
      const phoneLabel = phoneRequirement === 'MOBILE_ONLY' ? 'Mobile' : 'Phone';
      setCampaignName(`${cityLabel} ${catLabel} - ${leadTarget} ${phoneLabel} Leads`);
    }
  }, [selectedCity, selectedCategory, selectedSubCategory, leadTarget, phoneRequirement]);

  const activeCategoryObj = categories.find(c => c.name === selectedCategory);
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    c.subcategories.some(sub => sub.toLowerCase().includes(categorySearch.toLowerCase()))
  );

  const activeProvinceObj = locationData?.provinces.find(p => p.name === selectedProvince);
  const activeCityObj = activeProvinceObj?.cities.find(c => c.name === selectedCity);

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1 && !selectedCategory) {
      setErrorMsg('Please select a business category to proceed');
      return;
    }
    if (step === 2 && !selectedCity) {
      setErrorMsg('Please select a target city');
      return;
    }
    if (step === 3 && leadTarget < 5) {
      setErrorMsg('Minimum lead target is 5 leads');
      return;
    }
    setStep(prev => Math.min(6, prev + 1));
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleStartCampaign = async (startImmediately: boolean) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await createCampaign({
        name: campaignName.trim() || `${selectedCity} ${selectedCategory} Campaign`,
        category: selectedCategory,
        subCategory: selectedSubCategory || selectedCategory,
        province: selectedProvince,
        city: selectedCity,
        area: selectedArea === 'All Areas' ? undefined : selectedArea,
        leadTarget,
        phoneRequirement,
        websiteFilter,
        duplicateHandling,
        startImmediately
      });

      if (onCampaignCreated) {
        onCampaignCreated(created.id);
      }
      // Navigate immediately to campaigns view to inspect the newly created job
      onNavigate('campaigns');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || 'Failed to initialize campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMeta) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-md mx-auto my-12">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-600 text-sm font-medium">Loading Pakistan business directory and locations...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Wizard Header & Stepper */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
              Lead Campaign Builder
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
              Configure New Hunting Campaign
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Target authentic, registered Pakistani enterprises across 20+ specialized industries.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 self-start md:self-auto">
            Step {step} of 6
          </span>
        </div>

        {/* Steps Bar */}
        <div className="grid grid-cols-6 gap-2">
          {[
            { num: 1, label: 'Category' },
            { num: 2, label: 'Location' },
            { num: 3, label: 'Target' },
            { num: 4, label: 'Web Filter' },
            { num: 5, label: 'Deduplication' },
            { num: 6, label: 'Review & Launch' }
          ].map(s => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center">
                <div
                  className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                    isDone
                      ? 'bg-blue-600'
                      : isCurrent
                      ? 'bg-blue-600 ring-2 ring-blue-300'
                      : 'bg-slate-200'
                  }`}
                />
                <span
                  className={`hidden sm:block text-[11px] mt-1.5 font-medium truncate ${
                    isCurrent ? 'text-blue-700 font-bold' : isDone ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: CATEGORY & SUBCATEGORY */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>Step 1: Select Business Category & Subcategory</span>
            </h2>
            <p className="text-xs text-slate-500">
              Choose from 20+ specialized Pakistani industry verticals.
            </p>
          </div>

          {/* Search categories */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search category (e.g. Fashion, Automotive, Medical, Real Estate, Solar)..."
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
            {filteredCategories.map((cat, idx) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={`${cat.id}-${cat.slug || idx}`}
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setSelectedSubCategory(cat.subcategories[0] || cat.name);
                  }}
                  className={`p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-blue-600 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-900 truncate">{cat.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{cat.description}</p>
                </button>
              );
            })}
          </div>

          {/* Subcategories Selector for Selected Category */}
          {activeCategoryObj && activeCategoryObj.subcategories.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-800 mb-2">
                Target Subcategory / Niche in &ldquo;{selectedCategory}&rdquo;:
              </label>
              <div className="flex flex-wrap gap-2">
                {activeCategoryObj.subcategories.map((sub, i) => {
                  const isSelectedSub = selectedSubCategory === sub;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedSubCategory(sub)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        isSelectedSub
                          ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: PAKISTAN LOCATION FILTERS */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>Step 2: Pakistan Location Filters</span>
            </h2>
            <p className="text-xs text-slate-500">
              Select commercial hubs and specific metropolitan sectors across Pakistan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Country */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Country
              </label>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 flex items-center gap-2">
                <span>🇵🇰</span>
                <span>Pakistan (Countrywide)</span>
              </div>
            </div>

            {/* Province */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Province / Region
              </label>
              <select
                value={selectedProvince}
                onChange={e => {
                  const provName = e.target.value;
                  setSelectedProvince(provName);
                  const p = locationData?.provinces.find(prov => prov.name === provName);
                  if (p && p.cities.length > 0) {
                    setSelectedCity(p.cities[0].name);
                    setSelectedArea('All Areas');
                  }
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              >
                {locationData?.provinces.map(prov => (
                  <option key={prov.id} value={prov.name}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target City
              </label>
              <select
                value={selectedCity}
                onChange={e => {
                  setSelectedCity(e.target.value);
                  setSelectedArea('All Areas');
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              >
                {activeProvinceObj?.cities.map(city => (
                  <option key={city.id} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Area / Commercial District Selector */}
          {activeCityObj && activeCityObj.popularAreas.length > 0 && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-800 mb-2">
                Commercial Sector / Business District in {selectedCity}:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedArea('All Areas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    selectedArea === 'All Areas'
                      ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All {selectedCity} Areas
                </button>
                {activeCityObj.popularAreas.map((area, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedArea(area)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      selectedArea === area
                        ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: LEAD TARGET & PRESETS */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span>Step 3: Choose Lead Target</span>
            </h2>
            <p className="text-xs text-slate-500">
              The engine counts unique verified business records and stops automatically once the target is satisfied.
            </p>
          </div>

          {/* Target presets */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {PRESET_TARGETS.map(target => {
              const isSelected = leadTarget === target && !isCustomTarget;
              return (
                <button
                  key={target}
                  onClick={() => {
                    setLeadTarget(target);
                    setIsCustomTarget(false);
                  }}
                  className={`p-4 rounded-xl text-center border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-md'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xl font-bold font-mono">{target}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">Leads</div>
                </button>
              );
            })}

            {/* Custom Target button */}
            <button
              onClick={() => setIsCustomTarget(true)}
              className={`p-4 rounded-xl text-center border transition-all cursor-pointer ${
                isCustomTarget
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-md'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="text-xl font-bold font-mono">Custom</div>
              <div className="text-[11px] opacity-80 mt-0.5">Target</div>
            </button>
          </div>

          {/* Custom Input */}
          {isCustomTarget && (
            <div className="p-4 rounded-xl bg-slate-50 border border-blue-200 flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">
                Custom Lead Target:
              </label>
              <input
                type="number"
                min="5"
                max="10000"
                value={customTargetInput}
                placeholder="Enter target (e.g. 25, 100, 200)"
                onChange={e => {
                  setCustomTargetInput(e.target.value);
                  const parsed = parseInt(e.target.value, 10);
                  if (parsed > 0) setLeadTarget(parsed);
                }}
                className="w-36 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
              />
              <span className="text-xs text-slate-500">phone-qualified leads</span>
            </div>
          )}

          {/* Phone Requirement Control */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>Phone Qualification Requirement:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPhoneRequirement('ANY_PHONE')}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                  phoneRequirement === 'ANY_PHONE'
                    ? 'bg-blue-50 border-blue-600 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs text-slate-900">Any Public Business Phone</span>
                  </div>
                  {phoneRequirement === 'ANY_PHONE' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-500">
                  Accepts verified Pakistani mobile numbers (03xx) and official city landlines (021, 042, 051, etc.).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPhoneRequirement('MOBILE_ONLY')}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                  phoneRequirement === 'MOBILE_ONLY'
                    ? 'bg-blue-50 border-blue-600 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-slate-900">Pakistani Mobile Only (03xx)</span>
                  </div>
                  {phoneRequirement === 'MOBILE_ONLY' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-slate-500">
                  Strictly collects 11-digit mobile numbers with WhatsApp direct messaging capability.
                </p>
              </button>
            </div>
          </div>

          {/* Auto-Stop Phone Guarantee Card */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Strict Phone Target Guarantee:</span> The campaign prioritizes collecting exactly{' '}
              <strong className="font-mono text-blue-700 font-bold">{leadTarget}</strong> unique business leads with publicly available phone numbers. Businesses without public phone numbers are evaluated and counted in scanned POIs, but <strong>never</strong> count toward your lead target.
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: WEBSITE FILTERS */}
      {step === 4 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              <span>Step 4: Website Presence Filter</span>
            </h2>
            <p className="text-xs text-slate-500">
              Filter businesses based on their active digital presence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* All businesses */}
            <button
              onClick={() => setWebsiteFilter('ALL')}
              className={`p-5 rounded-2xl text-left border transition-all cursor-pointer ${
                websiteFilter === 'ALL'
                  ? 'bg-blue-50 border-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-5 h-5 text-blue-600" />
                {websiteFilter === 'ALL' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <h3 className="font-bold text-slate-900 text-xs">All Businesses</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Collect all verified businesses regardless of whether they possess a website or not.
              </p>
            </button>

            {/* Businesses with websites */}
            <button
              onClick={() => setWebsiteFilter('HAS_WEBSITE')}
              className={`p-5 rounded-2xl text-left border transition-all cursor-pointer ${
                websiteFilter === 'HAS_WEBSITE'
                  ? 'bg-blue-50 border-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                {websiteFilter === 'HAS_WEBSITE' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <h3 className="font-bold text-slate-900 text-xs">With Website Only</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Only save businesses that have a publicly indexed web domain or online portal.
              </p>
            </button>

            {/* Businesses without websites */}
            <button
              onClick={() => setWebsiteFilter('NO_WEBSITE')}
              className={`p-5 rounded-2xl text-left border transition-all cursor-pointer ${
                websiteFilter === 'NO_WEBSITE'
                  ? 'bg-blue-50 border-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Globe2 className="w-5 h-5 text-purple-600" />
                {websiteFilter === 'NO_WEBSITE' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <h3 className="font-bold text-slate-900 text-xs">No Website (Web Prospects)</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                High-yield prospects for digital marketing agencies and web design services.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: DEDUPLICATION & NAME */}
      {step === 5 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-600" />
              <span>Step 5: Deduplication & Campaign Settings</span>
            </h2>
            <p className="text-xs text-slate-500">
              Configure how the hunter handles businesses that already exist in your repository.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skip Duplicates */}
            <button
              onClick={() => setDuplicateHandling('SKIP')}
              className={`p-5 rounded-2xl text-left border transition-all cursor-pointer ${
                duplicateHandling === 'SKIP'
                  ? 'bg-blue-50 border-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  Recommended
                </span>
                {duplicateHandling === 'SKIP' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <h3 className="font-bold text-slate-900 text-xs">Skip Duplicate Leads</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                If the phone number or business name + city is already saved in your repository, do not count or save it again.
              </p>
            </button>

            {/* Merge Duplicates */}
            <button
              onClick={() => setDuplicateHandling('MERGE')}
              className={`p-5 rounded-2xl text-left border transition-all cursor-pointer ${
                duplicateHandling === 'MERGE'
                  ? 'bg-blue-50 border-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-500">Enrich Existing</span>
                {duplicateHandling === 'MERGE' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </div>
              <h3 className="font-bold text-slate-900 text-xs">Merge & Enrich Records</h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Update missing fields (e.g. websites, addresses) on previously collected records without double counting.
              </p>
            </button>
          </div>

          {/* Campaign Name */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Campaign Name
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder="e.g. Lahore Fashion Boutiques - 100 Leads"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* STEP 6: REVIEW & LAUNCH */}
      {step === 6 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Step 6: Review Specifications & Start Campaign</span>
            </h2>
            <p className="text-xs text-slate-500">
              Verify your search criteria before the background lead hunter begins processing.
            </p>
          </div>

          {/* Summary Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5 text-[11px]">Category</span>
              <span className="text-slate-900 font-semibold">{selectedCategory}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 text-[11px]">Subcategory / Niche</span>
              <span className="text-blue-700 font-semibold">{selectedSubCategory}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 text-[11px]">Target City</span>
              <span className="text-slate-900 font-semibold">
                {selectedCity}, {selectedProvince} {selectedArea !== 'All Areas' ? `(${selectedArea})` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 text-[11px]">Requested Yield</span>
              <span className="text-blue-600 font-mono font-bold text-sm">
                {leadTarget} Unique Leads
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 text-[11px]">Website Filter</span>
              <span className="text-slate-900 font-semibold">
                {websiteFilter === 'ALL'
                  ? 'All Businesses'
                  : websiteFilter === 'HAS_WEBSITE'
                  ? 'With Website Only'
                  : 'Without Website Only'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 text-[11px]">Deduplication</span>
              <span className="text-slate-900 font-semibold">
                {duplicateHandling === 'SKIP' ? 'Skip existing' : 'Merge existing'}
              </span>
            </div>
          </div>

          {/* Launch Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 justify-end border-t border-slate-200">
            <button
              disabled={isSubmitting}
              onClick={() => handleStartCampaign(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
            >
              Save Campaign as Draft
            </button>
            <button
              disabled={isSubmitting}
              onClick={() => handleStartCampaign(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{isSubmitting ? 'Starting Hunting Job...' : 'Start Lead Hunting Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation Footer (Back / Next) */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleBack}
          disabled={step === 1 || isSubmitting}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer ${
            step === 1 ? 'opacity-0 pointer-events-none' : ''
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {step < 6 && (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            <span>Proceed to Step {step + 1}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
