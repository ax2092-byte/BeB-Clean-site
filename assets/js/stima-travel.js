// FILE: /assets/js/stima-travel.js
// B&B Clean — Rimborso km (SOLO ANDATA) per Stima, senza toccare formule esistenti.
// - Usa /.netlify/functions/route (OpenRouteService) per km su strada.
// - KM_RATE = 0.20 €/km ; TRIP_MULTIPLIER = 1 (solo andata).
// - Aggiunge/aggiorna una riga "Rimborso km" nel riepilogo e somma al totale visualizzato,
//   senza rinominare i tuoi ID. Se mancano coordinate, non mostra la riga e lascia il totale invariato.

(function(){
  const KM_RATE = 0.20;
  const TRIP_MULTIPLIER = 1; // SOLO ANDATA (se volessi A/R: 2)
  const ROUTE_FN = '/.netlify/functions/route';

  // ---- Utils ---------------------------------------------------------------
  const € = (n)=> new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR', maximumFractionDigits:2 }).format(n);
  function parse€(txt){
    if (!txt) return NaN;
    const s = String(txt).replace(/[€\s]/g,'').replace(/\./g,'').replace(',', '.');
    const v = parseFloat(s);
    return isFinite(v) ? v : NaN;
  }
  const once = (fn) => { let done=false, val; return (...a)=> done ? val : (done=true, val=fn(...a)); };

  function haversineKm(a, b){
    const R = 6371;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // Trova il container del riepilogo e l'elemento del totale (robusto verso markup diverso)
  function findSummary(){
    const card = document.querySelector('.summary-card') ||
                 document.querySelector('[data-summary]') ||
                 document.querySelector('.summary') ||
                 document.querySelector('[id*="summary"], [id*="riepilogo"]');
    if (!card) return null;

    const totalEl =
      card.querySelector('.total') ||
      card.querySelector('[data-total]') ||
      card.querySelector('#total, #totale, #total-amount');

    // dove appendere le righe (creiamo un contenitore se manca)
    let linesHost = card.querySelector('.lines');
    if (!linesHost){
      linesHost = document.createElement('div');
      linesHost.className = 'lines';
      // inseriamo prima del totale se possibile, altrimenti in fondo
      if (totalEl && totalEl.parentElement && totalEl.parentElement !== card){
        totalEl.parentElement.insertAdjacentElement('beforebegin', linesHost);
      } else {
        card.appendChild(linesHost);
      }
    }
    return { card, totalEl, linesHost };
  }

  // Rileva i campi indirizzo (per geocode lato client) in modo flessibile
  function readAddressParts(){
    const sel = (q)=> document.querySelector(q);
    const address =
      (sel('#indirizzo')||sel('#address')||sel('#via')||
       sel('input[name="indirizzo"]')||sel('input[name="address"]')||sel('input[name="via"]'))?.value?.trim();
    const city =
      (sel('#citta')||sel('#city')||sel('#comune')||
       sel('input[name="citta"]')||sel('input[name="city"]')||sel('input[name="comune"]'))?.value?.trim();
    const region =
      (sel('#provincia')||sel('#regione')||
       sel('input[name="provincia"]')||sel('input[name="regione"]'))?.value?.trim();
    return { address: address||'', city: city||'', region: region||'' };
  }

  // Legge eventuali hidden con le coordinate già calcolate
  function readClientCoords(){
    const pick = (id)=> {
      const el = document.getElementById(id);
      return el ? parseFloat(el.value || el.textContent) : NaN;
    };
    const candidates = [
      { latId:'geo-lat', lonId:'geo-lon' },
      { latId:'lat', lonId:'lon' },
      { latId:'client-lat', lonId:'client-lon' },
    ];
    for (const c of candidates){
      const lat = pick(c.latId), lon = pick(c.lonId);
      if (isFinite(lat) && isFinite(lon)) return { lat, lon };
    }
    // fallback da oggetti globali se presenti
    const g = (window.__stima && window.__stima.client) ? window.__stima.client : null;
    if (g && isFinite(g.lat) && isFinite(g.lon)) return { lat:g.lat, lon:g.lon };
    return null;
  }

  // Geocoding via funzione già presente in /assets/js/geo.js
  async function getClientCoords(){
    const known = readClientCoords();
    if (known) return known;
    if (typeof geocodeViaNominatim === 'function'){
      const { address, city, region } = readAddressParts();
      const pos = await geocodeViaNominatim(address, city, region);
      if (pos && isFinite(pos.lat) && isFinite(pos.lon)) return pos;
    }
    return null;
  }

  // Pick partner più vicino dai dati statici (non tocchiamo altre logiche)
  const loadPartners = once(async function(){
    try{
      const r = await fetch('/assets/data/partner.json', { cache:'no-store' });
      const arr = await r.json();
      return Array.isArray(arr) ? arr : [];
    }catch(_){ return []; }
  });

  async function getNearestPartner(to){
    // Se il codice principale ne ha già uno scelto, usare quello
    const chosen = (window.__stima && window.__stima.partner) ? window.__stima.partner : null;
    if (chosen && isFinite(chosen.lat) && isFinite(chosen.lon)) return { lat: chosen.lat, lon: chosen.lon, ref: chosen };

    // Altrimenti calcola da /assets/data/partner.json
    const list = await loadPartners();
    let best = null, bestKm = Infinity;
    for (const p of list){
      const lat = parseFloat(p.lat), lon = parseFloat(p.lon);
      if (!isFinite(lat) || !isFinite(lon)) continue;
      const km = haversineKm(to, { lat, lon });
      if (km < bestKm){ bestKm = km; best = { lat, lon, ref:p }; }
    }
    return best;
  }

  async function routeKm(from, to){
    try{
      // Chiamata serverless a ORS
      const res = await fetch(ROUTE_FN, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ from, to })
      });
      if (!res.ok) throw new Error('route fn ' + res.status);
      const js = await res.json();
      const km = Number(js.distance_km);
      return isFinite(km) ? km : NaN;
    }catch(_){
      // Fallback: aria × 1.25
      const kmAir = haversineKm(from, to);
      return kmAir * 1.25;
    }
  }

  // Aggiorna DOM: riga "Rimborso km" + Totale
  function applyTravelToSummary(travelKm, travelCost){
    const S = findSummary(); if (!S || !S.totalEl) return;

    // Calcola baseTotal = totaleVisualizzato - eventuale rimborso già presente
    const currentTotal = parse€(S.totalEl.textContent);
    const existingLine = S.card.querySelector('#line-travel');
    const existingCost = existingLine ? parse€(existingLine.querySelector('strong')?.textContent) : 0;
    const baseTotal = isFinite(currentTotal) ? (currentTotal - (isFinite(existingCost) ? existingCost : 0)) : NaN;

    // Crea/aggiorna la riga
    let line = existingLine;
    if (!line){
      line = document.createElement('div');
      line.className = 'line';
      line.id = 'line-travel';
      line.innerHTML = `<span>Rimborso km</span><strong>€0,00</strong>`;
      S.linesHost.appendChild(line);
    }
    // Testo con km (una cifra decimale)
    const kmTxt = (Math.round(travelKm * 10) / 10).toLocaleString('it-IT', { minimumFractionDigits:1, maximumFractionDigits:1 });
    line.querySelector('span').textContent = `Rimborso km (solo andata, ${kmTxt} km)`;
    line.querySelector('strong').textContent = €(travelCost);

    // Aggiorna totale visualizzato (senza perdere il formato esistente)
    if (isFinite(baseTotal)){
      const newTotal = baseTotal + travelCost;
      S.totalEl.textContent = €(newTotal);
    }
  }

  function removeTravelFromSummary(){
    const S = findSummary(); if (!S || !S.totalEl) return;
    const currentTotal = parse€(S.totalEl.textContent);
    const line = S.card.querySelector('#line-travel');
    if (!line) return;
    const cost = parse€(line.querySelector('strong')?.textContent);
    line.remove();
    if (isFinite(currentTotal) && isFinite(cost)){
      const newTotal = currentTotal - cost;
      S.totalEl.textContent = €(newTotal);
    }
  }

  // ---- Recalc orchestrator -------------------------------------------------
  let pending = false, timer = null;
  async function recalcTravel(){
    if (pending) return; pending = true;
    try{
      const to = await getClientCoords();
      if (!to){ removeTravelFromSummary(); return; }

      const partner = await getNearestPartner(to);
      if (!partner){ removeTravelFromSummary(); return; }

      const kmOneWay = await routeKm(partner, to);
      if (!isFinite(kmOneWay) || kmOneWay <= 0){ removeTravelFromSummary(); return; }

      const kmBillable = kmOneWay * TRIP_MULTIPLIER; // 1 = solo andata
      const travelCost = Math.round(kmBillable * KM_RATE * 100) / 100;

      applyTravelToSummary(kmBillable, travelCost);
    } finally {
      pending = false;
    }
  }
  const debouncedRecalc = ()=> { clearTimeout(timer); timer = setTimeout(recalcTravel, 300); };

  // ---- Trigger: prova a reagire ai principali eventi senza toccare la logica esistente
  document.addEventListener('DOMContentLoaded', ()=>{
    if (document.body.dataset.page !== 'stima') return;

    // 1) Prova iniziale dopo il primo paint
    setTimeout(recalcTravel, 200);

    // 2) Ricalcola quando l'utente lancia la stima (diversi possibili bottoni)
    const buttons = [
      '#calcola-stima', '#btn-calc', 'button[type="submit"]',
      '[data-action="calcola"]', '[name="calcola"]'
    ];
    buttons.forEach(sel=>{
      document.querySelectorAll(sel).forEach(btn=>{
        btn.addEventListener('click', ()=> setTimeout(recalcTravel, 250), { passive:true });
      });
    });

    // 3) Cambi indirizzo/città → debounce
    const addrInputs = [
      '#indirizzo', '#address', '#via', 'input[name="indirizzo"]', 'input[name="address"]', 'input[name="via"]',
      '#citta', '#city', '#comune', 'input[name="citta"]', 'input[name="city"]', 'input[name="comune"]',
      '#provincia', '#regione', 'input[name="provincia"]', 'input[name="regione"]'
    ];
    addrInputs.forEach(sel=>{
      document.querySelectorAll(sel).forEach(i=>{
        ['change','blur','input'].forEach(ev=> i.addEventListener(ev, debouncedRecalc, { passive:true }));
      });
    });

    // 4) Se il riepilogo cambia testo (formule tue) → osserva e ricalcola
    const S = findSummary();
    if (S && S.card){
      const mo = new MutationObserver(()=> debouncedRecalc());
      mo.observe(S.card, { childList:true, characterData:true, subtree:true });
    }
  });
})();
