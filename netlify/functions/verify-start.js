// Avvia OTP SMS (Twilio Verify). Auth opzionale.
import { json, corsHeaders, verifyAccessToken } from './_lib/auth.js';

const ACC = process.env.TWILIO_ACCOUNT_SID;
const TOK = process.env.TWILIO_AUTH_TOKEN;
const SID = process.env.TWILIO_VERIFY_SERVICE_SID;

function b64(s){ return Buffer.from(s).toString('base64'); }

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: 'ok' };
  try {
    // opzionale: se vuoi forzare login, decommenta la riga sotto
    // await verifyAccessToken(event.headers.authorization);

    const qp = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body).phone && JSON.parse(event.body) : {};
    const phone = (qp.phone || body.phone || '').trim();
    if (!ACC || !TOK || !SID) return json(500, { error: 'Twilio ENV missing' });
    if (!phone) return json(400, { error: 'Missing phone' });

    const r = await fetch(`https://verify.twilio.com/v2/Services/${SID}/Verifications`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${b64(`${ACC}:${TOK}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: phone, Channel: 'sms' }).toString()
    });

    if (!r.ok) {
      const t = await r.text().catch(()=> '');
      return json(502, { error: 'Twilio start failed', detail: t });
    }
    return json(200, { ok: true });
  } catch (e) {
    return json(e.statusCode || 500, { error: e.message || 'error' });
  }
}
