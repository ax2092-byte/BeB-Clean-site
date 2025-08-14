// assets/js/prenota.js — versione con redirect a Stripe (niente popup)
// e invio della submission a Netlify Forms PRIMA del redirect.

const euro = v => (v===null||isNaN(v)) ? '—' : (new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v));

// durata consigliata da m² (35 m²/h), arrotondata alla mezz’ora
function durataConsigliata(mq){
  if (!mq || mq<=0) return 1;
  const ore = mq / 35;
  return Math.max(1, Math.round(ore*2)/2);
}

// indirizzo completo
function fullAddress(){
  const reg = document.getElementById('regione').value || '';
  const cit = document.getElementById('citta').value || '';
  const cap = document.getElementById('cap').value || '';
  const ind = document.getElementById('indirizzo').value || '';
  return `${ind}, ${cap} ${cit}, ${reg}, Italia`;
}

async function stimaTotale(){
  const mq = parseFloat(document.getElementById('mq').value || '0');
  const durata = parseFloat(document.getElementById('durata').value || '1');
  const address = fullAddress();

  try{
    const r = await fetch('/.netlify/functions/estimate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ address, duration_hours: durata })
    });
    const js = await r.json();
    if(!r.ok){ throw new Error(js.error || 'Errore stima'); }

    const rate = js.partner_rate_eur_h;
    const km = js.distance_km;
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
    document.getElementById('stimaTot').textContent = '—';
    document.getElementById('stimaAcconto').textContent = '—';
    document.getElementById('stimaRimb').textContent = '—';
    document.getElementById('stimaNote').textContent = 'Completa i campi o riprova più tardi.';
    window.__lastEstimate = null;
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const mq = document.getElementById('mq');
  const durata = document.getElementById('durata');
  const ids = ['mq','durata','regione','citta','cap','indirizzo'];

  // m² -> durata consigliata
  mq.addEventListener('input', ()=>{
    const m = parseFloat(mq.value||'0');
    const d = durataConsigliata(m);
    if (!isNaN(d)) durata.value = d;
    stimaTotale();
  });

  // ricalcolo stime su input
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', stimaTotale);
  });

  // submit: 1) invia la submission a Netlify Forms, 2) crea checkout, 3) redirect a Stripe
  const form = document.getElementById('bookForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); // niente submit “nativo”: gestiamo noi

    const btn = document.getElementById('payBtn');
    if (btn){ btn.disabled = true; btn.textContent = 'Attendi…'; }

    const est = window.__lastEstimate;
    if (!est){
      alert('Completa indirizzo e m² per calcolare la stima prima di procedere.');
      if (btn){ btn.disabled = false; btn.textContent = 'Conferma & paga acconto'; }
      return;
    }

    try{
      // 1) registra comunque la richiesta su Netlify Forms
      const fd = new FormData(form);
      const body = new URLSearchParams(fd).toString();
      await fetch('/', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });

      // 2) crea la sessione di pagamento su Stripe (acconto 10%)
      const r = await fetch('/.netlify/functions/checkout', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          acconto_eur: est.acconto,
          meta: { durata_ore: est.durata, km: est.km, address: est.address }
        })
      });
      const js = await r.json();
      if (!r.ok || !js.url) {
        throw new Error((js && js.error) || 'Errore durante la creazione del checkout');
      }

      // 3) apri Stripe nella STESSA scheda (niente popup)
      window.location.href = js.url;

    }catch(err){
      console.error(err);
      alert('Impossibile avviare il pagamento. Riprova tra poco.');
      if (btn){ btn.disabled = false; btn.textContent = 'Conferma & paga acconto'; }
    }
  });

  // prima stima
  stimaTotale();
});
