// assets/js/prenota.js — stima + mappa + redirect Stripe
const euro = v => (v===null||isNaN(v)) ? '—' : new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v);

// valori caricati da settings.json (fallback se non disponibile)
let SETTINGS = { m2_per_hour: 35 };
fetch('/settings.json').then(r=>r.json()).then(js=>{ SETTINGS = Object.assign(SETTINGS, js||{}); }).catch(()=>{});

function durataConsigliata(mq){
  if (!mq || mq <= 0) return 1;
  const ore = mq / (SETTINGS.m2_per_hour || 35);
  return Math.max(1, Math.round(ore * 2) / 2);
}
const numVal = id => {
  const el = document.getElementById(id);
  if (!el) return null;
  const n = el.valueAsNumber;
  return Number.isFinite(n) ? n : null;
};
function indirizzoCompleto(){
  const reg = (document.getElementById('regione').value || '').trim();
  const cit = (document.getElementById('citta').value || '').trim();
  const cap = (document.getElementById('cap').value || '').trim();
  const ind = (document.getElementById('indirizzo').value || '').trim();
  if (!reg || !cit || !ind || !/^\d{5}$/.test(cap)) return null;
  return `${ind}, ${cit} ${cap}, ${reg}, Italia`; // ordine preferito ORS
}
let debounceId = null;
const debounce = (fn, ms=450) => { clearTimeout(debounceId); debounceId = setTimeout(fn, ms); };
function resetStima(msg='Completa i campi o riprova più tardi.'){
  document.getElementById('stimaTot').textContent = '—';
  document.getElementById('stimaAcconto').textContent = '—';
  document.getElementById('stimaRimb').textContent = '—';
  document.getElementById('stimaNote').textContent = msg;
  window.__lastEstimate = null;
}

// Leaflet map
let map, marker;
function ensureMap(){
  if (map) return map;
  map = L.map('map').setView([40.12, 9.65], 8); // Sardegna approx
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  marker = L.marker([40.12, 9.65]).addTo(map);
  return map;
}

async function stimaTotale(){
  const address = indirizzoCompleto();
  const durata = numVal('durata') ?? 1;
  if (!address){
    resetStima('Inserisci via/civico, città, CAP (5 cifre) e regione.');
    return;
  }
  try{
    const r = await fetch('/.netlify/functions/estimate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ address, duration_hours: durata })
    });
    const js = await r.json();
    if(!r.ok) throw new Error(js.error || 'Errore stima');

    const rate = Number(js.partner_rate_eur_h || 12);
    const km = Number(js.distance_km || 0);
    const compPartner = rate * durata;   // tariffa × ore (senza rimborso)
    const acconto = compPartner * 0.10;  // 10%
    const rimborso = km * 0.25;          // 0,25 €/km
    const totale = compPartner + rimborso;

    document.getElementById('stimaTot').textContent = euro(totale);
    document.getElementById('stimaAcconto').textContent = euro(acconto);
    document.getElementById('stimaRimb').textContent = euro(rimborso);
    document.getElementById('stimaNote').textContent = js.note || 'Partner più vicino trovato.';

    // mappa
    if (js.client && typeof L !== 'undefined'){
      ensureMap();
      marker.setLatLng([js.client.lat, js.client.lon]);
      map.setView([js.client.lat, js.client.lon], 13);
    }

    window.__lastEstimate = { address, durata, rate, km, acconto };
  }catch(e){
    resetStima('Impossibile calcolare la stima. Riprova tra poco.');
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const mqEl = document.getElementById('mq');
  const durataEl = document.getElementById('durata');
  let durataModificata = false;

  mqEl.addEventListener('input', ()=>{
    const m = numVal('mq') ?? 0;
    if (!durataModificata){
      const d = durataConsigliata(m);
      if (Number.isFinite(d)) durataEl.value = d;
    }
    debounce(stimaTotale);
  });
  ['input','change'].forEach(evt=>{
    durataEl.addEventListener(evt, ()=>{ durataModificata = true; debounce(stimaTotale); });
  });
  ['regione','citta','cap','indirizzo'].forEach(id=>{
    const el = document.getElementById(id);
    ['input','change'].forEach(evt=> el.addEventListener(evt, ()=>debounce(stimaTotale)));
  });

  const form = document.getElementById('bookForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = document.getElementById('payBtn');
    if (btn){ btn.disabled = true; btn.textContent = 'Attendi…'; }

    const est = window.__lastEstimate;
    if (!est){ alert('Completa i campi per calcolare la stima.'); if (btn){ btn.disabled=false; btn.textContent='Conferma & paga acconto'; } return; }

    try{
      const fd = new FormData(form);
      const body = new URLSearchParams(fd).toString();
      await fetch('/', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });

      const r = await fetch('/.netlify/functions/checkout', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          acconto_eur: est.acconto,
          meta: { durata_ore: est.durata, km: est.km, address: est.address }
        })
      });
      const js = await r.json();
      if (!r.ok || !js.url) throw new Error((js && js.error) || 'Errore checkout');
      window.location.href = js.url;
    }catch(err){
      alert('Pagamento non avviato. Riprova.');
      if (btn){ btn.disabled=false; btn.textContent='Conferma & paga acconto'; }
    }
  });

  // prima stima
  debounce(stimaTotale, 0);
});
