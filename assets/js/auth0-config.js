const AUTH0_CONFIG = {
  domain: "dev-nmvv4fpc7jmiw1pw.eu.auth0.com",
  clientId: "Tpjl7J5RWMRm5WdGD8PCPTymMSFKiWmq",
  authorizationParams: {
    redirect_uri: window.location.origin   // ← qui
  },
  cacheLocation: "memory",
  useRefreshTokens: false
};
