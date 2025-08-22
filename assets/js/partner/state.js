// PartnerState: utilità centralizzate per token + chiamate alle Netlify Functions
window.PartnerState = (function(){
  const FN = p => `/.netlify/functions/${p}`;

  async function getAuth0Client(){
    if (window.__auth0Client) return window.__auth0Client;
    const cfg = window.AUTH0_CONFIG || {};
    const client = await (window.auth0 && window.auth0.createAuth0Client ? window.auth0.createAuth0Client(cfg) : window.createAuth0Client(cfg));
    window.__auth0Client = client;
    return client;
  }

  async function idToken(){
    const c = await getAuth0Client();
    const claims = await c.getIdTokenClaims();
    return claims.__raw;
  }

  async function _fetch(path, opts = {}){
    const token = await idToken();
    const res = await fetch(FN(path), {
      method: opts.method || 'POST',
      headers: Object.assign({'Content-Type':'application/json','Authorization':`Bearer ${token}`}, opts.headers||{}),
      body: opts.body ? JSON.stringify(opts.body) : (opts.method==='GET' ? undefined : '{}'),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  function euro(v){ return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v); }

  return {
    euro,
    async fetch(force=false){
      if (!force && window.__partner_state) return window.__partner_state;
      const st = await _fetch('partner-get-state');
      window.__partner_state = st;
      return st;
    },
    async saveRate(hourly){
      return _fetch('partner-rate-save',{body:{hourly_eur:Number(hourly)}});
    },
    async sendOTP(phone){
      return _fetch('verify-sms-init',{body:{phone_number:phone}});
    },
    async verifyOTP(phone, code){
      const res = await _fetch('verify-sms-check',{body:{phone_number:phone, code}});
      return !!res.approved;
    },
    async saveProfile({nickname, avatar_url}){
      return _fetch('partner-update-profile',{body:{nickname, avatar_url}});
    },
    async saveProducts(list){
      return _fetch('partner-products-save',{body:{products:list}});
    },
    async saveDomicile(dom){
      return _fetch('partner-domicile-save',{body:dom});
    },
    async saveBilling({holder, iban}){
      return _fetch('partner-billing-save',{body:{holder, iban}});
    },
    async getCloudinarySignature({folder, public_id}){
      return _fetch('docs-signature',{body:{folder, public_id}});
    }
  };
})();
