// netlify/functions/profile-load.js
import { verifyAccessToken, corsHeaders } from './_lib/verify-jwt.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export async function handler(event) {
  const headers = { ...corsHeaders(event.headers?.origin), 'content-type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };
  if (event.httpMethod !== 'GET')    return { statusCode: 405, headers, body: JSON.stringify({ error:'Method Not Allowed' }) };

  try {
    const payload = await verifyAccessToken(event.headers.authorization);
    const sub = payload.sub;

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?auth0_sub=eq.${encodeURIComponent(sub)}&select=auth0_sub,email,phone,phone_verified_at,birth_date,birth_place_code,codice_fiscale&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return { statusCode: 500, headers, body: JSON.stringify({ error: txt }) };
    }

    const rows = await resp.json();
    return { statusCode: 200, headers, body: JSON.stringify(rows?.[0] || {}) };
  } catch (e) {
    const code = e.status || 500;
    return { statusCode: code, headers, body: JSON.stringify({ error: e.message || 'server_error' }) };
  }
}
