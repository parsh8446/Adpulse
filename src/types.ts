/**
 * AdPulse Core TypeScript Definitions (v3.5.1)
 */
export type AdFormat = 
  | 'leaderboard_728x90' 
  | 'rectangle_300x250' 
  | 'mobile_320x50' 
  | 'skyscraper_160x600' 
  | 'responsive_native';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export type AdCategory = 
  | 'Hosting & Cloud'
  | 'VPN & Security'
  | 'SaaS & Productivity'
  | 'eCommerce & Marketing'
  | 'Developer Tools'
  | 'Finance & Crypto'
  | 'General';

export interface AdCreative {
  id: string;
  name: string;
  advertiser: string;
  format: AdFormat;
  headline: string;
  description: string;
  callToAction: string;
  destinationUrl: string; // The affiliate link
  displayUrl: string;
  imageUrl?: string; // Product photo or brand creative image URL
  price?: string; // Optional product price (e.g. $49.00)
  originalPrice?: string; // Optional crossed-out price (e.g. $99.00)
  badgeText?: string;
  category: AdCategory;
  tags: string[];
  weight: number; // 1 - 100 for A/B rotation probability
  status: 'active' | 'paused';
  targetDevices: DeviceType[];
  estimatedEPC: number; // Estimated Earnings Per Click ($)
  accentColor?: string;
  createdAt: string;
}

export interface AdEventLog {
  id: string;
  adId: string;
  adName: string;
  eventType: 'impression' | 'viewable_impression' | 'click';
  timestamp: string;
  device: DeviceType;
  category: AdCategory;
  placementSlot: string;
  pageUrl: string;
  revenue: number;
}

export interface SecurityConfig {
  isPasscodeProtected: boolean;
  masterPasscode: string;
  isUnlocked: boolean;
  sessionTimeoutMinutes: number;
  allowedDomains: string[];
  blockUnlistedDomains: boolean;
  clickDebounceSeconds: number;
  filterBots: boolean;
}

export interface DeliveryConfig {
  randomizeAds: boolean; // Randomize ad rotation / shuffle across all active campaigns
  fallbackAllPages: boolean; // Show ads on every page despite category if no category found (wildcard fallback)
  inArticleDensity: 'high' | 'medium' | 'low'; // High: every 3 paragraphs, Medium: every 5 paragraphs, Low: single ad
  maxArticleAds: number; // Max ads inside one article (default 4-5)
  syncEndpoint: string; // The backend or worker URL for dynamic ad synchronization
}

export interface AdPerformanceStats {
  adId: string;
  name: string;
  impressions: number;
  viewableImpressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
  epc: number;
}

export interface TargetingRule {
  id: string;
  name: string;
  keyword: string;
  targetCategory: AdCategory;
  weightBoost: number; // e.g. +50% priority
  active: boolean;
}

export type ActiveTab = 
  | 'overview' 
  | 'campaigns' 
  | 'targeting' 
  | 'embed' 
  | 'simulator' 
  | 'security';
