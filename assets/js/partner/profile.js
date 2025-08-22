(async function(){
  const st = await PartnerState.fetch();
  const nick = document.getElementById('nickname-input');
  const avatarPrev = document.getElementById('avatar-preview');
  nick.value = st.profile?.nickname || '';
  avatarPrev.src = st.profile?.avatar_url || '/assets/img/bbclean-icon-128.png';

  async function uploadToCloudinary(file){
    const public_id = `avatar_${Date.now()}`;
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

  document.getElementById('upload-avatar').addEventListener('click', async ()=>{
    const file = document.getElementById('avatar-file').files[0];
    let avatarUrl = st.profile?.avatar_url;
    if (file){ const up = await uploadToCloudinary(file); avatarUrl = up.secure_url; }
    await PartnerState.saveProfile({nickname:nick.value.trim(), avatar_url:avatarUrl});
    avatarPrev.src = avatarUrl || avatarPrev.src;
    alert('Profilo salvato.');
  });
})();
