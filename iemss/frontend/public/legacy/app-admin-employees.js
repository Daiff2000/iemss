const token = sessionStorage.getItem('iems_token');
const userRaw = sessionStorage.getItem('iems_user');
if (!token || !userRaw) window.location.href = '/index.html';
const user = JSON.parse(userRaw);
if (user.role !== 'admin' && user.role !== 'supervisor') window.location.href = '/home.html';
const isSupervisor = user.role === 'supervisor';
if (isSupervisor && $('employees-page-desc')) $('employees-page-desc').textContent = 'عرض الموظفين وتغيير الصلاحية بين موظف ومشرف فقط.';

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
// Target & performance figures are always shown as whole numbers (no decimals).
function fmtNumber(v) { return Math.round(Number(v || 0)).toLocaleString('en-US'); }
function fmtHours(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const hours = n > 0 && n < 1 ? n * 24 : n;
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2,'0')}`;
}
function fmtPercent(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return Math.round(n * 100) + '%';
}

// Theme
const savedTheme = localStorage.getItem('iems-theme') || 'light';
document.documentElement.dataset.theme = savedTheme;

// ---- KPI cards for the employee view modal (same look as the employee's own home page) ----
const KPI_TREND_SHAPES = [
  [38, 52, 46, 66, 58, 82],
  [30, 40, 36, 55, 48, 70],
  [50, 42, 60, 50, 68, 60],
  [60, 48, 64, 54, 78, 68],
  [34, 50, 44, 62, 56, 88]
];
function kpiSvgIcon(type) {
  const icons = {
    rate:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="m7 16 4-5 3 3 5-7"></path></svg>',
    present:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11 3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>',
    absent:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
    chart:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="m19 9-5 5-4-4-3 3"></path></svg>'
  };
  return icons[type] || icons.chart;
}
function kpiLineChart(points, w = 100, h = 28) {
  const pad = 3;
  const n = points.length;
  const max = Math.max(...points), min = Math.min(...points);
  const range = (max - min) || 1;
  const coords = points.map((p, i) => [
    (i / (n - 1)) * (w - pad * 2) + pad,
    h - pad - ((p - min) / range) * (h - pad * 2)
  ]);
  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = coords[coords.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path class="att-kpi-line" d="${linePath}"></path><circle class="att-kpi-dot" cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.4"></circle></svg>`;
}
function kpiCard(label, value, cls, icon, trendShape) {
  return `
    <article class="kpi-card2 ${cls}">
      <div class="kpi2-top">
        <span class="kpi2-label">${label}</span>
        <div class="kpi2-ring">${kpiSvgIcon(icon)}</div>
      </div>
      <div class="kpi2-value"><strong>${typeof value === 'string' ? value : fmtNumber(value)}</strong></div>
      <div class="kpi2-spark">${kpiLineChart(trendShape)}</div>
    </article>`;
}

function miniIcon(name){
 const m={
  view:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>',
  edit:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg>',
  key:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle></svg>',
  reset:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>',
  delete:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
 }; return m[name]||'';
}

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
$('chip-role').textContent = `ID: ${user.id} · ${isSupervisor ? 'مشرف' : 'مدير النظام'}`;
$('chip-avatar').textContent = (user.name || '?').trim()[0] || '?';
$('logout-btn').addEventListener('click', () => { sessionStorage.clear(); window.location.href = '/index.html'; });

let allEmployees = [];
let currentList = [];
let sortKey = null;
let sortDir = 'asc'; // 'asc' | 'desc'
let selectedIds = new Set();

