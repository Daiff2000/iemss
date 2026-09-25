// ---- Welcome splash screen (shown once, right after login) ----
// To change the splash picture: replace /public/splash-bg.jpg with your own
// image (same file name), or point SPLASH_IMAGE at another file in /public.
// Wide (landscape) photos ~1920x1080 work best. Set SPLASH_IMAGE = '' to go
// back to the plain gradient. SPLASH_DIM controls how dark the tint on top of
// the picture is (0 = none, 1 = black) so the greeting stays readable.
(() => {
  const SPLASH_IMAGE = '/splash-bg.jpg';
  const SPLASH_DIM = 0.45;
  const SPLASH_FOCUS = 'center';   // e.g. 'left center', '30% 50%'
  const path = window.location.pathname.split('/').pop() || 'index.html';
  if (path !== 'home.html') return;
  if (sessionStorage.getItem('iems_show_welcome') !== '1') return;
  sessionStorage.removeItem('iems_show_welcome');

  let user = null;
  try { user = JSON.parse(sessionStorage.getItem('iems_user') || 'null'); } catch (_) {}
  const isDark = document.documentElement.dataset.theme === 'dark' || (localStorage.getItem('iems-theme') === 'dark');
  const name = (user && user.name) ? user.name : '';
  const roleLabel = user && user.role === 'system_creator' ? 'منشئ النظام' : user && user.role === 'admin' ? 'مدير النظام' : user && user.role === 'supervisor' ? 'مشرف' : 'موظف';

  // Scripts are re-executed on every client-side visit to this page, so guard
  // the <style> injection — otherwise identical stylesheets pile up in <head>.
  const style = document.getElementById('iems-splash-style') || document.createElement('style');
  style.id = 'iems-splash-style';
  style.textContent = `
    #iems-splash{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;
      background:${isDark ? 'linear-gradient(135deg,#0b1220,#101a2e)' : 'linear-gradient(135deg,#065bab,#0a8fd8)'};
      overflow:hidden;
      animation:iemsSplashOut .6s ease-in 1.7s forwards;}
    #iems-splash > *{position:relative;z-index:2}
    /* picture layer (slow settle-in zoom) + tint layer so text stays readable */
    #iems-splash:before{content:"";position:absolute;inset:0;z-index:0;display:${SPLASH_IMAGE ? 'block' : 'none'};
      background:url('${SPLASH_IMAGE}') ${SPLASH_FOCUS}/cover no-repeat;
      transform:scale(1.08);animation:iemsSplashZoom 2.4s ease-out forwards}
    #iems-splash:after{content:"";position:absolute;inset:0;z-index:1;display:${SPLASH_IMAGE ? 'block' : 'none'};
      background:radial-gradient(ellipse at center,rgba(3,20,45,${Math.max(0, SPLASH_DIM - 0.1)}) 0%,rgba(3,20,45,${Math.min(1, SPLASH_DIM + 0.25)}) 100%)}
    @keyframes iemsSplashZoom{to{transform:scale(1)}}
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
  if (!style.isConnected) document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'iems-splash';
  // Absolute path: a relative "logo-dark.png" breaks on any route that is not
  // at the site root.
  el.innerHTML = `
    <div class="iems-splash-logo"><img src="/logo-dark.png" alt="IEMS"></div>
    <h1>أهلاً بك${name ? '، ' + name : ''} 👋</h1>
    <p>${roleLabel} · جارٍ تجهيز لوحة التحكم...</p>
    <div class="iems-splash-dots"><span></span><span></span><span></span></div>
  `;
  el.addEventListener('click', () => el.remove());
  // Both handlers below used to fire in some load orders, appending the splash
  // twice (the second copy never animated out and covered the whole page).
  const mount = () => {
    if (el.isConnected) return;
    document.body.appendChild(el);
    // removal is timed from the moment the splash actually appears
    setTimeout(() => { if (el.isConnected) el.remove(); }, 2500);
  };
  const mountWhenReady = () => {
    if (!SPLASH_IMAGE) return mount();
    // Give the picture up to 700ms to load (it is normally already cached from
    // the login page); after that show the splash anyway on the gradient.
    let done = false;
    const go = () => { if (done) return; done = true; mount(); };
    const img = new Image();
    img.onload = go; img.onerror = go;
    img.src = SPLASH_IMAGE;
    setTimeout(go, 700);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountWhenReady, { once: true });
  else mountWhenReady();
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

  // Employees is a section, not a single destination. Convert the nav item into
// an icon/text trigger with a compact dropdown containing the employee views.
(() => {
  const link = document.getElementById('nav-employees');
  if (!link || link.dataset.employeeMenuReady === '1') return;
  link.dataset.employeeMenuReady = '1';
  const wrap = document.createElement('div');
  wrap.className = 'employee-nav-wrap';
  link.parentNode.insertBefore(wrap, link);
  wrap.appendChild(link);
  link.href = '#';
  link.setAttribute('aria-haspopup','menu');
  link.setAttribute('aria-expanded','false');
  const menu = document.createElement('div');
  menu.className = 'employee-nav-menu';
  menu.innerHTML = `
    <a href="/admin-employees.html"><span class="menu-icon">◉</span><span>كل الموظفين</span></a>
    <a href="/employees-current.html"><span class="menu-icon">✓</span><span>الموظفون الحاليون</span></a>
    <a href="/employees-left.html"><span class="menu-icon">↗</span><span>الموظفون المغادرون</span></a>
    <a href="/employees-new.html"><span class="menu-icon">+</span><span>الموظفون الجدد</span></a>`;
  wrap.appendChild(menu);
  const close = () => { menu.classList.remove('open'); link.setAttribute('aria-expanded','false'); };
  link.addEventListener('click', e => { e.preventDefault(); const open=menu.classList.toggle('open'); link.setAttribute('aria-expanded',String(open)); });
  document.addEventListener('click', e => { if(!wrap.contains(e.target)) close(); });
  menu.querySelectorAll('a').forEach(a => {
    if (a.getAttribute('href') === location.pathname) a.classList.add('active');
    a.addEventListener('click', close);
  });
})();

// ---- Single permission table for the whole app ----
  // This must match the guard at the top of each page script AND the role
  // middleware on the APIs that page calls. Previously three different files
  // disagreed (app-home.js showed Reports/Manual Entry to supervisors,
  // this file hid Reports from them, and the pages themselves allowed
  // supervisors on Reports but not Manual Entry) — so links either vanished
  // or bounced the user back to the home page.
  // Unified product credit footer on every authenticated page.
  const pageMain = document.querySelector('main.container');
  if (pageMain && !pageMain.querySelector('.iems-credit-footer')) {
    const oldLegal = pageMain.querySelector('.legal');
    const footer = document.createElement('footer');
    footer.className = 'iems-credit-footer';
    footer.innerHTML = '<div class="credit-copy"><div class="credit-year">© 2026 IEMS</div><div class="credit-by">Product Design &amp; Development by</div><div class="credit-name">Mohamed H. Daif</div></div>';
    if (oldLegal) oldLegal.replaceWith(footer); else pageMain.appendChild(footer);
  }

  const role = user?.role || null;
  const CREATOR = role === 'system_creator';
  const ADMIN_UP = CREATOR || role === 'admin';
  const SUPERVISOR_UP = ADMIN_UP || role === 'supervisor';

  const NAV_ACCESS = {
    'nav-home': !!role && role !== 'employee',
    'nav-employees': SUPERVISOR_UP,   // page: supervisor+ · API: requireSupervisor
    'nav-import': SUPERVISOR_UP,      // page: supervisor+ · API: requireUploader
    'nav-reports': SUPERVISOR_UP,        // reports are for supervisors and admins
    'nav-manual-entry': ADMIN_UP,     // page: admin+     · API: requireAdmin
    'nav-audit': CREATOR,             // API: requireSystemCreator
    'nav-themes': CREATOR,            // API: requireSystemCreator
  };
  Object.entries(NAV_ACCESS).forEach(([id, allowed]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = allowed ? 'inline-flex' : 'none';
  });

  // Fallback for any nav item that carries only a data-nav-role attribute
  // (some pages' markup labels the same link differently, e.g. manual entry is
  // tagged "supervisor" on the import page and "admin" on the home page). The
  // id-based table above wins; this only covers untagged extras.
  const ROLE_ATTR_ACCESS = { admin: ADMIN_UP, supervisor: SUPERVISOR_UP, creator: CREATOR };
  document.querySelectorAll('[data-nav-role]').forEach(el => {
    if (el.id && el.id in NAV_ACCESS) return;
    const allowed = ROLE_ATTR_ACCESS[el.getAttribute('data-nav-role')];
    if (allowed !== undefined) el.style.display = allowed ? 'inline-flex' : 'none';
  });

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
