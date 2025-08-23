const { getMgmtToken, decodeJwt } = require('./_lib');

exports.handler = async (event) => {
  try{
    const token = (event.headers.authorization||'').split(' ')[1];
    if (!token) return { statusCode:401, body:'missing token' };
    const sub = decodeJwt(token).sub;
    const domain = process.env.AUTH0_DOMAIN; const { access_token } = await getMgmtToken();
    const ures = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(sub)}`, { headers:{'Authorization':`Bearer ${access_token}`} });
    if (!ures.ok) return { statusCode:500, body: await ures.text() };
    const user = await ures.json(); const am = user.app_metadata || {};
    const blocked = (am.calendar && Array.isArray(am.calendar.blocked)) ? am.calendar.blocked : [];
    return { statusCode:200, body: JSON.stringify({ blocked }) };
  }catch(e){ return { statusCode:500, body:String(e) }; }
};
