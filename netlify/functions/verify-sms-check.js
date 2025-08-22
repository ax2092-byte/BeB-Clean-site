const { basicAuth, getMgmtToken, decodeJwt } = require('./_lib');

exports.handler = async (event) => {
  try{
    const { phone_number, code } = JSON.parse(event.body||'{}');
    if (!phone_number || !code) return { statusCode:400, body:'missing fields' };
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const service = process.env.TWILIO_VERIFY_SERVICE_SID;

    const res = await fetch(`https://verify.twilio.com/v2/Services/${service}/VerificationCheck`, {
      method:'POST',
      headers:{ 'Authorization': basicAuth(sid, token), 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone_number, Code: code }).toString()
    });
    const js = await res.json();
    const approved = js.status === 'approved';

    if (approved){
      // aggiorna metadati utente
      const auth = event.headers.authorization||'';
      const idt = auth.startsWith('Bearer ')? auth.slice(7): null;
      const sub = decodeJwt(idt).sub;
      const domain = process.env.AUTH0_DOMAIN;
      const { access_token } = await getMgmtToken();
      const patch = { app_metadata: { phone_number, phone_verified: true } };
      await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(sub)}`, {
        method:'PATCH',
        headers:{'Authorization':`Bearer ${access_token}`,'Content-Type':'application/json'},
        body: JSON.stringify(patch)
      });
    }

    return { statusCode:200, body: JSON.stringify({ approved }) };
  }catch(e){ return { statusCode:500, body:String(e) }; }
};
