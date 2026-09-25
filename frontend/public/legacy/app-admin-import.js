const token = sessionStorage.getItem('iems_token');
const userRaw = sessionStorage.getItem('iems_user');
// Guard: a redirect is asynchronous, so the rest of this file used to keep
// running with user === null and throw a TypeError, leaving a half-built
// broken page on screen instead of navigating away. useLegacyScripts wraps
// every legacy script in a function, so `return` here is valid and safe.
if (!token || !userRaw) { window.location.href = '/index.html'; return; }
let user = null;
try { user = JSON.parse(userRaw); } catch (_) {}
if (!user || !user.role) { sessionStorage.clear(); window.location.href = '/index.html'; return; }
if (!['system_creator','admin','supervisor'].includes(user.role)) { window.location.href = '/home.html'; return; }
const $ = id => document.getElementById(id);
function authHeaders(){return {Authorization:'Bearer '+token,'Content-Type':'application/json'}};
async function api(path,opts={}){const res=await fetch(path,{...opts,headers:{...authHeaders(),...(opts.headers||{})}});if(res.status===401){sessionStorage.clear();location.href='/index.html';throw new Error('انتهت الجلسة')}const data=await res.json();if(!res.ok)throw new Error(data.error||'حدث خطأ');return data}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
$('chip-name').textContent=user.name;$('chip-role').textContent=`ID: ${user.id} · ${user.role==='system_creator'?'منشئ النظام':user.role==='admin'?'مدير النظام':'مشرف'}`;$('chip-avatar').textContent=(user.name||'?').trim()[0]||'?';$('logout-btn').onclick=()=>{sessionStorage.clear();location.href='/index.html'};
const savedTheme=localStorage.getItem('iems-theme')||'light';document.documentElement.dataset.theme=savedTheme;
function themeIcon(){if(!$('theme-toggle'))return;$('theme-toggle').innerHTML=document.documentElement.dataset.theme==='dark'?'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path></svg>';}
$('theme-toggle').onclick=()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;localStorage.setItem('iems-theme',n);themeIcon()};themeIcon();
const file=$('master-file');const selected=$('selected-file');const dropzone=$('import-dropzone');
// NOTE: an "import month" input was removed from this page's markup, but the
// script still referenced an undeclared `importMonthEl`, which threw
// ReferenceError here and aborted the rest of the file — that is why the whole
// import page (dropzone, upload button, history table) was dead. If the field
// is ever re-added, look it up defensively with document.getElementById.
const importMonthEl = $('import-month');
if (importMonthEl && !importMonthEl.value) {
  const d = new Date();
  importMonthEl.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Multiple Master files can be selected/dropped together (e.g. Shift A +
// Shift B + Shift C in one go). We keep our own working list of files
// (rather than relying only on file.files) so drag-and-drop and the native
// picker both funnel into the same array, and so a file can be removed
// from the selection before uploading.
let selectedFiles=[];

function formatSize(bytes){return (bytes/1024/1024).toFixed(2)+' MB'}

function renderSelectedFiles(){
  if(!selectedFiles.length){selected.style.display='none';selected.innerHTML='';return}
  selected.style.display='block';
  selected.innerHTML=selectedFiles.map((f,i)=>`<div class="selected-file-row" data-i="${i}"><span class="selected-file-name">${esc(f.name)}</span><span class="selected-file-size">${formatSize(f.size)}</span><button type="button" class="selected-file-remove" data-i="${i}" title="إزالة الملف" aria-label="إزالة الملف">×</button></div>`).join('');
  selected.querySelectorAll('.selected-file-remove').forEach(btn=>{
    btn.onclick=()=>{const i=Number(btn.dataset.i);selectedFiles.splice(i,1);renderSelectedFiles();$('master-upload-btn').disabled=!selectedFiles.length};
  });
}

function addFiles(fileList){
  if(!fileList||!fileList.length)return;
  const incoming=[...fileList].filter(f=>/\.xlsx$/i.test(f.name));
  const skippedNonXlsx=fileList.length-incoming.length;
  // Avoid adding the exact same file twice (same name + size).
  for(const f of incoming){
    if(!selectedFiles.some(existing=>existing.name===f.name&&existing.size===f.size)){
      selectedFiles.push(f);
    }
  }
  renderSelectedFiles();
  $('master-upload-btn').disabled = selectedFiles.length === 0;
  const status=$('master-upload-status');
  if(skippedNonXlsx>0){status.className='upload-status error';status.textContent=`تم تجاهل ${skippedNonXlsx} ملف/ملفات لأنها ليست بصيغة XLSX.`}
  else if(status.classList.contains('error')){status.className='upload-status';status.textContent=''}
}

file.onchange=()=>{addFiles(file.files);file.value=''};

// Drag & drop: the whole dropzone box accepts dragged-over files, in
// addition to the native click-to-browse behavior from the <label for>.
;['dragenter','dragover'].forEach(evt=>dropzone.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();dropzone.classList.add('drag-over')}));
;['dragleave','drop'].forEach(evt=>dropzone.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();dropzone.classList.remove('drag-over')}));
dropzone.addEventListener('drop',e=>{const dt=e.dataTransfer;if(!dt||!dt.files||!dt.files.length)return;addFiles(dt.files)});
function readAsDataUrl(f){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error(`تعذّر قراءة الملف "${f.name}".`));r.readAsDataURL(f)})}

