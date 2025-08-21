/* FILE: /assets/js/auth.js
   Helper Auth0 SPA compatibile con SDK v2.x (window.auth0.createAuth0Client)
   e con esposizione legacy (window.createAuth0Client).
   Richiede in pagina:
   1) /assets/js/vendor/auth0-spa-js.production.js  (oppure CDN)
   2) /assets/js/auth-config.js
*/
window.Auth = (function(){
  let client = null;
  let lastAppState = null;

  function getCreateClientFactory(){
    // SDK v2.x espone la factory sotto window.auth0.createAuth0Client
    if (window.auth0 && typeof window.auth0.createAuth0Client === 'function') {
      return window.auth0.createAuth0Client;
    }
    // compat legacy
    if (typeof window.createAuth0Client === 'function') {
      return window.createAuth0Client;
    }
    return null;
  }

  async function ensureReady(){
    if (client) return;

    const createClient = getCreateClientFactory();
    if (!createClient) throw new Error('Auth0 SDK non caricato');

    const cfg = window.AUTH0_CONFIG || {};
    if (!cfg.domain || !cfg.clientId || !cfg.redirectUri){
      console.warn('[Auth] Config mancante: compila /assets/js/auth-config.js (domain, clientId, redirectUri)');
    }

    client = await createClient({
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
