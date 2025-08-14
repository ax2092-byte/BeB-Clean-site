// admin-kyc-decision: approva/rifiuta candidatura partner + email
// ENV: ADMIN_KEY, RESEND_API_KEY, (opz) NOTIFY_EMAIL, URL/DEPLOY_PRIME_URL
const fetch = global.fetch;

exports.handler = async (event) => {
  try{
    if (event.httpMethod !== 'POST') return { statusCode:405, headers:{'Allow':'POST'}, body:'Method Not Allowed' };

    const { admin_key, email, name, decision, reasons = [], note = '' } = JSON.parse(event.body || '{}');
    if (!admin_key || admin_key !== process.env.ADMIN_KEY) return { statusCode:401, body: JSON.stringify({ error:'Unauthorized' }) };
    if (!email || !decision) return { statusCode:400, body: JSON.stringify({ error:'Missing fields' }) };
    const dec = String(decision).toLowerCase();
    if (!['approved','rejected'].includes(dec)) return { statusCode:400, body: JSON.stringify({ error:'Invalid decision' }) };

    const siteUrl = process.env.DEPLOY_PRIME_URL || process.env.URL;
    if (!siteUrl) return { statusCode:500, body: JSON.stringify({ error:'Missing site URL' }) };

    // 1) registra decisione su Netlify Forms (kyc_decision)
    const formBody = new URLSearchParams({
      'form-name':'kyc_decision',
      email, name: name || '', decision: dec,
      reasons: Array.isArray(reasons) ? reasons.join(', ') : String(reasons||''),
      note
    }).toString();
    await fetch(siteUrl+'/', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: formBody });

    // 2) invia email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const ADMIN = process.env.NOTIFY_EMAIL || "alessandrospanu92@gmail.com";
    if (RESEND_API_KEY){
      const title = dec === 'approved' ? 'APPROVATO' : 'RIFIUTATO';
      const reasonsHtml = (dec==='rejected' && reasons && reasons.length)
        ? `<p><b>Motivi:</b> ${reasons.map(r=>`<span>${r}</span>`).join(', ')}</p>`
        : '';
      const noteHtml = note ? `<p><b>Note:</b> ${note}</p>` : '';
      const html = `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial;font-size:14px;color:#0b1220">
          <p>Esito verifica identità: <b>${title}</b></p>
          ${reasonsHtml}
          ${noteHtml}
          <p>Per completare l'onboarding visita: <a href="${siteUrl}/partner.html">${siteUrl}/partner.html</a></p>
          <p style="color:#6b7280">Email automatica — B&B Clean</p>
        </div>
      `;
      // al partner
      await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers:{ 'Authorization':`Bearer ${RESEND_API_KEY}`, 'Content-Type':'application/json' },
        body: JSON.stringify({
          from: 'B&B Clean <onboarding@resend.dev>',
          to: [email],
          subject: `B&B Clean — Esito verifica: ${title}`,
          html
        })
      });
      // all’admin
      await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers:{ 'Authorization':`Bearer ${RESEND_API_KEY}`, 'Content-Type':'application/json' },
        body: JSON.stringify({
          from: 'B&B Clean <onboarding@resend.dev>',
          to: [ADMIN],
          subject: `B&B Clean — Decisione KYC ${title} per ${email}`,
          html
        })
      });
    }

    return { statusCode:200, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ ok:true }) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