let xlsxPromise=null;
function ensureXLSX(){
  if(window.XLSX)return Promise.resolve(window.XLSX);
  if(xlsxPromise)return xlsxPromise;
  xlsxPromise=new Promise((resolve,reject)=>{
    const sc=document.createElement('script');
    sc.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    sc.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('تعذر تحميل أداة قراءة Excel.'));
    sc.onerror=()=>reject(new Error('تعذر تحميل أداة معاينة Excel.'));
    document.head.appendChild(sc);
  });
  return xlsxPromise;
}
function cellText(v){
  if(v===null||v===undefined)return '';
  if(v instanceof Date)return v.toLocaleDateString('ar-EG');
  return String(v);
}

async function loadImportHistory(){
  const body=$('import-history-body');
  if(!body)return;
  try{
    const data=await api('/api/admin/import-history');
    const rows=data.history||[];
    body.innerHTML=rows.length?rows.map(h=>`<tr><td>${esc(new Date(h.created_at).toLocaleString('ar-EG'))}</td><td>${esc(h.imported_by_name||('ID '+(h.imported_by??'—')))}</td><td>${esc(h.month_start?String(h.month_start).slice(0,7):'—')}</td><td>${esc(h.filename||'Master.xlsx')}</td><td>${Number(h.updated_count||0).toLocaleString('en-US')}</td><td>${Number(h.created_count||0).toLocaleString('en-US')}</td><td>${Number(h.daily_count||0).toLocaleString('en-US')}</td><td><span class="status-badge status-active">${esc(h.status==='success'?'نجح':'فشل')}</span></td></tr>`).join(''):'<tr><td colspan="8"><div class="empty-state">لا توجد عمليات Import حتى الآن.</div></td></tr>';
  }catch(e){body.innerHTML=`<tr><td colspan="8"><div class="empty-state">تعذر تحميل سجل الاستيراد: ${esc(e.message)}</div></td></tr>`}
}
loadImportHistory();


