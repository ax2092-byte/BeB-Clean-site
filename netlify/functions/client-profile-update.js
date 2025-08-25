// POST: aggiorna anagrafica in user_metadata (+ opzionale given/family_name)
import { verifyAccessToken, json, corsHeaders } from './_lib/auth.js';
import { mgmtPatchUser, mgmtGetUser } from './_lib/mgmt.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: 'ok' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const claims = await verifyAccessToken(event.headers.authorization);
    const userId = claims.sub;

    const body = JSON.parse(event.body || '{}');
    const patch = { user_metadata: {} };

    if (typeof body.first_name === 'string') patch.given_name = body.first_name.trim();
    if (typeof body.last_name === 'string')  patch.family_name = body.last_name.trim();

    if (typeof body.phone === 'string')       patch.user_metadata.phone = body.phone.trim();
    if (typeof body.cf === 'string')          patch.user_metadata.cf = body.cf.trim();
    if (typeof body.birth_place === 'string') patch.user_metadata.birth_place = body.birth_place.trim();
    if (typeof body.birth_date === 'string')  patch.user_metadata.birth_date = body.birth_date.trim();

    // preserva metadati esistenti (merge profondo minimo via GET)
    const u = await mgmtGetUser(userId);
    patch.user_metadata = { ...(u.user_metadata||{}), ...(patch.user_metadata||{}) };

    await mgmtPatchUser(userId, patch);
    return json(200, { ok: true });
  } catch (e) {
    return json(e.statusCode || 500, { error: e.message || 'error', detail: e.detail });
  }
}
