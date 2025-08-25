// Verifica codice OTP (Twilio Verify) e marca phone_verified in Auth0
import { json, corsHeaders, verifyAccessToken } from './_lib/auth.js';
import { mgmtPatchUser, mgmtGetUser } from './_lib/mgmt.js';

const ACC = process.env.TWILIO_ACCOUNT_SID;
const TOK = process.env.TWILIO_AUTH_TOKEN;
const SID = process.env.TWILIO_VERIFY_SERVICE_SID;

function b64(s){ return Buffer.from(s).toString('base64'); }

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: 'ok' };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const claims = await verifyAccessToken(event.headers.authorization);
    const userId = claims.sub;

    const qp = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const phone = (qp.phone || body.phone || '').trim();
    const code  = (qp.code  || body.code  || '').trim();

    if (!ACC || !TOK || !SID) return json(500, { error: 'Twilio ENV missing' });
    if (!phone || !code) return json(400, { error: 'Missing phone or code' });

    const r = await fetch(`https://verify.twilio.com/v2/Services/${SID}/VerificationCheck`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${b64(`${ACC}:${TOK}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: phone, Code: code }).toString()
    });

    const js = await r.json().catch(()=>null);
    if (!r.ok || !js) return json(502, { error: 'Twilio check failed' });

    const approved = js.status === 'approved';
    if (!approved) return json(200, { ok: false, status: js.status });

    // Marca verificato in user_metadata
    const u = await mgmtGetUser(userId);
    const nowIso = new Date().toISOString();
    const um = { ...(u.user_metadata||{}), phone, phone_verified: true, phone_verified_at: nowIso };
    await mgmtPatchUser(userId, { user_metadata: um });

    return json(200, { ok: true, status: js.status });
  } catch (e) {
    return json(e.statusCode || 500, { error: e.message || 'error', detail: e.detail });
  }
}