// ---- Upload progress bar -------------------------------------------------
// fetch() cannot report upload progress, so the import request goes through
// XMLHttpRequest. The server only answers once it has finished processing the
// workbook (no streaming), so the bar is: real bytes-sent progress while
// uploading, then a slow "processing" creep that jumps to 100% on the response.
function apiUpload(path,bodyStr,onUpload){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('POST',path);
    const h=authHeaders();
    Object.keys(h).forEach(k=>xhr.setRequestHeader(k,h[k]));
    xhr.responseType='text';
    if(xhr.upload&&onUpload){
      xhr.upload.onprogress=e=>{if(e.lengthComputable)onUpload(e.loaded/e.total)};
      xhr.upload.onload=()=>onUpload(1);
    }
    xhr.onerror=()=>reject(new Error('تعذّر الاتصال بالخادم.'));
    xhr.ontimeout=()=>reject(new Error('انتهت مهلة الطلب.'));
    xhr.onload=()=>{
      if(xhr.status===401){sessionStorage.clear();location.href='/index.html';reject(new Error('انتهت الجلسة'));return}
      let data={};
      try{data=JSON.parse(xhr.responseText||'{}')}catch(_){}
      if(xhr.status<200||xhr.status>=300){reject(new Error(data.error||'حدث خطأ أثناء الاستيراد.'));return}
      resolve(data);
    };
    xhr.send(bodyStr);
  });
}
function makeProgress(elId,fillId,pctId,labelId){return {
  el:$(elId),fill:$(fillId),pct:$(pctId),label:$(labelId),
  timer:null,hideTimer:null,
  show(){clearTimeout(this.hideTimer);this.el.classList.remove('done','error');this.el.hidden=false;this.set(0,'جارٍ التجهيز...')},
  set(v,text){
    const p=Math.max(0,Math.min(100,Math.round(v*100)));
    this.fill.style.width=p+'%';this.pct.textContent=p+'%';this.el.setAttribute('aria-valuenow',String(p));
    if(text)this.label.textContent=text;
  },
  stopCreep(){clearInterval(this.timer);this.timer=null},
  finish(ok,text){
    this.stopCreep();
    this.el.classList.add(ok?'done':'error');
    if(ok)this.set(1,text);else this.label.textContent=text;
    if(ok)this.hideTimer=setTimeout(()=>{this.el.hidden=true},4000);
  }
};}
const progress=makeProgress('import-progress','import-progress-fill','import-progress-pct','import-progress-label');

$('master-upload-btn').onclick=async()=>{
  const status=$('master-upload-status');
  // The month selector was removed from this page and the /api/admin/import-master
  // call below never sent a month, but this line still referenced a non-existent
  // `importMonth` — a ReferenceError fired the moment you clicked Upload, so the
  // button appeared completely dead.
  if(!selectedFiles.length){status.className='upload-status error';status.textContent='يرجى اختيار ملف Excel واحد على الأقل قبل المتابعة.';return}
  for(const f of selectedFiles){
    if(f.size>8*1024*1024){status.className='upload-status error';status.textContent=`حجم الملف "${f.name}" يتجاوز الحد المسموح به (8 ميغابايت).`;return}
  }

  const btn=$('master-upload-btn');btn.disabled=true;
  progress.show();
  const queue=[...selectedFiles];
  const combined={updatedEmployees:[],createdEmployees:[],daily:0};
  const perFileResults=[];
  let lastFileName='';

  try{
    for(let i=0;i<queue.length;i++){
      const f=queue[i];
      lastFileName=f.name;
      status.className='upload-status';
      status.textContent=`جارٍ تحديث البيانات: ملف ${i+1} من ${queue.length} (${f.name})...`;
      try{
        // Each file owns an equal slice of the bar: read 0-10%, upload 10-60%,
        // server processing 60-95% (creeps), response = 100% of the slice.
        const n=queue.length,sliceStart=i/n,slice=1/n;
        const tag=n>1?` (${i+1}/${n})`:'';
        const setSlice=(frac,text)=>progress.set(sliceStart+frac*slice,text+tag);
        progress.stopCreep();
        setSlice(0.02,'جارٍ قراءة الملف'+(n>1?': '+f.name:''));
        const dataUrl=await readAsDataUrl(f);
        setSlice(0.10,'جارٍ رفع الملف'+(n>1?': '+f.name:''));
        const bodyStr=JSON.stringify({filename:f.name,data:String(dataUrl),merge:queue.length>1});
        let proc=0;
        const data=await apiUpload('/api/admin/import-master',bodyStr,r=>{
          setSlice(0.10+0.50*r,r<1?'جارٍ رفع الملف'+(n>1?': '+f.name:''):'جارٍ معالجة البيانات...');
          if(r>=1&&!progress.timer){
            progress.timer=setInterval(()=>{proc+=(1-proc)*0.06;setSlice(0.60+0.35*proc,'جارٍ معالجة البيانات...')},300);
          }
        });
        progress.stopCreep();
        setSlice(1,'تم الانتهاء من الملف');
        combined.updatedEmployees.push(...(data.updatedEmployees||[]));
        combined.createdEmployees.push(...(data.createdEmployees||[]));
        combined.daily+=data.daily||0;
        perFileResults.push({fileName:f.name,ok:true,message:data.message||'تم بنجاح.'});
      }catch(e){
        perFileResults.push({fileName:f.name,ok:false,message:e.message||'فشل التحديث.'});
      }
    }

    await loadImportHistory();

    const failed=perFileResults.filter(r=>!r.ok);
    const succeeded=perFileResults.filter(r=>r.ok);
    if(!failed.length){
      status.className='upload-status success';
      status.textContent=queue.length>1?`تم تحديث ${queue.length} ملفات بنجاح.`:(perFileResults[0]?.message||'تم تحديث البيانات بنجاح.');
    }else if(succeeded.length){
      status.className='upload-status error';
      status.textContent=`تم تحديث ${succeeded.length} من ${queue.length} ملفات. فشل: ${failed.map(r=>`${r.fileName} (${r.message})`).join('، ')}`;
    }else{
      status.className='upload-status error';
      status.textContent=`تعذّر تحديث أي ملف. ${failed.map(r=>`${r.fileName}: ${r.message}`).join('، ')}`;
    }

    if(!failed.length)progress.finish(true,queue.length>1?'اكتمل استيراد كل الملفات':'اكتمل الاستيراد');
    else progress.finish(false,succeeded.length?'اكتمل الاستيراد جزئياً':'فشل الاستيراد');
    selectedFiles=[];file.value='';renderSelectedFiles(); btn.disabled=true;
  }finally{
    btn.disabled=!selectedFiles.length;
  }
};

