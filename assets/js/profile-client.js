// FILE: /assets/js/profile-client.js
// Gestione profilo cliente: carica/salva dati + verifica telefono via OTP (Twilio Verify).
(async function(){
  const $ = (q)=>document.querySelector(q);
  const setVal = (id,v)=>{ const el=$(id); if(el) el.value = (v??''); };
  const setText = (id,v)=>{ const el=$(id); if(el) el.textContent = (v??''); };

  async function getAuthClient(){
    const cfg = window.AUTH0_CONFIG || {};
    const factory = (window.auth0 && window.auth0.createAuth0Client) ? window.auth0.createAuth0Client : window.createAuth0Client;
    return factory(cfg);
  }

  async function ensureAuth(){
    const client = await getAuthClient();
    const isAuth = await client.isAuthenticated();
    if (!isAuth){
      await client.loginWithRedirect({ authorizationParams:{ redirect_uri: location.href }});
      return null;
    }
    return client;
  }

  async function loadProfile(){
    try{
      const r = await fetch('/.netlify/functions/client-profile-get', { cache:'no-store' });
      if(!r.ok) throw 0;
      return await r.json();
    }catch(_){
      // fallback minimo usando claims
      const c = await (await ensureAuth()).getUser();
      return {
        email: c?.email,
        first_name: c?.given_name || '',
        last_name: c?.family_name || '',
        phone: c?.phone_number || '',
        cf: c?.user_metadata?.cf || '',
        birth_place: c?.user_metadata?.birth_place || '',
        birth_date: c?.user_metadata?.birth_date || '',
        phone_verified: !!c?.user_metadata?.phone_verified,
        cf_validated: !!c?.user_metadata?.cf_validated
      };
    }
  }

  async function saveProfile(payload){
    const r = await fetch('/.netlify/functions/client-profile-update', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    return r.ok;
  }

  // OTP telefono
  async function startOtp(phone){
    const r = await fetch('/.netlify/functions/verify-start?phone=' + encodeURIComponent(phone));
    return r.ok;
  }
  async function checkOtp(phone, code){
    const r = await fetch('/.netlify/functions/verify-check?phone=' + encodeURIComponent(phone) + '&code=' + encodeURIComponent(code));
    return r.ok;
  }

  function msg(el, text, kind=''){
    el.textContent = text||'';
    el.className = 'muted ' + (kind ? ('status-'+kind) : '');
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    if (document.body.dataset.profile !== 'client') return;

    const prof = await loadProfile();
    setVal('#first_name', prof.first_name);
    setVal('#last_name', prof.last_name);
    setVal('#phone', prof.phone || '');
    setVal('#birth_place', prof.birth_place || '');
    setVal('#birth_date', prof.birth_date || '');
    setVal('#cf', prof.cf || '');
    setText('#email_ro', prof.email || '—');

    if (prof.cf_validated){ $('#cf').setAttribute('readonly','readonly'); }
    if (prof.phone_verified){
      const t=$('#phone_status'); t.textContent='Verificato'; t.classList.add('ok');
    }

    // OTP flow
    $('#btn-otp-start')?.addEventListener('click', async ()=>{
      const phone = $('#phone').value.trim();
      const status = $('#otp_msg');
      if (!phone){ msg(status,'Inserisci il numero di telefono','warn'); return; }
      msg(status,'Invio codice…'); const ok = await startOtp(phone);
      msg(status, ok ? 'Codice inviato via SMS.' : 'Errore invio codice', ok?'ok':'err');
    });
    $('#btn-otp-check')?.addEventListener('click', async ()=>{
      const phone = $('#phone').value.trim();
      const code = $('#otp_code').value.trim();
      const status = $('#otp_msg');
      if (!phone || !code){ msg(status,'Inserisci telefono e codice','warn'); return; }
      msg(status,'Verifica…'); const ok = await checkOtp(phone, code);
      msg(status, ok ? 'Numero verificato ✅' : 'Codice non valido', ok?'ok':'err');
      if (ok){ $('#phone_status').textContent='Verificato'; $('#phone_status').classList.add('ok'); }
    });

    // Salva
    $('#btn-save-profile')?.addEventListener('click', async ()=>{
      const payload = {
        first_name: $('#first_name').value.trim(),
        last_name: $('#last_name').value.trim(),
        phone: $('#phone').value.trim(),
        cf: $('#cf').value.trim(),
        birth_place: $('#birth_place').value.trim(),
        birth_date: $('#birth_date').value,
      };
      const ok = await saveProfile(payload);
      const s = $('#save_msg'); msg(s, ok?'Salvato ✅':'Errore salvataggio', ok?'ok':'err');
    });
  });
})();
