/**
 * AdPulse Local & Production Express Server (v3.5.1)
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Data persistence file path
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'campaigns.json');
const SECURITY_FILE = path.join(DATA_DIR, 'security.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory campaigns store
let campaignsStore: any[] = [];

// Load initial campaigns if data file exists
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    campaignsStore = JSON.parse(raw);
    console.log(`[AdPulse Server] Loaded ${campaignsStore.length} saved campaigns from disk.`);
  } catch (err) {
    console.error('[AdPulse Server] Failed to read campaigns.json:', err);
  }
}

// Security Configuration (Password Lock & Domain Whitelisting)
interface ServerSecurityConfig {
  masterPasscode: string;
  isPasscodeProtected: boolean;
  allowedDomains: string[];
  blockUnlistedDomains: boolean;
}

let securityConfig: ServerSecurityConfig = {
  masterPasscode: process.env.ADMIN_PASSCODE || '2026',
  isPasscodeProtected: true,
  allowedDomains: ['localhost', 'elaannews.in'],
  blockUnlistedDomains: false
};

if (fs.existsSync(SECURITY_FILE)) {
  try {
    const rawSec = fs.readFileSync(SECURITY_FILE, 'utf-8');
    securityConfig = { ...securityConfig, ...JSON.parse(rawSec) };
    console.log('[AdPulse Server] Loaded security settings from disk. Passcode protection is active.');
  } catch (err) {
    console.error('[AdPulse Server] Failed to read security.json:', err);
  }
}

// Middleware
app.use(express.json({ limit: '15mb' }));

// Universal CORS Middleware for ad delivery across any publisher website
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Adpulse-Passcode');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Admin Passcode Authentication Middleware (Protects POST/PUT/DELETE mutations)
function verifyAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!securityConfig.isPasscodeProtected) {
    return next();
  }
  const provided = 
    req.headers['x-adpulse-passcode'] ||
    (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : null) ||
    req.query.passcode ||
    (req.body && (req.body.adminPasscode || req.body.passcode));

  const configuredPasscode = String(securityConfig.masterPasscode || '').trim();
  const envPasscode = String(process.env.ADMIN_PASSCODE || '').trim();

  // Security Hardening: If owner sets a custom secret in Render or settings,
  // strictly enforce ONLY that secret. Do not accept default 2026.
  const validSet = new Set<string>();
  if (envPasscode) {
    validSet.add(envPasscode);
  } else if (configuredPasscode && configuredPasscode !== '2026') {
    validSet.add(configuredPasscode);
  } else {
    // Only accept initial setup default 2026 if no custom secret has been set yet
    validSet.add('2026');
  }

  if (provided && validSet.has(String(provided).trim())) {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized: Valid admin passcode required to modify campaigns or database settings.',
    code: 'PASSCODE_REQUIRED'
  });
}

import { 
  getD1Config, 
  saveD1Config, 
  fetchD1Campaigns, 
  saveD1Campaigns, 
  testD1Connection, 
  initD1Tables 
} from './src/server/d1Client';

// API Routes

/**
 * GET /api/campaigns
 * Public ad serving endpoint: returns active campaigns from Cloudflare D1 SQL (or local fallback)
 * Strictly NO admin passcode required so publisher websites and visitors can always view ads!
 */
app.get('/api/campaigns', async (req, res) => {
  // Domain whitelist check if enabled
  if (securityConfig.blockUnlistedDomains && securityConfig.allowedDomains.length > 0) {
    const referer = req.headers.referer || req.headers.origin || '';
    if (referer) {
      try {
        const refHost = new URL(referer).hostname.toLowerCase();
        const isAllowed = securityConfig.allowedDomains.some(d => 
          refHost === d.toLowerCase() || refHost.endsWith('.' + d.toLowerCase())
        );
        if (!isAllowed) {
          console.warn(`[AdPulse Security] Blocked unlisted domain request from: ${refHost}`);
          return res.status(403).json({ error: 'Domain not authorized in AdPulse security settings' });
        }
      } catch {}
    }
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Try Cloudflare D1 SQL first if configured
  const d1Config = getD1Config();
  if (d1Config.enabled) {
    try {
      const d1Campaigns = await fetchD1Campaigns();
      if (d1Campaigns && d1Campaigns.length > 0) {
        res.setHeader('X-AdPulse-Storage', 'cloudflare_d1');
        return res.json(d1Campaigns);
      }
    } catch (err: any) {
      console.warn('[AdPulse Server] D1 fetch failed, falling back to local memory/disk:', err.message);
    }
  }

  res.setHeader('X-AdPulse-Storage', 'local_disk');
  res.json(campaignsStore);
});

/**
 * POST /api/campaigns
 * Protected: Requires master passcode to save, update, or delete campaigns!
 * Persists to both Cloudflare D1 SQL and local disk!
 */
app.post('/api/campaigns', verifyAdminAuth, async (req, res) => {
  const newCampaigns = req.body;
  if (!Array.isArray(newCampaigns)) {
    return res.status(400).json({ error: 'Body must be an array of campaigns' });
  }

  campaignsStore = newCampaigns;

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(campaignsStore, null, 2), 'utf-8');
    console.log(`[AdPulse Server] Persisted ${campaignsStore.length} campaigns to disk.`);
  } catch (err) {
    console.error('[AdPulse Server] Error saving to campaigns.json:', err);
  }

  let storageType = 'local_disk';
  const d1Config = getD1Config();
  if (d1Config.enabled) {
    try {
      await saveD1Campaigns(campaignsStore);
      storageType = 'cloudflare_d1';
      console.log(`[AdPulse Server] Successfully synced ${campaignsStore.length} campaigns to Cloudflare D1 SQL.`);
    } catch (d1Err: any) {
      console.error('[AdPulse Server] Failed to save to D1 SQL:', d1Err.message);
    }
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    count: campaignsStore.length,
    storage: storageType,
    updatedAt: new Date().toISOString()
  });
});

