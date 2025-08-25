// B&B Clean — Geocoding helper (via Netlify Function proxy) + utilità Comuni
// Ora il browser NON chiama più Nominatim diretto (CSP-safe).
// Endpoint usato: /.netlify/functions/geocode?q=<query>

async function geocodeViaNominatim(address, city, region){
  // Manteniamo la stessa firma usata da stima.html / partner-domicile.js
  const q = [address, city, region, 'Italia'].filter(Boolean).join(', ');
  const url = '/.netlify/functions/geocode?q=' + encodeURIComponent(q);
  try{
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const js = await res.json();
    if (!js || typeof js.lat !== 'number' || typeof js.lon !== 'number') return null;
    return { lat: js.lat, lon: js.lon };
  }catch(_){ return null; }
}

// Popola un <datalist> con i Comuni (richiede /assets/data/comuni.json)
async function fillComuniDatalist(datalistId){
  try{
    const r = await fetch('/assets/data/comuni.json', { cache: 'no-store' });
    const js = await r.json();
    const dl = document.getElementById(datalistId);
    if (!dl) return;
    dl.innerHTML = '';
    js.forEach(c=>{
      const o = document.createElement('option');
      o.value = c.nome + (c.provincia ? ` (${c.provincia})` : '');
      dl.appendChild(o);
    });
  }catch(_){}
}
