// B&B Clean — Auth0 helpers (v2, CDN global createAuth0Client)
// Unico punto di verità per dominio/Client ID e flussi login/signup.
// Assicura il redirect a /login.html (come configurato in Auth0).

(async () => {
  // -----------------------------
  // 0) Config unificata (tenant tuo)
  // -----------------------------
  const ORIGIN = window.location.origin;
  window.AUTH0_CONFIG = {
    domain: "dev-nmvv4fpc7jmiw1pw.eu.auth0.com",
    clientId: "Tpjl7J5RWMRm5WdGD8PCPTymMSFKiWmq",
    authorizationParams: {
      // IMPORTANT: il callback in Auth0 è /login.html → deve coincidere
      redirect_uri: ORIGIN + "/login.html"
    },
    cacheLocation: "memory",
    useRefreshTokens: false,
    ...(window.AUTH0_CONFIG || {}) // eventuale override esterno
  };
  window.AUTH0_LOGOUT_OPTIONS = window.AUTH0_LOGOUT_OPTIONS || {
    logoutParams: { returnTo: ORIGIN }
  };

  // -----------------------------
  // 1) Carica SDK se manca (v2)
  // -----------------------------
  function loadAuth0Sdk() {
    return new Promise((resolve) => {
      if (typeof window.createAuth0Client === "function") return resolve(true);
      const add = (src, next) => {
        const s = document.createElement("script");
        s.src = src; s.defer = true;
        s.onload = () => next && next(false);
        s.onerror = () => next && next(true);
        document.head.appendChild(s);
      };
      add("https://cdn.auth0.com/js/auth0-spa-js/2/auth0-spa-js.production.js", (err1) => {
        if (!err1 && typeof window.createAuth0Client === "function") return resolve(true);
        // fallback
        add("https://cdn.jsdelivr.net/npm/@auth0/auth0-spa-js@2.3.0/dist/auth0-spa-js.production.js", (err2) => {
          resolve(!err2 && typeof window.createAuth0Client === "function");
        });
      });
    });
  }

  const sdkOk = await loadAuth0Sdk();
  if (!sdkOk) {
    console.error("Auth0 SDK non disponibile");
    return;
  }

  // -----------------------------
  // 2) Client
  // -----------------------------
  const auth0Client = await createAuth0Client(window.AUTH0_CONFIG);

  // -----------------------------
  // 3) Helpers
  // -----------------------------
  async function goAuth(role = "client", mode = "login") {
    const appState = {
      role,
      mode,
      target: role === "partner" ? "/dashboard.html" : "/prenota.html"
    };
    const authorizationParams = {};
    if (mode === "signup") authorizationParams.screen_hint = "signup";
    await auth0Client.loginWithRedirect({ authorizationParams, appState });
  }

  function wire(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await handler();
      } catch (err) {
        console.warn("Auth fallback:", err);
        const href = el.getAttribute("href");
        if (href) window.location.assign(href);
      }
    });
  }

  // -----------------------------
  // 4) Bind pulsanti (se presenti nella pagina)
  // -----------------------------
  wire("login-client",  () => goAuth("client",  "login"));
  wire("login-partner", () => goAuth("partner", "login"));
  wire("signup-partner", () => goAuth("partner", "signup"));
  // Intenzionalmente NON bindiamo "signup-client": usa il link locale che decidi tu.

  // -----------------------------
  // 5) Gestione callback (code/state) ovunque sia presente questo script
  //    NB: il redirect_uri è /login.html, quindi questo ramo opererà soprattutto lì.
  // -----------------------------
  if (location.search.includes("state=") &&
     (location.search.includes("code=") || location.search.includes("error="))) {
    try {
      const res = await auth0Client.handleRedirectCallback();
      const target = res?.appState?.target || "/";
      // pulisci la query
      window.history.replaceState({}, document.title, location.pathname);
      window.location.assign(target);
      return; // interrompi esecuzione perché stai cambiando pagina
    } catch (err) {
      console.error("Errore callback Auth0:", err);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }

  // -----------------------------
  // 6) UI nav (mostra/nasconde blocchi autenticazione)
  // -----------------------------
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
      try {
        await auth0Client.logout(window.AUTH0_LOGOUT_OPTIONS);
      } catch (err) {
        console.error("Errore logout:", err);
      }
    });
  }
})();
