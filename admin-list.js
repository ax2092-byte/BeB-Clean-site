// admin-list: elenco prenotazioni + offerte + eventuale assegnazione
// Richiede ENV: NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN, ADMIN_KEY
const fetch = global.fetch;

exports.handler = async (event) => {
  try{
    if (event.httpMethod !== 'POST') return { statusCode:405, headers:{'Allow':'POST'}, body:'Method Not Allowed' };
    const { admin_key, days=30 } = JSON.parse(event.body || '{}');
    if (!admin_key || admin_key !== process.env.ADMIN_KEY) {
      return { statusCode:401, body: JSON.stringify({ error:'Unauthorized' }) };
    }
    const siteId = process.env.NETLIFY_SITE_ID;
    const token  = process.env.NETLIFY_AUTH_TOKEN;
    if (!siteId || !token) return { statusCode:500, body: JSON.stringify({ error:'Missing NETLIFY_SITE_ID or NETLIFY_AUTH_TOKEN' }) };

    async function nf(path){
      const r = await fetch(`https://api.netlify.com/api/v1${path}`, { headers:{ 'Authorization':`Bearer ${token}` }});
      if (!r.ok) throw new Error(`Netlify API ${r.status}`);
      return r.json();
    }

    const forms = await nf(`/sites/${siteId}/forms`);
    const fPrenota = forms.find(f=> (f.name||'').toLowerCase()==='prenota');
    const fOfferta = forms.find(f=> (f.name||'').toLowerCase()==='offerta');
    const fAssign  = forms.find(f=> (f.name||'').toLowerCase()==='assegnazione');

    if (!fPrenota) return { statusCode:200, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ items: [] }) };

    async function subs(fid){
      if (!fid) return [];
      return nf(`/forms/${fid}/submissions?per_page=100`);
    }

    const [Spre, Soff, Sass] = await Promise.all([
      subs(fPrenota.id), subs(fOfferta && fOfferta.id), subs(fAssign && fAssign.id)
    ]);

    const cutoff = Date.now() - Number(days)*24*3600*1000;

    // indicizza offerte per prenota_id
    const offersByPren = {};
    (Soff||[]).forEach(s=>{
      const d = s.data || {};
      const pid = d['prenota_id'];
      if (!pid) return;
      if (!offersByPren[pid]) offersByPren[pid] = [];
      offersByPren[pid].push({
        _raw_id: s.id,
        partner_email: d['partner_email'] || '',
        partner_name: d['partner_name'] || '',
        rate_eur_h: Number(d['rate_eur_h'] || 0),
        note: d['note'] || '',
        created_at: s.created_at
      });
    });

    // indicizza assegnazioni per prenota_id
    const assignByPren = {};
    (Sass||[]).forEach(s=>{
      const d = s.data || {};
      const pid = d['prenota_id'];
      if (!pid) return;
      assignByPren[pid] = {
        partner_email: d['partner_email'] || '',
        partner_name: d['partner_name'] || '',
        customer_name: d['customer_name'] || '',
        address: d['address'] || '',
        data_ora: d['data_ora'] || '',
        created_at: s.created_at
      };
    });

    // costruisci items
    const items = (Spre||[])
      .filter(s => new Date(s.created_at).getTime() >= cutoff)
      .map(s=>{
        const d = s.data || {};
        const addr = `${d['indirizzo']||''}, ${d['citta']||''} ${d['cap']||''}, ${d['regione']||''}, Italia`;
        return {
          id: s.id,
          id_short: s.number || s.id.slice(0,7),
          created_at: s.created_at,
          nome: d['nome'] || '',
          email: d['email'] || '',
          telefono: d['telefono'] || '',
          mq: Number(d['mq'] || 0),
          durata: Number(d['durata'] || 1),
          data: d['data'] || '',
          ora: d['ora'] || '',
          citta: d['citta'] || '',
          regione: d['regione'] || '',
          cap: d['cap'] || '',
          address: addr,
          offers: (offersByPren[s.id] || []).sort((a,b)=> new Date(a.created_at)-new Date(b.created_at)),
          assignment: assignByPren[s.id] || null
        };
      })
      .sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));

    return { statusCode:200, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ items }) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
