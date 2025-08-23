(async function(){
  await fillComuniDatalist('citta-list'); // richiede /assets/data/comuni.json
  const st = await PartnerState.fetch();
  const d = st.domicile || {};
  const $ = id => document.getElementById(id);
  $('dom-address').value = d.address || '';
  $('dom-city').value = d.city || '';
  $('dom-region').value = d.region || '';
  $('dom-cap').value = d.postal_code || '';
  $('dom-radius').value = d.radius_km || 20;

  $('save-domicile').addEventListener('click', async ()=>{
    const address = $('dom-address').value.trim();
    const city = $('dom-city').value.trim();
    const region = $('dom-region').value.trim();
    const postal_code = $('dom-cap').value.trim();
    const radius_km = Number($('dom-radius').value) || 20;
    const geo = await geocodeViaNominatim(`${address}`, city, region);
    await PartnerState.saveDomicile({address, city, region, postal_code, radius_km, lat:geo?.lat||null, lon:geo?.lon||null});
    alert('Domicilio salvato.');
  });
})();
