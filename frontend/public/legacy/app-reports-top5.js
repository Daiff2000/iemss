(() => {
  const token=sessionStorage.getItem('iems_token');
  const $=id=>document.getElementById(id);
  if(!token||!$('reports-top5-container')) return;
  const api=async path=>{const r=await fetch(path,{headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}});if(r.status===401){sessionStorage.clear();location.href='/index.html';throw Error('انتهت الجلسة')}const d=await r.json();if(!r.ok)throw Error(d.error||'حدث خطأ');return d};
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const num=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const trophy=`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"></path><path d="M7 6H4a3 3 0 0 0 3 3"></path><path d="M17 6h3a3 3 0 0 1-3 3"></path></svg>`;
  const render=d=>{
    const groups=d.top5ByStage||{};
    const entries=Object.entries(groups).filter(([,rows])=>rows&&rows.length);
    if($('top5-range')) $('top5-range').textContent=`${d.range?.from||'—'} → ${d.range?.to||'—'}`;
    if(!entries.length){$('reports-top5-container').innerHTML='<div class="empty-state">لا توجد بيانات أداء في الفترة المختارة.</div>';return}
    $('reports-top5-container').innerHTML=entries.map(([stageName,rows])=>`<article class="stage-card kpi-style-card">
      <div class="stage-card-head"><div><span class="kpi-style-icon svg-icon">${trophy}</span><div class="stage-card-title"><span class="stage-name">${esc(stageName)}</span><small>Top 5 performers</small></div></div><span class="count-badge">TOP 5</span></div>
      <div class="ranking-list">${rows.slice(0,5).map((r,i)=>`<div class="rank-row"><div class="rank-badge rank-${r.rank||i+1}">${r.rank||i+1}</div><div class="rank-person"><b>${esc(r.name)}</b><span>ID #${esc(r.id)} · ${esc(r.shift||'—')}</span></div><strong>${num(r.achieved)}</strong></div>`).join('')}</div>
      <div class="kpi-spark top5-spark"><span></span><span></span><span></span><span></span><span></span></div>
    </article>`).join('');
  };
  const load=async()=>{try{
    const from=$('rep-from').value,to=$('rep-to').value;
    const stages=[...$('rep-stage').selectedOptions].map(o=>o.value).filter(v=>v&&v!=='__ALL__');
    if(!from||!to)return;
    const p=new URLSearchParams({from,to});
    stages.forEach(v=>p.append('stage',v));
    const d=await api('/api/employee/dashboard?'+p);
    render(d);
  }catch(e){$('reports-top5-container').innerHTML=`<div class="empty-state">${esc(e.message)}</div>`}};
  $('rep-run-btn')?.addEventListener('click',()=>setTimeout(load,150));
  setTimeout(load,300);
})();
