// Registra un'offerta come submission del form "offerta" e manda email via Resend.
// Richiede: RESEND_API_KEY, (opzionale NOTIFY_EMAIL)
const fetch = global.fetch;

exports.handler = async (event) => {
  try{
    if (event.httpMethod !== 'POST'){
      return { statusCode:405, headers:{'Allow':'POST'}, body:'Method Not Allowed' };
    }
    const { prenota_id, partner_email, rate_eur_h, note } = JSON.parse(event.body || '{}');
    if (!prenota_id || !partner_email) return { statusCode:400, body: JSON.stringify({ error:'Missing fields' }) };
    const rate = Math.round(Number(rate_eur_h || 0) * 100) / 100;
    if (!rate || rate < 8) return { statusCode:400, body: JSON.stringify({ error:'Tariffa minima 8 €/h' }) };

    // 1) crea submission del form "offerta" (serve lo stub nel sito)
    const siteUrl = process.env.DEPLOY_PRIME_URL || process.env.URL;
    if (!siteUrl) return { statusCode:500, body: JSON.stringify({ error:'Missing site URL' }) };
    const formBody = new URLSearchParams({
      'form-name': 'offerta',
      prenota_id, partner_email,
      rate_eur_h: String(rate),
      note: note || ''
    }).toString();
    await fetch(siteUrl+'/', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: formBody });

    // 2) email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO = process.env.NOTIFY_EMAIL || "alessandrospanu92@gmail.com";
    if (RESEND_API_KEY){
      await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers:{ 'Authorization':`Bearer ${RESEND_API_KEY}`, 'Content-Type':'application/json' },
        body: JSON.stringify({
          from: 'B&B Clean <onboarding@resend.dev>',
          to: [TO],
          subject: 'Nuova offerta partner — B&B Clean',
          html: `<p>Offerta ricevuta.</p>
                 <p><b>Annuncio:</b> ${prenota_id}<br>
                    <b>Partner:</b> ${partner_email}<br>
                    <b>Tariffa:</b> € ${rate.toFixed(2)}/h<br>
                    <b>Note:</b> ${note||''}</p>`
        })
      });
    }

    return { statusCode:200, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ ok:true }) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
