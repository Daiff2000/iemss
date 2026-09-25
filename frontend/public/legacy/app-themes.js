const token=sessionStorage.getItem('iems_token');const raw=sessionStorage.getItem('iems_user');let user=null;try{user=JSON.parse(raw||'null')}catch(_){}
// Guard: a redirect is asynchronous, so the rest of this file used to keep
// running with user === null and throw a TypeError, leaving a half-built
// broken page on screen instead of navigating away. useLegacyScripts wraps
// every legacy script in a function, so `return` here is valid and safe.
if(!token||!user||user.role!=='system_creator'){location.href=token?'/home.html':'/index.html';return}
const $=id=>document.getElementById(id);let pendingData=null;
$('chip-name').textContent=user.name;
$('chip-role').textContent=`ID: ${user.id} · منشئ النظام`;
$('chip-avatar').textContent=(user.name||'?').trim()[0]||'?';
$('logout-btn').onclick=()=>{sessionStorage.clear();location.href='/index.html'};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function api(path,opts={}){const r=await fetch(path,{...opts,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(opts.headers||{})}});if(r.status===401){sessionStorage.clear();location.href='/index.html';throw Error('انتهت الجلسة')}const d=await r.json();if(!r.ok)throw Error(d.error||'حدث خطأ');return d}
function show(data){pendingData=null;if(data?.banner){$('banner-preview').src=data.banner;$('banner-preview').style.display='block';$('banner-empty').style.display='none'}else{$('banner-preview').style.display='none';$('banner-empty').style.display='block'}}
async function load(){try{show(await api('/api/admin/banner'))}catch(e){$('banner-status').textContent=e.message}}
$('banner-file').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5*1024*1024){$('banner-status').textContent='الصورة أكبر من 5MB.';e.target.value='';return}if(!/^image\/(png|jpeg|webp)$/.test(f.type))return;const r=new FileReader();r.onload=()=>{pendingData=r.result;$('banner-preview').src=pendingData;$('banner-preview').style.display='block';$('banner-empty').style.display='none';$('banner-save').disabled=false;$('banner-status').textContent='الصورة جاهزة للحفظ.'};r.readAsDataURL(f)});
$('banner-save').onclick=async()=>{if(!pendingData)return;$('banner-save').disabled=true;try{const f=$('banner-file').files?.[0];await api('/api/admin/banner',{method:'PUT',body:JSON.stringify({data:pendingData,filename:f?.name||'banner'})});$('banner-status').textContent='تم حفظ البانر بنجاح.';pendingData=null}catch(e){$('banner-status').textContent=e.message;$('banner-save').disabled=false}};
$('banner-delete').onclick=async()=>{if(!confirm('هل تريد حذف صورة البانر؟'))return;try{await api('/api/admin/banner',{method:'DELETE'});$('banner-file').value='';$('banner-save').disabled=true;show(null);$('banner-status').textContent='تم حذف البانر.'}catch(e){$('banner-status').textContent=e.message}};
load();
