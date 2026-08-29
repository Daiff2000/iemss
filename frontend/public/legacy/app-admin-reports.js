const token = sessionStorage.getItem('iems_token');
const userRaw = sessionStorage.getItem('iems_user');
if (!token || !userRaw) window.location.href = '/index.html';
const user = JSON.parse(userRaw);
if (user.role !== 'admin') window.location.href = '/home.html';

const $ = id => document.getElementById(id);
function authHeaders() { return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }; }
async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
  if (res.status === 401) { sessionStorage.clear(); window.location.href = '/index.html'; throw new Error('انتهت الجلسة'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}
function escapeHtml(v) { return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }

const LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAAA4CAYAAADUzOWCAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyZpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTM4IDc5LjE1OTgyNCwgMjAxNi8wOS8xNC0wMTowOTowMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzY2REQ0MjVFOThCMTFFNzlCMjJGMTIzNDBFQThBODgiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MzY2REQ0MjRFOThCMTFFNzlCMjJGMTIzNDBFQThBODgiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NTA2QUY2MkYwQzhBMTFFNzhCRTRCN0IzMTM3REFDRkYiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6NTA2QUY2MzAwQzhBMTFFNzhCRTRCN0IzMTM3REFDRkYiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz58FryxAAAbE0lEQVR42uxd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';

// Theme
const savedTheme = localStorage.getItem('iems-theme') || 'light';
document.documentElement.dataset.theme = savedTheme;
function syncThemeLogos(){ const dark=document.documentElement.dataset.theme==='dark'; document.querySelectorAll('.logo-light').forEach(el=>el.style.display=dark?'none':''); document.querySelectorAll('.logo-dark').forEach(el=>el.style.display=dark?'block':'none'); }
function updateThemeIcon() { if ($('theme-toggle')) { $('theme-toggle').innerHTML = document.documentElement.dataset.theme === 'dark' ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path></svg>';  } }
$('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('iems-theme', next);
  updateThemeIcon(); syncThemeLogos();
});
updateThemeIcon();

$('chip-name').textContent = user.name;
$('chip-role').textContent = `ID: ${user.id} · مدير`;
$('chip-avatar').textContent = (user.name || '?').trim()[0] || '?';
$('logout-btn').addEventListener('click', () => { sessionStorage.clear(); window.location.href = '/index.html'; });

let lastResult = null; // holds the last fetched report data for export

function showError(msg) {
  const el = $('rep-error');
  if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
  el.style.display = 'block';
  el.textContent = msg;
}

async function loadStages() {
  try {
    // Keep the Reports stage selector identical to the Home/Attendance
    // selector: same source, same "all" default, and exclude the attendance
    // pseudo-stage from the performance filters.
    const data = await api('/api/employee/stages');
    const sel = $('rep-stage');
    const stages = (data.stages || []).filter(s => String(s).trim() !== 'الحضور');
    sel.innerHTML = '<option value="__ALL__">كل المراحل</option>' +
      stages.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    sel.value = '__ALL__';
  } catch (err) {
    // non-fatal: stage dropdown stays on the same Home-style all default
    const sel = $('rep-stage');
    if (sel) sel.innerHTML = '<option value="__ALL__">كل المراحل</option>';
  }
}

function renderTable(employees) {
  const tbody = $('rep-tbody');
  if (!employees.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">لا يوجد موظفون اشتغلوا في هذه الفترة والمرحلة</td></tr>';
    return;
  }
  tbody.innerHTML = employees.map(e => `
    <tr>
      <td style="text-align:right">${escapeHtml(e.name)}</td>
      <td>${escapeHtml(e.company || '—')}</td>
      <td>${escapeHtml(e.shift || '—')}</td>
      <td>${escapeHtml(e.department || '—')}</td>
      <td><strong>${formatTarget(e.stage_target)}</strong></td>
    </tr>
  `).join('');
}

function formatTarget(v) {
  const n = Number(v) || 0;
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

async function runReport() {
  const from = $('rep-from').value;
  const to = $('rep-to').value;
  const stages = [...$('rep-stage').selectedOptions].map(o=>o.value).filter(v=>v&&v!=='__ALL__');
  showError('');

  if (!from || !to) { showError('من فضلك اختر التاريخ من والي.'); return; }
  if (from > to) { showError('تاريخ "من" يجب أن يكون قبل تاريخ "إلى".'); return; }

  $('rep-run-btn').disabled = true;
  $('rep-run-btn').innerHTML = '<span class="report-spinner" aria-hidden="true"></span>';
  $('rep-run-btn').setAttribute('aria-label', 'جارٍ إنشاء التقرير');
  try {
    const q=new URLSearchParams({from,to});stages.forEach(v=>q.append('stage',v));const data = await api(`/api/admin/report/attendance?${q.toString()}`);
    lastResult = data;
    renderTable(data.employees);
    const stageLabel = stages.length ? stages.join(' + ') : 'كل المراحل';
    $('rep-summary').textContent = `${data.total} موظف اشتغل من ${from} إلى ${to} — المرحلة: ${stageLabel}`;
    $('rep-target-head').textContent = stages.length ? `تارجت ${stages.join(' + ')}` : 'إجمالي التارجت';
    $('rep-excel-btn').disabled = data.total === 0;
    $('rep-pdf-btn').disabled = data.total === 0;
  } catch (err) {
    showError(err.message);
    lastResult = null;
    $('rep-excel-btn').disabled = true;
    $('rep-pdf-btn').disabled = true;
  } finally {
    $('rep-run-btn').disabled = false;
    $('rep-run-btn').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="m9 15 2 2 4-4"></path></svg>';
    $('rep-run-btn').setAttribute('aria-label', 'إنشاء التقرير');
  }
}

function stageDisplay(stage, joiner = ' + ') {
  if (!stage || stage === '__ALL__') return null;
  return Array.isArray(stage) ? stage.join(joiner) : String(stage);
}

function reportFilename(ext) {
  if (!lastResult) return `report.${ext}`;
  const stageLabel = stageDisplay(lastResult.stage, '-') || 'all-stages';
  return `iems-report_${lastResult.from}_to_${lastResult.to}_${stageLabel}.${ext}`.replace(/\s+/g, '-');
}


function buildPageForPrintFallback(result){
  const stageLabel=result.stage==='__ALL__'?'كل المراحل':String(result.stage);
  return `<div dir="rtl" style="font-family:Arial;padding:20px"><h1>تقرير أداء الموظفين</h1><p>المرحلة: ${escapeHtml(stageLabel)} — الفترة: ${escapeHtml(result.from)} إلى ${escapeHtml(result.to)}</p><table border="1" cellspacing="0" cellpadding="7" style="width:100%;border-collapse:collapse"><thead><tr><th>م</th><th>الاسم</th><th>الشركة</th><th>الشيفت</th><th>القسم</th><th>التارجت</th></tr></thead><tbody>${result.employees.map((e,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.company||'')}</td><td>${escapeHtml(e.shift||'')}</td><td>${escapeHtml(e.department||'')}</td><td>${Number(e.stage_target)||0}</td></tr>`).join('')}</tbody></table></div>`;
}

function exportExcel() {
  if (!lastResult || !lastResult.employees.length) return;
  if(!window.XLSX){
    const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const stageLabel = stageDisplay(lastResult.stage) ? `تارجت ${stageDisplay(lastResult.stage)}` : 'إجمالي التارجت';
    const rows=[['الاسم','الشركة','الشيفت','القسم',stageLabel],...lastResult.employees.map(e=>[e.name,e.company||'',e.shift||'',e.department||'',Number(e.stage_target)||0])];
    const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table>${rows.map(r=>'<Row>'+r.map(v=>`<Cell><Data ss:Type="${typeof v==='number'?'Number':'String'}">${esc(v)}</Data></Cell>`).join('')+'</Row>').join('')}</Table></Worksheet></Workbook>`;
    const blob=new Blob([xml],{type:'application/vnd.ms-excel'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=reportFilename('xls');a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return;
  }
  const stageLabel = stageDisplay(lastResult.stage) ? `تارجت ${stageDisplay(lastResult.stage)}` : 'إجمالي التارجت';
  const rows = lastResult.employees.map(e => ({
    'الاسم': e.name,
    'الشركة': e.company || '',
    'الشيفت': e.shift || '',
    'القسم': e.department || '',
    [stageLabel]: Number(e.stage_target) || 0,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{wch:28},{wch:16},{wch:10},{wch:20},{wch:18}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, reportFilename('xlsx'));
}

// Builds an Arabic RTL "official form" style report off-screen, rasterizes
// it with html2canvas (so Arabic text shapes correctly via the browser's own
// text engine — jsPDF alone can't do Arabic shaping), then slices the image
// across A4 pages with jsPDF and triggers a direct file download — no print
// dialog involved.
async function exportPdf() {
  if (!lastResult || !lastResult.employees.length) return;
  if(!window.html2canvas||!window.jspdf){
    const root=$('print-report-root'); root.innerHTML=buildPageForPrintFallback(lastResult);
    const w=window.open('','_blank'); if(w){w.document.write('<html dir="rtl"><head><title>IEMS Report</title></head><body>'+root.innerHTML+'</body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),300);} root.innerHTML=''; return;
  }

  const btn = $('rep-pdf-btn');
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'جاري إنشاء PDF...';

  const stageLabel = stageDisplay(lastResult.stage) || 'كل المراحل';
  const targetColLabel = stageDisplay(lastResult.stage) ? `تارجت ${stageDisplay(lastResult.stage)}` : 'إجمالي التارجت';
  const totalEmployees = Number(lastResult.total) || lastResult.employees.length;
  // Per-employee target figures are daily/period percentages, not additive counts —
  // summing them across employees produces a meaningless number, so the report no
  // longer shows a summed "total target" row (see requirement: totals column must
  // not be aggregated for the daily target).
  const generatedAt = new Date().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  const money = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

  // Keep each PDF page self-contained so a second page repeats the title,
  // logo/header and table headings instead of looking like a cropped continuation.
  const root = $('print-report-root');
  root.innerHTML = '';

  const buildPage = (employees, pageIndex, pageCount, startIndex = 0) => {
    const rows = employees.map((e, i) => {
      const absoluteIndex = startIndex + i + 1;
      return `
        <tr>
          <td>${absoluteIndex}</td>
          <td class="pr-name">${escapeHtml(e.name || '—')}</td>
          <td>${escapeHtml(e.company || '—')}</td>
          <td>${escapeHtml(e.shift || '—')}</td>
          <td>${escapeHtml(e.department || '—')}</td>
          <td><b>${money(e.stage_target)}</b></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pr-sheet">
        <div class="pr-header">
          <div class="pr-header-left">
            <img src="/logo.png" alt="Intercom IEMS logo" crossorigin="anonymous">
          </div>
          <div class="pr-header-right">
            <h1>تقرير أداء الموظفين</h1>
            <span>Employee Performance Report</span>
          </div>
          <div class="pr-header-spacer"></div>
        </div>


        <table class="pr-info-table">
          <tr>
            <td>المرحلة&nbsp;&nbsp;<b>${escapeHtml(stageLabel)}</b></td>
            <td>الفترة من&nbsp;<b>${lastResult.from}</b>&nbsp;الي&nbsp;<b>${lastResult.to}</b></td>
          </tr>
          <tr>
            <td>تاريخ الإصدار&nbsp;&nbsp;<b>${generatedAt}</b></td>
            <td>عدد الموظفين&nbsp;&nbsp;<b>${totalEmployees}</b></td>
          </tr>
        </table>

        <table class="pr-table">
          <thead>
            <tr>
              <th>م</th>
              <th>الاسم</th>
              <th>الشركة</th>
              <th>الشيفت</th>
              <th>القسم</th>
              <th>${escapeHtml(targetColLabel)}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        ${pageIndex === pageCount - 1 ? `
          <div class="pr-summary">
            <div class="pr-summary-row"><span>عدد الموظفين</span><b>${money(totalEmployees)}</b></div>
          </div>
          <div class="pr-footer">IEMS — Human Resource Management · ${escapeHtml(generatedAt)}</div>
        ` : ''}
      </div>
    `;
  };

  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 9;
    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2;

    // --- Dynamic pagination -------------------------------------------------
    // A fixed "rows per page" left the last (and often every) page much
    // shorter than the real A4 sheet, so the PDF looked like it had a blank
    // lower half. Instead, measure the actual rendered height of the header,
    // one table row, and the summary/footer block, then work out how many
    // rows genuinely fit on a page before starting a new one.
    const measure = html => {
      const holder = document.createElement('div');
      holder.innerHTML = html;
      const page = holder.firstElementChild;
      root.appendChild(page);
      const height = page.getBoundingClientRect().height;
      const width = page.getBoundingClientRect().width;
      root.removeChild(page);
      return { height, width };
    };

    const zeroRowsNoSummary = measure(buildPage([], 0, 2));
    const zeroRowsWithSummary = measure(buildPage([], 0, 1));
    const oneRowNoSummary = measure(buildPage(lastResult.employees.slice(0, 1), 0, 2));

    const mmPerPx = usableW / zeroRowsNoSummary.width;
    const maxPxPerPage = usableH / mmPerPx;
    const rowHeightPx = Math.max(oneRowNoSummary.height - zeroRowsNoSummary.height, 14);

    const rowsPerPageRegular = Math.max(1, Math.floor((maxPxPerPage - zeroRowsNoSummary.height) / rowHeightPx));
    const rowsPerPageLast = Math.max(1, Math.floor((maxPxPerPage - zeroRowsWithSummary.height) / rowHeightPx));

    const chunks = [];
    if (lastResult.employees.length <= rowsPerPageLast) {
      chunks.push(lastResult.employees.slice());
    } else {
      const remaining = lastResult.employees.slice();
      while (remaining.length > rowsPerPageLast) {
        chunks.push(remaining.splice(0, rowsPerPageRegular));
      }
      chunks.push(remaining);
    }

    let runningIndex = 0;
    const pages = chunks.map((chunk, i) => {
      const holder = document.createElement('div');
      holder.innerHTML = buildPage(chunk, i, chunks.length, runningIndex);
      runningIndex += chunk.length;
      const page = holder.firstElementChild;
      root.appendChild(page);
      return page;
    });

    await new Promise(r => setTimeout(r, 100));

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const logoEl = page.querySelector('.pr-header-left img');
      if (logoEl && !logoEl.complete) {
        await new Promise(resolve => { logoEl.onload = resolve; logoEl.onerror = resolve; });
      }

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgW = usableW;
      const imgH = (canvas.height * imgW) / canvas.width;
      // Preserve the report's aspect ratio. Never squash the page vertically.
      const scale = Math.min(1, usableH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const x = margin + (usableW - drawW) / 2;
      const y = margin;

      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', x, y, drawW, drawH);
    }

    pdf.save(reportFilename('pdf'));
  } catch (err) {
    showError('حدث خطأ أثناء إنشاء ملف PDF: ' + err.message);
  } finally {
    root.innerHTML = '';
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

$('rep-run-btn').addEventListener('click', runReport);
$('rep-excel-btn').addEventListener('click', exportExcel);
$('rep-pdf-btn').addEventListener('click', exportPdf);

// Default the "to" date to today and "from" to 7 days ago, for convenience.
(function setDefaults() {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const fmt = d => d.toISOString().slice(0, 10);
  $('rep-to').value = fmt(today);
  $('rep-from').value = fmt(weekAgo);
})();

loadStages();
// Same multi-select behavior as the Home/Attendance filters.
$('rep-stage')?.addEventListener('change', () => {
  const el = $('rep-stage');
  const picked = [...el.selectedOptions].map(o => o.value);
  if (picked.includes('__ALL__') && picked.length > 1) {
    [...el.options].forEach(o => o.selected = o.value === '__ALL__');
  } else if (picked.some(v => v !== '__ALL__')) {
    [...el.options].forEach(o => { if (o.value === '__ALL__') o.selected = false; });
  }
});
