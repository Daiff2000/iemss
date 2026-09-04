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
function setStatus(id, msg, kind) {
  const el = $(id);
  el.textContent = msg || '';
  el.className = 'me-status' + (kind ? ' ' + kind : '');
}

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
$('chip-role').textContent = `ID: ${user.id} · ${user.role === 'admin' ? 'مدير النظام' : 'موظف'}`;
$('chip-avatar').textContent = (user.name || '?').trim()[0] || '?';
$('logout-btn').addEventListener('click', () => { sessionStorage.clear(); window.location.href = '/index.html'; });

// ---- Tabs ----
document.querySelectorAll('.me-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.me-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.me-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ---- Meta / reference data ----
let META = { employees: [], stages: [], sections: [] };

function fillDatalist(id, values) {
  $(id).innerHTML = values.map(v => `<option value="${escapeAttr(v)}">`).join('');
}
function escapeAttr(v) { return String(v ?? '').replace(/"/g, '&quot;'); }

function fillEmployeeSelect(selectEl, includeBlank) {
  const opts = META.employees.map(e => `<option value="${e.id}">${e.id} — ${escapeAttr(e.name)}</option>`).join('');
  selectEl.innerHTML = (includeBlank ? selectEl.querySelector('option') ? selectEl.innerHTML : '' : '') + opts;
}

async function loadMeta() {
  const data = await api('/api/admin/manual/meta');
  META = data;

  fillDatalist('dl-emp-ids', META.employees.map(e => e.id));
  fillDatalist('dl-stages', META.stages);
  fillDatalist('dl-sections', META.sections);
  fillDatalist('dl-companies', [...new Set(META.employees.map(e => e.company).filter(Boolean))]);
  fillDatalist('dl-shifts', [...new Set(META.employees.map(e => e.shift).filter(Boolean))]);
  fillDatalist('dl-departments', [...new Set(META.employees.map(e => e.department).filter(Boolean))]);

  const empOptsPlain = META.employees.map(e => `<option value="${e.id}">${e.id} — ${escapeAttr(e.name)}</option>`).join('');
  $('daily-emp').innerHTML = empOptsPlain;
  $('sum-emp').innerHTML = empOptsPlain;
  $('sup-emp').innerHTML = '<option value="">— بدون ربط —</option>' + empOptsPlain;

  const shiftOpts = [...new Set(META.employees.map(e => e.shift).filter(Boolean))];
  const deptOpts = [...new Set(META.employees.map(e => e.department).filter(Boolean))];
  $('grid-filter-shift').innerHTML = '<option value="">الكل</option>' + shiftOpts.map(s => `<option value="${escapeAttr(s)}">${escapeAttr(s)}</option>`).join('');
  $('grid-filter-department').innerHTML = '<option value="">الكل</option>' + deptOpts.map(s => `<option value="${escapeAttr(s)}">${escapeAttr(s)}</option>`).join('');
}
loadMeta().catch(err => console.error(err));

// ---- Tab: Employee basic info ----
$('form-employee').addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('status-employee', 'جارٍ الحفظ...', '');
  try {
    const body = {
      id: $('emp-id').value,
      emp_num: $('emp-num').value || null,
      name: $('emp-name').value,
      company: $('emp-company').value || null,
      shift: $('emp-shift').value || null,
      department: $('emp-department').value || null,
      education: $('emp-education').value || null,
      residence: $('emp-residence').value || null,
    };
    const res = await api('/api/admin/manual/employee', { method: 'POST', body: JSON.stringify(body) });
    let msg = res.message;
    if (res.created) msg += ` (كلمة المرور الافتراضية: ${res.defaultPassword})`;
    setStatus('status-employee', msg, 'success');
    e.target.reset();
    loadMeta().catch(() => {});
  } catch (err) {
    setStatus('status-employee', err.message, 'error');
  }
});

// ---- Tab: Daily (single) ----
document.querySelectorAll('.me-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.me-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const single = btn.dataset.mode === 'single';
    $('daily-single').style.display = single ? 'block' : 'none';
    $('daily-grid').style.display = single ? 'none' : 'block';
  });
});

$('form-daily-single').addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('status-daily-single', 'جارٍ الحفظ...', '');
  try {
    const body = {
      employee_id: $('daily-emp').value,
      stage: $('daily-stage').value,
      entry_date: $('daily-date').value,
      value: $('daily-value').value,
    };
    await api('/api/admin/manual/daily', { method: 'POST', body: JSON.stringify(body) });
    setStatus('status-daily-single', 'تم الحفظ.', 'success');
    $('daily-value').value = '';
    loadMeta().catch(() => {});
  } catch (err) {
    setStatus('status-daily-single', err.message, 'error');
  }
});

