// Firma server-side per upload a Cloudinary dal browser
import crypto from 'crypto';
import { json, corsHeaders, verifyAccessToken } from './_lib/auth.js';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY    = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: 'ok' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    await verifyAccessToken(event.headers.authorization);

    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return json(500, { error: 'Missing Cloudinary ENV' });
    }

    const body = JSON.parse(event.body || '{}');
    const folder = (body.folder || 'clients').toString();

    const timestamp = Math.floor(Date.now() / 1000);
    // String to sign: keys sorted alphabetically
    const toSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash('sha1')
      .update(toSign + API_SECRET)
      .digest('hex');

    return json(200, {
      cloud_name: CLOUD_NAME,
      api_key: API_KEY,
      timestamp,
      signature,
      folder
    });
  } catch (e) {
    return json(e.statusCode || 500, { error: e.message || 'error' });
  }
}
