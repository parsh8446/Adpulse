/**
 * Cloudflare Worker / Pages Advanced Gateway (_worker.js)
 * Guarantees universal CORS headers across all origins for ad delivery and API sync.
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Universal Cross-Origin Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
      'Access-Control-Max-Age': '86400'
    };

    // 1. Handle CORS Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // 2. Dynamic Campaigns API Endpoint: /api/campaigns
    if (url.pathname === '/api/campaigns' || url.pathname === '/api/campaigns/') {
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          if (env && env.ADPULSE_KV) {
            await env.ADPULSE_KV.put('campaigns', JSON.stringify(body));
          }
          return new Response(JSON.stringify({ success: true, count: Array.isArray(body) ? body.length : 1 }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json; charset=utf-8'
            }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json; charset=utf-8'
            }
          });
        }
      }

      // GET request: retrieve campaigns from KV or static fallback
      let campaigns = [];
      if (env && env.ADPULSE_KV) {
        try {
          const kvData = await env.ADPULSE_KV.get('campaigns', { type: 'json' });
          if (Array.isArray(kvData) && kvData.length > 0) {
            campaigns = kvData;
          }
        } catch (e) {}
      }

      // If KV is not bound or empty, fallback to ads.json from static assets
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
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // 3. Static Assets Delivery via env.ASSETS (with enforced CORS)
    let response;
    if (env && env.ASSETS) {
      response = await env.ASSETS.fetch(request);
    } else {
      response = await fetch(request);
    }

    // Re-wrap response with CORS headers to guarantee no browser blockage
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
};
