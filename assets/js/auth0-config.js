/* =========================================================================
   B&B Clean — Auth0 Client Config (SPA vanilla su Netlify)
   =========================================================================
   Ambienti consentiti (mettili in Auth0 → Settings):
     Allowed Callback URLs:   http://localhost:8888, https://fascinating-sfogliatella-6fcb29.netlify.app, https://bnbclean.it, https://bnbclean.com
     Allowed Logout URLs:     http://localhost:8888, https://fascinating-sfogliatella-6fcb29.netlify.app, https://bnbclean.it, https://bnbclean.com
     Allowed Web Origins:     http://localhost:8888, https://fascinating-sfogliatella-6fcb29.netlify.app, https://bnbclean.it, https://bnbclean.com
     Allowed Origins (CORS):  http://localhost:8888, https://fascinating-sfogliatella-6fcb29.netlify.app, https://bnbclean.it, https://bnbclean.com

   NOTE:
   - redirect_uri = window.location.origin  → deve combaciare (senza "/") con una Callback URL in Auth0.
   - logout returnTo = window.location.origin → deve combaciare (senza "/") con una Logout URL in Auth0.
   - Back-Channel Logout / Cross-Origin Auth → OFF (non servono ora).
   ========================================================================= */

(function () {
  const ORIGIN = window.location.origin; // es. https://bnbclean.it

  const AUTH0_CONFIG = {
    domain: "dev-nmvv4fpc7jmiw1pw.eu.auth0.com",
    clientId: "Tpjl7J5RWMRm5WdGD8PCPTymMSFKiWmq",
    authorizationParams: {
      redirect_uri: ORIGIN,
      // Se in futuro proteggi API/Functions con token:
      // audience: "https://api.bnbclean.com",
      // scope: "openid profile email" // aggiungi "offline_access" se abiliti Refresh Token Rotation
    },
    cacheLocation: "memory",
    useRefreshTokens: false
  };

  const AUTH0_LOGOUT_OPTIONS = {
    logoutParams: { returnTo: ORIGIN }
  };

  window.AUTH0_CONFIG = AUTH0_CONFIG;
  window.AUTH0_LOGOUT_OPTIONS = AUTH0_LOGOUT_OPTIONS;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { AUTH0_CONFIG, AUTH0_LOGOUT_OPTIONS };
  }
})();
