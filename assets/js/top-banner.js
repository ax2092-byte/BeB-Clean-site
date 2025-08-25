// B&B Clean — Top Banner NAV (uniforme) + logo più grande
// Inserisci PRIMA di /assets/js/back-arrow.js su tutte le pagine.

(function(){
  function css(str){
    const s = document.createElement('style');
    s.id = 'bb-topbanner-style';
    s.textContent = str;
    document.head.appendChild(s);
  }
  function useStyles(){
    if (document.getElementById('bb-topbanner-style')) return;
    css(`
      :root{
        --bb-banner-logo-h: 32px; /* desktop */
      }
      .bb-topbanner{
        position: sticky; top:0; z-index:1005;
        background: var(--bb-teal, #0fb6b1); color: var(--bb-on-teal, #fff);
        border-bottom: 1px solid rgba(0,0,0,.06);
      }
      .bb-topbanner .container{
        display:flex; align-items:center; flex-wrap:wrap; gap:8px;
        padding:8px 0;
      }
      .bb-topbanner .brand{
        display:inline-flex; align-items:center; gap:10px; margin-right:8px;
      }
      .bb-topbanner .brand img{
        height: var(--bb-banner-logo-h); width:auto; display:block;
      }
      .bb-topbanner nav{
        display:flex; flex-wrap:wrap; gap:8px;
      }
      .bb-topbanner a.btn-link{
        display:inline-flex; align-items:center; gap:8px;
        padding:8px 12px; border-radius:10px;
        background: rgba(255,255,255,.14);
        border:1px solid rgba(255,255,255,.22);
        color:#fff; text-decoration:none; font-weight:600;
      }
      .bb-topbanner a.btn-link:hover{ background: rgba(255,255,255,.22); }
      .bb-topbanner a.btn-link:focus{ outline:2px solid #fff; outline-offset:2px; }
      .bb-topbanner a.active{ background: rgba(255,255,255,.32); }
      @media (max-width:640px){
        :root{ --bb-banner-logo-h: 26px; }           /* logo più grande anche su mobile */
        .bb-topbanner .container{ gap:6px; padding:6px 0; }
        .bb-topbanner a.btn-link{ padding:7px 10px; }
      }
    `);
  }

  function makeLink(href, label, id){
    const a = document.createElement('a');
    a.href = href; a.textContent = label; a.className = 'btn-link';
    if (id) a.dataset.id = id;
    // Active state
    try{
      const p = new URL(href, location.origin).pathname;
      if (location.pathname === p || location.pathname.endsWith(p)) a.classList.add('active');
    }catch(_){}
    return a;
  }

  async function enrichWithAuth(nav){
    // Sostituisce Diventa partner/Login con Dashboard/Esci quando loggato
    try{
      const cfg = window.AUTH0_CONFIG || {};
      const factory = (window.auth0 && window.auth0.createAuth0Client) ? window.auth0.createAuth0Client : window.createAuth0Client;
      if (!factory) return;
      const client = await factory(cfg);
      const isAuth = await client.isAuthenticated();
      if (!isAuth) return;

      const claims = await client.getIdTokenClaims();
      const userType = claims['https://bebclean.it/user_type'];
      const pid = claims['https://bebclean.it/partner_id'];

      const login = nav.querySelector('a[data-id="login"]');
      if (login) login.remove();

      if (userType==='partner' || !!pid){
        const become = nav.querySelector('a[data-id="become"]'); if (become) become.remove();
        if (!nav.querySelector('a[data-id="dash"]')){
          nav.appendChild(makeLink('/partner-dashboard.html','Dashboard','dash'));
        }
      }
      if (!nav.querySelector('a[data-id="logout"]')){
        const out = makeLink('#','Esci','logout');
        out.addEventListener('click', (e)=>{
          e.preventDefault();
          window.authLogout ? window.authLogout() : client.logout({logoutParams:{returnTo:location.origin}});
        });
        nav.appendChild(out);
      }
    }catch(_){}
  }

  function render(){
    if (document.querySelector('.bb-topbanner') || document.body.hasAttribute('data-no-top-banner')) return;
    useStyles();

    const hostAfter = document.querySelector('header');
    const wrap = document.createElement('div'); wrap.className = 'bb-topbanner';
    const inner = document.createElement('div'); inner.className = 'container';

    // Logo (senza slogan, più grande)
    const brand = document.createElement('a'); brand.href='/index.html'; brand.className='brand';
    const img = document.createElement('img'); img.src='/assets/img/bbclean-logo-primary.png'; img.alt='B&B Clean';
    brand.appendChild(img);
    inner.appendChild(brand);

    // NAV uniforme
    const nav = document.createElement('nav'); nav.setAttribute('aria-label','Navigazione rapida');
    [
      { href:'/index.html', label:'Home', id:'home' },
      { href:'/stima.html', label:'Stima', id:'stima' },
      { href:'/prenota.html', label:'Prenota', id:'prenota' },
      { href:'/servizi.html', label:'Servizi', id:'servizi' },
      { href:'/partner.html', label:'Diventa partner', id:'become' },
      { href:'/partner-login.html', label:'Login', id:'login' }
    ].forEach(l => nav.appendChild(makeLink(l.href, l.label, l.id)));

    inner.appendChild(nav);
    wrap.appendChild(inner);

    if (hostAfter) hostAfter.insertAdjacentElement('afterend', wrap);
    else document.body.insertAdjacentElement('afterbegin', wrap);

    enrichWithAuth(nav);
  }

  document.addEventListener('DOMContentLoaded', render);
})();
