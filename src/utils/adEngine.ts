/**
 * AdPulse Core Ad Selection & Intelligence Engine (v3.5.1)
 */
import { AdCreative, AdEventLog, DeviceType, TargetingRule } from '../types';

/**
 * Hindi & Bilingual Keyword Dictionary for Ad Selection
 */
export const HINDI_KEYWORD_MAP: Record<string, string[]> = {
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

  // Shopping, Deals & eCommerce
  'खरीदारी': ['shopping', 'ecommerce', 'deals', 'amazon', 'flipkart'],
  'शॉपिंग': ['shopping', 'ecommerce', 'deals', 'store'],
  'सेल': ['sale', 'deals', 'discount', 'shopping', 'offer'],
  'ऑफर': ['offer', 'deal', 'deals', 'discount'],
  'छूट': ['discount', 'offer', 'deal', 'cheap', 'save'],
  'सस्ता': ['cheap', 'budget', 'discount', 'deal'],

  // Jobs & Education
  'नौकरी': ['jobs', 'job', 'career', 'employment', 'vacancy'],
  'रोजगार': ['jobs', 'employment', 'career'],
  'भर्ती': ['recruitment', 'jobs', 'vacancy'],
  'वैकेंसी': ['vacancy', 'jobs', 'career'],
  'शिक्षा': ['education', 'learning', 'course', 'study'],

  // Hosting & Web
  'होस्टिंग': ['hosting', 'domain', 'cloud', 'server', 'webdev'],
  'डोमेन': ['domain', 'hosting', 'website'],
  'वेबसाइट': ['website', 'webdev', 'hosting', 'cloud'],
  'सुरक्षा': ['security', 'vpn', 'antivirus', 'privacy'],

  // Sports, Health & Lifestyle
  'स्वास्थ्य': ['health', 'fitness', 'wellness'],
  'सेहत': ['health', 'fitness'],
  'क्रिकेट': ['cricket', 'sports', 'match'],
  'गेमिंग': ['gaming', 'games', 'entertainment'],
  'कार': ['car', 'cars', 'auto'],
  'यात्रा': ['travel', 'tourism', 'hotel']
};

/**
 * Expand incoming interest tokens with Hindi translations
 */
export function expandInterestsWithHindi(interests: string[]): string[] {
  const result = new Set<string>();
  for (const item of interests) {
    const lower = item.toLowerCase().trim();
    if (!lower) continue;
    result.add(lower);

    // Check Hindi map
    for (const [hindiWord, mappedArr] of Object.entries(HINDI_KEYWORD_MAP)) {
      if (lower.includes(hindiWord)) {
        mappedArr.forEach((w) => result.add(w));
      }
    }
  }
  return Array.from(result);
}

/**
 * Enhanced Ad Selection Algorithm
 * Selects an ad considering format, device, weight, and interest matching.
 * If no keyword found on page (e.g. Hindi content vs English campaign tags),
 * it automatically falls back to random selection across all user campaigns!
 */
