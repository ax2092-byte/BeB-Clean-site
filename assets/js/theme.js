// B&B Clean — Theme (font & dimensioni globali) con persistenza locale
// Includi questo file nel <head> di TUTTE le pagine (prima dei CSS, se possibile).

(function(){
  const KEY = 'bb-theme';
  const DEFAULTS = {
    base: 'system-ui',
    heading: 'system-ui',
    baseSize: 16,      // px
    lineHeight: 1.55,
    h1: 2.0,           // moltiplicatore su baseSize
    h2: 1.5,
    h3: 1.25
  };

  const FONT_MAP = {
    'system-ui': { stack: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'", href:null },
    'Inter':     { stack: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" },
    'Roboto':    { stack: "'Roboto', system-ui, -apple-system, Segoe UI, Helvetica, Arial", href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" },
    'Open Sans': { stack: "'Open Sans', system-ui, -apple-system, Segoe UI, Helvetica, Arial", href: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" },
    'Lora':      { stack: "'Lora', Georgia, 'Times New Roman', serif", href: "https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap" },
    'Merriweather': { stack: "'Merriweather', Georgia, 'Times New Roman', serif", href: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap" }
  };

  function read(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(_){ return {}; }
  }
  function save(v){
    try{ localStorage.setItem(KEY, JSON.stringify(v)); }catch(_){}
  }

  function ensureFontLink(name){
    const info = FONT_MAP[name]; if (!info || !info.href) return;
    if (document.getElementById('bb-theme-fonts-'+name)) return;
    // preconnect
    if (!document.querySelector('link[href^="https://fonts.gstatic.com"]')){
      const pc = document.createElement('link');
      pc.rel = 'preconnect'; pc.href = 'https://fonts.gstatic.com'; pc.crossOrigin = 'anonymous';
      document.head.appendChild(pc);
    }
    const l = document.createElement('link');
    l.id = 'bb-theme-fonts-'+name;
    l.rel = 'stylesheet'; l.href = info.href;
    document.head.appendChild(l);
  }

  function styleEl(){
    let s = document.getElementById('bb-theme-style');
    if (!s){
      s = document.createElement('style'); s.id='bb-theme-style'; document.head.appendChild(s);
    }
    return s;
  }

  function apply(config){
    const cfg = Object.assign({}, DEFAULTS, config||{});
    // Font loading
    ensureFontLink(cfg.base);
    ensureFontLink(cfg.heading);

    const baseStack = (FONT_MAP[cfg.base]||FONT_MAP['system-ui']).stack;
    const headStack = (FONT_MAP[cfg.heading]||FONT_MAP['system-ui']).stack;

    styleEl().textContent = `
      :root{
        --font-base:${baseStack};
        --font-heading:${headStack};
        --font-size-base:${cfg.baseSize}px;
        --line-height:${cfg.lineHeight};
        --h1-scale:${cfg.h1};
        --h2-scale:${cfg.h2};
        --h3-scale:${cfg.h3};
      }
      html, body{ font-family: var(--font-base); font-size: var(--font-size-base); line-height: var(--line-height); }
      h1, h2, h3{ font-family: var(--font-heading); line-height: 1.2; }
      h1{ font-size: calc(var(--font-size-base) * var(--h1-scale)); }
      h2{ font-size: calc(var(--font-size-base) * var(--h2-scale)); }
      h3{ font-size: calc(var(--font-size-base) * var(--h3-scale)); }
      .btn{ font-family: var(--font-heading); }
    `;
  }

  // API pubblica
  window.Theme = {
    get(){ return Object.assign({}, DEFAULTS, read()); },
    set(newCfg){ const merged = Object.assign({}, DEFAULTS, read(), newCfg||{}); save(merged); apply(merged); },
    reset(){ save({}); apply(DEFAULTS); }
  };

  // Avvio
  apply(read());
})();
