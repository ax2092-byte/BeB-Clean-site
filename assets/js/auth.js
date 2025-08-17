// /assets/js/auth.js
// Gestione Auth0 per B&B Clean: login/signup Cliente/Partner + UI menù
(async () => {
  // Fallback: se la config globale non è stata caricata, la definisco qui
  if (typeof window.AUTH0_CONFIG === 'undefined') {
    const ORIGIN = window.location.origin;
    window.AUTH0_CONFIG = {
      domain: "dev-nmvv4fpc7jmiw1pw.eu.auth0.com",
      clientId: "Tpjl7J5RWMRm5WdGD8PCPTymMSFKiWmq",
      authorizationParams: { redirect_uri: ORIGIN },
      cacheLocation: "memory",
      useRefreshTokens: false
    };
    window.AUTH0_LOGOUT_OPTIONS = { logoutParams: { returnTo: ORIGIN } };
  }

  // attende che l'SDK sia disponibile
  const wait = ms => new Promise(r => setTimeout(r, ms));
  while (typeof auth0 === 'undefined') { await wait(30); }

  const auth0Client = await auth0.createAuth0Client(window.AUTH0_CONFIG);

  // helper: login con ruolo e modalità
  async function goAuth(role = "client", mode = "login") {
    const appState = { role, mode, target: role === "partner" ? "/dashboard.html" : "/prenota.html" };
    const authorizationParams = {};
    if (mode === "signup") authorizationParams.screen_hint = "signup";
    await auth0Client.loginWithRedirect({ authorizationParams, appState });
  }

  // intercetta i click (senza rompere i link di fallback)
  function wire(id, role, mode){
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", async (e) => {
      try {
        e.preventDefault();
        await goAuth(role, mode);
      } catch (err) {
        console.warn("Auth fallback:", err);
        const href = el.getAttribute("href");
        if (href) window.location.href = href;
      }
    });
  }

  wire("login-client",  "client",  "login");
  wire("login-partner", "partner", "login");
  wire("signup-client",  "client",  "signup");
  wire("signup-partner", "partner", "signup");

  // callback dopo il login
  if (location.search.includes("state=") && (location.search.includes("code=") || location.search.includes("error="))) {
    try {
      const res = await auth0Client.handleRedirectCallback();
      const target = res?.appState?.target || "/";
      window.history.replaceState({}, document.title, "/");
      window.location.assign(target);
      return;
    } catch (err) {
      console.error("Errore callback:", err);
      window.history.replaceState({}, document.title, "/");
    }
  }

  // gestione nav autenticato
  const $navGuest = document.getElementById("nav-guest");
  const $navAuth  = document.getElementById("nav-auth");
  const $username = document.getElementById("nav-username");
  const $logout   = document.getElementById("logout");

  const isAuthenticated = await auth0Client.isAuthenticated();
  if ($navGuest) $navGuest.classList.toggle("hidden", isAuthenticated);
  if ($navAuth)  $navAuth.classList.toggle("hidden", !isAuthenticated);

  if (isAuthenticated && $username) {
    const user = await auth0Client.getUser();
    $username.textContent = `Ciao, ${user?.name || user?.email || "Utente"}`;
  }

  if ($logout) {
    $logout.addEventListener("click", async (e) => {
      e.preventDefault();
      await auth0Client.logout(window.AUTH0_LOGOUT_OPTIONS || { logoutParams: { returnTo: window.location.origin } });
    });
  }
})();
