const list = document.getElementById('list');
const q = document.getElementById('q');
const searchBtn = document.getElementById('searchBtn');
const sourceSel = document.getElementById('source');
const scopeSel = document.getElementById('scope');
const yearSel  = document.getElementById('yearFilter');
const clockEl = document.getElementById('clock');
const lamp = document.getElementById('alertLamp');
const refreshBtn = document.getElementById('refreshBtn');
const themeBtn = document.getElementById('themeBtn');
const langBtn = document.getElementById('langBtn');
let ALL = [];

function clickSound(){ const c = new (window.AudioContext||window.webkitAudioContext)(); const o=c.createOscillator(),g=c.createGain(); o.frequency.value=440; g.gain.value=.07; o.connect(g); g.connect(c.destination); o.start(); setTimeout(()=>o.stop(),120); }

function isDanger(r){
  const title=(r.title||'').toLowerCase();
  const reason=(r.reason||'').toLowerCase();
  const risky=['uae','united arab emirates','india','pakistan','turkey','thailand','gcc','gulf','ksa','saudi','bahrain','kuwait','oman','qatar','doha'];
  const mentions = risky.some(k=>title.includes(k)||reason.includes(k));
  return r.scope==='international' || r.source==='SFDA' || r.source==='RASFF' || mentions;
}
function nowClock(){ clockEl.textContent = 'Updated: ' + new Date().toLocaleString('en-US'); }
function whatsappLink(r){
  const status = isDanger(r) ? '🔴 Danger – Potential presence in Qatar' : '✅ Safe not present in Qatar';
  const timeStr = new Date().toLocaleString('en-US');
  const text = [
    '📢 Vip – Recall System',
    '----------------------',
    (isDanger(r)?'⚠️ CRITICAL ALERT ⚠️':''),
    `Product: ${r.title}`,
    `Source: ${r.source}`,
    `Scope: ${r.scope}`,
    `Date: ${r.date} (${timeStr})`,
    `Reason: ${r.reason||'-'}`,
    `Official: ${r.url}`,
    `Status: ${status}`
  ].join('\n');
  return 'https://wa.me/?text=' + encodeURIComponent(text);
}
function render(data){
  list.innerHTML=''; document.getElementById('count').textContent=data.length;
  data.forEach(r=>{
    const el=document.createElement('div'); el.className='card';
    const status = isDanger(r) ? '<span class="status danger">🔴 Danger – Potential presence in Qatar</span>' : '<span class="status safe">✅ Safe not present in Qatar</span>';
    el.innerHTML = `
      <div class="title">${r.title}</div>
      <div class="row"><span class="badge">${r.source}</span><span class="badge">${r.scope}</span><span>${r.date||''}</span></div>
      ${r.reason?`<div class="row">${r.reason}</div>`:''}
      ${status}
      <div class="actions">
        <a class="btn" target="_blank" href="${r.url}">Source</a>
        <a class="btn primary" target="_blank" href="${whatsappLink(r)}">📤 WhatsApp</a>
      </div>`;
    list.appendChild(el);
  });
  checkCritical(data);
}
let alarm=null; function playAlarm(){ stopAlarm(); const c=new (window.AudioContext||window.webkitAudioContext)(); alarm=setInterval(()=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=880;g.gain.value=.16;o.connect(g);g.connect(c.destination);o.start();setTimeout(()=>o.stop(),220)},2000);}
function stopAlarm(){ if(alarm){clearInterval(alarm); alarm=null;} }
function checkCritical(data){ const any=data.some(isDanger); if(any){lamp.classList.add('active'); playAlarm();} else {lamp.classList.remove('active'); stopAlarm();} }
lamp.onclick=()=>{clickSound(); lamp.classList.remove('active'); stopAlarm(); alert('Critical alerts present. Use filters/search to review.');};

function populateFilters(){
  const sources=[...new Set(ALL.map(x=>x.source))].sort();
  sourceSel.innerHTML='<option value=\"\">All sources</option>'+sources.map(s=>`<option>${s}</option>`).join('');
  const years=[...new Set(ALL.map(x=>(x.date||'').slice(0,4)).filter(Boolean))].sort();
  yearSel.innerHTML='<option value=\"\">All years</option>'+years.map(y=>`<option>${y}</option>`).join('');
}
function applyFilters(){
  let data=ALL.slice(); const term=q.value.trim().toLowerCase();
  if(term){ data = data.filter(r=>[r.title,r.reason].join(' ').toLowerCase().includes(term)); }
  if(sourceSel.value){ data=data.filter(r=>r.source===sourceSel.value); }
  if(scopeSel.value){ data=data.filter(r=>r.scope===scopeSel.value); }
  if(yearSel.value){ data=data.filter(r=>(r.date||'').startsWith(yearSel.value)); }
  render(data);
}
searchBtn.onclick=()=>{clickSound(); applyFilters();};
[sourceSel,scopeSel,yearSel].forEach(el=>el.addEventListener('change',()=>{clickSound(); applyFilters();}));

themeBtn.onclick=()=>{clickSound(); const isLight=document.documentElement.classList.toggle('light'); themeBtn.textContent=isLight?'Dark':'Light';};
langBtn.onclick=()=>{clickSound(); const ar=document.documentElement.dir!=='rtl'; document.documentElement.dir=ar?'rtl':'ltr'; document.documentElement.lang=ar?'ar':'en'; langBtn.textContent=ar?'EN':'AR'; q.placeholder=ar?'ابحث…':'Search product/company…'; searchBtn.textContent=ar?'بحث':'Search'; refreshBtn.textContent=ar?'تحديث':'Refresh';};

async function loadAll(){
  nowClock();
  list.innerHTML='<div class="card">Loading live data…</div>';
  try{
    const r = await fetch('/api/recalls'); const j = await r.json();
    ALL = j.items || []; populateFilters(); applyFilters();
  }catch(e){ list.innerHTML='<div class="card">Failed to load data.</div>'; console.error(e); }
}
refreshBtn.onclick=()=>{clickSound(); loadAll();};
loadAll(); setInterval(loadAll, 10*60*1000);