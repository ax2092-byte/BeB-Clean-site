// /partner.js — Area Partner MVP
// - Login con OTP email (stateless, via Netlify Function notify.js)
// - Tab UI + salvataggio locale profilo/tariffe/disponibilità/notifiche
// - Calcolo Codice Fiscale IT (senza Belfiore manuale: usa /assets/data/comuni.json o /comuni.json)
// - Upload documenti KYC via email (Resend attachments) -> admin
// - Hooks pronti per Stripe Connect + route/geocode functions

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const store = {
    get(key, def = null){ try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch{ return def; } },
    set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
    del(key){ localStorage.removeItem(key); }
  };

  // ---- Sessione (OTP)
  let session = store.get('partnerSession') || null; // { email }
  const otpBackdrop = $('#otpBackdrop');
  const sessionEmailEl = $('#sessionEmail');
  const secEmailEl = $('#secEmail');

  function requireSession(){
    if (!session || !session.email) {
      otpBackdrop.style.display = 'flex';
      $('#otpStep1').style.display = '';
      $('#otpStep2').style.display = 'none';
      return false;
    }
    sessionEmailEl.textContent = session.email;
    secEmailEl.textContent = session.email;
    return true;
  }

  // OTP flow
  let otpToken = null;  // token firmato restituito da backend
  $('#btnSendOtp')?.addEventListener('click', async () => {
    const email = $('#otpEmail').value.trim();
    if (!email) return alert('Inserisci un email valida');
    const res = await fetch('/.netlify/functions/notify', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'request-otp', email })
    });
    const js = await res.json().catch(()=>({}));
    if (!res.ok || !js.ok) return alert('Errore invio OTP: ' + (js.error||res.status));
    otpToken = js.token;
    $('#otpStep1').style.display='none';
    $('#otpStep2').style.display='';
    $('#otpInfo').textContent = `Abbiamo inviato un codice a ${email}. Valido 15 minuti.`;
  });

  $('#btnBackOtp')?.addEventListener('click', () => {
    $('#otpStep1').style.display='';
    $('#otpStep2').style.display='none';
  });

  $('#btnVerifyOtp')?.addEventListener('click', async () => {
    const code = $('#otpCode').value.trim();
    const email = $('#otpEmail').value.trim();
    if (!otpToken || !code || code.length !== 6) return alert('Codice non valido');
    const res = await fetch('/.netlify/functions/notify', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'verify-otp', email, code, token: otpToken })
    });
    const js = await res.json().catch(()=>({}));
    if (!res.ok || !js.ok) return alert('OTP errato o scaduto');
    session = { email };
    store.set('partnerSession', session);
    sessionEmailEl.textContent = email;
    secEmailEl.textContent = email;
    otpBackdrop.style.display='none';
  });

  // Apertura sessione al load
  document.addEventListener('DOMContentLoaded', () => { requireSession(); });

  // ---- Tabs
  const tabs = $('#tabs');
  const tabMap = {
    overview: $('#tab-overview'),
    profilo: $('#tab-profilo'),
    kyc: $('#tab-kyc'),
    tariffe: $('#tab-tariffe'),
    disponibilita: $('#tab-disponibilita'),
    payout: $('#tab-payout'),
    notifiche: $('#tab-notifiche'),
    sicurezza: $('#tab-sicurezza'),
  };
  tabs?.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn'); if (!btn) return;
    $$('.tab-btn', tabs).forEach(b => b.classList.toggle('active', b===btn));
    Object.values(tabMap).forEach(x => x.style.display = 'none');
    const id = btn.dataset.tab;
    tabMap[id]?.style && (tabMap[id].style.display = '');
  });

  // ---- Dati e progress bar
  const profile = store.get('partnerProfile', {
    nome:'', cognome:'', sesso:'', data_nascita:'', comune_nascita:'', provincia_nascita:'',
    cf:'', lingue:'', indirizzo:'', raggio_km:20, animali:'si', mezzo:'', attrezzatura:''
  });
  const tariffe = store.get('partnerTariffe', { tariffa: 12, prodotti:'', extra:'' });
  const disp = store.get('partnerDisp', { lun:'', mar:'', mer:'', gio:'', ven:'', we:'', ferie:'', raggio_km2:20 });
  const notif = store.get('partnerNotif', { alert_richieste:'on', digest:'off' });
  const kycState = store.get('partnerKyc', { stato:'in_attesa', audit:[] });
  const payouts = store.get('partnerPayout', { history:[] }); // solo mock

  function profileCompletion(){
    const keys = ['nome','cognome','sesso','data_nascita','comune_nascita','cf','indirizzo'];
    const done = keys.filter(k => (profile[k]||'').toString().trim().length>0).length;
    return Math.round(100*done/keys.length);
  }
  function refreshOverview(){
    const progress = profileCompletion();
    $('#profileProgress').style.width = progress + '%';
    $('#visibilityStatus').textContent = progress>=80 && kycState.stato==='approvato' ? 'Attivo' : 'Pausa';
    const kycMap = { in_attesa:'In attesa', approvato:'Approvato', rifiutato:'Rifiutato' };
    $('#kycStatus').textContent = kycMap[kycState.stato] || 'In attesa';
  }

  // ---- Carica comuni (per CF & datalist)
  let comuniIndex = null; // { "DORGALI|NU": "D345" }
  async function loadComuni(){
    if (comuniIndex) return comuniIndex;
    const tryPaths = ['/assets/data/comuni.json', '/comuni.json'];
    let data=null;
    for (const p of tryPaths){
      try {
        const r = await fetch(p); if (r.ok) { data = await r.json(); break; }
      } catch {}
    }
    if (!data) return {};
    comuniIndex = {};
    data.forEach(c => {
      const key = (c.nome + '|' + c.provincia).toUpperCase();
      comuniIndex[key] = c.codice; // Belfiore
    });
    // Datalist
    const datalist = $('#comuniList');
    if (datalist) {
      const opts = data.slice(0, 5000).map(c => `<option value="${c.nome}">`);
      datalist.innerHTML = opts.join('');
    }
    return comuniIndex;
  }

  // ---- Codice Fiscale
  const CF = (() => {
    const monthCode = ['A','B','C','D','E','H','L','M','P','R','S','T'];
    const oddMap = {
      '0':1,'1':0,'2':5,'3':7,'4':9,'5':13,'6':15,'7':17,'8':19,'9':21,
      'A':1,'B':0,'C':5,'D':7,'E':9,'F':13,'G':15,'H':17,'I':19,'J':21,
      'K':2,'L':4,'M':18,'N':20,'O':11,'P':3,'Q':6,'R':8,'S':12,'T':14,
      'U':16,'V':10,'W':22,'X':25,'Y':24,'Z':23
    };
    const evenMap = {
      '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
      'A':0,'B':1,'C':2,'D':3,'E':4,'F':5,'G':6,'H':7,'I':8,'J':9,
      'K':10,'L':11,'M':12,'N':13,'O':14,'P':15,'Q':16,'R':17,'S':18,'T':19,
      'U':20,'V':21,'W':22,'X':23,'Y':24,'Z':25
    };
    function onlyLetters(s){ return (s||'').toUpperCase().replace(/[^A-Z]/g,''); }
    function consonants(s){ return onlyLetters(s).replace(/[AEIOU]/g,''); }
    function vowels(s){ return onlyLetters(s).replace(/[^AEIOU]/g,''); }
    function pad3(s){ return (s + 'XXX').slice(0,3); }
    function surnameCode(s){
      const c = consonants(s), v = vowels(s);
      return pad3((c + v).slice(0,3));
    }
    function nameCode(s){
      const c = consonants(s);
      if (c.length >= 4) return (c[0] + c[2] + c[3]).toUpperCase();
      const v = vowels(s);
      return pad3((c + v).slice(0,3));
    }
    function dateCode(dISO, sesso){
      if (!dISO) return '000A00';
      const d = new Date(dISO);
      const yy = String(d.getFullYear()).slice(-2);
      const m = monthCode[d.getMonth()] || 'A';
      let day = d.getDate();
      if (sesso === 'F') day += 40;
      return yy + m + String(day).padStart(2,'0');
    }
    function controlChar(code15){
      const up = code15.toUpperCase();
      let sum = 0;
      for (let i=0; i<up.length; i++){
        const ch = up[i];
        sum += ( (i+1) % 2 === 0 ) ? (evenMap[ch] ?? 0) : (oddMap[ch] ?? 0);
      }
      const rem = sum % 26;
      return String.fromCharCode('A'.charCodeAt(0) + rem);
    }
    function compute({ nome, cognome, sesso, data_nascita, comune_nascita, provincia_nascita, belfiore }){
      const s = surnameCode(cognome||'');
      const n = nameCode(nome||'');
      const d = dateCode(data_nascita, sesso);
      const bf = (belfiore || 'Z000').toUpperCase();
      const base = (s + n + d + bf).toUpperCase();
      return base + controlChar(base);
    }
    return { compute };
  })();

  async function computeCFIfPossible(){
    await loadComuni();
    const f = $('#formProfilo'); if (!f) return;
    const nome = f.nome.value.trim();
    const cognome = f.cognome.value.trim();
    const sesso = f.sesso.value;
    const data_nascita = f.data_nascita.value;
    const comune = (f.comune_nascita.value||'').toUpperCase();
    const prov = (f.provincia_nascita.value||'').toUpperCase();
    let bf = null;
    if (comuniIndex) {
      bf = comuniIndex[`${comune}|${prov}`] || null;
    }
    if (nome && cognome && sesso && data_nascita && bf){
      const code = CF.compute({ nome, cognome, sesso, data_nascita, comune_nascita:comune, provincia_nascita:prov, belfiore: bf });
      $('#cf').value = code;
    }
  }

  // Bind form Profilo
  const fP = $('#formProfilo');
  if (fP){
    // inizializza
    Object.keys(profile).forEach(k => { if (fP[k]) fP[k].value = profile[k]; });
    // ricalcolo CF on change
    ['nome','cognome','sesso','data_nascita','comune_nascita','provincia_nascita'].forEach(nm => {
      fP[nm]?.addEventListener('input', computeCFIfPossible);
    });
    fP.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!requireSession()) return;
      Object.keys(profile).forEach(k => { if (fP[k]) profile[k] = fP[k].value; });
      store.set('partnerProfile', profile);
      refreshOverview();
      alert('Profilo salvato.');
    });
  }

  // Tariffe
  const fT = $('#formTariffe');
  const economyRulesEl = $('#economyRules');
  let settingsCache = null;
  async function loadSettings(){
    if (settingsCache) return settingsCache;
    try {
      const r = await fetch('/settings.json'); if (r.ok) settingsCache = await r.json();
    } catch {}
    return settingsCache || {};
  }
  function printEconomyRules(s){
    const fee = Math.round((s.fee_client_percent ?? 0.05)*100);
    const comm = Math.round((s.commission_partner_percent ?? 0.12)*100);
    const rim = s.distance_refund_per_10km ?? 2.5;
    economyRulesEl.textContent =
      `Commissione B&B Clean: ${comm}% sul prezzo partner. `+
      `Costi del servizio al cliente: ${fee}% (solo sul lavoro). `+
      `Rimborso distanza: € ${rim} ogni 10 km (arrotondato per eccesso).`;
  }
  (async () => { const s = await loadSettings(); printEconomyRules(s); })();

  if (fT){
    Object.keys(tariffe).forEach(k => { if (fT[k]) fT[k].value = tariffe[k]; });
    fT.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!requireSession()) return;
      Object.keys(tariffe).forEach(k => { if (fT[k]) tariffe[k] = fT[k].value; });
      store.set('partnerTariffe', tariffe);
      alert('Tariffe salvate.');
    });
  }

  // Disponibilità
  const fD = $('#formDisp');
  if (fD){
    Object.keys(disp).forEach(k => { if (fD[k]) fD[k].value = disp[k]; });
    fD.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!requireSession()) return;
      Object.keys(disp).forEach(k => { if (fD[k]) disp[k] = fD[k].value; });
      // se raggio è stato indicato qui, aggiorno profilo
      if (fD.raggio_km2?.value){ profile.raggio_km = Number(fD.raggio_km2.value||20); store.set('partnerProfile', profile); }
      store.set('partnerDisp', disp);
      alert('Disponibilità salvate.');
    });
  }

  // Notifiche
  const fN = $('#formNotif');
  if (fN){
    Object.keys(notif).forEach(k => { if (fN[k]) fN[k].value = notif[k]; });
    fN.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!requireSession()) return;
      Object.keys(notif).forEach(k => { if (fN[k]) notif[k] = fN[k].value; });
      store.set('partnerNotif', notif);
      alert('Preferenze salvate.');
    });
  }

  // KYC upload (via email attachments)
  const fK = $('#formKyc');
  if (fK){
    fK.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!requireSession()) return;

      const fd = new FormData(fK);
      const fields = Object.fromEntries(fd.entries());
      async function fileToAttachment(file){
        const buf = await file.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const mime = file.type || 'application/octet-stream';
        return { filename: file.name, content: b64, mime_type: mime };
      }
      const doc_fronte = fd.get('doc_fronte'); const doc_retro = fd.get('doc_retro'); const selfie = fd.get('selfie');
      if (!(doc_fronte && doc_retro && selfie)) return alert('Carica tutti i file richiesti.');

      const attachments = [];
      attachments.push(await fileToAttachment(doc_fronte));
      attachments.push(await fileToAttachment(doc_retro));
      attachments.push(await fileToAttachment(selfie));

      const payload = {
        action: 'upload-docs',
        email: session.email,
        meta: {
          tipo: fields.doc_tipo,
          numero: fields.doc_numero,
          scadenza: fields.doc_scadenza,
          partner: { nome: profile.nome, cognome: profile.cognome, cf: $('#cf').value }
        },
        attachments
      };

      const res = await fetch('/.netlify/functions/notify', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      const js = await res.json().catch(()=>({}));
      if (!res.ok || !js.ok) return alert('Invio fallito: '+(js.error||res.status));

      // aggiorna stato/audit locale
      kycState.stato = 'in_attesa';
      kycState.audit = kycState.audit || [];
      kycState.audit.unshift({ ts: new Date().toISOString(), azione:'Inviato documenti', by: session.email });
      store.set('partnerKyc', kycState);
      renderKycAudit();
      alert('Documenti inviati. Ti avviseremo via email dopo la verifica.');
    });
  }

  function renderKycAudit(){
    const ul = $('#kycAudit'); if (!ul) return;
    if (!kycState.audit?.length) { ul.innerHTML = '<li>Nessuna decisione ancora.</li>'; return; }
    ul.innerHTML = kycState.audit.map(a => `<li>[${new Date(a.ts).toLocaleString()}] ${a.azione} — ${a.by||'sistema'}</li>`).join('');
  }
  renderKycAudit();

  // Payout mock
  $('#btnStripe')?.addEventListener('click', () => {
    alert('Collegamento Stripe Connect sarà attivato lato server (prossimo step).');
  });

  // Sicurezza
  $('#btnChangeEmail')?.addEventListener('click', () => {
    store.del('partnerSession');
    session = null;
    requireSession(); // riapre modal
  });
  $('#btnLogout')?.addEventListener('click', () => {
    store.del('partnerSession');
    session = null;
    location.reload();
  });

  // Avvio
  refreshOverview();
  computeCFIfPossible();
})();
