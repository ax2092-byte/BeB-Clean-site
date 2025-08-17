/* =========================================================================
   B&B Clean — Auth0 Client Config (SPA vanilla su Netlify)
   -------------------------------------------------------------------------
   Ambienti previsti (aggiunti in Auth0 → Allowed * senza slash finale):
     - http://localhost:8888
     - https://fascinating-sfogliatella-6fcb29.netlify.app
     - https://bnbclean.it
     - https://bnbclean.com

   Nota importanti:
   - redirect_uri = window.location.origin  → DEVE combaciare con una Allowed Callback URL (senza "/").
   - logout returnTo = window.location.origin → DEVE essere tra le Allowed Logout URLs (senza "/").
   - Lascia Back-Channel Logout e Cross-Origin Authentication disattivati (non servono per SPA).
   - Se in futuro proteggi API: scommenta "audience".
   - Se vuoi sessioni “lunghe” con Refresh Token Rotation: vedi sezione in fondo.
   ========================================================================= */

(function () {
  const ORIGIN = window.location.origin; // es. https://bnbclean.it

  /** @type {import('auth0-spa-js').Auth0ClientOptions} */
  const AUTH0_CONFIG = {
    domain: "dev-nmvv4fpc7jmiw1pw.eu.auth0.com",
    clientId: "Tpjl7J5RWMRm5WdGD8PCPTymMSFKiWmq",
    authorizationParams: {
      redirect_uri: ORIGIN,
      // ✅ Se in futuro crei un'API in Auth0, imposta l'identifier come audience:
      // audience: "https://api.bnbclean.com",
      // scope: "openid profile email" // aggiungi "offline_access" se abiliti i Refresh Token
    },
    // Cache predefinita in memoria: va bene per iniziare
    cacheLocation: "memory",
    // Disattivato all'inizio; abilitalo solo quando attivi la Rotation in Auth0
    useRefreshTokens: false
  };

  // Opzioni consigliate per il logout (usale in auth.js)
  const AUTH0_LOGOUT_OPTIONS = {
    logoutParams: { returnTo: ORIGIN }
  };

  // Espone in modo globale (per script via <script>)
  window.AUTH0_CONFIG = AUTH0_CONFIG;
  window.AUTH0_LOGOUT_OPTIONS = AUTH0_LOGOUT_OPTIONS;

  // Supporto CommonJS (se mai bundler)
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { AUTH0_CONFIG, AUTH0_LOGOUT_OPTIONS };
  }
})();
