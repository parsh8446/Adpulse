/**
 * AdPulse Ad Tag & Cloudflare Worker Generator (v3.5.1)
 */
import { AdCreative, DeliveryConfig, SecurityConfig } from '../types';

/**
 * Encodes active campaigns into a safe Base64 token for instant zero-redeploy syncing
 */
export function encodeCampaignsToken(campaigns: AdCreative[]): string {
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const minimal = activeCampaigns.map((c) => ({
    id: c.id,
    name: c.name,
    advertiser: c.advertiser,
    format: c.format,
    headline: c.headline,
    description: c.description,
    callToAction: c.callToAction,
    destinationUrl: c.destinationUrl,
    // If imageUrl is an enormous base64 data URI (> 500 chars), omit from the embedded HTML token
    // The live script will fetch full rich images cleanly via the API endpoint
    imageUrl: c.imageUrl && c.imageUrl.startsWith('data:') && c.imageUrl.length > 500 ? undefined : c.imageUrl,
    price: c.price,
    originalPrice: c.originalPrice,
    badgeText: c.badgeText,
    category: c.category,
    tags: c.tags,
    weight: c.weight,
    accentColor: c.accentColor,
    targetDevices: c.targetDevices
  }));
  const jsonStr = JSON.stringify(minimal);
  try {
    if (typeof window !== 'undefined') {
      return window.btoa(unescape(encodeURIComponent(jsonStr)));
    }
    return btoa(unescape(encodeURIComponent(jsonStr)));
  } catch {
    return jsonStr;
  }
}

export interface HeaderSnippetOptions {
  publisherDomain?: string;
  autoAds?: boolean;
  randomizeAds?: boolean;
  fallbackAllPages?: boolean;
  articleSpacing?: number;
  maxArticleAds?: number;
  apiUrl?: string;
  includeTokenFallback?: boolean;
  campaigns?: AdCreative[];
}

/**
 * Generates the clean AdSense-style `<script>` tag for the website `<head>`
 * Configured with live API sync, random ad rotation, category fallback, and multi-in-article ads.
 */
export function generateHeaderScriptSnippet(options: HeaderSnippetOptions = {}): string {
  const domain = (options.publisherDomain || 'https://adpulse-yf39.onrender.com').replace(/\/+$/, '');
  const autoAds = options.autoAds !== false;
  const randomize = options.randomizeAds !== false;
  const fallbackAll = options.fallbackAllPages !== false;
  const spacing = options.articleSpacing || 3;
  const maxAds = options.maxArticleAds || 4;
  const apiUrl = options.apiUrl ? options.apiUrl.trim() : `${domain}/api/campaigns`;

  const attrs: string[] = [
    `async`,
    `src="${domain}/ad-tag.js"`,
    `data-auto-ads="${autoAds}"`,
    `data-randomize="${randomize}"`,
    `data-fallback-all-pages="${fallbackAll}"`,
    `data-article-spacing="${spacing}"`,
    `data-max-article-ads="${maxAds}"`
  ];

  if (apiUrl) {
    attrs.push(`data-api="${apiUrl}"`);
  }

  // Only embed campaigns token if explicitly requested (e.g. offline fallback)
  // Keeps the production header tag ultra-lightweight (~250 bytes) instead of bloated MBs
  const shouldEmbedToken = options.includeTokenFallback === true;
  if (shouldEmbedToken && options.campaigns && options.campaigns.length > 0) {
    const token = encodeCampaignsToken(options.campaigns);
    attrs.push(`data-campaigns="${token}"`);
  }

  return `<!-- AdPulse Ad Delivery Tag (Bilingual Hindi/English & Auto-Randomize Fallback) -->
<script ${attrs.join(' ')}></script>`;
}

/**
 * Generates the Direct-Sync `<script>` tag that embeds dashboard campaigns as immediate fallback
 * while keeping live background API sync enabled.
 */
export function generateDirectSyncHeaderScriptSnippet(
  publisherDomain: string = 'https://adpulse1.chavanph7.workers.dev',
  autoAds: boolean = true,
  campaigns: AdCreative[] = [],
  apiUrl?: string
): string {
  return generateHeaderScriptSnippet({
    publisherDomain,
    autoAds,
    randomizeAds: true,
    fallbackAllPages: true,
    articleSpacing: 3,
    maxArticleAds: 4,
    apiUrl,
    includeTokenFallback: true,
    campaigns
  });
}

/**
 * Generates the manual `<ins>` tag for custom ad placement slots
 */
