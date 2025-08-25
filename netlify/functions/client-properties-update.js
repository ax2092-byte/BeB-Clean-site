// Salva l'array properties in app_metadata.properties
import { json, corsHeaders, verifyAccessToken } from './_lib/auth.js';
import { mgmtGetUser, mgmtPatchUser } from './_lib/mgmt.js';

function sanitizeProperty(p) {
  const out = {
    id: String(p.id || ('prop_' + Date.now())),
    label: (p.label || '').toString().slice(0,120),
    address: (p.address || '').toString().slice(0,240),
    lat: Number(p.lat), lon: Number(p.lon),
    mq: p.mq != null ? Number(p.mq) : null,
    floors: (p.floors || '').toString().slice(0,120),
    rooms: (p.rooms || '').toString().slice(0,120),
    baths: (p.baths || '').toString().slice(0,120),
    owner_doc_url: (p.owner_doc_url || '').toString(),
    default: !!p.default
  };
  if (Number.isNaN(out.lat)) out.lat = null;
  if (Number.isNaN(out.lon)) out.lon = null;
  return out;
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders(), body: 'ok' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const claims = await verifyAccessToken(event.headers.authorization);
    const userId = claims.sub;

    const body = JSON.parse(event.body || '{}');
    let arr = Array.isArray(body.properties) ? body.properties : [];
    arr = arr.map(sanitizeProperty);

    // forza un solo "default"
    const hasDefault = arr.some(p=>p.default);
    if (!hasDefault && arr.length) arr[0].default = true;

    const u = await mgmtGetUser(userId);
    const am = { ...(u.app_metadata||{}), properties: arr, properties_updated_at: new Date().toISOString() };
    await mgmtPatchUser(userId, { app_metadata: am });

    return json(200, { ok: true, count: arr.length });
  } catch (e) {
    return json(e.statusCode || 500, { error: e.message || 'error', detail: e.detail });
  }
}
