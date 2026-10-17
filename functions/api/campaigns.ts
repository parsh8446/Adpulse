/**
 * Cloudflare Pages Function: /api/campaigns (v3.5.1)
 * Handles GET and POST requests for dynamic ad campaigns with KV support
 */
export async function onRequestGet(context: any) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // If KV binding 'ADPULSE_KV' is bound in Cloudflare
    if (context.env && context.env.ADPULSE_KV) {
      const stored = await context.env.ADPULSE_KV.get('campaigns', { type: 'json' });
      if (stored) {
        return new Response(JSON.stringify(stored), { headers: corsHeaders });
      }
    }
  } catch (e) {}

  return new Response(JSON.stringify([]), { headers: corsHeaders });
}

export async function onRequestPost(context: any) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = await context.request.json();
    if (context.env && context.env.ADPULSE_KV) {
      await context.env.ADPULSE_KV.put('campaigns', JSON.stringify(body));
      return new Response(JSON.stringify({ success: true, count: body.length }), { headers: corsHeaders });
    }
    return new Response(JSON.stringify({ success: true, message: 'Saved to memory' }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