const ROLE_LABELS = { admin: 'مدير النظام', supervisor: 'مشرف', employee: 'موظف' };
if ($('filter-role')) $('filter-role').innerHTML = `<option value="__ALL__">الكل</option>${isSupervisor ? '' : '<option value="admin">مدير النظام</option>'}<option value="supervisor">مشرف</option><option value="employee">موظف</option>`;
function roleOptionsHtml(current) {
  return Object.entries(ROLE_LABELS).filter(([val]) => !isSupervisor || val !== 'admin').map(([val, label]) =>
    `<option value="${val}" ${val === current ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

const STATUS_LABELS = { active: 'نشط', left: 'غادر', archive: 'أرشيف' };
function statusBadgeHtml(status) {
  const key = status || 'active';
  const label = STATUS_LABELS[key] || STATUS_LABELS.active;
  return `<span class="status-badge status-${escapeHtml(key)}">${escapeHtml(label)}</span>`;
}

function renderTable(list) {
  currentList = list;
  $('emp-count').textContent = `${list.length} نتيجة`;
  if (!list.length) { $('emp-table-body').innerHTML = '<tr><td colspan="10"><div class="empty-state">لا توجد نتائج.</div></td></tr>'; return; }
  $('emp-table-body').innerHTML = list.map(e => `
    <tr data-id="${escapeHtml(e.id)}" class="${e.is_top5 ? 'emp-row-top5' : ''}">
      <td class="select-col"><input type="checkbox" class="row-select" data-select-for="${escapeHtml(e.id)}" ${selectedIds.has(String(e.id)) ? 'checked' : ''} ${String(e.id) === String(user.id) ? 'disabled' : ''}></td>
      <td>${escapeHtml(e.id)}</td>
      <td class="emp-name-cell">${escapeHtml(e.name)}${e.is_top5 ? '<span class="top5-badge" title="من ضمن أفضل 5 موظفين">🏆 Top 5</span>' : ''}</td>
      <td>${escapeHtml(e.company || '—')}</td>
      <td>${escapeHtml(e.shift || '—')}</td>
      <td>${escapeHtml(e.department || '—')}</td>
      <td>${escapeHtml(e.education || '—')}</td>
      <td>
        <select class="role-select role-${escapeHtml(e.role || 'employee')}" data-role-for="${escapeHtml(e.id)}" ${(String(e.id) === String(user.id) || e.is_primary_admin) ? `disabled title="${e.is_primary_admin ? 'مدير النظام الأساسي - لا يمكن تغيير صلاحيته' : 'لا يمكنك تغيير صلاحيتك الخاصة'}"` : ''}>
          ${roleOptionsHtml(e.role || 'employee')}
        </select>
        ${e.is_primary_admin ? '<span class="primary-admin-badge" title="مدير النظام الأساسي">🔒</span>' : ''}
      </td>
      <td>${statusBadgeHtml(e.status)}</td>
      <td class="emp-actions-cell">
        <button class="row-icon-btn info-btn" data-action="view" title="عرض بيانات الموظف كما تظهر له">${miniIcon('view')}</button>
        ${isSupervisor ? '' : `<button class="row-icon-btn" data-action="edit" title="تعديل بيانات الموظف">${miniIcon('edit')}</button>
        <button class="row-icon-btn" data-action="pw" title="تغيير كلمة المرور">${miniIcon('key')}</button>
        <button class="row-icon-btn" data-action="reset" title="كلمة مرور افتراضية جديدة">${miniIcon('reset')}</button>
        <button class="row-icon-btn danger-icon" data-action="delete" title="حذف الموظف">${miniIcon('delete')}</button>`}
      </td>
    </tr>`).join('');
  updateSelectAllState();
  updateBulkRow();
}

function updateSelectAllState() {
  const boxes = [...document.querySelectorAll('.row-select:not(:disabled)')];
  const all = boxes.length > 0 && boxes.every(b => b.checked);
  $('select-all-emp').checked = all;
  $('select-all-emp').indeterminate = !all && boxes.some(b => b.checked);
}

function updateBulkRow() {
  $('emp-selected-count').textContent = `${selectedIds.size} محدد`;
  $('emp-bulk-row').style.display = selectedIds.size ? 'flex' : 'none';
}

function applySort(list) {
  if (!sortKey) return list;
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    if (sortKey === 'role') { va = ROLE_LABELS[va || 'employee']; vb = ROLE_LABELS[vb || 'employee']; }
    if (sortKey === 'status') { va = STATUS_LABELS[va || 'active']; vb = STATUS_LABELS[vb || 'active']; }
    if (sortKey === 'id') { va = Number(va) || 0; vb = Number(vb) || 0; return (va - vb) * dir; }
    va = String(va ?? '').toLowerCase(); vb = String(vb ?? '').toLowerCase();
    return va.localeCompare(vb, 'ar') * dir;
  });
}

function getFiltered() {
  const q = $('emp-search').value.trim().toLowerCase();
  let base = q ? allEmployees.filter(e => String(e.name).toLowerCase().includes(q) || String(e.id).includes(q)) : allEmployees;
  const shiftF = $('filter-shift').value, companyF = $('filter-company').value, deptF = $('filter-department').value, roleF = $('filter-role').value, statusF = $('filter-status').value;
  if (shiftF && shiftF !== '__ALL__') base = base.filter(e => (e.shift || '—') === shiftF);
  if (companyF && companyF !== '__ALL__') base = base.filter(e => (e.company || '—') === companyF);
  if (deptF && deptF !== '__ALL__') base = base.filter(e => (e.department || '—') === deptF);
  if (roleF && roleF !== '__ALL__') base = base.filter(e => (e.role || 'employee') === roleF);
  if (statusF && statusF !== '__ALL__') base = base.filter(e => (e.status || 'active') === statusF);
  return applySort(base);
}

function fillOptions(selectEl, values, current) {
  const opts = ['<option value="__ALL__">الكل</option>', ...values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`)];
  selectEl.innerHTML = opts.join('');
  selectEl.value = current && values.includes(current) ? current : '__ALL__';
}

