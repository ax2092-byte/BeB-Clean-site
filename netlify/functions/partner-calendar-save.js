const { getMgmtToken, decodeJwt } = require('./_lib');

exports.handler = async (event) => {
  try{
    const { blocked } = JSON.parse(event.body||'{}');
    if (!Array.isArray(blocked)) return { statusCode:400, body:'invalid blocked' };
    const token = (event.headers.authorization||'').split(' ')[1];
    if (!token) return { statusCode:401, body:'missing token' };
    const sub = decodeJwt(token).sub;
    const domain = process.env.AUTH0_DOMAIN; const { access_token } = await getMgmtToken();
    const patch = { app_metadata: { calendar: { blocked } } };
    const res = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(sub)}`, {
      method:'PATCH', headers:{'Authorization':`Bearer ${access_token}`,'Content-Type':'application/json'},
      body: JSON.stringify(patch)
    });
    if (!res.ok) return { statusCode:500, body: await res.text() };
    return { statusCode:200, body:'OK' };
  }catch(e){ return { statusCode:500, body:String(e) }; }
};
