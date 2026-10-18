/**
 * AdPulse Sample Templates & Initial Defaults (v3.5.1)
 */
import { AdCreative, AdEventLog, SecurityConfig, TargetingRule } from '../types';

export const INITIAL_CAMPAIGNS: AdCreative[] = [
  {
    id: 'ad_cloudflare_01',
    name: 'Cloudflare Edge CDN & Security',
    advertiser: 'Cloudflare Inc.',
    format: 'leaderboard_728x90',
    headline: 'Deploy in Seconds on the Global Edge Network',
    description: 'Ultra-fast CDN, DDoS mitigation, and Serverless Workers at near-zero latency.',
    callToAction: 'Get Started Free',
    destinationUrl: 'https://cloudflare.com/?ref=affiliate_adpulse',
    displayUrl: 'cloudflare.com/global-edge',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80',
    price: '$20/mo',
    badgeText: 'Top Pick',
    category: 'Hosting & Cloud',
    tags: ['cdn', 'edge', 'hosting', 'serverless', 'webdev', 'speed'],
    weight: 85,
    status: 'active',
    targetDevices: ['desktop', 'mobile', 'tablet'],
    estimatedEPC: 1.45,
    accentColor: '#F38020',
    createdAt: '2026-10-01'
  },
  {
    id: 'ad_nordvpn_02',
    name: 'NordVPN Threat Protection',
    advertiser: 'Nord Security',
    format: 'rectangle_300x250',
    headline: 'Block Trackers & Secure Your Connection',
    description: 'Next-gen encryption with lightning speeds across 110+ countries. 30-day money-back guarantee.',
    callToAction: 'Claim 68% Off',
    destinationUrl: 'https://nordvpn.com/order/?coupon=PULSE68&aff=adpulse',
    displayUrl: 'nordvpn.com/special-deal',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80',
    price: '$3.19/mo',
    originalPrice: '$11.59/mo',
    badgeText: '68% Discount',
    category: 'VPN & Security',
    tags: ['vpn', 'security', 'privacy', 'encryption', 'wifi'],
    weight: 90,
    status: 'active',
    targetDevices: ['desktop', 'mobile', 'tablet'],
    estimatedEPC: 2.10,
    accentColor: '#4687FF',
    createdAt: '2026-10-02'
  },
  {
    id: 'ad_shopify_03',
    name: 'Shopify $1/mo Starter Promotion',
    advertiser: 'Shopify Global',
    format: 'responsive_native',
    headline: 'Build Your Online Store for $1 per Month',
    description: 'Turn your passion into a thriving e-commerce empire with world-class checkout conversion.',
    callToAction: 'Start $1 Trial',
    destinationUrl: 'https://shopify.com/free-trial?ref=adpulse_partner',
    displayUrl: 'shopify.com/online-store',
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=400&q=80',
    price: '$1/mo',
    originalPrice: '$39/mo',
    badgeText: 'Trending',
    category: 'eCommerce & Marketing',
    tags: ['ecommerce', 'shop', 'online store', 'selling', 'marketing'],
    weight: 75,
    status: 'active',
    targetDevices: ['desktop', 'mobile', 'tablet'],
    estimatedEPC: 1.85,
    accentColor: '#96BF48',
    createdAt: '2026-10-05'
  },
  {
    id: 'ad_semrush_04',
    name: 'Semrush Competitive Intelligence',
    advertiser: 'Semrush Suite',
    format: 'skyscraper_160x600',
    headline: 'Outrank Your Rivals with Deep SEO Audits',
    description: 'Uncover keyword gaps, monitor backlinks, and track Google rankings in real time.',
    callToAction: 'Try Free for 14 Days',
    destinationUrl: 'https://semrush.com/trial/?promo=ADPULSE14',
    displayUrl: 'semrush.com/seo-suite',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80',
    price: '$129.95/mo',
    originalPrice: '$159.95/mo',
    badgeText: 'Pro Deal',
    category: 'eCommerce & Marketing',
    tags: ['seo', 'google rank', 'marketing', 'keywords', 'backlinks'],
    weight: 60,
    status: 'active',
    targetDevices: ['desktop'],
    estimatedEPC: 2.80,
    accentColor: '#FF642D',
    createdAt: '2026-10-06'
  },
  {
    id: 'ad_supabase_05',
    name: 'Supabase Postgres & Realtime Backend',
    advertiser: 'Supabase Inc.',
    format: 'mobile_320x50',
    headline: 'Build in a Weekend. Scale to Millions.',
    description: 'Postgres database with instant REST APIs, auth, storage, and real-time subscriptions.',
    callToAction: 'Start Free Project',
    destinationUrl: 'https://supabase.com/?utm_source=adpulse',
    displayUrl: 'supabase.com/database',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&q=80',
    price: 'Free Tier',
    badgeText: 'Developer Choice',
    category: 'Developer Tools',
    tags: ['database', 'postgres', 'sql', 'backend', 'developer'],
    weight: 80,
    status: 'active',
    targetDevices: ['mobile', 'desktop'],
    estimatedEPC: 1.60,
    accentColor: '#3ECF8E',
    createdAt: '2026-10-08'
  },
  {
    id: 'ad_notion_06',
    name: 'Notion AI & Connected Workspace',
    advertiser: 'Notion Labs',
    format: 'rectangle_300x250',
    headline: 'One Workspace. Every Team & Project.',
    description: 'Replace fragmented wikis, docs, and project trackers with an elegant unified canvas.',
    callToAction: 'Try Notion Free',
    destinationUrl: 'https://notion.so/?aff=adpulse_partner',
    displayUrl: 'notion.so/product',
    imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&q=80',
    price: '$8/mo',
    originalPrice: '$12/mo',
    badgeText: 'Top Productivity',
    category: 'SaaS & Productivity',
    tags: ['productivity', 'notes', 'docs', 'projects', 'wiki'],
    weight: 70,
    status: 'active',
    targetDevices: ['desktop', 'mobile', 'tablet'],
    estimatedEPC: 1.25,
    accentColor: '#1E293B',
    createdAt: '2026-10-10'
  },
  {
    id: 'ad_digitalocean_07',
    name: 'DigitalOcean $200 Cloud Credit',
    advertiser: 'DigitalOcean LLC',
    format: 'leaderboard_728x90',
    headline: 'Deploy Scalable Virtual Machines in 55 Seconds',
    description: 'Simple cloud compute, managed Kubernetes, and fast NVMe storage for builders.',
    callToAction: 'Get $200 Credit',
    destinationUrl: 'https://m.do.co/c/adpulse_ref_200',
    displayUrl: 'digitalocean.com/pricing',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80',
    price: '$200 Free Credit',
    badgeText: 'New Users',
    category: 'Hosting & Cloud',
    tags: ['cloud', 'vps', 'droplet', 'hosting', 'devops'],
    weight: 75,
    status: 'active',
    targetDevices: ['desktop', 'mobile', 'tablet'],
    estimatedEPC: 2.15,
    accentColor: '#0080FF',
    createdAt: '2026-10-12'
  }
];

