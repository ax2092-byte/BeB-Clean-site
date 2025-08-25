// Client Auth0 Management API (Client Credentials) + helper GET/PATCH utente
const fetcher = (...args) => fetch(...args);

const DOMAIN = process.env.AUTH0_DOMAIN; // dev-xxxx.eu.auth0.com
const MGMT_AUD = `https://${DOMAIN}/api/v2/`;
const M2M_ID = process.env.AUTH0_MGMT_CLIENT_ID;
const M2M_SECRET = process.env.AUTH0_MGMT_CLIENT_SECRET;

if (!DOMAIN) console.warn('[mgmt] Missing AUTH0_DOMAIN');
if (!M2M_ID) console.warn('[mgmt] Missing AUTH0_MGMT_CLIENT_ID');
if (!M2M_SECRET) console.warn('[mgmt] Missing AUTH0_MGMT_CLIENT_SECRET');

let mgmtToken = null;
let mgmtExpAt = 0;

async function getMgmtToken() {
  const now = Math.floor(Date.now() / 1000);
  if (mgmtToken && mgmtExpAt - 30 > now) return mgmtToken;

  const res = await fetcher(`https://${DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: M2M_ID,
      client_secret: M2M_SECRET,
      audience: MGMT_AUD
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(()=>'');
    throw new Error(`Mgmt token error: ${res.status} ${t}`);
  }
  const js = await res.json();
  mgmtToken = js.access_token;
  mgmtExpAt = now + (js.expires_in || 3600);
  return mgmtToken;
}

export async function mgmtGetUser(userId) {
  const token = await getMgmtToken();
  const res = await fetcher(`https://${DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    throw new Error(`mgmtGetUser ${res.status} ${t}`);
  }
  return res.json();
}

export async function mgmtPatchUser(userId, patch) {
  const token = await getMgmtToken();
  const res = await fetcher(`https://${DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch)
  });
  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    throw new Error(`mgmtPatchUser ${res.status} ${t}`);
  }
  return res.json();
}
