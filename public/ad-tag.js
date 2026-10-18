/**
 * AdPulse Standalone Ad Delivery Script (v3.5.1 - Git Release)
 * Drop-in header tag for Cloudflare Pages, Cloudflare Workers, WordPress, Blogger, or any CMS.
 * Features:
 * - Zero Default Ads: Only serves campaigns created by the publisher.
 * - Hindi & Bilingual Language Intelligence: Intelligent Hindi keyword mapping to English campaign tags.
 * - Auto-Randomize Fallback: When no keyword matches on a Hindi or English page, automatically serves random rotated ads.
 * - Universal Article Placement: Compatible with Blogger (.post-body), WordPress, Hindi News portals, and all CMS.
 * - Multi In-Article Density: Inserts multiple spaced ads between paragraphs.
 * - Live Auto-Sync: Automatically fetches new/updated campaigns without website code edits.
 */
(function() {
  'use strict';

  // Publisher's custom campaigns pool (strictly NO mock/default ads)
  var DEFAULT_CAMPAIGNS = [];

  // Inspect current script tag attributes & origin
  var currentScript = document.currentScript || document.querySelector('script[src*="ad-tag.js"]');
  var autoAdsEnabled = currentScript ? currentScript.getAttribute('data-auto-ads') !== 'false' : true;
  var randomizeEnabled = currentScript ? currentScript.getAttribute('data-randomize') !== 'false' : true;
  var fallbackAllPages = currentScript ? currentScript.getAttribute('data-fallback-all-pages') !== 'false' : true;
  var articleSpacing = currentScript ? parseInt(currentScript.getAttribute('data-article-spacing') || '3', 10) : 3;
  var maxArticleAds = currentScript ? parseInt(currentScript.getAttribute('data-max-article-ads') || '4', 10) : 4;
  var customApiUrl = currentScript ? currentScript.getAttribute('data-api') : null;

  // Track ads already shown on the page to prevent duplicate repetition
  var shownAdIdsOnPage = {};

  // Check visitor's session storage for cached campaigns (for zero-latency page transitions)
  var cachedCampaigns = null;
  try {
    var rawCached = sessionStorage.getItem('adpulse_cached_campaigns');
    if (rawCached) {
      var parsedCache = JSON.parse(rawCached);
      if (Array.isArray(parsedCache) && parsedCache.length > 0) {
        cachedCampaigns = parsedCache;
      }
    }
  } catch (e) {}

  // Check script tag attribute data-campaigns
  var scriptCampaignsAttr = currentScript ? currentScript.getAttribute('data-campaigns') : null;
  var tagEmbeddedCampaigns = null;
  if (scriptCampaignsAttr) {
    try {
      var decoded = scriptCampaignsAttr.startsWith('[')
        ? scriptCampaignsAttr
        : decodeURIComponent(escape(atob(scriptCampaignsAttr)));
      var parsedTag = JSON.parse(decoded);
      if (Array.isArray(parsedTag) && parsedTag.length > 0) {
        tagEmbeddedCampaigns = parsedTag;
      }
    } catch (e) {}
  }

  // Active campaigns pool: Priority: Session Cache > Tag Embedded > Global window > Empty
  var CAMPAIGNS = cachedCampaigns || tagEmbeddedCampaigns || (window.AD_PULSE_CAMPAIGNS && window.AD_PULSE_CAMPAIGNS.length > 0 ? window.AD_PULSE_CAMPAIGNS : DEFAULT_CAMPAIGNS);

  // Determine API endpoint for dynamic campaign synchronization
  function getApiEndpoint() {
    if (customApiUrl) return customApiUrl;
    if (window.AD_PULSE_API_URL) return window.AD_PULSE_API_URL;
    if (currentScript && currentScript.src) {
      try {
        var scriptUrl = new URL(currentScript.src);
        return scriptUrl.origin + '/api/campaigns';
      } catch (e) {}
    }
    return '/api/campaigns';
  }

  // Live Auto-Sync: Fetch latest campaigns from backend API with robust CORS and fallback handling
  function syncLatestCampaigns() {
    if (typeof fetch === 'undefined') return;
    if (currentScript && currentScript.getAttribute('data-sync') === 'false') return;

    var endpoint = getApiEndpoint();
    var cacheBuster = (endpoint.indexOf('?') === -1 ? '?' : '&') + '_t=' + Date.now();

    function applyCampaigns(data) {
      if (Array.isArray(data) && data.length > 0) {
        var isDifferent = JSON.stringify(data) !== JSON.stringify(CAMPAIGNS);
        CAMPAIGNS = data;
        try {
          sessionStorage.setItem('adpulse_cached_campaigns', JSON.stringify(data));
        } catch (e) {}

        if (isDifferent) {
          console.log('[AdPulse] Synced ' + data.length + ' active publisher campaigns. Refreshing ad placements.');
          refreshAllAds();
        }
      }
    }

    function tryFetch(url, isRetry) {
      fetch(url, { 
        mode: 'cors',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      })
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          var contentType = res.headers.get('content-type') || '';
          if (contentType.indexOf('text/html') !== -1) {
            throw new Error('Server returned HTML instead of JSON');
          }
          return res.json();
        })
        .then(function(data) {
          if (Array.isArray(data)) {
            applyCampaigns(data);
          } else if (data && Array.isArray(data.campaigns)) {
            applyCampaigns(data.campaigns);
          }
        })
        .catch(function() {
          // If /api/campaigns had CORS or SPA routing issue, try fallback to /ads.json
          if (!isRetry && endpoint.indexOf('/api/campaigns') !== -1) {
            var fallbackUrl = endpoint.replace(/\/api\/campaigns\/?.*$/, '/ads.json') + cacheBuster;
            tryFetch(fallbackUrl, true);
          }
        });
    }

    tryFetch(endpoint + cacheBuster, false);
  }

  // Detect device
  var width = window.innerWidth;
  var deviceType = width < 640 ? 'mobile' : (width < 1024 ? 'tablet' : 'desktop');

  // Anti-Spam Click Debounce State
  var lastClickedMap = {};

  /**
   * Hindi & Bilingual Keyword Dictionary
   * Maps common Hindi words (Devanagari & Romanized Hinglish) to English keywords
   */
  var HINDI_KEYWORD_MAP = {
    // Tech & Electronics
    'तकनीक': ['tech', 'technology', 'gadgets', 'electronics'],
    'तकनीकी': ['tech', 'technology', 'gadgets'],
    'टेक': ['tech', 'technology', 'gadgets'],
    'मोबाइल': ['mobile', 'phone', 'smartphone', 'gadgets', 'tech'],
    'स्मार्टफोन': ['mobile', 'phone', 'smartphone', 'gadgets'],
    'फोन': ['mobile', 'phone', 'smartphone'],
    'गैजेट': ['gadgets', 'tech', 'electronics'],
    'समीक्षा': ['review', 'tech', 'gadgets'],
    'कंप्यूटर': ['computer', 'laptop', 'tech', 'pc'],
    'लैपटॉप': ['laptop', 'computer', 'tech'],
    'इंटरनेट': ['internet', 'wifi', 'web', 'hosting', 'vpn'],
    'सॉफ्टवेयर': ['software', 'app', 'tool'],
    'ऐप': ['app', 'application', 'software', 'mobile'],

    // Finance, Money & Loans
    'पैसे': ['money', 'finance', 'earn', 'income', 'earning'],
    'कमाई': ['earn', 'money', 'income', 'earning', 'business'],
    'धन': ['money', 'wealth', 'finance'],
    'रुपया': ['money', 'cash', 'finance'],
    'कमाएं': ['earn', 'money', 'earning', 'income'],
    'लोन': ['loan', 'finance', 'credit', 'bank'],
    'कर्ज': ['loan', 'debt', 'finance'],
    'बैंक': ['bank', 'banking', 'finance'],
    'खाता': ['account', 'bank', 'finance'],
    'क्रेडिट': ['credit', 'card', 'finance'],
    'बीमा': ['insurance', 'finance'],
    'निवेश': ['invest', 'investment', 'crypto', 'stocks', 'trading'],
    'ट्रेडिंग': ['trading', 'stocks', 'crypto', 'finance'],
    'शेयर': ['stocks', 'trading', 'finance'],

    // Shopping, Deals & eCommerce
    'खरीदारी': ['shopping', 'ecommerce', 'deals', 'amazon', 'flipkart'],
    'शॉपिंग': ['shopping', 'ecommerce', 'deals', 'store'],
    'सेल': ['sale', 'deals', 'discount', 'shopping', 'offer'],
    'ऑफर': ['offer', 'deal', 'deals', 'discount'],
    'छूट': ['discount', 'offer', 'deal', 'cheap', 'save'],
    'सस्ता': ['cheap', 'budget', 'discount', 'deal'],
    'दुकान': ['store', 'shop', 'ecommerce'],

    // Jobs & Education
    'नौकरी': ['jobs', 'job', 'career', 'employment', 'vacancy'],
    'रोजगार': ['jobs', 'employment', 'career'],
    'भर्ती': ['recruitment', 'jobs', 'vacancy'],
    'वैकेंसी': ['vacancy', 'jobs', 'career'],
    'परीक्षा': ['exam', 'education', 'study'],
    'शिक्षा': ['education', 'learning', 'course', 'study'],
    'पढ़ाई': ['study', 'education', 'course'],
    'कोर्स': ['course', 'learning', 'education'],

    // Hosting, Domain & Web
    'होस्टिंग': ['hosting', 'domain', 'cloud', 'server', 'webdev'],
    'डोमेन': ['domain', 'hosting', 'website'],
    'वेबसाइट': ['website', 'webdev', 'hosting', 'cloud'],
    'सर्वर': ['server', 'cloud', 'hosting'],
    'सुरक्षा': ['security', 'vpn', 'antivirus', 'privacy'],

    // Health, Fitness & Lifestyle
    'स्वास्थ्य': ['health', 'fitness', 'wellness', 'medical'],
    'सेहत': ['health', 'fitness', 'diet'],
    'दवा': ['medicine', 'health', 'medical'],
    'फिटनेस': ['fitness', 'health', 'gym'],
    'वजन': ['weight loss', 'fitness', 'health'],

    // Sports & Entertainment
    'खेल': ['sports', 'cricket', 'games', 'gaming'],
    'क्रिकेट': ['cricket', 'sports', 'match'],
    'गेम': ['games', 'gaming', 'entertainment'],
    'गेमिंग': ['gaming', 'games', 'entertainment'],
    'मूवी': ['movies', 'film', 'entertainment'],
    'सिनेमा': ['cinema', 'movies', 'entertainment'],

    // Auto & Travel
    'गाड़ी': ['car', 'cars', 'auto', 'vehicle'],
    'कार': ['car', 'cars', 'auto'],
    'बाइक': ['bike', 'motorcycle', 'auto'],
    'यात्रा': ['travel', 'tourism', 'flight', 'hotel'],
    'होटल': ['hotel', 'travel', 'booking']
  };

  /**
   * Contextual Page Keywords & Language Scanner
   * Extracts keywords from meta tags, title, headings, and page body.
   * Handles Hindi text + English keywords embedded in Hindi articles.
   */
  function extractPageKeywords() {
    var detected = [];

    // 1. Meta keywords and description
    var metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords && metaKeywords.content) {
      metaKeywords.content.split(',').forEach(function(k) {
        if (k.trim()) detected.push(k.trim().toLowerCase());
      });
    }

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && metaDesc.content) {
      extractTokens(metaDesc.content, detected);
    }

    // 2. Page Title & URL path
    if (document.title) {
      extractTokens(document.title, detected);
    }
    if (window.location && window.location.pathname) {
      window.location.pathname.split(/[\/\-_]/).forEach(function(slug) {
        if (slug.length > 2) detected.push(slug.toLowerCase());
      });
    }

    // 3. Headings (H1, H2)
    var headings = document.querySelectorAll('h1, h2');
    for (var h = 0; h < headings.length && h < 5; h++) {
      if (headings[h].textContent) {
        extractTokens(headings[h].textContent, detected);
      }
    }

    return detected;
  }

  function extractTokens(text, targetList) {
    if (!text) return;

    // A. Check for Hindi words in dictionary
    for (var hindiWord in HINDI_KEYWORD_MAP) {
      if (text.indexOf(hindiWord) !== -1) {
        var mappedEng = HINDI_KEYWORD_MAP[hindiWord];
        for (var m = 0; m < mappedEng.length; m++) {
          targetList.push(mappedEng[m]);
        }
      }
    }

    // B. Extract English / Alphanumeric tokens (common in Hindi tech & news blogs, e.g., "5G", "Samsung", "Discount")
    var englishWords = text.match(/[a-zA-Z0-9]{3,20}/g);
    if (englishWords) {
      for (var e = 0; e < englishWords.length; e++) {
        var word = englishWords[e].toLowerCase();
        if (['the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'been', 'news', 'post'].indexOf(word) === -1) {
          targetList.push(word);
        }
      }
    }
  }

  var pageKeywords = extractPageKeywords();

  /**
   * Enhanced Ad Selection Algorithm
   * 1. ONLY serves active campaigns created by publisher (NO DEFAULT MOCK ADS).
   * 2. Keyword & Category Matching with Hindi & English compatibility.
   * 3. Automatic Randomization Fallback: If no keyword matches, randomly rotates active user ads.
   * 4. Multi-Slot Rotation: Prevents showing the exact same ad repeatedly on the page when alternates exist.
   * 5. Universal Format Adaptation: Adapts ad creatives so no slot ever remains empty.
   */
  function pickAd(format, slotInterests, excludeIds) {
    var activeList = CAMPAIGNS.filter(function(ad) {
      return !ad.status || ad.status === 'active';
    });

    if (activeList.length === 0) activeList = CAMPAIGNS;
    if (activeList.length === 0) return null;

    // Filter by device compatibility
    var deviceEligible = activeList.filter(function(ad) {
      if (!ad.targetDevices || ad.targetDevices.length === 0) return true;
      return ad.targetDevices.indexOf(deviceType) !== -1;
    });
    if (deviceEligible.length === 0) deviceEligible = activeList;

    // Filter by format with fallback (ensures ads display even if advertiser didn't create that exact format)
    var formatEligible = deviceEligible.filter(function(ad) {
      if (!format || format === 'auto' || ad.format === 'responsive_native') return true;
      if (format.indexOf('728') !== -1) return ad.format === 'leaderboard_728x90';
      if (format.indexOf('300') !== -1) return ad.format === 'rectangle_300x250';
      if (format.indexOf('320') !== -1) return ad.format === 'mobile_320x50';
      if (format.indexOf('160') !== -1) return ad.format === 'skyscraper_160x600';
      return true;
    });
    // Fallback: If no ad matches strict format, adapt any available user ad responsively
    if (formatEligible.length === 0) formatEligible = deviceEligible;

    // Exclude ads already rendered on this page so multiple slots show different campaigns
    var candidatePool = formatEligible;
    if (excludeIds && Object.keys(excludeIds).length > 0) {
      var unshown = formatEligible.filter(function(ad) { return !excludeIds[ad.id]; });
      if (unshown.length > 0) {
        candidatePool = unshown;
      }
    }

    // Combine slot-specific interests and page-level extracted keywords (Hindi + English)
    var allTargetInterests = (slotInterests || []).concat(pageKeywords || []);
    var keywordMatches = [];

    if (allTargetInterests.length > 0) {
      keywordMatches = candidatePool.filter(function(ad) {
        var match = false;
        var adCat = (ad.category || '').toLowerCase();
        var adTags = (ad.tags || []).map(function(t) { return t.toLowerCase(); });
        var adName = (ad.name || '').toLowerCase();
        var adHeadline = (ad.headline || '').toLowerCase();

        for (var i = 0; i < allTargetInterests.length; i++) {
          var target = allTargetInterests[i].toLowerCase().trim();
          if (!target) continue;

          if (adCat && (adCat.indexOf(target) !== -1 || target.indexOf(adCat) !== -1)) match = true;
          if (adTags.indexOf(target) !== -1 || adTags.some(function(t) { return t.indexOf(target) !== -1 || target.indexOf(t) !== -1; })) match = true;
          if (adName.indexOf(target) !== -1 || adHeadline.indexOf(target) !== -1) match = true;
          if (match) break;
        }
        return match;
      });
    }

    // RULE: If keywords match AND randomize is not forced, use matches.
    // Otherwise, if NO keyword matches found on page (e.g. Hindi site with English tags),
    // or if Randomize option is enabled:
    // FALLBACK TO ALL CANDIDATES AND SELECT A RANDOM AD!
    var hasValidKeywordMatch = keywordMatches.length > 0;
    var finalPool = (hasValidKeywordMatch && !randomizeEnabled) ? keywordMatches : candidatePool;

    // Randomize Mode (always used when randomizeEnabled or when no keyword matched)
    if (randomizeEnabled || !hasValidKeywordMatch) {
      var randomIndex = Math.floor(Math.random() * finalPool.length);
      var selected = finalPool[randomIndex];
      if (selected) shownAdIdsOnPage[selected.id] = true;
      return selected;
    }

    // Weighted selection when keywords matched
    var weighted = finalPool.map(function(ad) {
      var weight = ad.weight || 50;
      return { ad: ad, weight: weight };
    });

    var sum = weighted.reduce(function(a, b) { return a + b.weight; }, 0);
    var rand = Math.random() * sum;
    for (var w = 0; w < weighted.length; w++) {
      if (rand < weighted[w].weight) {
        shownAdIdsOnPage[weighted[w].ad.id] = true;
        return weighted[w].ad;
      }
      rand -= weighted[w].weight;
    }

    var fallback = weighted[0].ad;
    if (fallback) shownAdIdsOnPage[fallback.id] = true;
    return fallback;
  }

  // Render HTML based on targeted format (with rich product images, prices, discount badges)
  function renderAdHtml(ad, slotId, requestedFormat) {
    var accent = ad.accentColor || '#4F46E5';
    var clickUrl = ad.destinationUrl;
    var separator = clickUrl.indexOf('?') === -1 ? '?' : '&';
    clickUrl += separator + 'utm_source=adpulse&utm_medium=affiliate_display&utm_content=' + encodeURIComponent(slotId);

    var badgeHtml = ad.badgeText 
      ? '<span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: ' + accent + '; color: #ffffff; padding: 2px 7px; border-radius: 4px; display: inline-block;">' + ad.badgeText + '</span>'
      : '';

    var priceHtml = '';
    if (ad.price) {
      priceHtml = '<div style="display: flex; align-items: baseline; gap: 6px; margin-top: 4px; font-family: -apple-system, BlinkMacSystemFont, monospace;">' +
        '<span style="font-size: 14px; font-weight: 800; color: #10B981;">' + ad.price + '</span>' +
        (ad.originalPrice ? '<span style="font-size: 11px; text-decoration: line-through; color: #64748B;">' + ad.originalPrice + '</span>' : '') +
      '</div>';
    }

    // 1. Medium Rectangle (300x250) - Showcase Product Card
    if (requestedFormat && (requestedFormat.indexOf('300') !== -1 || ad.format === 'rectangle_300x250')) {
      var prodImg = ad.imageUrl
        ? '<div style="position: relative; width: 100%; height: 130px; border-radius: 6px; overflow: hidden; background: #020617; margin-bottom: 8px;">' +
            '<img src="' + ad.imageUrl + '" alt="" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentNode.style.display=\'none\'" loading="lazy" referrerpolicy="no-referrer" />' +
            (badgeHtml ? '<div style="position: absolute; top: 6px; left: 6px;">' + badgeHtml + '</div>' : '') +
          '</div>'
        : (badgeHtml ? '<div style="margin-bottom: 6px;">' + badgeHtml + '</div>' : '');

      return '<div class="adpulse-container adpulse-300x250" style="box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 12px; width: 100%; max-width: 300px; margin: 0 auto; display: flex; flex-direction: column; justify-content: space-between; text-decoration: none; color: #f8fafc; box-shadow: 0 4px 12px rgba(0,0,0,0.25); text-align: left;">' +
          '<div>' +
            prodImg +
            '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">' +
              '<span style="font-size: 11px; color: #94a3b8; font-weight: 600;">' + (ad.advertiser || 'Sponsored') + '</span>' +
              '<span style="font-size: 10px; color: #64748b; letter-spacing: 0.05em;">Sponsored</span>' +
            '</div>' +
            '<div style="font-size: 13px; font-weight: 700; color: #ffffff; line-height: 1.3; margin-bottom: 3px;">' + ad.headline + '</div>' +
            (ad.description ? '<div style="font-size: 11px; color: #94a3b8; line-height: 1.35; max-height: 32px; overflow: hidden; margin-bottom: 4px;">' + ad.description + '</div>' : '') +
            priceHtml +
          '</div>' +
          '<div style="margin-top: 10px;">' +
            '<a href="' + clickUrl + '" target="_blank" rel="sponsored nofollow noopener" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background: ' + accent + '; color: #ffffff; font-size: 12px; font-weight: 700; padding: 8px 12px; border-radius: 6px; text-decoration: none; transition: opacity 0.15s ease;" onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1.0\'">' +
              (ad.callToAction || 'Learn More') + ' &rarr;' +
            '</a>' +
          '</div>' +
        '</div>';
    }

    // 2. Leaderboard Banner (728x90) / Header Placement
    if (requestedFormat && (requestedFormat.indexOf('728') !== -1 || ad.format === 'leaderboard_728x90')) {
      var leaderImg = ad.imageUrl
        ? '<div style="position: relative; width: 72px; height: 72px; border-radius: 6px; overflow: hidden; background: #020617; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #1e293b;">' +
            '<img src="' + ad.imageUrl + '" alt="" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentNode.style.display=\'none\'" loading="lazy" referrerpolicy="no-referrer" />' +
          '</div>'
        : '';

      return '<div class="adpulse-container adpulse-728x90" style="box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 10px 16px; width: 100%; max-width: 728px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 14px; text-decoration: none; color: #f8fafc; box-shadow: 0 4px 12px rgba(0,0,0,0.25); text-align: left;">' +
          leaderImg +
          '<div style="flex: 1; min-width: 0;">' +
            '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">' +
              badgeHtml +
              '<span style="font-size: 11px; color: #94a3b8; font-weight: 600;">' + (ad.advertiser || 'Sponsored') + '</span>' +
              '<span style="font-size: 10px; color: #64748b; margin-left: auto;">Ad</span>' +
            '</div>' +
            '<div style="font-size: 14px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + ad.headline + '</div>' +
            '<div style="font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + (ad.description || '') + '</div>' +
          '</div>' +
          '<div style="flex-shrink: 0; text-align: right;">' +
            priceHtml +
            '<a href="' + clickUrl + '" target="_blank" rel="sponsored nofollow noopener" style="display: inline-block; margin-top: 4px; background: ' + accent + '; color: #ffffff; font-size: 12px; font-weight: 700; padding: 7px 14px; border-radius: 6px; text-decoration: none; white-space: nowrap;">' +
              (ad.callToAction || 'View Deal') + ' &rarr;' +
            '</a>' +
          '</div>' +
        '</div>';
    }

    // 3. Responsive Native Card (Perfect for in-article and mobile)
    var thumbImg = ad.imageUrl
      ? '<div style="position: relative; width: 68px; height: 68px; border-radius: 6px; overflow: hidden; background: #020617; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #1e293b;">' +
          '<img src="' + ad.imageUrl + '" alt="" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentNode.style.display=\'none\'" loading="lazy" referrerpolicy="no-referrer" />' +
        '</div>'
      : '';

    return '<div class="adpulse-container adpulse-responsive-card" style="box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px 14px; width: 100%; max-width: 680px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-decoration: none; color: #f8fafc; box-shadow: 0 2px 10px rgba(0,0,0,0.2); text-align: left;">' +
        thumbImg +
        '<div style="flex: 1; min-width: 0;">' +
          '<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">' +
            badgeHtml +
            '<span style="font-size: 11px; color: #94a3b8; font-weight: 600;">' + (ad.advertiser || 'Sponsored') + '</span>' +
            '<span style="font-size: 10px; color: #64748b; margin-left: auto;">Sponsored</span>' +
          '</div>' +
          '<div style="font-size: 13px; font-weight: 700; color: #ffffff; line-height: 1.3; margin-bottom: 2px;">' + ad.headline + '</div>' +
          priceHtml +
        '</div>' +
        '<div style="flex-shrink: 0;">' +
          '<a href="' + clickUrl + '" target="_blank" rel="sponsored nofollow noopener" style="display: inline-block; background: ' + accent + '; color: #ffffff; font-size: 11px; font-weight: 700; padding: 8px 14px; border-radius: 6px; text-decoration: none; white-space: nowrap;">' +
            (ad.callToAction || 'Shop Now') + ' &rarr;' +
          '</a>' +
        '</div>' +
      '</div>';
  }

  // Viewability & Event Beacon
  function recordEvent(type, ad, slotId) {
    try {
      window.postMessage({ type: 'ADPULSE_EVENT', data: { event: type, adId: ad.id, slotId: slotId } }, '*');
    } catch(e) {}
  }

  function setupViewability(element, ad, slotId) {
    if (!('IntersectionObserver' in window)) return;
    var timer = null;
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!timer) {
            timer = setTimeout(function() {
              recordEvent('viewable_impression', ad, slotId);
              observer.disconnect();
            }, 1000);
          }
        } else {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        }
      });
    }, { threshold: [0.5] });

    observer.observe(element);
    recordEvent('impression', ad, slotId);
  }

  // Populate manual slot elements: <ins class="adpulse-slot" ...>
  function initSlots() {
    var slots = document.querySelectorAll('ins.adpulse-slot');
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (slot.getAttribute('data-adpulse-loaded') === 'true') continue;

      var slotId = slot.getAttribute('data-ad-slot') || ('slot_' + i);
      var format = slot.getAttribute('data-ad-format') || 'auto';
      var interestAttr = slot.getAttribute('data-ad-interest') || '';
      var interests = interestAttr ? interestAttr.split(',').map(function(s) { return s.trim(); }) : [];

      var selected = pickAd(format, interests, shownAdIdsOnPage);
      if (selected) {
        slot.innerHTML = renderAdHtml(selected, slotId, format);
        slot.setAttribute('data-adpulse-loaded', 'true');
        slot.style.display = 'block';
        setupViewability(slot, selected, slotId);
      }
    }
  }

  /**
   * Universal Content & Paragraph Finder
   * Handles:
   * - Hindi Blogger / Blogspot (.post-body, div.post-body)
   * - WordPress themes (.entry-content, .td-post-content, .single-content)
   * - Hindi News Portals (.articleBody, .news-content, .story-detail, .article-content)
   * - Generic HTML / CMS (<article>, <main>, #content, plain <p> tags)
   */
  function findArticleParagraphs() {
    // Strategy 1: Target common blog/news article selectors
    var selectors = [
      '.content__entry p',
      '[class*="content__entry"] p',
      '.u-inner p',
      '.post-body p',
      '.articleBody p',
      '[itemprop="articleBody"] p',
      '.entry-content p',
      '[class*="entry-content"] p',
      '.td-post-content p',
      '.single-content p',
      '.story-detail p',
      '.news-content p',
      '.article-content p',
      '[class*="article-content"] p',
      'article p',
      'main p',
      '.post p',
      '.content p',
      '#content p',
      '.detail-content p',
      '.gh-content p'
    ];

    var nodes = document.querySelectorAll(selectors.join(', '));
    var valid = [];
    for (var i = 0; i < nodes.length; i++) {
      var text = nodes[i].textContent ? nodes[i].textContent.trim() : '';
      if (text.length >= 25) {
        valid.push(nodes[i]);
      }
    }

    if (valid.length >= 1) return valid;

    // Strategy 2: If site doesn't wrap in standard article tags, scan all paragraph tags on page
    var allP = document.querySelectorAll('body p');
    for (var j = 0; j < allP.length; j++) {
      var pText = allP[j].textContent ? allP[j].textContent.trim() : '';
      // Avoid footer/nav micro paragraphs
      if (pText.length >= 35) {
        valid.push(allP[j]);
      }
    }

    if (valid.length >= 1) return valid;

    // Strategy 3: Hindi Blogger posts with <br><br> inside .post-body or div
    var bloggerContainer = document.querySelector('.post-body, .articleBody, .entry-content, article');
    if (bloggerContainer) {
      var childDivs = bloggerContainer.querySelectorAll('div');
      for (var d = 0; d < childDivs.length; d++) {
        var dText = childDivs[d].textContent ? childDivs[d].textContent.trim() : '';
        if (dText.length >= 30) valid.push(childDivs[d]);
      }
    }

    return valid;
  }

  /**
   * Auto-ad placement engine:
   * 1. Top Header Banner
   * 2. MULTIPLE In-Article Product Showcase & Native Cards throughout Hindi & English articles
   */
  function initAutoAds() {
    if (!autoAdsEnabled) return;

    // 1. Auto Top Header Banner
    if (!document.getElementById('adpulse-auto-header')) {
      var headerAd = pickAd('leaderboard_728x90', [], shownAdIdsOnPage);
      if (headerAd) {
        var topContainer = document.createElement('div');
        topContainer.id = 'adpulse-auto-header';
        topContainer.style.margin = '16px auto';
        topContainer.style.maxWidth = '728px';
        topContainer.style.width = '100%';
        topContainer.innerHTML = renderAdHtml(headerAd, 'auto_header', 'leaderboard_728x90');
        
        var body = document.body;
        if (body.firstChild) {
          body.insertBefore(topContainer, body.firstChild);
        } else {
          body.appendChild(topContainer);
        }
        setupViewability(topContainer, headerAd, 'auto_header');
      }
    }

    // 2. Multi In-Article Ad Engine: Works across all Hindi websites, blogs, and portals
    var validParagraphs = findArticleParagraphs();
    var totalP = validParagraphs.length;

    if (totalP >= 1) {
      var adSlotCount = 0;
      var step = Math.max(1, articleSpacing);

      // For articles with 1-2 paragraphs, insert after 1st paragraph
      // For longer articles, insert every `step` paragraphs up to maxArticleAds
      var insertionIndices = [];
      if (totalP <= 2) {
        insertionIndices.push(0);
      } else {
        for (var idx = step - 1; idx < totalP && adSlotCount < maxArticleAds; idx += step) {
          insertionIndices.push(idx);
          adSlotCount++;
        }
      }

      for (var k = 0; k < insertionIndices.length; k++) {
        var pIndex = insertionIndices[k];
        var slotIndex = k + 1;
        var existingContainerId = 'adpulse-in-article-' + slotIndex;

        if (!document.getElementById(existingContainerId)) {
          var targetNode = validParagraphs[pIndex];
          if (targetNode && targetNode.parentNode) {
            // Alternate formats for engaging variety: odd = 300x250 product showcase, even = responsive native card
            var chosenFormat = (slotIndex % 2 === 1) ? 'rectangle_300x250' : 'responsive_native';
            var inArticleAd = pickAd(chosenFormat, [], shownAdIdsOnPage);

            if (inArticleAd) {
              var articleContainer = document.createElement('div');
              articleContainer.id = existingContainerId;
              articleContainer.className = 'adpulse-in-article-slot';
              articleContainer.style.margin = '24px auto';
              articleContainer.style.maxWidth = chosenFormat === 'rectangle_300x250' ? '300px' : '680px';
              articleContainer.style.width = '100%';
              articleContainer.innerHTML = renderAdHtml(inArticleAd, 'auto_article_' + slotIndex, chosenFormat);
              
              targetNode.parentNode.insertBefore(articleContainer, targetNode.nextSibling);
              setupViewability(articleContainer, inArticleAd, 'auto_article_' + slotIndex);
            }
          }
        }
      }
    }
  }

  // Refresh all ad slots on the page (used when campaigns update dynamically)
  function refreshAllAds() {
    shownAdIdsOnPage = {};
    // Reset manual slots
    var manualSlots = document.querySelectorAll('ins.adpulse-slot');
    for (var m = 0; m < manualSlots.length; m++) {
      manualSlots[m].removeAttribute('data-adpulse-loaded');
    }
    initSlots();

    // Reset auto-header
    var oldHeader = document.getElementById('adpulse-auto-header');
    if (oldHeader && oldHeader.parentNode) oldHeader.parentNode.removeChild(oldHeader);

    // Reset in-article slots
    var oldArticles = document.querySelectorAll('.adpulse-in-article-slot, #adpulse-auto-article');
    for (var a = 0; a < oldArticles.length; a++) {
      if (oldArticles[a].parentNode) oldArticles[a].parentNode.removeChild(oldArticles[a]);
    }
    initAutoAds();
  }

  // Auto-init on page load
  function init() {
    initSlots();
    initAutoAds();
    // Background sync to fetch fresh campaigns
    syncLatestCampaigns();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export Global API
  window.AdPulse = {
    refresh: refreshAllAds,
    sync: syncLatestCampaigns,
    setCampaigns: function(newCampaigns) {
      if (Array.isArray(newCampaigns)) {
        CAMPAIGNS = newCampaigns;
        refreshAllAds();
      }
    },
    version: '3.5'
  };

})();
