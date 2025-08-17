// /assets/js/auth.js
(async () => {
  // attende che config e SDK siano disponibili (in caso di caricamenti lenti)
  const wait = ms => new Promise(r => setTimeout(r, ms));
  while (typeof window.AUTH0_CONFIG === 'undefined' || typeof auth0 === 'undefined') {
    await wait(30);
  }

  const auth0Client = await auth0.createAuth0Client(window.AUTH0_CONFIG);

  // Riferimenti DOM (se presenti nella pagina)
  const $login  = document.getElementById("login");
  const $logout = document.getElementById("logout");
  const $profile = document.getElementById("profile");

  // LOGIN (bottone)
  if ($login) {
    $login.addEventListener("click", async (e) => {
      e.preventDefault();
      await auth0Client.loginWithRedirect();
    });
  }

  // CALLBACK dopo il login (code/state in querystring)
  if (location.search.includes("state=") &&
     (location.search.includes("code=") || location.search.includes("error="))) {
    try {
      await auth0Client.handleRedirectCallback();
    } catch (err) {
      console.error("Errore callback Auth0:", err);
    } finally {
      // ripulisce l'URL (torna alla root del dominio)
      window.history.replaceState({}, document.title, "/");
    }
  }

  // LOGOUT (bottone)
  if ($logout) {
    $logout.addEventListener("click", async (e) => {
      e.preventDefault();
      await auth0Client.logout(window.AUTH0_LOGOUT_OPTIONS);
    });
  }

  // Stato autenticazione
  const isAuthenticated = await auth0Client.isAuthenticated();

  // Toggle bottoni
  if ($login)  $login.classList.toggle("hidden",  isAuthenticated);
  if ($logout) $logout.classList.toggle("hidden", !isAuthenticated);

  // Profilo utente (se container presente)
  if ($profile) {
    if (isAuthenticated) {
      const user = await auth0Client.getUser();
      const name = user?.name || user?.email || "Utente";
      const picture = user?.picture || "";
      $profile.style.display = "block";
      $profile.innerHTML = `
        <p>👤 <strong>${name}</strong></p>
        ${picture ? `<img src="${picture}" alt="Avatar">` : ""}
      `;
    } else {
      $profile.style.display = "none";
      $profile.innerHTML = "";
    }
  }

  // (Opzionale) ottenere un Access Token per chiamare API
  // if (isAuthenticated) {
  //   const token = await auth0Client.getTokenSilently();
  //   // usa "token" nelle chiamate fetch verso API/Netlify Functions
  // }
})();
