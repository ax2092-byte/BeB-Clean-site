/* FILE: /assets/js/auth.js  (AGGIORNATO: supporta extraParams nei login) */
// B&B Clean — Helper Auth0 SPA
// Richiede in pagina:
// 1) <script src="/assets/js/vendor/auth0-spa-js.production.js"></script>
// 2) <script src="/assets/js/auth-config.js"></script>

window.Auth = (function(){
  let client = null;
  let lastAppState = null;

  async function ensureReady(){
    if (client) return;
    const factory = window.auth0 && window.auth0.createAuth0Client;
    if (!factory) throw new Error('Auth0 SDK non caricato');
    const cfg = window.AUTH0_CONFIG || {};
    if (!cfg.domain || !cfg.clientId || !cfg.redirectUri){
      console.warn('[Auth] Config mancante: imposta window.AUTH0_CONFIG in /assets/js/auth-config.js');
    }
    client = await factory({
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

  async function login({ screen_hint = null, appState = {}, extraParams = {} } = {}){
    await ensureReady();
    const authorizationParams = { ...extraParams };
    if (screen_hint !== null) authorizationParams.screen_hint = screen_hint;
    return client.loginWithRedirect({
      authorizationParams,
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
