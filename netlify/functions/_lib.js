const crypto = require('crypto');

async function getMgmtToken(){
  const domain = process.env.AUTH0_DOMAIN;
  const client_id = process.env.AUTH0_MGMT_CLIENT_ID;
  const client_secret = process.env.AUTH0_MGMT_CLIENT_SECRET;
  const res = await fetch(`https://${domain}/oauth/token`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ client_id, client_secret, audience: `https://${domain}/api/v2/`, grant_type: 'client_credentials' })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function decodeJwt(jwt){
  const [h,p] = jwt.split('.');
  const payload = JSON.parse(Buffer.from(p,'base64url').toString('utf8'));
  return payload;
}

function basicAuth(user, pass){ return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'); }

function maskIban(iban){
  if (!iban) return null;
  const s = iban.replace(/\s+/g,'').toUpperCase();
  return s.slice(0,2)+'**…'+s.slice(-4);
}

function deepMerge(a,b){
  if (Array.isArray(a) || Array.isArray(b)) return b;
  const out = {...(a||{})};
  Object.keys(b||{}).forEach(k=>{
    if (b[k] && typeof b[k]==='object' && !Array.isArray(b[k])) out[k] = deepMerge(a?.[k], b[k]);
    else out[k] = b[k];
  });
  return out;
}

module.exports = { getMgmtToken, decodeJwt, basicAuth, maskIban, deepMerge, crypto };
