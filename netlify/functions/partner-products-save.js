const { getMgmtToken, decodeJwt } = require('./_lib');

exports.handler = async (event) => {
  try{
    const { products } = JSON.parse(event.body||'{}');
    if (!Array.isArray(products)) return { statusCode:400, body:'invalid products' };
    const token = (event.headers.authorization||'').split(' ')[1];
    const sub = decodeJwt(token).sub;
    const domain = process.env.AUTH0_DOMAIN;
    const { access_token } = await getMgmtToken();

    const patch = { app_metadata: { products } };
    const res = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(sub)}`, {
      method:'PATCH',
      headers:{'Authorization':`Bearer ${access_token}`,'Content-Type':'application/json'},
      body: JSON.stringify(patch)
    });
    if (!res.ok) return { statusCode:500, body: await res.text() };
    return { statusCode:200, body:'OK' };
  }catch(e){ return { statusCode:500, body:String(e) }; }
};
