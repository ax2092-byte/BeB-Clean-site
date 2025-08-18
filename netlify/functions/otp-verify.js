// netlify/functions/otp-verify.js
import { verifyAccessToken, corsHeaders } from './_lib/verify-jwt.js';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SID  = process.env.TWILIO_VERIFY_SID;

const SUPABASE_URL        = process.env.SUPABASE_URL; // es. https://xxxx.supabase.co
const SUPABASE_SERVICE_KEY= process.env.SUPABASE_SERVICE_KEY;

export async function handler(event) {
  const headers = { ...corsHeaders(event.headers?.origin), 'content-type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // 1) JWT Auth
    const tokenPayload = await verifyAccessToken(event.headers.authorization);
    const sub   = tokenPayload.sub;
    const email = tokenPayload.email || null;

    // 2) Body
    const { phone, code } = JSON.parse(event.body || '{}');
    if (!phone || !code) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'phone and code required' }) };
    }

    // 3) Twilio Verify: check code
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const form = new URLSearchParams({ To: phone, Code: code });

    const verifyResp = await fetch(`https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/VerificationCheck`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const verifyData = await verifyResp.json();

    if (!verifyResp.ok || verifyData.status !== 'approved') {
      return { statusCode: 400, headers, body: JSON.stringify({ verified: false, error: verifyData?.message || 'invalid_code' }) };
    }

    // 4) Upsert profilo in Supabase (PostgREST)
    const now = new Date().toISOString();
    const row = [{ auth0_sub: sub, email, phone, phone_verified_at: now }];

    const supaResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=auth0_sub`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(row)
    });

    if (!supaResp.ok) {
      const txt = await supaResp.text();
      return { statusCode: 500, headers, body: JSON.stringify({ verified: true, stored: false, error: txt }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ verified: true, stored: true }) };
  } catch (e) {
    const code = e.status || 500;
    return { statusCode: code, headers, body: JSON.stringify({ error: e.message || 'server_error' }) };
  }
}
