// B&B Clean — Script comune: freccia "indietro" + evidenza voce attiva
(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded', function(){
    // Evidenza voce attiva
    const path = location.pathname.replace(/\/+$/,'') || '/';
    const map = {
      '/': 'home',
      '/index.html': 'home',
      '/prenota.html': 'prenota',
      '/servizi.html': 'servizi',
      '/partner.html': 'partner'
    };
    const current = map[path] || null;
    document.querySelectorAll('.mainnav a').forEach(a=>{
      const isActive = a.dataset.page === current;
      a.classList.toggle('active', !!isActive);
      if(isActive){
        // rimuove eventuali "active" lasciati altrove
        document.querySelectorAll('.mainnav a').forEach(b=>{
          if(b!==a) b.classList.remove('active');
        });
      }
    });

    // Freccia "indietro" con fallback alla Home
    const back = document.getElementById('back-link');
    const isHome = current === 'home';
    if (back){
      if (isHome){
        back.setAttribute('aria-hidden','true');
        back.style.visibility = 'hidden';
        back.style.pointerEvents = 'none';
      } else {
        back.addEventListener('click', function(e){
          e.preventDefault();
          try{
            if (document.referrer){
              const ref = new URL(document.referrer);
              if (ref.origin === location.origin) {
                history.back();
                return;
              }
            }
          }catch(_e){}
          location.href = '/index.html';
        });
      }
    }
  });
})();
