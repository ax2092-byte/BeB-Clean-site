/* FILE: /assets/js/auth.js
   Helper Auth0 SPA: NON modificare.
   Richiede che in pagina siano già caricati:
   1) /assets/js/vendor/auth0-spa-js.production.js  (SDK Auth0, locale)
   2) /assets/js/auth-config.js
*/
window.Auth = (function(){
  let client = null;
  let lastAppState = null;

  async function ensureReady(){
    if (client) return;
    if (!window.createAuth0Client) throw new Error('Auth0 SDK non caricato');
    const cfg = window.AUTH0_CONFIG || {};
    if (!cfg.domain || !cfg.clientId || !cfg.redirectUri){
      console.warn('[Auth] Config mancante: compila /assets/js/auth-config.js');
    }
    client = await window.createAuth0Client({
      domain: cfg.domain,
      clientId: cfg.clientId,
      authorizationParams: { redirect_uri: cfg.redirectUri },
      cacheLocation: cfg.cacheLocation || 'localstorage',
      useRefreshTokens: !!cfg.useRefreshTokens
    });
  }

  async function isAuthenticated(){
    await ensureReady();
    return client.isAuthenticated();
  }

  async function login({ screen_hint = null, appState = {} } = {}){
    await ensureReady();
    return client.loginWithRedirect({
      authorizationParams: { screen_hint },
      appState
    });
  }

  async function logout(){
    await ensureReady();
    return client.logout({ logoutParams:{ returnTo: window.location.origin }});
  }

  async function handleRedirect(){
    await ensureReady();
    const res = await client.handleRedirectCallback();
    lastAppState = res && res.appState ? res.appState : null;
    return res;
  }

  function getAppState(){
    return lastAppState;
  }

  async function getUser(){
    await ensureReady();
    return client.getUser();
  }

  return {
    ensureReady,
    isAuthenticated,
    login,
    logout,
    handleRedirect,
    getAppState,
    getUser
  };
})();
