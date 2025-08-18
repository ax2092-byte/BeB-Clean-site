// B&B Clean — auth0-config.js (deprecato)
// Questo file esiste solo per compatibilità: non definisce/configura nulla.
// Se una pagina lo include ancora, mostriamo un warning in console per aiutare a ripulire i riferimenti.

(function(){
  if (window && !window.__BBCLEAN_AUTH0_CONFIG_STUB_WARNED__) {
    window.__BBCLEAN_AUTH0_CONFIG_STUB_WARNED__ = true;
    try { console.warn('[B&B Clean] auth0-config.js è deprecato e non viene più usato. Rimuovi il riferimento da questa pagina.'); } catch(_){}
  }
  // NON impostiamo window.AUTH0_CONFIG qui, per evitare sovrascritture indesiderate.
})();
