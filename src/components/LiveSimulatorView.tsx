/**
 * AdPulse Live Multi-Page & Hindi Persona Simulator (v3.5.1)
 */
import React, { useState, useEffect } from 'react';
import { AdCreative, AdEventLog, DeviceType, TargetingRule } from '../types';
import { selectAdForSlot, buildAffiliateUrl } from '../utils/adEngine';
import { 
  Play, 
  RotateCw, 
  ExternalLink, 
  MousePointer, 
  Eye, 
  Sliders, 
  Smartphone, 
  Monitor, 
  Laptop, 
  CheckCircle, 
  Sparkles,
  Info,
  Shuffle,
  Layers,
  Globe
} from 'lucide-react';

interface LiveSimulatorViewProps {
  campaigns: AdCreative[];
  targetingRules: TargetingRule[];
  onRecordEvent: (event: Omit<AdEventLog, 'id'>) => void;
  debounceSeconds: number;
}

export const LiveSimulatorView: React.FC<LiveSimulatorViewProps> = ({
  campaigns,
  targetingRules,
  onRecordEvent,
  debounceSeconds
}) => {
  const [visitorPersona, setVisitorPersona] = useState<string>('all');
  const [devicePreview, setDevicePreview] = useState<DeviceType>('desktop');
  const [autoAdsActive, setAutoAdsActive] = useState(true);
  const [randomizeMode, setRandomizeMode] = useState(true);
  const [multiArticleAds, setMultiArticleAds] = useState(true);
  const [rotationNonce, setRotationNonce] = useState(0);
  const [lastClickedAdId, setLastClickedAdId] = useState<string | null>(null);
  const [clickNotice, setClickNotice] = useState<string | null>(null);

  // Derive persona interests
  const personaInterests: Record<string, string[]> = {
    all: [],
    hindi_general: ['दैनिक सामान्य जीवनशैली', 'विचार विमर्श'], // Zero English match -> Proves random fallback!
    hindi_tech: ['तकनीक', 'मोबाइल', 'गैजेट', '5G'], // Matches bilingual Hindi keywords
    tech: ['hosting', 'cloud', 'developer', 'database'],
    security: ['vpn', 'security', 'privacy', 'encryption'],
    ecommerce: ['ecommerce', 'shop', 'marketing', 'sales'],
    productivity: ['saas', 'notes', 'docs', 'projects'],
    uncategorized: ['unknown_misc_topic_no_category']
  };

  const currentInterests = personaInterests[visitorPersona] || [];

  // Pick ads with rotation and anti-duplication
  const headerAd = selectAdForSlot({
    campaigns,
    format: '728x90',
    device: devicePreview,
    interests: currentInterests,
    targetingRules,
    randomize: randomizeMode
  });

  const excludeFor1 = headerAd ? [headerAd.id] : [];
  const inArticleAd1 = selectAdForSlot({
    campaigns,
    format: '300x250',
    device: devicePreview,
    interests: currentInterests,
    targetingRules,
    randomize: randomizeMode,
    excludeIds: excludeFor1
  });

  const excludeFor2 = [...excludeFor1, ...(inArticleAd1 ? [inArticleAd1.id] : [])];
  const inArticleAd2 = selectAdForSlot({
    campaigns,
    format: 'responsive_native',
    device: devicePreview,
    interests: currentInterests,
    targetingRules,
    randomize: randomizeMode,
    excludeIds: excludeFor2
  });

  const excludeForSidebar = [...excludeFor2, ...(inArticleAd2 ? [inArticleAd2.id] : [])];
  const sidebarAd = selectAdForSlot({
    campaigns,
    format: 'rectangle_300x250',
    device: devicePreview,
    interests: currentInterests,
    targetingRules,
    randomize: randomizeMode,
    excludeIds: excludeForSidebar
  });

  // Track impressions on mount or rotation
  useEffect(() => {
    if (headerAd) {
      onRecordEvent({
        adId: headerAd.id,
        adName: headerAd.name,
        eventType: 'impression',
        timestamp: new Date().toISOString(),
        device: devicePreview,
        category: headerAd.category,
        placementSlot: 'auto_header_banner',
        pageUrl: 'https://mysite.com/article/edge-architecture',
        revenue: 0
      });
    }

    if (autoAdsActive && inArticleAd1) {
      onRecordEvent({
        adId: inArticleAd1.id,
        adName: inArticleAd1.name,
        eventType: 'impression',
        timestamp: new Date().toISOString(),
        device: devicePreview,
        category: inArticleAd1.category,
        placementSlot: 'auto_in_article_1',
        pageUrl: 'https://mysite.com/article/edge-architecture',
        revenue: 0
      });
    }

    if (autoAdsActive && multiArticleAds && inArticleAd2) {
      onRecordEvent({
        adId: inArticleAd2.id,
        adName: inArticleAd2.name,
        eventType: 'impression',
        timestamp: new Date().toISOString(),
        device: devicePreview,
        category: inArticleAd2.category,
        placementSlot: 'auto_in_article_2',
        pageUrl: 'https://mysite.com/article/edge-architecture',
        revenue: 0
      });
    }

    if (sidebarAd) {
      onRecordEvent({
        adId: sidebarAd.id,
        adName: sidebarAd.name,
        eventType: 'impression',
        timestamp: new Date().toISOString(),
        device: devicePreview,
        category: sidebarAd.category,
        placementSlot: 'sidebar_fixed_300x250',
        pageUrl: 'https://mysite.com/article/edge-architecture',
        revenue: 0
      });
    }
  }, [rotationNonce, visitorPersona, devicePreview, autoAdsActive, randomizeMode, multiArticleAds]);

  const handleBannerClick = (ad: AdCreative, slot: string) => {
    const affiliateUrl = buildAffiliateUrl(ad, slot);
    
    // Anti-fraud click debounce check
    if (lastClickedAdId === ad.id) {
      setClickNotice(`Click recorded, but debounced within ${debounceSeconds}s cooldown.`);
      setTimeout(() => setClickNotice(null), 3000);
      window.open(affiliateUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setLastClickedAdId(ad.id);
    const revenueEarned = Number((ad.estimatedEPC * (0.8 + Math.random() * 0.4)).toFixed(2));

    onRecordEvent({
      adId: ad.id,
      adName: ad.name,
      eventType: 'click',
      timestamp: new Date().toISOString(),
      device: devicePreview,
      category: ad.category,
      placementSlot: slot,
      pageUrl: 'https://mysite.com/article/edge-architecture',
      revenue: revenueEarned
    });

    setClickNotice(`Verified click on "${ad.name}"! Earned +$${revenueEarned.toFixed(2)} commission.`);
    setTimeout(() => setClickNotice(null), 4000);

    window.open(affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Interactive Publisher Website Sandbox
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Test multi-in-article placements, random ad shuffle, and fallback behavior when no category matches.
        </p>
      </div>

      {/* Simulator Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Persona Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Simulate Visitor:</span>
          <select
            value={visitorPersona}
            onChange={(e) => setVisitorPersona(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            <option value="all">Random Visitor (All Active Ads)</option>
            <option value="hindi_general">हिन्दी ब्लॉग (No Matching Keyword → Random Ads)</option>
            <option value="hindi_tech">हिन्दी टेक व मोबाइल (Bilingual Keyword Match)</option>
            <option value="tech">Tech & Cloud Enthusiast</option>
            <option value="security">Privacy & Security Reader</option>
            <option value="ecommerce">eCommerce & Shopify Merchant</option>
            <option value="productivity">SaaS & Workspace User</option>
            <option value="uncategorized">Uncategorized Page (Test Fallback)</option>
          </select>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setDevicePreview('desktop')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
              devicePreview === 'desktop'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Desktop
          </button>
          <button
            onClick={() => setDevicePreview('tablet')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
              devicePreview === 'tablet'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            Tablet
          </button>
          <button
            onClick={() => setDevicePreview('mobile')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
              devicePreview === 'mobile'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile
          </button>
        </div>

        {/* Feature Toggles */}
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={randomizeMode}
              onChange={(e) => setRandomizeMode(e.target.checked)}
              className="rounded accent-indigo-500 w-3.5 h-3.5 cursor-pointer"
            />
            <Shuffle className="w-3 h-3 text-indigo-400" />
            Randomize Ads
          </label>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={multiArticleAds}
              onChange={(e) => setMultiArticleAds(e.target.checked)}
              className="rounded accent-amber-500 w-3.5 h-3.5 cursor-pointer"
            />
            <Layers className="w-3 h-3 text-amber-400" />
            Multi In-Article Ads
          </label>

          <button
            onClick={() => setRotationNonce((n) => n + 1)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            title="Rotate to next ads based on settings"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Rotate Ads
          </button>
        </div>
      </div>

      {/* Real-time Click Notification Banner */}
      {clickNotice && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{clickNotice}</span>
        </div>
      )}

      {/* Simulated Publisher Page Viewport */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Browser Mock Chrome */}
        <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="font-mono text-[11px] text-slate-400 ml-2">
              https://my-cool-website.com/posts/scaling-edge-architecture
            </span>
          </div>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
            AdPulse v3.0 Active · {campaigns.length} campaigns in inventory
          </span>
        </div>

        {/* Simulated Website Body */}
        <div className={`p-6 sm:p-8 transition-all mx-auto ${devicePreview === 'mobile' ? 'max-w-sm' : devicePreview === 'tablet' ? 'max-w-2xl' : 'max-w-5xl'}`}>
          {/* 1. TOP HEADER BANNER */}
          {autoAdsActive && headerAd && (
            <div className="mb-8">
              <div className="text-[10px] font-mono text-slate-500 mb-1 flex items-center justify-between">
                <span>[Auto Ad Injected: Header 728x90]</span>
                <span className="text-indigo-400">{randomizeMode ? 'Random Shuffle Mode' : `Weight: ${headerAd.weight}%`}</span>
              </div>

              <div
                onClick={() => handleBannerClick(headerAd, 'auto_header_banner')}
                style={{ borderLeft: `3px solid ${headerAd.accentColor || '#4F46E5'}` }}
                className="bg-slate-900 border border-slate-800 rounded-lg p-3 sm:p-4 cursor-pointer hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {headerAd.imageUrl && (
                    <img
                      src={headerAd.imageUrl}
                      alt=""
                      className="w-12 h-12 rounded-md object-cover shrink-0 border border-slate-800 bg-slate-950"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {headerAd.badgeText && (
                        <span
                          style={{ backgroundColor: headerAd.accentColor || '#4F46E5' }}
                          className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded uppercase"
                        >
                          {headerAd.badgeText}
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-300">{headerAd.advertiser}</span>
                      <span className="text-[10px] text-slate-500">Sponsored Affiliate</span>
                    </div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{headerAd.headline}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{headerAd.description}</p>
                    {headerAd.price && (
                      <div className="flex items-baseline gap-1.5 mt-1 font-mono text-[11px]">
                        <span className="text-emerald-400 font-bold">{headerAd.price}</span>
                        {headerAd.originalPrice && <span className="text-slate-500 line-through text-[10px]">{headerAd.originalPrice}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  style={{ backgroundColor: headerAd.accentColor || '#4F46E5' }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-md shrink-0 shadow-sm flex items-center gap-1 self-end sm:self-auto"
                >
                  {headerAd.callToAction} &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Article Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-5">
              <div className="space-y-2">
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                  {visitorPersona === 'hindi_general'
                    ? 'हिन्दी विचार व जीवनशैली (Zero Keyword Match → Random Ads Fallback)'
                    : visitorPersona === 'hindi_tech'
                    ? 'हिन्दी तकनीक व मोबाइल (Bilingual Keyword Mapping)'
                    : 'Technology & Cloud Architecture'}
                </span>
                <h2 className="text-2xl font-bold text-white leading-tight">
                  {visitorPersona === 'hindi_general'
                    ? 'दैनिक जीवन और कार्यशैली में संतुलन कैसे बनाएं'
                    : visitorPersona === 'hindi_tech'
                    ? 'स्मार्टफोन और 5G तकनीक: भारत में नए डिजिटल बदलाव'
                    : 'Scaling High-Traffic Web Services with Edge Computing'}
                </h2>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>{visitorPersona.startsWith('hindi') ? 'राहुल शर्मा' : 'Sarah Jenkins'}</span>
                  <span>·</span>
                  <span>{visitorPersona.startsWith('hindi') ? 'आज अपडेट हुआ' : 'Updated Today'}</span>
                  <span>·</span>
                  <span>{visitorPersona.startsWith('hindi') ? '४ मिनट का पठन' : '5 min read'}</span>
                </div>
              </div>

              {visitorPersona === 'hindi_general' && (
                <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-lg text-xs text-indigo-200">
                  <span className="font-bold text-indigo-300">Automatic Fallback Active: </span>
                  This simulated Hindi page has zero matching English keywords. AdPulse automatically rotated and displayed random user ads from your active campaigns!
                </div>
              )}

              <p className="text-sm text-slate-300 leading-relaxed">
                {visitorPersona === 'hindi_general'
                  ? 'आज की भागदौड़ भरी जिंदगी में व्यक्तिगत जीवन और काम के बीच सही संतुलन बनाए रखना हर व्यक्ति के लिए जरूरी हो गया है। नियमित दिनचर्या और समय प्रबंधन से मानसिक शांति मिलती है।'
                  : visitorPersona === 'hindi_tech'
                  ? 'भारत में 5G नेटवर्क के तेजी से विस्तार के साथ नए स्मार्टफोन और हाई-स्पीड इंटरनेट सेवाओं ने डिजिटल दुनिया को पूरी तरह बदल दिया है।'
                  : 'Modern web applications require instantaneous responsiveness regardless of geographic user location. By shifting compute workloads from centralized cloud regions to distributed edge points of presence, latency decreases exponentially.'}
              </p>

              {/* 2. AUTO AD / IN-ARTICLE SLOT #1 (Product Showcase Card) */}
              {autoAdsActive && inArticleAd1 && (
                <div className="my-6 p-4 rounded-xl border border-dashed border-indigo-500/40 bg-slate-900/60 relative">
                  <span className="text-[10px] font-mono text-indigo-400 mb-2 flex items-center justify-between">
                    <span>[Auto Ad Injected: In-Article Slot #1 · 300x250 Showcase Card]</span>
                    <span className="text-slate-400">{inArticleAd1.category}</span>
                  </span>

                  <div
                    onClick={() => handleBannerClick(inArticleAd1, 'auto_in_article_1')}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer hover:border-indigo-500/50 transition-all flex flex-col justify-between max-w-sm mx-auto"
                  >
                    <div>
                      {inArticleAd1.imageUrl && (
                        <div className="h-32 w-full rounded-md overflow-hidden bg-slate-900 border border-slate-800 mb-2.5">
                          <img
                            src={inArticleAd1.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLElement).parentElement!.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400">{inArticleAd1.advertiser}</span>
                        {inArticleAd1.badgeText && (
                          <span
                            style={{ backgroundColor: inArticleAd1.accentColor || '#4F46E5' }}
                            className="text-[9px] font-bold text-white px-2 py-0.5 rounded uppercase"
                          >
                            {inArticleAd1.badgeText}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{inArticleAd1.headline}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-2">{inArticleAd1.description}</p>
                      {inArticleAd1.price && (
                        <div className="flex items-baseline gap-1.5 mb-2 font-mono text-xs">
                          <span className="text-emerald-400 font-bold">{inArticleAd1.price}</span>
                          {inArticleAd1.originalPrice && <span className="text-slate-500 line-through text-[10px]">{inArticleAd1.originalPrice}</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] font-mono text-slate-500">{inArticleAd1.displayUrl}</span>
                      <button
                        type="button"
                        style={{ backgroundColor: inArticleAd1.accentColor || '#4F46E5' }}
                        className="px-3 py-1 text-xs font-semibold text-white rounded-md shadow-sm"
                      >
                        {inArticleAd1.callToAction} &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-slate-300 leading-relaxed">
                {visitorPersona === 'hindi_general'
                  ? 'दिन की शुरुआत सकारात्मक विचारों और ध्यान के साथ करने से पूरे दिन की ऊर्जा बनी रहती है। काम के बीच छोटे-छोटे ब्रेक लेना भी उत्पादकता और ताजगी बनाए रखने में बहुत मददगार साबित होता है।'
                  : visitorPersona === 'hindi_tech'
                  ? 'आर्टिफिशियल इंटेलिजेंस (AI) और आधुनिक 4nm/3nm चिपसेट के साथ नए स्मार्टफोन अब ज्यादा पावरफुल, गेमिंग-फ्रेंडली और लंबी बैटरी बैकअप देने में सक्षम हो गए हैं।'
                  : 'Security policies and SSL handshakes executed at the edge eliminate the need for costly roundtrips back to origin servers. Integrating intelligent caching and automatic failover provides maximum uptime during unexpected traffic surges.'}
              </p>

              <p className="text-sm text-slate-300 leading-relaxed">
                {visitorPersona === 'hindi_general'
                  ? 'परिवार और अपने शौक के लिए समय निकालना जीवन में नया उत्साह भरता है। संतुलित खान-पान और पर्याप्त नींद मानसिक और शारीरिक स्वास्थ्य को दुरुस्त रखने की सबसे मजबूत नींव हैं।'
                  : visitorPersona === 'hindi_tech'
                  ? 'ई-कॉमर्स और ऑनलाइन शॉपिंग से लोग घर बैठे नए गैजेट्स, इलेक्ट्रॉनिक्स और टेक टूल्स को बेहतरीन डील्स और डिस्काउंट ऑफर्स के साथ आसानी से खरीद रहे हैं।'
                  : 'Database queries are optimized by routing read replicas close to end users while routing mutations back to the primary instance with zero serialization latency.'}
              </p>

              {/* 3. AUTO AD / IN-ARTICLE SLOT #2 (Multi In-Article Placement) */}
              {autoAdsActive && multiArticleAds && inArticleAd2 && (
                <div className="my-6 p-4 rounded-xl border border-dashed border-amber-500/40 bg-slate-900/60 relative">
                  <span className="text-[10px] font-mono text-amber-400 mb-2 flex items-center justify-between">
                    <span>[Auto Ad Injected: In-Article Slot #2 · Responsive In-Feed Banner]</span>
                    <span className="text-slate-400">{inArticleAd2.category}</span>
                  </span>

                  <div
                    onClick={() => handleBannerClick(inArticleAd2, 'auto_in_article_2')}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer hover:border-amber-500/50 transition-all flex items-center justify-between gap-3"
                  >
                    {inArticleAd2.imageUrl && (
                      <img
                        src={inArticleAd2.imageUrl}
                        alt=""
                        className="w-14 h-14 rounded-md object-cover shrink-0 border border-slate-800"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400">{inArticleAd2.advertiser}</span>
                        {inArticleAd2.badgeText && (
                          <span
                            style={{ backgroundColor: inArticleAd2.accentColor || '#4F46E5' }}
                            className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded uppercase"
                          >
                            {inArticleAd2.badgeText}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{inArticleAd2.headline}</h4>
                      {inArticleAd2.price && (
                        <div className="flex items-baseline gap-1 mt-0.5 font-mono text-xs">
                          <span className="text-emerald-400 font-bold">{inArticleAd2.price}</span>
                          {inArticleAd2.originalPrice && <span className="text-slate-500 line-through text-[10px]">{inArticleAd2.originalPrice}</span>}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      style={{ backgroundColor: inArticleAd2.accentColor || '#4F46E5' }}
                      className="px-3 py-1.5 text-xs font-semibold text-white rounded-md shrink-0 shadow-sm"
                    >
                      {inArticleAd2.callToAction} &rarr;
                    </button>
                  </div>
                </div>
              )}

              <p className="text-sm text-slate-300 leading-relaxed">
                By monitoring real-time Core Web Vitals alongside conversion metrics, engineering teams can maintain peak performance while generating consistent monetization revenue.
              </p>
            </div>

            {/* Sidebar with Manual Ad Slot */}
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  About Publisher
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  TechByte Journal delivers real-world performance benchmarks for developers and tech teams.
                </p>
              </div>

              {/* 4. FIXED SIDEBAR AD SLOT */}
              {sidebarAd && (
                <div className="relative">
                  <div className="text-[10px] font-mono text-slate-500 mb-1 flex items-center justify-between">
                    <span>&lt;ins class="adpulse-slot"&gt;</span>
                    <span className="text-slate-400">Sidebar</span>
                  </div>

                  <div
                    onClick={() => handleBannerClick(sidebarAd, 'sidebar_fixed_300x250')}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-all flex flex-col justify-between min-h-[220px]"
                  >
                    <div>
                      {sidebarAd.imageUrl && (
                        <div className="h-24 w-full rounded-md overflow-hidden bg-slate-950 border border-slate-800 mb-2.5">
                          <img
                            src={sidebarAd.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLElement).parentElement!.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-300">{sidebarAd.advertiser}</span>
                        <span className="text-[10px] text-slate-500">Sponsored</span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">{sidebarAd.headline}</h4>
                      {sidebarAd.price && (
                        <div className="flex items-baseline gap-1 font-mono text-xs mb-2">
                          <span className="text-emerald-400 font-bold">{sidebarAd.price}</span>
                          {sidebarAd.originalPrice && <span className="text-slate-500 line-through text-[10px]">{sidebarAd.originalPrice}</span>}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      style={{ backgroundColor: sidebarAd.accentColor || '#4F46E5' }}
                      className="w-full py-1.5 text-xs font-semibold text-white rounded-md mt-2 shadow-sm"
                    >
                      {sidebarAd.callToAction} &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
