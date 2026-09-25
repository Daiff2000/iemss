
// Employee welcome styling (kept in the legacy script so the production dist receives it without a rebuild).
(() => {
  const style = document.getElementById('iems-home-style') || document.createElement('style');
  style.id = 'iems-home-style';
  style.dataset.iemsPageStyle = 'home';
  style.textContent = `
    #welcome-message{display:none!important}
    .detail-attendance-day{white-space:nowrap}.detail-attendance-day small{display:block;margin-top:3px;font-size:10px;font-weight:900;opacity:.78}
    .detail-date-head{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:62px}.detail-date-head .detail-day{font-size:11px;font-weight:900;color:var(--primary)}.detail-date-head .detail-date{font-size:14px;font-weight:950;color:var(--text);direction:ltr}
    .target-percent{display:inline-flex;align-items:center;justify-content:center;min-width:54px;padding:0;border:none;background:none;border-radius:0;font-weight:950;line-height:1.2}.target-percent-low{color:#e5484d}.target-percent-mid{color:#f2b705}.target-percent-high{color:#0aac5e}
    .total-target-master-row>td{background:color-mix(in srgb,var(--primary) 5%,var(--panel));font-weight:900}.total-target-master-row .total-target-cell{font-weight:950}
    .daily-details-wrap{display:flex;align-items:flex-start;gap:18px}
    .overall-percent-badge{flex:0 0 130px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:18px 10px;text-align:center}
    .overall-percent{font:950 30px/1.1 'Cairo',sans-serif}
    .overall-percent-label{font-size:10px;font-weight:900;color:var(--muted)}
    .overall-percent.target-percent-low{color:#e5484d}.overall-percent.target-percent-mid{color:#f2b705}.overall-percent.target-percent-high{color:#0aac5e}
    html[data-theme="dark"] .overall-percent.target-percent-low{color:#ff6b6b}html[data-theme="dark"] .overall-percent.target-percent-mid{color:#ffd85e}html[data-theme="dark"] .overall-percent.target-percent-high{color:#4ade80}
    @media(max-width:680px){.daily-details-wrap{flex-direction:column-reverse}.overall-percent-badge{flex-direction:row;justify-content:flex-start;width:100%}}
    html[data-theme="dark"] .target-percent-low{color:#ff6b6b}html[data-theme="dark"] .target-percent-mid{color:#ffd85e}html[data-theme="dark"] .target-percent-high{color:#4ade80}
    .employee-welcome-content{display:grid;grid-template-columns:minmax(260px,.85fr) minmax(0,1.6fr);gap:24px;align-items:stretch;margin:0 0 18px;padding:26px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(135deg,rgba(6,91,171,.10),rgba(6,91,171,.025) 55%,var(--panel));box-shadow:0 14px 38px rgba(15,23,42,.06);overflow:hidden;position:relative}
    .employee-welcome-content:before{content:"";position:absolute;width:260px;height:260px;border-radius:50%;inset:auto -90px -120px auto;background:radial-gradient(circle,rgba(6,91,171,.18),transparent 68%);pointer-events:none}
    .employee-welcome-copy{display:flex;flex-direction:column;justify-content:center;position:relative;z-index:1}
    .employee-welcome-eyebrow{font-size:10px;font-weight:900;letter-spacing:1.5px;color:var(--primary);margin-bottom:8px}
    .employee-welcome-copy h2{font-size:25px;font-weight:900;margin:0 0 5px;color:var(--text)}
    .employee-welcome-copy p{font-size:15px;font-weight:900;color:var(--primary);margin:0 0 8px}
    .employee-welcome-name{font-size:11px;color:var(--muted);line-height:1.9;font-weight:700}
    .employee-welcome-features{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;position:relative;z-index:1}
    .employee-welcome-feature{display:flex;align-items:flex-start;gap:10px;padding:13px;border:1px solid var(--line);border-radius:15px;background:var(--panel);box-shadow:0 7px 18px rgba(15,23,42,.045)}
    .welcome-feature-icon{width:30px;height:30px;flex:0 0 30px;display:grid;place-items:center;border-radius:10px;background:rgba(6,91,171,.10);color:var(--primary);font-weight:900}
    .employee-welcome-feature div{min-width:0;display:flex;flex-direction:column;gap:2px}
    .employee-welcome-feature b{font-size:11px;font-weight:900;color:var(--text)}
    .employee-welcome-feature small{font-size:9.5px;line-height:1.65;color:var(--muted);font-weight:700}
    html[data-theme="dark"] .employee-welcome-content{background:linear-gradient(135deg,rgba(46,143,239,.14),rgba(7,7,7,.82) 58%,var(--panel));box-shadow:0 18px 45px rgba(0,0,0,.28)}
    html[data-theme="dark"] .employee-welcome-feature{background:rgba(255,255,255,.025);box-shadow:none}
    html[data-theme="dark"] .welcome-feature-icon{background:rgba(46,143,239,.16)}
    .info-item.rank-badge-item{background:linear-gradient(135deg,rgba(6,91,171,.13),rgba(14,165,233,.06));border:1px solid rgba(6,91,171,.24);color:var(--primary);border-radius:16px;padding:13px 15px;box-shadow:0 7px 20px rgba(6,91,171,.08)}
    .info-item.rank-badge-item:before{content:"TOP 5";font-size:8px;font-weight:900;letter-spacing:1px;padding:4px 7px;border-radius:7px;background:var(--primary);color:#fff}
    .info-item.rank-badge-item b{color:var(--primary)}
    html[data-theme="dark"] .info-item.rank-badge-item{background:linear-gradient(135deg,rgba(46,143,239,.16),rgba(14,165,233,.05));border-color:rgba(46,143,239,.28)}
    @media(max-width:900px){.employee-welcome-content{grid-template-columns:1fr}.employee-welcome-features{grid-template-columns:1fr 1fr}}
    @media(max-width:560px){.employee-welcome-content{padding:18px}.employee-welcome-features{grid-template-columns:1fr}.employee-welcome-copy h2{font-size:21px}}
  `;
  if (!style.isConnected) document.head.appendChild(style);
})();
/* IEMS Home: unified dashboard + attendance logic. The former page-specific scripts are intentionally removed. */
(() => {
window.__iemsLoadSystemBanner = loadSystemBanner;
async function loadSystemBanner() {
  try {
    const token = sessionStorage.getItem('iems_token');
    if (!token) return;
    const res = await fetch('/api/admin/banner/image', { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) return;
    const image = document.getElementById('system-banner');
    const wrap = document.getElementById('system-banner-wrap');
    if (!image || !wrap) return;

    const objectUrl = URL.createObjectURL(await res.blob());
    image.onload = () => { wrap.style.display = 'block'; };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      wrap.style.display = 'none';
    };
    image.src = objectUrl;
  } catch (_) {}
}
const token = sessionStorage.getItem('iems_token');
const userRaw = sessionStorage.getItem('iems_user');
// A redirect is asynchronous: the rest of this file kept running after it and
// then threw on `user.role` (user was null), so the page stayed blank instead
// of navigating cleanly. Bail out immediately instead.
if (!token || !userRaw) { window.location.href = '/index.html'; return; }
let user = null;
try { user = JSON.parse(userRaw); } catch (_) {}
if (!user || !user.role) { sessionStorage.clear(); window.location.href = '/index.html'; return; }

const $ = id => document.getElementById(id);
function authHeaders() { return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }; }
async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
  if (res.status === 401) { sessionStorage.clear(); window.location.href = '/index.html'; throw new Error('انتهت الجلسة'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}
function uiIcon(name){
 const m={
  upload:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"></path><path d="m17 8-5-5-5 5"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path></svg>',
  trophy:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"></path><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"></path><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"></path><path d="M4 22h16"></path><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"></path><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"></path></svg>',
  activity:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path></svg>',
  target:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>'
 }; return m[name]||m.activity;
}

function escapeHtml(v) { return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
// Target & performance figures are always shown as whole numbers (no decimals).
function fmtNumber(v) { return Math.round(Number(v || 0)).toLocaleString('en-US'); }
function fmtAttendanceNumber(v) { const n=Number(v); if(!Number.isFinite(n)) return '0'; return n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}); }
function fmtHours(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  // Excel time values are stored as a fraction of a day. Display them as H:MM.
  const hours = n > 0 && n < 1 ? n * 24 : n;
  let totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 0) totalMinutes = 0;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2,'0')}`;
}
function fmtDate(v) { if (!v) return '—'; const [y,m,d] = v.split('-'); return `${d}/${m}/${y}`; }
// Excel percentage cells store the raw fraction (e.g. 1.5 for "150%"),
// so we always scale by 100 and round to a whole number for display.
function fmtPercent(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return Math.round(n * 100) + '%';
}
function achievementPercent(summary) {
  const achievement = Number(summary?.total_achievement);
  const target = Number(summary?.total_target); // Master!AO — 
  return Number.isFinite(achievement) && Number.isFinite(target) && target > 0 ? achievement / target : null;
}
function percentClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const percent = n * 100;
  return percent < 50 ? 'target-percent-low' : percent < 70 ? 'target-percent-mid' : 'target-percent-high';
}
function coloredPercent(value) {
  const text = fmtPercent(value);
  return text === '—' ? '—' : `<span class="target-percent ${percentClass(value)}">${text}</span>`;
}
function detailWeekday(date) {
  const names = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? '—' : names[parsed.getUTCDay()];
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
updateThemeIcon(); syncThemeLogos();
const ROLE_LABEL = user.role === 'system_creator' ? 'منشئ النظام' : user.role === 'admin' ? 'مدير النظام' : user.role === 'supervisor' ? 'مشرف · Shift ' + (user.shift || '-') : 'Shift ' + (user.shift || '-');
$('chip-name').textContent = user.name;
$('chip-role').textContent = `ID: ${user.id} · ${ROLE_LABEL}`;
$('chip-avatar').textContent = (user.name || '?').trim()[0] || '?';
$('logout-btn').addEventListener('click', () => { sessionStorage.clear(); window.location.href = '/index.html'; });
// Nav visibility must match the guard at the top of each target page and the
// role middleware on its API routes, otherwise a link is shown that just
// bounces the user straight back here. Single source of truth:
//   employees / import / reports -> supervisor, admin, system_creator
//   manual entry                 -> admin, system_creator
//   audit logs / themes          -> system_creator
// (app-shell.js applies the same table; keep the two in sync.)
const SUPERVISOR_UP = user.role === 'system_creator' || user.role === 'admin' || user.role === 'supervisor';
const ADMIN_UP = user.role === 'system_creator' || user.role === 'admin';
if ($('nav-employees')) $('nav-employees').style.display = SUPERVISOR_UP ? 'inline-flex' : 'none';
if ($('nav-import')) $('nav-import').style.display = SUPERVISOR_UP ? 'inline-flex' : 'none';
if ($('nav-reports')) $('nav-reports').style.display = SUPERVISOR_UP ? 'inline-flex' : 'none';
if ($('nav-manual-entry')) $('nav-manual-entry').style.display = ADMIN_UP ? 'inline-flex' : 'none';

// Company performance summary + company comparison chart + employee daily details: admin only.
if (user.role === 'admin' || user.role === 'system_creator') {
  if ($('company-summary-panel')) $('company-summary-panel').style.display = '';
  if ($('single-company-chart')) $('single-company-chart').style.display = '';
  if ($('employee-detail-panel')) $('employee-detail-panel').style.display = '';
}

let availableDates = [];
let companyOverview = null;
async function initFilters() {
  if (user.role === 'employee') {
    document.querySelector('.attendance-page-shell')?.classList.add('employee-home-view');
    document.querySelectorAll('.employee-filter-hide').forEach(el => el.style.display = 'none');
    const employeeStageLabel = document.querySelector('#att-department')?.closest('.field')?.querySelector('label');
    if (employeeStageLabel) employeeStageLabel.textContent = 'المرحلة';
    ['company-summary-panel','daily-panel','single-company-chart','employee-detail-panel','modern-dashboard','overview-grid'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
  }
  const calls = [api('/api/employee/stages'), api('/api/employee/dates')];
  if (user.role === 'admin' || user.role === 'system_creator') calls.push(api('/api/employee/shifts'));
  const [{ stages }, { dates }, shiftsRes] = await Promise.all(calls);
  availableDates = dates || [];

  const stageSel = $('f-stage');
  const performanceStages = (stages || []).filter(s => String(s).trim() !== 'الحضور');
  stageSel.innerHTML = '<option value="__ALL__">كل المراحل</option>' + performanceStages.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');

  if (user.role === 'admin' || user.role === 'system_creator') {
    $('f-shift-field').style.display = 'flex';
    const shifts = (shiftsRes && shiftsRes.shifts) || [];
    $('f-shift').innerHTML = '<option value="__ALL__">كل الشيفتات</option>' + shifts.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  }

  // Date values are owned by the visible attendance filter on Home.
  // Keep the hidden bridge constrained to the same available range, but
  // never initialize/overwrite its values here (that caused the selected
  // Home period to jump back to the first/last available dates).
  if (availableDates.length) {
    $('f-from').min = availableDates[0]; $('f-from').max = availableDates[availableDates.length - 1];
    $('f-to').min = availableDates[0]; $('f-to').max = availableDates[availableDates.length - 1];
  }
}

$('apply-btn').addEventListener('click', refreshDashboard);
$('f-from').addEventListener('change', () => { if ($('f-to').value && $('f-from').value > $('f-to').value) $('f-to').value = $('f-from').value; });
$('reset-btn').addEventListener('click', async () => {
  $('f-stage').value = '__ALL__';
  if ($('f-shift')) $('f-shift').value = '__ALL__';
  if (availableDates.length) { $('f-from').value = availableDates[0]; $('f-to').value = availableDates[availableDates.length - 1]; }
  await refreshDashboard();
});


// ---- Modern admin dashboard ----
// Single icon set shared by both KPI rows (home overview + attendance
// summary) so there is exactly one place that defines each glyph.
function svgIcon(type) {
  const icons = {
    users:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M16 3.128a4 4 0 0 1 0 7.744"></path><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><circle cx="9" cy="7" r="4"></circle></svg>',
    company:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h4"></path><path d="M10 8h4"></path><path d="M14 21v-3a2 2 0 0 0-4 0v3"></path><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"></path><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"></path></svg>',
    student:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" x2="19" y1="8" y2="14"></line><line x1="22" x2="16" y1="11" y2="11"></line></svg>',
    graduate:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path><path d="M22 10v6"></path><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path></svg>',
    present:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11 3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>',
    absent:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
    rate:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="m7 16 4-5 3 3 5-7"></path></svg>',
    unauthorized:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
    medical:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path><path d="M9 12h6"></path><path d="M12 9v6"></path></svg>',
     chart:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="m19 9-5 5-4-4-3 3"></path></svg>',
     leave:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l1 4H8z"></path><path d="M6 7h12v14H6z"></path><path d="M10 11h4M10 15h4"></path></svg>',
     new:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M5 21a7 7 0 0 1 14 0M19 8v6M16 11h6"></path></svg>',
     other:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>'
  };
  return icons[type] || icons.chart;
}

// Deterministic little trend shapes so each KPI card gets its own line,
// without pretending we have real historical series data.
const KPI_TREND_SHAPES = [
  [38, 52, 46, 66, 58, 82],
  [30, 40, 36, 55, 48, 70],
  [50, 42, 60, 50, 68, 60],
  [60, 48, 64, 54, 78, 68],
  [34, 50, 44, 62, 56, 88]
];

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
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <path class="att-kpi-line" d="${linePath}"></path>
    <circle class="att-kpi-dot" cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.4"></circle>
  </svg>`;
}

