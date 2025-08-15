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

// ---- prenotazioni + offerte (già visto prima) ----
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

// ---- elenco candidature partner (KYC) + APPROVA/RIFIUTA ----
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

      const status = p.decision ? (p.decision.decision==='approved' ? `<span class="pill">APPROVATO</span>` : `<span class="pill warn">RIFIUTATO</span>`) : `<span class="pill warn">IN ATTESA</span>`;

      card.innerHTML = `
        <div class="row">
          <div><b>${p.nome || '(nome mancante)'}</b> — ${p.email || ''}<br>
              <span class="muted">${p.address || ''}</span></div>
          <div>${status}</div>
        </div>
        <div class="row" style="margin-top:6px">
          <div class="pill">CF: ${p.codice_fiscale || '—'}</div>
          <div class="pill">Sesso: ${p.sesso || '—'}</div>
          <div class="pill">Nascita: ${p.comune_nascita || '—'} (${p.prov_nascita||'–'})</div>
        </div>
        <div class="row" style="margin-top:6px">
          <div class="pill">Doc: ${humanTipo || '—'}</div>
          <div class="pill">N°: ${p.doc_numero || '—'}</div>
          <div class="pill">Scadenza: ${p.doc_scadenza || '—'}</div>
        </div>
        <div class="row files" style="margin-top:6px">${files || '<span class="muted">Nessun file allegato.</span>'}</div>
        ${p.decision && p.decision.decision==='rejected' ? `<div class="muted" style="margin-top:6px">Motivi rifiuto: ${p.decision.reasons || '-'}</div>` : ''}
        <div class="muted" style="margin-top:6px">Ricevuta il ${new Date(p.created_at).toLocaleString('it-IT')}</div>
        <div class="muted" style="margin-top:6px">Dopo approvazione, attiva il partner in <b>/admin → Partner</b> (campo <i>Attivo</i>).</div>
        <div class="row" style="margin-top:10px">
          ${!p.decision ? `
            <button class="btn primary" data-approve="${p.email}" data-name="${p.nome}">Approva</button>
            <button class="btn" data-reject="${p.email}" data-name="${p.nome}">Rifiuta</button>
          ` : ''}
        </div>
        <div class="reject-ui" id="rej_${(p.email||'').replace(/[^a-z0-9]/gi,'_')}"></div>
      `;
      box.appendChild(card);

      // bind Approva
      const ab = card.querySelector(`[data-approve]`);
      if (ab){
        ab.addEventListener('click', async ()=>{
          ab.disabled = true; ab.textContent = 'Invio…';
          try{
            await fetchAdmin('/.netlify/functions/admin-kyc-decision', {
              admin_key: document.getElementById('adm').value.trim(),
              email: ab.getAttribute('data-approve'),
              name: ab.getAttribute('data-name') || '',
              decision: 'approved'
            });
            alert('Partner APPROVATO. Email inviata.');
            loadAll();
          }catch(e){ alert(e.message); ab.disabled = false; ab.textContent = 'Approva'; }
        });
      }
      // bind Rifiuta
      const rb = card.querySelector(`[data-reject]`);
      const rejBox = card.querySelector('.reject-ui');
      if (rb && rejBox){
        rb.addEventListener('click', ()=>{
          const id = (rb.getAttribute('data-reject')||'').replace(/[^a-z0-9]/gi,'_');
          rejBox.innerHTML = `
            <div class="cardx" style="margin-top:10px">
              <div class="muted" style="margin-bottom:6px">Seleziona i motivi del rifiuto:</div>
              <label class="chk"><input type="checkbox" name="r" value="Foto documento sfuocata"> Foto documento sfuocata</label>
              <label class="chk"><input type="checkbox" name="r" value="Documento scaduto o in scadenza"> Documento scaduto o in scadenza</label>
              <label class="chk"><input type="checkbox" name="r" value="Selfie non chiaro"> Selfie non chiaro</label>
              <label class="chk"><input type="checkbox" name="r" value="Dati non coerenti (CF/nominativi)"> Dati non coerenti (CF/nominativi)</label>
              <label>Note (facoltative)
                <input type="text" id="note_${id}" placeholder="Aggiungi dettagli (facoltativo)">
              </label>
              <div class="row" style="margin-top:8px">
                <button class="btn primary" id="conf_${id}">Conferma rifiuto</button>
              </div>
            </div>
          `;
          const conf = rejBox.querySelector(`#conf_${id}`);
          conf.addEventListener('click', async ()=>{
            const checks = Array.from(rejBox.querySelectorAll('input[name="r"]:checked')).map(x=>x.value);
            const note = rejBox.querySelector(`#note_${id}`).value || '';
            conf.disabled = true; conf.textContent = 'Invio…';
            try{
              await fetchAdmin('/.netlify/functions/admin-kyc-decision', {
                admin_key: document.getElementById('adm').value.trim(),
                email: rb.getAttribute('data-reject'),
                name: rb.getAttribute('data-name') || '',
                decision: 'rejected',
                reasons: checks,
                note
              });
              alert('Partner RIFIUTATO. Email inviata.');
              loadAll();
            }catch(e){ alert(e.message); conf.disabled = false; conf.textContent = 'Conferma rifiuto'; }
          });
        });
      }
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
