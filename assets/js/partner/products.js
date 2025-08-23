(async function(){
  const listEl = document.getElementById('prod-list');
  const st = await PartnerState.fetch();
  let products = (st.products || []).slice();

  function render(){
    listEl.innerHTML = '';
    products.forEach((p, idx)=>{
      const li = document.createElement('li');
      li.innerHTML = `<strong>${p.name}</strong> — ${p.brand||'—'} ${p.eco?'🌿':''}
        <span style="float:right">
          <button data-i="${idx}" data-act="edit">Modifica</button>
          <button data-i="${idx}" data-act="del">Elimina</button>
        </span>`;
      listEl.appendChild(li);
    });
  }
  render();

  document.getElementById('add-prod').addEventListener('click', async ()=>{
    const name = document.getElementById('prod-name').value.trim();
    if (!name) return alert('Inserisci il nome.');
    const brand = document.getElementById('prod-brand').value.trim();
    const eco = document.getElementById('prod-eco').checked;
    products.push({name, brand, eco});
    await PartnerState.saveProducts(products); render();
    document.getElementById('prod-name').value=''; document.getElementById('prod-brand').value=''; document.getElementById('prod-eco').checked=false;
  });

  listEl.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const i = Number(btn.dataset.i), act = btn.dataset.act;
    if (act==='del'){ products.splice(i,1); await PartnerState.saveProducts(products); render(); }
    if (act==='edit'){
      const p = products[i];
      const nn = prompt('Nome prodotto', p.name); if(!nn) return;
      const nb = prompt('Marca', p.brand||''); 
      const ne = confirm('Eco? OK = sì, Annulla = no');
      products[i] = {name:nn, brand:nb, eco:ne};
      await PartnerState.saveProducts(products); render();
    }
  });
})();
