/* FILE: /assets/js/guard.js  (se non l'hai già creato) */
// Reindirizza a /login.html se non autenticato. Mantiene la querystring.
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
    console.warn('[AuthGuard] Init Auth0 fallita:', e);
  }
})();
