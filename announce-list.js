// Ritorna gli "annunci" (prenotazioni) visibili a un partner entro il suo raggio.
// Richiede: NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID, ORS_API_KEY
const fs = require('fs');
const path = require('path');
const fetch = global.fetch;

function toRad(d){ return d * Math.PI / 180; }
function haversineKm(a,b){
  const R=6371, dLat=toRad(b.lat-a.lat), dLon=toRad(b.lon-a.lon);
  const lat1=toRad(a.lat), lat2=toRad(b.lat);
  const h=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

exports.handler = async (event) => {
  try{
    if (event.httpMethod !== 'POST'){
      return { statusCode: 405, headers:{'Allow':'POST'}, body: 'Method Not Allowed' };
    }
    const { partner_email } = JSON.parse(event.body || '{}');
    if (!partner_email) return { statusCode: 400, body: JSON.stringify({ error:'Missing partner_email' }) };

    const siteId = process.env.NETLIFY_SITE_ID;
    const token  = process.env.NETLIFY_AUTH_TOKEN;
    const orsKey = process.env.ORS_API_KEY;
    if (!siteId || !token) return { statusCode:500, body: JSON.stringify({ error:'Missing NETLIFY_SITE_ID or NETLIFY_AUTH_TOKEN' }) };
    if (!orsKey) return { statusCode:500, body: JSON.stringify({ error:'Missing ORS_API_KEY' }) };

    // settings + partners
    const settingsPath = path.join(process.cwd(), 'settings.json');
    const partnersPath = path.join(process.cwd(), 'partners.json');
    const SETTINGS = JSON.parse(fs.readFileSync(settingsPath,'utf-8'));
    const PARTNERS = JSON.parse(fs.readFileSync(partnersPath,'utf-8'));
    const partner = (PARTNERS.items||[]).find(p => (p.email||'').toLowerCase() === partner_email.toLowerCase());
    if (!partner) return { statusCode:404, body: JSON.stringify({ error:'Partner non trovato. Controlla l’email.' }) };

    // geocode partner se mancano coord
    async function geocode(addr){
      const u = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(orsKey)}&text=${encodeURIComponent(addr)}&boundary.country=IT&size=1`;
      const r = await fetch(u); const j = await r.json();
      const f = j.features && j.features[0];
      if (!f) return null;
      const [lon,lat] = f.geometry.coordinates; return { lat, lon, label: f.properties.label };
    }
    async function routeKm(from,to){
      const url = `https://api.openrouteservice.org/v2/directions/driving-car`;
      const res = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':orsKey},
        body: JSON.stringify({ coordinates:[[from.lon,from.lat],[to.lon,to.lat]] })
      });
      const data = await res.json();
      const sum = data.routes && data.routes[0] && data.routes[0].summary;
      return sum ? (sum.distance||0)/1000 : Infinity;
    }

    let pCoord = partner.lat && partner.lon ? {lat:partner.lat,lon:partner.lon} : null;
    if (!pCoord){
      const pAddr = `${partner.address.street||''} ${partner.address.number||''}, ${partner.address.zip||''} ${partner.address.city||''}, ${partner.address.region||''}, Italia`;
      const g = await geocode(pAddr);
      if (!g) return { statusCode:500, body: JSON.stringify({ error:'Impossibile geocodificare il domicilio partner' }) };
      pCoord = { lat:g.lat, lon:g.lon };
    }
    const radius = Number(partner.radius_km || 25);
    const windowHours = Number(SETTINGS.bid_window_hours || 12);

    // trova il form "prenota"
    const fr = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/forms`, {
      headers:{ 'Authorization':`Bearer ${token}` }
    });
    const forms = await fr.json();
    const fPrenota = (forms||[]).find(f => (f.name||'').toLowerCase() === 'prenota');
    if (!fPrenota) return { statusCode:500, body: JSON.stringify({ error:'Form prenota non trovato' }) };

    // leggi le ultime submission
    const sr = await fetch(`https://api.netlify.com/api/v1/forms/${fPrenota.id}/submissions?per_page=100`, {
      headers:{ 'Authorization':`Bearer ${token}` }
    });
    const subs = await sr.json();

    const now = Date.now();
    const within = subs.filter(s => {
      const t = new Date(s.created_at).getTime();
      return (now - t) <= windowHours*3600*1000;
    });

    // costruisci annunci con distanza
    const items = [];
    for (const s of within){
      const d = s.data || {};
      const addr = `${d['indirizzo']||''}, ${d['citta']||''} ${d['cap']||''}, ${d['regione']||''}, Italia`;
      const gc = await geocode(addr);
      if (!gc) continue;
      // filtro raggio (prima Haversine, poi routing)
      const hav = haversineKm({lat:pCoord.lat,lon:pCoord.lon}, {lat:gc.lat,lon:gc.lon});
      if (hav > radius + 5) continue; // scarta lontanissimi
      const km = await routeKm({lat:pCoord.lat,lon:pCoord.lon}, {lat:gc.lat,lon:gc.lon});
      if (km > radius + 0.1) continue;

      items.push({
        id: s.id,
        id_short: s.number || s.id.slice(0,7),
        created_at: s.created_at,
        address: addr,
        citta: d['citta'] || '',
        regione: d['regione'] || '',
        cap: d['cap'] || '',
        mq: Number(d['mq'] || 0),
        durata: Number(d['durata'] || 1),
        data: d['data'] || '',
        ora: d['ora'] || '',
        note: d['note'] || '',
        distance_km: km,
        suggerita: Math.max(8, Number(partner.rate_eur_h || 12))
      });
    }

    // ordina per più recenti
    items.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));

    return { statusCode:200, headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify({ items }) };
  }catch(e){
    return { statusCode:500, body: JSON.stringify({ error:e.message }) };
  }
};
