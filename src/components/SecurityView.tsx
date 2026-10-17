/**
 * AdPulse Click Fraud Protection & Domain Security (v3.5.1)
 */
import React, { useState } from 'react';
import { SecurityConfig } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Globe, 
  AlertTriangle, 
  Check, 
  Plus, 
  Trash2, 
  Zap, 
  Key, 
  Mail, 
  Info,
  Clock
} from 'lucide-react';

interface SecurityViewProps {
  security: SecurityConfig;
  onUpdateSecurity: (security: SecurityConfig) => void;
  onLockNow: () => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({
  security,
  onUpdateSecurity,
  onLockNow
}) => {
  const [passcode, setPasscode] = useState(security.masterPasscode);
  const [isProtected, setIsProtected] = useState(security.isPasscodeProtected);
  const [newDomain, setNewDomain] = useState('');
  const [allowedDomains, setAllowedDomains] = useState<string[]>(security.allowedDomains);
  const [blockUnlisted, setBlockUnlisted] = useState(security.blockUnlistedDomains);
  const [debounceSec, setDebounceSec] = useState(security.clickDebounceSeconds);
  const [filterBots, setFilterBots] = useState(security.filterBots);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanDomain || allowedDomains.includes(cleanDomain)) return;
    const updated = [...allowedDomains, cleanDomain];
    setAllowedDomains(updated);
    setNewDomain('');
  };

  const handleRemoveDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter((d) => d !== domain));
  };

  const handleSaveSettings = () => {
    onUpdateSecurity({
      ...security,
      isPasscodeProtected: isProtected,
      masterPasscode: passcode,
      allowedDomains,
      blockUnlistedDomains: blockUnlisted,
      clickDebounceSeconds: debounceSec,
      filterBots
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Security & Access Control
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Configure master passcode gating, domain origin whitelisting, and click fraud prevention for your ad network.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Saved!
            </span>
          )}
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all"
          >
            Save Security Rules
          </button>
        </div>
      </div>

      {/* Architecture Explainer Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400" />
          How Public vs Private Security Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 mt-3">
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg">
            <div className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] mb-1">
              1. Public Delivery Zone (No Login Needed)
            </div>
            The script <code className="text-slate-200 font-mono">ad-tag.js</code> and your public banner creatives are open to the web, so anyone visiting your website can load and view your affiliate ads seamlessly without seeing a login screen.
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg">
            <div className="font-bold text-amber-400 uppercase tracking-wider text-[11px] mb-1">
              2. Private Admin Dashboard (Passcode Protected)
            </div>
            This admin panel where you create affiliate links, configure campaigns, and see earnings is secured with a Master Passcode so visitors cannot view your revenues or modify your ads.
          </div>
        </div>
      </div>

      {/* Security Modules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: Master Passcode Gating */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">
                Master Admin Passcode
              </h3>
            </div>
            <button
              onClick={onLockNow}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock Session Now
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Require a PIN/passcode to view earnings, edit affiliate links, or alter targeting rules.
          </p>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={isProtected}
                onChange={(e) => setIsProtected(e.target.checked)}
                className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span className="font-medium">Enable Passcode Gating on Dashboard</span>
            </label>

            {isProtected && (
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <label className="block text-xs text-slate-300">
                  Set Master Passcode (PIN or Password)
                </label>
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="e.g. 2026 or SecretPass123"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  Remember this passcode. You will need it to unlock the dashboard whenever your session locks.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Module 2: Anti-Bot & Click Spam Protection */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">
              Anti-Fraud & Click Shield
            </h3>
          </div>

          <p className="text-xs text-slate-400">
            Prevent accidental multi-clicks and automated bot spam from threatening your affiliate network accounts.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="block text-slate-300 mb-1">
                Click Debounce Cooldown: <strong className="text-indigo-400 font-mono">{debounceSec}s</strong>
              </label>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={debounceSec}
                onChange={(e) => setDebounceSec(Number(e.target.value))}
                className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 block mt-1">
                Subsequent clicks on the same ad within {debounceSec} seconds will not duplicate analytics counts.
              </span>
            </div>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={filterBots}
                onChange={(e) => setFilterBots(e.target.checked)}
                className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span>Filter Headless Crawlers (Googlebot, Bingbot) from Impressions</span>
            </label>
          </div>
        </div>

        {/* Module 3: Domain Whitelisting (Origin Guard) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">
                Authorized Domain Whitelist (Hotlink Protection)
              </h3>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={blockUnlisted}
                onChange={(e) => setBlockUnlisted(e.target.checked)}
                className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span className="font-semibold text-rose-400">Enforce Whitelist Blocking</span>
            </label>
          </div>

          <p className="text-xs text-slate-400">
            Ensure your ad tag only renders on your own authorized websites. If an unauthorized domain tries to embed your script, execution is blocked.
          </p>

          {/* Add domain form */}
          <form onSubmit={handleAddDomain} className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="e.g. my-cool-website.com or blog.mybrand.org"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Domain
            </button>
          </form>

          {/* Domains Tag Cloud */}
          <div className="flex flex-wrap gap-2 pt-1">
            {allowedDomains.map((dom) => (
              <span
                key={dom}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-slate-800 border border-slate-700 text-slate-200"
              >
                <Globe className="w-3 h-3 text-sky-400" />
                {dom}
                <button
                  type="button"
                  onClick={() => handleRemoveDomain(dom)}
                  className="text-slate-500 hover:text-rose-400 p-0.5 ml-1"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Module 4: Cloudflare Pages Zero Trust Access Guide */}
        <div className="lg:col-span-2 bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">
              Cloudflare Pages Free Zero Trust Email PIN (Recommended for Full Host Lock)
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            If hosting on Cloudflare Pages, you can enable <strong>Cloudflare Access</strong> for free:
          </p>

          <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 font-sans leading-relaxed">
            <li>Go to <strong>Cloudflare Dashboard &gt; Zero Trust &gt; Access &gt; Applications</strong>.</li>
            <li>Add an application for your Pages URL (e.g. <code className="text-indigo-300 font-mono">adpulse.pages.dev</code>).</li>
            <li>Set a policy: <em>Include &gt; Emails &gt; <code className="text-white font-mono">chavanph7@gmail.com</code></em>.</li>
            <li>Now whenever you visit the dashboard, Cloudflare automatically sends a 6-digit one-time code to your email. Zero password database needed!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
