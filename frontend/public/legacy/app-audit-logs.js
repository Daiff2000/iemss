const token=sessionStorage.getItem('iems_token');const raw=sessionStorage.getItem('iems_user');let user=null;try{user=JSON.parse(raw||'null')}catch(_){}
// Guard: a redirect is asynchronous, so the rest of this file used to keep
// running with user === null and throw a TypeError, leaving a half-built
// broken page on screen instead of navigating away. useLegacyScripts wraps
// every legacy script in a function, so `return` here is valid and safe.
if(!token||!user||user.role!=='system_creator'){location.href=token?'/home.html':'/index.html';return}
const $=id=>document.getElementById(id);
$('chip-name').textContent=user.name;
$('chip-role').textContent=`ID: ${user.id} · منشئ النظام`;
$('chip-avatar').textContent=(user.name||'?').trim()[0]||'?';
$('logout-btn').onclick=()=>{sessionStorage.clear();location.href='/index.html'};
async function api(path){const r=await fetch(path,{headers:{Authorization:'Bearer '+token}});if(r.status===401){sessionStorage.clear();location.href='/index.html';throw Error('انتهت الجلسة')}const d=await r.json();if(!r.ok)throw Error(d.error||'حدث خطأ');return d}
const labels={import_master:'تحديث Master',change_role:'تغيير صلاحية',change_password:'تغيير كلمة المرور',reset_default_password:'إعادة كلمة المرور',delete_employee:'حذف موظف',update_banner:'تغيير البانر',remove_banner:'حذف البانر'};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function render(logs){$('audit-count').textContent=`${logs.length} عملية`;$('audit-body').innerHTML=logs.length?logs.map(x=>{let details='—';try{details=JSON.stringify(x.details||{}).replace(/[{}"]/g,'').replace(/,/g,' · ')}catch(_){}return `<tr><td>${esc(new Date(x.created_at).toLocaleString('ar-EG'))}</td><td>${esc(x.actor_name||'—')}<br><small>ID ${esc(x.actor_id||'—')}</small></td><td><b>${esc(labels[x.action]||x.action)}</b></td><td>${esc(x.entity_type||'—')} ${x.entity_id?'#'+esc(x.entity_id):''}</td><td>${esc(details)}</td><td>${esc(x.ip||'—')}</td></tr>`}).join(''):'<tr><td colspan="6" class="empty-state">لا توجد عمليات مسجلة.</td></tr>'}
async function load(){try{render((await api('/api/admin/audit-logs?limit=300')).logs||[])}catch(e){$('audit-body').innerHTML=`<tr><td colspan="6" class="empty-state">${esc(e.message)}</td></tr>`}}
$('audit-refresh').onclick=load;load();