export function generateSlotSnippet(
  slotId: string = 'header-leaderboard',
  format: '728x90' | '300x250' | '320x50' | '160x600' | 'responsive' = '728x90',
  interestKeyword?: string
): string {
  const interestAttr = interestKeyword ? ` data-ad-interest="${interestKeyword}"` : '';
  return `<!-- AdPulse Placement: ${slotId} (${format}) -->
<ins class="adpulse-slot"
     data-ad-slot="${slotId}"
     data-ad-format="${format}"${interestAttr}>
</ins>`;
}

/**
 * Generates Cloudflare Worker script code that turns adpulse1.chavanph7.workers.dev
 * into a complete ad server that serves:
 * 1. GET /ad-tag.js (live script with bilingual Hindi support & zero mock ads)
 * 2. GET /api/campaigns (returns live JSON of user campaigns)
 * 3. POST /api/campaigns (syncs new campaigns from dashboard)
 */
export function generateCloudflareWorkerScript(campaigns: AdCreative[]): string {
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const campaignsJson = JSON.stringify(activeCampaigns, null, 2);

  return `/**
 * AdPulse Cloudflare Worker Engine (v3.5)
 * Deploy this code to your Cloudflare Worker (e.g. adpulse1.chavanph7.workers.dev).
 * It serves:
 * - GET /ad-tag.js: The ad delivery script with Hindi support & random fallback
 * - GET /api/campaigns: Live JSON of your active campaigns
 * - POST /api/campaigns: Sync new campaigns from AdPulse dashboard
 */

let USER_CAMPAIGNS = ${campaignsJson};

const AD_TAG_CODE = \`(function() {
  'use strict';
  var DEFAULT_CAMPAIGNS = [];
  var currentScript = document.currentScript || document.querySelector('script[src*="ad-tag.js"]');
  var autoAdsEnabled = currentScript ? currentScript.getAttribute('data-auto-ads') !== 'false' : true;
  var randomizeEnabled = currentScript ? currentScript.getAttribute('data-randomize') !== 'false' : true;
  var articleSpacing = currentScript ? parseInt(currentScript.getAttribute('data-article-spacing') || '3', 10) : 3;
  var maxArticleAds = currentScript ? parseInt(currentScript.getAttribute('data-max-article-ads') || '4', 10) : 4;
  var customApiUrl = currentScript ? currentScript.getAttribute('data-api') : null;
  var shownAdIdsOnPage = {};

  var cachedCampaigns = null;
  try {
    var raw = sessionStorage.getItem('adpulse_cached_campaigns');
    if (raw) { var p = JSON.parse(raw); if (Array.isArray(p) && p.length > 0) cachedCampaigns = p; }
  } catch (e) {}

  var scriptCampaignsAttr = currentScript ? currentScript.getAttribute('data-campaigns') : null;
  var tagEmbedded = null;
  if (scriptCampaignsAttr) {
    try {
      var dec = scriptCampaignsAttr.startsWith('[') ? scriptCampaignsAttr : decodeURIComponent(escape(atob(scriptCampaignsAttr)));
      var pj = JSON.parse(dec);
      if (Array.isArray(pj) && pj.length > 0) tagEmbedded = pj;
    } catch(e) {}
  }

  var CAMPAIGNS = cachedCampaigns || tagEmbedded || (window.AD_PULSE_CAMPAIGNS && window.AD_PULSE_CAMPAIGNS.length > 0 ? window.AD_PULSE_CAMPAIGNS : DEFAULT_CAMPAIGNS);

  function getApi() {
    if (customApiUrl) return customApiUrl;
    if (currentScript && currentScript.src) {
      try { return new URL(currentScript.src).origin + '/api/campaigns'; } catch(e) {}
    }
    return '/api/campaigns';
  }

  function syncCampaigns() {
    if (typeof fetch === 'undefined') return;
    if (currentScript && currentScript.getAttribute('data-sync') === 'false') return;
    var ep = getApi();
    var cb = (ep.indexOf('?') === -1 ? '?' : '&') + '_t=' + Date.now();
    function applyData(d) {
      if (Array.isArray(d) && d.length > 0) {
        var diff = JSON.stringify(d) !== JSON.stringify(CAMPAIGNS);
        CAMPAIGNS = d;
        try { sessionStorage.setItem('adpulse_cached_campaigns', JSON.stringify(d)); } catch(e) {}
        if (diff) refreshAllAds();
      }
    }
    function fetchUrl(targetUrl, isRetry) {
      fetch(targetUrl, { mode: 'cors', cache: 'no-store', headers: { 'Accept': 'application/json' } })
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          var ct = r.headers.get('content-type') || '';
          if (ct.indexOf('text/html') !== -1) throw new Error('HTML');
          return r.json();
        })
        .then(function(d) {
          if (Array.isArray(d)) applyData(d);
          else if (d && Array.isArray(d.campaigns)) applyData(d.campaigns);
        })
        .catch(function() {
          if (!isRetry && ep.indexOf('/api/campaigns') !== -1) {
            var fb = ep.replace(/\/api\/campaigns\/?.*$/, '/ads.json') + cb;
            fetchUrl(fb, true);
          }
        });
    }
    fetchUrl(ep + cb, false);
  }

  var width = window.innerWidth;
  var deviceType = width < 640 ? 'mobile' : (width < 1024 ? 'tablet' : 'desktop');

  var HINDI_MAP = {
    'तकनीक': ['tech', 'technology', 'gadgets'],
    'टेक': ['tech', 'technology', 'gadgets'],
    'मोबाइल': ['mobile', 'phone', 'gadgets'],
    'स्मार्टफोन': ['mobile', 'phone', 'gadgets'],
    'पैसे': ['money', 'earn', 'finance', 'earning'],
    'कमाई': ['earn', 'money', 'earning'],
    'लोन': ['loan', 'finance', 'bank'],
    'खरीदारी': ['shopping', 'deals', 'ecommerce', 'discount'],
    'ऑफर': ['offer', 'deal', 'deals', 'discount'],
    'सस्ता': ['cheap', 'deal', 'discount'],
    'नौकरी': ['jobs', 'job', 'career'],
    'होस्टिंग': ['hosting', 'domain', 'cloud'],
    'स्वास्थ्य': ['health', 'fitness'],
    'क्रिकेट': ['cricket', 'sports'],
    'गेम': ['games', 'gaming']
  };

  function getPageKeywords() {
    var list = [];
    var mk = document.querySelector('meta[name="keywords"]');
    if (mk && mk.content) { mk.content.split(',').forEach(function(k) { if (k.trim()) list.push(k.trim().toLowerCase()); }); }
    var textToScan = (document.title || '') + ' ' + (window.location ? window.location.pathname : '');
    for (var h in HINDI_MAP) {
      if (textToScan.indexOf(h) !== -1) { list = list.concat(HINDI_MAP[h]); }
    }
    var engWords = textToScan.match(/[a-zA-Z0-9]{3,20}/g);
    if (engWords) engWords.forEach(function(w) { list.push(w.toLowerCase()); });
    return list;
  }
  var pageKeywords = getPageKeywords();

  function pickAd(format, slotInterests, excludeIds) {
    var activeList = CAMPAIGNS.filter(function(ad) { return !ad.status || ad.status === 'active'; });
    if (activeList.length === 0) activeList = CAMPAIGNS;
    if (activeList.length === 0) return null;

    var formatEligible = activeList.filter(function(ad) {
      if (!format || format === 'auto' || ad.format === 'responsive_native') return true;
      if (format.indexOf('728') !== -1) return ad.format === 'leaderboard_728x90';
      if (format.indexOf('300') !== -1) return ad.format === 'rectangle_300x250';
      if (format.indexOf('320') !== -1) return ad.format === 'mobile_320x50';
      return true;
    });
    if (formatEligible.length === 0) formatEligible = activeList;

    var pool = formatEligible;
    if (excludeIds) {
      var unshown = formatEligible.filter(function(ad) { return !excludeIds[ad.id]; });
      if (unshown.length > 0) pool = unshown;
    }

    var targets = (slotInterests || []).concat(pageKeywords || []);
    var matched = [];
    if (targets.length > 0) {
      matched = pool.filter(function(ad) {
        var cat = (ad.category || '').toLowerCase();
        var tags = (ad.tags || []).map(function(t) { return t.toLowerCase(); });
        return targets.some(function(tgt) { return cat.indexOf(tgt) !== -1 || tags.indexOf(tgt) !== -1; });
      });
    }

    // CRITICAL: If no keyword matched, or randomize enabled -> Randomly rotate user ads!
    var finalPool = (matched.length > 0 && !randomizeEnabled) ? matched : pool;
    var randIdx = Math.floor(Math.random() * finalPool.length);
    var selected = finalPool[randIdx] || finalPool[0];
    if (selected) shownAdIdsOnPage[selected.id] = true;
    return selected;
  }

  function renderAdHtml(ad, slotId, reqFormat) {
    var accent = ad.accentColor || '#4F46E5';
    var clickUrl = ad.destinationUrl + (ad.destinationUrl.indexOf('?') === -1 ? '?' : '&') + 'utm_source=adpulse&utm_content=' + encodeURIComponent(slotId);
    var badge = ad.badgeText ? '<span style="font-size:10px;font-weight:700;text-transform:uppercase;background:' + accent + ';color:#fff;padding:2px 6px;border-radius:4px;display:inline-block;">' + ad.badgeText + '</span>' : '';
    var price = ad.price ? '<div style="font-size:14px;font-weight:800;color:#10B981;margin-top:3px;">' + ad.price + '</div>' : '';

    if (reqFormat && reqFormat.indexOf('300') !== -1) {
      var pImg = ad.imageUrl ? '<div style="height:120px;overflow:hidden;border-radius:6px;background:#020617;margin-bottom:8px;"><img src="' + ad.imageUrl + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.style.display=\\'none\\'" loading="lazy" referrerpolicy="no-referrer" /></div>' : '';
      return '<div style="box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:12px;width:100%;max-width:300px;margin:0 auto;color:#f8fafc;box-shadow:0 4px 12px rgba(0,0,0,0.25);text-align:left;">' +
        pImg +
        '<div style="font-size:11px;color:#94a3b8;font-weight:600;">' + (ad.advertiser || 'Sponsored') + ' ' + badge + '</div>' +
        '<div style="font-size:13px;font-weight:700;color:#ffffff;line-height:1.3;margin:3px 0;">' + ad.headline + '</div>' +
        price +
        '<a href="' + clickUrl + '" target="_blank" rel="sponsored nofollow" style="display:block;margin-top:8px;text-align:center;background:' + accent + ';color:#fff;font-size:12px;font-weight:700;padding:8px;border-radius:6px;text-decoration:none;">' + (ad.callToAction || 'View Deal') + ' &rarr;</a>' +
        '</div>';
    }

    var thumb = ad.imageUrl ? '<div style="width:68px;height:68px;border-radius:6px;overflow:hidden;background:#020617;flex-shrink:0;"><img src="' + ad.imageUrl + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.style.display=\\'none\\'" loading="lazy" referrerpolicy="no-referrer" /></div>' : '';
    return '<div style="box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px 14px;width:100%;max-width:728px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;color:#f8fafc;box-shadow:0 3px 10px rgba(0,0,0,0.25);text-align:left;">' +
      thumb +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:11px;color:#94a3b8;font-weight:600;">' + (ad.advertiser || 'Sponsored') + ' ' + badge + '</div>' +
        '<div style="font-size:13px;font-weight:700;color:#fff;line-height:1.3;">' + ad.headline + '</div>' +
        price +
      '</div>' +
      '<div style="flex-shrink:0;"><a href="' + clickUrl + '" target="_blank" rel="sponsored nofollow" style="display:inline-block;background:' + accent + ';color:#fff;font-size:11px;font-weight:700;padding:7px 12px;border-radius:6px;text-decoration:none;">' + (ad.callToAction || 'Learn More') + ' &rarr;</a></div>' +
      '</div>';
  }

  function initSlots() {
    var slots = document.querySelectorAll('ins.adpulse-slot');
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (s.getAttribute('data-adpulse-loaded') === 'true') continue;
      var format = s.getAttribute('data-ad-format') || 'auto';
      var interest = (s.getAttribute('data-ad-interest') || '').split(',').map(function(x) { return x.trim(); });
      var ad = pickAd(format, interest, shownAdIdsOnPage);
      if (ad) {
        s.innerHTML = renderAdHtml(ad, s.getAttribute('data-ad-slot') || 'slot_' + i, format);
        s.setAttribute('data-adpulse-loaded', 'true');
        s.style.display = 'block';
      }
    }
  }

  function findParagraphs() {
    var selectors = ['.content__entry p', '[class*=\"content__entry\"] p', '.u-inner p', '.post-body p', '.articleBody p', '[itemprop=\"articleBody\"] p', '.entry-content p', '[class*=\"entry-content\"] p', '.td-post-content p', '.single-content p', '.story-detail p', '.news-content p', '.article-content p', 'article p', 'main p', '.post p', '.content p', 'body p'];
    var nodes = document.querySelectorAll(selectors.join(', '));
    var valid = [];
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].textContent ? nodes[i].textContent.trim() : '';
      if (t.length >= 25) valid.push(nodes[i]);
    }
    return valid;
  }

  function initAutoAds() {
    if (!autoAdsEnabled) return;
    if (!document.getElementById('adpulse-auto-header')) {
      var headerAd = pickAd('leaderboard_728x90', [], shownAdIdsOnPage);
      if (headerAd) {
        var top = document.createElement('div');
        top.id = 'adpulse-auto-header';
        top.style.margin = '16px auto';
        top.style.maxWidth = '728px';
        top.style.width = '100%';
        top.innerHTML = renderAdHtml(headerAd, 'auto_header', 'leaderboard_728x90');
        if (document.body.firstChild) document.body.insertBefore(top, document.body.firstChild);
        else document.body.appendChild(top);
      }
    }

    var pList = findParagraphs();
    if (pList.length >= 1) {
      var step = Math.max(1, articleSpacing);
      var indices = pList.length <= 2 ? [0] : [];
      if (pList.length > 2) {
        for (var idx = step - 1; idx < pList.length && indices.length < maxArticleAds; idx += step) {
          indices.push(idx);
        }
      }
      for (var k = 0; k < indices.length; k++) {
        var slotIdx = k + 1;
        var cId = 'adpulse-in-article-' + slotIdx;
        if (!document.getElementById(cId)) {
          var targetP = pList[indices[k]];
          var format = slotIdx % 2 === 1 ? 'rectangle_300x250' : 'responsive_native';
          var inAd = pickAd(format, [], shownAdIdsOnPage);
          if (inAd && targetP && targetP.parentNode) {
            var c = document.createElement('div');
            c.id = cId;
            c.className = 'adpulse-in-article-slot';
            c.style.margin = '24px auto';
            c.style.maxWidth = format === 'rectangle_300x250' ? '300px' : '680px';
            c.style.width = '100%';
            c.innerHTML = renderAdHtml(inAd, 'auto_article_' + slotIdx, format);
            targetP.parentNode.insertBefore(c, targetP.nextSibling);
          }
        }
      }
    }
  }

  function refreshAllAds() {
    shownAdIdsOnPage = {};
    var slots = document.querySelectorAll('ins.adpulse-slot');
    for (var s = 0; s < slots.length; s++) slots[s].removeAttribute('data-adpulse-loaded');
    initSlots();
    var oh = document.getElementById('adpulse-auto-header');
    if (oh && oh.parentNode) oh.parentNode.removeChild(oh);
    var oa = document.querySelectorAll('.adpulse-in-article-slot');
    for (var a = 0; a < oa.length; a++) { if (oa[a].parentNode) oa[a].parentNode.removeChild(oa[a]); }
    initAutoAds();
  }

  function init() {
    initSlots();
    initAutoAds();
    syncCampaigns();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.AdPulse = { refresh: refreshAllAds, sync: syncCampaigns, version: '3.5' };
})();\`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Deliver ad-tag.js dynamically with no-cache headers
    if (url.pathname === '/ad-tag.js') {
      return new Response(AD_TAG_CODE, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // 2. Deliver live campaigns API: GET /api/campaigns or /ads.json
    if (url.pathname === '/api/campaigns' || url.pathname === '/api/campaigns/' || url.pathname === '/ads.json') {
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          if (Array.isArray(body)) {
            USER_CAMPAIGNS = body;
            if (env && env.ADPULSE_KV) {
              await env.ADPULSE_KV.put('campaigns', JSON.stringify(body));
            }
            return new Response(JSON.stringify({ success: true, count: body.length }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
            });
          }
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders });
        }
      }

      let data = USER_CAMPAIGNS;
      if (env && env.ADPULSE_KV) {
        try {
          const kvData = await env.ADPULSE_KV.get('campaigns', { type: 'json' });
          if (kvData) data = kvData;
        } catch (e) {}
      }

      return new Response(JSON.stringify(data), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // 3. Asset Passthrough with CORS (for Cloudflare Workers with Assets)
    if (env && env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      const newHeaders = new Headers(assetRes.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
      return new Response(assetRes.body, {
        status: assetRes.status,
        statusText: assetRes.statusText,
        headers: newHeaders
      });
    }

    // 4. Status Root
    return new Response(JSON.stringify({
      name: 'AdPulse Ad Network Worker',
      status: 'active',
      campaigns: USER_CAMPAIGNS.length,
      scriptUrl: url.origin + '/ad-tag.js',
      apiUrl: url.origin + '/api/campaigns'
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
`;
}

