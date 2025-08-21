/* B&B Clean — prenota.js (completo)
   - Carica impostazioni da /settings.json (fallback locale)
   - Calcola durata e costo
   - Evita errori: controlli sugli ID e binding sicuri
*/

(function () {
  "use strict";

  // ---- Utils
  const euro = v =>
    (v === null || v === undefined || isNaN(v))
      ? '—'
      : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);

  const roundHalf = num => Math.round(num * 2) / 2; // arrotonda a 0.5h

  // ---- DOM refs (tutti gli ID usati ESISTONO in prenota.html)
  const elForm = document.getElementById('form-prenota');
  const elMq = document.getElementById('mq');
  const elStanze = document.getElementById('stanze');  // opzionale
  const elExtras = document.querySelectorAll('input.extra');
  const elDurata = document.getElementById('durata');
  const elCosto = document.getElementById('costo');
  const elExtraRiep = document.getElementById('extra-riepilogo');
  const elProsegui = document.getElementById('btn-prosegui');

  // Se per qualche motivo la pagina non ha il form, termina senza errori
  if (!elForm || !elMq || !elDurata || !elCosto || !elProsegui) {
    console.warn('[B&B Clean] Elementi fondamentali mancanti in /prenota.html');
    return;
  }

  // ---- SETTINGS (fallback se /settings.json non presente)
  let SETTINGS = {
    m2_per_hour: 35,            // metri quadri puliti per ora
    hourly_rate: 22,            // € / ora
    extra_prices_eur: true      // se true somma anche prezzi extra (non solo tempo)
  };

  // Prova a caricare /settings.json
  fetch('/settings.json')
    .then(r => r.ok ? r.json() : {})
    .then(js => {
      if (js && typeof js === 'object') SETTINGS = Object.assign(SETTINGS, js);
    })
    .catch(() => { /* fallback già impostato */ })
    .finally(() => {
      // Avvia binding e calcolo iniziale
      bindEvents();
      recalc();
    });

  // ---- Calcolo stima
  function recalc() {
    const mq = parseFloat(elMq.value);
    const stanze = parseInt(elStanze?.value ?? '', 10);

    if (!mq || mq <= 0) {
      // reset
      elDurata.textContent = '—';
      elCosto.textContent = '—';
      elExtraRiep.textContent = 'Nessuno';
      elProsegui.disabled = true;
      return;
    }

    // Ore base dai mq
    const mph = SETTINGS.m2_per_hour || 35;
    let oreBase = mq / mph;
    oreBase = Math.max(1, roundHalf(oreBase)); // minimo 1h

    // Extra: tempo aggiuntivo e costo extra
    let extraMin = 0;
    let extraCost = 0;
    const selezionati = [];

    document.querySelectorAll('input.extra:checked').forEach(chk => {
      const min = parseInt(chk.getAttribute('data-minutes') || '0', 10);
      const price = parseFloat(chk.getAttribute('data-price') || '0');
      extraMin += isNaN(min) ? 0 : min;
      extraCost += isNaN(price) ? 0 : price;
      const lbl = chk.parentElement?.querySelector('span')?.textContent || chk.value;
      selezionati.push(lbl);
    });

    // Stanza/e (opzionale): micro aggiustamento (5 min per stanza oltre la 1)
    if (!isNaN(stanze) && stanze > 1) {
      extraMin += (stanze - 1) * 5;
    }

    const oreExtra = extraMin / 60;
    let oreTot = roundHalf(oreBase + oreExtra);

    const rate = SETTINGS.hourly_rate || 22;
    let costo = (oreTot * rate) + (SETTINGS.extra_prices_eur ? extraCost : 0);

    // Aggiorna UI
    elDurata.textContent = `${oreTot.toString().replace('.', ',')} h`;
    elCosto.textContent = euro(costo);
    elExtraRiep.textContent = selezionati.length ? selezionati.join(', ') : 'Nessuno';

    elProsegui.disabled = false;
  }

  // ---- Event binding (sicuro)
  function bindEvents() {
    // Input principali
    elMq.addEventListener('input', recalc);
    if (elStanze) elStanze.addEventListener('input', recalc);

    // Extras
    elExtras.forEach(chk => chk.addEventListener('change', recalc));

    // Submit (per ora niente pagamento: preveniamo e mostriamo riepilogo)
    elForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      // Qui potrai inserire: invio a funzione Netlify "notify" oppure redirect a checkout.
      // Per adesso, facciamo semplicemente scroll al box stima:
      document.getElementById('box-stima')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
})();