function populateFilterOptions() {
  const uniq = key => [...new Set(allEmployees.map(e => e[key] || '—'))].sort((a, b) => String(a).localeCompare(String(b), 'ar'));
  fillOptions($('filter-shift'), uniq('shift'), $('filter-shift').value);
  fillOptions($('filter-company'), uniq('company'), $('filter-company').value);
  fillOptions($('filter-department'), uniq('department'), $('filter-department').value);
}

['filter-shift', 'filter-company', 'filter-department', 'filter-role', 'filter-status'].forEach(id => {
  $(id).addEventListener('change', () => renderTable(getFiltered()));
});
$('filter-reset-btn').addEventListener('click', () => {
  $('filter-shift').value = '__ALL__'; $('filter-company').value = '__ALL__';
  $('filter-department').value = '__ALL__'; $('filter-role').value = '__ALL__';
  $('filter-status').value = '__ALL__';
  $('emp-search').value = '';
  renderTable(getFiltered());
});

function updateSortHeaderUI() {
  document.querySelectorAll('.emp-mgmt-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.key === sortKey) th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
}

document.querySelectorAll('.emp-mgmt-table th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.key;
    if (sortKey === key) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
    else { sortKey = key; sortDir = 'asc'; }
    updateSortHeaderUI();
    renderTable(getFiltered());
  });
});

async function loadEmployees() {
  try {
    const { employees, total } = await api('/api/admin/employees');
    allEmployees = employees;
    $('emp-total').textContent = total ?? employees.filter(e => (e.role || 'employee') === 'employee').length;
    populateFilterOptions();
    renderTable(getFiltered());
  } catch (e) {
    $('emp-table-body').innerHTML = `<tr><td colspan="10"><div class="empty-state">${escapeHtml(e.message)}</div></td></tr>`;
  }
}

$('emp-search').addEventListener('input', () => renderTable(getFiltered()));

