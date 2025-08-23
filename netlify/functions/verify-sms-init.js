const { basicAuth } = require('./_lib');

exports.handler = async (event) => {
  try{
    const { phone_number } = JSON.parse(event.body||'{}');
    if (!phone_number) return { statusCode:400, body:'missing phone_number' };
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const service = process.env.TWILIO_VERIFY_SERVICE_SID;

    const res = await fetch(`https://verify.twilio.com/v2/Services/${service}/Verifications`, {
      method:'POST', headers:{ 'Authorization': basicAuth(sid, token), 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone_number, Channel: 'sms' }).toString()
    });
    if (!res.ok) return { statusCode:500, body: await res.text() };
    return { statusCode:200, body:'OK' };
  }catch(e){ return { statusCode:500, body:String(e) }; }
};