/**
 * Generates the complete, self-contained standalone `ad-tag.js` file
 * containing the user's active campaigns, security rules, Hindi keyword matching, and multi-in-article slots.
 */
export function generateStandaloneAdTagScript(
  campaigns: AdCreative[],
  security: SecurityConfig,
  delivery?: DeliveryConfig
): string {
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const campaignsJson = JSON.stringify(activeCampaigns, null, 2);
  const allowedDomainsJson = JSON.stringify(security.allowedDomains);
  const randomize = delivery ? delivery.randomizeAds : true;
  const fallbackAll = delivery ? delivery.fallbackAllPages : true;
  const spacing = delivery?.inArticleDensity === 'high' ? 3 : (delivery?.inArticleDensity === 'medium' ? 5 : 8);
  const maxAds = delivery?.maxArticleAds || 4;

  return `/**
 * AdPulse Standalone Ad Delivery Script (v3.5)
 * Features:
 * - Strictly user-created campaigns (Zero mock default ads)
 * - Hindi & Bilingual keyword matching
 * - Automatic random fallback across active user campaigns
 * - Universal article detection for Blogger (.post-body), WordPress, Hindi News
 */
(function() {
  'use strict';

  var CAMPAIGNS = ${campaignsJson};
  var ALLOWED_DOMAINS = ${allowedDomainsJson};
  var BLOCK_UNLISTED = ${security.blockUnlistedDomains};
  var DEBOUNCE_SEC = ${security.clickDebounceSeconds};
  var DEFAULT_RANDOMIZE = ${randomize};
  var DEFAULT_FALLBACK_ALL = ${fallbackAll};
  var ARTICLE_SPACING = ${spacing};
  var MAX_ARTICLE_ADS = ${maxAds};

  var currentScript = document.currentScript || document.querySelector('script[src*="ad-tag.js"]');
  var autoAdsEnabled = currentScript ? currentScript.getAttribute('data-auto-ads') !== 'false' : true;
  var randomizeEnabled = currentScript ? (currentScript.getAttribute('data-randomize') !== null ? currentScript.getAttribute('data-randomize') !== 'false' : DEFAULT_RANDOMIZE) : DEFAULT_RANDOMIZE;
  var customApiUrl = currentScript ? currentScript.getAttribute('data-api') : null;

  var shownAdIdsOnPage = {};

  try {
    var rawCached = sessionStorage.getItem('adpulse_cached_campaigns');
    if (rawCached) {
      var p = JSON.parse(rawCached);
      if (Array.isArray(p) && p.length > 0) CAMPAIGNS = p;
    }
  } catch (e) {}

  function syncWithServer() {
    if (typeof fetch === 'undefined') return;
    var targetUrl = customApiUrl;
    if (!targetUrl && currentScript && currentScript.src) {
      try { targetUrl = new URL(currentScript.src).origin + '/api/campaigns'; } catch (e) {}
    }
    if (!targetUrl) return;

    fetch(targetUrl + '?_t=' + Date.now(), { mode: 'cors', cache: 'no-store' })
      .then(function(res) { return res.json(); })
      .then(function(fresh) {
        if (Array.isArray(fresh) && fresh.length > 0) {
          if (JSON.stringify(fresh) !== JSON.stringify(CAMPAIGNS)) {
            CAMPAIGNS = fresh;
            try { sessionStorage.setItem('adpulse_cached_campaigns', JSON.stringify(fresh)); } catch (e) {}
            refreshAllAds();
          }
        }
      })
      .catch(function() {});
  }

  if (BLOCK_UNLISTED && ALLOWED_DOMAINS.length > 0) {
    var currentHost = window.location.hostname;
    var isAllowed = ALLOWED_DOMAINS.some(function(d) {
      return currentHost === d || currentHost.endsWith('.' + d) || d === '*';
    });
    if (!isAllowed) return;
  }

  var width = window.innerWidth;
  var deviceType = width < 640 ? 'mobile' : (width < 1024 ? 'tablet' : 'desktop');

  var HINDI_MAP = {
    'तकनीक': ['tech', 'technology', 'gadgets'],
    'टेक': ['tech', 'technology', 'gadgets'],
    'मोबाइल': ['mobile', 'phone', 'gadgets'],
    'स्मार्टफोन': ['mobile', 'phone', 'gadgets'],
    'पैसे': ['money', 'earn', 'finance', 'earning'],
    'कमाई': ['earn', 'money', 'earning'],
    'लोन': ['loan', 'finance', 'bank'],
    'खरीदारी': ['shopping', 'deals', 'ecommerce', 'discount'],
    'ऑफर': ['offer', 'deal', 'deals', 'discount'],
    'सस्ता': ['cheap', 'deal', 'discount'],
    'नौकरी': ['jobs', 'job', 'career'],
    'होस्टिंग': ['hosting', 'domain', 'cloud'],
    'स्वास्थ्य': ['health', 'fitness'],
    'क्रिकेट': ['cricket', 'sports'],
    'गेम': ['games', 'gaming']
  };

  function getPageKeywords() {
    var list = [];
    var mk = document.querySelector('meta[name="keywords"]');
    if (mk && mk.content) { mk.content.split(',').forEach(function(k) { if (k.trim()) list.push(k.trim().toLowerCase()); }); }
    var textToScan = (document.title || '') + ' ' + (window.location ? window.location.pathname : '');
    for (var h in HINDI_MAP) {
      if (textToScan.indexOf(h) !== -1) { list = list.concat(HINDI_MAP[h]); }
    }
    var engWords = textToScan.match(/[a-zA-Z0-9]{3,20}/g);
    if (engWords) engWords.forEach(function(w) { list.push(w.toLowerCase()); });
    return list;
  }
  var pageKeywords = getPageKeywords();

  function pickAd(format, slotInterests, excludeIds) {
    var activeList = CAMPAIGNS.filter(function(ad) { return !ad.status || ad.status === 'active'; });
    if (activeList.length === 0) activeList = CAMPAIGNS;
    if (activeList.length === 0) return null;

    var formatEligible = activeList.filter(function(ad) {
      if (!format || format === 'auto' || ad.format === 'responsive_native') return true;
      if (format.indexOf('728') !== -1) return ad.format === 'leaderboard_728x90';
      if (format.indexOf('300') !== -1) return ad.format === 'rectangle_300x250';
      if (format.indexOf('320') !== -1) return ad.format === 'mobile_320x50';
      return true;
    });
    if (formatEligible.length === 0) formatEligible = activeList;

    var candidatePool = formatEligible;
    if (excludeIds) {
      var unshown = formatEligible.filter(function(ad) { return !excludeIds[ad.id]; });
      if (unshown.length > 0) candidatePool = unshown;
    }

    var targets = (slotInterests || []).concat(pageKeywords || []);
    var matched = [];
    if (targets.length > 0) {
      matched = candidatePool.filter(function(ad) {
        var cat = (ad.category || '').toLowerCase();
        var tags = (ad.tags || []).map(function(t) { return t.toLowerCase(); });
        return targets.some(function(tgt) { return cat.indexOf(tgt) !== -1 || tags.indexOf(tgt) !== -1; });
      });
    }

    var finalPool = (matched.length > 0 && !randomizeEnabled) ? matched : candidatePool;
    var randIndex = Math.floor(Math.random() * finalPool.length);
    var selected = finalPool[randIndex] || finalPool[0];
    if (selected) shownAdIdsOnPage[selected.id] = true;
    return selected;
  }

  function renderAdHtml(ad, slotId, reqFormat) {
    var accent = ad.accentColor || '#4F46E5';
    var clickUrl = ad.destinationUrl + (ad.destinationUrl.indexOf('?') === -1 ? '?' : '&') + 'utm_source=adpulse&utm_content=' + encodeURIComponent(slotId);
    var badge = ad.badgeText ? '<span style="font-size:10px;font-weight:700;text-transform:uppercase;background:' + accent + ';color:#fff;padding:2px 6px;border-radius:4px;display:inline-block;">' + ad.badgeText + '</span>' : '';
    var price = ad.price ? '<div style="font-size:14px;font-weight:800;color:#10B981;margin-top:3px;">' + ad.price + '</div>' : '';

    if (reqFormat && reqFormat.indexOf('300') !== -1) {
      var prodImg = ad.imageUrl ? '<div style="height:120px;overflow:hidden;border-radius:6px;background:#020617;margin-bottom:8px;"><img src="' + ad.imageUrl + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.style.display=\\'none\\'" loading="lazy" referrerpolicy="no-referrer" /></div>' : '';
      return '<div style="box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:12px;width:100%;max-width:300px;margin:0 auto;color:#f8fafc;box-shadow:0 4px 12px rgba(0,0,0,0.25);text-align:left;">' +
        prodImg +
        '<div style="font-size:11px;color:#94a3b8;font-weight:600;">' + (ad.advertiser || 'Sponsored') + ' ' + badge + '</div>' +
        '<div style="font-size:13px;font-weight:700;color:#ffffff;line-height:1.3;margin:3px 0;">' + ad.headline + '</div>' +
        price +
        '<a href="' + clickUrl + '" target="_blank" rel="sponsored nofollow" style="display:block;margin-top:8px;text-align:center;background:' + accent + ';color:#fff;font-size:12px;font-weight:700;padding:8px;border-radius:6px;text-decoration:none;">' + (ad.callToAction || 'View Deal') + ' &rarr;</a>' +
        '</div>';
    }

    var thumb = ad.imageUrl ? '<div style="width:68px;height:68px;border-radius:6px;overflow:hidden;background:#020617;flex-shrink:0;"><img src="' + ad.imageUrl + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.style.display=\\'none\\'" loading="lazy" referrerpolicy="no-referrer" /></div>' : '';
    return '<div style="box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px 14px;width:100%;max-width:728px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;color:#f8fafc;box-shadow:0 3px 10px rgba(0,0,0,0.25);text-align:left;">' +
      thumb +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:11px;color:#94a3b8;font-weight:600;">' + (ad.advertiser || 'Sponsored') + ' ' + badge + '</div>' +
        '<div style="font-size:13px;font-weight:700;color:#fff;line-height:1.3;">' + ad.headline + '</div>' +
        price +
      '</div>' +
      '<div style="flex-shrink:0;"><a href="' + clickUrl + '" target="_blank" rel="sponsored nofollow" style="display:inline-block;background:' + accent + ';color:#fff;font-size:11px;font-weight:700;padding:7px 12px;border-radius:6px;text-decoration:none;">' + (ad.callToAction || 'Learn More') + ' &rarr;</a></div>' +
      '</div>';
  }

  function initSlots() {
    var slots = document.querySelectorAll('ins.adpulse-slot');
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (slot.getAttribute('data-adpulse-loaded') === 'true') continue;
      var format = slot.getAttribute('data-ad-format') || 'auto';
      var interestAttr = slot.getAttribute('data-ad-interest') || '';
      var interests = interestAttr ? interestAttr.split(',').map(function(s) { return s.trim(); }) : [];
      var selected = pickAd(format, interests, shownAdIdsOnPage);
      if (selected) {
        slot.innerHTML = renderAdHtml(selected, slot.getAttribute('data-ad-slot') || 'slot_' + i, format);
        slot.setAttribute('data-adpulse-loaded', 'true');
        slot.style.display = 'block';
      }
    }
  }

  function findParagraphs() {
    var selectors = ['.content__entry p', '[class*=\"content__entry\"] p', '.u-inner p', '.post-body p', '.articleBody p', '[itemprop=\"articleBody\"] p', '.entry-content p', '[class*=\"entry-content\"] p', '.td-post-content p', '.single-content p', '.story-detail p', '.news-content p', '.article-content p', 'article p', 'main p', '.post p', '.content p', 'body p'];
    var nodes = document.querySelectorAll(selectors.join(', '));
    var valid = [];
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].textContent ? nodes[i].textContent.trim() : '';
      if (t.length >= 25) valid.push(nodes[i]);
    }
    return valid;
  }

  function initAutoAds() {
    if (!autoAdsEnabled) return;
    if (!document.getElementById('adpulse-auto-header')) {
      var headerAd = pickAd('leaderboard_728x90', [], shownAdIdsOnPage);
      if (headerAd) {
        var top = document.createElement('div');
        top.id = 'adpulse-auto-header';
        top.style.margin = '16px auto';
        top.style.maxWidth = '728px';
        top.style.width = '100%';
        top.innerHTML = renderAdHtml(headerAd, 'auto_header', 'leaderboard_728x90');
        if (document.body.firstChild) document.body.insertBefore(top, document.body.firstChild);
        else document.body.appendChild(top);
      }
    }

    var pList = findParagraphs();
    if (pList.length >= 1) {
      var step = Math.max(1, ARTICLE_SPACING);
      var indices = pList.length <= 2 ? [0] : [];
      if (pList.length > 2) {
        for (var idx = step - 1; idx < pList.length && indices.length < MAX_ARTICLE_ADS; idx += step) {
          indices.push(idx);
        }
      }
      for (var k = 0; k < indices.length; k++) {
        var slotIdx = k + 1;
        var containerId = 'adpulse-in-article-' + slotIdx;
        if (!document.getElementById(containerId)) {
          var targetP = pList[indices[k]];
          var chosenFormat = slotIdx % 2 === 1 ? 'rectangle_300x250' : 'responsive_native';
          var inAd = pickAd(chosenFormat, [], shownAdIdsOnPage);
          if (inAd && targetP && targetP.parentNode) {
            var container = document.createElement('div');
            container.id = containerId;
            container.className = 'adpulse-in-article-slot';
            container.style.margin = '24px auto';
            container.style.maxWidth = chosenFormat === 'rectangle_300x250' ? '300px' : '680px';
            container.style.width = '100%';
            container.innerHTML = renderAdHtml(inAd, 'auto_article_' + slotIdx, chosenFormat);
            targetP.parentNode.insertBefore(container, targetP.nextSibling);
          }
        }
      }
    }
  }

  function refreshAllAds() {
    shownAdIdsOnPage = {};
    var manualSlots = document.querySelectorAll('ins.adpulse-slot');
    for (var m = 0; m < manualSlots.length; m++) manualSlots[m].removeAttribute('data-adpulse-loaded');
    initSlots();
    var oldHeader = document.getElementById('adpulse-auto-header');
    if (oldHeader && oldHeader.parentNode) oldHeader.parentNode.removeChild(oldHeader);
    var oldArticles = document.querySelectorAll('.adpulse-in-article-slot');
    for (var a = 0; a < oldArticles.length; a++) {
      if (oldArticles[a].parentNode) oldArticles[a].parentNode.removeChild(oldArticles[a]);
    }
    initAutoAds();
  }

  function start() {
    initSlots();
    initAutoAds();
    syncWithServer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.AdPulse = {
    refresh: refreshAllAds,
    sync: syncWithServer,
    version: '3.5'
  };
})();
`;
}
