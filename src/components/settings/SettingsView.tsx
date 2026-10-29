import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Users,
  Copy,
  Building2,
  Lock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { User } from '../../types';

export const SettingsView: React.FC = () => {
  const { user, isAdmin, switchRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Fetch users for admin
    fetch('/api/auth/me')
      .then(res => res.json())
      .catch(console.error);
  }, []);

  const handleRoleToggle = async () => {
    await switchRole(isAdmin ? 'user' : 'admin');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-400" />
          <span>Platform Settings & Administration</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Role-based access control, organization branding, and deduplication rules.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Active role permissions successfully updated.</span>
        </div>
      )}

      {/* Account & Role Card */}
      <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Active Session & Access Level</span>
          </h2>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              isAdmin
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
            }`}
          >
            {isAdmin ? 'Super Admin' : 'Standard Hunter'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block mb-1">User Name</span>
            <span className="font-semibold text-white">{user?.name || 'Administrator'}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block mb-1">Email Address</span>
            <span className="font-mono text-slate-300">{user?.email || 'admin@buildtech.pk'}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block mb-1">Company Account</span>
            <span className="font-semibold text-amber-300">Build Technology Pakistan</span>
          </div>
        </div>

        {/* Role Switcher Demo Control */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-slate-200">Role Permissions Simulator</div>
            <p className="text-[11px] text-slate-400">
              Test how the interface adapts between Super Admin (all campaigns & categories) and Standard User (own campaigns).
            </p>
          </div>
          <button
            onClick={handleRoleToggle}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Switch to {isAdmin ? 'Standard User' : 'Super Admin'}</span>
          </button>
        </div>
      </div>

      {/* Organization Branding */}
      <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-4 shadow-sm text-xs">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-amber-400" />
          <span>Branding & Regional Focus</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Brand Name</label>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold">
              Build Technology Lead Hunter
            </div>
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Tagline</label>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 italic">
              Find Businesses. Discover Opportunities.
            </div>
          </div>
        </div>
      </div>

      {/* Deduplication Strategy Rules */}
      <div className="rounded-2xl bg-[#0b1222]/90 border border-slate-800 p-6 space-y-4 shadow-sm text-xs text-slate-300">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Copy className="w-4 h-4 text-amber-400" />
          <span>Repository Deduplication Policy</span>
        </h2>
        <div className="space-y-2 text-slate-400 leading-relaxed">
          <p>
            When hunting leads, Build Technology Lead Hunter enforces consistent deduplication rules:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>
              <strong>Phone Number Matching:</strong> Normalized PTA mobile (03XX) and landline (021/042/051) numbers are stripped of delimiters and compared. If identical, record is flagged duplicate.
            </li>
            <li>
              <strong>Normalized Name + City Matching:</strong> If public phone is unavailable, records matching alphanumeric business name and the same Pakistani city are treated as duplicates.
            </li>
            <li>
              <strong>Target Guarantee:</strong> Duplicates are never counted towards the user&rsquo;s requested lead target.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
