// admin-kyc-list: elenca candidature partner (con link ai file) per revisione manuale.
// ENV richieste: ADMIN_KEY, NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN
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
    const f = forms.find(x => (x.name||'').toLowerCase()==='partner');
    if (!f) return { statusCode:200, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ items: [] }) };

    const subs = await nf(`/forms/${f.id}/submissions?per_page=100`);
    const cutoff = Date.now() - Number(days)*24*3600*1000;

    const items = (subs||[])
      .filter(s => new Date(s.created_at).getTime() >= cutoff)
      .map(s=>{
        const d = s.data || {};
        // file upload: Netlify API espone spesso s.files (array con url) — fallback ai campi modulo.
        const files = [];
        if (Array.isArray(s.files)) {
          s.files.forEach(f => { if (f && f.url) files.push({ name: f.name || 'file', url: f.url }); });
        }
        ['doc_fronte','doc_retro','selfie_doc'].forEach(k=>{
          const v = d[k];
          if (v && typeof v === 'string' && v.startsWith('http')) files.push({ name:k, url:v });
        });

        return {
          id: s.id,
          created_at: s.created_at,
          nome: `${d['nome']||''} ${d['cognome']||''}`.trim(),
          email: d['email'] || '',
          telefono: d['telefono'] || '',
          codice_fiscale: d['codice_fiscale'] || '',
          address: `${d['via']||''} ${d['civico']||''}, ${d['cap']||''} ${d['citta']||''} (${d['provincia']||''}), ${d['regione']||''}`,
          raggio_km: d['raggio'] || '',
          tariffa: d['tariffa'] || '',
          doc_scadenza: d['doc_scadenza'] || '',
          files
        };
      })
      .sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));

    return { statusCode:200, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ items }) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
