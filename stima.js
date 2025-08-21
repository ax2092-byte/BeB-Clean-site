/* B&B Clean — stima.js
   - Autocomplete dei comuni (da /assets/data/comuni.json)
   - Geocoding indirizzo via Netlify Function /.netlify/functions/geocode (OSM Nominatim)
   - Caricamento partners da /assets/data/partner.json
   - Calcolo distanza (Haversine), durata e costo medio sui partner nel raggio
*/
(function(){
  'use strict';

  const $ = s => document.querySelector(s);
  const euro = v => (v==null || isNaN(v)) ? '—' :
    new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v);
  const roundHalf = num => Math.round(num*2)/2;

  // DOM
  const form = $('#form-stima');
  const elReg = $('#regione');
  const elCitta = $('#citta');
  const elInd = $('#indirizzo');
  const elMq = $('#mq');
  const outWrap = $('#risultato');
  const outDurata = $('#out-durata');
  const outCosto = $('#out-costo');
  const outCleaner = $('#out-cleaner');
  const outNote = $('#out-note');
  const listComuni = $('#comuni-list');

  // SETTINGS di default (sovrascrivibili da /settings.json)
  let SETTINGS = {
    m2_per_hour: 35,
    pricing_policy: 'avg' // 'avg' media tariffe nel raggio; 'min' tariffa minima
  };

  // Carica settings
  fetch('/settings.json').then(r=>r.ok?r.json():{}).then(js=>{
    if (js && typeof js==='object') SETTINGS = Object.assign(SETTINGS, js);
  }).catch(()=>{}); // fallback

  // Carica datalist Comuni
  fetch('/assets/data/comuni.json')
    .then(r=>r.ok?r.json():[])
    .then(list=>{
      // Accetta sia array di oggetti {nome,provincia,codice} che array di stringhe
      const nomi = new Set();
      list.forEach(row=>{
        if (typeof row === 'string') nomi.add(row);
        else if (row && row.nome) nomi.add(row.nome);
      });
      const frag = document.createDocumentFragment();
      Array.from(nomi).sort().forEach(nome=>{
        const opt = document.createElement('option');
        opt.value = nome;
        frag.appendChild(opt);
      });
      listComuni.appendChild(frag);
    })
    .catch(()=>{ /* opzionale: silenzio */ });

  // Haversine (km)
  function haversine(lat1, lon1, lat2, lon2){
    const toRad = x => x * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2-lat1);
    const dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 +
              Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
  }

  async function geocodeAddress(q){
    const url = '/.netlify/functions/geocode?q=' + encodeURIComponent(q);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding non disponibile');
    const js = await res.json();
    if (!js || !js.lat || !js.lon) throw new Error('Indirizzo non trovato');
    return { lat: js.lat, lon: js.lon, raw: js.raw };
  }

  async function loadPartners(){
    const res = await fetch('/assets/data/partner.json');
    if (!res.ok) throw new Error('partner.json mancante');
    return res.json();
  }

  function estimateCost(mq, partners, settings){
    const mph = settings.m2_per_hour || 35;
    const oreBase = Math.max(1, roundHalf(mq / mph));

    if (!partners || partners.length === 0){
      return { ore: oreBase, costo: null };
    }

    // tariffe dei partner considerati
    const rates = partners.map(p => Number(p.hourly_rate || 0)).filter(v=>v>0);
    const rate = (settings.pricing_policy === 'min')
      ? Math.min(...rates)
      : (rates.reduce((a,b)=>a+b,0) / rates.length);

    return { ore: oreBase, costo: oreBase * rate };
  }

  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const regione = (elReg.value||'').trim();
    const citta = (elCitta.value||'').trim();
    const indirizzo = (elInd.value||'').trim();
    const mq = parseFloat(elMq.value);

    if (!regione || !citta || !indirizzo || !mq || mq<10){
      alert('Compila tutti i campi obbligatori (mq minimo 10).');
      return;
    }

    outWrap.style.display = 'none';
    outNote.textContent = '';
    outCleaner.textContent = '—';
    outDurata.textContent = '—';
    outCosto.textContent = '—';

    try{
      // 1) Geocoding
      const q = `${indirizzo}, ${citta}, ${regione}, Italia`;
      const pos = await geocodeAddress(q);

      // 2) Partner
      const partners = await loadPartners();

      // 3) Calcolo distanze
      const arr = partners.map(p=>{
        const d = haversine(pos.lat, pos.lon, p.lat, p.lon);
        return Object.assign({}, p, { distanza_km: d });
      });

      // Vicini nel raggio
      const inRaggio = arr.filter(p=> p.distanza_km <= (p.raggio_km || 25))
                          .sort((a,b)=> a.distanza_km - b.distanza_km);

      let considerati = inRaggio;
      let note = '';

      if (considerati.length === 0){
        // prendi i 3 più vicini come indicazione
        considerati = arr.sort((a,b)=> a.distanza_km - b.distanza_km).slice(0,3);
        note = 'Nessun partner nel raggio operativo: stima indicativa calcolata sui 3 più vicini.';
      } else {
        note = `Stima calcolata su ${considerati.length} partner nel raggio operativo.`;
      }

      // 4) Stima ore + costo
      const { ore, costo } = estimateCost(mq, considerati, SETTINGS);

      // 5) Output
      outDurata.textContent = `${ore.toString().replace('.',',')} h`;
      outCosto.textContent = (costo==null) ? '—' : euro(costo);
      outCleaner.innerHTML = considerati.map(p=>{
        const d = (Math.round(p.distanza_km*10)/10).toString().replace('.',',');
        return `${p.nome || 'Cleaner'} — ${d} km`;
      }).slice(0,3).join('<br>') || '—';
      outNote.textContent = note;

      outWrap.style.display = 'block';
      outWrap.scrollIntoView({behavior:'smooth', block:'start'});
    }catch(err){
      console.error(err);
      alert('Non sono riuscito a calcolare la stima. Verifica l’indirizzo e riprova.');
    }
  });

})();
