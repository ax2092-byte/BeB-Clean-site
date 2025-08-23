(function(){
  const $ = id => document.getElementById(id);
  function ibanValid(iban){
    const s = iban.replace(/\s+/g,'').toUpperCase();
    if (!/^[A-Z0-9]+$/.test(s) || s.length < 15 || s.length > 34) return false;
    const r = s.slice(4) + s.slice(0,4);
    const num = r.replace(/[A-Z]/g, c => (c.charCodeAt(0) - 55).toString());
    let mod = 0;
    for (let i=0; i<num.length; i+=7){ const part = String(mod) + num.substring(i, i+7); mod = Number(part) % 97; }
    return mod === 1;
  }
  (async function fill(){
    const st = await PartnerState.fetch();
    $('iban-holder').value = st.billing?.holder || '';
    $('iban-state').textContent = st.billing?.iban_masked || '—';
  })();
  $('save-billing').addEventListener('click', async ()=>{
    const holder = $('iban-holder').value.trim();
    const iban = $('iban-input').value.trim().replace(/\s+/g,'').toUpperCase();
    if (!holder) return alert('Inserisci l’intestatario.');
    if (!ibanValid(iban)) return alert('IBAN non valido.');
    await PartnerState.saveBilling({holder, iban});
    $('iban-state').textContent = `Salvato (${iban.slice(0,2)}**…${iban.slice(-4)})`;
    $('iban-input').value=''; alert('Coordinate salvate.');
  });
})();
