// GET: dati profilo dal Management API
import { verifyAccessToken, json, corsHeaders } from './_lib/auth.js';
import { mgmtGetUser } from './_lib/mgmt.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: 'ok' };
  try {
    const claims = await verifyAccessToken(event.headers.authorization);
    const userId = claims.sub;
    const u = await mgmtGetUser(userId);

    const out = {
      user_id: u.user_id,
      email: u.email,
      given_name: u.given_name || '',
      family_name: u.family_name || '',
      email_verified: !!u.email_verified,
      user_metadata: u.user_metadata || {},
      app_metadata: {
        notifications: u.app_metadata?.notifications,
        properties: u.app_metadata?.properties,
        docs: u.app_metadata?.docs
      }
    };
    return json(200, out);
  } catch (e) {
    return json(e.statusCode || 500, { error: e.message || 'error', detail: e.detail });
  }
}
