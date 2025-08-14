// assets/js/prenota.js — fix: CAP guard, ordine indirizzo, valueAsNumber, debounce, ore corrette
const euro = v => (v===null||isNaN(v)) ? '—' : new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v);

// durata consigliata da m² (35 m²/h), arrotondata alla mezz’ora
function durataConsigliata(mq){
  if (!mq || mq <= 0) return 1;
  const ore = mq / 35;
  return Math.max(1, Math.round(ore * 2) / 2);
}

// legge numero dal <input type="number"> rispettando la virgola
const numVal = id => {
  const el = document.getElementById(id);
  if (!el) return null;
  const n = el.valueAsNumber;
  return Number.isFinite(n) ? n : null;
};

// costruisce indirizzo SOLO se completo
function indirizzoCompleto(){
  const reg = (document.getElementById('regione').value || '').trim();
  const cit = (document.getElementById('citta').value || '').trim();
  const cap = (document.getElementById('cap').value || '').trim();
  const ind = (document.getElementById('indirizzo').value || '').trim();
  if (!reg || !cit || !ind || !/^\d{5}$/.test(cap)) return null;
  // Ordine preferito da ORS: "via, città CAP, regione, Italia"
  return `${ind}, ${cit} ${cap}, ${reg}, Italia`;
}

let debounceId = null;
const debounce = (fn, ms=500) => {
  clearTimeout(debounceId);
  debounceId = setTimeout(fn, ms);
};

function resetStima(msg='Completa i campi o riprova più tardi.'){
  document.getElementById('stimaTot').textContent = '—';
  document.getElementById('stimaAcconto').textContent = '—';
  document.getElementById('stimaRimb').textContent = '—';
  document.getElementById('stimaNote').textContent = msg;
  window.__lastEstimate = null;
}

async function stimaTotale(){
  const address = indirizzoCompleto();
  const durata = numVal('durata') ?? 1;
  const mq = numVal('mq') ?? 0;

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
    const compPartner = rate * durata;  // solo tariffa × ore (senza rimborso)
    const acconto = compPartner * 0.10; // 10%
    const rimborso = km * 0.25;         // 0,25 €/km
    const totale = compPartner + rimborso;

    document.getElementById('stimaTot').textContent = euro(totale);
    document.getElementById('stimaAcconto').textContent = euro(acconto);
    document.getElementById('stimaRimb').textContent = euro(rimborso);
    document.getElementById('stimaNote').textContent = js.note || 'Partner più vicino trovato.';

    window.__lastEstimate = { address, durata, rate, km, acconto };
  }catch(e){
    resetStima('Impossibile calcolare la stima. Riprova tra poco.');
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const mqEl = document.getElementById('mq');
  const durataEl = document.getElementById('durata');
  let durataModificata = false;

  // quando cambi m², proporre durata consigliata SOLO se non l'hai toccata manualmente
  mqEl.addEventListener('input', ()=>{
    const m = numVal('mq') ?? 0;
    if (!durataModificata){
      const d = durataConsigliata(m);
      if (Number.isFinite(d)) durataEl.value = d;
    }
    debounce(stimaTotale);
  });

  // se tocchi manualmente la durata, da lì in poi la rispettiamo
  ['input','change'].forEach(evt=>{
    durataEl.addEventListener(evt, ()=>{
      durataModificata = true;
      debounce(stimaTotale);
    });
  });

  // ricalcolo quando compili indirizzo / CAP / città / regione
  ['regione','citta','cap','indirizzo'].forEach(id=>{
    const el = document.getElementById(id);
    ['input','change'].forEach(evt=> el.addEventListener(evt, ()=>debounce(stimaTotale)));
  });

  // submit con redirect a Stripe (come già impostato)
  const form = document.getElementById('bookForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = document.getElementByI
