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
    req.query.passcode;

  if (provided && String(provided) === String(securityConfig.masterPasscode)) {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized: Admin passcode required to modify campaigns or settings.',
    code: 'PASSCODE_REQUIRED'
  });
}

// API Routes

/**
 * GET /api/campaigns
 * Public ad serving endpoint: returns active campaigns for ad-tag.js
 * Strictly NO admin passcode required so publisher websites and visitors can always view ads!
 */
app.get('/api/campaigns', (req, res) => {
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
  res.json(campaignsStore);
});

/**
 * POST /api/campaigns
 * Protected: Requires master passcode to save, update, or delete campaigns!
 */
app.post('/api/campaigns', verifyAdminAuth, (req, res) => {
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

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    count: campaignsStore.length,
    updatedAt: new Date().toISOString()
  });
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
