const { getMgmtToken } = require('./_lib');

exports.handler = async (event) => {
  try{
    const pid = (event.queryStringParameters && event.queryStringParameters.pid) || null;
    if (!pid) return { statusCode:400, body:'missing pid' };
    const domain = process.env.AUTH0_DOMAIN;
    const { access_token } = await getMgmtToken();
    const url = `https://${domain}/api/v2/users?q=app_metadata.partner_id%3A%22${encodeURIComponent(pid)}%22&search_engine=v3`;
    const res = await fetch(url, { headers:{'Authorization':`Bearer ${access_token}`} });
    if (!res.ok) return { statusCode:500, body: await res.text() };
    const list = await res.json();
    if (!list.length) return { statusCode:404, body:'not found' };
    const u = list[0];
    const am = u.app_metadata || {};
    const out = {
      pid,
      hourly_eur: am.rate?.hourly_eur || null,
      nickname: am.profile?.nickname || null,
      avatar_url: am.profile?.avatar_url || null
    };
    return { statusCode:200, headers:{'Cache-Control':'no-store'}, body: JSON.stringify(out) };
  }catch(e){ return { statusCode:500, body:String(e) }; }
};
