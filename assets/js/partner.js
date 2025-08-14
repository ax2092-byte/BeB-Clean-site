// assets/js/partner.js — invia candidatura partner + notifica email + redirect a success
document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.querySelector('form[name="partner"]');
  if (!form) return;

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn){ btn.disabled = true; btn.textContent = 'Invio…'; }

    try{
      const fd = new FormData(form);
      const obj = Object.fromEntries(fd.entries());
      const body = new URLSearchParams(fd).toString();

      // 1) registra su Netlify Forms
      await fetch('/', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });

      // 2) notifica via funzione
      try{
        await fetch('/.netlify/functions/notify', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ type:'partner', data: obj })
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
