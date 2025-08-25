// FILE: /assets/js/profile-docs.js
// Upload documenti (CI fronte/retro, selfie) -> Cloudinary (firmato) -> salva metadati.

(async function(){
  const $ = (q)=>document.querySelector(q);

  async function signUpload(folder){
    const r = await fetch('/.netlify/functions/cloudinary-sign', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ folder })
    });
    if (!r.ok) throw new Error('sign failed');
    return r.json(); // { cloud_name, api_key, timestamp, signature, folder }
  }
  async function uploadFile(file, folder){
    if (!file) return null;
    const s = await signUpload(folder);
    const url = `https://api.cloudinary.com/v1_1/${s.cloud_name}/auto/upload`;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', s.api_key);
    fd.append('timestamp', s.timestamp);
    fd.append('signature', s.signature);
    fd.append('folder', s.folder);
    const r = await fetch(url, { method:'POST', body:fd });
    if (!r.ok) throw new Error('upload failed');
    const js = await r.json();
    return js.secure_url;
  }

  async function saveDocs(payload){
    const r = await fetch('/.netlify/functions/client-docs-update', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    return r.ok;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    if (document.body.dataset.profile !== 'client') return;

    $('#btn-upload-docs')?.addEventListener('click', async ()=>{
      const status = $('#docs_msg'); status.textContent = 'Caricamento…';
      try{
        const front = $('#doc_front').files[0] ? await uploadFile($('#doc_front').files[0], 'clients/docs') : null;
        const back  = $('#doc_back').files[0]  ? await uploadFile($('#doc_back').files[0],  'clients/docs') : null;
        const selfie= $('#doc_selfie').files[0]? await uploadFile($('#doc_selfie').files[0],'clients/docs') : null;

        const payload = {
          type: $('#doc_type').value,
          number: $('#doc_number').value.trim(),
          expires_at: $('#doc_expiry').value,
          front_url: front, back_url: back, selfie_url: selfie
        };
        const ok = await saveDocs(payload);
        status.textContent = ok ? 'Documenti inviati. In verifica ✅' : 'Errore salvataggio documenti';
      }catch(e){
        status.textContent = 'Errore upload: ' + e.message;
      }
    });
  });
})();
