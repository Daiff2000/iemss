const token=sessionStorage.getItem('iems_token');const raw=sessionStorage.getItem('iems_user');let user=null;try{user=JSON.parse(raw||'null')}catch(_){}
// Guard: system-creator only, same pattern as app-themes.js / app-audit-logs.js.
if(!token||!user||user.role!=='system_creator'){location.href=token?'/home.html':'/index.html';return}
const $=id=>document.getElementById(id);
$('chip-name').textContent=user.name;
$('chip-role').textContent=`ID: ${user.id} · منشئ النظام`;
$('chip-avatar').textContent=(user.name||'?').trim()[0]||'?';
$('logout-btn').onclick=()=>{sessionStorage.clear();location.href='/index.html'};

async function api(path,opts={}){const r=await fetch(path,{...opts,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(opts.headers||{})}});if(r.status===401){sessionStorage.clear();location.href='/index.html';throw Error('انتهت الجلسة')}const d=await r.json();if(!r.ok)throw Error(d.error||'حدث خطأ');return d}

const ROLES=[{key:'admin',label:'مدير النظام'},{key:'supervisor',label:'المشرف'}];
let current=null; // {admin:{...}, supervisor:{...}}
let catalog=[];
let dirty=false;

function markDirty(){dirty=true;$('permissions-save').disabled=false;$('permissions-status').textContent='توجد تغييرات غير محفوظة.'}

function render(){
  const tbody=$('permissions-tbody');
  tbody.innerHTML=catalog.map(item=>{
    const cells=ROLES.map(r=>{
      const checked=!!current[r.key]?.[item.key];
      return `<td style="text-align:center"><label class="perm-switch"><input type="checkbox" data-role="${r.key}" data-key="${item.key}" ${checked?'checked':''}><span class="perm-slider"></span></label></td>`;
    }).join('');
    return `<tr><td>${item.label}</td>${cells}</tr>`;
  }).join('');
  tbody.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
    cb.addEventListener('change',()=>{
      const role=cb.getAttribute('data-role'), key=cb.getAttribute('data-key');
      current[role][key]=cb.checked;
      markDirty();
    });
  });
}

async function load(){
  try{
    const data=await api('/api/admin/permissions');
    catalog=data.catalog||[];
    current=data.permissions||{admin:{},supervisor:{}};
    $('permissions-loading').style.display='none';
    $('permissions-table-wrap').style.display='block';
    render();
  }catch(e){
    $('permissions-loading').textContent=e.message;
  }
}

$('permissions-save').onclick=async()=>{
  if(!dirty)return;
  $('permissions-save').disabled=true;
  try{
    const data=await api('/api/admin/permissions',{method:'PUT',body:JSON.stringify({permissions:current})});
    current=data.permissions||current;
    dirty=false;
    $('permissions-status').textContent='تم حفظ الصلاحيات بنجاح.';
  }catch(e){
    $('permissions-status').textContent=e.message;
    $('permissions-save').disabled=false;
  }
};

load();
