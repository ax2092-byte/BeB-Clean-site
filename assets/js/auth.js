// /assets/js/auth.js
// Gestione Auth0 per B&B Clean: login/signup Cliente/Partner + UI menù

(async () => {
  // attende che config e SDK siano disponibili
  const wait = ms => new Promise(r => setTimeout(r, ms));
  while (typeof window.AUTH0_CONFIG === 'undefined' || typeof auth0 === 'undefined') {
    await wait(30);
  }

  const auth0Client = await auth0.createAuth0Client(window.AUTH0_CONFIG);

  // utility: login con ruolo e modalità (login|signup)
  async function goAuth(role = "client", mode = "login") {
    const appState = {
      role,
      mode,
      // dove andare dopo il login, puoi cambiare se vuoi:
      target: role === "partner" ? "/dashboard.html" : "/prenota.html"
    };

    const authorizationParams = {};
    if (mode === "signup") authorizationParams.screen_hint = "signup";

    // se in futuro userai un'API:
    // authorizationParams.audience = "https://api.bnbclean.com";

    await auth0Client.loginWithRedirect({
      authorizationParams,
      appState
    });
  }

  // DOM refs
  const $navGuest = document.getElementById("nav-guest");
  const $navAuth  = document.getElementById("nav-auth");
  const $username = document.getElementById("nav-username");

  // Bottoni specifici
  const $loginClient  = document.getElementById("login-client");
  const $loginPartner = document.getElementById("login-partner");
  const $signupClient  = document.getElementById("signup-client");
  const $signupPartner = document.getElementById("signup-partner");

  // Fallback vecchi ID (se presenti)
  const $loginGeneric = document.getElementById("login");
  const $logout       = document.getElementById("logout");

  if ($loginClient)  $loginClient.addEventListener("click", e => { e.preventDefault(); goAuth("client", "login"); });
  if ($loginPartner) $loginPartner.addEventListener("click", e => { e.preventDefault(); goAuth("partner", "login"); });
  if ($signupClient)  $signupClient.addEventListener("click", e => { e.preventDefault(); goAuth("client", "signup"); });
  if ($signupPartner) $signupPartner.addEventListener("click", e => { e.preventDefault(); goAuth("partner", "signup"); });

  if ($loginGeneric) $loginGeneric.addEventListener("click", e => { e.preventDefault(); goAuth("client", "login"); });

  if ($logout) {
    $logout.addEventListener("click", async (e) => {
      e.preventDefault();
      await auth0Client.logout(window.AUTH0_LOGOUT_OPTIONS);
    });
  }

  // Gestione callback dopo il login (code/state in querystring)
  if (location.search.includes("state=") &&
     (location.search.includes("code=") || location.search.includes("error="))) {
    try {
      const result = await auth0Client.handleRedirectCallback();
      // se ho una destinazione preferita, ci vado
      const target = result?.appState?.target || "/";
      // pulisco l'URL e reindirizzo
      window.history.replaceState({}, document.title, "/");
      window.location.assign(target);
      return; // interrompe qui perché sto cambiando pagina
    } catch (err) {
      console.error("Errore callback Auth0:", err);
      window.history.replaceState({}, document.title, "/");
    }
  }

  // Stato autenticazione
  const isAuthenticated = await auth0Client.isAuthenticated();

  // Mostra il menù corretto
  if ($navGuest) $navGuest.classList.toggle("hidden", isAuthenticated);
  if ($navAuth)  $navAuth.classList.toggle("hidden", !isAuthenticated);

  // Nome utente in nav
  if (isAuthenticated && $username) {
    const user = await auth0Client.getUser();
    const name = user?.name || user?.email || "Utente";
    $username.textContent = `Ciao, ${name}`;
  }
})();
