document.addEventListener('DOMContentLoaded', async ()=>{
  try{
    const cfg = window.AUTH0_CONFIG || {};
    const client = await (window.auth0 && window.auth0.createAuth0Client ? window.auth0.createAuth0Client(cfg) : window.createAuth0Client(cfg));
    const isAuth = await client.isAuthenticated();
    const nav = document.getElementById('main-nav') || document.querySelector('header nav');
    const partnerCta = nav && (nav.querySelector('[data-role="nav-partner-cta"]') || nav.querySelector('a[href="/partner.html"]'));
    const logout = document.getElementById('logout-link') || (nav && nav.querySelector('#logout-link'));
    if (!isAuth){ if (logout) logout.style.display='none'; return; }
    const claims = await client.getIdTokenClaims();
    const userType = claims['https://bebclean.it/user_type'];
    const pid = claims['https://bebclean.it/partner_id'];
    if (partnerCta && (userType==='partner' || !!pid)){ partnerCta.style.display='none'; }
    if (logout){ window.authLogout = async ()=>{ await client.logout({logoutParams:{ returnTo: window.location.origin }}); }; }
  }catch(e){ console.warn('menu-auth.js:', e); }
});
