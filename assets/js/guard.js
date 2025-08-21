// B&B Clean — Guard per pagine protette (es. /prenota.html)
// Se l'utente non è autenticato, reindirizza a /login.html preservando la querystring.

(async function(){
  try{
    await window.Auth.ensureReady();
    const ok = await window.Auth.isAuthenticated();
    if (!ok){
      const qs = location.search ? location.search.substring(1) : '';
      if (qs) sessionStorage.setItem('stima_qs', qs);
      location.replace('/login.html' + (qs ? ('?' + qs) : ''));
    }
  }catch(e){
    console.warn('[AuthGuard] Errore inizializzazione Auth0:', e);
  }
})();
