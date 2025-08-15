// admin-kyc-list: candidature partner + stato decisione (approved/rejected) e link file
// ENV: ADMIN_KEY, NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN
const fetch = global.fetch;

exports.handler = async (event) => {
  try{
    if (event.httpMethod !== 'POST') return { statusCode:405, headers:{'Allow':'POST'}, body:'Method Not Allowed' };
    const { admin_key, days=30 } = JSON.parse(event.body || '{}');
    if (!admin_key || admin_key !== process.env.ADMIN_KEY) return { statusCode:401, body: JSON.stringify({ error:'Unauthorized' }) };

    const siteId = process.env.NETLIFY_SITE_ID;
    const token  = process.env.NETLIFY_AUTH_TOKEN;
    if (!siteId || !token) return { statusCode:500, body: JSON.stringify({ error:'Missing NETLIFY_SITE_ID or NETLIFY_AUTH_TOKEN' }) };

    async function nf(path){
      const r = await fetch(`https://api.netlify.com/api/v1${path}`, { headers:{ 'Authorization':`Bearer ${token}` }});
      if (!r.ok) throw new Error(`Netlify API ${r.status}`);
      return r.json();
    }

    const forms = await nf(`/sites/${siteId}/forms`);
    const fKyc = forms.find(x => (x.name||'').toLowerCase()==='partner');
    const fDec = forms.find(x => (x.name||'').toLowerCase()==='kyc_decision');

    if (!fKyc) return { statusCode:200, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ items: [] }) };

    const [subsKyc, subsDec] = await Promise.all([
      nf(`/forms/${fKyc.id}/submissions?per_page=100`),
      fDec ? nf(`/forms/${fDec.id}/submissions?per_page=100`) : Promise.resolve([])
    ]);

    const cutoff = Date.now() - Number(days)*24*3600*1000;

    // Indicizza ultima decisione per email
    const lastDec = {};
    (subsDec||[]).forEach(s=>{
      const d = s.data || {};
      const em = (d['email']||'').toLowerCase();
      if (!em) return;
      if (!lastDec[em] || new Date(s.created_at) > new Date(lastDec[em].created_at)){
        lastDec[em] = {
          decision: d['decision'] || '',
          reasons: d['reasons'] || '',
          note: d['note'] || '',
          created_at: s.created_at
        };
      }
    });

    const items = (subsKyc||[])
      .filter(s => new Date(s.created_at).getTime() >= cutoff)
      .map(s=>{
        const d = s.data || {};
        const files = [];
        if (Array.isArray(s.files)) s.files.forEach(f => { if (f && f.url) files.push({ name: f.name || 'file', url: f.url }); });
        ['doc_fronte','doc_retro','selfie_doc'].forEach(k=>{
          const v = d[k]; if (v && typeof v === 'string' && v.startsWith('http')) files.push({ name:k, url:v });
        });

        const email = (d['email']||'').toLowerCase();
        const dec = lastDec[email];

        return {
          id: s.id,
          created_at: s.created_at,
          nome: `${d['nome']||''} ${d['cognome']||''}`.trim(),
          email: d['email'] || '',
          telefono: d['telefono'] || '',
          codice_fiscale: d['codice_fiscale'] || '',
          sesso: d['sesso'] || '',
          data_nascita: d['data_nascita'] || '',
          comune_nascita: d['comune_nascita'] || '',
          prov_nascita: d['prov_nascita'] || '',
          doc_tipo: d['doc_tipo'] || '',
          doc_numero: d['doc_numero'] || '',
          doc_scadenza: d['doc_scadenza'] || '',
          address: `${d['via']||''} ${d['civico']||''}, ${d['cap']||''} ${d['citta']||''} (${d['provincia']||''}), ${d['regione']||''}`,
          raggio_km: d['raggio'] || '',
          tariffa: d['tariffa'] || '',
          files,
          decision: dec || null
        };
      })
      .sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));

    return { statusCode:200, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ items }) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
