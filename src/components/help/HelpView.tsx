import React from 'react';
import {
  HelpCircle,
  Phone,
  Globe,
  Layers,
  KeyRound,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export const HelpView: React.FC = () => {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-amber-400" />
          <span>Documentation & SOPs</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Operational guide for business lead hunting, contact normalization, and export compliance in Pakistan.
        </p>
      </div>

      {/* Section 1: Pakistani Phone Number Normalization Standard */}
      <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-4 shadow-sm text-xs">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Phone className="w-4 h-4 text-amber-400" />
          <span>Pakistan Telecommunication Authority (PTA) Normalization Rules</span>
        </h2>
        <p className="text-slate-300 leading-relaxed">
          The software standardizes all raw contact strings into clean, dialable local Pakistani numbers while preserving the raw input for verification:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-semibold text-amber-300 block">Mobile Numbers (Jazz, Zong, Telenor, Ufone)</span>
            <div className="font-mono text-slate-400 text-[11px]">
              Raw: <code>+92 300 1234567</code> / <code>00923001234567</code>
            </div>
            <div className="font-mono text-emerald-400 font-bold text-[11px]">
              Normalized: <code>03001234567</code> (11 digits, WhatsApp enabled)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-semibold text-amber-300 block">Metropolitan Landlines (PTCL / NTC)</span>
            <div className="font-mono text-slate-400 text-[11px]">
              Karachi: <code>021-35870000</code> • Lahore: <code>042-35750000</code> • Islamabad: <code>051-2800000</code>
            </div>
            <div className="font-mono text-emerald-400 font-bold text-[11px]">
              Normalized: Area code prefix preserved with clean hyphen
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Zero Hallucination Guarantee:</strong> The platform will NEVER fabricate contact numbers or addresses. Missing numbers are explicitly tagged as <em>Not Available</em>.
          </span>
        </div>
      </div>

      {/* Section 2: Strategy for B2B Agencies */}
      <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-4 shadow-sm text-xs">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-teal-400" />
          <span>Agency Outreach Playbooks</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h3 className="font-bold text-sm text-white">Targeting &ldquo;No Website&rdquo; Businesses</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Use Step 4 of the Campaign Wizard to isolate businesses with physical presence but no website. These are prime prospects for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] pl-1">
              <li>Custom website design & Shopify e-commerce setups</li>
              <li>Google Business Profile setup and local SEO optimization</li>
              <li>Social media management & meta ads campaigns</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h3 className="font-bold text-sm text-white">Targeting &ldquo;Has Website&rdquo; Enterprises</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Target registered digital businesses for high-ticket services:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] pl-1">
              <li>ERP & CRM software implementations</li>
              <li>Cloud infrastructure & cybersecurity audits</li>
              <li>B2B corporate logistics & warehousing solutions</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 3: Campaign Lifecycle & Automatic Stop */}
      <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-4 shadow-sm text-xs text-slate-300">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Automatic Stop & Job Persistence</span>
        </h2>
        <p className="text-slate-400 leading-relaxed">
          Campaign jobs run server-side and persist state into durable storage. If you refresh your browser or navigate to other tabs, campaigns continue executing safely in the background. The runner checks unique qualifying records on every iteration and halts precisely upon achieving your target.
        </p>
      </div>
    </div>
  );
};
