/* FILE: /assets/js/guard-partner.js  (NUOVO - blocca l’accesso ai non partner) */
(async function(){
  function hasPartnerFlag(user){
    if (!user) return false;
    try{
      if (user.app_metadata && user.app_metadata.user_type === 'partner') return true;
      if (user['https://bebclean.it/user_type'] === 'partner') return true;
      const roles = user['https://bebclean.it/roles'] || user['https://schemas.bebclean.it/roles'] || user.roles;
      if (Array.isArray(roles) && roles.includes('partner')) return true;
    }catch(_){}
    return false;
  }

  try{
    await window.Auth.ensureReady();
    const ok = await window.Auth.isAuthenticated();
    if (!ok){ location.replace('/partner-login.html'); return; }

    const user = await window.Auth.getUser();
    if (!hasPartnerFlag(user)){
      location.replace('/index.html');
      return;
    }
    // partner ammesso → prosegue
  }catch(e){
    console.warn('[GuardPartner] errore inizializzazione', e);
    location.replace('/partner-login.html');
  }
})();