// ---- Bulk password upload (system creator only) -----------------------------
// Reads an XLSX/CSV in the browser (columns: ID + الباسورد), then sends the
// accounts to /api/admin/import-passwords in small batches so each request
// stays fast (passwords are bcrypt-hashed server-side). Passwords only ever
// live in memory here and are dropped right after the upload.
(function(){
  const panel=$('pw-import-panel');
  if(!panel||user.role!=='system_creator')return;
  panel.hidden=false;

  const input=$('pw-file'),sel=$('pw-selected'),btn=$('pw-upload-btn'),status=$('pw-upload-status'),result=$('pw-result'),zone=$('pw-dropzone');
  const pgs=makeProgress('pw-progress','pw-progress-fill','pw-progress-pct','pw-progress-label');
  const BATCH=25;
  let parsed=null;

  const ID_HEAD=/^\s*(id|الكود|كود|رقم الموظف|رقم)\s*$/i;
  const PW_HEAD=/(الباسورد|باسورد|كلمة المرور|كلمه المرور|password|pass)/i;

  function setStatus(text,cls){status.className='upload-status'+(cls?' '+cls:'');status.textContent=text||''}
  function clearAll(){parsed=null;sel.style.display='none';sel.innerHTML='';btn.disabled=true;result.hidden=true;result.innerHTML='';pgs.el.hidden=true;setStatus('')}

  async function readFile(f){
    const XLSX=await ensureXLSX();
    const buf=await f.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const aoa=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});
    let hRow=-1,idCol=-1,pwCol=-1;
    for(let r=0;r<Math.min(aoa.length,15)&&hRow<0;r++){
      const row=aoa[r]||[];let ic=-1,pc=-1;
      row.forEach((v,c)=>{const t=String(v??'').trim();if(ic<0&&ID_HEAD.test(t))ic=c;else if(pc<0&&PW_HEAD.test(t))pc=c});
      if(ic>=0&&pc>=0){hRow=r;idCol=ic;pwCol=pc}
    }
    if(hRow<0)throw new Error('لم أجد عمودَي ID والباسورد في أول شيت. تأكد من وجود عناوين الأعمدة (ID / الباسورد).');
    const rows=[],skipped=[];
    for(let r=hRow+1;r<aoa.length;r++){
      const row=aoa[r]||[];
      const rawId=row[idCol],rawPw=row[pwCol];
      if((rawId===''||rawId==null)&&(rawPw===''||rawPw==null))continue; // empty line
      const id=Number(String(rawId).trim());
      const password=(typeof rawPw==='number'?String(rawPw):String(rawPw??'')).trim();
      if(!Number.isInteger(id)||id<=0){skipped.push({line:r+1,reason:'ID غير صالح'+(id===0?' (0)':'')});continue}
      if(password.length<4){skipped.push({line:r+1,reason:'باسورد ناقص'});continue}
      rows.push({id,password});
    }
    return {rows,skipped,fileName:f.name};
  }

  async function pick(f){
    if(!f)return;
    clearAll();
    if(!/\.(xlsx|csv)$/i.test(f.name)){setStatus('الملف لازم يكون XLSX أو CSV.','error');return}
    if(f.size>8*1024*1024){setStatus('حجم الملف أكبر من 8 ميغابايت.','error');return}
    try{
      setStatus('جارٍ قراءة الملف...');
      parsed=await readFile(f);
      setStatus('');
      sel.style.display='block';
      sel.innerHTML=`<div class="selected-file-row"><span class="selected-file-name">${esc(parsed.fileName)}</span><span class="selected-file-size">${parsed.rows.length} جاهز · ${parsed.skipped.length} سيتم تخطيه</span><button type="button" class="selected-file-remove" title="إزالة الملف" aria-label="إزالة الملف">×</button></div>`;
      sel.querySelector('.selected-file-remove').onclick=clearAll;
      btn.disabled=!parsed.rows.length;
      if(!parsed.rows.length)setStatus('لا توجد صفوف صالحة للرفع.','error');
    }catch(e){parsed=null;setStatus(e.message||'تعذّر قراءة الملف.','error')}
  }

  input.onchange=()=>{pick(input.files[0]);input.value=''};
  ;['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();zone.classList.add('drag-over')}));
  ;['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();e.stopPropagation();zone.classList.remove('drag-over')}));
  zone.addEventListener('drop',e=>{const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)pick(f)});

  function line(cls,label,value){return `<div class="pw-line ${cls}"><span>${label}</span><b>${value}</b></div>`}

  btn.onclick=async()=>{
    if(!parsed||!parsed.rows.length)return;
    const total=parsed.rows.length;
    if(!confirm(`سيتم تغيير كلمة مرور ${total} موظف. هل تريد المتابعة؟`))return;

    btn.disabled=true;result.hidden=true;setStatus('');
    pgs.show();
    const agg={updated:0,notFound:[],invalid:0,protected:0,failedRows:0};
    const batches=[];for(let i=0;i<total;i+=BATCH)batches.push(parsed.rows.slice(i,i+BATCH));
    let lastError='';
    try{
      for(let b=0;b<batches.length;b++){
        pgs.set(b/batches.length,`جارٍ رفع كلمات المرور (${b+1} من ${batches.length})...`);
        try{
          const data=await apiUpload('/api/admin/import-passwords',JSON.stringify({rows:batches[b]}),null);
          agg.updated+=data.updated||0;
          agg.notFound.push(...(data.notFound||[]));
          agg.invalid+=(data.invalid||[]).length;
          agg.protected+=(data.protected||[]).length;
        }catch(e){agg.failedRows+=batches[b].length;lastError=e.message||'خطأ غير معروف'}
        pgs.set((b+1)/batches.length);
      }
      const ok=agg.failedRows===0;
      pgs.finish(ok,ok?'اكتمل رفع كلمات المرور':(agg.updated?'اكتمل جزئياً':'فشل الرفع'));
      let html=line('pw-ok','تم تحديث كلمة المرور',agg.updated.toLocaleString('en-US'));
      if(parsed.skipped.length)html+=line('','صفوف تم تخطيها في الملف (ID=0 أو باسورد ناقص)',parsed.skipped.length.toLocaleString('en-US'));
      if(agg.notFound.length){html+=line('pw-warn','ID غير موجود في النظام',agg.notFound.length.toLocaleString('en-US'));html+=`<div class="pw-ids">${agg.notFound.map(n=>esc(n)).join(', ')}</div>`}
      if(agg.protected)html+=line('','حسابات محمية (لا تُغيَّر من هنا)',agg.protected);
      if(agg.invalid)html+=line('pw-warn','صفوف رفضها السيرفر',agg.invalid);
      if(agg.failedRows)html+=line('pw-warn','صفوف فشل رفعها',agg.failedRows.toLocaleString('en-US'))+`<div class="pw-ids">${esc(lastError)}</div>`;
      result.innerHTML=html;result.hidden=false;
      setStatus(ok?'تم.':'حدثت أخطاء أثناء الرفع.',ok?'success':'error');
    }finally{
      parsed=null;sel.style.display='none';sel.innerHTML='';btn.disabled=true;
    }
  };
})();
