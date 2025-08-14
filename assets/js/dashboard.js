// ---- helper comuni ----
async function fetchAdmin(path, payload){
  const r = await fetch(path, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload || {})
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text}`);
  try { return JSON.parse(text); } catch { return {}; }
}
const euro = v => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v);

// ---- prenotazioni + offerte ----
async function loadBookings(key, days){
  const stat = document.getElementById('stat');
  const cards = document.getElementById('cards');
  stat.textContent = 'Carico prenotazioni…'; cards.innerHTML = '';
  const data = await fetchAdmin('/.netlify/functions/admin-list', { admin_key:key, days });
  stat.textContent = `Prenotazioni: ${data.items.length}`;
  if (data.items.length === 0){
    cards.innerHTML = '<div class="muted">Nessuna prenotazione nel periodo.</div>';
    return;
  }
  data.items.forEach(it=>{
    const c = document.createElement('div');
    c.className = 'cardx';
    const assigned = it.assignment ? `<span class="pill">Assegnato: ${it.assignment.partner_name || it.assignment.partner_email}</span>` : `<span class="pill warn">Non assegnato</span>`;
    const offCount = it.offers.length;
    c.innerHTML = `
      <div class="row">
        <div><b>${it.nome || ''}</b> — ${it.email || ''}<br>
            <span class="muted">${it.address}</span></div>
        <div>${assigned}</div>
      </div>
      <div class="row" style="margin-top:6px">
        <div class="pill">m² ${it.mq}</div>
        <div class="pill">ore ${it.durata}</div>
        <div class="pill">data ${it.data || ''} ${it.ora || ''}</div>
        <div class="pill">${it.citta} (${it.regione})</div>
        <div class="pill">#${it.id_short}</div>
      </div>
      <div class="offers">
        <div class="muted">Offerte (${offCount}):</div>
        <div id="off_${it.id}">
          ${offCount===0 ? '<div class="muted">Nessuna offerta.</div>' : ''}
        </div>
      </div>
    `;
    cards.appendChild(c);

    const cont = c.querySelector(`#off_${it.id}`);
    it.offers.forEach(of=>{
      const o = document.createElement('div');
      o.className = 'offer';
      const who = of.partner_name ? `${of.partner_name} — ${of.partner_email}` : of.partner_email;
      o.innerHTML = `
        <div>${who}</div>
        <div class="pill">€ ${Number(of.rate_eur_h).toFixed(2)}/h</div>
        <div class="muted">${of.note || ''}</div>
        ${it.assignment ? '' : `<button data-bid="${of._raw_id}" data-p="${of.partner_email}" data-n="${of.partner_name||''}" class="btn primary">Assegna</button>`}
      `;
      cont.appendChild(o);
      const btn = o.querySelector('button');
      if (btn){
        btn.addEventListener('click', async ()=>{
          btn.disabled = true; btn.textContent = 'Assegno…';
          try{
            await fetchAdmin('/.netlify/functions/admin-assign', {
              admin_key: document.getElementById('adm').value.trim(),
              prenota_id: it.id,
              partner_email: of.partner_email,
              partner_name: of.partner_name || ''
            });
            alert('Assegnazione registrata e email inviate.');
            loadAll();
          }catch(e){
            alert(e.message);
            btn.disabled = false; btn.textContent = 'Assegna';
          }
        });
      }
    });
  });
}

// ---- elenco candidature partner (KYC) ----
async function loadKyc(key, days){
  const box = document.getElementById('kyc');
  box.innerHTML = '<div class="muted">Carico candidature…</div>';
  try{
    const data = await fetchAdmin('/.netlify/functions/admin-kyc-list', { admin_key:key, days });
    box.innerHTML = '';
    if (!data.items || data.items.length === 0){
      box.innerHTML = '<div class="muted">Nessuna candidatura nel periodo.</div>';
      return;
    }
    data.items.forEach(p=>{
      const card = document.createElement('div');
      card.className = 'cardx';
      const files = (p.files||[]).map(f=> `<a href="${f.url}" target="_blank" rel="noopener">${f.name||'file'}</a>`).join(' ');
      let humanTipo = p.doc_tipo || '';
      if (humanTipo === 'CARTA_IDENTITA') humanTipo = "Carta d'identità";
      if (humanTipo === 'PASSAPORTO') humanTipo = "Passaporto";
      if (humanTipo === 'PATENTE') humanTipo = "Patente";
      card.innerHTML = `
        <div class="row">
          <div><b>${p.nome || '(nome mancante)'}</b> — ${p.email || ''}<br>
              <span class="muted">${p.address || ''}</span></div>
          <div><span class="pill">Raggio: ${p.raggio_km||'?'} km</span> <span class="pill">Tariffa: € ${Number(p.tariffa||0).toFixed(2)}/h</span></div>
        </div>
        <div class="row" style="margin-top:6px">
          <div class="pill">Doc: ${humanTipo || '—'}</div>
          <div class="pill">N°: ${p.doc_numero || '—'}</div>
          <div class="pill">Scadenza: ${p.doc_scadenza || '—'}</div>
          <div class="pill">CF: ${p.codice_fiscale || '—'}</div>
        </div>
        <div class="row files" style="margin-top:6px">${files || '<span class="muted">Nessun file allegato.</span>'}</div>
        <div class="muted" style="margin-top:6px">Ricevuta il ${new Date(p.created_at).toLocaleString('it-IT')}</div>
        <div class="muted" style="margin-top:6px">Dopo verifica, attiva il partner in <b>/admin → Partner</b> (campo <i>Attivo</i>).</div>
      `;
      box.appendChild(card);
    });
  }catch(e){
    box.innerHTML = `<div class="muted">Errore: ${e.message}</div>`;
  }
}

async function loadAll(){
  const key = document.getElementById('adm').value.trim();
  const days = parseInt(document.getElementById('days').value||'30',10);
  if (!key){ alert('Inserisci la Admin key'); return; }
  await loadBookings(key, days);
  await loadKyc(key, days);
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('load').addEventListener('click', loadAll);
});
