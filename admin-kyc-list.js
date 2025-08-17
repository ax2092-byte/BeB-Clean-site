// /admin-kyc-list.js
// Lista KYC + filtri + UI azioni (approva/rifiuta)

(function(){
  const API = '/.netlify/functions/kyc';
  const tbl = document.querySelector('#kycTable tbody');
  const filterSel = document.getElementById('kycFilter');
  const btnReload = document.getElementById('btnReload');
  const hints = document.getElementById('adminHints');

  // token admin in localStorage
  function getToken(){
    let t = localStorage.getItem('ADMIN_TOKEN');
    if (!t) {
      t = prompt('Inserisci ADMIN_TOKEN (Netlify env):') || '';
      if (t) localStorage.setItem('ADMIN_TOKEN', t);
    }
    return t;
  }
  function getAdminName(){
    let n = localStorage.getItem('ADMIN_NAME');
    if (!n) {
      n = prompt('Nome admin da mostrare in audit (es. Alessandro):') || 'Admin';
      localStorage.setItem('ADMIN_NAME', n);
    }
    return n;
  }

  // suggerimenti/token banner
  function showHints(){
    const token = localStorage.getItem('ADMIN_TOKEN') || '(non impostato)';
    const name = localStorage.getItem('ADMIN_NAME') || '(non impostato)';
    hints.innerHTML = `
      <strong>Info amministratore</strong><br>
      Nome: <code>${name}</code> — Token: <code>${token.slice(0,4)}…${token.slice(-4)}</code><br>
      Puoi cambiare nome o token dai bottoni in alto a destra.
    `;
    hints.style.display = 'block';
  }
  showHints();

  document.getElementById('btnSetAdmin')?.addEventListener('click', ()=>{
    localStorage.removeItem('ADMIN_NAME');
    getAdminName(); showHints(); load();
  });
  document.getElementById('btnSetToken')?.addEventListener('click', ()=>{
    localStorage.removeItem('ADMIN_TOKEN');
    getToken(); showHints(); load();
  });

  async function api(body){
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': getToken()
      },
      body: JSON.stringify(body||{})
    });
    const js = await res.json().catch(()=>({}));
    if (!res.ok || js.error) throw new Error(js.error || `HTTP ${res.status}`);
    return js;
  }

  function stateBadge(stato){
    const map = { in_attesa: 'In attesa', approvato: 'Approvato', rifiutato: 'Rifiutato' };
    return `<span class="badge status-${stato||'in_attesa'}">${map[stato]||'In attesa'}</span>`;
  }

  function render(rows){
    if (!rows.length){
      tbl.innerHTML = `<tr><td colspan="5" class="muted">Nessuna richiesta trovata.</td></tr>`;
      return;
    }
    tbl.innerHTML = rows.map(r => {
      const dt = new Date(r.created_at||r.updated_at||Date.now());
      const partner = `${escapeHtml(r.partner?.cognome||'')} ${escapeHtml(r.partner?.nome||'')}`.trim() || '—';
      const doc = `${escapeHtml(r.doc?.tipo||'')}<br><span class="muted small">${escapeHtml(r.doc?.numero||'')} • Scad. ${escapeHtml(r.doc?.scadenza||'')}</span>`;
      const azioni = (r.status === 'in_attesa')
        ? `<div class="right">
            <button class="btn" data-act="ok" data-id="${r.id}">Approva</button>
            <button class="btn ghost" data-act="ko" data-id="${r.id}">Rifiuta</button>
           </div>`
        : `<div class="right"><button class="btn ghost" data-act="undo" data-id="${r.id}">Segna in attesa</button></div>`;
      return `<tr>
        <td>${dt.toLocaleString()}</td>
        <td><strong>${partner}</strong><br><span class="muted small">${escapeHtml(r.email||'')}</span></td>
        <td>${doc}</td>
        <td>${stateBadge(r.status)}</td>
        <td>${azioni}</td>
      </tr>`;
    }).join('');
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  async function load(){
    tbl.innerHTML = `<tr><td colspan="5" class="muted">Caricamento…</td></tr>`;
    try {
      const status = filterSel.value || '';
      const out = await api({ action:'list', status });
      render(out.items || []);
    } catch (e) {
      tbl.innerHTML = `<tr><td colspan="5" class="muted">Errore: ${escapeHtml(e.message||e)}</td></tr>`;
    }
  }

  filterSel.addEventListener('change', load);
  btnReload.addEventListener('click', load);
  tbl.addEventListener('click', async (e)=>{
    const b = e.target.closest('button'); if(!b) return;
    const id = b.getAttribute('data-id');
    if (b.getAttribute('data-act') === 'ok') {
      const ok = confirm('Approvare questa verifica KYC?'); if(!ok) return;
      await window.kycDecide(id, 'approvato', '');
      load();
    } else if (b.getAttribute('data-act') === 'ko') {
      const reason = prompt('Motivo del rifiuto (obbligatorio):'); if(!reason) return;
      await window.kycDecide(id, 'rifiutato', reason);
      load();
    } else if (b.getAttribute('data-act') === 'undo') {
      await window.kycDecide(id, 'in_attesa', 'Revisione');
      load();
    }
  });

  // avvio
  getToken(); getAdminName(); load();
})();
