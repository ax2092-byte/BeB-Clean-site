(async function(){
  const files = { front: document.getElementById('doc-front'), back: document.getElementById('doc-back'), selfie: document.getElementById('doc-selfie') };
  const statusEl = document.getElementById('docs-status');
  function setStatus(t){ statusEl.textContent = t; }
  async function upload(file, label){
    const public_id = `${label}_${Date.now()}`;
    const sig = await PartnerState.getCloudinarySignature({folder:'partners', public_id});
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.api_key);
    form.append('timestamp', sig.timestamp);
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);
    form.append('public_id', public_id);
    const url = `https://api.cloudinary.com/v1_1/${sig.cloud_name}/auto/upload`;
    const res = await fetch(url, { method:'POST', body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  document.getElementById('upload-docs').addEventListener('click', async ()=>{
    try{
      setStatus('Caricamento in corso...');
      const out = {};
      if (files.front.files[0]) out.id_front = (await upload(files.front.files[0],'id_front')).secure_url;
      if (files.back.files[0]) out.id_back = (await upload(files.back.files[0],'id_back')).secure_url;
      if (files.selfie.files[0]) out.selfie = (await upload(files.selfie.files[0],'selfie')).secure_url;
      await PartnerState.saveProfile({ docs: out, docs_status: 'in_review' });
      setStatus('Caricati. Stato: In revisione.');
      alert('Documenti caricati. Stato aggiornato a "in revisione".');
    }catch(e){ console.error(e); setStatus('Errore caricamento.'); alert('Errore durante il caricamento.'); }
  });
})();
