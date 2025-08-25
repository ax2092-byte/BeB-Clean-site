// B&B Clean — Top Banner NAV (uniforme) + logo più grande + chip utente (Auth0)
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
        background: var(--bb-teal, #0fb6b1); color: #fff;
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

      /* Spinge il chip utente a destra */
      .bb-topbanner .spacer{ flex:1 1 auto; }

      /* Chip utente (nome + avatar) */
      .bb-topbanner .userchip{
        display:inline-flex; align-items:center; gap:8px;
        padding:6px 10px; border-radius:999px;
        background: rgba(255,255,255,.14);
        border:1px solid rgba(255,255,255,.22);
        color:#fff; font-weight:700; text-decoration:none;
        max-width: 260px;
      }
      .bb-topbanner .userchip:hover{ background: rgba(255,255,255,.22); }
      .bb-topbanner .userchip:focus{ outline:2px solid #fff; outline-offset:2px; }
      .bb-topbanner .userchip img{
        width:28px; height:28px; border-radius:50%; object-fit:cover; display:block;
        background: rgba(255,255,255,.3);
      }
      .bb-topbanner .userchip .greet{ opacity:.9; }
      .bb-topbanner .userchip .name{
        max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      @media (max-width:640px){
        :root{ --bb-banner-logo-h: 26px; } /* logo più grande su mobile */
        .bb-topbanner .container{ gap:6px; padding:6px 0; }
        .bb-topbanner a.btn-link{ padding:7px 10px; }
        .bb-topbanner .userchip .greet{ display:none; } /* risparmia spazio */
        .bb-topbanner .userchip .name{ max-width:110px; }
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

  function firstWord(s){
    if (!s) return '';
    const t = String(s).trim();
    const sp = t.split(/\s+/);
    return sp[0] || t;
  }

  async function enrichWithAuth(nav){
    try{
      const cfg = window.AUTH0_CONFIG || {};
      const factory = (window.auth0 && window.auth0.createAuth0Client) ? window.auth0.createAuth0Client : window.createAuth0Client;
      if (!factory) return;
      const client = await factory(cfg);
      const isAuth = await client.isAuthenticated();
      if (!isAuth) return;

      const claims = await client.getIdTokenClaims();
      const user = await client.getUser();

      // Sostituisce link in base allo stato
      const userType = claims && (claims['https://bebclean.it/user_type'] || claims['user_type']);
      const pid = claims && (claims['https://bebclean.it/partner_id'] || claims['partner_id']);

      const login = nav.querySelector('a[data-id="login"]'); if (login) login.remove();
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

      // Costruisce il chip utente a destra
      const container = nav.parentElement; // .bb-topbanner .container
      if (!container) return;

      // Inserisci spacer se manca
      if (!container.querySelector('.spacer')){
        const sp = document.createElement('div'); sp.className = 'spacer';
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
        const info = document.createElement('span'); info.className = 'name';
        const hi = document.createElement('span'); hi.className = 'greet'; hi.textContent = 'Ciao,';
        chip.appendChild(img);
        chip.appendChild(hi);
        chip.appendChild(info);
        container.appendChild(chip);
      }
      // Avatar o iniziali
      const imgEl = chip.querySelector('img');
      const pic = user && user.picture;
      if (pic){
        imgEl.src = pic;
        imgEl.alt = displayName;
      }else{
        // fallback grafico minimo (cerchio con lettera) usando data URL SVG
        const letter = String(displayName || 'U').trim().charAt(0).toUpperCase();
        const svg = encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
            <rect width='100%' height='100%' rx='32' ry='32' fill='rgba(255,255,255,0.25)'/>
            <text x='50%' y='54%' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto, Arial' font-size='34' fill='#fff'>${letter}</text>
          </svg>`
        );
        imgEl.src = `data:image/svg+xml;charset=utf-8,${svg}`;
        imgEl.alt = letter;
      }
      chip.querySelector('.name').textContent = displayName;
    }catch(_){}
  }

  function render(){
    if (document.querySelector('.bb-topbanner') || document.body.hasAttribute('data-no-top-banner')) return;
    useStyles();

    const hostAfter = document.querySelector('header');
    const wrap = document.createElement('div'); wrap.className = 'bb-topbanner';
    const inner = document.createElement('div'); inner.className = 'container';

    // Logo
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

    // Spacer per spingere il chip utente a destra
    const spacer = document.createElement('div'); spacer.className='spacer';
    inner.appendChild(spacer);

    wrap.appendChild(inner);

    if (hostAfter) hostAfter.insertAdjacentElement('afterend', wrap);
    else document.body.insertAdjacentElement('afterbegin', wrap);

    enrichWithAuth(nav);
  }

  document.addEventListener('DOMContentLoaded', render);
})();
