// admin-assign: registra assegnazione e invia email
// Richiede ENV: ADMIN_KEY, RESEND_API_KEY, (opz) NOTIFY_EMAIL, NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN
const fetch = global.fetch;

exports.handler = async (event) => {
  try{
    if (event.httpMethod !== 'POST') return { statusCode:405, headers:{'Allow':'POST'}, body:'Method Not Allowed' };
    const { admin_key, prenota_id, partner_email, partner_name='' } = JSON.parse(event.body || '{}');
    if (!admin_key || admin_key !== process.env.ADMIN_KEY) return { statusCode:401, body: JSON.stringify({ error:'Unauthorized' }) };
    if (!prenota_id || !partner_email) return { statusCode:400, body: JSON.stringify({ error:'Missing fields' }) };

    const siteUrl = process.env.DEPLOY_PRIME_URL || process.env.URL;
    if (!siteUrl) return { statusCode:500, body: JSON.stringify({ error:'Missing site URL' }) };

    // Recupera i dati della prenotazione via Netlify API
    const siteId = process.env.NETLIFY_SITE_ID;
    const token  = process.env.NETLIFY_AUTH_TOKEN;
    if (!siteId || !token) return { statusCode:500, body: JSON.stringify({ error:'Missing NETLIFY_SITE_ID or NETLIFY_AUTH_TOKEN' }) };

    const pr = await fetch(`https://api.netlify.com/api/v1/submissions/${prenota_id}`, {
      headers:{ 'Authorization':`Bearer ${token}` }
    });
    const p = await pr.json();
    if (!pr.ok) return { statusCode:404, body: JSON.stringify({ error:'Prenotazione non trovata' }) };
    const d = p.data || {};
    const customer_name = d['nome'] || '';
    const address = `${d['indirizzo']||''}, ${d['citta']||''} ${d['cap']||''}, ${d['regione']||''}, Italia`;
    const data_ora = `${d['data']||''} ${d['ora']||''}`;

    // 1) Crea submission "assegnazione"
    const formBody = new URLSearchParams({
      'form-name':'assegnazione',
      prenota_id,
      partner_email,
      partner_name,
      customer_name,
      address,
      data_ora
    }).toString();
    await fetch(siteUrl+'/', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: formBody });

    // 2) Email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO = process.env.NOTIFY_EMAIL || "alessandrospanu92@gmail.com";
    if (RESEND_API_KEY){
      const html = `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial;font-size:14px;color:#0b1220">
          <p>È stata <b>assegnata</b> una prenotazione.</p>
          <table style="border-collapse:collapse">
            <tr><td><b>Cliente</b></td><td>${customer_name}</td></tr>
            <tr><td><b>Indirizzo</b></td><td>${address}</td></tr>
            <tr><td><b>Data/Ora</b></td><td>${data_ora}</td></tr>
            <tr><td><b>Partner</b></td><td>${partner_name || ''} (${partner_email})</td></tr>
            <tr><td><b>ID prenotazione</b></td><td>${prenota_id}</td></tr>
          </table>
          <p style="color:#6b7280">Email automatica — B&B Clean</p>
        </div>
      `;
      // a te
      await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers:{ 'Authorization':`Bearer ${RESEND_API_KEY}`, 'Content-Type':'application/json' },
        body: JSON.stringify({
          from: 'B&B Clean <onboarding@resend.dev>',
          to: [TO],
          subject: 'Assegnazione confermata — B&B Clean',
          html
        })
      });
      // al partner
      await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers:{ 'Authorization':`Bearer ${RESEND_API_KEY}`, 'Content-Type':'application/json' },
        body: JSON.stringify({
          from: 'B&B Clean <onboarding@resend.dev>',
          to: [partner_email],
          subject: 'Ti è stato assegnato un lavoro — B&B Clean',
          html
        })
      });
    }

    return { statusCode:200, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ ok:true }) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
