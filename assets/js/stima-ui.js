// FILE: /assets/js/stima-ui.js
// B&B Clean — UI Stima (solo presentazione, nessuna logica di calcolo)

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'stima') return;

    // 1) Layout a 2 colonne sul container principale
    const mainContainer =
      document.querySelector('main.container') ||
      document.querySelector('main .container') ||
      document.querySelector('main') ||
      document.body;

    if (mainContainer) mainContainer.classList.add('stima-grid-host');

    // 2) Identifica il form principale e il riepilogo esistente (non rinominiamo nulla)
    const formEl = document.querySelector('main form') || document.querySelector('form');
    if (formEl) formEl.classList.add('card', 'form-card');

    const summaryEl =
      document.querySelector('[data-summary]') ||
      document.querySelector('[id*="summary"]') ||
      document.querySelector('[id*="riepilogo"]') ||
      document.querySelector('.summary');

    if (summaryEl) summaryEl.classList.add('card', 'summary-card', 'sticky');

    // 3) Extra come "chip" (senza toccare i checkbox)
    const extrasRoot =
      document.querySelector('[data-extras]') ||
      document.querySelector('.extras') ||
      document.querySelector('[id*="extra"]') ||
      document.querySelector('fieldset');

    if (extrasRoot) {
      extrasRoot.classList.add('extras-grid');
      // associazione label <-> checkbox: o label[for] o label che contiene l'input
      const applyChip = (chk, label) => {
        if (!label) return;
        label.classList.add('chip');
        label.classList.toggle('is-checked', chk.checked);
        chk.addEventListener('change', () => {
          label.classList.toggle('is-checked', chk.checked);
        });
      };

      extrasRoot.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        let label =
          (chk.id && document.querySelector(`label[for="${chk.id}"]`)) ||
          chk.closest('label');
        applyChip(chk, label);
      });
    }

    // 4) Stato geocode (facoltativo): colora in base al testo esistente
    const statusEl = document.getElementById('geocode-status');
    if (statusEl) {
      const apply = () => {
        const t = (statusEl.textContent || '').toLowerCase();
        statusEl.classList.remove('is-pending', 'is-ok', 'is-warn');
        if (t.includes('cercando') || t.includes('attendere') || t.includes('verifica')) {
          statusEl.classList.add('is-pending');
        } else if (t.includes('trovato') || t.includes('ok')) {
          statusEl.classList.add('is-ok');
        } else if (t.includes('non trovato') || t.includes('errore') || t.includes('invalido')) {
          statusEl.classList.add('is-warn');
        }
      };
      apply();
      const mo = new MutationObserver(apply);
      mo.observe(statusEl, { childList: true, characterData: true, subtree: true });
    }
  });
})();