export const INITIAL_SECURITY_CONFIG: SecurityConfig = {
  isPasscodeProtected: true, // Master passcode lock enabled by default for full security
  masterPasscode: '2026',
  isUnlocked: false,
  sessionTimeoutMinutes: 60,
  allowedDomains: ['localhost', 'elaannews.in'],
  blockUnlistedDomains: false,
  clickDebounceSeconds: 15,
  filterBots: true
};

export const INITIAL_DELIVERY_CONFIG: import('../types').DeliveryConfig = {
  randomizeAds: true,
  fallbackAllPages: true,
  inArticleDensity: 'high',
  maxArticleAds: 4,
  syncEndpoint: 'https://ais-dev-upccxkzqkbg3eursq2worv-714991714322.asia-northeast1.run.app'
};

export const INITIAL_TARGETING_RULES: TargetingRule[] = [
  {
    id: 'rule_1',
    name: 'Developer & Tech Content Match',
    keyword: 'code,api,cloud,server,developer,git,database',
    targetCategory: 'Developer Tools',
    weightBoost: 75,
    active: true
  },
  {
    id: 'rule_2',
    name: 'Privacy & Security Articles',
    keyword: 'vpn,privacy,security,trackers,hack,firewall',
    targetCategory: 'VPN & Security',
    weightBoost: 90,
    active: true
  },
  {
    id: 'rule_3',
    name: 'Commerce & Online Business',
    keyword: 'store,shop,money,ecommerce,business,sales',
    targetCategory: 'eCommerce & Marketing',
    weightBoost: 60,
    active: true
  },
  {
    id: 'rule_4',
    name: 'Hosting & Infrastructure Guides',
    keyword: 'host,domain,wordpress,vps,server,cloudflare',
    targetCategory: 'Hosting & Cloud',
    weightBoost: 80,
    active: true
  }
];

// Generate realistic historic event logs for the past 7 days
export function generateHistoricLogs(): AdEventLog[] {
  const logs: AdEventLog[] = [];
  const devices: ('desktop' | 'mobile' | 'tablet')[] = ['desktop', 'desktop', 'desktop', 'mobile', 'mobile', 'tablet'];
  const placements = ['header_banner', 'in_content_1', 'in_content_2', 'sidebar_top', 'footer_banner'];
  const baseTimestamp = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Create aggregated realistic numbers across campaigns
  INITIAL_CAMPAIGNS.forEach((ad, index) => {
    const impressionCount = 120 + (index * 45) + Math.floor(Math.random() * 80);
    const clickCount = Math.max(3, Math.floor(impressionCount * (0.018 + (index * 0.003))));

    for (let i = 0; i < impressionCount; i++) {
      const timeOffset = Math.random() * 7 * 24 * 60 * 60 * 1000;
      const device = devices[Math.floor(Math.random() * devices.length)];
      const isViewable = Math.random() > 0.18; // ~82% viewability rate
      const timestamp = new Date(baseTimestamp + timeOffset).toISOString();

      logs.push({
        id: `imp_${ad.id}_${i}`,
        adId: ad.id,
        adName: ad.name,
        eventType: isViewable ? 'viewable_impression' : 'impression',
        timestamp,
        device,
        category: ad.category,
        placementSlot: placements[Math.floor(Math.random() * placements.length)],
        pageUrl: 'https://my-cool-website.com/posts/tech-guide',
        revenue: 0
      });
    }

    for (let c = 0; c < clickCount; c++) {
      const timeOffset = Math.random() * 7 * 24 * 60 * 60 * 1000;
      const device = devices[Math.floor(Math.random() * devices.length)];
      const timestamp = new Date(baseTimestamp + timeOffset).toISOString();

      logs.push({
        id: `clk_${ad.id}_${c}`,
        adId: ad.id,
        adName: ad.name,
        eventType: 'click',
        timestamp,
        device,
        category: ad.category,
        placementSlot: placements[Math.floor(Math.random() * placements.length)],
        pageUrl: 'https://my-cool-website.com/posts/tech-guide',
        revenue: Number((ad.estimatedEPC * (0.8 + Math.random() * 0.4)).toFixed(2))
      });
    }
  });

  // Sort chronologically descending
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); 
}
