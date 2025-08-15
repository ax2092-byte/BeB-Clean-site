// Carica annunci per un partner (per email) e invia offerte
const euro = v => new Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR'}).format(v);

async function loadAnnunci(email){
  const info = document.getElementById('info');
  const lista = document.getElementById('lista');
  lista.innerHTML = ''; info.textContent = 'Carico...';
  try{
    const r = await fetch('/.netlify/functions/announce-list', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ partner_email: email })
    });
    const js = await r.json();
    if(!r.ok) throw new Error(js.error || 'Errore caricamento annunci');
    info.textContent = `Trovati ${js.items.length} annunci nel tuo raggio.`;
    if (js.items.length === 0) {
      lista.innerHTML = '<div class="muted">Nessun annuncio nel tuo raggio al momento.</div>';
      return;
    }
    js.items.forEach(a=>{
      const div = document.createElement('div');
      div.className = 'ann';
      div.innerHTML = `
        <div class="row">
          <div><b>${a.citta} (${a.regione})</b> — ${a.address}<br>
          <span class="muted">m²: ${a.mq} · ore: ${a.durata} · distanza ~ ${Math.round(a.distance_km)} km · data ${a.data || ''} ${a.ora || ''}</span></div>
          <div><span class="muted">#${a.id_short}</span></div>
        </div>
        <div class="bid">
          <label>La tua tariffa (€/h, ≥8):
            <input type="number" min="8" step="0.5" value="${a.suggerita || 12}" id="rate_${a.id}">
          </label>
          <label>Note:
            <input type="text" placeholder="Breve nota (facoltativa)" id="note_${a.id}" style="min-width:200px">
          </label>
          <button class="btn primary" id="offer_${a.id}">Invia offerta</button>
          <span class="muted" id="esito_${a.id}"></span>
        </div>
      `;
      lista.appendChild(div);
      document.getElementById(`offer_${a.id}`).addEventListener('click', ()=>submitBid(a.id, email));
    });
  }catch(e){
    info.textContent = e.message;
  }
}

async function submitBid(prenota_id, partner_email){
  const rate = parseFloat(document.getElementById(`rate_${prenota_id}`).value || '0');
  const note = document.getElementById(`note_${prenota_id}`).value || '';
  const esito = document.getElementById(`esito_${prenota_id}`);
  if (!rate || rate < 8){ esito.textContent = 'Tariffa non valida (min 8 €/h).'; return; }
  esito.textContent = 'Invio...';
  try{
    const r = await fetch('/.netlify/functions/bid-submit', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prenota_id, partner_email, rate_eur_h: rate, note })
    });
    const js = await r.json();
    if(!r.ok) throw new Error(js.error || 'Errore invio offerta');
    esito.textContent = 'Offerta inviata! (email inviata a B&B Clean)';
  }catch(e){
    esito.textContent = e.message;
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('carica').addEventListener('click', ()=>{
    const email = (document.getElementById('email').value || '').trim();
    if (!email){ alert('Inserisci la tua email.'); return; }
    loadAnnunci(email);
  });
});
