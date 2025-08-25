// Restituisce app_metadata.properties (array)
import { json, corsHeaders, verifyAccessToken } from './_lib/auth.js';
import { mgmtGetUser } from './_lib/mgmt.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: 'ok' };
  try {
    const claims = await verifyAccessToken(event.headers.authorization);
    const userId = claims.sub;
    const u = await mgmtGetUser(userId);
    const list = Array.isArray(u.app_metadata?.properties) ? u.app_metadata.properties : [];
    return json(200, list);
  } catch (e) {
    return json(e.statusCode || 500, { error: e.message || 'error', detail: e.detail });
  }
}
