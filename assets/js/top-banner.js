// B&B Clean — Top Banner con bottoni (HOME, STIMA, PRENOTA, PARTNER/DASHBOARD, LOGIN/ESCI)
// Inseriscilo su tutte le pagine, PRIMA di /assets/js/back-arrow.js

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
        --bb-teal:#0fb6b1;
        --bb-dark:#1f2937;
        --bb-on-teal:#ffffff;
      }
      .bb-topbanner{
        position: sticky; top:0; z-index:1005;
        background: var(--bb-teal); color: var(--bb-on-teal);
        border-bottom: 1px solid rgba(0,0,0,.06);
      }
      .bb-topbanner .container{
        display:flex; align-items:center; flex-wrap:wrap; gap:8px;
        padding:8px 0;
      }
      .bb-topbanner .spacer{ flex:1 1 auto; }
      .bb-topbanner a.btn-link{
        display:inline-flex; align-items:center; gap:8px;
        padding:8px 12px; border-radius:10px;
        background: rgba(255,255,255,.14);
        border:1px solid rgba(255,255,255,.22);
        color:#fff; text-decoration:none;
      }
      .bb-topbanner a.btn-link:hover{ background: rgba(255,255,255,.22); }
      .bb-topbanner a.btn-link:focus{ outline:2px solid #fff; outline-offset:2px; }
      .bb-topbanner a.active{ background: rgba(255,255,255,.32); }
      .bb-topbanner .brand{
        display:inline-flex; align-items:center; gap:10px; margin-right:8px;
      }
      .bb-topbanner .brand img{ height:20px; width:auto; display:block; }
      @media (max-width:640px){
        .bb-topbanner .container{ gap:6px; }
        .bb-topbanner a.btn-link{ padding:7px 10px; }
      }
    `);
  }

  function makeLink(href, label){
    const a = document.createElement('a');
    a.href = href; a.textContent = label; a.className = 'btn-link';
    // Active state
    try{
      const p = new URL(href, location.origin).pathname;
      if (location.pathname.endsWith(p)) a.classList.add('active');
    }catch(_){}
    return a;
  }

  async function enrichWithAuth(nav){
    // Se Auth0 presente, adegua voci (Dashboard/Esci vs Login/Diventa partner)
    try{
      const cfg = window.AUTH0_CONFIG || {};
      const factory = (window.auth0 && window.auth0.createAuth0Client) ? window.auth0.createAuth0Client : window.createAuth0Client;
      if (!factory) return;
      const client = await factory(cfg);
      const isAuth = await client.isAuthenticated();
      if (!isAuth) return; // resta versione anonima
      const claims = await client.getIdTokenClaims();
      const userType = claims['https://bebclean.it/user_type'];
      const pid = claims['https://bebclean.it/partner_id'];

      // Rimuovi LOGIN
      const login = nav.querySelector('a[data-id="login"]');
      if (login) login.remove();

      // Sostituisci/aggiungi voci partner
      if (userType==='partner' || !!pid){
        // Nascondi "Diventa partner"
        const become = nav.querySelector('a[data-id="become"]'); if (become) become.remove();
        // Aggiungi Dashboard se manca
        if (!nav.querySelector('a[data-id="dash"]')){
          const dash = makeLink('/partner-dashboard.html','Dashboard');
          dash.dataset.id = 'dash';
          nav.appendChild(dash);
        }
      }

      // Aggiungi Esci
      if (!nav.querySelector('a[data-id="logout"]')){
        const out = makeLink('#','Esci'); out.dataset.id='logout';
        out.addEventListener('click', (e)=>{ e.preventDefault(); window.authLogout ? window.authLogout() : client.logout({logoutParams:{returnTo:location.origin}}); });
        nav.appendChild(out);
      }
    }catch(e){ /* silenzioso */ }
  }

  function render(){
    useStyles();
    // Non duplicare
    if (document.querySelector('.bb-topbanner')) return;

    // Inserisci subito DOPO l'header (se presente) altrimenti in cima al body
    const hostAfter = document.querySelector('header');
    const wrap = document.createElement('div'); wrap.className = 'bb-topbanner';
    const inner = document.createElement('div'); inner.className = 'container';

    // Logo piccolo a sinistra (consistenza brand)
    const brand = document.createElement('a'); brand.href='/index.html'; brand.className='brand';
    const img = document.createElement('img'); img.src='/assets/img/bbclean-logo-primary.png'; img.alt='B&B Clean';
    const slogan = document.createElement('span'); slogan.textContent = 'Il tuo tempo è il nostro lavoro!';
    brand.appendChild(img); brand.appendChild(slogan);
    inner.appendChild(brand);

    // Bottoni principali
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label','Navigazione rapida');

    const links = [
      { href:'/index.html', label:'Home', id:'home' },
      { href:'/stima.html', label:'Stima', id:'stima' },
      { href:'/prenota.html', label:'Prenota', id:'prenota' },
      { href:'/partner.html', label:'Diventa partner', id:'become' },
      { href:'/partner-login.html', label:'Login', id:'login' }
    ];
    links.forEach(l=>{
      const a = makeLink(l.href, l.label);
      a.dataset.id = l.id;
      nav.appendChild(a);
    });

    inner.appendChild(nav);
    wrap.appendChild(inner);

    if (hostAfter) hostAfter.insertAdjacentElement('afterend', wrap);
    else document.body.insertAdjacentElement('afterbegin', wrap);

    // Adegua voci se loggato/partner
    enrichWithAuth(nav);
  }

  document.addEventListener('DOMContentLoaded', render);
})();
