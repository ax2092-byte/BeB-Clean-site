// /admin-kyc-decision.js
// API call separata per cambiare stato KYC

(function(){
  const API = '/.netlify/functions/kyc';

  async function api(body){
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': localStorage.getItem('ADMIN_TOKEN') || ''
      },
      body: JSON.stringify(body||{})
    });
    const js = await res.json().catch(()=>({}));
    if (!res.ok || js.error) throw new Error(js.error || `HTTP ${res.status}`);
    return js;
  }

  window.kycDecide = async function(id, status, reason){
    const adminName = localStorage.getItem('ADMIN_NAME') || 'Admin';
    return api({ action:'decide', id, status, reason, admin: adminName });
  };
})();
