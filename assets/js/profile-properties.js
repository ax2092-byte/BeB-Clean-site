// FILE: /assets/js/profile-properties.js
// Gestione immobili (multi). Usa comuni.json + geocode function.

(async function(){
  const $ = (q)=>document.querySelector(q);
  const listEl = ()=> $('#props_list');

  async function saveAll(properties){
    const r = await fetch('/.netlify/functions/client-properties-update', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ properties })
    });
    return r.ok;
  }

  function renderList(props){
    const host = listEl(); if (!host) return;
    host.innerHTML = '';
    props.forEach((p,idx)=>{
      const li = document.createElement('div');
      li.className = 'card'; li.style.marginBottom='10px';
      li.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
          <div>
            <strong>${p.label || 'Immobile'}</strong><br>
            <span class="muted">${p.address || ''}</span><br>
            <span class="muted">Mq: ${p.mq || '—'}</span>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn ghost" data-act="default" data-i="${idx}">${p.default ? 'Predefinito ✓' : 'Imposta predefinito'}</button>
            <button class="btn" data-act="remove" data-i="${idx}">Elimina</button>
          </div>
        </div>`;
      host.appendChild(li);
    });
  }

  function loadDraft(){
    try{ return JSON.parse(localStorage.getItem('bb_props_draft')||'[]'); }catch(_){ return []; }
  }
  function storeDraft(arr){ localStorage.setItem('bb_props_draft', JSON.stringify(arr)); }

  document.addEventListener('DOMContentLoaded', async ()=>{
    if (document.body.dataset.profile !== 'client') return;

    await fillComuniDatalist('prop_city_list');

    // inizializza da backend (se disponibile) altrimenti da draft
    let props = loadDraft();
    try{
      const r = await fetch('/.netlify/functions/client-properties-get', { cache:'no-store' });
      if (r.ok) props = await r.json();
    }catch(_){}

    renderList(props);

    // Aggiungi immobile
    $('#btn-add-prop')?.addEventListener('click', async ()=>{
      const region = $('#prop_region').value.trim();
      const city   = $('#prop_city').value.trim();
      const addr   = $('#prop_address').value.trim();
      const nr     = $('#prop_nr').value.trim();
      const mq     = parseInt($('#prop_mq').value, 10) || null;
      const label  = $('#prop_label').value.trim();
      const floors = $('#prop_floors').value.trim();
      const rooms  = $('#prop_rooms').value.trim();
      const baths  = $('#prop_baths').value.trim();

      if (!region || !city || !addr || !nr){ alert('Compila Regione, Città, Indirizzo e Civico'); return; }
      const geo = await geocodeViaNominatim(`${addr} ${nr}`, city, region);
      if (!geo){ alert('Indirizzo non trovato'); return; }

      props.push({
        id: 'prop_' + Date.now(),
        label, address: `${addr} ${nr}, ${city} (${region})`,
        lat: geo.lat, lon: geo.lon, mq, floors, rooms, baths, default: !props.some(p=>p.default)
      });
      storeDraft(props);
      renderList(props);
    });

    // Azioni lista
    $('#props_list')?.addEventListener('click', async (e)=>{
      const b = e.target.closest('button'); if(!b) return;
      const i = parseInt(b.dataset.i,10); if (isNaN(i)) return;
      const act = b.dataset.act;
      if (act==='remove'){ props.splice(i,1); }
      if (act==='default'){ props = props.map((p,idx)=>({ ...p, default: idx===i })); }
      storeDraft(props);
      renderList(props);
    });

    // Salva su backend
    $('#btn-save-props')?.addEventListener('click', async ()=>{
      const ok = await saveAll(props);
      alert(ok ? 'Immobili salvati ✅' : 'Errore salvataggio');
    });
  });
})();
