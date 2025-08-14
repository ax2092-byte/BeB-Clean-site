// assets/js/partner.js — invia candidatura partner con upload file + notifica email
document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.querySelector('form[name="partner"]');
  if (!form) return;

  // placeholder dinamico per il numero documento
  const tipo = document.getElementById('doc_tipo');
  const num  = document.getElementById('doc_numero');
  if (tipo && num){
    const hints = {
      CARTA_IDENTITA: 'Es. CA1234567',
      PASSAPORTO: 'Es. YA1234567',
      PATENTE: 'Es. B12345678'
    };
    const upd = ()=>{ num.placeholder = hints[tipo.value] || 'Es. AA12345'; };
    tipo.addEventListener('change', upd);
    upd();
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn){ btn.disabled = true; btn.textContent = 'Invio…'; }

    try{
      // 1) invia la candidatura a Netlify Forms in multipart (inclusi i file)
      const fd = new FormData(form);
      if (!fd.get('form-name')) fd.set('form-name','partner');
      await fetch('/', { method:'POST', body: fd });

      // 2) notifica via funzione (solo dati testuali principali, senza file)
      try{
        const preview = {
          nome: fd.get('nome'),
          cognome: fd.get('cognome'),
          email: fd.get('email'),
          telefono: fd.get('telefono'),
          codice_fiscale: fd.get('codice_fiscale'),
          via: fd.get('via'),
          civico: fd.get('civico'),
          cap: fd.get('cap'),
          citta: fd.get('citta'),
          provincia: fd.get('provincia'),
          regione: fd.get('regione'),
          raggio_km: fd.get('raggio'),
          tariffa_eur_h: fd.get('tariffa'),
          doc_tipo: fd.get('doc_tipo'),
          doc_numero: fd.get('doc_numero'),
          doc_scadenza: fd.get('doc_scadenza')
        };
        await fetch('/.netlify/functions/notify', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ type:'partner', data: preview })
        });
      }catch(_){}

      // 3) redirect pagina di conferma
      window.location.href = '/success.html';
    }catch(err){
      alert('Invio non riuscito. Riprova.');
      if (btn){ btn.disabled = false; btn.textContent = 'Invia candidatura'; }
    }
  });
});