export function selectAdForSlot({
  campaigns,
  format,
  device = 'desktop',
  interests = [],
  targetingRules = [],
  randomize = false,
  excludeIds = []
}: {
  campaigns: AdCreative[];
  format?: string;
  device?: DeviceType;
  interests?: string[];
  targetingRules?: TargetingRule[];
  randomize?: boolean;
  excludeIds?: string[];
}): AdCreative | null {
  // 1. Filter active campaigns created by the user
  let eligible = campaigns.filter((ad) => ad.status === 'active');
  if (eligible.length === 0) eligible = campaigns;
  if (eligible.length === 0) return null;

  // 2. Filter by device
  let deviceEligible = eligible.filter((ad) => !ad.targetDevices || ad.targetDevices.length === 0 || ad.targetDevices.includes(device));
  if (deviceEligible.length === 0) deviceEligible = eligible;

  // 3. Filter by format with automatic responsive adaptation
  let formatEligible = deviceEligible;
  if (format && format !== 'auto') {
    const formatNormalized = format.toLowerCase();
    formatEligible = deviceEligible.filter((ad) => {
      if (ad.format === 'responsive_native') return true;
      if (formatNormalized.includes('728') || formatNormalized.includes('leaderboard')) {
        return ad.format === 'leaderboard_728x90';
      }
      if (formatNormalized.includes('300') || formatNormalized.includes('rectangle')) {
        return ad.format === 'rectangle_300x250';
      }
      if (formatNormalized.includes('320') || formatNormalized.includes('mobile')) {
        return ad.format === 'mobile_320x50';
      }
      if (formatNormalized.includes('160') || formatNormalized.includes('skyscraper')) {
        return ad.format === 'skyscraper_160x600';
      }
      return ad.format === format;
    });
  }
  // If no campaign strictly matches format, adapt any available user campaign
  if (formatEligible.length === 0) formatEligible = deviceEligible;

  // Filter out already displayed ads if alternates exist to rotate ads across slots
  let candidatePool = formatEligible;
  if (excludeIds && excludeIds.length > 0) {
    const unshown = formatEligible.filter((ad) => !excludeIds.includes(ad.id));
    if (unshown.length > 0) candidatePool = unshown;
  }

  // 4. Bilingual Hindi & English Keyword / Category matching
  const expandedInterests = expandInterestsWithHindi(interests);
  let categoryMatches: AdCreative[] = [];

  if (expandedInterests.length > 0) {
    categoryMatches = candidatePool.filter((ad) => {
      const adCat = (ad.category || '').toLowerCase();
      const catMatch = expandedInterests.some((i) => adCat.includes(i) || i.includes(adCat));
      const tagMatch = (ad.tags || []).some((t) => 
        expandedInterests.some((i) => t.toLowerCase().includes(i) || i.includes(t.toLowerCase()))
      );
      const nameMatch = (ad.name || '').toLowerCase().split(' ').some((w) => expandedInterests.includes(w));
      return catMatch || tagMatch || nameMatch;
    });
  }

  // CRITICAL USER REQUIREMENT:
  // "if no keyword found on page it shoud show randome ads ok"
  // If categoryMatches is empty (no keyword matched on page), OR if randomize is explicitly enabled:
  // Pick an ad at random from candidatePool!
  if (categoryMatches.length === 0 || randomize) {
    const pool = categoryMatches.length > 0 ? categoryMatches : candidatePool;
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex] || null;
  }

  // 5. When valid keyword matches exist and randomize is false: Weighted selection with boosts
  const weightedList: { ad: AdCreative; totalWeight: number }[] = categoryMatches.map((ad) => {
    let weight = Math.max(1, ad.weight || 50);

    // Boost if user interests match ad tags or category
    if (expandedInterests.length > 0) {
      const adCat = (ad.category || '').toLowerCase();
      const hasCategoryMatch = expandedInterests.some((i) => adCat.includes(i) || i.includes(adCat));
      if (hasCategoryMatch) weight += 50;

      const tagMatchCount = (ad.tags || []).filter((tag) => 
        expandedInterests.some((i) => tag.toLowerCase().includes(i))
      ).length;
      weight += tagMatchCount * 25;
    }

    // Apply active targeting rules
    targetingRules.filter((r) => r.active).forEach((rule) => {
      if (rule.targetCategory === ad.category) {
        if (expandedInterests.length > 0) {
          const ruleKeywords = rule.keyword.split(',').map((k) => k.trim().toLowerCase());
          const matches = ruleKeywords.some((k) => expandedInterests.includes(k));
          if (matches) {
            weight += rule.weightBoost;
          }
        }
      }
    });

    return { ad, totalWeight: weight };
  });

  const totalWeightSum = weightedList.reduce((acc, curr) => acc + curr.totalWeight, 0);
  let randomValue = Math.random() * totalWeightSum;

  for (const item of weightedList) {
    if (randomValue < item.totalWeight) {
      return item.ad;
    }
    randomValue -= item.totalWeight;
  }

  return weightedList[0]?.ad || null;
}

/**
 * Builds affiliate destination URL with standardized tracking UTMs
 */
export function buildAffiliateUrl(ad: AdCreative, slotId: string = 'header'): string {
  try {
    const url = new URL(ad.destinationUrl);
    url.searchParams.set('utm_source', 'adpulse');
    url.searchParams.set('utm_medium', 'affiliate_display');
    url.searchParams.set('utm_campaign', ad.name.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    url.searchParams.set('utm_content', `${ad.format}_${slotId}`);
    return url.toString();
  } catch {
    return ad.destinationUrl;
  }
}

/**
 * Formats currency in USD with tabular decimals
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formats large counts with tabular grouping
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}
