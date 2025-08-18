// netlify/functions/profile-save.js
import { verifyAccessToken, corsHeaders } from './_lib/verify-jwt.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export async function handler(event) {
  const headers = { ...corsHeaders(event.headers?.origin), 'content-type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };
  if (event.httpMethod !== 'POST')  return { statusCode: 405, headers, body: JSON.stringify({ error:'Method Not Allowed' }) };

  try {
    const payload = await verifyAccessToken(event.headers.authorization);
    const sub = payload.sub;

    const { birth_date, birth_place_code, codice_fiscale } = JSON.parse(event.body || '{}');
    if (!birth_date || !birth_place_code || !codice_fiscale) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    const row = [{
      auth0_sub: sub,
      birth_date,
      birth_place_code,
      codice_fiscale
    }];

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=auth0_sub`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(row)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return { statusCode: 500, headers, body: JSON.stringify({ saved:false, error: txt }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ saved:true }) };
  } catch (e) {
    const code = e.status || 500;
    return { statusCode: code, headers, body: JSON.stringify({ error: e.message || 'server_error' }) };
  }
}
