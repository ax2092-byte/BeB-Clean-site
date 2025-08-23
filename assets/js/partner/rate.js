(async function(){
  const st = await PartnerState.fetch();
  const input = document.getElementById('rate-input');
  const status = document.getElementById('rate-status');
  input.value = st.hourly_eur || '';
  document.getElementById('save-rate').addEventListener('click', async ()=>{
    const v = Number(input.value);
    if (!v || v<1){ status.textContent='Inserisci un valore valido (>=1).'; return; }
    await PartnerState.saveRate(v);
    status.textContent = 'Salvato.';
  });
  const lo = document.getElementById('logout-link'); if(lo) lo.addEventListener('click',(e)=>{e.preventDefault(); window.authLogout&&window.authLogout();});
})();
