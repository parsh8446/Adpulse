-- ============================================================================
-- AdPulse Cloudflare D1 Database Schema
-- Production SQL schema for Edge-native affiliate ad serving
-- ============================================================================

-- 1. Campaigns Table: Stores all active affiliate ad creatives
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  advertiser TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'responsive_native', -- leaderboard_728x90, rectangle_300x250, mobile_320x50, skyscraper_160x600, responsive_native
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
  tags TEXT DEFAULT '[]', -- JSON array of tags: ["deal", "shopping"]
  weight INTEGER DEFAULT 50, -- 1 to 100 priority weighting
  status TEXT DEFAULT 'active', -- active, paused, archived
  target_devices TEXT DEFAULT '["desktop", "mobile", "tablet"]', -- JSON array
  estimated_epc REAL DEFAULT 1.5,
  accent_color TEXT DEFAULT '#4F46E5',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Security & Access Control Table
CREATE TABLE IF NOT EXISTS security_settings (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  master_passcode TEXT NOT NULL DEFAULT '2026',
  is_passcode_protected INTEGER DEFAULT 1, -- 1 = true, 0 = false
  allowed_domains TEXT DEFAULT '["localhost", "elaannews.in"]', -- JSON array
  block_unlisted_domains INTEGER DEFAULT 0,
  click_debounce_seconds INTEGER DEFAULT 15,
  filter_bots INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Live Analytics & Click Fraud Tracking Table
CREATE TABLE IF NOT EXISTS ad_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- impression, click
  slot_id TEXT,
  device TEXT,
  category TEXT,
  page_url TEXT,
  referer TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for ultra-fast edge queries
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_format ON campaigns(format);
CREATE INDEX IF NOT EXISTS idx_ad_events_campaign ON ad_events(campaign_id, event_type);
CREATE INDEX IF NOT EXISTS idx_ad_events_created ON ad_events(created_at);

-- Initial Security Seed
INSERT OR REPLACE INTO security_settings (id, master_passcode, is_passcode_protected, allowed_domains, block_unlisted_domains)
VALUES ('primary', '2026', 1, '["localhost", "elaannews.in"]', 0);

-- Initial Active Campaigns Seed (Your 5 real campaigns)
INSERT OR REPLACE INTO campaigns (
  id, name, advertiser, format, headline, description, call_to_action, destination_url, display_url, image_url, price, original_price, badge_text, category, tags, weight, status, target_devices, estimated_epc, accent_color
) VALUES 
(
  'ad_bulk_1792241032630_1_tz2z',
  'Lifelong Trike Cycle for Kids 2-5 Years - Tricycle for Boys & Girls',
  'Amazone.in',
  'responsive_native',
  'Lifelong Trike Cycle for Kids 2-5 Years - Tricycle for Boys & Girls',
  'Lifelong Trike Cycle for Kids 2-5 Years - Tricycle for Boys & Girls with Front and Back Baskets, EVA Wheels, and Anti Slip Grip Handlebar (Yellow)',
  'Claim Free Trial',
  'https://link.amazon/B0hzfC5Sd',
  'amazon.in/tricycle-deal',
  'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=500&q=80',
  '₹1,099',
  '₹5,999',
  'Special Offer',
  'eCommerce & Marketing',
  '["kids", "cycle", "toy", "amazon", "shopping"]',
  100,
  'active',
  '["desktop", "mobile", "tablet"]',
  2.5,
  '#4F46E5'
),
(
  'ad_bulk_1792241032630_2_n1i0',
  'Min 80% Off on Libas',
  'Myntra',
  'responsive_native',
  'Myntra Festival Deal 80% off on Libas',
  'Festive Deal on Myntra get it now! Dont miss this limited time fashion discount.',
  'Claim Discount Now!',
  'https://myntr.it/5uD3sBe',
  'myntra.com/libas-festive',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80',
  'Min 80% Off on Libas',
  NULL,
  'Special Offer',
  'eCommerce & Marketing',
  '["fashion", "libas", "myntra", "clothing", "sale"]',
  90,
  'active',
  '["desktop", "mobile", "tablet"]',
  3.1,
  '#4F46E5'
),
(
  'ad_bulk_1792241032630_3_yjsf',
  'Flat 70% Off on Levis Jeans',
  'Flipkart',
  'rectangle_300x250',
  'GREAT INDIAN FESTIVAL IS LIVE! Get Upto 80% Off Across Categories',
  'Shop Mobiles, Fashion, Beauty, Kitchen & more on Flipkart Great Indian Festival.',
  'Claim discount Now!',
  'https://fktr.in/xsZDgoz',
  'flipkart.com/levis-jeans',
  'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&q=80',
  'Flat 70% Off on Levis Jeans',
  NULL,
  'Special Offer',
  'eCommerce & Marketing',
  '["cloths", "pants", "jeanse", "flipkart", "fashion"]',
  90,
  'active',
  '["desktop", "mobile", "tablet"]',
  2.8,
  '#79bb16'
),
(
  'ad_bulk_1792241032630_4_19y7',
  'Best Offers on Electronics, Mobiles & More',
  'Flipkart',
  'responsive_native',
  'BIG BILLION DAYS SALE IS LIVE! Get Upto 85% Off Across Categories',
  'Best Offers on Electronics, Mobiles, Laptops, Audio, & Accessories.',
  'Claim 80% off',
  'https://fktr.in/WpaHfgG',
  'flipkart.com/electronics-sale',
  'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&q=80',
  '85% off',
  NULL,
  'Special Offer',
  'eCommerce & Marketing',
  '["electronics", "mobiles", "gadgets", "tech", "flipkart"]',
  80,
  'active',
  '["desktop", "mobile", "tablet"]',
  3.4,
  '#47e64a'
),
(
  'ad_bulk_1792241032630_5_k7px',
  'AJIO sandle',
  'AJIO',
  'rectangle_300x250',
  'Min 40% Off on Crocs',
  'Visit AJIO now for flat 40% Off claim your discount now! Top footwear brand.',
  'Buy Now!',
  'https://ajiio.in/yxtOdhp',
  'ajio.com/crocs-discount',
  'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&q=80',
  '₹1,378',
  NULL,
  'Special Offer',
  'General',
  '["footwear", "sandals", "crocs", "ajio", "shoes"]',
  80,
  'active',
  '["desktop", "mobile", "tablet"]',
  1.9,
  '#48e552'
);
