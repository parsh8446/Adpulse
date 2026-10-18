/**
 * AdPulse Cloudflare D1 REST API Client for Node.js / Express (Render Host)
 * Allows servers hosted on Render to persist campaigns directly to Cloudflare D1 SQL.
 */
import fs from 'fs';
import path from 'path';

export interface D1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
  enabled: boolean;
}

const CONFIG_PATH = path.join(process.cwd(), 'data', 'd1_config.json');

// Read config from env or persisted file
export function getD1Config(): D1Config {
  const envConfig: D1Config = {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    databaseId: process.env.CLOUDFLARE_DATABASE_ID || '',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    enabled: Boolean(process.env.CLOUDFLARE_DATABASE_ID && process.env.CLOUDFLARE_API_TOKEN)
  };

  if (envConfig.enabled) {
    return envConfig;
  }

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const saved = JSON.parse(raw);
      if (saved && saved.databaseId && saved.apiToken) {
        return {
          accountId: saved.accountId || '',
          databaseId: saved.databaseId,
          apiToken: saved.apiToken,
          enabled: true
        };
      }
    } catch (e) {
      console.error('[D1 Client] Failed to read d1_config.json:', e);
    }
  }

  return envConfig;
}

export function saveD1Config(config: Partial<D1Config>): void {
  const current = getD1Config();
  const updated: D1Config = {
    accountId: config.accountId !== undefined ? config.accountId.trim() : current.accountId,
    databaseId: config.databaseId !== undefined ? config.databaseId.trim() : current.databaseId,
    apiToken: config.apiToken !== undefined ? config.apiToken.trim() : current.apiToken,
    enabled: Boolean((config.databaseId || current.databaseId) && (config.apiToken || current.apiToken))
  };

  const dataDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  console.log('[D1 Client] Saved updated D1 configuration to disk.');
}

/**
 * Execute a single SQL query against Cloudflare D1 over REST API
 */
export async function executeD1Query<T = any>(
  sql: string,
  params: any[] = [],
  customConfig?: Partial<D1Config>
): Promise<T[]> {
  const config = { ...getD1Config(), ...(customConfig || {}) };

  if (!config.accountId || !config.databaseId || !config.apiToken) {
    throw new Error('Cloudflare D1 credentials missing (Account ID, Database ID, or API Token)');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudflare D1 HTTP ${res.status}: ${errorText}`);
  }

  const data: any = await res.json();
  if (!data.success) {
    const msg = data.errors?.map((e: any) => e.message).join(', ') || 'Unknown D1 error';
    throw new Error(`D1 Query Error: ${msg}`);
  }

  const firstResult = data.result?.[0];
  return (firstResult?.results || []) as T[];
}

/**
 * Tests connection to Cloudflare D1
 */
export async function testD1Connection(
  accountId: string,
  databaseId: string,
  apiToken: string
): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await executeD1Query('SELECT 1 as ping;', [], { accountId, databaseId, apiToken });
    const latencyMs = Date.now() - start;
    return { success: true, latencyMs };
  } catch (err: any) {
    return { success: false, latencyMs: Date.now() - start, error: err.message };
  }
}

/**
 * Auto-creates tables in Cloudflare D1 if they don't exist
 */
export async function initD1Tables(customConfig?: Partial<D1Config>): Promise<void> {
  const createSql = `
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      advertiser TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'responsive_native',
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
      tags TEXT DEFAULT '[]',
      weight INTEGER DEFAULT 50,
      status TEXT DEFAULT 'active',
      target_devices TEXT DEFAULT '["desktop", "mobile", "tablet"]',
      estimated_epc REAL DEFAULT 1.5,
      accent_color TEXT DEFAULT '#4F46E5',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `;
  await executeD1Query(createSql, [], customConfig);
  console.log('[D1 Client] Ensured campaigns table exists in Cloudflare D1.');
}

/**
 * Fetches all active campaigns from Cloudflare D1 SQL
 */
export async function fetchD1Campaigns(): Promise<any[]> {
  const rows = await executeD1Query<any>(`
    SELECT * FROM campaigns 
    WHERE status = 'active' 
    ORDER BY weight DESC, created_at DESC;
  `);

  return rows.map((row) => {
    let tags: string[] = [];
    try {
      tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []);
    } catch {}

    let targetDevices = ['desktop', 'mobile', 'tablet'];
    try {
      targetDevices = typeof row.target_devices === 'string' ? JSON.parse(row.target_devices) : (row.target_devices || targetDevices);
    } catch {}

    return {
      id: row.id,
      name: row.name,
      advertiser: row.advertiser,
      format: row.format || 'responsive_native',
      headline: row.headline,
      description: row.description || '',
      callToAction: row.call_to_action || 'Claim Deal',
      destinationUrl: row.destination_url,
      displayUrl: row.display_url || '',
      imageUrl: row.image_url || '',
      price: row.price || '',
      originalPrice: row.original_price || undefined,
      badgeText: row.badge_text || '',
      category: row.category || 'General',
      tags,
      weight: typeof row.weight === 'number' ? row.weight : 50,
      status: row.status || 'active',
      targetDevices,
      estimatedEPC: typeof row.estimated_epc === 'number' ? row.estimated_epc : 1.5,
      accentColor: row.accent_color || '#4F46E5',
      createdAt: row.created_at || new Date().toISOString()
    };
  });
}

/**
 * Saves/upserts an array of campaigns into Cloudflare D1 SQL
 */
export async function saveD1Campaigns(campaigns: any[]): Promise<number> {
  await initD1Tables();

  let savedCount = 0;
  for (const c of campaigns) {
    const tagsStr = Array.isArray(c.tags) ? JSON.stringify(c.tags) : '[]';
    const devicesStr = Array.isArray(c.targetDevices) ? JSON.stringify(c.targetDevices) : '["desktop","mobile","tablet"]';

    const sql = `
      INSERT INTO campaigns (
        id, name, advertiser, format, headline, description,
        call_to_action, destination_url, display_url, image_url,
        price, original_price, badge_text, category, tags,
        weight, status, target_devices, estimated_epc, accent_color, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        advertiser = excluded.advertiser,
        format = excluded.format,
        headline = excluded.headline,
        description = excluded.description,
        call_to_action = excluded.call_to_action,
        destination_url = excluded.destination_url,
        display_url = excluded.display_url,
        image_url = excluded.image_url,
        price = excluded.price,
        original_price = excluded.original_price,
        badge_text = excluded.badge_text,
        category = excluded.category,
        tags = excluded.tags,
        weight = excluded.weight,
        status = excluded.status,
        target_devices = excluded.target_devices,
        estimated_epc = excluded.estimated_epc,
        accent_color = excluded.accent_color,
        updated_at = datetime('now');
    `;

    const params = [
      c.id, c.name, c.advertiser, c.format || 'responsive_native', c.headline, c.description || '',
      c.callToAction || 'Claim Deal', c.destinationUrl, c.displayUrl || '', c.imageUrl || '',
      c.price || '', c.originalPrice || null, c.badgeText || '', c.category || 'General', tagsStr,
      typeof c.weight === 'number' ? c.weight : 50, c.status || 'active', devicesStr,
      typeof c.estimatedEPC === 'number' ? c.estimatedEPC : 1.5, c.accentColor || '#4F46E5'
    ];

    await executeD1Query(sql, params);
    savedCount++;
  }

  console.log(`[D1 Client] Persisted ${savedCount} campaigns to Cloudflare D1 SQL.`);
  return savedCount;
}
