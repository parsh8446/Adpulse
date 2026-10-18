/**
 * AdPulse Cloudflare D1 SQL Gateway & Edge Worker (_worker.js)
 * Full edge persistence on Cloudflare D1 SQL Database + universal CORS + live ad serving.
 */

// Helper to convert SQL snake_case row to frontend camelCase object
function formatCampaignRow(row) {
  let tags = [];
  try {
    tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []);
  } catch (e) {
    tags = [];
  }

  let targetDevices = ['desktop', 'mobile', 'tablet'];
  try {
    targetDevices = typeof row.target_devices === 'string' ? JSON.parse(row.target_devices) : (row.target_devices || targetDevices);
  } catch (e) {}

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
    tags: tags,
    weight: typeof row.weight === 'number' ? row.weight : 50,
    status: row.status || 'active',
    targetDevices: targetDevices,
    estimatedEPC: typeof row.estimated_epc === 'number' ? row.estimated_epc : 1.5,
    accentColor: row.accent_color || '#4F46E5',
    createdAt: row.created_at || new Date().toISOString()
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Universal Cross-Origin Headers for ad delivery
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Adpulse-Passcode, Accept',
      'Access-Control-Max-Age': '86400'
    };

    // 1. Handle CORS Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Helper: Verify Master Passcode for protected actions
    async function verifyAuth() {
      const provided =
        request.headers.get('x-adpulse-passcode') ||
        (request.headers.get('authorization') ? request.headers.get('authorization').replace(/^Bearer\s+/i, '') : null) ||
        url.searchParams.get('passcode');

      // Check against env var
      const expectedPasscode = (env && env.ADMIN_PASSCODE) ? env.ADMIN_PASSCODE : '2026';
      if (provided && String(provided) === String(expectedPasscode)) {
        return true;
      }

      // Check against D1 security_settings table if bound
      if (env && env.DB) {
        try {
          const res = await env.DB.prepare('SELECT master_passcode FROM security_settings WHERE id = ?').bind('primary').first();
          if (res && res.master_passcode && String(provided) === String(res.master_passcode)) {
            return true;
          }
        } catch (e) {}
      }

      return false;
    }

    // 2. Dynamic Campaigns API Endpoint: /api/campaigns
    if (url.pathname === '/api/campaigns' || url.pathname === '/api/campaigns/') {
      // POST: Save or update campaigns in Cloudflare D1
      if (request.method === 'POST') {
        const isAuthorized = await verifyAuth();
        if (!isAuthorized) {
          return new Response(JSON.stringify({ 
            error: 'Unauthorized: Admin passcode required to save campaigns.',
            code: 'PASSCODE_REQUIRED'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
          });
        }

        try {
          const body = await request.json();
          if (!Array.isArray(body)) {
            return new Response(JSON.stringify({ error: 'Body must be an array of campaigns' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
            });
          }

          // If Cloudflare D1 is bound, execute transactional save
          if (env && env.DB) {
            try {
              // Create tables if they do not exist
              await env.DB.exec(`
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
              `);

              // Upsert each campaign into D1
              const stmts = body.map((c) => {
                const tagsStr = Array.isArray(c.tags) ? JSON.stringify(c.tags) : '[]';
                const devicesStr = Array.isArray(c.targetDevices) ? JSON.stringify(c.targetDevices) : '["desktop","mobile","tablet"]';

                return env.DB.prepare(`
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
                `).bind(
                  c.id, c.name, c.advertiser, c.format || 'responsive_native', c.headline, c.description || '',
                  c.callToAction || 'Claim Deal', c.destinationUrl, c.displayUrl || '', c.imageUrl || '',
                  c.price || '', c.originalPrice || null, c.badgeText || '', c.category || 'General', tagsStr,
                  typeof c.weight === 'number' ? c.weight : 50, c.status || 'active', devicesStr,
                  typeof c.estimatedEPC === 'number' ? c.estimatedEPC : 1.5, c.accentColor || '#4F46E5'
                );
              });

              await env.DB.batch(stmts);

              return new Response(JSON.stringify({ 
                success: true, 
                count: body.length, 
                storage: 'cloudflare_d1',
                updatedAt: new Date().toISOString()
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
              });
            } catch (dbErr) {
              console.error('D1 Error:', dbErr);
            }
          }

          // Fallback to KV if available
          if (env && env.ADPULSE_KV) {
            await env.ADPULSE_KV.put('campaigns', JSON.stringify(body));
          }

          return new Response(JSON.stringify({ 
            success: true, 
            count: body.length, 
            storage: 'edge_memory',
            updatedAt: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
      }

      // GET: Retrieve campaigns (D1 SQL -> Fallback to static assets)
      let campaigns = [];
      let source = 'static';

      // 1. Query Cloudflare D1 SQL if bound
      if (env && env.DB) {
        try {
          const { results } = await env.DB.prepare(`
            SELECT * FROM campaigns 
            WHERE status = 'active' 
            ORDER BY weight DESC, created_at DESC;
          `).all();

          if (results && results.length > 0) {
            campaigns = results.map(formatCampaignRow);
            source = 'cloudflare_d1';
          }
        } catch (e) {
          console.warn('D1 query fallback:', e.message);
        }
      }

      // 2. Query KV if D1 is not populated
      if (campaigns.length === 0 && env && env.ADPULSE_KV) {
        try {
          const kvData = await env.ADPULSE_KV.get('campaigns', { type: 'json' });
          if (Array.isArray(kvData) && kvData.length > 0) {
            campaigns = kvData;
            source = 'cloudflare_kv';
          }
        } catch (e) {}
      }

      // 3. Static fallback from ads.json
      if (campaigns.length === 0 && env && env.ASSETS) {
        try {
          const adsRes = await env.ASSETS.fetch(new URL('/ads.json', request.url));
          if (adsRes.ok) {
            const parsed = await adsRes.json();
            if (parsed && Array.isArray(parsed.campaigns)) {
              campaigns = parsed.campaigns;
            } else if (Array.isArray(parsed)) {
              campaigns = parsed;
            }
          }
        } catch (e) {}
      }

      return new Response(JSON.stringify(campaigns), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-AdPulse-Storage': source,
          'X-AdPulse-Count': String(campaigns.length),
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // 3. Security Verify & Update Endpoints
    if (url.pathname === '/api/security/verify') {
      const isAuth = await verifyAuth();
      return new Response(JSON.stringify({ success: isAuth }), {
        status: isAuth ? 200 : 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    if (url.pathname === '/api/security/update' && request.method === 'POST') {
      const isAuthorized = await verifyAuth();
      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
        });
      }

      try {
        const body = await request.json();
        if (env && env.DB && body.newPasscode) {
          await env.DB.prepare(`
            INSERT OR REPLACE INTO security_settings (id, master_passcode, is_passcode_protected, updated_at)
            VALUES ('primary', ?, ?, datetime('now'));
          `).bind(String(body.newPasscode), body.isPasscodeProtected ? 1 : 0).run();
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
    }

    // 4. Analytics Event Ingestion: /api/events
    if (url.pathname === '/api/events' && request.method === 'POST') {
      try {
        const evt = await request.json();
        if (env && env.DB && evt && evt.campaignId) {
          const evtId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          await env.DB.prepare(`
            INSERT INTO ad_events (id, campaign_id, event_type, slot_id, device, category, page_url, referer, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
          `).bind(
            evtId, evt.campaignId, evt.eventType || 'impression',
            evt.slotId || '', evt.device || 'unknown', evt.category || '',
            evt.pageUrl || '', request.headers.get('referer') || ''
          ).run();
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders });
      }
    }

    // 5. Static Assets Delivery via env.ASSETS (with enforced CORS)
    let response;
    if (env && env.ASSETS) {
      response = await env.ASSETS.fetch(request);
    } else {
      response = await fetch(request);
    }

    // Re-wrap response with CORS headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Adpulse-Passcode, Accept');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
};
