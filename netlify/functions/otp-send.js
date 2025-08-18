// netlify/functions/otp-send.js
import { verifyAccessToken, corsHeaders } from './_lib/verify-jwt.js';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SID  = process.env.TWILIO_VERIFY_SID;

export async function handler(event) {
  const headers = corsHeaders(event.headers?.origin);
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // 1) JWT Auth
    await verifyAccessToken(event.headers.authorization);

    // 2) Body
    const { phone } = JSON.parse(event.body || '{}');
    if (!phone) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'phone required (E.164 es. +39333...)' }) };
    }

    // 3) Twilio Verify: send SMS
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const form = new URLSearchParams({ To: phone, Channel: 'sms' });

    const resp = await fetch(`https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/Verifications`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const data = await resp.json();

    if (!resp.ok) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: data?.message || 'twilio_error' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ sent: true }) };
  } catch (e) {
    const code = e.status || 500;
    return { statusCode: code, headers, body: JSON.stringify({ error: e.message || 'server_error' }) };
  }
}
