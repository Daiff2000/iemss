// ---- Welcome splash screen (shown once, right after login) ----
(() => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  if (path !== 'home.html') return;
  if (sessionStorage.getItem('iems_show_welcome') !== '1') return;
  sessionStorage.removeItem('iems_show_welcome');

  let user = null;
  try { user = JSON.parse(sessionStorage.getItem('iems_user') || 'null'); } catch (_) {}
  const isDark = document.documentElement.dataset.theme === 'dark' || (localStorage.getItem('iems-theme') === 'dark');
  const name = (user && user.name) ? user.name : '';
  const roleLabel = user && user.role === 'admin' ? 'مدير النظام' : user && user.role === 'supervisor' ? 'مشرف' : 'موظف';

  const style = document.createElement('style');
  style.textContent = `
    #iems-splash{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;
      background:${isDark ? 'linear-gradient(135deg,#0b1220,#101a2e)' : 'linear-gradient(135deg,#065bab,#0a8fd8)'};
      animation:iemsSplashOut .6s ease-in 1.7s forwards;}
    #iems-splash .iems-splash-logo{display:flex;align-items:center;justify-content:center;
      animation:iemsSplashPop .55s cubic-bezier(.34,1.56,.64,1) both;}
    #iems-splash .iems-splash-logo img{width:auto;height:54px;max-width:220px;object-fit:contain;filter:drop-shadow(0 12px 26px rgba(0,0,0,.35))}
    #iems-splash h1{color:#fff;font-family:'Cairo',sans-serif;font-size:22px;font-weight:900;margin:0;opacity:0;animation:iemsSplashFade .5s ease .25s forwards}
    #iems-splash p{color:rgba(255,255,255,.85);font-family:'Cairo',sans-serif;font-size:13px;margin:0;opacity:0;animation:iemsSplashFade .5s ease .4s forwards}
    #iems-splash .iems-splash-dots{display:flex;gap:6px;opacity:0;animation:iemsSplashFade .5s ease .55s forwards}
    #iems-splash .iems-splash-dots span{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.85);animation:iemsSplashBlink 1.1s ease-in-out infinite}
    #iems-splash .iems-splash-dots span:nth-child(2){animation-delay:.15s}
    #iems-splash .iems-splash-dots span:nth-child(3){animation-delay:.3s}
    @keyframes iemsSplashPop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes iemsSplashFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes iemsSplashBlink{0%,80%,100%{opacity:.3}40%{opacity:1}}
    @keyframes iemsSplashOut{to{opacity:0;visibility:hidden}}
  `;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'iems-splash';
  el.innerHTML = `
    <div class="iems-splash-logo"><img src="logo-dark.png" alt="IEMS"></div>
    <h1>أهلاً بك${name ? '، ' + name : ''} 👋</h1>
    <p>${roleLabel} · جارٍ تجهيز لوحة التحكم...</p>
    <div class="iems-splash-dots"><span></span><span></span><span></span></div>
  `;
  el.addEventListener('click', () => el.remove());
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(el));
  if (document.readyState !== 'loading') document.body.appendChild(el);
  setTimeout(() => { if (el.isConnected) el.remove(); }, 2500);
})();

(() => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const userRaw = sessionStorage.getItem('iems_user');
  let user = null;
  try { user = userRaw ? JSON.parse(userRaw) : null; } catch (_) {}

  const nav = document.querySelector('.main-nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('.nav-item')];
  links.forEach(a => {
    const href = a.getAttribute('href') || '';
    const target = href.split('/').pop().split('#')[0];
    const active = target === path || (path === '' && target === 'home.html');
    a.classList.toggle('active', active);
    a.setAttribute('aria-current', active ? 'page' : 'false');
  });

  const adminOnly = document.querySelectorAll('[data-nav-role="admin"]');
  adminOnly.forEach(el => { el.style.display = user?.role === 'admin' ? 'inline-flex' : 'none'; });
  const uploader = document.querySelectorAll('[data-nav-role="supervisor"]');
  uploader.forEach(el => { el.style.display = (user?.role === 'admin' || user?.role === 'supervisor') ? 'inline-flex' : 'none'; });

  const importLink = document.getElementById('nav-import');
  if (importLink) importLink.style.display = (user?.role === 'admin' || user?.role === 'supervisor') ? 'inline-flex' : 'none';
  const manualLink = document.getElementById('nav-manual-entry');
  if (manualLink) manualLink.style.display = user?.role === 'admin' ? 'inline-flex' : 'none';
  const reportsLink = document.getElementById('nav-reports');
  if (reportsLink) reportsLink.style.display = user?.role === 'admin' ? 'inline-flex' : 'none';
  const employeesLink = document.getElementById('nav-employees');
  if (employeesLink) employeesLink.style.display = (user?.role === 'admin' || user?.role === 'supervisor') ? 'inline-flex' : 'none';
  const homeLink = document.getElementById('nav-home');
  if (homeLink) homeLink.style.display = user?.role === 'employee' ? 'none' : 'inline-flex';

  // Language toggle (AR/EN) — shared across every inner page that loads this file.
  const langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    const syncLangLabel = () => {
      const lang = window.IEMS_I18N ? window.IEMS_I18N.currentLang() : 'ar';
      langToggle.textContent = lang === 'ar' ? 'EN' : 'AR';
    };
    langToggle.addEventListener('click', () => {
      if (window.IEMS_I18N) window.IEMS_I18N.toggle();
      syncLangLabel();
    });
    // i18n.js applies on DOMContentLoaded; this script also runs after DOM
    // is parsed, so IEMS_I18N is already defined here.
    syncLangLabel();
  }
})();



// Shared table sorting: clean clickable headers, matching the Employees page.
(() => {
  const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();
  const value = cell => {
    const raw = clean(cell?.textContent);
    const normalized = raw.replace(/%/g, '').replace(/,/g, '');
    if (/^-?\d+(\.\d+)?$/.test(normalized)) return { type:'number', value:Number(normalized) };
    const date = Date.parse(raw);
    if (!Number.isNaN(date) && /[-/]/.test(raw)) return { type:'date', value:date };
    return { type:'text', value:raw.toLocaleLowerCase('ar-EG') };
  };

  const sortTable = (table, index, dir, header) => {
    const body = table.tBodies[0];
    if (!body) return;
    const rows = [...body.rows];
    rows.sort((a,b) => {
      const A=value(a.cells[index]), B=value(b.cells[index]);
      if (A.type === B.type) {
        if (A.value < B.value) return -1 * dir;
        if (A.value > B.value) return 1 * dir;
        return 0;
      }
      return String(A.value).localeCompare(String(B.value), 'ar') * dir;
    });
    rows.forEach(r => body.appendChild(r));

    table.querySelectorAll('.table-sortable-head').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
    });
    header.classList.add(dir === 1 ? 'sort-asc' : 'sort-desc');
  };

  const enhance = table => {
    if (!table || table.dataset.sortableReady === '1') return;
    if (table.classList.contains('emp-mgmt-table')) return; // Employees page already owns its sorting.
    const head = table.tHead;
    const body = table.tBodies[0];
    if (!head || !body) return;

    const row = head.rows[head.rows.length - 1];
    if (!row) return;

    [...row.cells].forEach(th => {
      if (th.colSpan > 1 || th.dataset.noSort === '1' || th.classList.contains('table-sortable-head')) return;
      const index = th.cellIndex;
      th.classList.add('table-sortable-head');

      const arrow = document.createElement('span');
      arrow.className = 'sort-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      th.appendChild(arrow);

      th.addEventListener('click', () => {
        const next = th.classList.contains('sort-asc') ? -1 : 1;
        sortTable(table, index, next, th);
      });
    });

    table.dataset.sortableReady = '1';
  };

  const scan = () => document.querySelectorAll('table').forEach(enhance);
  scan();
  new MutationObserver(scan).observe(document.body, { childList:true, subtree:true });
  window.addEventListener('iems:tables-updated', scan);
})();
