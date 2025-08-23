const { getMgmtToken, decodeJwt, deepMerge } = require('./_lib');

exports.handler = async (event) => {
  try{
    const body = event.body ? JSON.parse(event.body) : {};
    const auth = event.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const payload = decodeJwt(token);
    const sub = payload.sub;
    const domain = process.env.AUTH0_DOMAIN;
    const { access_token } = await getMgmtToken();

    // get current
    const ures = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(sub)}`, { headers:{'Authorization':`Bearer ${access_token}`} });
    if (!ures.ok) return { statusCode:500, body: await ures.text() };
    const user = await ures.json();
    const am = user.app_metadata || {};

    const patch = { app_metadata: { profile: deepMerge(am.profile, { nickname: body.nickname, avatar_url: body.avatar_url }) } };
    if (body.docs) patch.app_metadata.docs = deepMerge(am.docs, body.docs);
    if (body.docs_status) patch.app_metadata.docs_status = body.docs_status;

    const pres = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(sub)}`, {
      method:'PATCH', headers:{'Authorization':`Bearer ${access_token}`,'Content-Type':'application/json'},
      body: JSON.stringify(patch)
    });
    if (!pres.ok) return { statusCode:500, body: await pres.text() };
    return { statusCode:200, body:'OK' };
  }catch(e){ return { statusCode:500, body:String(e) }; }
};
