window.UI = (function(){
  function setText(id, text){ const el=document.getElementById(id); if(el) el.textContent = text; }
  function badge(ok, t='OK', f='Non verificato'){ return ok ? `✅ ${t}` : `⚠️ ${f}`; }
  function renderDashboardSummary(st){
    setText('phone-state', badge(st.phone_verified, 'Verificato','Non verificato'));
    const pi=document.getElementById('phone-input'); if(pi) pi.value = st.phone_number || '';
    const docsMap = { missing:'Mancanti', in_review:'In revisione', approved:'Approvati' };
    setText('docs-state', (st.docs_status ? `Stato: ${docsMap[st.docs_status]||st.docs_status}` : '—'));
    setText('rate-state', st.hourly_eur ? `${st.hourly_eur.toFixed(2)} €/h` : '—');
    const nck = st.profile?.nickname || '—'; setText('nickname-label', nck);
    const av = st.profile?.avatar_url || '/assets/img/bbclean-icon-128.png';
    const img = document.getElementById('avatar-preview'); if (img) img.src = av;
    const prodCount = (st.products||[]).length; setText('products-state', prodCount ? `${prodCount} prodotti` : 'Nessun prodotto');
    const dom = st.domicile;
    setText('domicile-state', dom?.city ? `${dom.city} (${dom.region||''}) — raggio ${dom.radius_km||0} km` : 'Non impostato');
    const ib = st.billing?.iban_masked || '—'; setText('billing-state', `IBAN: ${ib}`);
  }
  return { renderDashboardSummary };
})();
