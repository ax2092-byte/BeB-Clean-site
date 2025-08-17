// netlify/functions/kyc.js
// API amministrativa per KYC: list / decide / get
// Storage: Netlify Blobs (store "kyc") — richiede dipendenza @netlify/blobs
// Security: header "X-Admin-Token" deve combaciare con process.env.ADMIN_TOKEN

const { getStore } = require('@netlify/blobs');

function cors(){
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Access-Control-Allow-Methods': 'OPTIONS, POST'
  };
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors(), body: 'ok' };

  try {
    const body = JSON.parse(event.body || '{}');
    const action = (body.action || '').toLowerCase();

    // protezione admin per tutte le azioni qui
    const tokenHeader = event.headers['x-admin-token'] || event.headers['X-Admin-Token'];
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
    if (!ADMIN_TOKEN || tokenHeader !== ADMIN_TOKEN) {
      return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const store = getStore({ name: 'kyc' });

    if (action === 'list') {
      const statusFilter = (body.status || '').toLowerCase();
      const listed = await store.list({ prefix: 'requests/' });
      const items = [];
      for (const b of (listed.blobs || [])) {
        const rec = await store.getJSON(b.key);
        if (!rec) continue;
        if (statusFilter && rec.status !== statusFilter) continue;
        items.push(rec);
      }
      items.sort((a,b)=> (new Date(b.created_at||0)) - (new Date(a.created_at||0)));
      return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok:true, items }) };
    }

    if (action === 'get') {
      const id = body.id;
      if (!id) return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Missing id' }) };
      const key = `requests/${id}.json`;
      const rec = await store.getJSON(key);
      if (!rec) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'Not found' }) };
      return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok:true, item: rec }) };
    }

    if (action === 'decide') {
      const { id, status, reason, admin } = body;
      if (!id || !status) return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Missing fields' }) };
      if (!['in_attesa','approvato','rifiutato'].includes(status)) {
        return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Bad status' }) };
      }
      const key = `requests/${id}.json`;
      const rec = await store.getJSON(key);
      if (!rec) return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: 'Not found' }) };

      rec.status = status;
      rec.reason = status === 'rifiutato' ? (reason || '') : '';
      rec.updated_at = new Date().toISOString();
      rec.audit = rec.audit || [];
      rec.audit.unshift({ ts: rec.updated_at, action: `Stato: ${status}${rec.reason ? ` — motivo: ${rec.reason}` : ''}`, by: admin || 'Admin' });

      await store.setJSON(key, rec);

      // invia email al partner
      try {
        await sendDecisionMail({
          to: rec.email,
          status,
          reason: rec.reason,
          partner: rec.partner || {}
        });
      } catch (e) {
        // non blocca la risposta
        console.log('Email decision fallita:', e.message);
      }

      return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok:true }) };
    }

    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: e.message||String(e) }) };
  }
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendDecisionMail({ to, status, reason, partner }){
  if (!RESEND_API_KEY || !to) return;
  const subject = status === 'approvato'
    ? 'KYC approvato — B&B Clean'
    : (status === 'rifiutato'
        ? 'KYC rifiutato — B&B Clean'
        : 'KYC in revisione — B&B Clean');

  const msg = status === 'approvato'
    ? `<p>Ciao ${esc(partner?.nome||'')},</p><p>la tua verifica è stata <strong>approvata</strong>. Da ora puoi essere visibile nelle ricerche e ricevere lavori.</p>`
    : status === 'rifiutato'
      ? `<p>Ciao ${esc(partner?.nome||'')},</p><p>purtroppo la tua verifica è stata <strong>rifiutata</strong>.</p><p><b>Motivo:</b> ${esc(reason||'')}</p><p>Puoi effettuare un nuovo invio dei documenti dall'Area Partner.</p>`
      : `<p>Ciao ${esc(partner?.nome||'')},</p><p>la tua verifica è in <strong>revisione</strong>. Ti aggiorneremo a breve.</p>`;

  await resendMail({
    to,
    subject,
    html: `${msg}<p>— B&amp;B Clean</p>`
  });
}

async function resendMail({ to, subject, html }){
  const res = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{ 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify({
      from: 'B&B Clean <no-reply@bebclean.it>',
      to: [to],
      subject,
      html
    })
  });
  if (!res.ok){
    const t = await res.text(); throw new Error(`Resend: ${t}`);
  }
}

function esc(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
