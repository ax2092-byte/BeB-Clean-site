// B&B Clean — Freccia "Indietro" per tutte le pagine (non in /index.html)
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    try{
      const path = location.pathname.replace(/\/+$/,'') || '/index.html';
      const isHome = path === '/' || path.endsWith('/index.html');
      const header = document.querySelector('header'); if(!header) return;
      if (isHome) return;
      const FALLBACKS = {
        '/stima.html':'/index.html','/prenota.html':'/stima.html','/login.html':'/index.html',
        '/partner.html':'/index.html','/partner-login.html':'/partner.html',
        '/partner-dashboard.html':'/index.html','/partner-profile.html':'/partner-dashboard.html',
        '/partner-rate.html':'/partner-dashboard.html','/partner-products.html':'/partner-dashboard.html',
        '/partner-domicile.html':'/partner-dashboard.html','/partner-billing.html':'/partner-dashboard.html',
        '/partner-documents.html':'/partner-dashboard.html','/partner-calendar.html':'/partner-dashboard.html',
        '/impostazioni-stile.html':'/index.html','/success.html':'/index.html'
      };
      const bodyFallback = document.body.getAttribute('data-back-fallback');
      const fallback = bodyFallback || FALLBACKS[path] || '/index.html';
      if (!document.getElementById('back-arrow-style')){
        const st=document.createElement('style'); st.id='back-arrow-style'; st.textContent=`
          .back-arrow-wrap{ padding:8px 0; }
          .back-arrow{ display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:10px; text-decoration:none; border:1px solid #e6e6e6; background:#fff; }
          .back-arrow:hover{ background:#f7f7f7 } .back-arrow:focus{ outline:2px solid #0aa; outline-offset:2px }
          .back-arrow svg{ width:18px; height:18px }
        `; document.head.appendChild(st);
      }
      const wrap=document.createElement('div'); wrap.className='container back-arrow-wrap';
      const a=document.createElement('a'); a.href=fallback; a.className='back-arrow'; a.setAttribute('aria-label','Torna alla pagina precedente');
      a.innerHTML=`<svg viewBox="0 0 24 24"><path d="M15.5 19a1 1 0 0 1-.7-.3l-7-7a1 1 0 0 1 0-1.4l7-7a1 1 0 1 1 1.4 1.4L9.91 11l6.29 6.3A1 1 0 0 1 15.5 19z"/></svg><span>Indietro</span>`;
      a.addEventListener('click', function(ev){
        ev.preventDefault();
        let same=false; try{ if(document.referrer){ const r=new URL(document.referrer); same=(r.origin===location.origin); } }catch(_){}
        if (same && history.length>1){ history.back(); } else { location.href=fallback; }
      });
      wrap.appendChild(a); header.insertAdjacentElement('afterend', wrap);
    }catch(e){ console.warn('back-arrow.js error', e); }
  });
})();
