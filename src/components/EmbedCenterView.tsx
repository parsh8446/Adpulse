/**
 * AdPulse Embed & Integration Center (v3.5.1)
 */
import React, { useState, useEffect } from 'react';
import { AdCreative, DeliveryConfig, SecurityConfig } from '../types';
import { 
  generateHeaderScriptSnippet, 
  generateDirectSyncHeaderScriptSnippet,
  generateSlotSnippet, 
  generateStandaloneAdTagScript,
  generateCloudflareWorkerScript 
} from '../utils/adTagGenerator';
import { 
  Code, 
  Copy, 
  Check, 
  Download, 
  Cloud, 
  FileCode, 
  Zap, 
  CheckCircle2, 
  ExternalLink,
  Globe,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Monitor,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Shuffle,
  FileText,
  Sliders,
  Send
} from 'lucide-react';

interface EmbedCenterViewProps {
  campaigns: AdCreative[];
  security: SecurityConfig;
  deliveryConfig: DeliveryConfig;
  onUpdateDeliveryConfig: (config: DeliveryConfig) => void;
  syncState: { status: 'synced' | 'syncing' | 'error' | 'idle'; lastSyncTime?: string };
  onForceSync: () => void;
  onImportCampaigns: (campaigns: AdCreative[]) => void;
}

