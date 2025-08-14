// assets/js/dashboard.js — carica prenotazioni, offerte e consente l'assegnazione
async function fetchAdmin(path, payload){
  const r = await fetch(path, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload || {})
  });
  const js = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(js.error || 'Errore richiesta');
  return js;
}
const euro = v => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v);

async function load(){
  const key = document.getElementById('adm').value.trim();
  const days = parseInt(document.getElementById('days').value||'30',10);
  const stat = document.getElementById('stat');
  const cards = document.getElementById('cards');
  if (!key){ alert('Inserisci la Admin key'); return; }
  stat.textContent = 'Carico…'; cards.innerHTML = '';
  try{
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
              load();
            }catch(e){
              alert(e.message);
              btn.disabled = false; btn.textContent = 'Assegna';
            }
          });
        }
      });
    });
  }catch(e){
    stat.textContent = e.message;
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('load').addEventListener('click', load);
});
