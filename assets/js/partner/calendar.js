// Calendario Partner — blocco date personali
(function(){
  const $ = s => document.querySelector(s);
  const pad = n => String(n).padStart(2,'0');
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  let current = new Date();
  let blocked = new Set();

  function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

  function render(){
    const grid = $('#cal-grid'); grid.innerHTML='';
    const head = $('#cal-head');
    const locale = 'it-IT';
    head.textContent = current.toLocaleDateString(locale, { month:'long', year:'numeric' });

    const first = startOfMonth(current);
    const last = endOfMonth(current);
    const startWeekday = (first.getDay() + 6) % 7; // lun=0
    const daysInMonth = last.getDate();

    // intestazioni giorni
    const names = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
    const thead = $('#cal-weekdays'); thead.innerHTML='';
    names.forEach(n=>{ const div=document.createElement('div'); div.className='cal-wd'; div.textContent=n; thead.appendChild(div); });

    // celle vuote iniziali
    for (let i=0;i<startWeekday;i++){ const cell=document.createElement('button'); cell.className='cal-cell empty'; cell.disabled=true; grid.appendChild(cell); }

    // giorni
    for (let d=1; d<=daysInMonth; d++){
      const day = new Date(current.getFullYear(), current.getMonth(), d);
      const iso = toISO(day);
      const cell = document.createElement('button');
      cell.className = 'cal-cell';
      cell.setAttribute('data-date', iso);
      cell.textContent = String(d);
      if (blocked.has(iso)) cell.classList.add('blocked');
      cell.addEventListener('click', ()=>{
        if (blocked.has(iso)) blocked.delete(iso); else blocked.add(iso);
        cell.classList.toggle('blocked');
      });
      grid.appendChild(cell);
    }
  }

  async function load(){
    const st = await PartnerState.getCalendar(); // { blocked:[] }
    blocked = new Set(st.blocked || []);
    render();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // stili
    const style = document.createElement('style'); style.textContent = `
      .cal-wrap{ border:1px solid #e6e6e6; border-radius:12px; padding:12px; }
      .cal-toolbar{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
      .cal-toolbar button{ padding:6px 10px; border-radius:8px; border:1px solid #ddd; background:#fff; cursor:pointer; }
      .cal-weekdays{ display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; margin-bottom:6px; }
      .cal-wd{ text-align:center; font-weight:600; color:#555; }
      .cal-grid{ display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; }
      .cal-cell{ aspect-ratio: 1/1; border:1px solid #e6e6e6; border-radius:10px; background:#fff; cursor:pointer; }
      .cal-cell.blocked{ background:#ffeaea; border-color:#ffb3b3; position:relative; }
      .cal-cell.blocked::after{ content:'✖'; position:absolute; top:4px; right:6px; font-size:12px; color:#c00; }
      .cal-cell.empty{ background:transparent; border-color:transparent; }
    `; document.head.appendChild(style);

    $('#prev-month').addEventListener('click', ()=>{ current = new Date(current.getFullYear(), current.getMonth()-1, 1); render(); });
    $('#next-month').addEventListener('click', ()=>{ current = new Date(current.getFullYear(), current.getMonth()+1, 1); render(); });
    $('#save-cal').addEventListener('click', async ()=>{
      await PartnerState.saveCalendar(Array.from(blocked));
      alert('Calendario salvato.');
    });

    load();
  });
})();
