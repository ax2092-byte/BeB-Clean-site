// assets/js/partner.js — CF auto, dataset comuni "leggero" auto-costruito, upload file, notifica email
document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.querySelector('form[name="partner"]');
  if (!form) return;

  // ---------------- Hints numero documento ----------------
  const tipo = document.getElementById('doc_tipo');
  const num  = document.getElementById('doc_numero');
  if (tipo && num){
    const hints = {
      CARTA_IDENTITA: "Es. CA1234567",
      PASSAPORTO: "Es. YA1234567",
      PATENTE: "Es. B12345678"
    };
    const upd = ()=>{ num.placeholder = hints[tipo.value] || "Es. AA12345"; };
    tipo.addEventListener('change', upd); upd();
  }

  // ---------------- Dataset Comuni (leggero) ----------------
  // Struttura voluta: [{ nome:"DORGALI", provincia:"NU", codice:"D345" }, ...]
  let COMUNI = [];

  async function loadComuni(){
    // 1) cache locale (se recente)
    try{
      const cache = JSON.parse(localStorage.getItem('COMUNI_MIN') || '{}');
      if (cache && Array.isArray(cache.items) && cache.items.length > 0) {
        COMUNI = cache.items;
        return;
      }
    }catch(_){}

    // 2) prova file locale del sito (se un giorno carichi assets/data/comuni.json)
    try{
      const r = await fetch('/assets/data/comuni.json', { cache:'no-store' });
      if (r.ok){
        COMUNI = await r.json();
        // normalizza maiuscolo
        COMUNI = (COMUNI||[]).map(c=>({
          nome: String(c.nome||'').toUpperCase(),
          provincia: String(c.provincia||'').toUpperCase(),
          codice: String(c.codice||'').toUpperCase()
        })).filter(c=>c.nome && c.provincia && c.codice);
        localStorage.setItem('COMUNI_MIN', JSON.stringify({ ts: Date.now(), items: COMUNI }));
        return;
      }
    }catch(_){}

    // 3) fallback: scarica dataset pubblico (comuni-json, 2020) e riduci ai campi minimi
    try{
      const r = await fetch('https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json', { cache:'no-store' });
      const big = await r.json(); // contiene: nome, sigla (prov), codiceCatastale, ecc.
      const map = Object.create(null);
      (big||[]).forEach(x=>{
        const nome = String(x.nome||'').toUpperCase();
        const provincia = String(x.sigla||'').toUpperCase();
        const codice = String(x.codiceCatastale||'').toUpperCase();
        if (nome && provincia && codice) map[codice] = { nome, provincia, codice }; // de-duplica per codice
      });
      COMUNI = Object.values(map);
      localStorage.setItem('COMUNI_MIN', JSON.stringify({ ts: Date.now(), items: COMUNI }));
    }catch(_){
      COMUNI = [];
    }
  }

  // datalist per l’autocomplete del comune di nascita
  const dl = document.getElementById('comuni-list');
  const comN = document.getElementById('comune_nascita');
  const provN = document.getElementById('prov_nascita');
  const codCat = document.getElementById('cod_catastale_nascita');

  function populateDatalist(query){
    if (!dl) return;
    dl.innerHTML = '';
    if (!query || query.length < 2) return;
    const q = query.toUpperCase().trim();
    const found = COMUNI.filter(c => c.nome.includes(q)).slice(0, 30);
    found.forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.nome;
      opt.label = `${c.nome} (${c.provincia})`;
      dl.appendChild(opt);
    });
  }

  if (comN){
    comN.addEventListener('input', ()=>{
      populateDatalist(comN.value);
      const q = (comN.value||'').toUpperCase().trim();
      const hit = COMUNI.find(c => c.nome === q);
      if (hit){
        provN.value = hit.provincia;
        codCat.value = hit.codice;
      }
      computeCF();
    });
  }

  // ---------------- Calcolo Codice Fiscale ----------------
  const nome = document.getElementById('nome');
  const cognome = document.getElementById('cognome');
  const sesso = document.getElementById('sesso');
  const dataN = document.getElementById('data_nascita');
  const cf = document.getElementById('codice_fiscale');
  const cfStatus = document.getElementById('cf_status');

  [nome, cognome, sesso, dataN, provN, codCat].forEach(el=>{
    if (el) el.addEventListener('input', computeCF);
  });

  function onlyLetters(s){ return (s||'').toUpperCase().replace(/[^A-Z]/g,''); }
  function consonants(s){ return onlyLetters(s).replace(/[AEIOU]/g,''); }
  function vowels(s){ return onlyLetters(s).replace(/[^AEIOU]/g,''); }

  function codeSurname(s){
    let c = consonants(s) + vowels(s) + 'XXX';
    return c.slice(0,3);
  }
  function codeName(s){
    const cons = consonants(s);
    if (cons.length >= 4) return cons[0] + cons[2] + cons[3];
    let c = cons + vowels(s) + 'XXX';
    return c.slice(0,3);
  }
  const MONTH = {1:'A',2:'B',3:'C',4:'D',5:'E',6:'H',7:'L',8:'M',9:'P',10:'R',11:'S',12:'T'};
  function codeDate(dISO, sex){
    if (!dISO) return null;
    const dt = new Date(dISO);
    if (isNaN(dt)) return null;
    const yy = String(dt.getFullYear()).slice(-2);
    const mm = dt.getMonth()+1;
    const mcode = MONTH[mm];
    let dd = dt.getDate();
    if (sex === 'F') dd += 40;
    const dcode = String(dd).padStart(2,'0');
    return yy + mcode + dcode;
  }
  function cfControl(s15){
    const ODD = {
      '0':1,'1':0,'2':5,'3':7,'4':9,'5':13,'6':15,'7':17,'8':19,'9':21,
      'A':1,'B':0,'C':5,'D':7,'E':9,'F':13,'G':15,'H':17,'I':19,'J':21,
      'K':2,'L':4,'M':18,'N':20,'O':11,'P':3,'Q':6,'R':8,'S':12,'T':14,
      'U':16,'V':10,'W':22,'X':25,'Y':24,'Z':23
    };
    const EVEN = {
      '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
      'A':0,'B':1,'C':2,'D':3,'E':4,'F':5,'G':6,'H':7,'I':8,'J':9,
      'K':10,'L':11,'M':12,'N':13,'O':14,'P':15,'Q':16,'R':17,'S':18,'T':19,
      'U':20,'V':21,'W':22,'X':23,'Y':24,'Z':25
    };
    let sum = 0;
    for (let i=0;i<15;i++){
      const ch = s15[i]; const pos = i+1;
      sum += (pos % 2 === 1) ? (ODD[ch] ?? 0) : (EVEN[ch] ?? 0);
    }
    const rem = sum % 26;
    return String.fromCharCode('A'.charCodeAt(0) + rem);
  }

  function computeCF(){
    cfStatus.textContent = '';
    const N = (nome.value||'').trim();
    const C = (cognome.value||'').trim();
    const S = (sesso.value||'').trim();
    const D = (dataN.value||'').trim();
    let CAT = (codCat.value||'').toUpperCase().trim();

    if (!N || !C || !S || !D || (!CAT && !(comN.value && provN.value))) {
      cf.value = '';
      return;
    }

    // se non c'è catastale ma c'è Comune+Provincia, ricava dal dataset
    if (!CAT && COMUNI.length){
      const q = (comN.value||'').toUpperCase().trim();
      const hit = COMUNI.find(c => c.nome === q && c.provincia === (provN.value||'').toUpperCase().trim());
      if (hit) CAT = hit.codice;
    }
    if (!CAT || CAT.length !== 4){
      cf.value = '';
      cfStatus.innerHTML = '<span class="status-err">Inserisci il codice catastale (4 caratteri) o scegli il comune dalla lista.</span>';
      return;
    }

    const c15 = (codeSurname(C) + codeName(N) + codeDate(D,S) + CAT).toUpperCase();
    const ctrl = cfControl(c15);
    if (!ctrl){
      cf.value = '';
      cfStatus.innerHTML = '<span class="status-err">Dati insufficienti o non validi.</span>';
      return;
    }
    cf.value = c15 + ctrl;
    cfStatus.innerHTML = '<span class="status-ok">Codice Fiscale generato.</span>';
  }

  // ---------------- INVIO FORM (multipart a Netlify + notifica) ----------------
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn){ btn.disabled = true; btn.textContent = 'Invio…'; }

    computeCF();
    if (!cf.value || cf.value.length !== 16){
      alert('Completa i dati di nascita e seleziona il comune (o inserisci il codice catastale) per generare il Codice Fiscale.');
      if (btn){ btn.disabled = false; btn.textContent = 'Invia candidatura'; }
      return;
    }

    try{
      // 1) invio a Netlify Forms (con file)
      const fd = new FormData(form);
      if (!fd.get('form-name')) fd.set('form-name','partner');
      await fetch('/', { method:'POST', body: fd });

      // 2) notifica email (senza allegati)
      try{
        const preview = {
          nome: fd.get('nome'),
          cognome: fd.get('cognome'),
          email: fd.get('email'),
          telefono: fd.get('telefono'),
          codice_fiscale: fd.get('codice_fiscale'),
          sesso: fd.get('sesso'),
          data_nascita: fd.get('data_nascita'),
          comune_nascita: fd.get('comune_nascita'),
          prov_nascita: fd.get('prov_nascita'),
          doc_tipo: fd.get('doc_tipo'),
          doc_numero: fd.get('doc_numero'),
          doc_scadenza: fd.get('doc_scadenza'),
          via: fd.get('via'),
          civico: fd.get('civico'),
          cap: fd.get('cap'),
          citta: fd.get('citta'),
          provincia: fd.get('provincia'),
          regione: fd.get('regione'),
          raggio_km: fd.get('raggio'),
          tariffa_eur_h: fd.get('tariffa')
        };
        await fetch('/.netlify/functions/notify', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ type:'partner', data: preview })
        });
      }catch(_){}

      window.location.href = '/success.html';
    }catch(err){
      alert('Invio non riuscito. Riprova.');
      if (btn){ btn.disabled = false; btn.textContent = 'Invia candidatura'; }
    }
  });

  // kick-off: carica dataset e poi attiva autocomplete/CF
  loadComuni().then(()=>{ /* pronto */ });
});
