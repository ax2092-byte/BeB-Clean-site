// B&B Clean — Top Banner NAV (pubblico + profilo cliente) + logo + chip utente
// Caricare PRIMA di /assets/js/back-arrow.js su tutte le pagine.

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
      :root{ --bb-banner-logo-h: 32px; }
      .bb-topbanner{ position:sticky; top:0; z-index:1005; background: var(--bb-teal, #0fb6b1); color:#fff; border-bottom:1px solid rgba(0,0,0,.06) }
      .bb-topbanner .container{ display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:8px 0 }
      .bb-topbanner .brand{ display:inline-flex; align-items:center; gap:10px; margin-right:8px }
      .bb-topbanner .brand img{ height: var(--bb-banner-logo-h); width:auto; display:block }
      .bb-topbanner nav{ display:flex; flex-wrap:wrap; gap:8px }
      .bb-topbanner a.btn-link{
        display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:10px;
        background: rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.22); color:#fff; text-decoration:none; font-weight:600;
      }
      .bb-topbanner a.btn-link:hover{ background: rgba(255,255,255,.22) }
      .bb-topbanner a.btn-link:focus{ outline:2px solid #fff; outline-offset:2px }
      .bb-topbanner a.active{ background: rgba(255,255,255,.32) }
      .bb-topbanner .spacer{ flex:1 1 auto }

      /* Chip utente a destra */
      .bb-topbanner .userchip{
        display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px;
        background: rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.22); color:#fff; font-weight:700; text-decoration:none; max-width:260px;
      }
      .bb-topbanner .userchip img{ width:28px; height:28px; border-radius:50%; object-fit:cover; display:block; background: rgba(255,255,255,.3) }
      .bb-topbanner .userchip .greet{ opacity:.9 }
      .bb-topbanner .userchip .name{ max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }

      /* Strip sopra al banner (solo profilo) */
      .bb-prof-strip{ position:sticky; top:0; z-index:1006; background:#073f3f; color:#fff; padding:6px 0; }
      .bb-prof-strip .container{ font-weight:700; letter-spacing:.2px }

      @media (max-width:640px){
        :root{ --bb-banner-logo-h: 26px }
        .bb-topbanner .container{ gap:6px; padding:6px 0 }
        .bb-topbanner a.btn-link{ padding:7px 10px }
        .bb-topbanner .userchip .greet{ display:none }
        .bb-topbanner .userchip .name{ max-width:110px }
      }
    `);
  }

  function makeLink(href, label, id){
    const a = document.createElement('a');
    a.href = href; a.textContent = label; a.className = 'btn-link';
    if (id) a.dataset.id = id;
    try{
      const p = new URL(href, location.origin).pathname;
      if (location.pathname === p || location.pathname.endsWith(p)) a.classList.add('active');
    }catch(_){}
    return a;
  }

  function firstWord(s){ if(!s) return ''; const t=String(s).trim(); const sp=t.split(/\s+/); return sp[0]||t; }

  async function enrichWithAuth(nav, profileMode){
    try{
      const cfg = window.AUTH0_CONFIG || {};
      const factory = (window.auth0 && window.auth0.createAuth0Client) ? window.auth0.createAuth0Client : window.createAuth0Client;
      if (!factory) return;
      const client = await factory(cfg);
      const isAuth = await client.isAuthenticated();
      if (!isAuth) return;

      const claims = await client.getIdTokenClaims();
      const user = await client.getUser();

      // Rimuovi Login; se partner mostra Dashboard solo in modalità pubblica
      const login = nav.querySelector('a[data-id="login"]'); if (login) login.remove();
      const userType = claims && (claims['https://bebclean.it/user_type'] || claims['user_type']);
      const pid = claims && (claims['https://bebclean.it/partner_id'] || claims['partner_id']);
      if (!profileMode && (userType==='partner' || !!pid)){
        const become = nav.querySelector('a[data-id="become"]'); if (become) become.remove();
        if (!nav.querySelector('a[data-id="dash"]')) nav.appendChild(makeLink('/partner-dashboard.html','Dashboard','dash'));
      }
      if (!nav.querySelector('a[data-id="logout"]')){
        const out = makeLink('#','Esci','logout');
        out.addEventListener('click', (e)=>{ e.preventDefault(); window.authLogout ? window.authLogout() : client.logout({logoutParams:{returnTo:location.origin}}); });
        nav.appendChild(out);
      }

      // Chip utente a destra
      const container = nav.parentElement;
      if (!container) return;
      if (!container.querySelector('.spacer')){
        const sp = document.createElement('div'); sp.className='spacer';
        container.insertBefore(sp, nav.nextSibling);
      }
      const customNick = claims && (claims['https://bebclean.it/nickname'] || claims['nickname_custom']);
      const rawName = customNick || (user && (user.given_name || firstWord(user.name) || user.nickname || (user.email && user.email.split('@')[0])));
      const displayName = rawName || 'Utente';

      let chip = container.querySelector('.userchip');
      if (!chip){
        chip = document.createElement('div');
        chip.className = 'userchip';
        const img = document.createElement('img');
        const hi = document.createElement('span'); hi.className='greet'; hi.textContent='Ciao,';
        const nm = document.createElement('span'); nm.className='name';
        chip.appendChild(img); chip.appendChild(hi); chip.appendChild(nm);
        container.appendChild(chip);
      }
      const imgEl = chip.querySelector('img');
      const pic = user && user.picture;
      if (pic){ imgEl.src = pic; imgEl.alt = displayName; }
      else {
        const letter = String(displayName||'U').trim().charAt(0).toUpperCase();
        const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' rx='32' ry='32' fill='rgba(255,255,255,0.25)'/><text x='50%' y='54%' text-anchor='middle' font-family='system-ui,-apple-system,Segoe UI,Roboto,Arial' font-size='34' fill='#fff'>${letter}</text></svg>`);
        imgEl.src = `data:image/svg+xml;charset=utf-8,${svg}`; imgEl.alt = letter;
      }
      chip.querySelector('.name').textContent = displayName;
    }catch(_){}
  }

  function render(){
    if (document.querySelector('.bb-topbanner') || document.body.hasAttribute('data-no-top-banner')) return;
    useStyles();

    // PROFILO MODE?
    const profileMode = (document.body.dataset.profile === 'client');

    // Strip "Benvenuto..." solo in profilo
    if (profileMode){
      const strip = document.createElement('div');
      strip.className = 'bb-prof-strip';
      const cin = document.createElement('div'); cin.className='container';
      cin.textContent = 'Benvenuto nel tuo Profilo Personale';
      strip.appendChild(cin);
      // Inserisci prima del banner
      const hostBefore = document.querySelector('header');
      if (hostBefore) hostBefore.insertAdjacentElement('afterend', strip);
      else document.body.insertAdjacentElement('afterbegin', strip);
    }

    // Banner
    const hostAfter = document.querySelector('header');
    const wrap = document.createElement('div'); wrap.className = 'bb-topbanner';
    if (profileMode){
      wrap.style.background = '#0a8f8f'; // colore profilo
    }
    const inner = document.createElement('div'); inner.className = 'container';

    // Logo
    const brand = document.createElement('a'); brand.href='/index.html'; brand.className='brand';
    const img = document.createElement('img'); img.src='/assets/img/bbclean-logo-primary.png'; img.alt='B&B Clean';
    brand.appendChild(img); inner.appendChild(brand);

    // NAV
    const nav = document.createElement('nav'); nav.setAttribute('aria-label','Navigazione');
    if (!profileMode){
      [
        { href:'/index.html', label:'Home', id:'home' },
        { href:'/stima.html', label:'Stima', id:'stima' },
        { href:'/prenota.html', label:'Prenota', id:'prenota' },
        { href:'/servizi.html', label:'Servizi', id:'servizi' },
        { href:'/partner.html', label:'Diventa partner', id:'become' },
        { href:'/partner-login.html', label:'Login', id:'login' }
      ].forEach(l => nav.appendChild(makeLink(l.href, l.label, l.id)));
    } else {
      [
        { href:'/profilo.html', label:'Profilo', id:'p-profile' },
        { href:'/profilo-documenti.html', label:'Documenti', id:'p-docs' },
        { href:'/profilo-immobili.html', label:'Immobili', id:'p-props' },
        { href:'/profilo-prenotazioni.html', label:'Prenotazioni', id:'p-book' },
        { href:'/profilo-pagamenti.html', label:'Pagamenti', id:'p-pay' },
        { href:'/profilo-fatturazione.html', label:'Fatturazione', id:'p-bill' },
        { href:'/profilo-sicurezza.html', label:'Sicurezza', id:'p-sec' },
        { href:'/profilo-notifiche.html', label:'Notifiche', id:'p-notif' }
      ].forEach(l => nav.appendChild(makeLink(l.href, l.label, l.id)));
    }
    inner.appendChild(nav);
    inner.appendChild(document.createElement('div')).className='spacer';
    wrap.appendChild(inner);

    if (hostAfter) hostAfter.insertAdjacentElement('afterend', wrap);
    else document.body.insertAdjacentElement('afterbegin', wrap);

    enrichWithAuth(nav, profileMode);
  }

  document.addEventListener('DOMContentLoaded', render);
})();
