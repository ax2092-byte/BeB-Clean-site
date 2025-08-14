// assets/js/partner.js — invia candidatura partner con upload file + notifica email
document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.querySelector('form[name="partner"]');
  if (!form) return;

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn){ btn.disabled = true; btn.textContent = 'Invio…'; }

    try{
      // 1) invia la candidatura a Netlify Forms in multipart (inclusi i file)
      const fd = new FormData(form);
      if (!fd.get('form-name')) fd.set('form-name','partner');
      const res = await fetch('/', { method:'POST', body: fd });
      // Netlify risponde con redirect, ma fetch segue: ok se status 200-303

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
