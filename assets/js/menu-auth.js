/* FILE: /assets/js/menu-auth.js
   Mostra stato utente nel topbar e aggiunge Logout.
   Richiede che auth0 SDK + auth-config.js + auth.js siano già caricati.
*/
(function(){
  function el(tag, attrs, text){
    const n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k=> n.setAttribute(k, attrs[k]));
    if (text) n.textContent = text;
    return n;
  }

  async function init(){
    try{
      await window.Auth.ensureReady();
    }catch(e){ return; }

    const topbar = document.querySelector('.topbar.container');
    if (!topbar) return;

    let bar = document.getElementById('authbar');
    if (!bar){
      bar = el('div', { id:'authbar', class:'authbar' });
      topbar.appendChild(bar); // a destra del menu (flex order)
    }
    bar.innerHTML = '';

    const logged = await window.Auth.isAuthenticated();
    if (!logged){
      const link = el('a', { href:'/login.html', id:'nav-login' }, 'ACCEDI');
      bar.appendChild(link);
      return;
    }

    const user = await window.Auth.getUser();
    const name = (user && (user.name || user.nickname || user.email)) || 'Utente';
    const hi = el('span', { class:'hi', id:'user-badge' }, 'Ciao, ' + name);
    const out = el('a', { href:'#', id:'nav-logout' }, 'ESCI');

    out.addEventListener('click', async function(e){
      e.preventDefault();
      try{ await window.Auth.logout(); }catch(_){}
    });

    bar.appendChild(hi);
    bar.appendChild(out);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