/**
 * GET /api/database/status
 * Returns current database configuration and health
 */
app.get('/api/database/status', (req, res) => {
  const config = getD1Config();
  res.json({
    enabled: config.enabled,
    storageType: config.enabled ? 'cloudflare_d1' : 'local_disk',
    databaseId: config.databaseId ? config.databaseId.substring(0, 8) + '...' : '',
    accountId: config.accountId ? config.accountId.substring(0, 6) + '...' : '',
    campaignCount: campaignsStore.length
  });
});

/**
 * POST /api/database/configure
 * Protected: Configures Cloudflare D1 credentials, tests connection, and auto-provisions tables
 */
app.post('/api/database/configure', verifyAdminAuth, async (req, res) => {
  const { accountId, databaseId, apiToken } = req.body || {};

  if (!accountId || !databaseId || !apiToken) {
    return res.status(400).json({ error: 'Account ID, Database ID, and API Token are all required' });
  }

  const test = await testD1Connection(accountId, databaseId, apiToken);
  if (!test.success) {
    return res.status(400).json({
      success: false,
      error: `Could not connect to Cloudflare D1: ${test.error || 'Connection failed'}. Please check Account ID, Database ID, and API Token.`
    });
  }

  try {
    saveD1Config({ accountId, databaseId, apiToken, enabled: true });
    await initD1Tables({ accountId, databaseId, apiToken });
    if (campaignsStore.length > 0) {
      await saveD1Campaigns(campaignsStore);
    }
    return res.json({
      success: true,
      message: 'Successfully connected to Cloudflare D1 SQL! Tables created and campaigns synced.',
      latencyMs: test.latencyMs
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/security/verify
 * Checks if a provided passcode is valid for the dashboard
 */
app.post('/api/security/verify', (req, res) => {
  const { passcode } = req.body || {};
  if (!securityConfig.isPasscodeProtected) {
    return res.json({ success: true, isProtected: false });
  }
  if (String(passcode) === String(securityConfig.masterPasscode)) {
    return res.json({ success: true, isProtected: true });
  }
  return res.status(401).json({ success: false, error: 'Incorrect passcode' });
});

/**
 * POST /api/security/update
 * Protected: Updates passcode and domain security settings on disk
 */
app.post('/api/security/update', verifyAdminAuth, (req, res) => {
  const { newPasscode, allowedDomains, blockUnlistedDomains, isPasscodeProtected } = req.body || {};
  if (newPasscode) {
    securityConfig.masterPasscode = String(newPasscode);
  }
  if (Array.isArray(allowedDomains)) {
    securityConfig.allowedDomains = allowedDomains;
  }
  if (typeof blockUnlistedDomains === 'boolean') {
    securityConfig.blockUnlistedDomains = blockUnlistedDomains;
  }
  if (typeof isPasscodeProtected === 'boolean') {
    securityConfig.isPasscodeProtected = isPasscodeProtected;
  }

  try {
    fs.writeFileSync(SECURITY_FILE, JSON.stringify(securityConfig, null, 2), 'utf-8');
    console.log('[AdPulse Server] Security configuration updated and saved to disk.');
  } catch (err) {
    console.error('[AdPulse Server] Error saving security.json:', err);
  }

  return res.json({ success: true, message: 'Security settings updated successfully' });
});

/**
 * GET /api/status
 * Health check & sync info
 */
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    campaignCount: campaignsStore.length,
    activeCampaigns: campaignsStore.filter(c => c.status === 'active').length,
    timestamp: new Date().toISOString()
  });
});

/**
 * Serve ad-tag.js dynamically with fresh headers (prevents browser/CDN caching)
 */
app.get('/ad-tag.js', (req, res) => {
  const adTagPath = path.join(__dirname, 'public', 'ad-tag.js');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (fs.existsSync(adTagPath)) {
    res.sendFile(adTagPath);
  } else {
    res.status(404).send('// ad-tag.js not found');
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[AdPulse] Server running on http://0.0.0.0:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

startServer();