// Shared card renderer for BOTH KPI rows on the home page (the 5-card
// admin overview + the 5-card attendance summary = 10 cards total), so
// there's one markup/one look instead of two near-duplicate templates.
function kpiCard(label, value, cls, icon, trendShape) {
  return `
    <article class="kpi-card2 ${cls}">
      <div class="kpi2-top">
        <span class="kpi2-label">${label}</span>
        <div class="kpi2-ring">${svgIcon(icon)}</div>
      </div>
      <div class="kpi2-value"><strong>${typeof value === 'string' ? value : fmtNumber(value)}</strong></div>
      <div class="kpi2-spark">${kpiLineChart(trendShape)}</div>
    </article>`;
}
// Expose to the second (attendance) script on this page so it doesn't
// need to redefine its own icon set / sparkline / trend shapes.
window.__iemsKpi = { svgIcon, kpiLineChart, KPI_TREND_SHAPES, kpiCard };

function renderKpis(overview) {
  if (user.role !== 'admin' && user.role !== 'system_creator') return;
  const o = overview || {};
  const cards = [
    ['إجمالي الموظفين', Number(o.total || 0), 'blue', 'users', 'all'],
    ['إجمالي شركة سمارت بيزنس', Number(o.smart || 0), 'teal', 'company', 'smart'],
    ['إجمالي شركة برافوس', Number(o.bravos || 0), 'amber', 'company', 'bravos'],
    ['إجمالي الطلاب', Number(o.students || 0), 'purple', 'student', 'students'],
     ['إجمالي الخريجين', Number(o.graduates || 0), 'rose', 'graduate', 'graduates'],
    ['إجمالي المغادرين', Number(o.leftEmployees || 0), 'left-kpi', 'leave', 'left'],
    ['إجمالي الجدد', Number(o.newEmployees || 0), 'new-kpi', 'new', 'new']
  ];
  const grid = $('kpi-grid');
  // This grid is shared with the 5 attendance-summary cards rendered by the
  // attendance section further down this file (see kpis()). The two sections
  // load their data independently and finish in whatever order the network
  // returns, so overwriting the whole grid here used to wipe out the
  // attendance cards whenever this admin overview resolved last — leaving
  // only 7 of the 12 KPIs visible. Only touch the cards this function owns.
  grid.querySelectorAll('[data-kpi-scope="admin"]').forEach(el => el.remove());
  const html = cards.map(([label, val, cls, icon, group], i) => {
    const h = kpiCard(label, val, cls, icon, KPI_TREND_SHAPES[i % KPI_TREND_SHAPES.length]);
    return `<div class="kpi-link-wrap" data-kpi-scope="admin" data-kpi-group="${group}" role="link" tabindex="0">${h}</div>`;
  }).join('');
  grid.insertAdjacentHTML('afterbegin', html);
  grid.querySelectorAll('[data-kpi-scope="admin"][data-kpi-group]').forEach(c => {
    const go = () => {
      const g = c.dataset.kpiGroup;
      if (g === 'new') return location.href = '/employees-new.html';
      if (g === 'left') return location.href = '/employees-left.html';
      const params = new URLSearchParams();
      params.set('status', 'active');
      if (g === 'smart') params.set('company', 'smart');
      if (g === 'bravos') params.set('company', 'bravos');
      if (g === 'students') params.set('education', 'طالب');
      if (g === 'graduates') params.set('education', 'خريج');
      location.href = '/admin-employees.html' + (params.toString() ? '?' + params : '');
    };
    c.onclick = go;
    c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });
}
function renderUnauthorizedAbsence(data) {
  const panel = $('unauthorized-absence-panel');
  const list = $('unauthorized-absence-list');
  const count = $('absence-count');
  if (!panel || !list || (user.role !== 'admin' && user.role !== 'system_creator')) return;

  const rows = Array.isArray(data?.unauthorizedAbsenceEmployees) ? data.unauthorizedAbsenceEmployees : [];
  panel.style.display = rows.length ? 'block' : 'none';
  count.textContent = `${rows.length.toLocaleString('en-US')} موظف`;
  if (!rows.length) { list.innerHTML = ''; return; }

  list.innerHTML = rows.map((r, i) => `
    <tr>
      <td><div class="absence-person"><div class="absence-avatar">${escapeHtml((r.name || '?').trim().charAt(0) || '?')}</div><div><b>${escapeHtml(r.name)}</b><span>ID #${escapeHtml(r.id)}</span></div></div></td>
      <td>${escapeHtml(r.company || '—')}</td>
      <td><span class="absence-shift">${escapeHtml(r.shift || '—')}</span></td>
      <td><strong class="absence-days">${fmtNumber(r.unauthorized_days)}</strong></td>
    </tr>`).join('');
}

function renderModernDashboard(data) {
  if (user.role !== 'admin' && user.role !== 'system_creator') { $('modern-dashboard').style.display = 'none'; return; }
  $('modern-dashboard').style.display = 'block';
  renderKpis(companyOverview);
  // Top-5 moved to Reports; attendance alarm is rendered by app-attendance.js.
}

