(async function(){
  const st = await PartnerState.fetch();
  const d = st.domicile || {};
  const $ = id => document.getElementById(id);
  $('dom-address').value = d.address || '';
  $('dom-city').value = d.city || '';
  $('dom-region').value = d.region || '';
  $('dom-cap').value = d.postal_code || '';
  $('dom-radius').value = d.radius_km || 20;

  async function geocode(address, city, region){
    // placeholder: lato client, semplice join (puoi sostituire con la tua geocodifica esistente)
    return { lat: null, lon: null };
  }

  $('save-domicile').addEventListener('click', async ()=>{
    const address = $('dom-address').value.trim();
    const city = $('dom-city').value.trim();
    const region = $('dom-region').value.trim();
    const postal_code = $('dom-cap').value.trim();
    const radius_km = Number($('dom-radius').value) || 20;
    const geo = await geocode(address, city, region);
    await PartnerState.saveDomicile({address, city, region, postal_code, radius_km, lat:geo.lat, lon:geo.lon});
    alert('Domicilio salvato.');
  });
})();
