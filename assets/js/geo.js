// B&B Clean — Geocoding helper (Nominatim) + utilità Comuni
// Usa: const geo = await geocodeViaNominatim(address, city, region); -> {lat, lon} | null

async function geocodeViaNominatim(address, city, region){
  const q = [address, city, region, 'Italia'].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(q)}`;
  try{
    const res = await fetch(url, { headers:{ 'Accept-Language':'it' } });
    if (!res.ok) return null;
    const js = await res.json();
    if (!js || !js.length) return null;
    return { lat: parseFloat(js[0].lat), lon: parseFloat(js[0].lon) };
  }catch(_){ return null; }
}

// Popola un <datalist> con i Comuni (richiede /assets/data/comuni.json)
async function fillComuniDatalist(datalistId){
  try{
    const r = await fetch('/assets/data/comuni.json',{cache:'no-store'});
    const js = await r.json();
    const dl = document.getElementById(datalistId);
    if (!dl) return;
    js.forEach(c=>{
      const o = document.createElement('option');
      o.value = c.nome + (c.provincia ? ` (${c.provincia})` : '');
      dl.appendChild(o);
    });
  }catch(_){}
}