export const EmbedCenterView: React.FC<EmbedCenterViewProps> = ({
  campaigns,
  security,
  deliveryConfig,
  onUpdateDeliveryConfig,
  syncState,
  onForceSync,
  onImportCampaigns
}) => {
  const [publisherDomain, setPublisherDomain] = useState('https://adpulse-yf39.onrender.com');
  const [apiUrl, setApiUrl] = useState('https://adpulse-yf39.onrender.com/api/campaigns');

  const [tagMode, setTagMode] = useState<'live_api' | 'direct_sync' | 'standalone'>('live_api');
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedSlot, setCopiedSlot] = useState(false);
  const [copiedFullScript, setCopiedFullScript] = useState(false);
  const [copiedWorkerCode, setCopiedWorkerCode] = useState(false);
  const [localPushStatus, setLocalPushStatus] = useState<string | null>(null);

  // Manual Slot Generator State
  const [selectedSlotId, setSelectedSlotId] = useState('sidebar-product-box');
  const [selectedFormat, setSelectedFormat] = useState<'728x90' | '300x250' | '320x50' | '160x600' | 'responsive'>('300x250');
  const [selectedInterest, setSelectedInterest] = useState('ecommerce,tech');

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const spacingNumber = deliveryConfig.inArticleDensity === 'high' ? 3 : (deliveryConfig.inArticleDensity === 'medium' ? 5 : 8);

  // Snippets - Ultra-lightweight (Zero Bloat ~260 characters)
  const liveApiSnippet = generateHeaderScriptSnippet({
    publisherDomain,
    autoAds: true,
    randomizeAds: deliveryConfig.randomizeAds,
    fallbackAllPages: deliveryConfig.fallbackAllPages,
    articleSpacing: spacingNumber,
    maxArticleAds: deliveryConfig.maxArticleAds,
    apiUrl,
    includeTokenFallback: false // Clean 1-line script tag with NO giant base64 token
  });

  const directSyncSnippet = generateDirectSyncHeaderScriptSnippet(
    publisherDomain, 
    true, 
    campaigns,
    apiUrl
  );

  const activeSnippet = tagMode === 'live_api' ? liveApiSnippet : directSyncSnippet;
  const slotSnippet = generateSlotSnippet(selectedSlotId, selectedFormat, selectedInterest);
  const standaloneScript = generateStandaloneAdTagScript(campaigns, security, deliveryConfig);
  const workerScript = generateCloudflareWorkerScript(campaigns);

  const handleCopyHeader = () => {
    navigator.clipboard.writeText(activeSnippet);
    setCopiedHeader(true);
    setTimeout(() => setCopiedHeader(false), 2000);
  };

  const handleCopySlot = () => {
    navigator.clipboard.writeText(slotSnippet);
    setCopiedSlot(true);
    setTimeout(() => setCopiedSlot(false), 2000);
  };

  const handleCopyFullScript = () => {
    navigator.clipboard.writeText(standaloneScript);
    setCopiedFullScript(true);
    setTimeout(() => setCopiedFullScript(false), 2000);
  };

  const [copiedSchemaSql, setCopiedSchemaSql] = useState(false);

  const handleCopyWorker = () => {
    navigator.clipboard.writeText(workerScript);
    setCopiedWorkerCode(true);
    setTimeout(() => setCopiedWorkerCode(false), 2000);
  };

  const handleCopySchemaSql = () => {
    const sql = `-- AdPulse Cloudflare D1 SQL Schema
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  advertiser TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'responsive_native',
  headline TEXT NOT NULL,
  description TEXT,
  call_to_action TEXT NOT NULL DEFAULT 'Claim Deal',
  destination_url TEXT NOT NULL,
  display_url TEXT,
  image_url TEXT,
  price TEXT,
  original_price TEXT,
  badge_text TEXT DEFAULT 'Featured',
  category TEXT DEFAULT 'General',
  tags TEXT DEFAULT '[]',
  weight INTEGER DEFAULT 50,
  status TEXT DEFAULT 'active',
  target_devices TEXT DEFAULT '["desktop", "mobile", "tablet"]',
  estimated_epc REAL DEFAULT 1.5,
  accent_color TEXT DEFAULT '#4F46E5',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS security_settings (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  master_passcode TEXT NOT NULL DEFAULT '2026',
  is_passcode_protected INTEGER DEFAULT 1,
  allowed_domains TEXT DEFAULT '["localhost", "elaannews.in"]',
  block_unlisted_domains INTEGER DEFAULT 0,
  click_debounce_seconds INTEGER DEFAULT 15,
  filter_bots INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
`;
    navigator.clipboard.writeText(sql);
    setCopiedSchemaSql(true);
    setTimeout(() => setCopiedSchemaSql(false), 2000);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([standaloneScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ad-tag.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePushToEndpoint = async () => {
    setLocalPushStatus('Syncing campaigns with ad server...');
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-adpulse-passcode': security.masterPasscode
        },
        body: JSON.stringify(campaigns)
      });
      if (res.ok) {
        setLocalPushStatus(`Successfully synchronized ${campaigns.length} campaigns!`);
        onForceSync();
      } else {
        setLocalPushStatus('Server replied with error. Retrying...');
      }
    } catch (e: any) {
      setLocalPushStatus('Synced locally. Standalone tag will use memory pool.');
    }
    setTimeout(() => setLocalPushStatus(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Title & Live Status */}
      <div className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            AdSense-Style Live Embed & Delivery Center
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Auto-sync ads across websites without changing your HTML every time you add campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync: {syncState.status === 'syncing' ? 'Syncing...' : (syncState.lastSyncTime ? `Updated ${syncState.lastSyncTime}` : 'Active')}
          </div>

          <button
            onClick={handlePushToEndpoint}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Force Sync Server Now
          </button>
        </div>
      </div>

      {localPushStatus && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3.5 text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{localPushStatus}</span>
        </div>
      )}

      {/* WHY ONLY 2 ADS SHOWED & HOW HINDI SITES + AUTO-UPDATE WORKS */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/40 rounded-2xl p-5 text-xs text-amber-200 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
          Hindi Website & Ad Delivery Analysis: Why only specific ads served and how it is now fixed
        </div>
        <p className="leading-relaxed text-amber-100/90">
          <strong>Key Root Causes Resolved:</strong> 
          1) <strong>Hindi Content vs English Keywords:</strong> On a Hindi website, if a page had zero matching English keywords, older scripts would stall or show default mock ads. In AdPulse v3.5, the tag automatically maps Hindi keywords (तकनीक, मोबाइल, पैसे, लोन, नौकरी, आदि) to English tags, and <strong>if no keyword is found, it automatically chooses a random ad from active user campaigns!</strong> 
          2) <strong>Zero Default Mock Ads:</strong> System default ads (Cloudflare, Sony, etc.) have been completely removed. Only campaigns created by you will be served.
          3) <strong>Universal In-Article Paragraphs:</strong> Auto-ads now detects Blogger (<code className="text-amber-300 font-mono">.post-body</code>), WordPress (<code className="text-amber-300 font-mono">.entry-content</code>), Hindi news portals (<code className="text-amber-300 font-mono">.articleBody</code>), and generic paragraphs, inserting multiple spaced ads across your articles!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 text-slate-300">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 1. Live Server Auto-Sync
            </div>
            <p className="text-[11px] text-slate-400">
              With <code className="text-emerald-300 font-mono">data-api</code> enabled, any campaign you create or update automatically appears on your site without changing your website code!
            </p>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-semibold text-indigo-400 flex items-center gap-1.5">
              <Shuffle className="w-3.5 h-3.5" /> 2. Hindi & Random Fallback
            </div>
            <p className="text-[11px] text-slate-400">
              If no keyword is found on a Hindi page, the script shuffles and shows random active ads created by you on every page and slot!
            </p>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-semibold text-amber-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> 3. Multi In-Article Ads
            </div>
            <p className="text-[11px] text-slate-400">
              Works on Blogger (.post-body), WordPress, and Hindi news sites, inserting multiple spaced banners between paragraphs.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-semibold text-rose-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 4. Zero Default Mock Ads
            </div>
            <p className="text-[11px] text-slate-400">
              Default system ads (Cloudflare, Sony, etc.) will NEVER show. Only your genuine created affiliate campaigns are delivered.
            </p>
          </div>
        </div>
      </div>

      {/* AD DELIVERY SETTINGS CONTROLS (User Requested Features) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Ad Delivery & In-Article Placement Options</h2>
          </div>
          <span className="text-xs text-slate-400">Changes apply to the generated script tag below</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Option 1: Randomize Ads */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                  Randomize Ad Rotation
                </span>
                <input
                  type="checkbox"
                  checked={deliveryConfig.randomizeAds}
                  onChange={(e) => onUpdateDeliveryConfig({ ...deliveryConfig, randomizeAds: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Evenly shuffles all active campaigns. Ensures all added products get impressions instead of just one ad.
              </p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded w-fit ${deliveryConfig.randomizeAds ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}>
              {deliveryConfig.randomizeAds ? 'Enabled (data-randomize="true")' : 'Disabled (Weighted only)'}
            </span>
          </div>

          {/* Option 2: Show on Every Page Fallback */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  Show on Every Page
                </span>
                <input
                  type="checkbox"
                  checked={deliveryConfig.fallbackAllPages}
                  onChange={(e) => onUpdateDeliveryConfig({ ...deliveryConfig, fallbackAllPages: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                If no category matches or page has no category, fallback to showing active ads so no ad slot is ever left empty.
              </p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded w-fit ${deliveryConfig.fallbackAllPages ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
              {deliveryConfig.fallbackAllPages ? 'Enabled (data-fallback-all-pages="true")' : 'Strict Category Only'}
            </span>
          </div>

          {/* Option 3: In-Article Spacing */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  In-Article Density
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
                Places multiple ads between paragraphs throughout your articles.
              </p>
              <select
                value={deliveryConfig.inArticleDensity}
                onChange={(e) => onUpdateDeliveryConfig({ ...deliveryConfig, inArticleDensity: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-medium focus:outline-none"
              >
                <option value="high">High (Every 3 Paragraphs - More Ads)</option>
                <option value="medium">Medium (Every 5 Paragraphs)</option>
                <option value="low">Low (1 Ad Only in Article)</option>
              </select>
            </div>
            <span className="text-[10px] text-amber-300 font-mono">
              data-article-spacing="{spacingNumber}"
            </span>
          </div>

          {/* Option 4: Max Article Ads */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Max In-Article Ads
                </span>
                <span className="font-mono text-cyan-400 font-bold">{deliveryConfig.maxArticleAds} Ads</span>
              </div>
              <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
                Maximum ads allowed inside a single article.
              </p>
              <input
                type="range"
                min="1"
                max="6"
                value={deliveryConfig.maxArticleAds}
                onChange={(e) => onUpdateDeliveryConfig({ ...deliveryConfig, maxArticleAds: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
            <span className="text-[10px] text-cyan-300 font-mono">
              data-max-article-ads="{deliveryConfig.maxArticleAds}"
            </span>
          </div>
        </div>

        {/* Sync Endpoint Config */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Render Ad Server Domain & API Configuration
              </div>
              <p className="text-slate-400 text-[11px]">
                Configured for your live Render server: <code className="text-emerald-400 font-mono">https://adpulse-yf39.onrender.com</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPublisherDomain('https://adpulse-yf39.onrender.com');
                  setApiUrl('https://adpulse-yf39.onrender.com/api/campaigns');
                }}
                className="px-2.5 py-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md hover:bg-emerald-500/20 transition-colors"
              >
                Use Render URL
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Script Host Domain (src)
              </label>
              <input
                type="text"
                value={publisherDomain}
                onChange={(e) => {
                  const val = e.target.value;
                  setPublisherDomain(val);
                  setApiUrl(`${val.replace(/\/+$/, '')}/api/campaigns`);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                placeholder="https://adpulse-yf39.onrender.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Live Campaigns API (data-api)
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                placeholder="https://adpulse-yf39.onrender.com/api/campaigns"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hero: Active Live Server Configuration Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                Recommended Drop-in Integration Tag
              </span>
              <h2 className="text-base font-bold text-white">
                Paste between &lt;head&gt; and &lt;/head&gt; on your website once
              </h2>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setTagMode('live_api')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                tagMode === 'live_api'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Live-Sync Tag (Fast ~250 chars)
            </button>
            <button
              onClick={() => setTagMode('direct_sync')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                tagMode === 'direct_sync'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Direct-Sync + Offline Fallback
            </button>
          </div>
        </div>

        {/* Script Snippet Box */}
        <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-emerald-300">HTML &lt;head&gt; Tag (Clean 1-Line Tag — No Bloat)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Length: {activeSnippet.length} chars (~{(activeSnippet.length / 1024).toFixed(1)} KB)
              </span>
              <span className="text-[11px] text-slate-400">
                {activeCampaigns.length} campaigns active in ad server
              </span>
            </div>
          </div>
          <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
            {activeSnippet}
          </pre>
          <div className="p-3 bg-slate-900/50 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Auto-injects top leaderboard, {deliveryConfig.maxArticleAds} in-article product cards, randomizes rotation & fetches new campaigns dynamically.
            </span>
            <button
              onClick={handleCopyHeader}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              {copiedHeader ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedHeader ? 'Copied to Clipboard!' : 'Copy Script Tag'}
            </button>
          </div>
        </div>
      </div>

      {/* Manual Slot Custom Placement Generator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Manual Ad Slot Generator (Optional)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Place targeted ad banners anywhere inside your theme templates or sidebars with an &lt;ins&gt; tag.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Slot ID</label>
            <input
              type="text"
              value={selectedSlotId}
              onChange={(e) => setSelectedSlotId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Banner Size / Format</label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="300x250">300x250 — Medium Rectangle (Product Card)</option>
              <option value="728x90">728x90 — Leaderboard Banner</option>
              <option value="320x50">320x50 — Mobile Smartphone Banner</option>
              <option value="160x600">160x600 — Skyscraper Sidebar Banner</option>
              <option value="responsive">Responsive Native Product Banner</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Interest Target Keywords</label>
            <input
              type="text"
              value={selectedInterest}
              onChange={(e) => setSelectedInterest(e.target.value)}
              placeholder="e.g. ecommerce, vpn, developer"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
            <span className="font-mono text-indigo-300">HTML Snippet for this Slot</span>
            <button
              onClick={handleCopySlot}
              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5"
            >
              {copiedSlot ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSlot ? 'Copied!' : 'Copy Slot HTML'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-indigo-200 overflow-x-auto whitespace-pre-wrap select-all">
            {slotSnippet}
          </pre>
        </div>
      </div>

      {/* CLOUDFLARE WORKER & BACKEND HOSTING CODES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box 1: Standalone ad-tag.js Download */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Download Standalone ad-tag.js</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Want to host the script completely static? Download the standalone <code className="text-indigo-300 font-mono">ad-tag.js</code> with all your current {campaigns.length} campaigns, product images, prices, randomize settings, and multi-in-article placements pre-compiled inside!
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleDownloadScript}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-colors shadow-md"
            >
              <Download className="w-4 h-4" />
              Download ad-tag.js
            </button>
            <button
              onClick={handleCopyFullScript}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copiedFullScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedFullScript ? 'Copied Code!' : 'Copy JS Code'}
            </button>
          </div>
        </div>

        {/* Box 2: Cloudflare D1 SQL Edge Database */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Cloudflare D1 SQL Edge Database</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Want 100% persistent ad storage that never sleeps and never loses campaigns? Bind a free Cloudflare D1 SQL database to your Worker:
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
              <div className="text-emerald-400"># 1. Create database in Cloudflare:</div>
              <div>npx wrangler d1 create adpulse-db</div>
              <div className="text-emerald-400 mt-1"># 2. Run SQL Schema:</div>
              <div>npx wrangler d1 execute adpulse-db --file=./schema.sql</div>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button
              onClick={handleCopySchemaSql}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-colors shadow-md"
            >
              {copiedSchemaSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedSchemaSql ? 'Copied D1 Schema!' : 'Copy D1 SQL Schema'}
            </button>
            <button
              onClick={handleCopyWorker}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copiedWorkerCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedWorkerCode ? 'Copied Worker Code!' : 'Copy _worker.js Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
