/* B&B Clean — stima.js */
(function(){
  'use strict';

  const $ = s => document.querySelector(s);
  const euro = v => (v==null || isNaN(v)) ? '—' :
    new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v);
  const roundHalf = num => Math.round(num*2)/2;

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
  const btnPrenota = $('#btn-prenota');

  let SETTINGS = { m2_per_hour: 35, pricing_policy: 'avg' };
  fetch('/settings.json').then(r=>r.ok?r.json():{}).then(js=>{
    if (js && typeof js==='object') SETTINGS = Object.assign(SETTINGS, js);
  }).catch(()=>{});

  fetch('/assets/data/comuni.json').then(r=>r.ok?r.json():[]).then(list=>{
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
  }).catch(()=>{});

  function haversine(lat1, lon1, lat2, lon2){
    const toRad = x => x * Math.PI / 180, R = 6371;
    const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  async function geocodeAddress(q){
    const res = await fetch('/.netlify/functions/geocode?q=' + encodeURIComponent(q));
    if (!res.ok) throw new Error('Geocoding non disponibile');
    const js = await res.json();
    if (!js || !js.lat || !js.lon) throw new Error('Indirizzo non trovato');
    return { lat: js.lat, lon: js.lon, raw: js.raw };
  }

  async function loadPartner(){
    const res = await fetch('/assets/data/partner.json');
    if (!res.ok) throw new Error('partner.json mancante');
    return res.json();
  }

  function estimateCost(mq, partner, settings){
    const mph = settings.m2_per_hour || 35;
    const oreBase = Math.max(1, roundHalf(mq / mph));
    if (!partner || partner.length === 0) return { ore: oreBase, costo: null };
    const rates = partner.map(p => Number(p.hourly_rate || 0)).filter(v=>v>0);
    const rate = (settings.pricing_policy === 'min') ? Math.min(...rates) : (rates.reduce((a,b)=>a+b,0) / rates.length);
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
      const q = `${indirizzo}, ${citta}, ${regione}, Italia`;
      const pos = await geocodeAddress(q);
      const partner = await loadPartner();

      const arr = partner.map(p=>{
        const d = haversine(pos.lat, pos.lon, p.lat, p.lon);
        return Object.assign({}, p, { distanza_km: d });
      });

      const inRaggio = arr.filter(p=> p.distanza_km <= (p.raggio_km || 25))
                          .sort((a,b)=> a.distanza_km - b.distanza_km);

      let considerati = inRaggio;
      let note = '';
      if (considerati.length === 0){
        considerati = arr.sort((a,b)=> a.distanza_km - b.distanza_km).slice(0,3);
        note = 'Nessun partner nel raggio operativo: stima indicativa calcolata sui 3 più vicini.';
      } else {
        note = `Stima calcolata su ${considerati.length} partner nel raggio operativo.`;
      }

      const { ore, costo } = estimateCost(mq, considerati, SETTINGS);

      outDurata.textContent = `${ore.toString().replace('.',',')} h`;
      outCosto.textContent = (costo==null) ? '—' : euro(costo);
      outCleaner.innerHTML = considerati.map(p=>{
        const d = (Math.round(p.distanza_km*10)/10).toString().replace('.',',');
        return `${p.nome || 'Cleaner'} — ${d} km`;
      }).slice(0,3).join('<br>') || '—';
      outNote.textContent = note;

      // Prepara link "Prenota ora" -> /login.html con parametri
      const params = new URLSearchParams({
        regione, citta, indirizzo, mq: String(mq)
      });
      btnPrenota.setAttribute('href', '/login.html?' + params.toString());

      outWrap.style.display = 'block';
      outWrap.scrollIntoView({behavior:'smooth', block:'start'});
    }catch(err){
      console.error(err);
      alert('Non sono riuscito a calcolare la stima. Verifica l’indirizzo e riprova');
    }
  });

})();
