// netlify/functions/notify.js
// Azioni supportate:
// - request-otp    { email } -> { ok, token }
// - verify-otp     { email, code, token } -> { ok }
// - upload-docs    { email, meta, attachments[] } -> { ok }  (+ salva richiesta su Blobs)
// - send-notification { subject, html, to? } -> { ok }

const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OTP_SECRET = process.env.OTP_SECRET || 'change-me';
const DEFAULT_TO = process.env.NOTIFY_EMAIL || '';

function corsHeaders(){
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS, POST"
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: 'ok' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const action = (body.action||'').toLowerCase();

    if (action === 'request-otp') {
      const email = (body.email||'').trim();
      if (!email) return resp(400, { error:'Missing email' });
      const code = genCode6();
      const exp = Date.now() + 15 * 60 * 1000;
      const token = signToken({ email, code, exp });

      await sendMail({
        to: email,
        subject: 'Codice di accesso • B&B Clean',
        html: `<p>Ciao!</p><p>Il tuo codice di accesso è:</p>
               <p style="font-size:28px;font-weight:700;letter-spacing:2px">${code}</p>
               <p>Scade tra 15 minuti.</p>
               <p class="small">Se non hai richiesto il codice, ignora questa email.</p>`
      });
      return resp(200, { ok:true, token });
    }

    if (action === 'verify-otp') {
      const { email, code, token } = body;
      if (!email || !code || !token) return resp(400, { error:'Missing fields' });
      const payload = verifyToken(token);
      if (!payload) return resp(401, { error:'Invalid token' });
      if (payload.email !== email) return resp(401, { error:'Email mismatch' });
      if (String(payload.code) !== String(code)) return resp(401, { error:'Wrong code' });
      if (Date.now() > payload.exp) return resp(401, { error:'Expired' });
      return resp(200, { ok:true });
    }

    if (action === 'upload-docs') {
      const { email, meta, attachments } = body;
      if (!email || !attachments?.length) return resp(400, { error:'Missing email or attachments' });

      // 1) invia email allo staff
      const to = DEFAULT_TO || email;
      await sendMail({
        to,
        subject: `KYC upload — ${esc(meta?.partner?.cognome||'')} ${esc(meta?.partner?.nome||'')} (${email})`,
        html: `
          <h2>Nuovi documenti KYC</h2>
          <p><b>Email:</b> ${esc(email)}</p>
          <p><b>Partner:</b> ${esc(meta?.partner?.cognome||'')} ${esc(meta?.partner?.nome||'')}</p>
          <p><b>CF:</b> ${esc(meta?.partner?.cf||'')}</p>
          <p><b>Documento:</b> ${esc(meta?.tipo||'')} — ${esc(meta?.numero||'')} — Scad.: ${esc(meta?.scadenza||'')}</p>
          <p>In allegato fronte, retro e selfie.</p>
        `,
        attachments: attachments.map(a => ({
          content: a.content,
          filename: a.filename || 'file',
          path: undefined,
          type: a.mime_type || 'application/octet-stream'
        }))
      });

      // 2) salva richiesta nel Blobs store (senza allegati)
      try {
        const store = getStore({ name: 'kyc' });
        const now = new Date().toISOString();
        const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const record = {
          id,
          email,
          partner: meta?.partner || {},
          doc: { tipo: meta?.tipo, numero: meta?.numero, scadenza: meta?.scadenza },
          status: 'in_attesa',
          reason: '',
          created_at: now,
          updated_at: now,
          audit: [{ ts: now, action: 'Inviato documenti', by: email }]
        };
        await store.setJSON(`requests/${id}.json`, record);
      } catch (e) {
        console.log('Blobs save failed (non bloccante):', e.message);
      }

      return resp(200, { ok:true });
    }

    if (action === 'send-notification') {
      const { subject, html, to } = body;
      await sendMail({ to: to || DEFAULT_TO, subject: subject || 'Notifica B&B Clean', html: html || '<p>—</p>' });
      return resp(200, { ok:true });
    }

    return resp(400, { error:'Unknown action' });
  } catch (e) {
    return resp(500, { error: e.message || String(e) });
  }
};

// --- helpers
function resp(status, obj){ return { statusCode: status, headers: corsHeaders(), body: JSON.stringify(obj) }; }
function genCode6(){ return String(Math.floor(100000 + Math.random()*900000)); }
function signToken(payload){
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', OTP_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}
function verifyToken(tok){
  const [data, sig] = String(tok).split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', OTP_SECRET).update(data).digest('base64url');
  if (expected !== sig) return null;
  try { return JSON.parse(Buffer.from(data, 'base64url').toString('utf8')); } catch { return null; }
}
function esc(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

async function sendMail({ to, subject, html, attachments }){
  if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');
  if (!to) throw new Error('Missing recipient');
  const res = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{ 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify({
      from: 'B&B Clean <no-reply@bebclean.it>',
      to: [to],
      subject,
      html,
      attachments
    })
  });
  if (!res.ok){
    const t = await res.text();
    throw new Error(`Resend error: ${t}`);
  }
}
