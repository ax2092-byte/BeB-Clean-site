// Salva metadati documenti in app_metadata.docs (status: pending)
import { json, corsHeaders, verifyAccessToken } from './_lib/auth.js';
import { mgmtGetUser, mgmtPatchUser } from './_lib/mgmt.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: 'ok' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const claims = await verifyAccessToken(event.headers.authorization);
    const userId = claims.sub;

    const b = JSON.parse(event.body || '{}');
    const payload = {
      type: b.type || 'CI',
      number: (b.number||'').trim(),
      expires_at: (b.expires_at||'').trim(),
      front_url: (b.front_url||'').trim(),
      back_url: (b.back_url||'').trim(),
      selfie_url: (b.selfie_url||'').trim(),
      status: 'pending',
      updated_at: new Date().toISOString()
    };

    const u = await mgmtGetUser(userId);
    const am = { ...(u.app_metadata||{}) , docs: payload };
    await mgmtPatchUser(userId, { app_metadata: am });

    return json(200, { ok: true });
  } catch (e) {
    return json(e.statusCode || 500, { error: e.message || 'error', detail: e.detail });
  }
}
