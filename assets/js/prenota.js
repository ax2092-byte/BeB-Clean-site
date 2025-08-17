// assets/js/prenota.js — stima + mappa + notify email + redirect Stripe
const euro = v =>
  (v === null || isNaN(v))
    ? '—'
    : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);

// valori caricati da settings.json (fallback se non disponibile)
let SETTINGS = { m2_per_hour: 35 };
fetch('/settings.json')
  .then(r => r.json())
  .then(js => { SETTINGS = Object.assign(SETTINGS, js || {}); })
  .catch(() => {});

function durataConsigliata(mq) {
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
function indirizzoCompleto() {
  const reg = (document.getElementById('regione').value || '').trim();
  const cit = (document.getElementById('citta').value || '').trim();
  const cap = (document.getElementById('cap').value || '').trim();
  const ind = (document.getElementById('indirizzo').value || '').trim();
  if (!reg || !cit || !ind || !/^[0-9]{5}$/.test(cap)) return null;
  return `${ind}, ${cit} ${cap}, ${reg}, Italia`;
}
let debounceId = null;
const debounce = (fn, ms = 450) => { clearTimeout(debounceId); debounceId = setTimeout(fn, ms); };

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function resetStima(msg = 'Completa i campi o riprova più tardi.') {
  setText('stimaTot', '—');
  setText('stimaAcconto', '—');
  setText('stimaRimb', '—');
  setText('stimaFee', '—'); // se esiste il campo per la fee
  setText('stimaNote', msg);
  window.__lastEstimate = null;
}

// Leaflet map
let map, marker;
function ensureMap() {
  if (map) return map;
  map = L.map('map').setView([40.12, 9.65], 8); // Sardegna approx
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  marker = L.marker([40.12, 9.65]).addTo(map);
  return map;
}

async function stimaTotale() {
  const address = indirizzoCompleto();
  const durata = numVal('durata') ?? 1;
  if (!address) {
    resetStima('Inserisci via/civico, città, CAP (5 cifre) e regione.');
    return;
  }
  try {
    const r = await fetch('/.netlify/functions/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, duration_hours: durata })
    });
    const js = await r.json();
    if (!r.ok) throw new Error(js.error || 'Errore stima');

    // Dati base dalla funzione server
    const rate = Number(js.partner_rate_eur_h ?? 12);
    const kmRaw = Number(js.distance_km ?? 0);
    const km = Math.round(kmRaw * 100) / 100;        // km (SOLO ANDATA), 2 decimali

    // Calcoli economici
    const lavoro = Math.round(rate * durata * 100) / 100;                   // tariffa × ore
    const costiServizio = Math.round(lavoro * 0.05 * 100) / 100;            // 5% sul lavoro (no rimborso)
    const rimborso = Math.round(km * 0.25 * 100) / 100;                     // 0,25 €/km (solo andata)
    const totale = Math.round((lavoro + costiServizio + rimborso) * 100) / 100;
    const acconto = Math.round(lavoro * 0.10 * 100) / 100;                  // 10% sul lavoro

    // UI
    setText('stimaTot', euro(totale));
    setText('stimaAcconto', euro(acconto));
    setText('stimaRimb', euro(rimborso));
    if (document.getElementById('stimaFee')) {
      setText('stimaFee', euro(costiServizio));
      setText('stimaNote', js.note || 'A partire da: partner più vicino e tariffa più bassa disponibili.');
    } else {
      // Se non c’è una riga dedicata alla fee, la indichiamo in nota
      setText('stimaNote', (js.note ? js.note + ' — ' : 'A partire da. ')
        + `Costi del servizio B&B Clean (5%): ${euro(costiServizio)}`);
    }

    // mappa
    if (js.client && typeof L !== 'undefined') {
      ensureMap();
      marker.setLatLng([js.client.lat, js.client.lon]);
      map.setView([js.client.lat, js.client.lon], 13);
    }

    // salva per checkout/notify
    window.__lastEstimate = {
      address, durata, rate, km, lavoro, costiServizio, rimborso, totale, acconto
    };
  } catch (e) {
    resetStima('Impossibile calcolare la stima. Riprova tra poco.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const mqEl = document.getElementById('mq');
  const durataEl = document.getElementById('durata');

  // Aggiorna SEMPRE la durata quando cambiano i m²
  mqEl.addEventListener('input', () => {
    const m = numVal('mq') ?? 0;
    const d = durataConsigliata(m);
    if (Number.isFinite(d)) durataEl.value = d;
    debounce(stimaTotale);
  });

  // Se cambi le ore manualmente, ricalcolo comunque la stima
  ['input', 'change'].forEach(evt => {
    durataEl.addEventListener(evt, () => { debounce(stimaTotale); });
  });

  // ricalcolo quando compili indirizzo / CAP / città / regione
  ['regione', 'citta', 'cap', 'indirizzo'].forEach(id => {
    const el = document.getElementById(id);
    ['input', 'change'].forEach(evt => el.addEventListener(evt, () => debounce(stimaTotale)));
  });

  const form = document.getElementById('bookForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('payBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Attendi…'; }

    const est = window.__lastEstimate;
    if (!est) {
      alert('Completa i campi per calcolare la stima.');
      if (btn) { btn.disabled = false; btn.textContent = 'Conferma & paga acconto'; }
      return;
    }

    try {
      // 1) registra la submission su Netlify Forms
      const fd = new FormData(form);
      const formObj = Object.fromEntries(fd.entries());
      const bodyEncoded = new URLSearchParams(fd).toString();
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyEncoded
      });

      // 2) notifica via funzione (non blocca se fallisce)
      try {
        await fetch('/.netlify/functions/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'booking', data: formObj, estimate: est })
        });
      } catch (_) { }

      // 3) crea sessione Stripe e vai al checkout
      const r = await fetch('/.netlify/functions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acconto_eur: est.acconto,
          meta: { durata_ore: est.durata, km: est.km, address: est.address }
        })
      });
      const js = await r.json();
      if (!r.ok || !js.url) throw new Error((js && js.error) || 'Errore checkout');
      window.location.href = js.url;
    } catch (err) {
      alert('Pagamento non avviato. Riprova.');
      if (btn) { btn.disabled = false; btn.textContent = 'Conferma & paga acconto'; }
    }
  });

  // prima stima
  debounce(stimaTotale, 0);
});
