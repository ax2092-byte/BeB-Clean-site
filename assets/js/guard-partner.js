(async function(){
  try{
    const cfg = window.AUTH0_CONFIG || {};
    const client = await (window.auth0 && window.auth0.createAuth0Client ? window.auth0.createAuth0Client(cfg) : window.createAuth0Client(cfg));
    const isAuth = await client.isAuthenticated();
    if (!isAuth){ return window.location.href = '/partner-login.html'; }
    const claims = await client.getIdTokenClaims();
    const userType = claims['https://bebclean.it/user_type'];
    const pid = claims['https://bebclean.it/partner_id'];
    if (!(userType==='partner' || !!pid)){ return window.location.href = '/partner-login.html'; }
    try{
      const res = await fetch('/.netlify/functions/partner-get-state',{ method:'POST', headers:{'Authorization':`Bearer ${claims.__raw}`,'Content-Type':'application/json'} });
      if (res.ok){
        const st = await res.json();
        const alerts = document.getElementById('alerts');
        if (alerts){
          if (!st.phone_verified){ const d=document.createElement('div'); d.className='alert'; d.textContent='Verifica il telefono per abilitare tutte le funzioni.'; alerts.appendChild(d); }
          if (st.docs_status !== 'approved'){ const d=document.createElement('div'); d.className='alert'; d.textContent='Carica e verifica i documenti per abilitare tutte le funzioni.'; alerts.appendChild(d); }
        }
      }
    }catch(_){}
  }catch(e){ console.warn('guard-partner error', e); window.location.href = '/partner-login.html'; }
})();
