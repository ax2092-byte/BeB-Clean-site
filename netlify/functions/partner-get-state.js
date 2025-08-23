const { getMgmtToken, decodeJwt, maskIban } = require('./_lib');

exports.handler = async (event) => {
  try{
    const auth = event.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return { statusCode:401, body:'missing token' };
    const payload = decodeJwt(token);
    const sub = payload.sub;
    const domain = process.env.AUTH0_DOMAIN;

    const { access_token } = await getMgmtToken();
    const ures = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(sub)}`, {
      headers:{'Authorization':`Bearer ${access_token}`}
    });
    if (!ures.ok) return { statusCode:500, body: await ures.text() };
    const user = await ures.json();
    const am = user.app_metadata || {};
    const out = {
      partner_id: am.partner_id || payload['https://bebclean.it/partner_id'] || null,
      phone_number: am.phone_number || null,
      phone_verified: am.phone_verified===true,
      docs_status: am.docs_status || 'missing',
      profile: am.profile || {},
      products: am.products || [],
      domicile: am.domicile || {},
      billing: am.billing ? { holder: am.billing.holder || null, iban_masked: maskIban(am.billing.iban) } : {},
      hourly_eur: am.rate?.hourly_eur || null
    };
    return { statusCode:200, body: JSON.stringify(out) };
  }catch(e){ return { statusCode:500, body:String(e) }; }
};
