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

// Middleware
app.use(express.json({ limit: '15mb' }));

// Universal CORS Middleware for ad delivery across any publisher website
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// API Routes

/**
 * GET /api/campaigns
 * Returns live active campaigns for the ad tag
 * With strict no-cache headers so websites always get latest ads immediately
 */
app.get('/api/campaigns', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json(campaignsStore);
});

/**
 * POST /api/campaigns
 * Dashboard saves new, updated, or deleted campaigns
 * Automatically syncs with disk and all active websites
 */
app.post('/api/campaigns', (req, res) => {
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
