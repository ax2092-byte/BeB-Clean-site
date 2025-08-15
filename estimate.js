const fs = require('fs');
const path = require('path');
const fetch = global.fetch;

function haversineKm(a, b){
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const address = body.address;
    const hours = Number(body.duration_hours || 1);
    if (!address) return { statusCode: 400, body: JSON.stringify({ error: "Missing address" }) };

    const key = process.env.ORS_API_KEY;
    if (!key) return { statusCode: 500, body: JSON.stringify({ error: "Missing ORS_API_KEY" }) };

    // Geocode cliente
    const geoUrl = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(key)}&text=${encodeURIComponent(address)}&boundary.country=IT&size=1`;
    const gres = await fetch(geoUrl);
    const gjs = await gres.json();
    const feature = gjs.features && gjs.features[0];
    if (!feature) return { statusCode: 404, body: JSON.stringify({ error: "Address not found" }) };
    const [clon, clat] = feature.geometry.coordinates;
    const client = { lat: clat, lon: clon };

    // Carica partner
    const pPath = path.join(process.cwd(), 'partners.json');
    let partners = [];
    try{
      const raw = fs.readFileSync(pPath, 'utf-8');
      const js = JSON.parse(raw);
      partners = (js.items || []).filter(p => p && p.active !== false);
    }catch(_){}

    if (partners.length === 0){
      return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({
        note: "Nessun partner configurato.",
        partner_rate_eur_h: 12,
        distance_km: 0,
        client
      })};
    }

    // Geocode partner mancanti
    for (const p of partners){
      if ((!p.lat || !p.lon) && p.address){
        try{
          const pa = `${p.address.street||''} ${p.address.number||''}, ${p.address.zip||''} ${p.address.city||''}, ${p.address.region||''}, Italia`;
          const u = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(key)}&text=${encodeURIComponent(pa)}&boundary.country=IT&size=1`;
          const r = await fetch(u);
          const j = await r.json();
          const f = j.features && j.features[0];
          if (f){ p.lon = f.geometry.coordinates[0]; p.lat = f.geometry.coordinates[1]; }
        }catch(_){}
      }
    }

    // Prefiltro: entro raggio con Haversine
    const candidates = partners.map(p => {
      if (!p.lat || !p.lon) return null;
      const hav = haversineKm(client, { lat: p.lat, lon: p.lon });
      const radius = Number(p.radius_km || 25);
      return { p, hav_km: hav, within: hav <= radius };
    }).filter(x => x && x.within);

    if (candidates.length === 0){
      return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({
        note: "Nessun partner nel raggio selezionato.",
        partner_rate_eur_h: 12,
        distance_km: 0,
        client
      })};
    }

    // Prendi le 3 più vicine con Haversine, poi routing reale
    candidates.sort((a,b)=>a.hav_km - b.hav_km);
    const top = candidates.slice(0, Math.min(3, candidates.length));

    async function routeKm(from, to){
      try{
        const url = `https://api.openrouteservice.org/v2/directions/driving-car`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": key },
          body: JSON.stringify({ coordinates: [[from.lon, from.lat], [to.lon, to.lat]] })
        });
        const data = await res.json();
        const sum = data.routes && data.routes[0] && data.routes[0].summary;
        return sum ? (sum.distance||0)/1000 : Infinity;
      }catch(e){ return Infinity; }
    }

    const routes = [];
    for (const t of top){
      const km = await routeKm({lat:t.p.lat, lon:t.p.lon}, client);
      if (km <= (Number(t.p.radius_km || 25) + 0.1)) {
        routes.push({ partner: t.p, km });
      }
    }
    if (routes.length === 0){
      return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({
        note: "Nessun partner nel raggio (su strada).",
        partner_rate_eur_h: 12,
        distance_km: 0,
        client
      })};
    }

    routes.sort((a,b)=>a.km - b.km);
    const best = routes[0];
    const rate = Math.max(8, Number(best.partner.rate_eur_h || 12));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        partner_id: best.partner.id || null,
        partner_rate_eur_h: rate,
        distance_km: best.km,
        note: `Partner selezionato: ~${Math.round(best.km)} km`,
        client
      })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