function renderPerformanceChart(rows) {
  const svg = $('performance-chart');
  if (!svg) return;
  if (!rows.length) { svg.innerHTML = '<text x="450" y="160" text-anchor="middle" class="svg-empty">No performance data for this period</text>'; return; }
  const W=900,H=320,L=58,R=18,T=18,B=48, pw=W-L-R, ph=H-T-B;
  const maxVal=Math.max(...rows.map(r=>Math.max(r.classification,r.index)),1);
  const x=i=>L+(rows.length===1?pw/2:(i/(rows.length-1))*pw);
  const y=v=>T+ph-(vOr(v,0)/maxVal)*ph; // was `y=v=...`: a missing `>` turned this into an assignment to an undeclared global
  function pathFor(key){ return rows.map((r,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(r[key]).toFixed(1)}`).join(' '); }
  function areaFor(key){ return `${pathFor(key)} L ${x(rows.length-1).toFixed(1)} ${T+ph} L ${x(0).toFixed(1)} ${T+ph} Z`; }
  const grid=[0,.25,.5,.75,1].map(t=>{const yy=T+ph*t; const val=Math.round(maxVal*(1-t)); return `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" class="chart-grid"/><text x="${L-10}" y="${yy+4}" text-anchor="end" class="chart-axis">${fmtShort(val)}</text>`}).join('');
  const labels=rows.map((r,i)=>`<text x="${x(i)}" y="${H-15}" text-anchor="middle" class="chart-axis">${escapeHtml(String(r.date).slice(5))}</text>`).join('');
  const points=(key,cls)=>rows.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r[key])}" r="4" class="point ${cls}"/>`).join('');
  const totalPts=rows.map((r,i)=>{const yy=T+ph-(r.totalPercent/100)*ph;return `<circle cx="${x(i)}" cy="${yy}" r="4" class="point purple"/>`}).join('');
  const totalPath=rows.map((r,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${(T+ph-(r.totalPercent/100)*ph).toFixed(1)}`).join(' ');
  svg.innerHTML=`<defs><linearGradient id="blueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-opacity=".16"/><stop offset="1" stop-opacity="0"/></linearGradient><linearGradient id="tealFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-opacity=".14"/><stop offset="1" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${areaFor('classification')}" class="area blue-area"/><path d="${areaFor('index')}" class="area teal-area"/><path d="${pathFor('classification')}" class="chart-line blue-line"/><path d="${pathFor('index')}" class="chart-line teal-line"/><path d="${totalPath}" class="chart-line purple-line"/>${points('classification','blue')}${points('index','teal')}${totalPts}${labels}`;
}
function vOr(v,d){return Number.isFinite(Number(v))?Number(v):d;}
function fmtShort(v){ const n=Number(v||0); if(n>=1000) return `${Math.round(n/1000)}K`; return Math.round(n); }

function renderStageDonut(stageTotals) {
  // These widgets were removed from home.body.html; keep the code inert rather
  // than letting it throw on a null element if it is ever wired back up.
  if(!$('donut-total')||!$('stage-donut')||!$('stage-legend')) return;
  const entries=Object.entries(stageTotals).filter(([,v])=>Number(v)>0).sort((a,b)=>b[1]-a[1]);
  const total=entries.reduce((a,[,v])=>a+Number(v),0);
  $('donut-total').textContent=fmtShort(total);
  const donut=$('stage-donut');
  if(!entries.length){ donut.style.background='conic-gradient(var(--line) 0 100%)'; $('stage-legend').innerHTML='<span class="muted">No stage data</span>'; return; }
  const palette=['#2563eb','#14b8a6','#f59e0b','#4f46e5','#ef4444'];
  let cursor=0; const stops=[];
  entries.slice(0,5).forEach(([name,val],i)=>{const p=Number(val)/total*100; stops.push(`${palette[i%palette.length]} ${cursor}% ${cursor+p}%`); cursor+=p;});
  donut.style.background=`conic-gradient(${stops.join(',')})`;
  $('stage-legend').innerHTML=entries.slice(0,5).map(([name,val],i)=>{const p=Number(val)/total*100; return `<div class="legend-row"><span><i style="background:${palette[i%palette.length]}"></i>${escapeHtml(name)}</span><b>${Math.round(p)}%</b><small>(${fmtNumber(val)})</small></div>`}).join('');
}

function renderModernTopPerformers(groups) {
  if(!$('top-performers-body')) return;
  const unique=new Map();
  Object.entries(groups).forEach(([stage,rows])=>rows.forEach(r=>{const id=String(r.id); const current=unique.get(id); if(!current || Number(r.achieved)>Number(current.achieved)) unique.set(id,{...r,stage});}));
  const rows=[...unique.values()].sort((a,b)=>Number(b.achieved)-Number(a.achieved)).slice(0,5);
  $('top-performers-body').innerHTML=rows.length?rows.map((r,i)=>`<tr><td><span class="table-rank">${i+1}</span></td><td><div class="employee-cell"><span class="mini-avatar">${escapeHtml((r.name||'?').trim()[0]||'?')}</span><span><b>${escapeHtml(r.name)}</b><small>ID #${escapeHtml(r.id)}</small></span></div></td><td><span class="stage-pill">${escapeHtml(r.stage)}</span></td><td>${fmtNumber(r.achieved)}</td><td class="percent-good">${r.percentage!=null?fmtPercent(r.percentage):'—'}</td></tr>`).join(''):'<tr><td colspan="5"><div class="empty-state">No performance data</div></td></tr>';
}

function renderActivities(data) {
  if(!$('activity-list')) return;
  const rows=[];
  const range=data.range||{};
  rows.push({icon:uiIcon('upload'),cls:'green',title:'New daily data loaded',sub:`Selected period · ${fmtDate(range.from)} → ${fmtDate(range.to)}`,time:'Now'});
  const top=Object.values(data.top5ByStage||{}).flat().sort((a,b)=>Number(b.achieved)-Number(a.achieved))[0];
  if(top) rows.push({icon:uiIcon('activity'),cls:'blue',title:`${top.name} leads ${top.stage}`,sub:`Achievement: ${fmtNumber(top.achieved)}`,time:'Today'});
  const firstStage=Object.keys(data.analytics?.stageTotals||{})[0];
  if(firstStage) rows.push({icon:uiIcon('target'),cls:'amber',title:`Performance tracked for ${firstStage}`,sub:'Master stage data',time:'Today'});
  rows.push({icon:uiIcon('activity'),cls:'purple',title:'Dashboard report ready',sub:'Use Reports from the top navigation',time:'Ready'});
  $('activity-list').innerHTML=rows.map(r=>`<div class="activity-row"><span class="activity-icon ${r.cls}">${r.icon}</span><div><b>${escapeHtml(r.title)}</b><small>${escapeHtml(r.sub)}</small></div><time>${escapeHtml(r.time)}</time></div>`).join('');
}

// ---- Admin: company-wide overview ----
async function renderOverview() {
  if (user.role !== 'admin' && user.role !== 'system_creator') return;
  try {
    const from = $('f-from')?.value || '';
    const to = $('f-to')?.value || '';
    const shift = $('f-shift') ? $('f-shift').value : '__ALL__';
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (shift && shift !== '__ALL__') params.set('shift', shift);
    const o = await api(`/api/admin/overview?${params}`);
    companyOverview = o;
    $('overview-grid').style.display = 'none';
    $('overview-grid').innerHTML = '';
    renderKpis(companyOverview);
  } catch (e) { /* silent - admin-only widget */ }
}

// ---- Top 5 (admin only) ----
function renderTop5(data) {
  if (user.role !== 'admin' && user.role !== 'system_creator') return;
  if (!$('top5-range') || !$('top5-container') || !$('f-stage')) return;
  const stage = $('f-stage').value;
  const shiftVal = $('f-shift') ? $('f-shift').value : '__ALL__';
  const groups = stage !== '__ALL__' ? { [stage]: data.selectedTop5 || [] } : data.top5ByStage || {};
  const entries = Object.entries(groups).filter(([, rows]) => rows && rows.length);
  const shiftLabel = shiftVal && shiftVal !== '__ALL__' ? ` · Shift ${shiftVal}` : '';
  $('top5-range').textContent = `${fmtDate(data.range.from)} → ${fmtDate(data.range.to)}${shiftLabel}`;
  if (!entries.length) { $('top5-container').innerHTML = '<div class="empty-state">لا توجد بيانات أداء في الفترة المختارة.</div>'; return; }

  $('top5-container').innerHTML = entries.map(([stageName, rows]) => `
    <article class="stage-card kpi-style-card">
      <div class="stage-card-head"><div><span class="kpi-style-icon svg-icon">${uiIcon('trophy')}</span><div class="stage-card-title"><span class="stage-name">${escapeHtml(stageName)}</span><small>Top 5 performers</small></div></div><span class="count-badge">TOP 5</span></div>
      <div class="ranking-list">
        ${rows.slice(0,5).map(r => `<div class="rank-row"><div class="rank-badge rank-${r.rank}">${r.rank}</div><div class="rank-person"><b>${escapeHtml(r.name)}</b><span>ID #${escapeHtml(r.id)} · ${escapeHtml(r.shift || '—')}</span></div><strong>${fmtNumber(r.achieved)}</strong></div>`).join('')}
      </div>
      <div class="kpi-spark top5-spark"><span></span><span></span><span></span><span></span><span></span></div>
    </article>`).join('');
}

// (top-5 rank badge is now rendered inline inside the performance card — see loadSelfView)

// ---- Self view (employee role only) ----
async function loadSelfView(dashData) {
  const employeeOnly = user.role === 'employee';
  if (user.role === 'system_creator' || user.role === 'admin' || user.role === 'supervisor') {
    $('self-view-grid').style.display = 'none';
    $('detail-panel').style.display = 'none';
    if ($('employee-links-panel')) $('employee-links-panel').style.display = 'none';
    if ($('employee-detail-actions')) $('employee-detail-actions').style.display = 'none';
    if ($('supervisor-target-panel')) $('supervisor-target-panel').style.display = 'none';
    if ($('emp-kpi-grid')) $('emp-kpi-grid').style.display = 'none';
    return;
  }
  $('self-view-grid').style.display = 'grid';
  $('detail-panel').style.display = 'block';
  if ($('employee-links-panel')) $('employee-links-panel').style.display = 'block';
  if ($('employee-detail-actions')) $('employee-detail-actions').style.display = 'flex';
  $('employee-detail-pdf')?.querySelector('path')?.setAttribute('d', 'M6 22a2 2 0 0 1-2-2V4a2.4 2.4 0 0 1 1.704-2L20 8v12a2 2 0 0 1-2 2z');
  if ($('emp-kpi-grid')) $('emp-kpi-grid').style.display = 'grid';

  const params = new URLSearchParams();
  if ($('f-from').value) params.set('from', $('f-from').value);
  if ($('f-to').value) params.set('to', $('f-to').value);
  if ($('f-stage').value) params.set('stage', $('f-stage').value);
  // When the selected period sits inside one payroll cycle, ask for that
  // cycle's monthly summary/targets instead of the latest-upload snapshot.
  {
    const cyc = v => { const d = new Date(v + 'T00:00:00Z'), y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
      const st = new Date(Date.UTC(day >= 21 ? y : (m === 0 ? y - 1 : y), day >= 21 ? m : (m === 0 ? 11 : m - 1), 21)); return st.toISOString().slice(0, 7); };
    const f = $('f-from').value, t = $('f-to').value;
    if (f && t && cyc(f) === cyc(t)) params.set('month', cyc(f));
  }

  try {
    const data = await api(`/api/employee/${encodeURIComponent(user.id)}?${params}`);
    const emp = data.employee, s = data.summary || {}, a = data.attendance || {};

    $('welcome-message').style.display = 'block';
    $('welcome-message').innerHTML = `
      <div class="employee-welcome-content">
        <div class="employee-welcome-copy">
          <span class="employee-welcome-eyebrow">لوحة الموظف</span>
          <h2>مرحباً بك في نظام الموظفين</h2>
          <p>كل بياناتك في مكان واحد</p>
          <span class="employee-welcome-name">أهلاً ${escapeHtml(emp.name)}، تابع بياناتك بسهولة من خلال لوحة واحدة.</span>
        </div>
        <div class="employee-welcome-features">
          <div class="employee-welcome-feature"><span class="welcome-feature-icon">✓</span><div><b>الحضور والانصراف</b><small>تابع سجل حضورك وغيابك وساعات العمل.</small></div></div>
          <div class="employee-welcome-feature"><span class="welcome-feature-icon">◷</span><div><b>الإجازات والأذونات</b><small>راجع إجازاتك وأذوناتك وحالتها بسهولة.</small></div></div>
          <div class="employee-welcome-feature"><span class="welcome-feature-icon">↗</span><div><b>الأداء والأهداف</b><small>تابع أهدافك ومستوى أدائك وتقدمك.</small></div></div>
          <div class="employee-welcome-feature"><span class="welcome-feature-icon">▤</span><div><b>التقارير والبيانات</b><small>اطّلع على بياناتك وتقاريرك بشكل واضح ومنظم.</small></div></div>
        </div>
      </div>`;

    // Render the employee information and performance cards.
    // Keep these tied to the canonical employee/summary record, while the
    // daily section below may show multiple shift snapshots independently.
    if ($('emp-info-card')) {
      $('emp-info-card').innerHTML = `
        <div class="info-item"><span>الاسم</span><b>${escapeHtml(emp.name)}</b></div>
        <div class="info-item"><span>ID</span><b>${escapeHtml(emp.id)}</b></div>
        <div class="info-item"><span>الشركة</span><b>${escapeHtml(emp.company || '—')}</b></div>
        <div class="info-item"><span>الشيفت</span><b>${escapeHtml(emp.shift || emp.target_shift || '—')}</b></div>
        <div class="info-item"><span>القسم</span><b>${escapeHtml(emp.department || '—')}</b></div>
        <div class="info-item"><span>الفئة</span><b>${escapeHtml(emp.education || '—')}</b></div>`;
    }

    // النسبة والإجمالي هنا = مجموع كل مرحلة على حدة (إنجازها ÷ تارجتها)،
    // ومجموع تارجت/إنجاز كل المراحل الحقيقي — مش قسمة s.total_achievement
    // على s.total_target الخام (رقم واحد مستورد من صف واحد بالشيت ومش
    // مرتبط بمجموع المراحل الفعلي، وده اللي كان بيظهر كرقم غريب زي 30000).
    const canonicalStageTargets = data.stageTargets || {};
    let canonicalAchievement = 0, canonicalTarget = 0, canonicalPercentSum = 0, canonicalHasPercent = false;
    Object.entries(data.stages || {}).forEach(([stageName, rows]) => {
      const isAttendance = String(stageName).trim() === 'الحضور';
      const isTotalRow = String(stageName).trim().toUpperCase() === 'TOTAL TARGET %';
      if (isAttendance || isTotalRow) return;
      const numericValues = (rows || []).map(r => Number(r.value)).filter(Number.isFinite);
      if (!numericValues.length) return;
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const target = Number(canonicalStageTargets[stageName]);
      canonicalAchievement += sum;
      if (Number.isFinite(target) && target > 0) {
        canonicalTarget += target;
        canonicalPercentSum += sum / target;
        canonicalHasPercent = true;
      }
    });
    const totalAchievementPercent = canonicalHasPercent ? canonicalPercentSum : (Number.isFinite(Number(s.percentage)) ? Number(s.percentage) : null);

    // "نسبة التارجت الشهري" في KPIs = النسبة الإجمالية (نفس نسبة التارجت
    // المعروضة في كارت الأداء) + إجمالي نسبة تارجت الإشراف. مثال: نسبة
    // إجمالية 10% + تارجت إشراف 9% => يظهر 19%.
    const supervisorMonthlyTargetTotal = Object.values(data.supervisorTargets || {})
      .flatMap(rows => rows || [])
      .reduce((sum, r) => {
        const n = Number(r?.targetMonthly);
        return Number.isFinite(n) ? sum + n : sum;
      }, 0);
    const hasSupervisorMonthlyTarget = Number.isFinite(supervisorMonthlyTargetTotal) && supervisorMonthlyTargetTotal !== 0;

    if ($('emp-perf-card')) {
      $('emp-perf-card').innerHTML = `
        <div class="info-item"><span>نسبة التارجت</span><b class="accent-value">${fmtPercent(totalAchievementPercent)}</b></div>
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
    }

    // Supervisor target details are employee-visible and follow the same
    // date filter currently selected on Home.
    renderSupervisorTargets(data.supervisorTargets || {});

    if ($('emp-kpi-grid')) {
      const presentDays = Number(s.total_present_days ?? a.present_days ?? 0);
      const absenceDays = Number(s.total_absence_days ?? s.total_absence ?? 0);
      const bonusTier = s.bonus_tier;
      const bonusTierNum = Number(bonusTier);
      const bonusTierDisplay = (bonusTier !== null && bonusTier !== undefined && bonusTier !== '' && Number.isFinite(bonusTierNum)) ? Math.round(bonusTierNum) : bonusTier;
      const overallPercent = canonicalHasPercent ? canonicalPercentSum : (Number.isFinite(Number(s.percentage)) ? Number(s.percentage) : null);
      const hasOverallPercent = Number.isFinite(overallPercent);
      const monthlyTargetPercent = (hasOverallPercent ? overallPercent : 0) + (hasSupervisorMonthlyTarget ? supervisorMonthlyTargetTotal : 0);
      const hasMonthlyTargetPercent = hasOverallPercent || hasSupervisorMonthlyTarget;
      const rawKpis = [
        { label: 'نسبة التارجت الشهري', raw: hasMonthlyTargetPercent ? monthlyTargetPercent : null, display: hasMonthlyTargetPercent ? fmtPercent(monthlyTargetPercent) : '—', cls: 'blue', icon: 'rate' },
        { label: 'أيام الحضور', raw: presentDays, display: fmtAttendanceNumber(presentDays), cls: 'teal', icon: 'present' },
        { label: 'أيام الغياب', raw: absenceDays, display: absenceDays, cls: 'amber', icon: 'absent' },
        { label: 'رقم الشريحة', raw: bonusTier, display: bonusTierDisplay, cls: 'purple', icon: 'chart' }
      ];
      // Hide only a genuinely missing bonus tier — zero values now display normally.
      const kpis = rawKpis.filter(k => k.raw !== null && k.raw !== undefined && k.raw !== '');
      $('emp-kpi-grid').innerHTML = kpis.map((k, i) =>
        kpiCard(k.label, k.display, k.cls, k.icon, KPI_TREND_SHAPES[i % KPI_TREND_SHAPES.length])
      ).join('');
    }

    // Duplicate-shift details: if the same employee was imported from more
    // than one shift, show every stored shift separately above its own table.
    // The employee profile/KPIs above remain tied to the canonical target shift.
    const shiftProfiles = Array.isArray(data.shiftProfiles) ? data.shiftProfiles : [];
    const selectedStage = $('f-stage')?.value || '__ALL__';
    const selectedFrom = $('f-from')?.value || '';
    const selectedTo = $('f-to')?.value || '';
    const inSelectedPeriod = date => (!selectedFrom || date >= selectedFrom) && (!selectedTo || date <= selectedTo);
    // stageTargets from the API is the per-stage monthly target pulled from
    // Master!AO for each stage (see employee_stage_targets on the backend).
    // Keep it alongside each stage's own snapshot target so every stage's
    // percentage below is computed against ITS OWN target, never the
    // employee's single overall total_target (that mismatch produced
    // percentages in the thousands).
    const globalStageTargets = data.stageTargets || {};
    const normalizedProfiles = shiftProfiles.map(p => {
      const stageMap = {};
      const stageTargetMap = {};
      (p.stages || []).forEach(st => {
        if (!st || !st.role) return;
         if (selectedStage !== '__ALL__' && selectedStage && st.role !== selectedStage) return;
         stageMap[st.role] = Object.entries(st.daily || {})
           .filter(([date]) => inSelectedPeriod(date))
           .map(([date, value]) => ({ date, value }));
         const ownTarget = Number(st.monthlyTarget);
         stageTargetMap[st.role] = Number.isFinite(ownTarget) && ownTarget > 0
           ? ownTarget
           : Number(globalStageTargets[st.role]) || null;
      });
      return { shift: p.shift || 'Other', stages: stageMap, stageTargets: stageTargetMap, summary: p.summary || {}, employee: p.employee || {} };
    });

    function renderShiftDetail(profile, showShiftHeading) {
      const allStageEntries = Object.entries(profile.stages || {});
      const totalTargetEntry = allStageEntries.find(([name]) => String(name).trim().toUpperCase() === 'TOTAL TARGET %');
      const stageEntries = allStageEntries.filter(([name, rows]) => {
        if (String(name).trim().toUpperCase() === 'TOTAL TARGET %') return false;
         // A secondary snapshot is the employee's proof of attendance in a
         // different shift. Keep that attendance row visible under Other,
         // while the canonical shift keeps its existing performance layout.
         if (String(name).trim() === 'الحضور' && profile.shift !== 'Other') return false;
        return (rows || []).some(r => r.value !== null && r.value !== undefined && r.value !== '');
      }).sort(([a], [b]) => String(a).localeCompare(String(b), 'ar'));

      const dateSet = new Set();
      stageEntries.forEach(([, rows]) => rows.forEach(r => dateSet.add(r.date)));
      if (totalTargetEntry) totalTargetEntry[1].forEach(r => dateSet.add(r.date));
      const dates = [...dateSet].sort();
       const head = '<th>المرحلة</th>' + dates.map(d => `<th><span class="detail-date-head"><span class="detail-day">${detailWeekday(d)}</span><strong class="detail-date">${escapeHtml(d.slice(8) + '/' + d.slice(5, 7))}</strong></span></th>`).join('') + '<th>الإجمالي</th><th>التارجت الشهري</th><th>نسبة الإنجاز</th><th>النسبة الإجمالية</th>';

      if (!stageEntries.length && !totalTargetEntry) {
        return `${showShiftHeading ? `<div class="shift-detail-heading"><span>تفاصيل Shift ${escapeHtml(profile.shift)}</span></div>` : ''}<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody><tr><td colspan="${dates.length + 4}"><div class="empty-state">لا توجد بيانات مطابقة.</div></td></tr></tbody></table></div>`;
      }

      // النسبة الإجمالية = تُحسب من الفترة المعروضة: مجموع نسب المراحل، ونسبة كل
      // مرحلة = إنجازها في الفترة ÷ تارجتها. كانت تُسحب جاهزة من s.percentage
      // (آخر دورة مستوردة) فلا تتغير بتغيّر الفترة أو الدورة المختارة.
      let overallPercentSum = 0, hasAnyStagePercent = false;
      let grandAchievement = 0, hasGrandAchievement = false;
      let grandTarget = 0, hasGrandTarget = false;

      const stageRows = stageEntries.map(([stageName, rows], idx) => {
        const byDate = Object.fromEntries(rows.map(r => [r.date, r.value]));
         let sum = 0, hasNum = false;
        const cells = dates.map(d => {
          const v = byDate[d];
          if (v === undefined || v === null || v === '') return '<td class="cell-empty">—</td>';
           const numericValue = Number(v);
           if (Number.isFinite(numericValue) && String(v).trim() !== '') { sum += numericValue; hasNum = true; return `<td class="cell-present">${fmtAttendanceNumber(numericValue)}</td>`; }
          return `<td class="cell-present">${escapeHtml(v)}</td>`;
        }).join('');
         const isAttendance = String(stageName).trim() === 'الحضور';
         // Each stage has its own monthly target (Master!AO for that stage's
         // row), not the employee's single overall total_target — use it here.
         const stageTarget = Number(profile.stageTargets?.[stageName]);
         const hasStageTarget = Number.isFinite(stageTarget) && stageTarget > 0;
         const stageRatio = !isAttendance && hasNum && hasStageTarget ? sum / stageTarget : null;

         if (stageRatio != null) { overallPercentSum += stageRatio; hasAnyStagePercent = true; }
         if (!isAttendance && hasNum) { grandAchievement += sum; hasGrandAchievement = true; }
         if (!isAttendance && hasStageTarget) { grandTarget += stageTarget; hasGrandTarget = true; }
         const stagePercent = stageRatio != null ? fmtPercent(stageRatio) : '—';
         const percentCell = `<td>${stagePercent === '—' ? '—' : coloredPercent(stageRatio)}</td>`;
         const targetCell = `<td>${hasStageTarget ? fmtAttendanceNumber(stageTarget) : '—'}</td>`;
         return `<tr><td><b>${escapeHtml(stageName)}</b></td>${cells}<td>${hasNum ? fmtAttendanceNumber(sum) : '—'}</td>${targetCell}${percentCell}</tr>`;
      });
      const overallStagePercent = hasAnyStagePercent ? overallPercentSum : null;

      if (totalTargetEntry) {
        const rows = totalTargetEntry[1] || [];
        const byDate = Object.fromEntries(rows.map(r => [r.date, r.value]));
        const cells = dates.map(d => {
          const v = byDate[d];
          if (v === undefined || v === null || v === '') return '<td class="cell-empty total-target-cell">—</td>';
          const n = Number(v);
           return Number.isFinite(n) ? `<td class="cell-present total-target-cell">${coloredPercent(n)}</td>` : `<td class="cell-present total-target-cell">${escapeHtml(v)}</td>`;
        }).join('');
         //  هنا = مجموع تارجت كل المراحل الحقيقي (grandTarget)،
         // مش summary.total_target الخام المستورد من صف واحد بس في الشيت
         // (ده اللي كان بيطلع رقم غريب زي 30000 مش له علاقة بمجموع المراحل).
         const grandTargetCell = hasGrandTarget ? fmtAttendanceNumber(grandTarget) : '—';
         const grandAchievementCell = hasGrandAchievement ? fmtAttendanceNumber(grandAchievement) : '—';
         const percentCellForTotalRow = overallStagePercent == null ? '<td>—</td>' : `<td>${coloredPercent(overallStagePercent)}</td>`;
        stageRows.push(`<tr class="total-target-master-row"><td><b> اليومي</b></td>${cells}<td><b>${grandAchievementCell}</b></td><td><b>${grandTargetCell}</b></td>${percentCellForTotalRow}</tr>`);
      }

      // بادج "النسبة الإجمالية" الأزرق جنب الجدول، بنفس شكل صفحة الأدمن.
      if (stageRows.length) {
        const merged = `<td class="detail-percentage-merged" rowspan="${stageRows.length}"><b>${coloredPercent(overallStagePercent)}</b><small>النسبة الإجمالية</small></td>`;
        stageRows[0] = stageRows[0].replace('</tr>', merged + '</tr>');
      }
      const table = `<div class="table-wrap shift-detail-table"><table><thead><tr>${head}</tr></thead><tbody>${stageRows.join('')}</tbody></table></div>`;

      return `${showShiftHeading ? `<div class="shift-detail-heading"><span>تفاصيل Shift ${escapeHtml(profile.shift)}</span></div>` : ''}<div class="daily-details-wrap">${table}</div>`;
    }

    const profilesToShow = normalizedProfiles.length > 1 ? normalizedProfiles : [{ shift: emp.shift || 'Other', stages: data.stages || {}, stageTargets: globalStageTargets, summary: s, employee: emp }];
    const duplicateShifts = normalizedProfiles.length > 1;
     const exportDates = [...new Set(profilesToShow.flatMap(p => Object.values(p.stages || {}).flatMap(rows => (rows || []).map(r => r.date))))].sort();
     const exportRows = profilesToShow.flatMap(profile => {
       return Object.entries(profile.stages || {}).map(([stage, rows]) => {
         const numericValues = (rows || []).map(r => Number(r.value)).filter(Number.isFinite);
         const total = numericValues.reduce((sum, value) => sum + value, 0);
         const isAttendance = String(stage).trim() === 'الحضور';
         // Same fix as the on-screen table: each stage's own target, not the
         // employee's single overall total_target.
         const stageTarget = Number(profile.stageTargets?.[stage]);
         const hasStageTarget = Number.isFinite(stageTarget) && stageTarget > 0;
         return {
           shift: profile.shift,
           stage,
           isAttendance,
           values: Object.fromEntries((rows || []).map(r => [r.date, r.value])),
           total: numericValues.length ? total : null,
           target: hasStageTarget ? stageTarget : null,
           percentage: !isAttendance && numericValues.length && hasStageTarget ? total / stageTarget : null,
         };
       });
     });
     //  والإنجاز الحقيقيين = مجموع كل المراحل (غير الحضور)،
     // مش summary.total_target/total_achievement الخام المستوردة من صف واحد
     // بس في الشيت (كانت بتطلع رقم غريب زي 30000 مش له علاقة بمجموع المراحل).
     const exportGrandAchievement = exportRows.filter(r => !r.isAttendance && r.total != null).reduce((sum, r) => sum + r.total, 0);
     const exportGrandTarget = exportRows.filter(r => !r.isAttendance && r.target != null).reduce((sum, r) => sum + r.target, 0);
     const exportGrandPercent = exportRows.filter(r => r.percentage != null).reduce((sum, r) => sum + r.percentage, 0);
     const exportHasPercent = exportRows.some(r => r.percentage != null);
     window.__iemsEmployeeDetailExport = {
       employee: emp,
       summary: s,
       grandAchievement: exportGrandAchievement,
       grandTarget: exportGrandTarget,
       grandPercent: exportHasPercent ? exportGrandPercent : null,
       from: $('f-from')?.value || '',
       to: $('f-to')?.value || '',
       dates: exportDates,
       rows: exportRows,
     };

     const downloadBlob = (blob, filename) => {
       const link = document.createElement('a');
       link.href = URL.createObjectURL(blob);
       link.download = filename;
       link.click();
       setTimeout(() => URL.revokeObjectURL(link.href), 1000);
     };
     const employeeExportTable = () => {
       const current = window.__iemsEmployeeDetailExport;
       const head = ['الشيفت', 'المرحلة', ...current.dates.map(fmtDate), 'الإجمالي', 'التارجت الشهري', 'نسبة الإنجاز'];
       const rows = current.rows.map(row => [
         row.shift,
         row.stage,
         ...current.dates.map(date => row.values[date] ?? ''),
         row.total ?? '',
         row.target ?? '',
         row.percentage === null ? '' : fmtPercent(row.percentage),
       ]);
       return { current, head, rows };
     };
     const exportEmployeeExcel = () => {
       const { current, head, rows } = employeeExportTable();
       const summaryRows = [
         ['الموظف', current.employee.name],
         ['ID', current.employee.id],
         ['الفترة', `${fmtDate(current.from)} → ${fmtDate(current.to)}`],
         ['النسبة الإجمالية', fmtPercent(current.grandPercent)],
         ['إجمالي الإنجاز', current.grandAchievement ?? ''],
         ['', current.grandTarget ?? ''],
         [],
         head,
         ...rows,
       ];
       if (window.XLSX) {
         const wb = XLSX.utils.book_new();
         const ws = XLSX.utils.aoa_to_sheet(summaryRows);
         ws['!cols'] = summaryRows[summaryRows.length - rows.length - 1].map((_, i) => ({ wch: Math.max(14, ...summaryRows.map(r => String(r[i] ?? '').length + 2).slice(0, 80)) }));
         XLSX.utils.book_append_sheet(wb, ws, 'تفاصيل الموظف');
         XLSX.writeFile(wb, `IEMS_Employee_${current.employee.id}_${current.from || 'all'}_${current.to || 'all'}.xlsx`);
         return;
       }
       const xmlEscape = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
       const xmlRows = summaryRows.map(row => `<Row>${row.map(value => `<Cell><Data ss:Type="${typeof value === 'number' ? 'Number' : 'String'}">${xmlEscape(value)}</Data></Cell>`).join('')}</Row>`).join('');
       const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="تفاصيل الموظف"><Table>${xmlRows}</Table></Worksheet></Workbook>`;
       downloadBlob(new Blob([xml], { type: 'application/vnd.ms-excel' }), `IEMS_Employee_${current.employee.id}.xls`);
     };
     const buildEmployeePdfRoot = () => {
       const { current, head, rows } = employeeExportTable();
       const root = document.createElement('div');
       root.id = 'employee-detail-pdf-root';
       root.dir = 'rtl';
       root.innerHTML = `<div class="employee-pdf-sheet"><h1>تفاصيل أداء الموظف</h1><p><b>${escapeHtml(current.employee.name)}</b> · ID ${escapeHtml(current.employee.id)} · ${fmtDate(current.from)} → ${fmtDate(current.to)}</p><div class="employee-pdf-summary"><span>نسبة التارجت: <b>${fmtPercent(current.grandPercent)}</b></span><span>الإنجاز: <b>${fmtNumber(current.grandAchievement)}</b></span><span>التارجت: <b>${fmtNumber(current.grandTarget)}</b></span></div><table><thead><tr>${head.map(cell => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
       document.body.appendChild(root);
       return root;
     };
     const exportEmployeePdf = async () => {
       const current = window.__iemsEmployeeDetailExport;
       if (!current) return;
       const root = buildEmployeePdfRoot();
       const cleanup = () => root.remove();
       if (!window.html2canvas || !window.jspdf) {
         const style = document.createElement('style');
         style.textContent = '@media print{@page{size:A4 landscape;margin:8mm}body>*:not(#employee-detail-pdf-root){display:none!important}#employee-detail-pdf-root{display:block!important}}';
         root.appendChild(style);
         const printWindow = window.open('', '_blank');
         if (printWindow) { printWindow.document.write(`<html><head><title>IEMS Employee Details</title></head><body>${root.innerHTML}</body></html>`); printWindow.document.close(); printWindow.focus(); setTimeout(() => printWindow.print(), 300); }
         cleanup();
         return;
       }
       try {
         const canvas = await html2canvas(root, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false });
         const { jsPDF } = window.jspdf;
         const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
         const margin = 8, pageW = 297, pageH = 210, imgW = pageW - margin * 2, imgH = canvas.height * imgW / canvas.width, usableH = pageH - margin * 2;
         let offset = 0, page = 0;
         while (offset < imgH) {
           if (page) pdf.addPage();
           const sourceY = Math.round(offset / imgH * canvas.height);
           const sourceH = Math.min(canvas.height - sourceY, Math.round(usableH / imgW * canvas.width));
           const slice = document.createElement('canvas');
           slice.width = canvas.width; slice.height = sourceH;
           slice.getContext('2d').drawImage(canvas, 0, sourceY, canvas.width, sourceH, 0, 0, canvas.width, sourceH);
           pdf.addImage(slice.toDataURL('image/jpeg', .92), 'JPEG', margin, margin, imgW, slice.height * imgW / slice.width);
           offset += usableH; page++;
         }
         pdf.save(`IEMS_Employee_${current.employee.id}_${current.from || 'all'}_${current.to || 'all'}.pdf`);
       } finally { cleanup(); }
     };
     if ($('employee-detail-excel')) $('employee-detail-excel').onclick = exportEmployeeExcel;
     if ($('employee-detail-pdf')) $('employee-detail-pdf').onclick = exportEmployeePdf;

    const detailPanel = $('detail-panel');
    const targetShiftBanner = $('target-shift-banner');
    if (targetShiftBanner) {
      // Old Target Shift banner is intentionally removed. For duplicates,
      // headings such as "تفاصيل Shift Other" and "تفاصيل Shift B" are shown.
      targetShiftBanner.style.display = 'none';
      targetShiftBanner.innerHTML = '';
    }
    if (detailPanel) detailPanel.classList.toggle('has-duplicate-shifts', duplicateShifts);

    $('detail-head').innerHTML = '';
    $('detail-body').innerHTML = profilesToShow.map(p => renderShiftDetail(p, duplicateShifts)).join('');

    // Employee-only home: hide admin attendance analytics and company summaries.
    if (employeeOnly) {
      ['company-summary-panel','daily-panel','single-company-chart','employee-detail-panel','modern-dashboard','overview-grid'].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = 'none';
      });
    }
  } catch (e) { $('emp-info-card').innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`; }
}

function renderSupervisorTargets(bySection) {
  const panel = $('supervisor-target-panel');
  const container = $('supervisor-target-container');
  if (!panel || !container) return;
  const sections = Object.entries(bySection || {});
  if (!sections.length) { panel.style.display = 'none'; container.innerHTML = ''; return; }
  panel.style.display = 'block';
  container.innerHTML = sections.map(([sectionName, rows]) => {
    const metricNames = [...new Set((rows || []).flatMap(r => Object.keys(r.metrics || {})))];
    const head = `<th>التاريخ</th>${metricNames.map(m => `<th>${escapeHtml(m)}</th>`).join('')}<th>التارجت اليومي</th><th>التارجت الشهري</th>`;
    const totals = {};
    let totalDaily = 0, totalMonthly = 0, hasDaily = false, hasMonthly = false;
    metricNames.forEach(m => totals[m] = 0);
    const bodyRows = (rows || []).map(r => {
      const metricCells = metricNames.map(m => {
        const n = Number(r.metrics && r.metrics[m]);
        if (Number.isFinite(n)) totals[m] += n;
        return r.metrics && r.metrics[m] != null ? `<td>${Number.isFinite(n) ? fmtNumber(n) : escapeHtml(r.metrics[m])}</td>` : '<td>—</td>';
      }).join('');
      const dailyN = Number(r.targetDaily);
      const monthlyN = Number(r.targetMonthly);
      if (Number.isFinite(dailyN)) { totalDaily += dailyN; hasDaily = true; }
      if (Number.isFinite(monthlyN)) { totalMonthly += monthlyN; hasMonthly = true; }
      return `<tr><td>${escapeHtml(r.date)}</td>${metricCells}<td>${Number.isFinite(dailyN) ? fmtPercent(dailyN) : '—'}</td><td>${Number.isFinite(monthlyN) ? fmtPercent(monthlyN) : '—'}</td></tr>`;
    });
    const totalMetricCells = metricNames.map(m => `<td><b>${totals[m] ? fmtNumber(totals[m]) : '—'}</b></td>`).join('');
    const totalRow = `<tr class="supervisor-total-row"><td><b>الإجمالي</b></td>${totalMetricCells}<td><b>${hasDaily ? fmtPercent(totalDaily) : '—'}</b></td><td><b>${hasMonthly ? fmtPercent(totalMonthly) : '—'}</b></td></tr>`;
    return `
      <div class="supervisor-target-section">
        <h3>${escapeHtml(sectionName)}</h3>
        <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${bodyRows.join('')}${totalRow}</tbody></table></div>
      </div>`;
  }).join('');
}

async function refreshDashboard() {
  const from = $('f-from').value, to = $('f-to').value;
  if (from && to && from > to) { alert('تاريخ البداية يجب أن يسبق تاريخ النهاية.'); return; }
  const params = new URLSearchParams(); if (from) params.set('from', from); if (to) params.set('to', to); params.set('stage', $('f-stage').value || '__ALL__');
  if ($('f-shift') && $('f-shift').value && $('f-shift').value !== '__ALL__') params.set('shift', $('f-shift').value);
  try {
    const data = await api(`/api/employee/dashboard?${params}`);
    // Top-5 moved to Reports.
    renderModernDashboard(data);
    await Promise.all([renderOverview(), loadSelfView(data)]);
  } catch (e) { const err=$('rep-error') || $('attendance-error'); if(err){ err.textContent=escapeHtml(e.message); err.style.display='block'; } console.error(e); }
}

(async function boot() {
  // Attendance owns the visible date/filter bar on the unified home page.
  // Do not fire an independent all-period dashboard request here: that
  // request can race with app-attendance.js and overwrite the user's
  // selected date range with the first/last available dates.
  await initFilters();
})();

window.__iemsDashboardRefresh = refreshDashboard;
})();

(()=>{
const token=sessionStorage.getItem('iems_token'),raw=sessionStorage.getItem('iems_user');if(!token||!raw){location.href='/index.html';return}const user=JSON.parse(raw),$=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),num=v=>{const n=Number(v||0);return Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}):'0'},pct=v=>`${Math.round(Number(v||0))}%`,api=async p=>{const r=await fetch(p,{headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}});if(r.status===401){sessionStorage.clear();location.href='/index.html';throw Error('انتهت الجلسة')}const d=await r.json();if(!r.ok)throw Error(d.error||'حدث خطأ');return d};
let dates=[],data=null;
// Payroll cycle (21st -> 20th) that contains a YYYY-MM-DD date.
const iemsCycle=v=>{const d=new Date(v+'T00:00:00Z'),y=d.getUTCFullYear(),m=d.getUTCMonth(),day=d.getUTCDate();const st=new Date(Date.UTC(day>=21?y:(m===0?y-1:y),day>=21?m:(m===0?11:m-1),21));const en=new Date(Date.UTC(st.getUTCFullYear(),st.getUTCMonth()+1,20));return{start:st.toISOString().slice(0,10),end:en.toISOString().slice(0,10)}};
const iso=d=>{const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)},fmtDate=v=>{if(!v)return'—';const[a,b,c]=v.split('-');return`${c}/${b}/${a}`},day=v=>new Date(v+'T00:00:00').toLocaleDateString('ar-EG',{weekday:'long'});
const fill=(id,vals,label)=>{const s=$(id),cur=s.value;s.innerHTML=`<option value="__ALL__">${label}</option>`+(vals||[]).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');const keep=(vals||[]).includes(cur)&&cur!=='__ALL__'?cur:'__ALL__';[...s.options].forEach(o=>o.selected=o.value===keep)};
async function init(){const m=await api('/api/attendance/meta');dates=m.dates||[];fill('att-company',m.companies,'كل الشركات');fill('att-department',m.departments,'كل المراحل');fill('att-shift',m.shifts,'كل الشيفتات');if(dates.length){const first=dates[0],last=dates.at(-1);$('att-from').min=first;$('att-from').max=last;$('att-to').min=first;$('att-to').max=last;
  // Home starts with the full imported period. The user chooses the date range;
  // do not silently force today's date or a 7-day window.
  $('att-from').value=first; $('att-to').value=last;
  // Every uploaded month is kept, so "all data" would add all months together.
  // Default to the latest payroll cycle only (last uploaded cycle) for
  // everyone, admin included — they can still widen the range manually.
  {const c=iemsCycle(last);$('att-from').value=c.start<first?first:c.start;$('att-to').value=c.end>last?last:c.end}
}}
const values=id=>{const el=$(id);if(!el)return[];if(el.multiple)return [...el.selectedOptions].map(o=>o.value).filter(v=>v&&v!=='__ALL__');const v=el.value;return v&&v!=='__ALL__'?[v]:[]};
const params=()=>{const p=new URLSearchParams();[['from','att-from'],['to','att-to']].forEach(([k,id])=>{const v=$(id)?.value;if(v)p.set(k,v)});[['company','att-company'],['department','att-department'],['shift','att-shift'],['status','att-status']].forEach(([k,id])=>values(id).forEach(v=>p.append(k,v)));const q=$('att-search')?.value?.trim();if(q)p.set('search',q);return p};
const clearMulti=id=>{const el=$(id);if(!el)return;[...el.options].forEach(o=>o.selected=false);if(el.options[0])el.options[0].selected=true};
const bindMulti=()=>document.querySelectorAll('[data-multi-filter="true"]').forEach(el=>el.addEventListener('change',()=>{const picked=[...el.selectedOptions].map(o=>o.value);if(picked.includes('__ALL__')&&picked.length>1)[...el.options].forEach(o=>o.selected=o.value==='__ALL__');else if(picked.some(v=>v!=='__ALL__'))[...el.options].forEach(o=>{if(o.value==='__ALL__')o.selected=false})}));
// Icon set, sparkline renderer and card markup all come from the Home
// script above (window.__iemsKpi) — this row used to carry its own
// near-duplicate copies of all three; now there is one implementation.
function kpis(t){
  if(!$('attendance-kpis'))return;
  const shared=window.__iemsKpi;
  // 5th element = the status filter value the card drills into ('' = all
  // statuses) and 6th = the panel to scroll to once the data is refreshed.
  const rows=[
    ['إجمالي الحضور',t.present,'present','present','present','employee-detail-panel'],
    ['نسبة الحضور',pct(t.attendance_rate),'rate','rate','','daily-panel'],
    ['إجمالي الغياب',t.absent,'absent','absent','absent','employee-detail-panel'],
    ['نسبة الغياب',pct(t.total?t.absent/t.total*100:0),'absence-rate','rate','absent','daily-panel'],
    ['الغياب بدون إذن',t.unauthorized,'unauthorized','unauthorized','unauthorized','employee-detail-panel']
  ];
  // Keep all 12 Home KPIs in ONE grid: 7 overview cards + 5 attendance cards.
  // The old implementation rendered them in two separate grids, which made
  // the desktop layout break into inconsistent rows.
  const target=$('kpi-grid');
  if(!target)return;
  // Own only the attendance-scoped cards: remove the previous set before
  // appending so re-running this on every filter/refresh replaces them
  // instead of piling up duplicates, and so the admin overview cards
  // rendered by renderKpis() (above in this file) are never touched.
  target.querySelectorAll('[data-kpi-scope="attendance"]').forEach(el=>el.remove());
  const cards=rows.map((x,i)=>{
    const [label,val,cls,icon,status,panel]=x;
    const value=typeof val==='string'?val:num(val);
    const h=shared.kpiCard(label,value,cls,icon,shared.KPI_TREND_SHAPES[i % shared.KPI_TREND_SHAPES.length]);
    return `<div class="kpi-link-wrap" data-kpi-scope="attendance" data-kpi-status="${status}" data-kpi-panel="${panel}" role="button" tabindex="0" title="عرض التفاصيل">${h}</div>`;
  }).join('');
  target.insertAdjacentHTML('beforeend',cards);
  // These cards used to be inert (cursor:pointer but no handler). Clicking one
  // now applies the matching status filter to the attendance data below,
  // refreshes it and scrolls to the relevant table.
  target.querySelectorAll('[data-kpi-scope="attendance"]').forEach(c=>{
    const go=async()=>{
      const st=c.dataset.kpiStatus||'',panelId=c.dataset.kpiPanel;
      const sel=$('att-status');
      if(sel){[...sel.options].forEach(o=>{o.selected=st?o.value===st:o.value==='__ALL__'})}
      try{await refresh()}catch(_){}
      const panel=$(panelId);
      if(panel&&panel.style.display!=='none')panel.scrollIntoView({behavior:'smooth',block:'start'});
    };
    c.onclick=go;
    c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}};
  });
  const attendance=$('attendance-kpis');
  if(attendance) attendance.innerHTML='';
}
function line(rows){const s=$('attendance-line-chart');if(!s)return;if(!rows.length){s.innerHTML='<text x="450" y="165" text-anchor="middle" class="att-axis-text">لا توجد بيانات</text>';return}const W=900,H=330,L=48,R=20,T=18,B=44,pw=W-L-R,ph=H-T-B,x=i=>L+(rows.length===1?pw/2:i/(rows.length-1)*pw),y=v=>T+ph-(Math.max(0,Math.min(100,+v||0))/100)*ph;let g=[0,25,50,75,100].map(v=>`<line x1="${L}" y1="${y(v)}" x2="${W-R}" y2="${y(v)}" class="att-grid-line"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" class="att-axis-text">${v}%</text>`).join(''),path=k=>rows.map((r,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(r[k]).toFixed(1)}`).join(' '),dots=(k,c)=>rows.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r[k])}" r="4" class="${c}"/>`).join(''),labels=rows.map((r,i)=>`<text x="${x(i)}" y="${H-14}" text-anchor="middle" class="att-axis-text">${esc(r.date.slice(5))}</text>`).join('');s.innerHTML=g+`<path d="${path('attendance_rate')}" class="att-present-line"/><path d="${path('absence_rate')}" class="att-absent-line"/>${dots('attendance_rate','att-present-dot')}${dots('absence_rate','att-absent-dot')}${labels}`}
function bars(id,rows){const e=$(id),a=(rows||[]).slice(0,10);if(!e)return;if(!a.length){e.innerHTML='<div class="empty-attendance">لا توجد بيانات</div>';return}e.innerHTML=a.map(r=>{const t=+r.present+(+r.absent),p=t?(+r.present/t*100):0;return`<div class="bar-row"><span class="bar-label" title="${esc(r.name)}">${esc(r.name)}</span><div class="bar-track"><span class="bar-segment bar-present" style="width:${p}%"></span><span class="bar-segment bar-absent" style="width:${100-p}%"></span></div><span class="bar-value">${num(t)}</span></div>`}).join('')}
function company(rows){const body=$('company-summary-body');if(!body)return;const total=rows.reduce((a,r)=>{a.employee_count+=+r.employee_count||0;a.present+=+r.present||0;a.absent+=+r.absent||0;a.gp+=+r.graduate_present||0;a.ga+=+r.graduate_absent||0;a.sp+=+r.student_present||0;a.sa+=+r.student_absent||0;return a},{employee_count:0,present:0,absent:0,gp:0,ga:0,sp:0,sa:0});const trs=rows.map(r=>{const tt=(+r.present||0)+(+r.absent||0);const ar=tt?(+r.present/tt*100):0;return`<tr><td><b>${esc(r.name)}</b></td><td>${num(r.employee_count)}</td><td class="att-status-present">${num(r.present)}</td><td class="att-status-absent">${num(r.absent)}</td><td class="att-status-present">${num(r.graduate_present)}</td><td class="att-status-absent">${num(r.graduate_absent)}</td><td class="att-status-present">${num(r.student_present)}</td><td class="att-status-absent">${num(r.student_absent)}</td><td>${pct(ar)}</td></tr>`}).join('');const tt=total.present+total.absent;const ar=tt?total.present/tt*100:0;body.innerHTML=(trs||'<tr><td colspan="9" class="empty-attendance">لا توجد بيانات</td></tr>')+`<tr class="summary-total-row"><td><b>الإجمالي</b></td><td><b>${num(total.employee_count)}</b></td><td class="att-status-present"><b>${num(total.present)}</b></td><td class="att-status-absent"><b>${num(total.absent)}</b></td><td class="att-status-present"><b>${num(total.gp)}</b></td><td class="att-status-absent"><b>${num(total.ga)}</b></td><td class="att-status-present"><b>${num(total.sp)}</b></td><td class="att-status-absent"><b>${num(total.sa)}</b></td><td><b>${pct(ar)}</b></td></tr>`}
function employees(rows){$('employee-detail-summary').textContent=`${num(rows.length)} موظف · الفترة ${fmtDate(data.range.from)} إلى ${fmtDate(data.range.to)}`;$('employee-detail-body').innerHTML=rows.length?rows.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.id)}</td><td>${esc(r.company||'—')}</td><td>${esc(r.shift||'—')}</td><td>${esc(r.department||'—')}</td><td class="att-status-present">${num(r.present)}</td><td class="att-status-absent">${num(r.absent)}</td><td class="att-status-casual">${num(r.casual)}</td><td class="att-status-permission">${num(r.permission)}</td><td class="att-status-absent">${num(r.unauthorized)}</td><td class="att-status-medical">${num(r.medical)}</td><td>${pct(r.attendance_rate)}</td></tr>`).join(''):'<tr><td colspan="12" class="empty-attendance">لا توجد بيانات مطابقة</td></tr>'}
function daily(rows){$('daily-body').innerHTML=rows.length?rows.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${day(r.date)}</td><td class="att-status-present">${num(r.present)}</td><td class="att-status-absent">${num(r.absent)}</td><td class="att-status-casual">${num(r.casual)}</td><td class="att-status-permission">${num(r.permission)}</td><td class="att-status-absent">${num(r.unauthorized)}</td><td class="att-status-medical">${num(r.medical)}</td><td>${pct(r.attendance_rate)}</td></tr>`).join(''):'<tr><td colspan="9" class="empty-attendance">لا توجد بيانات</td></tr>'}
function renderAlarm(rows){const panel=$('unauthorized-absence-panel'),list=$('unauthorized-absence-list'),count=$('absence-count');if(!panel||!list)return;const alarm=(rows||[]).filter(r=>(+r.unauthorized||0)>2);panel.style.display=alarm.length?'block':'none';if(count)count.textContent=`${alarm.length.toLocaleString('en-US')} موظف`;list.innerHTML=alarm.map(r=>`<tr><td><div class="absence-person"><div class="absence-avatar">${esc((r.name||'?').trim().charAt(0)||'?')}</div><div><b>${esc(r.name)}</b><span>ID #${esc(r.id)}</span></div></div></td><td>${esc(r.company||'—')}</td><td><span class="absence-shift">${esc(r.shift||'—')}</span></td><td><strong class="absence-days">${num(r.unauthorized)}</strong></td></tr>`).join('')}
function render(d){data=d;$('range-badge').textContent=`${fmtDate(d.range.from)}  →  ${fmtDate(d.range.to)}`;kpis(d.totals);renderAlarm(d.employees||[]);bars('company-bar-chart',d.companies);company(d.companies||[]);employees(d.employees||[]);daily(d.daily||[]);window.dispatchEvent(new Event('iems:tables-updated'))}
function syncDashboardFilters(){
 const map=[['att-from','f-from'],['att-to','f-to'],['att-department','f-stage'],['att-shift','f-shift']];
 map.forEach(([a,b])=>{const x=$(a),y=$(b);if(x&&y){y.value=x.value||'__ALL__';}});
 // Keep the hidden dashboard bridge exactly equal to the visible dates.
 // The visible attendance filter is the single source of truth on Home.
}
async function refresh(){const f=$('att-from').value,t=$('att-to').value;if(f&&t&&f>t){alert('تاريخ البداية يجب أن يسبق تاريخ النهاية.');return}try{const selected=await api('/api/attendance?'+params());render(selected);syncDashboardFilters();window.__iemsDashboardRefresh?.()}catch(e){$('employee-detail-body').innerHTML=`<tr><td colspan="11" class="empty-attendance">${esc(e.message)}</td></tr>`}}
function range(k){if(!dates.length)return;const last=dates.at(-1),d=new Date(last+'T00:00:00');if(k==='month'){const c=iemsCycle(last);$('att-from').value=c.start<dates[0]?dates[0]:c.start;$('att-to').value=c.end>last?last:c.end}else if(k==='all'){$('att-from').value=dates[0];$('att-to').value=last}else if(k==='today'){$('att-from').value=last;$('att-to').value=last}else{const x=new Date(d);x.setDate(d.getDate()-(k==='week'?6:30));$('att-from').value=iso(x);$('att-to').value=last}}
if($('attendance-apply'))$('attendance-apply').onclick=refresh;
if(!$('attendance-apply')){const host=document.querySelector('.attendance-apply-row')||document.querySelector('.attendance-filter-head-actions');if(host){const btn=document.createElement('button');btn.className='apply-btn filter-apply attendance-apply attendance-apply-full';btn.id='attendance-apply';btn.type='button';btn.title='عرض النتائج';btn.setAttribute('aria-label','عرض النتائج');btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg><span>عرض النتائج</span>';host.appendChild(btn);btn.onclick=refresh;}}$('attendance-reset').onclick=async()=>{['att-company','att-department','att-shift','att-status'].forEach(clearMulti);$('att-search').value='';const first=dates[0],last=dates.at(-1);if(first&&last){$('att-from').value=first;$('att-to').value=last}await refresh()};$('att-from').onchange=()=>{if($('att-to').value&&$('att-from').value>$('att-to').value)$('att-to').value=$('att-from').value};document.querySelectorAll('.quick-ranges button[data-range]').forEach(b=>b.onclick=async()=>{range(b.dataset.range);await refresh()});function exportExcel(){if(!data){return}
if(!window.XLSX){
  // Dependency-free Excel-compatible fallback (.xls / SpreadsheetML).
  const escXml=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const sheet=(name,rows)=>`<Worksheet ss:Name="${escXml(name)}"><Table>${rows.map((r,ri)=>`<Row>${r.map(v=>`<Cell><Data ss:Type="${typeof v==='number'?'Number':'String'}">${escXml(v)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet>`;
  const totals=[['البند','القيمة'],['إجمالي الموظفين',data.totals.employee_count],['الحضور',data.totals.present],['الغياب',data.totals.absent],['غياب بدون إذن',data.totals.unauthorized],['مرضي',data.totals.medical],['نسبة الحضور',Number(data.totals.attendance_rate||0).toFixed(1)+'%']];
  const companies=[['الشركة','عدد الموظفين','الحضور','الغياب','حضور الخريجين','غياب الخريجين','حضور الطلاب','غياب الطلاب','نسبة الحضور'],...(data.companies||[]).map(r=>{const p=+r.present||0,a=+r.absent||0,t=p+a;return[r.name,r.employee_count,p,a,r.graduate_present,r.graduate_absent,r.student_present,r.student_absent,(t?p/t*100:0).toFixed(1)+'%']})];
  const employees=[['الموظف','ID','الشركة','الشيفت','المرحلة','إجمالي الحضور','إجمالي الغياب','إجازة عارضة','إجازة بإذن','إجازة بدون إذن','إجازة مرضي','نسبة الحضور'],...(data.employees||[]).map(r=>[r.name,r.id,r.company,r.shift,r.department,r.present,r.absent,r.casual,r.permission,r.unauthorized,r.medical,(+r.attendance_rate||0).toFixed(1)+'%'])];
  const daily=[['التاريخ','اليوم','الإجمالي الحضور','إجمالي الغياب','إجازة عارضة','إجازة بإذن','إجازة بدون إذن','إجازة مرضي','نسبة الحضور'],...(data.daily||[]).map(r=>[fmtDate(r.date),day(r.date),r.present,r.absent,r.casual,r.permission,r.unauthorized,r.medical,(+r.attendance_rate||0).toFixed(1)+'%'])];
  const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>${sheet('ملخص',totals)}${sheet('الشركات',companies)}${sheet('الموظفون',employees)}${sheet('يومي',daily)}</Workbook>`;
  const blob=new Blob([xml],{type:'application/vnd.ms-excel'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`IEMS_Attendance_${data.range.from}_${data.range.to}.xls`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return;
}const wb=XLSX.utils.book_new();const totals=[['البند','القيمة'],['إجمالي الموظفين',data.totals.employee_count],['الحضور',data.totals.present],['الغياب',data.totals.absent],['غياب بدون إذن',data.totals.unauthorized],['مرضي',data.totals.medical],['نسبة الحضور',Number(data.totals.attendance_rate||0).toFixed(1)+'%']];const companies=[['الشركة','عدد الموظفين','الحضور','الغياب','حضور الخريجين','غياب الخريجين','حضور الطلاب','غياب الطلاب','نسبة الحضور'],...(data.companies||[]).map(r=>{const p=+r.present||0,a=+r.absent||0,t=p+a;return[r.name,r.employee_count,p,a,r.graduate_present,r.graduate_absent,r.student_present,r.student_absent,(t?p/t*100:0).toFixed(1)+'%']})];const employees=[['الموظف','ID','الشركة','الشيفت','المرحلة','إجمالي الحضور','إجمالي الغياب','إجازة عارضة','إجازة بإذن','إجازة بدون إذن','إجازة مرضي','نسبة الحضور'],...(data.employees||[]).map(r=>[r.name,r.id,r.company,r.shift,r.department,r.present,r.absent,r.casual,r.permission,r.unauthorized,r.medical,(+r.attendance_rate||0).toFixed(1)+'%'])];const daily=[['التاريخ','اليوم','الإجمالي الحضور','إجمالي الغياب','إجازة عارضة','إجازة بإذن','إجازة بدون إذن','إجازة مرضي','نسبة الحضور'],...(data.daily||[]).map(r=>[fmtDate(r.date),day(r.date),r.present,r.absent,r.casual,r.permission,r.unauthorized,r.medical,(+r.attendance_rate||0).toFixed(1)+'%'])];[['ملخص',totals],['ملخص الشركات',companies],['الموظفون',employees],['يومي',daily]].forEach(([name,rows])=>{const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=rows[0].map((_,i)=>({wch:Math.max(12,...rows.map(r=>String(r[i]??'').length+2).slice(0,80))}));XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31))});XLSX.writeFile(wb,`IEMS_Attendance_${data.range.from}_${data.range.to}.xlsx`)}
function buildPdfRoot(){const root=document.createElement('div');root.id='attendance-pdf-root';root.dir='rtl';root.innerHTML=`<div class="att-pdf-sheet"><div class="att-pdf-head"><img src="logo.png" alt="IEMS"><div><h1>تقرير الحضور والغياب</h1><p>${fmtDate(data.range.from)} → ${fmtDate(data.range.to)}</p></div></div><div class="att-pdf-summary"><span>الموظفون: <b>${num(data.totals.employee_count)}</b></span><span>الحضور: <b>${num(data.totals.present)}</b></span><span>الغياب: <b>${num(data.totals.absent)}</b></span><span>نسبة الحضور: <b>${pct(data.totals.attendance_rate)}</b></span></div><h2>ملخص الشركات</h2>${pdfTable([['الشركة','عدد الموظفين','الحضور','الغياب','حضور الخريجين','غياب الخريجين','حضور الطلاب','غياب الطلاب','نسبة الحضور'],...(data.companies||[]).map(r=>{const p=+r.present||0,a=+r.absent||0,t=p+a;return[r.name,r.employee_count,p,a,r.unauthorized,r.medical,t,pct(t?p/t*100:0),pct(t?a/t*100:0)]})])}<h2>التفاصيل اليومية للموظفين</h2>${pdfTable([['الموظف','ID','الشركة','الشيفت','المرحلة','إجمالي الحضور','إجمالي الغياب','إجازة عارضة','إجازة بإذن','إجازة بدون إذن','إجازة مرضي','نسبة الحضور'],...(data.employees||[]).map(r=>[r.name,r.id,r.company,r.shift,r.department,r.present,r.absent,r.casual,r.permission,r.unauthorized,r.medical,pct(r.attendance_rate)])])}<h2>الحضور يوم بيوم</h2>${pdfTable([['التاريخ','اليوم','الإجمالي الحضور','إجمالي الغياب','إجازة عارضة','إجازة بإذن','إجازة بدون إذن','إجازة مرضي','نسبة الحضور'],...(data.daily||[]).map(r=>[fmtDate(r.date),day(r.date),r.present,r.absent,r.casual,r.permission,r.unauthorized,r.medical,pct(r.attendance_rate)])])}</div>`;document.body.appendChild(root);return root}
function pdfTable(rows){return`<table class="att-pdf-table"><thead><tr>${rows[0].map(v=>`<th>${esc(v)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
async function exportPdf(){if(!data){return}
if(!window.html2canvas||!window.jspdf){
  // Reliable fallback when external PDF libraries are unavailable: open a print-ready A4 report.
  const root=buildPdfRoot();
  const style=document.createElement('style');style.textContent='@media print{@page{size:A4 landscape;margin:8mm}body>*:not(#attendance-pdf-root){display:none!important}#attendance-pdf-root{display:block!important;position:static!important} .att-pdf-sheet{width:100%!important}}';root.appendChild(style);
  const w=window.open('','_blank'); if(w){w.document.write('<html><head><title>IEMS Attendance Report</title></head><body>'+root.innerHTML+'</body></html>');w.document.close();w.focus();setTimeout(()=>w.print(),300);}
  root.remove(); return;
}const btn=$('attendance-pdf');btn.disabled=true;btn.dataset.original=btn.textContent;btn.textContent='جاري إنشاء PDF...';let root;try{root=buildPdfRoot();const canvas=await html2canvas(root,{scale:2,backgroundColor:'#fff',useCORS:true,logging:false});const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'landscape'});const pageW=297,pageH=210,margin=8,imgW=pageW-margin*2,imgH=canvas.height*imgW/canvas.width,usableH=pageH-margin*2;let offset=0,page=0;while(offset<imgH){if(page)pdf.addPage();const sourceY=Math.round(offset/imgH*canvas.height);const sourceH=Math.min(canvas.height-sourceY,Math.round(usableH/imgW*canvas.width));const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=sourceH;slice.getContext('2d').drawImage(canvas,0,sourceY,canvas.width,sourceH,0,0,canvas.width,sourceH);const sliceH=slice.height*imgW/slice.width;pdf.addImage(slice.toDataURL('image/jpeg',0.92),'JPEG',margin,margin,imgW,sliceH);offset+=usableH;page++}pdf.save(`IEMS_Attendance_${data.range.from}_${data.range.to}.pdf`)}catch(e){console.error(e);alert('حدث خطأ أثناء إنشاء ملف PDF.')}finally{root?.remove();btn.disabled=false;btn.textContent=btn.dataset.original||'تحميل PDF'}}
$('attendance-print').onclick=()=>print();$('attendance-excel').onclick=exportExcel;$('attendance-pdf').onclick=exportPdf;
// loadSystemBanner() is defined in the first IIFE above, so calling it from
// inside this second, separately-scoped IIFE threw ReferenceError and aborted
// this whole boot sequence — no filters, no data, empty home page. It is now
// shared deliberately via window.__iemsLoadSystemBanner.
(async()=>{try{bindMulti();await (window.__iemsLoadSystemBanner?.());await init();await refresh()}catch(e){console.error(e)}})();
})();