// ---- Tab: Daily (grid) ----
function dateRange(from, to) {
  const dates = [];
  let d = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  if (isNaN(d) || isNaN(end) || d > end) return dates;
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

$('grid-build-btn').addEventListener('click', () => {
  const stage = $('grid-stage').value.trim();
  const from = $('grid-date-from').value;
  const to = $('grid-date-to').value;
  setStatus('status-daily-grid', '', '');
  if (!stage) { setStatus('status-daily-grid', 'اكتب اسم المرحلة أولاً.', 'error'); return; }
  const dates = dateRange(from, to);
  if (!dates.length) { setStatus('status-daily-grid', 'اختر نطاق تاريخ صحيح.', 'error'); return; }
  if (dates.length > 31) { setStatus('status-daily-grid', 'النطاق أكبر من شهر، اختر نطاق أصغر.', 'error'); return; }

  const shiftFilter = $('grid-filter-shift').value;
  const deptFilter = $('grid-filter-department').value;
  const rows = META.employees.filter(e =>
    (!shiftFilter || e.shift === shiftFilter) && (!deptFilter || e.department === deptFilter)
  );

  const thead = $('grid-table').querySelector('thead');
  const tbody = $('grid-table').querySelector('tbody');
  thead.innerHTML = '<tr><th>الموظف</th>' + dates.map(d => `<th>${d.slice(5)}</th>`).join('') + '</tr>';
  tbody.innerHTML = rows.map(e =>
    `<tr data-emp="${e.id}"><td>${e.id} — ${escapeAttr(e.name)}</td>` +
    dates.map(d => `<td><input type="text" data-date="${d}" placeholder="—"></td>`).join('') +
    '</tr>'
  ).join('') || '<tr><td colspan="99" style="padding:20px;color:var(--muted)">لا يوجد موظفين مطابقين للفلاتر.</td></tr>';
});

$('grid-save-btn').addEventListener('click', async () => {
  const stage = $('grid-stage').value.trim();
  if (!stage) { setStatus('status-daily-grid', 'اكتب اسم المرحلة أولاً.', 'error'); return; }
  const entries = [];
  $('grid-table').querySelectorAll('tbody tr[data-emp]').forEach(tr => {
    const empId = tr.dataset.emp;
    tr.querySelectorAll('input[data-date]').forEach(inp => {
      if (inp.value !== '') entries.push({ employee_id: empId, entry_date: inp.dataset.date, value: inp.value });
    });
  });
  if (!entries.length) { setStatus('status-daily-grid', 'مفيش خانات متملية.', 'error'); return; }

  setStatus('status-daily-grid', 'جارٍ الحفظ...', '');
  try {
    const res = await api('/api/admin/manual/daily-batch', { method: 'POST', body: JSON.stringify({ stage, entries }) });
    setStatus('status-daily-grid', res.message, 'success');
    loadMeta().catch(() => {});
  } catch (err) {
    setStatus('status-daily-grid', err.message, 'error');
  }
});

// ---- Tab: Monthly summary ----
const SUMMARY_FIELDS = ['total_achievement','total_target','percentage','bonus_tier','unauthorized_absence','total_absence',
  'work_nature_allowance','monthly_target','total_present_days','total_absence_days','casual_leave','leave_with_permission',
  'leave_without_permission','sick_leave','late_days','late_hours','overtime_days','overtime_hours','special_bonus_days','special_deductions'];

$('form-summary').addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('status-summary', 'جارٍ الحفظ...', '');
  try {
    const body = { employee_id: $('sum-emp').value };
    for (const f of SUMMARY_FIELDS) body[f] = $('sum-' + f).value;
    await api('/api/admin/manual/summary', { method: 'POST', body: JSON.stringify(body) });
    setStatus('status-summary', 'تم حفظ الملخص الشهري.', 'success');
  } catch (err) {
    setStatus('status-summary', err.message, 'error');
  }
});

// ---- Tab: Supervisor target ----
$('form-supervisor').addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('status-supervisor', 'جارٍ الحفظ...', '');
  try {
    const body = {
      supervisor_name: $('sup-name').value,
      employee_id: $('sup-emp').value || null,
      section: $('sup-section').value,
      entry_date: $('sup-date').value,
      target_daily: $('sup-target_daily').value,
      target_monthly: $('sup-target_monthly').value,
    };
    await api('/api/admin/manual/supervisor-target', { method: 'POST', body: JSON.stringify(body) });
    setStatus('status-supervisor', 'تم الحفظ.', 'success');
    loadMeta().catch(() => {});
  } catch (err) {
    setStatus('status-supervisor', err.message, 'error');
  }
});