// ---- Role change dropdown ----
$('emp-table-body').addEventListener('change', async (e) => {
  const sel = e.target.closest('select[data-role-for]');
  if (!sel) return;
  const id = sel.dataset.roleFor;
  const emp = allEmployees.find(x => String(x.id) === String(id));
  const prevRole = emp ? emp.role || 'employee' : sel.value;
  try {
    await api(`/api/admin/employee/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: JSON.stringify({ role: sel.value }) });
    if (emp) emp.role = sel.value;
    sel.className = `role-select role-${sel.value}`;
    $('emp-total').textContent = allEmployees.filter(e2 => (e2.role || 'employee') === 'employee').length;
  } catch (err) {
    sel.value = prevRole;
    showResult('خطأ', err.message);
  }
});

// ---- View-as-employee modal (exactly what the employee sees) ----
const viewModal = $('view-modal');
function renderMyRankBanner(el, ranks, isSelf) {
  if (!ranks || !ranks.length) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  const subject = isSelf ? 'أنت' : 'هذا الموظف';
  el.innerHTML = '🏆 ' + ranks.map(r => `${subject} ضمن <b>Top 5</b> في مرحلة <b>${escapeHtml(r.stage)}</b> — المركز <b>${escapeHtml(r.rank)}</b>`).join(' &nbsp;|&nbsp; ');
}

function renderSupervisorTargetsAdmin(bySection) {
  const title = $('view-supervisor-target-title');
  const container = $('view-supervisor-target-container');
  if (!title || !container) return;
  const sections = Object.entries(bySection || {});
  if (!sections.length) { title.style.display = 'none'; container.innerHTML = ''; return; }
  title.style.display = 'block';
  container.innerHTML = sections.map(([sectionName, rows]) => {
    const metricNames = [...new Set(rows.flatMap(r => Object.keys(r.metrics || {})))];
    const head = `<th>التاريخ</th>${metricNames.map(m => `<th>${escapeHtml(m)}</th>`).join('')}<th>التارجت اليومي</th><th>التارجت الشهري</th>`;
    const body = rows.map(r => {
      const metricCells = metricNames.map(m => `<td>${r.metrics && r.metrics[m] != null ? fmtNumber(r.metrics[m]) : '—'}</td>`).join('');
      return `<tr><td>${escapeHtml(r.date)}</td>${metricCells}<td>${r.targetDaily != null ? fmtNumber(r.targetDaily) : '—'}</td><td>${r.targetMonthly != null ? fmtPercent(r.targetMonthly) : '—'}</td></tr>`;
    }).join('');
    return `
      <div class="supervisor-target-section">
        <h3>${escapeHtml(sectionName)}</h3>
        <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      </div>`;
  }).join('');
}

async function openViewModal(id) {
  viewModal.classList.add('open');
  $('view-modal-title').textContent = 'جاري التحميل...';
  $('view-emp-info').innerHTML = '';
  if ($('view-kpi-grid')) $('view-kpi-grid').innerHTML = '';
  $('view-detail-head').innerHTML = '';
  $('view-detail-body').innerHTML = '';
  $('view-supervisor-target-title').style.display = 'none';
  $('view-supervisor-target-container').innerHTML = '';
  try {
    const data = await api(`/api/employee/${encodeURIComponent(id)}`);
    const emp = data.employee, s = data.summary || {}, a = data.attendance || {};
    $('view-modal-title').textContent = `بيانات ${emp.name}`;

    if ($('view-kpi-grid')) {
      const presentDays = Number(s.total_present_days ?? a.present_days ?? 0);
      const absenceDays = Number(s.total_absence_days ?? s.total_absence ?? 0);
      const bonusTier = s.bonus_tier;
      const bonusTierNum = Number(bonusTier);
      const bonusTierDisplay = (bonusTier !== null && bonusTier !== undefined && bonusTier !== '' && Number.isFinite(bonusTierNum)) ? Math.round(bonusTierNum) : bonusTier;
      const rawKpis = [
        { label: 'نسبة التارجت', raw: s.percentage, display: fmtPercent(s.percentage), cls: 'blue', icon: 'rate' },
        { label: 'أيام الحضور', raw: presentDays, display: presentDays, cls: 'teal', icon: 'present' },
        { label: 'أيام الغياب', raw: absenceDays, display: absenceDays, cls: 'amber', icon: 'absent' },
        { label: 'رقم الشريحة', raw: bonusTier, display: bonusTierDisplay, cls: 'purple', icon: 'chart' }
      ];
      const kpis = rawKpis.filter(k => k.raw !== null && k.raw !== undefined && k.raw !== '');
      $('view-kpi-grid').innerHTML = kpis.map((k, i) =>
        kpiCard(k.label, k.display, k.cls, k.icon, KPI_TREND_SHAPES[i % KPI_TREND_SHAPES.length])
      ).join('');
    }

    $('view-emp-info').innerHTML = `
      <div class="info-item highlight-item"><span>نسبة التارجت</span><b class="highlight-value">${fmtPercent(s.percentage)}</b></div>
      <div class="info-item"><span>الاسم</span><b>${escapeHtml(emp.name)}</b></div>
      <div class="info-item"><span>ID</span><b>${escapeHtml(emp.id)}</b></div>
      <div class="info-item"><span>الشركة</span><b>${escapeHtml(emp.company || '—')}</b></div>
      <div class="info-item"><span>الشيفت</span><b>${escapeHtml(emp.shift || '—')}</b></div>
      <div class="info-item"><span>القسم</span><b>${escapeHtml(emp.department || '—')}</b></div>
      <div class="info-item"><span>الفئة</span><b>${escapeHtml(emp.education || '—')}</b></div>`;
    $('view-emp-perf').innerHTML = `
      <div class="info-item"><span>أيام الحضور</span><b class="accent-value">${fmtAttendanceNumber(s.total_present_days ?? a.present_days)}</b></div>
      <div class="info-item"><span>رقم الشريحة</span><b>${escapeHtml(s.bonus_tier ?? '—')}</b></div>
      <div class="info-item"><span>إجمالي طبيعة العمل</span><b>${fmtNumber(s.work_nature_allowance)}</b></div>
      <div class="info-item"><span>إجمالي الغياب</span><b class="danger-value">${fmtNumber(s.total_absence)}</b></div>
      <div class="info-item"><span>إجازة عارضة</span><b>${fmtNumber(s.casual_leave)}</b></div>
      <div class="info-item"><span>إجازة بإذن</span><b>${fmtNumber(s.leave_with_permission)}</b></div>
      <div class="info-item"><span>إجازة بدون إذن</span><b class="danger-value">${fmtNumber(s.leave_without_permission ?? s.unauthorized_absence)}</b></div>
      <div class="info-item"><span>إجازة مرضي</span><b>${fmtNumber(s.sick_leave)}</b></div>
      <div class="info-item"><span>إجمالي ساعات التأخيرات</span><b class="danger-value">${fmtHours(s.late_hours)}</b></div>
      <div class="info-item"><span>إجمالي ساعات الإضافي</span><b class="accent-value">${fmtHours(s.overtime_hours)}</b></div>`;

    renderMyRankBanner($('view-rank-banner'), data.myRanks, false);
    renderSupervisorTargetsAdmin(data.supervisorTargets || {});

    const stageEntries = Object.entries(data.stages || {});
    const dateSet = new Set(); stageEntries.forEach(([,rows]) => rows.forEach(r => dateSet.add(r.date)));
    const dates = [...dateSet].sort();
    $('view-detail-head').innerHTML = '<th>المرحلة</th>' + dates.map(d => `<th>${escapeHtml(d.slice(5))}</th>`).join('') + '<th>الإجمالي</th>';
    if (!stageEntries.length || !dates.length) {
      $('view-detail-body').innerHTML = `<tr><td colspan="${dates.length + 2}"><div class="empty-state">لا توجد بيانات مطابقة.</div></td></tr>`;
      return;
    }
    $('view-detail-body').innerHTML = stageEntries.map(([stageName, rows]) => {
      const byDate = Object.fromEntries(rows.map(r => [r.date, r.value])); let sum = 0, hasNum = false;
      const cells = dates.map(d => { const v = byDate[d]; if (v === undefined || v === null || v === '') return '<td class="cell-empty">—</td>'; if (typeof v === 'number') { sum += v; hasNum = true; return `<td class="cell-present">${fmtAttendanceNumber(v)}</td>`; } return `<td class="cell-present">${escapeHtml(v)}</td>`; }).join('');
      return `<tr><td>${escapeHtml(stageName)}</td>${cells}<td>${hasNum ? fmtAttendanceNumber(sum) : '—'}</td></tr>`;
    }).join('');
  } catch (e) {
    $('view-modal-title').textContent = 'خطأ';
    $('view-emp-info').innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}
$('view-modal-close').addEventListener('click', () => viewModal.classList.remove('open'));
viewModal.addEventListener('click', (e) => { if (e.target === viewModal) viewModal.classList.remove('open'); });

// ---- Result modal helper ----
const resultModal = $('result-modal');
function showResult(title, text) {
  $('result-title').textContent = title;
  $('result-text').textContent = text;
  resultModal.classList.add('open');
}
$('result-ok').addEventListener('click', () => resultModal.classList.remove('open'));

// ---- Edit ID / name modal ----
const editModal = $('edit-modal');
let editTarget = null;
function openEditModal(emp) {
  editTarget = emp;
  $('edit-id').value = emp.id;
  $('edit-name').value = emp.name;
  $('edit-company').value = emp.company || '';
  $('edit-shift').value = emp.shift || '';
  $('edit-department').value = emp.department || '';
  $('edit-education').value = emp.education || '';
  $('edit-residence').value = emp.residence || '';
  $('edit-error').style.display = 'none';
  editModal.classList.add('open');
}
$('edit-cancel').addEventListener('click', () => editModal.classList.remove('open'));
$('edit-save').addEventListener('click', async () => {
  const errEl = $('edit-error');
  if (!editTarget) return;
  const newId = $('edit-id').value.trim();
  const name = $('edit-name').value.trim();
  const company = $('edit-company').value.trim();
  const shift = $('edit-shift').value.trim();
  const department = $('edit-department').value.trim();
  const education = $('edit-education').value.trim();
  const residence = $('edit-residence').value.trim();
  try {
    const body = { company, shift, department, education, residence };
    if (String(newId) !== String(editTarget.id)) body.newId = newId;
    if (name && name !== editTarget.name) body.name = name;
    await api(`/api/admin/employee/${encodeURIComponent(editTarget.id)}`, { method: 'PATCH', body: JSON.stringify(body) });
    editModal.classList.remove('open');
    await loadEmployees();
  } catch (e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
});

// ---- Change password modal ----
const pwModal = $('pw-modal');
let pwTarget = null;
function openPwModal(emp) {
  pwTarget = emp;
  $('pw-new').value = '';
  $('pw-error').style.display = 'none';
  pwModal.classList.add('open');
}
$('pw-cancel').addEventListener('click', () => pwModal.classList.remove('open'));
$('pw-save').addEventListener('click', async () => {
  const errEl = $('pw-error');
  if (!pwTarget) return;
  const newPassword = $('pw-new').value.trim();
  try {
    const body = newPassword ? { newPassword } : {};
    const data = await api(`/api/admin/employee/${encodeURIComponent(pwTarget.id)}/reset-password`, { method: 'POST', body: JSON.stringify(body) });
    pwModal.classList.remove('open');
    showResult('تم تغيير كلمة المرور', data.password ? `كلمة المرور الجديدة لـ ${pwTarget.name}: ${data.password}` : 'تم تغيير كلمة المرور بنجاح.');
  } catch (e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
});

// ---- Delete modal (single or bulk) ----
const deleteModal = $('delete-modal');
let deleteTarget = null; // single employee object
let deleteBulkIds = null; // array of ids
function openDeleteModal(emp) {
  deleteTarget = emp; deleteBulkIds = null;
  $('delete-text').textContent = `هل أنت متأكد من حذف "${emp.name}"؟ سيتم حذف كل بياناته نهائيًا ولا يمكن التراجع.`;
  $('delete-error').style.display = 'none';
  deleteModal.classList.add('open');
}
function openBulkDeleteModal(ids) {
  deleteTarget = null; deleteBulkIds = ids;
  $('delete-text').textContent = `هل أنت متأكد من حذف ${ids.length} موظف؟ سيتم حذف كل بياناتهم نهائيًا ولا يمكن التراجع.`;
  $('delete-error').style.display = 'none';
  deleteModal.classList.add('open');
}
$('delete-cancel').addEventListener('click', () => deleteModal.classList.remove('open'));
$('delete-confirm').addEventListener('click', async () => {
  const errEl = $('delete-error');
  try {
    if (deleteBulkIds && deleteBulkIds.length) {
      for (const id of deleteBulkIds) { await api(`/api/admin/employee/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
      selectedIds.clear();
    } else if (deleteTarget) {
      await api(`/api/admin/employee/${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
    } else return;
    deleteModal.classList.remove('open');
    await loadEmployees();
  } catch (e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
});

// ---- Row selection & bulk actions ----
$('emp-table-body').addEventListener('change', (e) => {
  const box = e.target.closest('.row-select');
  if (!box) return;
  const id = String(box.dataset.selectFor);
  if (box.checked) selectedIds.add(id); else selectedIds.delete(id);
  updateSelectAllState(); updateBulkRow();
});
$('select-all-emp').addEventListener('change', () => {
  const checked = $('select-all-emp').checked;
  document.querySelectorAll('.row-select:not(:disabled)').forEach(box => {
    box.checked = checked;
    if (checked) selectedIds.add(String(box.dataset.selectFor)); else selectedIds.delete(String(box.dataset.selectFor));
  });
  updateBulkRow();
});
$('bulk-clear-btn').addEventListener('click', () => {
  selectedIds.clear();
  renderTable(currentList);
});
$('bulk-delete-btn').addEventListener('click', () => {
  if (!selectedIds.size) return;
  openBulkDeleteModal([...selectedIds]);
});

// ---- Row action dispatch ----
$('emp-table-body').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const row = btn.closest('tr');
  const id = row.dataset.id;
  const emp = allEmployees.find(x => String(x.id) === String(id));
  if (!emp) return;
  const action = btn.dataset.action;
  if (action === 'view') return openViewModal(id);
  if (action === 'edit') { if (isSupervisor) return showResult('غير مسموح', 'المشرف لا يمكنه تعديل بيانات الموظف.'); return openEditModal(emp); }
  if (action === 'pw') { if (isSupervisor) return showResult('غير مسموح', 'المشرف لا يمكنه تغيير كلمة المرور.'); return openPwModal(emp); }
  if (action === 'delete') { if (isSupervisor) return showResult('غير مسموح', 'المشرف لا يمكنه حذف الموظف.'); return openDeleteModal(emp); }
  if (action === 'reset') { if (isSupervisor) return showResult('غير مسموح', 'المشرف لا يمكنه إعادة تعيين كلمة المرور.');
    api(`/api/admin/employee/${encodeURIComponent(id)}/reset-default`, { method: 'POST' })
      .then(data => showResult('تم إنشاء كلمة مرور افتراضية', `كلمة المرور الجديدة لـ ${emp.name}: ${data.password}\nسيُطلب من الموظف تغييرها عند أول تسجيل دخول.`))
      .catch(err => showResult('خطأ', err.message));
  }
});

// clicking anywhere on the row (not on an action button) opens the "view" modal too
$('emp-table-body').addEventListener('click', (e) => {
  if (e.target.closest('button[data-action]') || e.target.closest('.select-col') || e.target.closest('select[data-role-for]')) return;
  const row = e.target.closest('tr[data-id]');
  if (row) openViewModal(row.dataset.id);
});

loadEmployees();
